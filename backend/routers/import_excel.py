from fastapi import APIRouter, File, UploadFile, Depends, HTTPException
from sqlalchemy.orm import Session
import pandas as pd
import io

from database import get_db
from auth import get_current_user
from models import PurchaseOrder, LineItem
from normalizer import compute_currency_values, _safe_int, _safe_float
from routers.currency import refresh_rates, get_cached_rates

router = APIRouter()

EXCEL_COL_MAP = {
    "BUSINESS UNITS": "business_unit",
    "SUPPLIER": "supplier",
    "FACTORY": "factory",
    "BRAND": "brand",
    "BUYER NAME": "buyer",
    "DEPARTMENT": "department",
    "CATEGORY": "category",
    "STYLE NO": "style_number",
    "NEW/REBUY": "new_rebuy",
    "COLOR": "color",
    "PO NO": "po_number",
    "COUNTRY": "country",
    "Supplier Ref. No.": "supplier_ref_no",
    "Product Description": "product_description",
    "PO RECD DATE": "po_recd_date",
    "TOTAL ORDER QTY": "total_order_qty",
    "USD PRICE PER PC": "usd_price_per_pc",
    "GBP PRICE PER PC": "gbp_price_per_pc",
    "USD \nTOTAL PO VALUE": "total_value_usd_raw",
    "GBP \nTOTAL PO VALUE": "total_value_gbp_raw",
    "CONFIRMED EX-FACTORY": "confirmed_ex_factory",
    "REVISED EX- FACTORY": "revised_ex_factory",
    "Delivery Date": "delivery_date_col",
    "MODE": "mode",
    "Port of loading": "port_of_loading",
    "Sample approved status": "sample_approved_status",
    "Sustainable": "sustainable",
    "Incoterms": "incoterms",
}


def _clean(v):
    if v is None or (isinstance(v, float) and pd.isna(v)):
        return None
    s = str(v).strip()
    if s in {"-", "—", "N/A", "NA", "", "NO Info", "NO info", "No Info", "nan"}:
        return None
    return s


def _to_float(v):
    try:
        f = float(str(v).replace(",", ""))
        return f if f > 0 else None
    except Exception:
        return None


def _to_int(v):
    try:
        return int(float(str(v).replace(",", "")))
    except Exception:
        return 0


def _to_date(v):
    if v is None:
        return None
    try:
        result = pd.to_datetime(v, errors="coerce")
        return None if pd.isna(result) else result.to_pydatetime()
    except Exception:
        return None


@router.post("/import/excel")
async def import_excel(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if not file.filename.lower().endswith((".xlsx", ".xls")):
        raise HTTPException(400, "File must be .xlsx or .xls")

    await refresh_rates()
    usd_to_gbp, gbp_to_usd = get_cached_rates()

    content = await file.read()
    try:
        # Row 1 (index 1) is the real header — row 0 has formula/label rows
        df = pd.read_excel(io.BytesIO(content), header=1)
    except Exception as e:
        raise HTTPException(400, f"Could not read Excel file: {e}")

    # Rename columns using map
    rename = {col: EXCEL_COL_MAP[col] for col in df.columns if col in EXCEL_COL_MAP}
    df = df.rename(columns=rename)

    imported, updated, skipped, errors = 0, 0, 0, []

    for idx, row in df.iterrows():
        po_num = _clean(row.get("po_number"))
        if not po_num:
            skipped += 1
            continue

        try:
            qty = _to_int(row.get("total_order_qty"))
            usd_pc = _to_float(row.get("usd_price_per_pc"))
            gbp_pc = _to_float(row.get("gbp_price_per_pc"))

            currency_data = compute_currency_values(
                {
                    "total_order_qty": qty,
                    "usd_price_per_pc": usd_pc,
                    "gbp_price_per_pc": gbp_pc,
                },
                usd_to_gbp,
                gbp_to_usd,
            )

            delivery_date = _to_date(row.get("delivery_date_col"))
            confirmed_ef = _to_date(row.get("confirmed_ex_factory"))
            revised_ef = _to_date(row.get("revised_ex_factory"))
            po_recd = _to_date(row.get("po_recd_date"))

            fields = {
                "po_number": po_num,
                "business_unit": _clean(row.get("business_unit")),
                "supplier": _clean(row.get("supplier")) or "Unknown",
                "factory": _clean(row.get("factory")),
                "brand": _clean(row.get("brand")) or "Unknown",
                "buyer": _clean(row.get("buyer")) or "Unknown",
                "department": _clean(row.get("department")),
                "category": _clean(row.get("category")) or "Unknown",
                "style_number": _clean(row.get("style_number")),
                "new_rebuy": _clean(row.get("new_rebuy")),
                "color": _clean(row.get("color")),
                "country": _clean(row.get("country")),
                "supplier_ref_no": _clean(row.get("supplier_ref_no")),
                "product_description": _clean(row.get("product_description")),
                "total_order_qty": qty,
                "usd_price_per_pc": currency_data["usd_price_per_pc"],
                "gbp_price_per_pc": currency_data["gbp_price_per_pc"],
                "total_value_usd": currency_data["total_value_usd"],
                "total_value_gbp": currency_data["total_value_gbp"],
                "po_currency": currency_data["po_currency"],
                "exchange_rate": currency_data["exchange_rate"],
                "confirmed_ex_factory": confirmed_ef,
                "revised_ex_factory": revised_ef,
                "delivery_date": delivery_date,
                "order_date": po_recd,
                "mode": _clean(row.get("mode")),
                "port_of_loading": _clean(row.get("port_of_loading")),
                "sample_approved_status": _clean(row.get("sample_approved_status")),
                "sustainable": _clean(row.get("sustainable")),
                "incoterms": _clean(row.get("incoterms")),
                "uploaded_filename": file.filename,
                "status": "active",
                "user_id": current_user.id,
                # legacy
                "currency": currency_data["po_currency"],
            }

            existing = db.query(PurchaseOrder).filter(
                PurchaseOrder.po_number == po_num
            ).first()

            if existing:
                for k, v in fields.items():
                    if v is not None:
                        setattr(existing, k, v)
                po = existing
                updated += 1
            else:
                po = PurchaseOrder(**{k: v for k, v in fields.items()
                                     if hasattr(PurchaseOrder, k)})
                db.add(po)
                imported += 1

            db.flush()

            # Upsert line item
            style = _clean(row.get("style_number"))
            if style:
                li_existing = (
                    db.query(LineItem)
                    .filter(LineItem.po_id == po.id, LineItem.style_number == style)
                    .first()
                )
                li_data = {
                    "style_number": style,
                    "order_quantity": qty,
                    "unit_price": usd_pc or gbp_pc or 0,
                    "line_total_usd": currency_data["total_value_usd"],
                    "line_total_gbp": currency_data["total_value_gbp"],
                    "delivery_date_confirmed": confirmed_ef,
                    "delivery_date_actual": delivery_date,
                }
                if li_existing:
                    for k, v in li_data.items():
                        setattr(li_existing, k, v)
                else:
                    db.add(LineItem(po_id=po.id, **li_data))

            db.commit()

        except Exception as e:
            db.rollback()
            errors.append({"row": int(idx) + 2, "po_number": po_num, "error": str(e)})

    return {
        "imported": imported,
        "updated": updated,
        "skipped": skipped,
        "errors": errors,
        "total_processed": imported + updated + skipped + len(errors),
    }
