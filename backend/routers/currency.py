import logging
from fastapi import APIRouter
import httpx
from datetime import datetime, timedelta

router = APIRouter()
logger = logging.getLogger(__name__)

_cache = {
    "usd_to_gbp": None,
    "gbp_to_usd": None,
    "fetched_at": None,
}
CACHE_TTL = 15
FALLBACK_USD_TO_GBP = 0.79
FALLBACK_GBP_TO_USD = 1.27


def get_cached_rates():
    """Synchronous getter — returns (usd_to_gbp, gbp_to_usd). Never raises."""
    if _cache["usd_to_gbp"] is not None:
        return _cache["usd_to_gbp"], _cache["gbp_to_usd"]
    return FALLBACK_USD_TO_GBP, FALLBACK_GBP_TO_USD


async def refresh_rates():
    """Fetch live rates from Frankfurter and update cache. Called before every use."""
    now = datetime.utcnow()
    if (
        _cache["fetched_at"]
        and now - _cache["fetched_at"] < timedelta(minutes=CACHE_TTL)
    ):
        return

    try:
        headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"}
        async with httpx.AsyncClient(timeout=6.0, headers=headers) as client:
            r1 = await client.get("https://api.frankfurter.dev/v1/latest?from=USD&to=GBP")
            r1.raise_for_status()
            d1 = r1.json()
            usd_to_gbp = float(d1["rates"]["GBP"])

            r2 = await client.get("https://api.frankfurter.dev/v1/latest?from=GBP&to=USD")
            r2.raise_for_status()
            d2 = r2.json()
            gbp_to_usd = float(d2["rates"]["USD"])

        _cache["usd_to_gbp"] = usd_to_gbp
        _cache["gbp_to_usd"] = gbp_to_usd
        _cache["fetched_at"] = now
        logger.info(f"Currency rates refreshed: 1 USD = {usd_to_gbp} GBP | 1 GBP = {gbp_to_usd} USD")

    except Exception as exc:
        logger.error(f"Currency fetch failed: {exc}")
        if _cache["usd_to_gbp"] is None:
            logger.warning("No cached rate available — using hardcoded fallback 0.79")
            _cache["usd_to_gbp"] = FALLBACK_USD_TO_GBP
            _cache["gbp_to_usd"] = FALLBACK_GBP_TO_USD


@router.get("")
async def get_currency():
    await refresh_rates()
    stale = False
    if _cache["fetched_at"]:
        stale = (datetime.utcnow() - _cache["fetched_at"]).total_seconds() > CACHE_TTL * 60
    else:
        stale = True

    return {
        "usd_to_gbp": _cache["usd_to_gbp"],
        "gbp_to_usd": _cache["gbp_to_usd"],
        "rate": _cache["usd_to_gbp"],
        "fetched_at": _cache["fetched_at"].isoformat() if _cache["fetched_at"] else None,
        "cache_ttl_minutes": CACHE_TTL,
        "stale": stale,
    }
