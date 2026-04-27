import re
import logging
from typing import Dict, List, Optional
import pdfplumber
from rapidfuzz import process, fuzz
from dateutil import parser as date_parser

logger = logging.getLogger(__name__)

# Configuration & aliases

FIELD_ALIASES = {
    "supplier": ["supplier", "vendor", "sold by", "manufacturer", "ship from", "from"],
    "buyer": ["buyer", "client", "purchased by", "customer", "consignee", "ship to", "sold to", "bill to", "to"],
    "category": ["category", "product type", "segment", "department", "classification"],
    "brand": ["brand", "label", "division", "collection", "marque"],
    "po_number": ["po no", "po number", "purchase order", "order no", "order#", "po#"],
    "order_date": ["order date", "date of order", "po date", "date"],
    "delivery_date": ["delivery date", "req delivery", "required delivery", "due date", "ship date"]
}

COL_ALIASES = {
    "style_number": ["style no", "style#", "style number", "article", "article#", "item code", "sku", "item no", "item#", "ref no", "model no", "code", "item"],
    "order_quantity": ["order qty", "order quantity", "qty", "quantity", "units", "pcs", "amount"],
    "unit_price": ["unit price", "unit cost", "cost price", "price/unit", "price per", "unit rate", "fob price", "price", "rate"],
    "delivery_date_confirmed": ["conf delivery", "confirmed", "req delivery", "required delivery", "delivery date", "ex-factory", "delivery"],
}

SKIP_ROW_KEYWORDS = {
    "subtotal", "sub-total", "tax", "grand total", "total", "shipping", "discount", "vat", "balance"
}


# Utility functions

def _safe_float(s) -> float:
    if s is None: return 0.0
    cleaned = re.sub(r"[,$£€\s]", "", str(s))
    m = re.search(r"\d+(?:\.\d+)?", cleaned)
    if m:
        try: return float(m.group())
        except ValueError: pass
    return 0.0

def _safe_int(s) -> int:
    if s is None: return 0
    cleaned = re.sub(r"[,$£€\s\.]", "", str(s))  # drop decimals for qty
    m = re.search(r"\d+", cleaned)
    if m:
        try: return int(m.group())
        except ValueError: pass
    return 0

def _parse_date_safe(text) -> Optional[str]:
    if not text or str(text).strip() in ("", "None", "nan"): return None
    try:
        return date_parser.parse(str(text), fuzzy=True).isoformat()
    except Exception:
        return None

def _is_skip_row(text: str) -> bool:
    t = str(text).lower()
    return any(kw in t for kw in SKIP_ROW_KEYWORDS)


# 1. Extract main fields (fuzzy match)

def extract_fields(text: str, warnings: list) -> Dict[str, str]:
    fields = {k: "" for k in FIELD_ALIASES.keys()}
    lines = [line.strip() for line in text.split("\n") if line.strip()]
    
    # Track which fields we found to emit warnings
    found_fields = set()

    for i, line in enumerate(lines):
        line_lower = line.lower()
        
        for field, aliases in FIELD_ALIASES.items():
            if fields[field]: continue # already found
            
            # Fuzzy match the label
            # We check the prefix of the line or short standalone lines
            split_idx = line_lower.find(":")
            label_candidate = line_lower[:min(split_idx, 20)] if split_idx != -1 else line_lower
            if len(label_candidate) > 25: continue # Too long to be a label
            
            best_match = process.extractOne(label_candidate, aliases, scorer=fuzz.partial_ratio)
            
            if best_match and best_match[1] >= 85:
                # We found a label! Now extract the value.
                if split_idx != -1 and len(line[split_idx+1:].strip()) > 1:
                    fields[field] = line[split_idx+1:].strip()
                elif i + 1 < len(lines):
                    # Fallback to multi-line (the value is on the next line)
                    next_val = lines[i+1].strip()
                    # ensure next line isn't another keyword
                    if not process.extractOne(next_val[:20].lower(), sum(FIELD_ALIASES.values(), []), scorer=fuzz.partial_ratio, score_cutoff=85):
                        fields[field] = next_val
                
                found_fields.add(field)

    # Hard regex fallbacks for PO Number if fuzzy failed
    if not fields["po_number"]:
        po_match = re.search(r"(?:PO|Order)[\s#\:\-]+([A-Z0-9\-_]{4,20})", text, re.IGNORECASE)
        if po_match:
            fields["po_number"] = po_match.group(1)
            found_fields.add("po_number")

    # Currency extraction (bonus)
    fields["currency"] = "USD"
    if re.search(r"\bGBP\b|£", text): fields["currency"] = "GBP"
    elif re.search(r"\bEUR\b|€", text): fields["currency"] = "EUR"

    # Warnings for empty crucial fields
    for k in ["supplier", "buyer", "category"]:
        if not fields.get(k):
            warnings.append(f"Low confidence or missing extraction for field: {k}")

    return fields


# 2. Extract line items

