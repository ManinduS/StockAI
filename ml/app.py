"""
AI Stock Prediction ML Service
FastAPI service with XGBoost/Random Forest training from DB sales data,
demand forecasting, inventory risk detection, smart reorder planning,
AI alerts, and model performance tracking.
"""

import os
import json
import math
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any

import joblib
import numpy as np
import pandas as pd
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pymongo import MongoClient
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_squared_error, r2_score
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder

try:
    from xgboost import XGBRegressor
    XGBOOST_AVAILABLE = True
except ImportError:
    XGBOOST_AVAILABLE = False

load_dotenv()

app = FastAPI(
    title="StockAI ML Service",
    description="AI-powered demand forecasting, inventory risk detection, and smart reorder planning",
    version="2.0.0",
)

# CORS middleware
allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5000,http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --------------- Global State ---------------
model = None
features: List[str] = []
label_encoders: Dict[str, LabelEncoder] = {}
model_loaded = False
model_metrics: Dict[str, Any] = {}
MODEL_DIR = os.getenv("MODEL_DIR", "./models")
MODEL_PATH = os.path.join(MODEL_DIR, "demand_model.pkl")

# --------------- MongoDB helper ---------------
def get_mongo_db():
    uri = os.getenv("MONGODB_URI", "")
    if not uri:
        return None
    client = MongoClient(uri, serverSelectionTimeoutMS=5000)
    db_name = os.getenv("MONGODB_DB", "StockDB")
    return client[db_name]


# --------------- Pydantic Models ---------------
class TrainRequest(BaseModel):
    algorithm: str = "xgboost"  # 'xgboost' or 'random_forest'
    test_size: float = 0.2

class PredictRequest(BaseModel):
    sku: str
    category: str
    stock_quantity: float = 0
    reorder_level: float = 10
    reorder_quantity: float = 50
    unit_price: float = 0
    warehouse_location: str = "Main Warehouse"
    status: str = "Active"
    received_month: int = 1
    received_day: int = 1
    order_lead_time: int = 7
    days_to_expiry: int = 30
    inventory_turnover_rate: float = 1.0

class BatchPredictRequest(BaseModel):
    items: List[PredictRequest]

class ProductInsightRequest(BaseModel):
    sku: str
    name: str
    category: str
    current_stock: float
    reorder_point: float
    safety_stock: float
    lead_time_days: int
    price: float
    avg_weekly_sales: float = 0

class BatchInsightRequest(BaseModel):
    products: List[ProductInsightRequest]

class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    version: str
    timestamp: str


# --------------- Load Model on Startup ---------------
@app.on_event("startup")
async def load_model_on_startup():
    global model, features, label_encoders, model_loaded, model_metrics
    if os.path.exists(MODEL_PATH):
        try:
            pkg = joblib.load(MODEL_PATH)
            model = pkg["model"]
            features = pkg["features"]
            label_encoders = pkg.get("label_encoders", {})
            model_metrics = pkg.get("metrics", {})
            model_loaded = True
            print(f"Model loaded from {MODEL_PATH} — {pkg.get('algorithm', 'unknown')}")
        except Exception as e:
            print(f"WARNING: Could not load model: {e}")
    else:
        # Try loading legacy format
        legacy = os.path.join(MODEL_DIR, "inventory_ai_model.pkl")
        if os.path.exists(legacy):
            try:
                pkg = joblib.load(legacy)
                model = pkg["model"]
                features = pkg["features"]
                label_encoders = {
                    "Category": pkg.get("category_encoder"),
                    "Warehouse_Location": pkg.get("warehouse_encoder"),
                    "Status": pkg.get("status_encoder"),
                }
                model_loaded = True
                print(f"Legacy model loaded from {legacy}")
            except Exception as e:
                print(f"WARNING: Could not load legacy model: {e}")
        else:
            print("No model file found — train via POST /train first.")


# --------------- Helper Functions ---------------
def safe_encode(encoder: Optional[LabelEncoder], value: str) -> int:
    if encoder is None:
        return 0
    try:
        return int(encoder.transform([value])[0])
    except (ValueError, KeyError):
        return 0


