import re
import logging
from typing import Dict, List, Optional
import pdfplumber
from rapidfuzz import process, fuzz
from dateutil import parser as date_parser

logger = logging.getLogger(__name__)

NULL_VALUES = {"-", "—", "n/a", "na", "none", "", "no info"}

FIELD_ALIASES = {
    "business_unit":          ["business unit", "business units", "bu"],
    "po_number":              ["po no", "po number", "purchase order no", "po#", "order no", "po no."],
    "supplier":               ["supplier", "vendor", "manufacturer"],
    "factory":                ["factory", "factory name"],
    "brand":                  ["brand", "brand name", "label"],
    "buyer":                  ["buyer name", "buyer", "customer", "ship to"],
    "department":             ["department", "dept"],
    "category":               ["category", "product type", "product category"],
    "style_number":           ["style no", "style number", "sku", "item no", "style"],
    "new_rebuy":              ["new/rebuy", "new rebuy", "order type"],
    "color":                  ["color", "colour"],
    "country":                ["country", "destination country", "country of origin"],
    "supplier_ref_no":        ["supplier ref. no.", "supplier ref", "supplier reference", "ref no"],
    "product_description":    ["product description", "description", "style description"],
    "po_recd_date":           ["po recd date", "po received date", "po date", "date received"],
    "total_order_qty":        ["total order qty", "total qty", "order quantity", "quantity", "total order quantity"],
    "usd_price_per_pc":       ["usd price per pc", "usd price", "unit price usd", "price usd", "unit price"],
    "gbp_price_per_pc":       ["gbp price per pc", "gbp price", "unit price gbp", "price gbp"],
    "total_value_usd":        ["usd total po value", "usd\ntotal po value", "total po value usd", "total value usd"],
    "total_value_gbp":        ["gbp total po value", "gbp\ntotal po value", "total po value gbp", "total value gbp"],
    "confirmed_ex_factory":   ["confirmed ex-factory", "confirmed ex factory", "ex factory date", "ex-factory"],
    "revised_ex_factory":     ["revised ex- factory", "revised ex-factory", "revised ex factory"],
    "delivery_date":          ["delivery date", "delivery"],
    "order_date":             ["order date", "po date", "date of order"],
    "mode":                   ["mode", "shipping mode", "transport mode"],
    "port_of_loading":        ["port of loading", "pol", "port"],
    "sample_approved_status": ["sample approved status", "sample approved", "sample status"],
    "sustainable":            ["sustainable", "sustainability"],
    "incoterms":              ["incoterms", "incoterm"],
}

COL_ALIASES = {
    "style_number":           ["style no", "style#", "style number", "article", "item code", "sku", "item no"],
    "order_quantity":         ["order qty", "order quantity", "qty", "quantity", "units", "pcs"],
    "unit_price":             ["unit price", "unit cost", "cost price", "price/unit", "fob price", "price", "rate"],
    "usd_price_per_pc":       ["usd price per pc", "usd price", "price usd"],
    "gbp_price_per_pc":       ["gbp price per pc", "gbp price", "price gbp"],
    "delivery_date_confirmed": ["conf delivery", "confirmed", "ex-factory", "delivery date", "ex factory"],
}

SKIP_ROW_KEYWORDS = {"subtotal", "sub-total", "tax", "grand total", "total", "shipping", "discount", "vat"}

# Words that indicate a cell is a company/person name, not a field value for po_number
_COMPANY_INDICATORS = {"limited", "ltd", "inc", "llc", "gmbh", "corporation", "corp", "group", ".com", "plc", "bv"}


def _clean_val(v) -> Optional[str]:
    if v is None:
        return None
    s = str(v).strip()
    if s.lower() in NULL_VALUES:
        return None
    return s


def _safe_float(s) -> float:
    if s is None:
        return 0.0
    cleaned = re.sub(r"[,$£€\s]", "", str(s))
    m = re.search(r"\d+(?:\.\d+)?", cleaned)
    if m:
        try:
            return float(m.group())
        except ValueError:
            pass
    return 0.0


def _safe_int(s) -> int:
    if s is None:
        return 0
    cleaned = re.sub(r"[,$£€\s\.]", "", str(s))
    m = re.search(r"\d+", cleaned)
    if m:
        try:
            return int(m.group())
        except ValueError:
            pass
    return 0


def _parse_date_safe(text) -> Optional[str]:
    if not text or str(text).strip() in ("", "None", "nan"):
        return None
    try:
        return date_parser.parse(str(text), fuzzy=True).isoformat()
    except Exception:
        return None


def _is_skip_row(text: str) -> bool:
    t = str(text).lower()
    return any(kw in t for kw in SKIP_ROW_KEYWORDS)


def _match_field(header: str) -> Optional[str]:
    """Return canonical field name for a header string, or None."""
    h = header.lower().strip().replace("\n", " ")
    for field, aliases in FIELD_ALIASES.items():
        for alias in aliases:
            if alias == h or alias in h or h in alias:
                return field
    return None


