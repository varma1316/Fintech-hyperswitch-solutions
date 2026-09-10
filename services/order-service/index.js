const express = require("express");
const cors = require("cors");
const axios = require("axios");
const AWS = require("aws-sdk");
const { Pool } = require("pg");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const AWS_REGION = process.env.AWS_REGION || "us-east-1";
const HYPERSWITCH_URL = process.env.HYPERSWITCH_SERVER_URL || "http://hyperswitch-backend:8080";
const HYPERSWITCH_API_KEY = process.env.HYPERSWITCH_API_KEY || "test_api_key_hyperswitch";
const SNS_TOPIC_ARN = process.env.SNS_PAYMENT_SUCCESS_TOPIC_ARN;

// 1. Database Connection (PostgreSQL with in-memory fallback)
let pool = null;
const inMemoryOrders = new Map();

if (process.env.ORDER_DB_URL || process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.ORDER_DB_URL || process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false
  });
  console.log("Connected to PostgreSQL for Order records.");
} else {
  console.warn("WARNING: ORDER_DB_URL not set. Using in-memory store for orders.");
}

// 2. AWS SNS Client
let snsClient = null;
try {
  snsClient = new AWS.SNS({ region: AWS_REGION });
} catch (e) {
  console.warn("AWS SNS initialization skipped:", e.message);
}

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "healthy", service: "order-service", activeOrders: inMemoryOrders.size });
});

// Helper: Dispatch SNS Event
async function publishPaymentSuccessEvent(order) {
  const eventPayload = {
    eventType: "PAYMENT_SUCCEEDED",
    timestamp: new Date().toISOString(),
    orderId: String(order.id),
    userId: order.user_id,
    customerEmail: order.customer_email,
    customerName: order.customer_name,
    totalAmount: order.total_amount,
    currency: order.currency || "USD",
    items: order.items || [],
    shippingAddress: order.shipping_address || {}
  };

  if (SNS_TOPIC_ARN && snsClient) {
    try {
      const params = {
        Message: JSON.stringify(eventPayload),
        TopicArn: SNS_TOPIC_ARN,
        MessageAttributes: {
          eventType: { DataType: "String", StringValue: "PAYMENT_SUCCEEDED" }
        }
      };
      const result = await snsClient.publish(params).promise();
      console.log(`[SNS] Published Order #${order.id} event. MessageId: ${result.MessageId}`);
      return;
    } catch (err) {
      console.error("[SNS] Failed to publish to AWS SNS:", err.message);
    }
  }

  // Fallback: Notify inventory and notification services directly via internal HTTP if SNS not configured
  console.log(`[EVENT BUS] Dispatched Order #${order.id} event locally (SNS Topic not set or in local mode).`);
  
  // Asynchronously broadcast to inventory-service & notification-service
  const inventoryUrl = process.env.INVENTORY_SERVICE_URL || "http://localhost:8001";
  const notificationUrl = process.env.NOTIFICATION_SERVICE_URL || "http://localhost:8002";

  axios.post(`${inventoryUrl}/sqs-worker/process-payment`, { Message: JSON.stringify(eventPayload) }).catch(e => {});
  axios.post(`${notificationUrl}/sqs-worker/send-notification`, { Message: JSON.stringify(eventPayload) }).catch(e => {});
}