def prepare_features_single(req: PredictRequest) -> pd.DataFrame:
    if not model_loaded:
        raise HTTPException(status_code=503, detail="Model not loaded. Train first via POST /train.")
    d = {
        "Category": safe_encode(label_encoders.get("Category"), req.category),
        "Stock_Quantity": req.stock_quantity,
        "Reorder_Level": req.reorder_level,
        "Reorder_Quantity": req.reorder_quantity,
        "Unit_Price": req.unit_price,
        "Warehouse_Location": safe_encode(label_encoders.get("Warehouse_Location"), req.warehouse_location),
        "Inventory_Turnover_Rate": req.inventory_turnover_rate,
        "Status": safe_encode(label_encoders.get("Status"), req.status),
        "Received_Month": req.received_month,
        "Received_Day": req.received_day,
        "Order_Lead_Time": req.order_lead_time,
        "Days_To_Expiry": req.days_to_expiry,
    }
    X = pd.DataFrame([d])
    for col in features:
        if col not in X.columns:
            X[col] = 0
    return X[features]


def compute_risk_level(current_stock: float, predicted_demand: float, safety_stock: float, lead_time_days: int, avg_weekly_sales: float) -> str:
    if current_stock <= 0:
        return "Critical"
    days_of_stock = current_stock / max(avg_weekly_sales / 7, 0.01)
    if days_of_stock < lead_time_days:
        return "High"
    if current_stock <= safety_stock:
        return "High"
    if current_stock > predicted_demand * 3:
        return "Overstock"
    if current_stock <= safety_stock * 1.5:
        return "Medium"
    return "Low"


def generate_alert(name: str, sku: str, current_stock: float, predicted_demand: float, safety_stock: float, risk: str, lead_time_days: int, avg_weekly_sales: float) -> str:
    if risk == "Critical":
        return f"{name} ({sku}) is OUT OF STOCK. Immediate reorder required."
    days_of_stock = current_stock / max(avg_weekly_sales / 7, 0.01)
    if risk == "High":
        return f"High demand detected for {name}. Stock may run out in {max(1, int(days_of_stock))} days."
    if risk == "Overstock":
        excess = int(current_stock - predicted_demand)
        pct = int((excess / max(current_stock, 1)) * 100)
        return f"{name} is overstocked by ~{pct}%. Consider running promotions."
    if risk == "Medium":
        return f"{name} stock is approaching safety level. Monitor closely."
    return f"{name} stock levels are healthy."


def generate_explanation(name: str, suggested_qty: int, predicted_demand: float, safety_stock: float, current_stock: float, weeks: int) -> str:
    return (
        f"Order {suggested_qty} units of {name} because predicted demand for the next "
        f"{weeks} week(s) is {int(predicted_demand)} units, safety stock is {int(safety_stock)} units, "
        f"and current stock is {int(current_stock)} units."
    )