def _looks_like_po_number(value: str) -> bool:
    """Return True only if value looks like a PO/order code, not a company/person name."""
    if not value:
        return False
    val_lower = value.lower()
    # Reject if it contains company name indicators
    if any(ind in val_lower for ind in _COMPANY_INDICATORS):
        return False
    # Reject if it has more than one space (company names, descriptions)
    if value.count(" ") > 1:
        return False
    # A PO number: strip hyphens/underscores/slashes, should be mostly alphanumeric
    clean = re.sub(r"[\-_/\s]", "", value)
    if len(clean) >= 4 and re.match(r"^[A-Z0-9]+$", clean, re.IGNORECASE):
        return True
    return False


def extract_fields(text: str, warnings: list) -> Dict[str, Optional[str]]:
    """Extract header-level fields from text using label:value line matching."""
    fields = {k: None for k in FIELD_ALIASES.keys()}
    lines = [line.strip() for line in text.split("\n") if line.strip()]

    for i, line in enumerate(lines):
        line_lower = line.lower()

        for field, aliases in FIELD_ALIASES.items():
            if fields[field]:
                continue

            split_idx = line_lower.find(":")
            label_candidate = line_lower[:min(split_idx, 25)] if split_idx != -1 else line_lower
            if len(label_candidate) > 30:
                continue

            best = process.extractOne(label_candidate, aliases, scorer=fuzz.partial_ratio)
            if best and best[1] >= 85:
                if split_idx != -1 and len(line[split_idx + 1:].strip()) > 1:
                    val = _clean_val(line[split_idx + 1:].strip())
                    if val:
                        fields[field] = val
                elif i + 1 < len(lines):
                    next_val = lines[i + 1].strip()
                    all_aliases = sum(FIELD_ALIASES.values(), [])
                    other = process.extractOne(
                        next_val[:20].lower(), all_aliases,
                        scorer=fuzz.partial_ratio, score_cutoff=85
                    )
                    if not other:
                        fields[field] = _clean_val(next_val)

    # Tightened PO number fallback: only accept values that look like real PO codes
    if not fields["po_number"]:
        m = re.search(r"(?:PO|Order)[\s#:\-]+([A-Z0-9\-_]{5,20})", text, re.IGNORECASE)
        if m and _looks_like_po_number(m.group(1)):
            fields["po_number"] = m.group(1)

    # Discard po_number if it looks like a company name (caught by earlier label matching)
    if fields["po_number"] and not _looks_like_po_number(fields["po_number"]):
        logger.warning(f"Rejected spurious po_number value: {fields['po_number']!r}")
        fields["po_number"] = None

    return fields


def extract_fields_from_tables(pdf, warnings: list) -> Dict[str, Optional[str]]:
    """
    Table-based header field extraction — handles two common layouts:
    1. Horizontal: row[0] = field headers, row[1] = values  (e.g. boohoo format)
    2. Key-value: each row has [label, value] in two columns
    """
    fields = {k: None for k in FIELD_ALIASES.keys()}

    for page in pdf.pages:
        try:
            tables = page.extract_tables()
        except Exception:
            continue

        for table in tables:
            if not table:
                continue

            # --- Strategy A: horizontal header row ---
            # Look for a row where ≥2 cells match known field aliases
            for row_idx, header_row in enumerate(table):
                if row_idx >= len(table) - 1:
                    break
                col_to_field: Dict[int, str] = {}
                for col_idx, cell in enumerate(header_row):
                    if not cell:
                        continue
                    matched = _match_field(str(cell))
                    if matched and matched not in col_to_field.values():
                        col_to_field[col_idx] = matched

                if len(col_to_field) >= 2:
                    value_row = table[row_idx + 1]
                    for col_idx, field_name in col_to_field.items():
                        if fields[field_name]:
                            continue
                        if col_idx < len(value_row):
                            raw = str(value_row[col_idx] or "").strip()
                            val = _clean_val(raw)
                            if val:
                                # Extra guard: don't let company names become po_number
                                if field_name == "po_number" and not _looks_like_po_number(val):
                                    logger.warning(
                                        f"Table extraction: rejected spurious po_number {val!r}"
                                    )
                                    continue
                                fields[field_name] = val

            # --- Strategy B: two-column key-value table ---
            for row in table:
                if not row or len(row) < 2:
                    continue
                label_cell = str(row[0] or "").strip()
                # Value may be in column 1 or column 2 if column 1 is empty
                value_cell = None
                for col_idx in range(1, min(len(row), 4)):
                    candidate = str(row[col_idx] or "").strip()
                    if candidate:
                        value_cell = candidate
                        break

                if not label_cell or not value_cell:
                    continue

                matched = _match_field(label_cell)
                if matched and not fields[matched]:
                    val = _clean_val(value_cell)
                    if val:
                        if matched == "po_number" and not _looks_like_po_number(val):
                            continue
                        fields[matched] = val

    return fields


