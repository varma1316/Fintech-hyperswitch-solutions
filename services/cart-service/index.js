const express = require("express");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4003;

// In-memory cart store keyed by cartId or userId
const carts = new Map();

// Supported promotional promo codes
const PROMO_CODES = {
  "SAVE10": { type: "percent", value: 10, minSpend: 50 },
  "SAVE20": { type: "percent", value: 20, minSpend: 100 },
  "FREESHIP": { type: "shipping", value: 0 }
};

const calculateTotals = (cart) => {
  const subtotal = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  let discount = 0;
  let shipping = subtotal > 150 ? 0 : 9.99;

  if (cart.promoCode && PROMO_CODES[cart.promoCode]) {
    const promo = PROMO_CODES[cart.promoCode];
    if (promo.type === "percent" && subtotal >= (promo.minSpend || 0)) {
      discount = (subtotal * promo.value) / 100;
    } else if (promo.type === "shipping") {
      shipping = 0;
    }
  }

  const taxableAmount = Math.max(0, subtotal - discount);
  const tax = Number((taxableAmount * 0.08).toFixed(2)); // 8% sales tax
  const total = Number((taxableAmount + tax + shipping).toFixed(2));

  return {
    subtotal: Number(subtotal.toFixed(2)),
    discount: Number(discount.toFixed(2)),
    shipping: Number(shipping.toFixed(2)),
    tax,
    total,
    itemCount: cart.items.reduce((sum, i) => sum + i.quantity, 0)
  };
};

app.get("/health", (req, res) => {
  res.json({ status: "healthy", service: "cart-service", activeCarts: carts.size });
});

// Get or initialize cart
app.get("/cart/:cartId", (req, res) => {
  const { cartId } = req.params;
  let cart = carts.get(cartId);

  if (!cart) {
    cart = { id: cartId, items: [], promoCode: null, updatedAt: new Date().toISOString() };
    carts.set(cartId, cart);
  }

  const totals = calculateTotals(cart);
  res.json({ cart: { ...cart, ...totals } });
});

// Add item to cart
app.post("/cart/:cartId/items", (req, res) => {
  const { cartId } = req.params;
  const { id, title, price, image, quantity = 1, category } = req.body;

  if (!id || !price) {
    return res.status(400).json({ error: "Item id and price are required" });
  }

  let cart = carts.get(cartId);
  if (!cart) {
    cart = { id: cartId, items: [], promoCode: null };
    carts.set(cartId, cart);
  }

  const existingIndex = cart.items.findIndex(i => i.id === id);
  if (existingIndex > -1) {
    cart.items[existingIndex].quantity += Number(quantity);
  } else {
    cart.items.push({
      id,
      title: title || "Product",
      price: Number(price),
      image: image || "",
      category: category || "General",
      quantity: Number(quantity)
    });
  }

  cart.updatedAt = new Date().toISOString();
  const totals = calculateTotals(cart);
  res.json({ message: "Item added to cart", cart: { ...cart, ...totals } });
});

// Update item quantity
app.put("/cart/:cartId/items/:itemId", (req, res) => {
  const { cartId, itemId } = req.params;
  const { quantity } = req.body;

  const cart = carts.get(cartId);
  if (!cart) return res.status(404).json({ error: "Cart not found" });

  const itemIndex = cart.items.findIndex(i => i.id === itemId);
  if (itemIndex === -1) return res.status(404).json({ error: "Item not found in cart" });

  const qty = Number(quantity);
  if (qty <= 0) {
    cart.items.splice(itemIndex, 1);
  } else {
    cart.items[itemIndex].quantity = qty;
  }

  cart.updatedAt = new Date().toISOString();
  const totals = calculateTotals(cart);
  res.json({ message: "Quantity updated", cart: { ...cart, ...totals } });
});

// Remove item from cart
app.delete("/cart/:cartId/items/:itemId", (req, res) => {
  const { cartId, itemId } = req.params;
  const cart = carts.get(cartId);
  if (!cart) return res.status(404).json({ error: "Cart not found" });

  cart.items = cart.items.filter(i => i.id !== itemId);
  cart.updatedAt = new Date().toISOString();
  const totals = calculateTotals(cart);
  res.json({ message: "Item removed", cart: { ...cart, ...totals } });
});

// Apply Promo Code
app.post("/cart/:cartId/promo", (req, res) => {
  const { cartId } = req.params;
  const { code } = req.body;

  const cart = carts.get(cartId);
  if (!cart) return res.status(404).json({ error: "Cart not found" });

  const normalizedCode = (code || "").toUpperCase().trim();
  if (!PROMO_CODES[normalizedCode]) {
    return res.status(400).json({ error: "Invalid coupon code. Try SAVE10 or SAVE20" });
  }

  cart.promoCode = normalizedCode;
  cart.updatedAt = new Date().toISOString();
  const totals = calculateTotals(cart);
  res.json({ message: `Coupon ${normalizedCode} applied!`, cart: { ...cart, ...totals } });
});

// Clear Cart
app.delete("/cart/:cartId", (req, res) => {
  const { cartId } = req.params;
  const cart = { id: cartId, items: [], promoCode: null, updatedAt: new Date().toISOString() };
  carts.set(cartId, cart);
  const totals = calculateTotals(cart);
  res.json({ message: "Cart cleared", cart: { ...cart, ...totals } });
});

app.listen(PORT, () => {
  console.log(`Cart Service listening on port ${PORT}`);
});