# --------------- Training Endpoint ---------------
@app.post("/train")
async def train_model(req: TrainRequest):
    global model, features, label_encoders, model_loaded, model_metrics

    algorithm = req.algorithm.lower()
    if algorithm == "xgboost" and not XGBOOST_AVAILABLE:
        algorithm = "random_forest"

    # ---------- Gather training data ----------
    # 1. Try MongoDB sales + products
    db = get_mongo_db()
    df = None
    data_source = "csv_fallback"

    if db is not None:
        try:
            products_cursor = list(db["products"].find({}))
            sales_cursor = list(db["sales"].find({}))

            if len(products_cursor) > 0 and len(sales_cursor) > 5:
                # Build product lookup
                prod_map = {}
                for p in products_cursor:
                    prod_map[str(p["_id"])] = p

                rows = []
                for s in sales_cursor:
                    pid = str(s.get("product", ""))
                    p = prod_map.get(pid)
                    if p is None:
                        continue
                    sale_date = s.get("saleDate", datetime.now())
                    if isinstance(sale_date, str):
                        sale_date = datetime.fromisoformat(sale_date)
                    rows.append({
                        "Category": p.get("category", "Unknown"),
                        "Stock_Quantity": p.get("currentStock", 0),
                        "Reorder_Level": p.get("reorderPoint", 10),
                        "Reorder_Quantity": p.get("reorderQuantity", 50),
                        "Unit_Price": float(p.get("price", 0)),
                        "Warehouse_Location": p.get("warehouseLocation", "Main Warehouse"),
                        "Inventory_Turnover_Rate": float(s.get("quantity", 1)),
                        "Status": p.get("status", "Active"),
                        "Received_Month": sale_date.month,
                        "Received_Day": sale_date.day,
                        "Order_Lead_Time": p.get("leadTimeDays", 7),
                        "Days_To_Expiry": 30,
                        "Sales_Volume": float(s.get("quantity", 0)),
                    })
                if len(rows) >= 10:
                    df = pd.DataFrame(rows)
                    data_source = "mongodb"
        except Exception as e:
            print(f"MongoDB data fetch failed: {e}")

    # 2. Fallback to CSV
    if df is None:
        csv_paths = [
            os.path.join(os.path.dirname(__file__), "..", "data", "Grocery_Inventory_and_Sales_Dataset.csv"),
            os.path.join(os.path.dirname(__file__), "data", "Grocery_Inventory_and_Sales_Dataset.csv"),
        ]
        csv_path = None
        for p in csv_paths:
            if os.path.exists(p):
                csv_path = p
                break

        if csv_path is None:
            raise HTTPException(status_code=400, detail="No training data available. Add sales data or place CSV in /data folder.")

        raw = pd.read_csv(csv_path)
        # Clean price column
        if "Unit_Price" in raw.columns:
            raw["Unit_Price"] = raw["Unit_Price"].astype(str).str.replace(r"[\$,]", "", regex=True).astype(float)
        # Parse dates
        for dcol in ["Date_Received", "Last_Order_Date", "Expiration_Date"]:
            if dcol in raw.columns:
                raw[dcol] = pd.to_datetime(raw[dcol], errors="coerce")

        df = pd.DataFrame()
        df["Category"] = raw["Category"]
        df["Stock_Quantity"] = raw["Stock_Quantity"]
        df["Reorder_Level"] = raw["Reorder_Level"]
        df["Reorder_Quantity"] = raw["Reorder_Quantity"]
        df["Unit_Price"] = raw["Unit_Price"]
        df["Warehouse_Location"] = raw["Warehouse_Location"]
        df["Inventory_Turnover_Rate"] = raw["Inventory_Turnover_Rate"]
        df["Status"] = raw["Status"]
        df["Received_Month"] = raw["Date_Received"].dt.month.fillna(1).astype(int)
        df["Received_Day"] = raw["Date_Received"].dt.day.fillna(1).astype(int)
        if "Last_Order_Date" in raw.columns and "Date_Received" in raw.columns:
            df["Order_Lead_Time"] = (raw["Date_Received"] - raw["Last_Order_Date"]).dt.days.fillna(7).clip(lower=1)
        else:
            df["Order_Lead_Time"] = 7
        if "Expiration_Date" in raw.columns and "Date_Received" in raw.columns:
            df["Days_To_Expiry"] = (raw["Expiration_Date"] - raw["Date_Received"]).dt.days.fillna(30).clip(lower=0)
        else:
            df["Days_To_Expiry"] = 30
        df["Sales_Volume"] = raw["Sales_Volume"]
        data_source = "csv"

    # ---------- Encode categoricals ----------
    df = df.dropna(subset=["Sales_Volume"])
    cat_cols = ["Category", "Warehouse_Location", "Status"]
    label_encoders = {}
    for col in cat_cols:
        if col in df.columns:
            le = LabelEncoder()
            df[col] = le.fit_transform(df[col].astype(str))
            label_encoders[col] = le

    # ---------- Split ----------
    target = "Sales_Volume"
    feature_cols = [c for c in df.columns if c != target]
    X = df[feature_cols].fillna(0)
    y = df[target].fillna(0)
    features = list(X.columns)

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=req.test_size, random_state=42)

    # ---------- Train ----------
    if algorithm == "xgboost":
        mdl = XGBRegressor(n_estimators=200, max_depth=6, learning_rate=0.1, random_state=42)
    else:
        mdl = RandomForestRegressor(n_estimators=200, max_depth=12, random_state=42, n_jobs=-1)

    mdl.fit(X_train, y_train)

    # ---------- Evaluate ----------
    y_pred = mdl.predict(X_test)
    r2 = float(r2_score(y_test, y_pred))
    rmse = float(np.sqrt(mean_squared_error(y_test, y_pred)))

    model = mdl
    model_loaded = True
    model_metrics = {
        "r2_score": round(r2, 4),
        "rmse": round(rmse, 4),
        "training_samples": int(len(X_train)),
        "test_samples": int(len(X_test)),
        "total_samples": int(len(X)),
        "algorithm": algorithm,
        "features": features,
        "data_source": data_source,
        "trained_at": datetime.now().isoformat(),
    }

    # ---------- Save ----------
    os.makedirs(MODEL_DIR, exist_ok=True)
    joblib.dump({
        "model": model,
        "features": features,
        "label_encoders": label_encoders,
        "metrics": model_metrics,
        "algorithm": algorithm,
    }, MODEL_PATH)

    return {
        "success": True,
        "message": f"Model trained successfully with {algorithm}",
        "metrics": model_metrics,
    }