def extract_line_items(pdf, text: str, warnings: list) -> List[Dict]:
    items = []

    for page in pdf.pages:
        try:
            tables = page.extract_tables()
        except Exception:
            continue

        for table in tables:
            if not table or len(table) < 2:
                continue

            header_idx = None
            col_map = {}

            for row_idx, row in enumerate(table):
                temp_map = {}
                for col_idx, cell in enumerate(row):
                    if not cell:
                        continue
                    c_clean = str(cell).lower().strip().replace("\n", " ")
                    for field, aliases in COL_ALIASES.items():
                        if field in temp_map:
                            continue
                        best = process.extractOne(c_clean, aliases, scorer=fuzz.partial_ratio)
                        if best and best[1] >= 80:
                            temp_map[field] = col_idx

                if "style_number" in temp_map and (
                    "order_quantity" in temp_map or "unit_price" in temp_map
                ):
                    header_idx = row_idx
                    col_map = temp_map
                    break

            if header_idx is None:
                continue

            for row in table[header_idx + 1:]:
                if not row or all(not str(c).strip() for c in row):
                    continue
                row_txt = " ".join(str(c) for c in row if c)
                if _is_skip_row(row_txt):
                    continue

                def get_val(key):
                    idx = col_map.get(key)
                    if idx is not None and 0 <= idx < len(row):
                        return str(row[idx] or "").strip()
                    return ""

                style = get_val("style_number")
                qty = _safe_int(get_val("order_quantity"))
                usd_p = _safe_float(get_val("usd_price_per_pc"))
                gbp_p = _safe_float(get_val("gbp_price_per_pc"))
                price = usd_p or gbp_p or _safe_float(get_val("unit_price"))
                deliv = _clean_val(get_val("delivery_date_confirmed"))

                if style and (qty > 0 or price > 0):
                    items.append({
                        "style_number": style,
                        "order_quantity": qty,
                        "unit_price": price,
                        "usd_price": usd_p if usd_p else None,
                        "gbp_price": gbp_p if gbp_p else None,
                        "delivery_date_confirmed": _parse_date_safe(deliv),
                        "delivery_date_actual": None,
                    })

    if items:
        seen = set()
        dedup = []
        for i in items:
            key = (i["style_number"], i["order_quantity"])
            if key not in seen:
                seen.add(key)
                dedup.append(i)
        return dedup

    warnings.append("No structured table detected; using regex fallback for line items.")
    fallback = []
    for line in text.split("\n"):
        line = line.strip()
        if not line or _is_skip_row(line):
            continue
        m = re.search(
            r"\b([A-Z0-9\-\_]{3,20})\s+(\d{1,6})\s+[\$£€]?\s*(\d{1,6}(?:\.\d{1,2})?)\b",
            line, re.IGNORECASE
        )
        if m:
            qty = _safe_int(m.group(2))
            price = _safe_float(m.group(3))
            if qty > 0 and price > 0:
                fallback.append({
                    "style_number": m.group(1),
                    "order_quantity": qty,
                    "unit_price": price,
                    "delivery_date_confirmed": None,
                    "delivery_date_actual": None,
                })

    seen = set()
    dedup = []
    for i in fallback:
        key = (i["style_number"], i["order_quantity"])
        if key not in seen:
            seen.add(key)
            dedup.append(i)
    return dedup


def extract_po_data(file_path: str) -> dict:
    """End-to-end extraction: tries all strategies and merges results."""
    output = {k: None for k in FIELD_ALIASES.keys()}
    output["line_items"] = []
    output["warnings"] = []
    output["currency"] = "USD"

    try:
        with pdfplumber.open(file_path) as pdf:
            page_texts = [page.extract_text() for page in pdf.pages]
            full_text = "\n".join(t for t in page_texts if t)

            # Strategy 1: label:value text scanning
            fields_text = extract_fields(full_text, output["warnings"])

            # Strategy 2: table-based header extraction
            fields_tables = extract_fields_from_tables(pdf, output["warnings"])

            # Merge: text-based wins where it found something; tables fill the gaps
            for key in FIELD_ALIASES.keys():
                val = fields_text.get(key) or fields_tables.get(key)
                if val is not None:
                    output[key] = val

            if output.get("gbp_price_per_pc") and not output.get("usd_price_per_pc"):
                output["currency"] = "GBP"

            line_items = extract_line_items(pdf, full_text, output["warnings"])
            output["line_items"] = [i for i in line_items if i.get("order_quantity", 0) > 0]

            if not output["line_items"]:
                output["warnings"].append("No line items extracted.")

    except Exception as e:
        logger.error(f"Extraction error: {e}")
        output["warnings"].append(f"Fatal parser error: {e}")

    return output


def extract_multiple(file_paths: list) -> list:
    results = []
    for path in file_paths:
        try:
            data = extract_po_data(path)
            data["_source_file"] = path
            data["_error"] = None
        except Exception as e:
            data = {"_source_file": path, "_error": str(e)}
        results.append(data)
    return results
