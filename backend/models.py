from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

    purchase_orders = relationship("PurchaseOrder", back_populates="owner")


class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)

    # Core identity
    po_number = Column(String, index=True)
    supplier = Column(String)
    brand = Column(String)
    buyer = Column(String)
    category = Column(String)
    status = Column(String, default="active")
    created_at = Column(DateTime, default=datetime.utcnow)
    uploaded_filename = Column(String)
    currency = Column(String, default="USD", nullable=True)  # legacy, kept for compat

    # Dates
    order_date = Column(DateTime, nullable=True)
    delivery_date = Column(DateTime, nullable=True)
    confirmed_ex_factory = Column(DateTime, nullable=True)
    revised_ex_factory = Column(DateTime, nullable=True)

    # Currency
    po_currency = Column(String, nullable=True)          # "USD" or "GBP"
    usd_price_per_pc = Column(Float, nullable=True)
    gbp_price_per_pc = Column(Float, nullable=True)
    total_value_usd = Column(Float, nullable=True)
    total_value_gbp = Column(Float, nullable=True)
    exchange_rate = Column(Float, nullable=True)
    total_order_qty = Column(Integer, nullable=True)

    # Classification
    business_unit = Column(String, nullable=True)
    department = Column(String, nullable=True)
    color = Column(String, nullable=True)
    country = Column(String, nullable=True)
    supplier_ref_no = Column(String, nullable=True)
    product_description = Column(String, nullable=True)
    new_rebuy = Column(String, nullable=True)
    factory = Column(String, nullable=True)
    style_number = Column(String, nullable=True)

    # Logistics
    mode = Column(String, nullable=True)
    port_of_loading = Column(String, nullable=True)
    incoterms = Column(String, nullable=True)
    sample_approved_status = Column(String, nullable=True)
    sustainable = Column(String, nullable=True)

    owner = relationship("User", back_populates="purchase_orders")
    line_items = relationship(
        "LineItem",
        back_populates="purchase_order",
        cascade="all, delete-orphan",
    )


class LineItem(Base):
    __tablename__ = "line_items"

    id = Column(Integer, primary_key=True, index=True)
    po_id = Column(Integer, ForeignKey("purchase_orders.id"))
    style_number = Column(String)
    order_quantity = Column(Integer)
    unit_price = Column(Float)
    delivery_date_confirmed = Column(DateTime, nullable=True)
    delivery_date_actual = Column(DateTime, nullable=True)
    line_total_usd = Column(Float, nullable=True)
    line_total_gbp = Column(Float, nullable=True)

    purchase_order = relationship("PurchaseOrder", back_populates="line_items")
