from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import json
import logging
import os
import threading
import time

app = FastAPI(title="Inventory Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

SQS_QUEUE_URL = os.environ.get("SQS_INVENTORY_QUEUE_URL")
AWS_REGION = os.environ.get("AWS_REGION", "us-east-1")

# Master Inventory Database
inventory_db = {
    "prod_tech_01": {"stock": 45, "name": "Aura Ultra Wireless Headphones"},
    "prod_tech_02": {"stock": 80, "name": "Nova Smart Ambient Desk Lamp"},
    "prod_app_01": {"stock": 120, "name": "Merino Wool Everyday Minimalist Hoodie"},
    "prod_app_02": {"stock": 65, "name": "Waterproof Technical Commuter Jacket"},
    "prod_foot_01": {"stock": 90, "name": "AeroStep Cloudfoam Running Sneakers"},
    "prod_foot_02": {"stock": 35, "name": "Artisan Handcrafted Chelsea Leather Boots"},
    "prod_acc_01": {"stock": 50, "name": "Voyager Top-Grain Leather Weekend Duffel"},
    "prod_acc_02": {"stock": 25, "name": "Apex Chronograph Titanium Watch"},
    "prod_home_01": {"stock": 110, "name": "Pour-Over Precision Ceramic Coffee Set"},
    "prod_home_02": {"stock": 70, "name": "AromaStone Ultrasonic Essential Oil Diffuser"},
    "shoe_123": {"stock": 100, "name": "Sample Shoes"}
}

def deduct_inventory_for_order(order_id: str, items: list) -> bool:
    logging.info(f"Deducting inventory for Order #{order_id} ({len(items)} line items)...")
    success = True
    
    for item in items:
        item_id = item.get("id")
        qty = int(item.get("quantity") or item.get("qty") or 1)
        
        if item_id in inventory_db:
            current_stock = inventory_db[item_id]["stock"]
            new_stock = max(0, current_stock - qty)
            inventory_db[item_id]["stock"] = new_stock
            logging.info(f"[STOCK UPDATED] Item '{item_id}' stock: {current_stock} -> {new_stock}")
        else:
            logging.warning(f"[STOCK WARNING] Unknown SKU '{item_id}'. Created with initial stock 99.")
            inventory_db[item_id] = {"stock": 99, "name": item.get("title", "Product")}
            
    return success

# Active Background AWS SQS Consumer Thread
def sqs_polling_worker():
    if not SQS_QUEUE_URL:
        logging.info("[SQS] SQS_INVENTORY_QUEUE_URL not set. Background SQS polling disabled (HTTP webhook mode active).")
        return

    try:
        import boto3
        sqs = boto3.client("sqs", region_name=AWS_REGION)
        logging.info(f"[SQS] Inventory Service started listening to SQS: {SQS_QUEUE_URL}")

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
                    
                    # If message was forwarded via SNS to SQS, unpack the inner Message
                    if "Message" in body and isinstance(body["Message"], str):
                        payload = json.loads(body["Message"])
                    else:
                        payload = body

                    order_id = payload.get("orderId")
                    items = payload.get("items", [])
                    deduct_inventory_for_order(order_id, items)

                    # Delete processed message from SQS
                    sqs.delete_message(QueueUrl=SQS_QUEUE_URL, ReceiptHandle=receipt_handle)
                    logging.info(f"[SQS] Successfully processed & deleted message for Order #{order_id}")
            except Exception as loop_err:
                logging.error(f"[SQS] Polling error: {loop_err}")
                time.sleep(5)
    except Exception as e:
        logging.error(f"[SQS] Failed to initialize Boto3 SQS client: {e}")

# Start SQS Worker in background daemon thread
threading.Thread(target=sqs_polling_worker, daemon=True).start()

@app.get("/health")
def health():
    return {
        "status": "healthy",
        "service": "inventory-service",
        "sqs_enabled": bool(SQS_QUEUE_URL),
        "total_tracked_skus": len(inventory_db)
    }

@app.get("/inventory")
def get_inventory():
    return {"inventory": inventory_db}

@app.get("/inventory/{item_id}")
def get_item_stock(item_id: str):
    if item_id in inventory_db:
        return {"id": item_id, **inventory_db[item_id]}
    raise HTTPException(status_code=404, detail="Item not found in inventory")

@app.post("/sqs-worker/process-payment")
async def process_payment_event_http(request: Request):
    """Direct HTTP endpoint called by local webhook or SNS-HTTP subscription"""
    try:
        body = await request.json()
        if "Message" in body and isinstance(body["Message"], str):
            payload = json.loads(body["Message"])
        else:
            payload = body

        order_id = payload.get("orderId", "unknown")
        items = payload.get("items", [])
        deduct_inventory_for_order(order_id, items)
        return {"status": "success", "orderId": order_id}
    except Exception as e:
        logging.error(f"Error processing payment event: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8001))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