// 3. Create Checkout / Payment Intent
app.post("/create-checkout", async (req, res) => {
  const { customer, items = [], shippingAddress = {}, amount, currency = "USD" } = req.body;

  if (!customer || !customer.email) {
    return res.status(400).json({ error: "Customer details and email are required" });
  }

  const calculatedAmount = amount || items.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);
  const totalInCents = Math.round(calculatedAmount * 100);

  try {
    let orderId;

    if (pool) {
      const dbResult = await pool.query(
        `INSERT INTO orders (customer_id, customer_email, customer_name, total_amount, currency, status, items, shipping_address)
         VALUES ($1, $2, $3, $4, $5, 'PENDING', $6, $7) RETURNING id`,
        [
          customer.id || "guest",
          customer.email,
          `${customer.firstName || ""} ${customer.lastName || ""}`.trim(),
          calculatedAmount,
          currency,
          JSON.stringify(items),
          JSON.stringify(shippingAddress)
        ]
      );
      orderId = String(dbResult.rows[0].id);
    } else {
      orderId = `ORD-${Date.now().toString().slice(-6)}`;
      inMemoryOrders.set(orderId, {
        id: orderId,
        user_id: customer.id || "guest",
        customer_email: customer.email,
        customer_name: `${customer.firstName || ""} ${customer.lastName || ""}`.trim(),
        total_amount: calculatedAmount,
        currency,
        status: "PENDING",
        items,
        shipping_address: shippingAddress,
        created_at: new Date().toISOString()
      });
    }

    // Call Hyperswitch Router API to create payment intent
    let clientSecret = `mock_secret_${orderId}_${Date.now()}`;
    try {
      const hsResponse = await axios.post(
        `${HYPERSWITCH_URL}/payments`,
        {
          amount: totalInCents,
          currency: currency.toUpperCase(),
          customer_id: customer.email.replace(/[^a-zA-Z0-9]/g, "_"),
          email: customer.email,
          metadata: { order_id: orderId }
        },
        {
          headers: {
            "api-key": HYPERSWITCH_API_KEY,
            "Content-Type": "application/json"
          },
          timeout: 4000
        }
      );

      if (hsResponse.data && hsResponse.data.client_secret) {
        clientSecret = hsResponse.data.client_secret;
      }
    } catch (hsErr) {
      console.warn(`[Hyperswitch] Router not reachable (${hsErr.message}). Using sandbox mock clientSecret.`);
    }

    res.json({
      orderId,
      clientSecret,
      amount: calculatedAmount,
      currency,
      status: "PENDING"
    });
  } catch (err) {
    console.error("Failed to create checkout order:", err);
    res.status(500).json({ error: "Failed to initialize order." });
  }
});

// 4. Hyperswitch Webhook Handler
app.post("/webhook", async (req, res) => {
  const event = req.body;
  console.log(`[Webhook] Received event: ${event.type || "unknown"}`);

  if (event.type === "payment_intent.succeeded" || event.status === "succeeded") {
    const internalOrderId = event.data?.object?.metadata?.order_id || event.order_id;

    if (internalOrderId) {
      let order = null;
      if (pool) {
        await pool.query("UPDATE orders SET status = 'PAID', updated_at = NOW() WHERE id = $1", [internalOrderId]);
        const result = await pool.query("SELECT * FROM orders WHERE id = $1", [internalOrderId]);
        order = result.rows[0];
      } else if (inMemoryOrders.has(internalOrderId)) {
        order = inMemoryOrders.get(internalOrderId);
        order.status = "PAID";
        order.updated_at = new Date().toISOString();
        inMemoryOrders.set(internalOrderId, order);
      }

      if (order) {
        await publishPaymentSuccessEvent(order);
      }
    }
  }

  res.status(200).json({ received: true });
});

// 5. Simulate Payment Success (For Testing without real card charges)
app.post("/orders/:orderId/simulate-payment", async (req, res) => {
  const { orderId } = req.params;
  let order = null;

  if (pool) {
    await pool.query("UPDATE orders SET status = 'PAID', updated_at = NOW() WHERE id = $1", [orderId]);
    const result = await pool.query("SELECT * FROM orders WHERE id = $1", [orderId]);
    order = result.rows[0];
  } else if (inMemoryOrders.has(orderId)) {
    order = inMemoryOrders.get(orderId);
    order.status = "PAID";
    order.updated_at = new Date().toISOString();
    inMemoryOrders.set(orderId, order);
  }

  if (!order) {
    return res.status(404).json({ error: "Order not found" });
  }

  await publishPaymentSuccessEvent(order);
  res.json({ message: `Order #${orderId} marked as PAID and SNS notification dispatched!`, order });
});

// 6. Get Order Details
app.get("/orders/:orderId", async (req, res) => {
  const { orderId } = req.params;

  if (pool) {
    const result = await pool.query("SELECT * FROM orders WHERE id = $1", [orderId]);
    if (result.rows.length === 0) return res.status(404).json({ error: "Order not found" });
    return res.json({ order: result.rows[0] });
  }

  const order = inMemoryOrders.get(orderId);
  if (!order) return res.status(404).json({ error: "Order not found" });
  res.json({ order });
});

// 7. Get User Order History
app.get("/orders/user/:userId", async (req, res) => {
  const { userId } = req.params;

  if (pool) {
    const result = await pool.query("SELECT * FROM orders WHERE customer_id = $1 ORDER BY id DESC", [userId]);
    return res.json({ orders: result.rows });
  }

  const userOrders = Array.from(inMemoryOrders.values()).filter(o => o.user_id === userId);
  res.json({ orders: userOrders.reverse() });
});

app.listen(PORT, () => {
  console.log(`Order Service listening on port ${PORT}`);
});
