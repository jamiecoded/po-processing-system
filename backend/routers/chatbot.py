import os
import json
import logging
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional

from database import get_db
from auth import get_current_user
import models
from routers.currency import get_cached_rates

router = APIRouter()
logger = logging.getLogger(__name__)


class HistoryMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    text: str
    history: Optional[List[HistoryMessage]] = []


def _build_context(db: Session, current_user) -> dict:
    now = datetime.utcnow()
    pos = db.query(models.PurchaseOrder).filter(
        models.PurchaseOrder.user_id == current_user.id,
        models.PurchaseOrder.status != "deleted",
    ).all()

    if not pos:
        return {"total_pos": 0, "note": "No purchase orders in the system yet."}

    total_usd = sum(p.total_value_usd or 0 for p in pos)
    total_gbp = sum(p.total_value_gbp or 0 for p in pos)
    total_qty = sum(p.total_order_qty or 0 for p in pos)

    sup: dict = {}
    for p in pos:
        s = p.supplier or "Unknown"
        if s not in sup:
            sup[s] = {"supplier": s, "count": 0, "total_usd": 0.0, "total_gbp": 0.0, "brands": set()}
        sup[s]["count"] += 1
        sup[s]["total_usd"] += p.total_value_usd or 0
        sup[s]["total_gbp"] += p.total_value_gbp or 0
        if p.brand:
            sup[s]["brands"].add(p.brand)
    by_supplier = sorted(
        [{"supplier": v["supplier"], "po_count": v["count"],
          "total_usd": round(v["total_usd"], 2), "total_gbp": round(v["total_gbp"], 2),
          "brands": list(v["brands"])[:5]}
         for v in sup.values()],
        key=lambda x: x["total_usd"], reverse=True
    )[:10]

    brd: dict = {}
    for p in pos:
        b = p.brand or "Unknown"
        if b not in brd:
            brd[b] = {"brand": b, "count": 0, "total_usd": 0.0, "total_gbp": 0.0}
        brd[b]["count"] += 1
        brd[b]["total_usd"] += p.total_value_usd or 0
        brd[b]["total_gbp"] += p.total_value_gbp or 0
    by_brand = sorted(brd.values(), key=lambda x: x["total_usd"], reverse=True)[:10]

    buyers: dict = {}
    for p in pos:
        b = p.buyer or "Unknown"
        buyers[b] = buyers.get(b, 0) + 1
    by_buyer = sorted([{"buyer": k, "count": v} for k, v in buyers.items()],
                      key=lambda x: x["count"], reverse=True)[:8]

    modes: dict = {}
    for p in pos:
        m = p.mode or "Unknown"
        if m not in modes:
            modes[m] = {"mode": m, "count": 0, "total_usd": 0.0}
        modes[m]["count"] += 1
        modes[m]["total_usd"] += p.total_value_usd or 0

    usd_pos = [p for p in pos if p.po_currency == "USD"]
    gbp_pos = [p for p in pos if p.po_currency == "GBP"]

    upcoming_cutoff = now + timedelta(days=30)
    upcoming = []
    for p in pos:
        ref_date = p.confirmed_ex_factory or p.delivery_date
        if ref_date and now <= ref_date <= upcoming_cutoff:
            upcoming.append({
                "po_number": p.po_number,
                "supplier": p.supplier,
                "brand": p.brand,
                "date": ref_date.strftime("%Y-%m-%d"),
                "qty": p.total_order_qty,
                "value_usd": round(p.total_value_usd or 0, 2),
            })
    upcoming.sort(key=lambda x: x["date"])

    overdue = []
    for p in pos:
        ref_date = p.confirmed_ex_factory or p.delivery_date
        if ref_date and ref_date < now:
            days_late = (now - ref_date).days
            overdue.append({
                "po_number": p.po_number,
                "supplier": p.supplier,
                "brand": p.brand,
                "was_due": ref_date.strftime("%Y-%m-%d"),
                "days_late": days_late,
            })
    overdue.sort(key=lambda x: x["days_late"], reverse=True)

    dates = [p.created_at for p in pos if p.created_at]
    date_range = {
        "earliest": min(dates).strftime("%Y-%m-%d") if dates else None,
        "latest": max(dates).strftime("%Y-%m-%d") if dates else None,
    }

    usd_to_gbp, gbp_to_usd = get_cached_rates()

    return {
        "summary": {
            "total_pos": len(pos),
            "total_value_usd": round(total_usd, 2),
            "total_value_gbp": round(total_gbp, 2),
            "total_quantity_units": total_qty,
            "active_suppliers": len(sup),
            "active_brands": len(brd),
        },
        "currency": {
            "usd_po_count": len(usd_pos),
            "gbp_po_count": len(gbp_pos),
            "usd_total_value": round(sum(p.total_value_usd or 0 for p in usd_pos), 2),
            "gbp_total_value": round(sum(p.total_value_gbp or 0 for p in gbp_pos), 2),
            "live_rate_usd_to_gbp": usd_to_gbp,
            "live_rate_gbp_to_usd": gbp_to_usd,
        },
        "shipping_modes": list(modes.values()),
        "top_suppliers": by_supplier,
        "top_brands": by_brand,
        "top_buyers": by_buyer,
        "upcoming_deliveries_30_days": upcoming[:15],
        "overdue_pos": overdue[:15],
        "data_date_range": date_range,
    }


@router.post("/chat")
async def chat(
    request: ChatRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=503,
            detail="AI chatbot not configured. Add GROQ_API_KEY to backend/.env (free at console.groq.com)."
        )

    try:
        from groq import Groq
    except ImportError:
        raise HTTPException(status_code=503, detail="groq package not installed. Run: pip install groq")

    context = _build_context(db, current_user)

    system_prompt = f"""You are a smart, friendly business intelligence assistant for a fashion/apparel purchase order management system.

LIVE BUSINESS DATA (as of now):
{json.dumps(context, indent=2, default=str)}

YOUR ROLE:
- Answer questions about purchase orders, suppliers, brands, buyers, delivery timelines, and financial performance
- Give specific numbers — never vague answers when data is available
- Format currency: USD as $X,XXX.XX and GBP as £X,XXX.XX
- For lists, use short bullet points
- Flag overdue or at-risk deliveries proactively if asked about deliveries
- Keep answers concise but complete — 2-5 sentences for simple questions, bullet lists for comparisons
- If something is not in the data, say so clearly instead of guessing
- You can do arithmetic: totals, percentages, averages from the data provided

TODAY'S DATE: {datetime.utcnow().strftime("%Y-%m-%d")}"""

    messages = [{"role": "system", "content": system_prompt}]
    for h in (request.history or [])[-12:]:
        messages.append({"role": h.role, "content": h.content})
    messages.append({"role": "user", "content": request.text})

    try:
        client = Groq(api_key=api_key)
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            max_tokens=600,
            temperature=0.4,
            messages=messages,
        )
        reply = response.choices[0].message.content
        logger.info(f"Chat: user={current_user.email} q={request.text[:60]!r}")
        return {"reply": reply}
    except Exception as e:
        logger.error(f"Groq API error: {e}")
        raise HTTPException(status_code=500, detail=f"AI error: {str(e)}")
