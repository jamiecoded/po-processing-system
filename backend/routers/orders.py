from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from typing import Optional, List
import uuid
import os
import tempfile
from datetime import datetime

from database import get_db
from auth import get_current_user
import models
import schemas
from extractor import extract_po_data
from normalizer import normalize_po_data, compute_currency_values
from routers.currency import refresh_rates, get_cached_rates

router = APIRouter()


def parse_dt(s: Optional[str]) -> Optional[datetime]:
    if s is None:
        return None
    try:
        return datetime.fromisoformat(s)
    except Exception:
        return None


@router.post("/upload")
async def upload_pdfs(
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Accept one or more PDF purchase orders."""
    await refresh_rates()
    usd_to_gbp, gbp_to_usd = get_cached_rates()

    results, errors = [], []

    for file in files:
        if not (file.filename or "").lower().endswith(".pdf"):
            errors.append({"filename": file.filename, "error": "Not a PDF file"})
            continue

        tmp_path = os.path.join(tempfile.gettempdir(), f"{uuid.uuid4()}.pdf")
        try:
            content = await file.read()
            with open(tmp_path, "wb") as f:
                f.write(content)

            raw = extract_po_data(tmp_path)
            normalized = normalize_po_data(raw)
            normalized = compute_currency_values(normalized, usd_to_gbp, gbp_to_usd)

            # Build PO object — only pass fields that exist on the model
            po_fields = {
                k: v for k, v in normalized.items()
                if hasattr(models.PurchaseOrder, k) and k != "line_items"
            }
            po_fields["user_id"] = current_user.id
            po_fields["uploaded_filename"] = file.filename or "unknown.pdf"
            po_fields["status"] = "active"

            # Convert ISO date strings to datetime objects
            for date_field in (
                "order_date", "delivery_date",
                "confirmed_ex_factory", "revised_ex_factory"
            ):
                if po_fields.get(date_field) and isinstance(po_fields[date_field], str):
                    po_fields[date_field] = parse_dt(po_fields[date_field])

            po = models.PurchaseOrder(**po_fields)
            db.add(po)
            db.flush()

            for item in normalized.get("line_items", []):
                usd_pc = normalized.get("usd_price_per_pc") or item.get("unit_price") or 0
                gbp_pc = normalized.get("gbp_price_per_pc") or 0
                qty = item.get("order_quantity") or 0
                li = models.LineItem(
                    po_id=po.id,
                    style_number=item["style_number"],
                    order_quantity=qty,
                    unit_price=item["unit_price"],
                    delivery_date_confirmed=parse_dt(item.get("delivery_date_confirmed")),
                    delivery_date_actual=parse_dt(item.get("delivery_date_actual")),
                    line_total_usd=round(qty * usd_pc, 2),
                    line_total_gbp=round(qty * gbp_pc, 2),
                )
                db.add(li)

            db.commit()
            db.refresh(po)
            results.append({
                "filename": file.filename,
                "status": "ok",
                "po_number": po.po_number,
                "id": po.id,
                "supplier": po.supplier,
                "brand": po.brand,
                "total_value_usd": po.total_value_usd,
                "total_value_gbp": po.total_value_gbp,
                "po_currency": po.po_currency,
                "total_order_qty": po.total_order_qty,
                "line_items_count": len(normalized.get("line_items", [])),
            })

        except SQLAlchemyError as e:
            db.rollback()
            errors.append({"filename": file.filename, "error": f"DB error: {str(e)}"})
        except Exception as e:
            db.rollback()
            errors.append({"filename": file.filename, "error": str(e)})
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)

    return {
        "processed": len(results),
        "results": results,
        "errors": errors,
    }


@router.post("/ingest", response_model=schemas.PurchaseOrderOut)
async def ingest_po(
    payload: schemas.POIngestRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Accept structured PO data from a buyer system integration."""
    await refresh_rates()
    usd_to_gbp, gbp_to_usd = get_cached_rates()

    total_qty = sum(i.order_quantity or 0 for i in payload.line_items)
    currency_data = compute_currency_values(
        {
            "total_order_qty": total_qty,
            "usd_price_per_pc": payload.line_items[0].unit_price if payload.line_items else None,
            "gbp_price_per_pc": None,
        },
        usd_to_gbp, gbp_to_usd,
    )

    po = models.PurchaseOrder(
        user_id=current_user.id,
        po_number=payload.po_number,
        supplier=payload.supplier,
        brand=payload.brand,
        buyer=payload.buyer,
        category=payload.category,
        currency=payload.currency,
        po_currency=currency_data["po_currency"],
        total_value_usd=currency_data["total_value_usd"],
        total_value_gbp=currency_data["total_value_gbp"],
        exchange_rate=currency_data["exchange_rate"],
        total_order_qty=total_qty,
        status="active",
        uploaded_filename="api-ingest",
        order_date=parse_dt(payload.order_date),
        delivery_date=parse_dt(payload.delivery_date),
    )
    db.add(po)
    db.flush()

    for item in payload.line_items:
        db.add(models.LineItem(
            po_id=po.id,
            style_number=item.style_number,
            order_quantity=item.order_quantity,
            unit_price=item.unit_price,
            delivery_date_confirmed=parse_dt(item.delivery_date_confirmed),
            delivery_date_actual=parse_dt(item.delivery_date_actual),
        ))

    try:
        db.commit()
        db.refresh(po)
        return po
    except SQLAlchemyError as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@router.get("", response_model=List[schemas.PurchaseOrderOut])
def list_orders(
    supplier: Optional[str] = None,
    buyer: Optional[str] = None,
    category: Optional[str] = None,
    brand: Optional[str] = None,
    po_currency: Optional[str] = None,
    department: Optional[str] = None,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    skip: int = 0,
    limit: int = 500,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    query = db.query(models.PurchaseOrder).filter(
        models.PurchaseOrder.user_id == current_user.id,
        models.PurchaseOrder.status != "deleted",
    )
    if supplier:
        query = query.filter(models.PurchaseOrder.supplier.ilike(f"%{supplier}%"))
    if buyer:
        query = query.filter(models.PurchaseOrder.buyer.ilike(f"%{buyer}%"))
    if category:
        query = query.filter(models.PurchaseOrder.category.ilike(f"%{category}%"))
    if brand:
        query = query.filter(models.PurchaseOrder.brand.ilike(f"%{brand}%"))
    if po_currency:
        query = query.filter(models.PurchaseOrder.po_currency == po_currency.upper())
    if department:
        query = query.filter(models.PurchaseOrder.department.ilike(f"%{department}%"))
    if from_date:
        try:
            query = query.filter(models.PurchaseOrder.created_at >= datetime.fromisoformat(from_date))
        except ValueError:
            pass
    if to_date:
        try:
            query = query.filter(models.PurchaseOrder.created_at <= datetime.fromisoformat(to_date))
        except ValueError:
            pass
    return query.order_by(models.PurchaseOrder.created_at.desc()).offset(skip).limit(limit).all()


@router.get("/{order_id}", response_model=schemas.PurchaseOrderOut)
def get_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    po = db.query(models.PurchaseOrder).filter(
        models.PurchaseOrder.id == order_id,
        models.PurchaseOrder.user_id == current_user.id,
        models.PurchaseOrder.status != "deleted",
    ).first()
    if not po:
        raise HTTPException(status_code=404, detail="Order not found")
    return po


@router.delete("/{order_id}")
def delete_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    po = db.query(models.PurchaseOrder).filter(
        models.PurchaseOrder.id == order_id,
        models.PurchaseOrder.user_id == current_user.id,
    ).first()
    if not po:
        raise HTTPException(status_code=404, detail="Order not found")
    try:
        po.status = "deleted"
        db.commit()
        return {"message": "Order deleted"}
    except SQLAlchemyError as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