def _normalize_item(style: str, qty: int, price: float, deliv: str = None) -> dict:
    return {
        "style_number": str(style).strip(),
        "order_quantity": qty,
        "unit_price": price,
        "delivery_date_confirmed": _parse_date_safe(deliv),
        "delivery_date_actual": None
    }

def strategy_a_table_extraction(page) -> List[Dict]:
    """Strategy A: Detect tables, fiercely fuzzy-match headers, and extract rows."""
    candidates = []
    try:
        tables = page.extract_tables()
    except Exception:
        return candidates

    for table in tables:
        if not table or len(table) < 2: continue
        
        # 1. Identify header row with slight shifts
        header_idx = None
        col_map = {}
        for row_idx, row in enumerate(table):
            temp_map = {}
            for col_idx, cell in enumerate(row):
                if not cell: continue
                c_clean = str(cell).lower().strip().replace('\n', ' ')
                
                for field, aliases in COL_ALIASES.items():
                    if field in temp_map: continue
                    best = process.extractOne(c_clean, aliases, scorer=fuzz.partial_ratio)
                    if best and best[1] >= 85:
                        temp_map[field] = col_idx
            
            
            if "style_number" in temp_map and ("order_quantity" in temp_map or "unit_price" in temp_map):
                header_idx = row_idx
                col_map = temp_map
                break
        
        if header_idx is None: continue

        # 2. Extract Data
        for row in table[header_idx + 1:]:
            if not row or all(not str(c).strip() for c in row): continue
            
            row_txt = " ".join([str(c) for c in row if c])
            if _is_skip_row(row_txt): continue

            # Safely grab mapped columns
            def get_val(key):
                idx = col_map.get(key)
                if idx is not None and 0 <= idx < len(row):
                    return str(row[idx] or "").strip()
                return ""

            style = get_val("style_number")
            qty = _safe_int(get_val("order_quantity"))
            price = _safe_float(get_val("unit_price"))
            deliv = get_val("delivery_date_confirmed")

            # Must have a valid style string and at least a positive quantity or positive price.
            if style and (qty > 0 or price > 0):
                candidates.append(_normalize_item(style, qty, price, deliv))
                
    return candidates

def strategy_b_text_extraction(text: str) -> List[Dict]:
    """Strategy B: Regex chunking across text blocks."""
    candidates = []
    lines = text.split('\n')
    
    for line in lines:
        line = line.strip()
        if not line or _is_skip_row(line): continue
        
        
        m = re.search(r"\b([A-Z0-9\-\_]{3,20})\s+(\d{1,6})\s+[\$£€]?\s*(\d{1,6}(?:\.\d{1,2})?)\b", line, re.IGNORECASE)
        if m:
            style = m.group(1)
            qty = _safe_int(m.group(2))
            price = _safe_float(m.group(3))
            if qty > 0 and price > 0:
                candidates.append(_normalize_item(style, qty, price))
                
    return candidates

def extract_line_items(pdf, text: str, warnings: list) -> List[Dict]:
    items = []
    # Strategy A
    for page in pdf.pages:
        items.extend(strategy_a_table_extraction(page))
        
    if items:
        # Filter duplicates (e.g. table spanned across multiple pages or repeated extractions)
        seen = set()
        dedup = []
        for i in items:
            key = (i["style_number"], i["order_quantity"])
            if key not in seen:
                seen.add(key)
                dedup.append(i)
        return dedup

    # Strategy B (Fallback)
    warnings.append("No structured table detected; Line items fallback parsing used.")
    items = strategy_b_text_extraction(text)
    
    # Filter duplicates safely
    seen = set()
    dedup = []
    for i in items:
        key = (i["style_number"], i["order_quantity"])
        if key not in seen:
            seen.add(key)
            dedup.append(i)
            
    return dedup


# Main run loop

def extract_po_data(file_path: str) -> dict:
    """End-to-end extraction workflow prioritizing robustness."""
    output = {
        "supplier": "",
        "buyer": "",
        "category": "",
        "brand": "",
        "currency": "USD",
        "po_number": "",
        "order_date": "",
        "delivery_date": "",
        "line_items": [],
        "warnings": []
    }
    
    try:
        full_text = ""
        with pdfplumber.open(file_path) as pdf:
            # Extract text
            page_texts = [page.extract_text() for page in pdf.pages]
            full_text = "\n".join([t for t in page_texts if t])
            
            # Extract main fields
            fields = extract_fields(full_text, output["warnings"])
            for k, v in fields.items():
                if k in output:
                    output[k] = v
            
            # Extract line items
            line_items = extract_line_items(pdf, full_text, output["warnings"])
            
            # Filter valid items
            valid_items = [i for i in line_items if i.get("order_quantity", 0) > 0]
            output["line_items"] = valid_items
            
            if not valid_items:
                output["warnings"].append("Critical: Line items returned 0 despite parsing attempt.")
                
    except Exception as e:
        logger.error(f"Extraction Fatal Error: {e}")
        output["warnings"].append(f"Fatal Parser Error: {str(e)}")
        
    return output

