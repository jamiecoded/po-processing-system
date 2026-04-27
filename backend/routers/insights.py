from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from auth import get_current_user
import models
import schemas

router = APIRouter()


@router.get("", response_model=schemas.InsightResponse)
def get_insights(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    active_orders = (
        db.query(models.PurchaseOrder)
        .filter(
            models.PurchaseOrder.user_id == current_user.id,
            models.PurchaseOrder.status == "active",
        )
        .all()
    )

    total_orders = len(active_orders)
    total_value_usd = sum(po.total_value_usd or 0.0 for po in active_orders)
    total_value_gbp = sum(po.total_value_gbp or 0.0 for po in active_orders)

    supplier_map: dict = {}
    for po in active_orders:
        s = po.supplier or "Unknown"
        if s not in supplier_map:
            supplier_map[s] = {"order_count": 0, "total_value_usd": 0.0, "total_value_gbp": 0.0}
        supplier_map[s]["order_count"] += 1
        supplier_map[s]["total_value_usd"] += po.total_value_usd or 0.0
        supplier_map[s]["total_value_gbp"] += po.total_value_gbp or 0.0

    by_supplier = [{"supplier": k, **v} for k, v in supplier_map.items()]

    brand_map: dict = {}
    for po in active_orders:
        b = po.brand or "Unknown"
        if b not in brand_map:
            brand_map[b] = {"order_count": 0, "total_quantity": 0}
        brand_map[b]["order_count"] += 1
        brand_map[b]["total_quantity"] += sum(li.order_quantity or 0 for li in po.line_items)

    by_brand = [{"brand": k, **v} for k, v in brand_map.items()]

    category_map: dict = {}
    for po in active_orders:
        c = po.category or "Unknown"
        category_map[c] = category_map.get(c, 0) + 1

    by_category = [{"category": k, "order_count": v} for k, v in category_map.items()]

    delivery_timeline = []
    total_gap_days = 0
    gap_count = 0
    for po in active_orders:
        if po.order_date and po.delivery_date:
            gap = (po.delivery_date - po.order_date).days
            if gap >= 0:
                total_gap_days += gap
                gap_count += 1
                delivery_timeline.append({
                    "po_number": po.po_number,
                    "supplier": po.supplier,
                    "order_date": po.order_date,
                    "delivery_date": po.delivery_date,
                    "time_gap_days": gap,
                })
                
    avg_gap = round(total_gap_days / gap_count, 1) if gap_count > 0 else None

    return {
        "total_orders": total_orders,
        "total_value_usd": round(total_value_usd, 2),
        "total_value_gbp": round(total_value_gbp, 2),
        "average_delivery_time_days": avg_gap,
        "by_supplier": by_supplier,
        "by_brand": by_brand,
        "by_category": by_category,
        "delivery_timeline": delivery_timeline,
    }