# --------------- Prediction Endpoints ---------------
@app.post("/predict")
async def predict(req: PredictRequest):
    if not model_loaded:
        raise HTTPException(status_code=503, detail="Model not loaded. Train first via POST /train.")
    X = prepare_features_single(req)
    prediction = max(0.0, float(model.predict(X)[0]))
    confidence = min(0.95, max(0.5, model_metrics.get("r2_score", 0.7)))
    return {
        "success": True,
        "sku": req.sku,
        "predicted_demand": round(prediction, 2),
        "confidence": round(confidence, 2),
        "model_version": "2.0.0",
    }


@app.post("/batch-predict")
async def batch_predict(req: BatchPredictRequest):
    if not model_loaded:
        raise HTTPException(status_code=503, detail="Model not loaded.")
    results = []
    for item in req.items:
        try:
            X = prepare_features_single(item)
            pred = max(0.0, float(model.predict(X)[0]))
            results.append({"sku": item.sku, "predicted_demand": round(pred, 2), "success": True})
        except Exception as e:
            results.append({"sku": item.sku, "predicted_demand": 0, "success": False, "error": str(e)})
    return {"success": True, "predictions": results}


# --------------- Inventory Insights ---------------
@app.post("/inventory-insights")
async def inventory_insights(req: BatchInsightRequest):
    """Analyze all products and return risk levels, alerts, and reorder suggestions."""
    if not model_loaded:
        raise HTTPException(status_code=503, detail="Model not loaded.")

    insights = []
    for p in req.products:
        # Predict demand
        try:
            pred_req = PredictRequest(
                sku=p.sku, category=p.category,
                stock_quantity=p.current_stock, reorder_level=p.reorder_point,
                reorder_quantity=50, unit_price=p.price,
                warehouse_location="Main Warehouse", status="Active",
                order_lead_time=p.lead_time_days,
            )
            X = prepare_features_single(pred_req)
            weekly_demand = max(0.0, float(model.predict(X)[0]))
        except Exception:
            weekly_demand = max(p.avg_weekly_sales, 1)

        weeks = max(1, math.ceil(p.lead_time_days / 7))
        predicted_demand = weekly_demand * weeks
        avg_weekly = max(p.avg_weekly_sales, weekly_demand, 0.01)

        risk = compute_risk_level(p.current_stock, predicted_demand, p.safety_stock, p.lead_time_days, avg_weekly)
        suggested_order = max(0, math.ceil(predicted_demand + p.safety_stock - p.current_stock))
        alert = generate_alert(p.name, p.sku, p.current_stock, predicted_demand, p.safety_stock, risk, p.lead_time_days, avg_weekly)
        explanation = generate_explanation(p.name, suggested_order, predicted_demand, p.safety_stock, p.current_stock, weeks)
        confidence = min(0.95, max(0.5, model_metrics.get("r2_score", 0.7)))

        insights.append({
            "product": p.name,
            "sku": p.sku,
            "category": p.category,
            "predicted_demand": round(predicted_demand, 1),
            "current_stock": p.current_stock,
            "safety_stock": p.safety_stock,
            "suggested_order": suggested_order,
            "risk_level": risk,
            "alert": alert,
            "confidence": round(confidence, 2),
            "explanation": explanation,
        })

    # Sort by risk severity
    risk_order = {"Critical": 0, "High": 1, "Medium": 2, "Overstock": 3, "Low": 4}
    insights.sort(key=lambda x: risk_order.get(x["risk_level"], 5))

    return {"success": True, "count": len(insights), "insights": insights}


