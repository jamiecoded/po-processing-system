# AutoPO – Intelligent Purchase Order Processing System

## Overview
**AutoPO** is a full-stack automation prototype designed to instantly extract, structure, and visualize procurement data from static PDF Purchase Orders. 

Historically, companies rely on manual data entry to translate inbound vendor PDFs into rigid Excel formats. AutoPO eliminates this bottleneck by seamlessly parsing document metadata and individual line items, cleaning the data, storing it securely, and actively monitoring supply-chain timelines via a live React analytics dashboard.

**High-Level Workflow:**  
`PDF Upload` -> `Parse & Extract` -> `Normalize Data` -> `Database Store` -> `REST API Served` -> `React UI Insights`

---

## Features
- **PDF Upload Engine:** Direct drag-and-drop interface prioritizing localized processing metrics.
- **Robust Field Extraction:** Employs fuzzy-matching via `rapidfuzz` to securely lift fields overcoming vendor labeling variances:
  - Supplier, Brand, Buyer, Category
  - Style Number, Order Quantity, Unit Price
  - Document Order Date & Confirmed/Actual Delivery Dates
- **Data Normalization:** Middleware strictly validates, sanitizes, and corrects date formats stringency formatting via `pandas`.
- **Relational Storage:** Fully typed models backing transactions strictly into PostgreSQL.
- **REST API:** FastAPI application providing rapid data retrieval.
- **Dynamic Analytics Dashboard:** Live React-based visualization showcasing core KPIs without needing page refreshes.
- **Live Currency Interpolation:** Pulls active exchange rates mapping all USD data precisely to GBP natively.
- **Native Exports:** Raw byte-stream conversions offering instant `Excel` and `CSV` dashboard downloads.
- **Authentication Wrapper:** Prototype-level JSON Web Token (JWT) integration securing the REST API and restricting unauthorized React routes.

---

## Tech Stack
### Cloud & Deployment Stack
- **Frontend** → **[Vercel](https://vercel.com/)** (Free, perfectly optimized for Vite/React client-routing)
- **Backend** → **[Render](https://render.com/)** (Web Service containerized for heavy Python operations)
- **Database** → **Render PostgreSQL** (Free, natively linked to the Web Service natively avoiding external DNS resolution drops)

### Application Layers
- **Frontend Layer:** `React.js`, `Vite`, `React Router DOM`, `Recharts` (Visualizations), Vanilla CSS.
- **Backend Layer:** `FastAPI`, `Uvicorn`, `SQLAlchemy`.
- **Database Engine:** `PostgreSQL`.
- **Parsing Libraries:** `pdfplumber`, `PyMuPDF`, `rapidfuzz`, `pandas`.
- **Third-Party APIs:** `frankfurter.app` (Live FIAT Currency).

---

## System Architecture

```text
       [User]
          ↓ (Interacts)
      [React Frontend] (Upload + Filters)
          ↓ (HTTP POST)
      [FastAPI REST API] 
          ↓
[PDF Parser Pipeline] → [Normalizer Pipeline]
          ↓ (SQLAlchemy)
 [PostgreSQL Database]
          ↓ (HTTP GET)
 [React Analytics Dashboard]
```

---

## Setup Instructions

### 1. Database Configuration
AutoPO requires a relational PostgreSQL database.
1. Spin up a local `PostgreSQL` database (or use your deployed Render PostgreSQL instance).
2. Grab the connection string (E.g., `postgresql://postgres:password@localhost:5432/po_db`).

### 2. Backend Initialization
The backend server runs entirely on Python 3 and FastAPI.
```bash
# Navigate to the API Folder
cd backend

# Create and boot your virtual environment (Windows/Mac)
python -m venv .venv
source .venv/Scripts/activate  # (or source .venv/bin/activate on Mac)

# Install strict dependencies
pip install -r requirements.txt

# Create an Environment File natively
echo "DATABASE_URL=postgresql://postgres:password@localhost:5432/po_db" > .env
echo "SECRET_KEY=yoursecretkey123" >> .env

# Run the Application (It automatically builds all DB Tables on boot)
uvicorn main:app --reload --port 8000
```

### 3. Frontend Initialization
The frontend is structured via Vite.
```bash
# Navigate to the Client folder
cd frontend

# Install Packages
npm install

# Write your environment variables mapping to FastAPI
echo "VITE_API_URL=http://localhost:8000" > .env

# Launch the Development Server
npm run dev
```

---

## API Endpoints
*Complete schema available locally via internal Swagger `http://localhost:8000/docs`*

| Method | Endpoint | Description | Sample Output Slice |
|--------|----------|-------------|----------------------|
| `POST` | `/orders/upload` | Parses multipart file, scrubs the PDF, stores fields matching `models.py`. | `{ "po_number": "PO-1234", "buyer": "Acme Corp", "line_items": [...] }` |
| `GET`  | `/orders` | Fetches active Purchase Orders arrays utilizing optional `category` or `supplier` URL queries. | `[ { "id": 1, "status": "active", "total_value_usd": 150.00 } ]` |
| `GET`  | `/insights` | Computes global dataset KPI aggregations returning distinct arrays specifically built for Charts. | `{ "total_orders": 45, "average_delivery_time_days": 12.4, "by_brand": [...] }` |
| `GET`  | `/export` | Streams binary database blobs allowing instantaneous conversion natively to Excel. | *Binary application/vnd array* |

---

## Dashboard Features
Once data is fed into the `/upload` pipeline, the Dashboard immediately generates intelligent cross-sectional insights:
1. **Dynamic Metrics Tracker**: Instant readouts over Total Orders, Active Suppliers, and Total Pipeline Value mapped across live USD & GBP rates.
2. **Orders By Supplier**: A horizontal categorical breakdown showcasing which suppliers command the highest fiscal volume natively.
3. **Value By Brand**: Granular parsing of brand-level purchasing trends mapped via deep gradients.
4. **Delivery Timeline Graph**: A Bar Chart representing **Time Gap (Days)** mathematically derived from comparing Document Order Date to Extracted Delivery Date.
5. **Realtime Filtering Layer:** Instantly sift thousands of Purchase Orders strictly via Date Rangers, specific Buyers, active Suppliers, or Categories entirely securely.

---

## Assumptions & Limitations
- **Format Rigidity:** The parser attempts its best to utilize fuzzy matching and multi-height layout detection, but fundamentally works optimally on *structured* text-based PDFs. 
- **OCR:** Scanned flat-image PDFs or incredibly chaotic layouts (e.g., highly complex nested grid lines) may miss isolated fields. 
- **Authentication:** The JWT login wrapping serves as a prototype-level mock to prove out authentication flow locking logic.
- **Conversion Limits:** Reverting explicitly to GBP dictates the frankfurter.app FIAT API does not go offline, otherwise throwing a hardcoded fallback mapping rate.

---

## Future Improvements
- **OCR & Computer Vision Implementation:** Integrate strictly sandboxed `Tesseract` or AWS Textract/LLM models for robust flat-image reading without failing on vendor complexity.
- **Real-Time Data Streams:** Implementation of WebSocket streaming over raw polling methods for intense multi-user collaboration.
- **Multi-Tenant System:** Utilizing PostgreSQL Row-Level-Security (RLS) policies completely isolating `Client A` metrics away from `Client B` operations.
- **Intelligent Forecasting:** Plotting out analytical forecasts based exclusively on chronological dataset delivery trends.
