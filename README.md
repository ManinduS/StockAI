<div align="center">

# 🤖 StockAI

### AI-Powered Convenience Store Stock Prediction & Management System

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org/)
[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/atlas)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109+-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](LICENSE)

*An intelligent inventory management system built for Sri Lankan convenience stores, combining modern web technologies with machine learning to forecast demand, detect stock risks, and auto-generate reorder plans.*

</div>

---

## 📋 Table of Contents

- [Features](#-features)
- [System Architecture](#-system-architecture)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [API Endpoints](#-api-endpoints)
- [ML Models](#-ml-models)
- [Screenshots](#-screenshots)
- [Default Credentials](#-default-credentials)
- [Contributing](#-contributing)

---

## ✨ Features

### 📦 Inventory Management
- Real-time product tracking with stock levels, categories, and warehouse locations
- Low stock detection and automated alerts
- Stock adjustment with audit trail
- Bulk product upload via CSV

### 💰 Sales & Analytics
- Record sales and returns with automatic stock updates
- Monthly sales statistics and trend analysis
- Top-selling products by revenue
- Sales summary with net revenue calculations

### 🧠 AI-Powered Demand Forecasting
- **XGBoost** and **Random Forest** model training from store sales data
- Per-product demand prediction with confidence scores
- Batch predictions for entire inventory
- Model performance tracking (R² Score, RMSE)

### ⚠️ Inventory Risk Detection
- **5-level risk classification:** Critical → High → Medium → Low → Overstock
- Explainable AI reasoning for each risk assessment
- Real-time alerts with actionable recommendations

### 📋 Smart Reorder Planning
- AI-generated reorder plans with cost estimates
- Plan approval workflow (Pending → Approved → Exported → Completed)
- CSV export for supplier ordering
- Safety stock and lead time calculations

### 👥 Role-Based Access
- **Admin**: Full access — manage users, products, settings, train ML models
- **Store**: Operational access — record sales, view inventory, forecasts

### ⚙️ System Configuration
- Configurable forecast periods, safety stock defaults, and lead times
- Holiday calendar management (Sri Lankan public holidays pre-loaded)
- Promotion management with demand multipliers

---

## 🏗️ System Architecture

```
┌──────────────────┐     ┌──────────────────────────┐     ┌──────────────────┐
│                  │     │                          │     │                  │
│   React Frontend │────▶│   Node.js/Express API    │────▶│  MongoDB Atlas   │
│   (Port 3000)    │◀────│      (Port 5000)         │◀────│   (Cloud DB)     │
│                  │     │                          │     │                  │
└──────────────────┘     └────────────┬─────────────┘     └──────────────────┘
                                      │
                                      │ REST API
                                      ▼
                         ┌──────────────────────────┐
                         │                          │
                         │  Python FastAPI ML Service│
                         │      (Port 8000)         │
                         │                          │
                         │  ┌────────┐ ┌──────────┐ │
                         │  │XGBoost │ │ Random   │ │
                         │  │        │ │ Forest   │ │
                         │  └────────┘ └──────────┘ │
                         └──────────────────────────┘
```

**Authentication Flow:**
```
User Login → Backend validates credentials → JWT token issued → Token stored
in localStorage → Sent with every subsequent API request via Authorization header
```

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 18, React Router v6, Recharts, Axios | Single-page application with interactive charts |
| **Backend** | Node.js, Express.js, Mongoose, JWT | RESTful API server with role-based authentication |
| **ML Service** | Python, FastAPI, scikit-learn, XGBoost, Pandas | Demand forecasting and risk analysis |
| **Database** | MongoDB Atlas | Cloud-hosted NoSQL database |
| **Auth** | bcrypt.js, JSON Web Tokens | Password hashing and stateless authentication |

---

## 📁 Project Structure

```
StockAI/
├── backend/                          # Node.js Express API Server
│   ├── src/
│   │   ├── config/db.js              # MongoDB connection
│   │   ├── middleware/auth.js         # JWT auth & role authorization
│   │   ├── models/                   # Mongoose schemas
│   │   │   ├── User.js               # User with bcrypt & JWT
│   │   │   ├── Product.js            # Product with low-stock detection
│   │   │   ├── Sale.js               # Sales & returns tracking
│   │   │   ├── ReorderPlan.js        # AI-generated reorder plans
│   │   │   ├── ReorderPlanItem.js    # Individual plan line items
│   │   │   └── Settings.js           # System configuration (singleton)
│   │   ├── routes/                   # API route handlers
│   │   │   ├── auth.routes.js        # Login, register, me
│   │   │   ├── products.routes.js    # Product CRUD + stock adjust
│   │   │   ├── sales.routes.js       # Sales recording + statistics
│   │   │   ├── forecast.routes.js    # ML prediction proxy
│   │   │   ├── reorder.routes.js     # Reorder plan management
│   │   │   ├── settings.routes.js    # System settings
│   │   │   ├── admin.routes.js       # Admin panel operations
│   │   │   └── ai.routes.js          # AI insights & alerts
│   │   ├── services/mlService.js     # ML service HTTP client
│   │   ├── index.js                  # Express server entry point
│   │   ├── seed.js                   # Database seeder
│   │   └── seed-test-data.js         # Test data seeder
│   ├── package.json
│   └── .env.example
│
├── frontend/                         # React SPA
│   ├── public/index.html
│   ├── src/
│   │   ├── components/               # Shared UI components
│   │   │   ├── Navbar.jsx
│   │   │   ├── ProtectedRoute.jsx
│   │   │   ├── ProductCard.jsx
│   │   │   ├── ForecastChart.jsx
│   │   │   └── ReorderTable.jsx
│   │   ├── pages/                    # Page components
│   │   │   ├── Login.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Inventory.jsx
│   │   │   ├── SalesEntry.jsx
│   │   │   ├── Forecast.jsx
│   │   │   ├── ReorderPlan.jsx
│   │   │   ├── AIInsights.jsx
│   │   │   └── Admin.jsx
│   │   ├── context/AuthContext.jsx    # Authentication state
│   │   ├── services/api.js           # Axios API client
│   │   ├── App.jsx                   # Router & layout
│   │   ├── index.js                  # React entry point
│   │   └── index.css                 # Global styles
│   ├── package.json
│   └── .env.example
│
├── ml/                               # Python FastAPI ML Service
│   ├── app.py                        # FastAPI app with training & prediction
│   ├── requirements.txt
│   ├── models/                       # Trained model storage (.pkl)
│   └── .env.example
│
├── data/
│   └── Grocery_Inventory_and_Sales_Dataset.csv   # Training dataset
│
├── docs/
│   ├── ARCHITECTURE.md               # System architecture docs
│   ├── API.md                        # API endpoint reference
│   └── AI_ARCHITECTURE.md            # ML/AI design docs
│
├── .gitignore
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** v18+
- **Python** 3.10+
- **MongoDB Atlas** account (or local MongoDB)
- **npm** (comes with Node.js)
- **pip** (comes with Python)

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/StockAI.git
cd StockAI
```

### 2. Set Up Environment Variables

Copy `.env.example` files and fill in your values:

```bash
# Backend
cp backend/.env.example backend/.env

# ML Service
cp ml/.env.example ml/.env

# Frontend
cp frontend/.env.example frontend/.env
```

**Backend `.env`:**
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
JWT_EXPIRE=7d
ML_SERVICE_URL=http://localhost:8000
CORS_ORIGIN=http://localhost:3000
```

### 3. Install Dependencies

```bash
# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install

# ML Service
cd ../ml && pip install -r requirements.txt
```

### 4. Seed the Database

```bash
cd backend && npm run seed
```

This creates sample products, default settings, and two user accounts.

### 5. Start All Services

Open **three terminals** and run:

```bash
# Terminal 1 — ML Service (start first)
cd ml
uvicorn app:app --host 0.0.0.0 --port 8000

# Terminal 2 — Backend
cd backend
npm start

# Terminal 3 — Frontend
cd frontend
npm start
```

### 6. Open the App

Navigate to **http://localhost:3000** in your browser.

---

## 📡 API Endpoints

### Authentication
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/auth/login` | — | Login with username & password |
| `POST` | `/api/auth/register` | Admin | Register new user |
| `GET` | `/api/auth/me` | ✅ | Get current user profile |

### Products
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/products` | ✅ | List products (filter by category, status, search) |
| `GET` | `/api/products/categories` | ✅ | Get all categories |
| `GET` | `/api/products/low-stock` | ✅ | Get low-stock products |
| `POST` | `/api/products` | Admin | Create product |
| `PUT` | `/api/products/:id` | Admin | Update product |
| `PATCH` | `/api/products/:id/stock` | ✅ | Adjust stock level |
| `DELETE` | `/api/products/:id` | Admin | Delete product |

### Sales
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/sales` | ✅ | List sales with filters |
| `POST` | `/api/sales` | ✅ | Record sale or return |
| `GET` | `/api/sales/summary` | ✅ | Revenue summary |
| `GET` | `/api/sales/stats/monthly` | ✅ | Monthly statistics |
| `GET` | `/api/sales/stats/top-products` | ✅ | Top-selling products |

### AI & Forecasting
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/ai/train-model` | ✅ | Train ML model (XGBoost/Random Forest) |
| `POST` | `/api/ai/predict-demand` | ✅ | Predict demand for a product |
| `GET` | `/api/ai/inventory-insights` | ✅ | Risk analysis for all products |
| `GET` | `/api/ai/reorder-plan` | ✅ | AI-generated reorder plan |
| `GET` | `/api/ai/alerts` | ✅ | AI alerts (Critical/High/Medium) |
| `GET` | `/api/ai/model-metrics` | ✅ | Model performance metrics |

### Reorder Plans
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/reorder/generate` | ✅ | Generate reorder plan with ML |
| `GET` | `/api/reorder` | ✅ | List all plans |
| `GET` | `/api/reorder/:id/export` | ✅ | Export plan as CSV |
| `PATCH` | `/api/reorder/:id/status` | Admin | Update plan status |

> 📖 Full API documentation available in [`docs/API.md`](docs/API.md)

---

## 🧠 ML Models

### Supported Algorithms

| Algorithm | Library | Best For |
|-----------|---------|----------|
| **XGBoost** | xgboost | High accuracy gradient boosting |
| **Random Forest** | scikit-learn | Robust ensemble predictions |

### Training Features

| Feature | Description |
|---------|-------------|
| Category | Product category (encoded) |
| Stock_Quantity | Current stock level |
| Reorder_Level | Reorder trigger point |
| Unit_Price | Product price |
| Warehouse_Location | Storage location (encoded) |
| Inventory_Turnover_Rate | Stock movement speed |
| Order_Lead_Time | Supplier delivery time |
| Days_To_Expiry | Shelf life remaining |

### Risk Classification

| Level | Condition | Action |
|-------|-----------|--------|
| 🚨 **Critical** | Stock = 0 | Immediate reorder required |
| ⚠️ **High** | Stock < lead time demand or ≤ safety stock | Urgent reorder needed |
| 🟡 **Medium** | Stock ≤ safety stock × 1.5 | Plan reorder soon |
| ✅ **Low** | Stock is healthy | No action needed |
| 📦 **Overstock** | Stock > predicted demand × 3 | Consider reducing orders |

---

## 🔐 Default Credentials

| Role | Username | Password |
|------|----------|----------|
| Admin | `admin` | `admin123` |
| Store | `store1` | `store123` |

> ⚠️ **Change these immediately in production!**

---

## 📸 Screenshots

> *Add screenshots of your application pages here:*
> - Login Page
> - Dashboard
> - Inventory Management
> - AI Insights & Risk Detection
> - Smart Reorder Plan
> - Sales Analytics
> - Admin Panel

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License.

---

<div align="center">

**Built with ❤️ for Sri Lankan convenience stores**

*StockAI — Smart inventory starts with smart predictions*

</div>
