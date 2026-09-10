from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import json
import logging
import os
import smtplib
import threading
import time
from email.message import EmailMessage

app = FastAPI(title="Notification Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

SQS_QUEUE_URL = os.environ.get("SQS_NOTIFICATION_QUEUE_URL")
AWS_REGION = os.environ.get("AWS_REGION", "us-east-1")
SMTP_SERVER = os.environ.get("SMTP_SERVER", "mailhog")
SMTP_PORT = int(os.environ.get("SMTP_PORT", 1025))
SMTP_USERNAME = os.environ.get("SMTP_USERNAME", "")
SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD", "")
SENDER_EMAIL = os.environ.get("SENDER_EMAIL", "billing@ecommerce-store.com")

sent_notifications_log = []

def send_email_receipt(customer_email: str, order_id: str, amount: float = None, items: list = None):
    items_summary = ""
    if items:
        items_summary = "\nItems Ordered:\n" + "\n".join(
            [f" - {i.get('title', 'Item')} x{i.get('quantity', 1)} (${i.get('price', 0)})" for i in items]
        )

    body = f"""Hello,

Thank you for your order with our Store!
Your payment for Order #{order_id} has been confirmed.

Total Charged: ${amount if amount is not None else 'Paid'}
{items_summary}

Your items are being packed and prepared for dispatch.
You can track your order status anytime through your account dashboard.

Best regards,
The Customer Experience Team
"""

    msg = EmailMessage()
    msg.set_content(body)
    msg["Subject"] = f"Receipt & Order Confirmation #{order_id}"
    msg["From"] = SENDER_EMAIL
    msg["To"] = customer_email

    try:
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT, timeout=5) as server:
            if SMTP_USERNAME and SMTP_PASSWORD:
                server.starttls()
                server.login(SMTP_USERNAME, SMTP_PASSWORD)
            server.send_message(msg)
        logging.info(f"[EMAIL SENT] Successfully sent order receipt to '{customer_email}' for Order #{order_id}")
        sent_notifications_log.append({
            "orderId": order_id,
            "to": customer_email,
            "timestamp": time.time(),
            "status": "SENT"
        })
    except Exception as e:
        logging.warning(f"[EMAIL FALLBACK] SMTP host ({SMTP_SERVER}:{SMTP_PORT}) unavailable ({e}). Logged receipt locally.")
        sent_notifications_log.append({
            "orderId": order_id,
            "to": customer_email,
            "timestamp": time.time(),
            "status": "LOGGED_LOCAL"
        })

# Active Background AWS SQS Consumer Thread
def sqs_notification_worker():
    if not SQS_QUEUE_URL:
        logging.info("[SQS] SQS_NOTIFICATION_QUEUE_URL not set. Running in HTTP webhook listener mode.")
        return

    try:
        import boto3
        sqs = boto3.client("sqs", region_name=AWS_REGION)
        logging.info(f"[SQS] Notification Service listening to SQS: {SQS_QUEUE_URL}")

        while True:
            try:
                response = sqs.receive_message(
                    QueueUrl=SQS_QUEUE_URL,
                    MaxNumberOfMessages=5,
                    WaitTimeSeconds=10
                )
                messages = response.get("Messages", [])
                for msg in messages:
                    receipt_handle = msg["ReceiptHandle"]
                    body = json.loads(msg["Body"])

                    # If message was forwarded via SNS to SQS, unpack inner Message
                    if "Message" in body and isinstance(body["Message"], str):
                        payload = json.loads(body["Message"])
                    else:
                        payload = body

                    order_id = payload.get("orderId")
                    customer_email = payload.get("customerEmail")
                    amount = payload.get("totalAmount")
                    items = payload.get("items", [])

                    if customer_email and order_id:
                        send_email_receipt(customer_email, order_id, amount, items)

                    # Delete processed message from SQS
                    sqs.delete_message(QueueUrl=SQS_QUEUE_URL, ReceiptHandle=receipt_handle)
                    logging.info(f"[SQS] Processed notification for Order #{order_id}")
            except Exception as loop_err:
                logging.error(f"[SQS] Notification Polling error: {loop_err}")
                time.sleep(5)
    except Exception as e:
        logging.error(f"[SQS] Failed to start SQS notification worker: {e}")

# Start SQS Worker thread in background
threading.Thread(target=sqs_notification_worker, daemon=True).start()

@app.get("/health")
def health():
    return {
        "status": "healthy",
        "service": "notification-service",
        "sqs_enabled": bool(SQS_QUEUE_URL),
        "total_dispatched_notifications": len(sent_notifications_log)
    }

@app.get("/notifications/logs")
def get_logs():
    return {"notifications": sent_notifications_log[-50:]}

@app.post("/sqs-worker/send-notification")
async def process_notification_event_http(request: Request):
    """Direct HTTP endpoint called by local webhook or SNS-HTTP subscription"""
    try:
        body = await request.json()
        if "Message" in body and isinstance(body["Message"], str):
            payload = json.loads(body["Message"])
        else:
            payload = body

        order_id = payload.get("orderId", "unknown")
        customer_email = payload.get("customerEmail", "customer@example.com")
        amount = payload.get("totalAmount")
        items = payload.get("items", [])

        send_email_receipt(customer_email, order_id, amount, items)
        return {"status": "email_processed", "orderId": order_id}
    except Exception as e:
        logging.error(f"Error handling notification request: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8002))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