# --------------- Reorder Plan ---------------
@app.post("/reorder-plan")
async def reorder_plan(req: BatchInsightRequest):
    """Generate a complete smart reorder plan for all products."""
    if not model_loaded:
        raise HTTPException(status_code=503, detail="Model not loaded.")

    plan_items = []
    total_cost = 0.0
    for p in req.products:
        try:
            pred_req = PredictRequest(
                sku=p.sku, category=p.category,
                stock_quantity=p.current_stock, reorder_level=p.reorder_point,
                reorder_quantity=50, unit_price=p.price,
                warehouse_location="Main Warehouse", status="Active",
                order_lead_time=p.lead_time_days,
            )
            X = prepare_features_single(pred_req)
            weekly_demand = max(0.0, float(model.predict(X)[0]))
        except Exception:
            weekly_demand = max(p.avg_weekly_sales, 1)

        weeks = max(1, math.ceil(p.lead_time_days / 7))
        predicted_demand = weekly_demand * weeks
        suggested_order = max(0, math.ceil(predicted_demand + p.safety_stock - p.current_stock))

        if suggested_order <= 0:
            continue

        cost = suggested_order * p.price
        total_cost += cost
        avg_weekly = max(p.avg_weekly_sales, weekly_demand, 0.01)
        risk = compute_risk_level(p.current_stock, predicted_demand, p.safety_stock, p.lead_time_days, avg_weekly)
        explanation = generate_explanation(p.name, suggested_order, predicted_demand, p.safety_stock, p.current_stock, weeks)

        plan_items.append({
            "product": p.name,
            "sku": p.sku,
            "category": p.category,
            "current_stock": p.current_stock,
            "predicted_demand": round(predicted_demand, 1),
            "safety_stock": p.safety_stock,
            "suggested_order": suggested_order,
            "lead_time_days": p.lead_time_days,
            "estimated_cost": round(cost, 2),
            "risk_level": risk,
            "explanation": explanation,
        })

    risk_order = {"Critical": 0, "High": 1, "Medium": 2, "Overstock": 3, "Low": 4}
    plan_items.sort(key=lambda x: risk_order.get(x["risk_level"], 5))

    return {
        "success": True,
        "plan": {
            "generated_at": datetime.now().isoformat(),
            "total_items": len(plan_items),
            "total_estimated_cost": round(total_cost, 2),
            "items": plan_items,
        },
    }


# --------------- Alerts ---------------
@app.post("/alerts")
async def generate_alerts(req: BatchInsightRequest):
    """Generate natural-language AI alerts for all products."""
    if not model_loaded:
        raise HTTPException(status_code=503, detail="Model not loaded.")

    alerts = []
    for p in req.products:
        try:
            pred_req = PredictRequest(
                sku=p.sku, category=p.category,
                stock_quantity=p.current_stock, reorder_level=p.reorder_point,
                reorder_quantity=50, unit_price=p.price,
                warehouse_location="Main Warehouse", status="Active",
                order_lead_time=p.lead_time_days,
            )
            X = prepare_features_single(pred_req)
            weekly_demand = max(0.0, float(model.predict(X)[0]))
        except Exception:
            weekly_demand = max(p.avg_weekly_sales, 1)

        weeks = max(1, math.ceil(p.lead_time_days / 7))
        predicted_demand = weekly_demand * weeks
        avg_weekly = max(p.avg_weekly_sales, weekly_demand, 0.01)
        risk = compute_risk_level(p.current_stock, predicted_demand, p.safety_stock, p.lead_time_days, avg_weekly)
        alert_text = generate_alert(p.name, p.sku, p.current_stock, predicted_demand, p.safety_stock, risk, p.lead_time_days, avg_weekly)

        if risk in ("Critical", "High", "Medium", "Overstock"):
            alerts.append({
                "product": p.name,
                "sku": p.sku,
                "risk_level": risk,
                "alert": alert_text,
                "current_stock": p.current_stock,
                "predicted_demand": round(predicted_demand, 1),
            })

    risk_order = {"Critical": 0, "High": 1, "Overstock": 2, "Medium": 3}
    alerts.sort(key=lambda x: risk_order.get(x["risk_level"], 5))

    return {"success": True, "count": len(alerts), "alerts": alerts}


# --------------- Model Info / Health ---------------
@app.get("/health", response_model=HealthResponse)
async def health_check():
    return HealthResponse(
        status="healthy" if model_loaded else "degraded",
        model_loaded=model_loaded,
        version="2.0.0",
        timestamp=datetime.now().isoformat(),
    )


@app.get("/model-info")
async def model_info():
    if not model_loaded:
        return {"loaded": False, "message": "No model loaded. Use POST /train to train one."}
    return {
        "loaded": True,
        "algorithm": model_metrics.get("algorithm", "unknown"),
        "features": features,
        "metrics": model_metrics,
        "categories": list(label_encoders["Category"].classes_) if "Category" in label_encoders and label_encoders["Category"] is not None else [],
        "warehouses": list(label_encoders["Warehouse_Location"].classes_) if "Warehouse_Location" in label_encoders and label_encoders["Warehouse_Location"] is not None else [],
        "statuses": list(label_encoders["Status"].classes_) if "Status" in label_encoders and label_encoders["Status"] is not None else [],
        "model_type": type(model).__name__ if model else "None",
    }


# --------------- Run ---------------
if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("ML_SERVICE_PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
