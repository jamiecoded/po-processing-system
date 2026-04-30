import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

engine = create_engine(os.getenv("DATABASE_URL"))

queries = [
    "ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS confirmed_ex_factory TIMESTAMP;",
    "ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS revised_ex_factory TIMESTAMP;",
    "ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS po_currency VARCHAR;",
    "ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS usd_price_per_pc FLOAT;",
    "ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS gbp_price_per_pc FLOAT;",
    "ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS total_value_usd FLOAT;",
    "ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS total_value_gbp FLOAT;",
    "ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS exchange_rate FLOAT;",
    "ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS total_order_qty INTEGER;",
    "ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS business_unit VARCHAR;",
    "ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS department VARCHAR;",
    "ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS color VARCHAR;",
    "ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS country VARCHAR;",
    "ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS supplier_ref_no VARCHAR;",
    "ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS product_description VARCHAR;",
    "ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS new_rebuy VARCHAR;",
    "ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS factory VARCHAR;",
    "ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS style_number VARCHAR;",
    "ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS mode VARCHAR;",
    "ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS port_of_loading VARCHAR;",
    "ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS incoterms VARCHAR;",
    "ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS sample_approved_status VARCHAR;",
    "ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS sustainable VARCHAR;",
    "ALTER TABLE line_items ADD COLUMN IF NOT EXISTS delivery_date_confirmed TIMESTAMP;",
    "ALTER TABLE line_items ADD COLUMN IF NOT EXISTS delivery_date_actual TIMESTAMP;",
    "ALTER TABLE line_items ADD COLUMN IF NOT EXISTS line_total_usd FLOAT;",
    "ALTER TABLE line_items ADD COLUMN IF NOT EXISTS line_total_gbp FLOAT;"
]

with engine.begin() as conn:
    for q in queries:
        try:
            conn.execute(text(q))
        except Exception as e:
            print(f"Error on {q}: {e}")

print("Migration complete")
