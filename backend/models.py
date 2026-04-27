from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Index
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
    po_number = Column(String, index=True)
    supplier = Column(String)
    brand = Column(String)
    buyer = Column(String)
    category = Column(String)
    currency = Column(String, default="USD")
    total_value_usd = Column(Float)
    total_value_gbp = Column(Float, nullable=True)
    exchange_rate = Column(Float, nullable=True)
    status = Column(String, default="active")
    created_at = Column(DateTime, default=datetime.utcnow)
    uploaded_filename = Column(String)
    order_date = Column(DateTime, nullable=True)
    delivery_date = Column(DateTime, nullable=True)

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

    purchase_order = relationship("PurchaseOrder", back_populates="line_items")
