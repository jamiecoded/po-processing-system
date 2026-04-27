from fastapi import APIRouter
import httpx
import time
from datetime import datetime

router = APIRouter()

_cache: dict = {
    "rate": 0.79,
    "timestamp": None,
    "last_fetched": 0.0,
}

CACHE_TTL_SECONDS = 3600


@router.get("")
async def get_currency():
    now = time.time()
    cache_valid = (
        _cache["timestamp"] is not None
        and (now - _cache["last_fetched"]) < CACHE_TTL_SECONDS
    )

    if not cache_valid:
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    "https://api.frankfurter.app/latest?from=USD&to=GBP",
                    timeout=5.0,
                )
                data = response.json()
                _cache["rate"] = float(data["rates"]["GBP"])
                _cache["timestamp"] = data.get("date", datetime.utcnow().date().isoformat())
                _cache["last_fetched"] = now
        except Exception:
            pass

    return {
        "rate": _cache["rate"],
        "from": "USD",
        "to": "GBP",
        "timestamp": _cache["timestamp"] or datetime.utcnow().isoformat(),
    }
