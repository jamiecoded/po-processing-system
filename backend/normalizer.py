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
    if cleaned in ("", "None", "nan", "N/A", "n/a"):
        return default
    return cleaned


def _parse_date(value) -> Optional[str]:
    if value is None:
        return None
    s = str(value).strip()
    if s in ("", "None", "nan", "N/A"):
        return None
    try:
        result = pd.to_datetime(s, errors="coerce")
        if pd.isna(result):
            return None
        return result.isoformat()
    except Exception:
        return None


def normalize_po_data(raw: dict) -> dict:
    normalized = {
        "po_number": _safe_str(raw.get("po_number"), "PO-UNKNOWN"),
        "supplier": _safe_str(raw.get("supplier")),
        "brand": _safe_str(raw.get("brand")),
        "buyer": _safe_str(raw.get("buyer")),
        "category": _safe_str(raw.get("category")),
        "currency": _safe_str(raw.get("currency"), "USD"),
        "order_date": _parse_date(raw.get("order_date")),
        "delivery_date": _parse_date(raw.get("delivery_date")),
        "line_items": [],
    }

    total_value = 0.0
    for item in raw.get("line_items") or []:
        qty = _safe_int(item.get("order_quantity"))
        price = _safe_float(item.get("unit_price"))
        total_value += qty * price
        normalized["line_items"].append({
            "style_number": _safe_str(item.get("style_number"), "UNKNOWN"),
            "order_quantity": qty,
            "unit_price": price,
            "delivery_date_confirmed": _parse_date(item.get("delivery_date_confirmed")),
            "delivery_date_actual": _parse_date(item.get("delivery_date_actual")),
        })

    normalized["total_value_usd"] = round(total_value, 2)
    return normalized
