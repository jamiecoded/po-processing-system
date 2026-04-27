from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from typing import Optional, List
import uuid
import os
import tempfile
import httpx
from datetime import datetime

from database import get_db
from auth import get_current_user
import models
import schemas
from extractor import extract_po_data
from normalizer import normalize_po_data

router = APIRouter()


async def fetch_usd_gbp_rate() -> float:
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://api.frankfurter.app/latest?from=USD&to=GBP",
                timeout=5.0,
            )
            data = response.json()
            return float(data["rates"]["GBP"])
    except Exception:
        return 0.79


def parse_dt(s: Optional[str]) -> Optional[datetime]:
    if s is None:
        return None
    try:
        return datetime.fromisoformat(s)
    except Exception:
        return None


@router.post("/upload", response_model=schemas.PurchaseOrderOut)
async def upload_po(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if not (file.filename or "").lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted")

    tmp_dir = tempfile.gettempdir()
    tmp_path = os.path.join(tmp_dir, f"{uuid.uuid4()}.pdf")

    try:
        content = await file.read()
        with open(tmp_path, "wb") as f:
            f.write(content)

        raw = extract_po_data(tmp_path)
        normalized = normalize_po_data(raw)
        exchange_rate = await fetch_usd_gbp_rate()

        total_usd = normalized["total_value_usd"]
        total_gbp = round(total_usd * exchange_rate, 2)

        po = models.PurchaseOrder(
            user_id=current_user.id,
            po_number=normalized["po_number"],
            supplier=normalized["supplier"],
            brand=normalized["brand"],
            buyer=normalized["buyer"],
            category=normalized["category"],
            currency=normalized["currency"],
            total_value_usd=total_usd,
            total_value_gbp=total_gbp,
            exchange_rate=exchange_rate,
            status="active",
            uploaded_filename=file.filename or "unknown.pdf",
            order_date=parse_dt(normalized.get("order_date")),
            delivery_date=parse_dt(normalized.get("delivery_date")),
        )

        db.add(po)
        db.flush()

        for item in normalized.get("line_items", []):
            li = models.LineItem(
                po_id=po.id,
                style_number=item["style_number"],
                order_quantity=item["order_quantity"],
                unit_price=item["unit_price"],
                delivery_date_confirmed=parse_dt(item.get("delivery_date_confirmed")),
                delivery_date_actual=parse_dt(item.get("delivery_date_actual")),
            )
            db.add(li)

        db.commit()
        db.refresh(po)
        return po

    except SQLAlchemyError as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Processing error: {str(e)}")
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)


@router.post("/ingest", response_model=schemas.PurchaseOrderOut)
async def ingest_po(
    payload: schemas.POIngestRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Accept structured PO data from a buyer system API integration."""
    exchange_rate = await fetch_usd_gbp_rate()

    total_usd = round(
        sum((i.order_quantity or 0) * (i.unit_price or 0.0) for i in payload.line_items), 2
    )
    total_gbp = round(total_usd * exchange_rate, 2)

    po = models.PurchaseOrder(
        user_id=current_user.id,
        po_number=payload.po_number,
        supplier=payload.supplier,
        brand=payload.brand,
        buyer=payload.buyer,
        category=payload.category,
        currency=payload.currency,
        total_value_usd=total_usd,
        total_value_gbp=total_gbp,
        exchange_rate=exchange_rate,
        status="active",
        uploaded_filename="api-ingest",
        order_date=parse_dt(payload.order_date),
        delivery_date=parse_dt(payload.delivery_date),
    )
    db.add(po)
    db.flush()

    for item in payload.line_items:
        li = models.LineItem(
            po_id=po.id,
            style_number=item.style_number,
            order_quantity=item.order_quantity,
            unit_price=item.unit_price,
            delivery_date_confirmed=parse_dt(item.delivery_date_confirmed),
            delivery_date_actual=parse_dt(item.delivery_date_actual),
        )
        db.add(li)

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
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
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
    if from_date:
        try:
            dt = datetime.fromisoformat(from_date)
            query = query.filter(models.PurchaseOrder.created_at >= dt)
        except ValueError:
            pass
    if to_date:
        try:
            dt = datetime.fromisoformat(to_date)
            query = query.filter(models.PurchaseOrder.created_at <= dt)
        except ValueError:
            pass

    return query.order_by(models.PurchaseOrder.created_at.desc()).all()


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
