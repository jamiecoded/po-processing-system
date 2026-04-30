# PO Processing System
<br/>
<p align="center">
  <img src="./frontend/src/assets/Purchase%20Order%20System%202.png" alt="PO Processing System Dashboard" width="100%">
</p>
<br/>

**Live Application:** [**https://po-processing-system.vercel.app**](https://po-processing-system.vercel.app)

## Objective
This project automates the extraction of purchase order (PO) data from PDF files into a centralized system. It replaces manual data entry by extracting fields, storing them in a database, and serving them via APIs to an analytics dashboard.

---

## Features

### 1. Data Processing
- **Automated Imports:** Parses inbound PO PDFs to eliminate manual entry.
- **Data Normalization:** Extracts standard fields: Supplier, Brand, Buyer, Category, Style Number, Order Quantity, Unit Price, Order Date, and Delivery Date.
- **Fallback Logic:** Uses fuzzy-matching and regex to adapt to different vendor layouts.

### 2. Storage & API
- **Database:** Uses PostgreSQL for relational storage.
- **REST APIs:** FastAPI backend for frontend queries and integration.
- **Export:** Export data to Excel (`.xlsx`) or `CSV`.

### 3. Dashboard
A React dashboard for data visualization:
- **Metrics:** Shows Order Counts, Supplier Values, and Quantities.
- **Delivery Tracking:** Tracks days between Order Date and Delivery Date.
- **Currency:** Converts USD order values to GBP using live rates.
- **Filters:** Sort by Date Range, Suppliers, Brands, and Categories.

### 4. Tech Stack

- **Frontend:** React, Vite, Recharts (Deployed on Vercel)
- **Backend:** Python, FastAPI, pdfplumber, pandas (Deployed on Render)
- **Database:** PostgreSQL
- **Security:** JWT Authentication

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
