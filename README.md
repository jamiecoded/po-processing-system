# PO Processing System
**Live Application:** [**https://po-processing-system.vercel.app**](https://po-processing-system.vercel.app)

## Objective
The core objective of this prototype is to automate the extraction of purchase order (PO) data directly from PDF files into a centralized software system. Historically, this workflow relied on tedious manual data-entry translating rigid PDFs into Excel spreadsheets.

This platform replaces that manual bottleneck with a seamless workflow that natively parses formatting, stores structured fields in a cloud database, and establishes high-speed APIs routing real-time procurement data directly into interactive intelligence dashboards for various departments.

---

## Scope

### 1. Data Extraction & Transformation
- **Automated Imports:** Instantly parses inbound PO dataset geometries, completely eliminating manual PDF-to-Excel workflow conversions.
- **Data Normalization:** Extracts and standardizes crucial procurement fields: Supplier, Brand, Buyer, Category, Style Number, Order Quantity, Unit Price, Order Date, and Delivery Date.
- **Robust Error Handling:** Employs advanced fuzzy-matching and regex fallback logic to adapt dynamically when vendor layouts omit fields or restructure templates, guaranteeing pristine backend data integrity.

### 2. Data Storage & Pipelines
- **Relational Storage:** Information is natively persisted into a strongly-typed `PostgreSQL` instance.
- **REST APIs:** Full internal REST architecture powering instantaneous front-end queries and system integration.
- **Data Export:** Integrated capability permitting users to extract sanitized datasets instantly back out to Excel (`.xlsx`) or `CSV` formatting for external analysis.

### 3. Dashboard & Insights
Built exclusively via React and Recharts, the centralized Web-Dashboard offers real-time visualization:
- **Core Insights:** Dynamically showcases aggregate Order Counts, total Supplier Value matrices, and Quantity distribution.
- **Delivery Timeline Logic:** Features a granular Delivery Gap analytic, tracking exact days between formal `Order Date` vs `Actual Delivery` requirements natively.
- **Live FX Conversion:** Hooks into an active FIAT integration continuously interpolating global USD order values strictly into GBP on the fly.
- **Interactive Filers:** Comprehensive sorting tools toggling data globally by custom Date Ranges, Suppliers, Brands, and Categories.

### 4. System Architecture

#### End-to-End Workflow Diagram
```text
[PDF Upload]
     ↓
[Intelligent Data Extraction (Fuzzy Matching + RegEx)]
     ↓
[Transformation & Normalization]
     ↓
[PostgreSQL Cloud Database]
     ↓
[FastAPI REST Interface (with Auth)]
     ↓
[Live React Analytics Dashboard]
```

#### Technology Stack
- **Frontend Layer:** `React.js`, `Vite`, `React Router`, `Recharts` — **Deployed on Vercel**
- **Backend Layer:** `Python`, `FastAPI`, `pdfplumber`, `rapidfuzz`, `pandas` — **Deployed on Render (Web Service)**
- **Database Engine:** `PostgreSQL` — **Hosted uniquely via Render/Supabase Cloud**
- **Security:** Standard JSON Web Token (JWT) Bearer Authentication locking private routes and data flow. 

---

## Setup Instructions (Local Development)

### 1. Database Configuration
1. Initialize a `PostgreSQL` database.
2. Store the connection string mapping in your environment (e.g., `postgresql://user:password@localhost:5432/po_db`).

### 2. Backend Server
```bash
cd backend
python -m venv .venv
source .venv/Scripts/activate  # (Windows)
# or: source .venv/bin/activate (Mac/Linux)

# Install Application Requirements
pip install -r requirements.txt

# Store your secrets
echo "DATABASE_URL=postgresql://user:password@localhost:5432/po_db" > .env
echo "SECRET_KEY=yoursecretkey123" >> .env

# Boot the Server (Tables are auto-generated on launch)
uvicorn main:app --reload --port 8000
```

### 3. Frontend Client
```bash
cd frontend
npm install

# Map your backend port locally
echo "VITE_API_URL=http://localhost:8000" > .env

# Launch Vite Hot-Reloading
npm run dev
```
