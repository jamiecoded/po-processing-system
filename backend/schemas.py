from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime


class UserCreate(BaseModel):
    email: EmailStr
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str


class LineItemOut(BaseModel):
    id: int
    po_id: int
    style_number: str
    order_quantity: int
    unit_price: float
    delivery_date_confirmed: Optional[datetime] = None
    delivery_date_actual: Optional[datetime] = None

    class Config:
        from_attributes = True


class PurchaseOrderOut(BaseModel):
    id: int
    po_number: str
    supplier: str
    brand: str
    buyer: str
    category: str
    currency: str
    total_value_usd: float
    total_value_gbp: Optional[float] = None
    exchange_rate: Optional[float] = None
    status: str
    created_at: datetime
    uploaded_filename: str
    order_date: Optional[datetime] = None
    delivery_date: Optional[datetime] = None
    line_items: List[LineItemOut] = []

    class Config:
        from_attributes = True


class SupplierInsight(BaseModel):
    supplier: str
    order_count: int
    total_value_usd: float
    total_value_gbp: Optional[float] = None


class BrandInsight(BaseModel):
    brand: str
    order_count: int
    total_quantity: int


class CategoryInsight(BaseModel):
    category: str
    order_count: int


class DeliveryItem(BaseModel):
    po_number: str
    supplier: str
    order_date: Optional[datetime] = None
    delivery_date: Optional[datetime] = None
    time_gap_days: Optional[int] = None

class InsightResponse(BaseModel):
    total_orders: int
    total_value_usd: float
    total_value_gbp: float
    average_delivery_time_days: Optional[float] = None
    by_supplier: List[SupplierInsight]
    by_brand: List[BrandInsight]
    by_category: List[CategoryInsight]
    delivery_timeline: List[DeliveryItem]


class LineItemCreate(BaseModel):
    style_number: str
    order_quantity: int
    unit_price: float
    delivery_date_confirmed: Optional[str] = None
    delivery_date_actual: Optional[str] = None


class POIngestRequest(BaseModel):
    po_number: str
    supplier: str
    brand: str
    buyer: str
    category: str
    currency: Optional[str] = "USD"
    order_date: Optional[str] = None
    delivery_date: Optional[str] = None
    line_items: List[LineItemCreate] = []
