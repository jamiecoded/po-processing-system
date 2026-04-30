from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime

from database import get_db
from auth import get_current_user
import models

router = APIRouter()


@router.get("")
def get_insights(
    supplier: Optional[str] = None,
    buyer: Optional[str] = None,
    category: Optional[str] = None,
    brand: Optional[str] = None,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    base = db.query(models.PurchaseOrder).filter(
        models.PurchaseOrder.user_id == current_user.id,
        models.PurchaseOrder.status != "deleted",
    )
    if supplier:
        base = base.filter(models.PurchaseOrder.supplier.ilike(f"%{supplier}%"))
    if buyer:
        base = base.filter(models.PurchaseOrder.buyer.ilike(f"%{buyer}%"))
    if category:
        base = base.filter(models.PurchaseOrder.category.ilike(f"%{category}%"))
    if brand:
        base = base.filter(models.PurchaseOrder.brand.ilike(f"%{brand}%"))
    if from_date:
        try:
            base = base.filter(models.PurchaseOrder.created_at >= datetime.fromisoformat(from_date))
        except ValueError:
            pass
    if to_date:
        try:
            base = base.filter(models.PurchaseOrder.created_at <= datetime.fromisoformat(to_date))
        except ValueError:
            pass

    all_pos = base.all()

    total_usd = sum(p.total_value_usd or 0 for p in all_pos)
    total_gbp = sum(p.total_value_gbp or 0 for p in all_pos)
    total_qty = sum(p.total_order_qty or 0 for p in all_pos)

    suppliers: dict = {}
    for p in all_pos:
        s = p.supplier or "Unknown"
        if s not in suppliers:
            suppliers[s] = {
                "supplier": s, "order_count": 0, "total_qty": 0,
                "total_value_usd": 0.0, "total_value_gbp": 0.0, "brands": set()
            }
        suppliers[s]["order_count"] += 1
        suppliers[s]["total_qty"] += p.total_order_qty or 0
        suppliers[s]["total_value_usd"] += p.total_value_usd or 0
        suppliers[s]["total_value_gbp"] += p.total_value_gbp or 0
        if p.brand:
            suppliers[s]["brands"].add(p.brand)
    by_supplier = sorted(
        [{"brands": list(v.pop("brands")), **v} for v in suppliers.values()],
        key=lambda x: x["total_value_usd"], reverse=True,
    )

    brands: dict = {}
    for p in all_pos:
        b = p.brand or "Unknown"
        if b not in brands:
            brands[b] = {"brand": b, "order_count": 0, "total_quantity": 0,
                         "total_value_usd": 0.0, "total_value_gbp": 0.0}
        brands[b]["order_count"] += 1
        brands[b]["total_quantity"] += p.total_order_qty or 0
        brands[b]["total_value_usd"] += p.total_value_usd or 0
        brands[b]["total_value_gbp"] += p.total_value_gbp or 0
    by_brand = sorted(brands.values(), key=lambda x: x["total_value_usd"], reverse=True)

    buyers: dict = {}
    for p in all_pos:
        b = p.buyer or "Unknown"
        if b not in buyers:
            buyers[b] = {"buyer": b, "order_count": 0,
                         "total_value_usd": 0.0, "total_value_gbp": 0.0}
        buyers[b]["order_count"] += 1
        buyers[b]["total_value_usd"] += p.total_value_usd or 0
        buyers[b]["total_value_gbp"] += p.total_value_gbp or 0
    by_buyer = sorted(buyers.values(), key=lambda x: x["order_count"], reverse=True)

    cats: dict = {}
    for p in all_pos:
        c = p.category or "Unknown"
        cats[c] = cats.get(c, 0) + 1
    by_category = [{"category": k, "order_count": v} for k, v in cats.items()]

    modes: dict = {}
    for p in all_pos:
        m = p.mode or "Unknown"
        if m not in modes:
            modes[m] = {"mode": m, "order_count": 0, "total_value_usd": 0.0}
        modes[m]["order_count"] += 1
        modes[m]["total_value_usd"] += p.total_value_usd or 0

    usd_pos = [p for p in all_pos if p.po_currency == "USD"]
    gbp_pos = [p for p in all_pos if p.po_currency == "GBP"]
    usd_total = sum(p.total_value_usd or 0 for p in usd_pos)
    gbp_total_native = sum(p.total_value_gbp or 0 for p in gbp_pos)
    grand = usd_total + gbp_total_native
    currency_split = {
        "usd_po_count": len(usd_pos),
        "gbp_po_count": len(gbp_pos),
        "usd_total_value": round(usd_total, 2),
        "gbp_total_value": round(gbp_total_native, 2),
        "usd_percentage": round(usd_total / grand * 100, 1) if grand else 0,
        "gbp_percentage": round(gbp_total_native / grand * 100, 1) if grand else 0,
    }

    timeline = []
    total_gap = 0
    gap_count = 0
    for p in all_pos:
        if p.confirmed_ex_factory or p.delivery_date:
            is_overdue = False
            days_var = None
            if p.confirmed_ex_factory and p.delivery_date:
                days_var = (p.delivery_date - p.confirmed_ex_factory).days
                is_overdue = days_var > 0
            timeline.append({
                "po_number": p.po_number,
                "supplier": p.supplier,
                "brand": p.brand,
                "confirmed_ex_factory": p.confirmed_ex_factory.isoformat() if p.confirmed_ex_factory else None,
                "revised_ex_factory": p.revised_ex_factory.isoformat() if p.revised_ex_factory else None,
                "delivery_date": p.delivery_date.isoformat() if p.delivery_date else None,
                "is_overdue": is_overdue,
                "days_variance": days_var,
            })
            if days_var is not None:
                total_gap += abs(days_var)
                gap_count += 1
        elif p.order_date and p.delivery_date:
            gap = (p.delivery_date - p.order_date).days
            if gap >= 0:
                total_gap += gap
                gap_count += 1
                timeline.append({
                    "po_number": p.po_number,
                    "supplier": p.supplier,
                    "brand": p.brand,
                    "confirmed_ex_factory": None,
                    "revised_ex_factory": None,
                    "delivery_date": p.delivery_date.isoformat(),
                    "is_overdue": False,
                    "days_variance": gap,
                })

    return {
        "total_orders": len(all_pos),
        "total_value_usd": round(total_usd, 2),
        "total_value_gbp": round(total_gbp, 2),
        "total_quantity": total_qty,
        "active_suppliers": len(suppliers),
        "average_delivery_time_days": round(total_gap / gap_count, 1) if gap_count else None,
        "by_supplier": by_supplier,
        "by_brand": by_brand,
        "by_buyer": by_buyer,
        "by_category": by_category,
        "by_mode": list(modes.values()),
        "currency_split": currency_split,
        "delivery_timeline": timeline,
    }
