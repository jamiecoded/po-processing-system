import os
import logging
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import declarative_base, sessionmaker
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:password123@localhost:5432/po_db")

# Cloud databases require SSL; local PostgreSQL does not.
_is_local = "localhost" in DATABASE_URL or "127.0.0.1" in DATABASE_URL
if not _is_local and "sslmode" not in DATABASE_URL:
    sep = "&" if "?" in DATABASE_URL else "?"
    DATABASE_URL = f"{DATABASE_URL}{sep}sslmode=require"

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def safe_migrate(eng):
    """Add new columns to existing tables without dropping data."""
    try:
        inspector = inspect(eng)
        if "purchase_orders" not in inspector.get_table_names():
            return  # Tables don't exist yet — create_all handles first run

        po_existing = {col["name"] for col in inspector.get_columns("purchase_orders")}
        po_new = {
            "order_date": "TIMESTAMP",
            "delivery_date": "TIMESTAMP",
            "confirmed_ex_factory": "TIMESTAMP",
            "revised_ex_factory": "TIMESTAMP",
            "po_currency": "VARCHAR",
            "usd_price_per_pc": "FLOAT",
            "gbp_price_per_pc": "FLOAT",
            "total_order_qty": "INTEGER",
            "business_unit": "VARCHAR",
            "department": "VARCHAR",
            "color": "VARCHAR",
            "country": "VARCHAR",
            "supplier_ref_no": "VARCHAR",
            "product_description": "VARCHAR",
            "new_rebuy": "VARCHAR",
            "factory": "VARCHAR",
            "style_number": "VARCHAR",
            "mode": "VARCHAR",
            "port_of_loading": "VARCHAR",
            "incoterms": "VARCHAR",
            "sample_approved_status": "VARCHAR",
            "sustainable": "VARCHAR",
        }
        with eng.connect() as conn:
            for col, col_type in po_new.items():
                if col not in po_existing:
                    conn.execute(text(f'ALTER TABLE purchase_orders ADD COLUMN "{col}" {col_type}'))
                    logger.info(f"Added column purchase_orders.{col}")
            conn.commit()

        li_existing = {col["name"] for col in inspector.get_columns("line_items")}
        li_new = {"line_total_usd": "FLOAT", "line_total_gbp": "FLOAT"}
        with eng.connect() as conn:
            for col, col_type in li_new.items():
                if col not in li_existing:
                    conn.execute(text(f'ALTER TABLE line_items ADD COLUMN "{col}" {col_type}'))
                    logger.info(f"Added column line_items.{col}")
            conn.commit()

    except Exception as e:
        logger.error(f"safe_migrate error: {e}")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
