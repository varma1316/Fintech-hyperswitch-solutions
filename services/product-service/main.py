from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
import json
import os
from pydantic import BaseModel

app = FastAPI(title="Product Catalog Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

PRODUCTS_FILE = os.path.join(os.path.dirname(__file__), "products.json")

def load_products():
    if os.path.exists(PRODUCTS_FILE):
        with open(PRODUCTS_FILE, "r") as f:
            return json.load(f)
    return []

products_db = load_products()

class StockCheckItem(BaseModel):
    id: str
    qty: int

class StockCheckRequest(BaseModel):
    items: List[StockCheckItem]

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "product-service", "total_products": len(products_db)}

@app.get("/categories")
def get_categories():
    categories = sorted(list({p["category"] for p in products_db}))
    return {"categories": categories}

@app.get("/products/featured")
def get_featured_products():
    featured = [p for p in products_db if p.get("is_featured")]
    return {"products": featured}

@app.get("/products")
def list_products(
    category: Optional[str] = None,
    search: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    sort: Optional[str] = Query("popular", regex="^(popular|price_low|price_high|rating|newest)$")
):
    filtered = products_db.copy()

    if category and category.lower() != "all":
        filtered = [p for p in filtered if p["category"].lower() == category.lower()]

    if search:
        q = search.lower().strip()
        filtered = [
            p for p in filtered 
            if q in p["title"].lower() or q in p["description"].lower() or q in p["category"].lower()
        ]

    if min_price is not None:
        filtered = [p for p in filtered if p["price"] >= min_price]

    if max_price is not None:
        filtered = [p for p in filtered if p["price"] <= max_price]

    if sort == "price_low":
        filtered.sort(key=lambda x: x["price"])
    elif sort == "price_high":
        filtered.sort(key=lambda x: x["price"], reverse=True)
    elif sort == "rating":
        filtered.sort(key=lambda x: x.get("rating", 0), reverse=True)

    return {"total": len(filtered), "products": filtered}

@app.get("/products/{product_id}")
def get_product(product_id: str):
    for p in products_db:
        if p["id"] == product_id:
            return p
    raise HTTPException(status_code=404, detail="Product not found")

@app.post("/check-stock")
def check_stock_batch(req: StockCheckRequest):
    results = []
    all_available = True
    prod_map = {p["id"]: p for p in products_db}

    for item in req.items:
        prod = prod_map.get(item.id)
        if not prod:
            results.append({"id": item.id, "available": False, "reason": "Product not found"})
            all_available = False
            continue
        available = prod["stock"] >= item.qty
        if not available:
            all_available = False
        results.append({
            "id": item.id,
            "title": prod["title"],
            "requested_qty": item.qty,
            "available_stock": prod["stock"],
            "available": available
        })

    return {"all_available": all_available, "items": results}

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 4002))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
