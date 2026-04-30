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
    line_total_usd: Optional[float] = None
    line_total_gbp: Optional[float] = None

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
    confirmed_ex_factory: Optional[datetime] = None
    revised_ex_factory: Optional[datetime] = None
    po_currency: Optional[str] = None
    usd_price_per_pc: Optional[float] = None
    gbp_price_per_pc: Optional[float] = None
    total_order_qty: Optional[int] = None
    business_unit: Optional[str] = None
    department: Optional[str] = None
    color: Optional[str] = None
    country: Optional[str] = None
    supplier_ref_no: Optional[str] = None
    product_description: Optional[str] = None
    new_rebuy: Optional[str] = None
    factory: Optional[str] = None
    style_number: Optional[str] = None
    mode: Optional[str] = None
    port_of_loading: Optional[str] = None
    incoterms: Optional[str] = None
    sample_approved_status: Optional[str] = None
    sustainable: Optional[str] = None
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
    total_quantity: Optional[int] = None
    active_suppliers: Optional[int] = None
    average_delivery_time_days: Optional[float] = None
    by_supplier: list = []
    by_brand: list = []
    by_buyer: list = []
    by_category: list = []
    by_mode: list = []
    currency_split: Optional[dict] = None
    delivery_timeline: list = []


class LineItemCreate(BaseModel):
    style_number: str
    order_quantity: int
    unit_price: float
    delivery_date_confirmed: Optional[str] = None
    delivery_date_actual: Optional[str] = None
    line_total_usd: Optional[float] = None
    line_total_gbp: Optional[float] = None


class POIngestRequest(BaseModel):
    po_number: str
    supplier: str
    brand: str
    buyer: str
    category: str
    currency: Optional[str] = "USD"
    order_date: Optional[str] = None
    delivery_date: Optional[str] = None
    confirmed_ex_factory: Optional[str] = None
    revised_ex_factory: Optional[str] = None
    po_currency: Optional[str] = None
    usd_price_per_pc: Optional[float] = None
    gbp_price_per_pc: Optional[float] = None
    total_order_qty: Optional[int] = None
    business_unit: Optional[str] = None
    department: Optional[str] = None
    color: Optional[str] = None
    country: Optional[str] = None
    supplier_ref_no: Optional[str] = None
    product_description: Optional[str] = None
    new_rebuy: Optional[str] = None
    factory: Optional[str] = None
    style_number: Optional[str] = None
    mode: Optional[str] = None
    port_of_loading: Optional[str] = None
    incoterms: Optional[str] = None
    sample_approved_status: Optional[str] = None
    sustainable: Optional[str] = None
    line_items: List[LineItemCreate] = []
