import pandas as pd
from typing import Optional


def _safe_int(value, default: int = 0) -> int:
    try:
        return int(float(str(value).replace(",", "").strip()))
    except (ValueError, TypeError):
        return default


def _safe_float(value, default: float = 0.0) -> float:
    try:
        cleaned = str(value).replace(",", "").replace("$", "").replace("£", "").replace("€", "").strip()
        return float(cleaned)
    except (ValueError, TypeError):
        return default


def _safe_str(value, default: str = "Unknown") -> str:
    if value is None:
        return default
    cleaned = str(value).strip()
    if cleaned in ("", "None", "nan", "N/A", "n/a", "-", "—"):
        return default
    return cleaned


def _parse_date(value) -> Optional[str]:
    if value is None:
        return None
    s = str(value).strip()
    if s in ("", "None", "nan", "N/A", "-", "—"):
        return None
    try:
        result = pd.to_datetime(s, errors="coerce")
        if pd.isna(result):
            return None
        return result.isoformat()
    except Exception:
        return None


def compute_currency_values(data: dict, usd_to_gbp: float, gbp_to_usd: float) -> dict:
    """
    Core currency rule:
    - If usd_price_per_pc is a valid non-zero number → USD PO
    - If gbp_price_per_pc is a valid non-zero number → GBP PO
    - Exactly one will be filled; compute the other via live rate.
    """
    def safe_pos_float(v):
        try:
            f = float(str(v).replace(",", "").strip())
            return f if f > 0 else None
        except Exception:
            return None

    qty = _safe_int(data.get("total_order_qty") or 0)
    usd_pc = safe_pos_float(data.get("usd_price_per_pc"))
    gbp_pc = safe_pos_float(data.get("gbp_price_per_pc"))

    if usd_pc:
        data["po_currency"] = "USD"
        data["usd_price_per_pc"] = usd_pc
        data["gbp_price_per_pc"] = round(usd_pc * usd_to_gbp, 4)
        data["total_value_usd"] = round(qty * usd_pc, 2)
        data["total_value_gbp"] = round(data["total_value_usd"] * usd_to_gbp, 2)
        data["exchange_rate"] = usd_to_gbp
    elif gbp_pc:
        data["po_currency"] = "GBP"
        data["gbp_price_per_pc"] = gbp_pc
        data["usd_price_per_pc"] = round(gbp_pc * gbp_to_usd, 4)
        data["total_value_gbp"] = round(qty * gbp_pc, 2)
        data["total_value_usd"] = round(data["total_value_gbp"] * gbp_to_usd, 2)
        data["exchange_rate"] = gbp_to_usd
    else:
        data["po_currency"] = "USD"
        data["total_value_usd"] = 0.0
        data["total_value_gbp"] = 0.0
        data["exchange_rate"] = usd_to_gbp

    return data


def normalize_po_data(raw: dict) -> dict:
    """Normalize raw extracted PO data into a clean dict ready for DB insertion.
    Currency values are NOT computed here — call compute_currency_values() after.
    """
    # Sum line item quantities for total_order_qty if not already present
    line_items_raw = raw.get("line_items") or []
    total_qty = _safe_int(raw.get("total_order_qty")) or sum(
        _safe_int(i.get("order_quantity")) for i in line_items_raw
    )

    # Pick unit price from first line item if not at PO level
    first_item = line_items_raw[0] if line_items_raw else {}
    usd_pc = raw.get("usd_price_per_pc") or first_item.get("unit_price")
    gbp_pc = raw.get("gbp_price_per_pc")

    normalized = {
        "po_number": _safe_str(raw.get("po_number"), "PO-UNKNOWN"),
        "supplier": _safe_str(raw.get("supplier")),
        "brand": _safe_str(raw.get("brand")),
        "buyer": _safe_str(raw.get("buyer")),
        "category": _safe_str(raw.get("category")),
        "currency": _safe_str(raw.get("currency"), "USD"),  # legacy
        "order_date": _parse_date(raw.get("order_date") or raw.get("po_recd_date")),
        "delivery_date": _parse_date(raw.get("delivery_date") or raw.get("confirmed_ex_factory")),
        "confirmed_ex_factory": _parse_date(raw.get("confirmed_ex_factory")),
        "revised_ex_factory": _parse_date(raw.get("revised_ex_factory")),
        # New fields
        "total_order_qty": total_qty,
        "usd_price_per_pc": usd_pc,
        "gbp_price_per_pc": gbp_pc,
        "business_unit": raw.get("business_unit"),
        "department": raw.get("department"),
        "color": raw.get("color"),
        "country": raw.get("country"),
        "supplier_ref_no": raw.get("supplier_ref_no"),
        "product_description": raw.get("product_description"),
        "new_rebuy": raw.get("new_rebuy"),
        "factory": raw.get("factory"),
        "style_number": raw.get("style_number"),
        "mode": raw.get("mode"),
        "port_of_loading": raw.get("port_of_loading"),
        "incoterms": raw.get("incoterms"),
        "sample_approved_status": raw.get("sample_approved_status"),
        "sustainable": raw.get("sustainable"),
        "line_items": [],
    }

    for item in line_items_raw:
        normalized["line_items"].append({
            "style_number": _safe_str(item.get("style_number"), "UNKNOWN"),
            "order_quantity": _safe_int(item.get("order_quantity")),
            "unit_price": _safe_float(item.get("unit_price")),
            "delivery_date_confirmed": _parse_date(item.get("delivery_date_confirmed")),
            "delivery_date_actual": _parse_date(item.get("delivery_date_actual")),
        })

    return normalized
