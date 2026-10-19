"""
macro.py
Macro catalyst engine: fetch real macro data and score stocks by catalyst exposure.
"""

import logging
import time
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

import pytz

logger = logging.getLogger(__name__)

VN_TZ = pytz.timezone("Asia/Ho_Chi_Minh")

# ──────────────────────────────────────────────────────────────────────────────
# Simple TTL cache (shared with data_fetcher conceptually, but local here)
# ──────────────────────────────────────────────────────────────────────────────
_macro_cache: Dict[str, Dict] = {}


def _cache_get(key: str) -> Optional[Any]:
    entry = _macro_cache.get(key)
    if entry and time.time() < entry["expires"]:
        return entry["value"]
    return None


def _cache_set(key: str, value: Any, ttl: int = 300) -> None:
    _macro_cache[key] = {"value": value, "expires": time.time() + ttl}


# ──────────────────────────────────────────────────────────────────────────────
# Macro catalyst definitions
# ──────────────────────────────────────────────────────────────────────────────
MACRO_CATALYSTS: Dict[str, Dict[str, Any]] = {
    "oil_price_rise": {
        "condition": "oil_price_change > 5%",
        "beneficiaries": ["PVD", "PVS", "PLX", "BSR", "OIL"],
        "victims": ["HAH", "VJC", "HVN"],
        "score_boost": 10,
        "description": "Giá dầu tăng mạnh",
    },
    "oil_price_drop": {
        "condition": "oil_price_change < -5%",
        "beneficiaries": ["VJC", "HVN", "HAH"],
        "victims": ["PVD", "PVS", "PLX", "BSR", "OIL"],
        "score_boost": 8,
        "description": "Giá dầu giảm mạnh, hàng không hưởng lợi",
    },
    "usd_vnd_depreciation": {
        "condition": "usd_vnd_change > 2%",
        "beneficiaries": ["VHC", "ANV", "MSH", "TNG"],
        "victims": ["REE", "HPG"],
        "score_boost": 8,
        "description": "VND mất giá, xuất khẩu hưởng lợi",
    },
    "rate_cut": {
        "condition": "sbv_rate_cut",
        "beneficiaries": ["VHM", "NVL", "PDR", "DXG"],
        "victims": ["VCB", "BID", "CTG"],
        "score_boost": 12,
        "description": "SBV cắt giảm lãi suất",
    },
    "us_china_tension": {
        "condition": "trade_war_escalation",
        "beneficiaries": ["MSH", "TNG", "VHC", "KBC", "IDC"],
        "victims": ["HAX", "MWG"],
        "score_boost": 8,
        "description": "Căng thẳng Mỹ-Trung, VN hưởng lợi chuyển dịch",
    },
    "war_conflict": {
        "condition": "global_conflict",
        "beneficiaries": ["PVD", "PVS", "PLX"],
        "victims": ["VJC", "HVN", "SCS"],
        "score_boost": 5,
        "description": "Xung đột địa chính trị, dầu tăng",
    },
    "gold_rally": {
        "condition": "gold_price_change > 3%",
        "beneficiaries": ["PNJ", "SJC"],
        "victims": [],
        "score_boost": 6,
        "description": "Vàng tăng mạnh, cổ phiếu vàng hưởng lợi",
    },
    "vn_index_bullish": {
        "condition": "vn_index_above_ma20",
        "beneficiaries": ["SSI", "VND", "HCM", "VCI"],
        "victims": [],
        "score_boost": 7,
        "description": "VN-Index trên MA20, thị trường tích cực",
    },
}


# ──────────────────────────────────────────────────────────────────────────────
# Macro data fetchers (yfinance)
# ──────────────────────────────────────────────────────────────────────────────

def _fetch_yf_price(ticker: str) -> Optional[Dict[str, float]]:
    """Return {'price': float, 'change_pct': float} for a yfinance ticker."""
    try:
        import yfinance as yf
        t = yf.Ticker(ticker)
        hist = t.history(period="5d", interval="1d")
        if hist.empty or len(hist) < 2:
            return None
        latest = float(hist["Close"].iloc[-1])
        prev = float(hist["Close"].iloc[-2])
        change_pct = (latest - prev) / prev * 100 if prev > 0 else 0.0
        return {"price": round(latest, 2), "change_pct": round(change_pct, 2)}
    except Exception as exc:
        logger.warning("yfinance fetch failed for %s: %s", ticker, exc)
        return None


def get_oil_price() -> Dict[str, Any]:
    """Brent crude oil price via yfinance."""
    cached = _cache_get("oil_price")
    if cached is not None:
        return cached

    data = _fetch_yf_price("BZ=F") or {"price": None, "change_pct": None}
    result = {
        "ticker": "BZ=F",
        "name": "Brent Crude Oil",
        "unit": "USD/barrel",
        **data,
    }
    _cache_set("oil_price", result, ttl=300)
    return result


def get_gold_price() -> Dict[str, Any]:
    """Gold futures price via yfinance."""
    cached = _cache_get("gold_price")
    if cached is not None:
        return cached

    data = _fetch_yf_price("GC=F") or {"price": None, "change_pct": None}
    result = {
        "ticker": "GC=F",
        "name": "Gold Futures",
        "unit": "USD/troy oz",
        **data,
    }
    _cache_set("gold_price", result, ttl=300)
    return result


def get_usd_index() -> Dict[str, Any]:
    """USD Index (DXY) via yfinance."""
    cached = _cache_get("usd_index")
    if cached is not None:
        return cached

    data = _fetch_yf_price("DX-Y.NYB") or {"price": None, "change_pct": None}
    result = {
        "ticker": "DX-Y.NYB",
        "name": "US Dollar Index",
        "unit": "index",
        **data,
    }
    _cache_set("usd_index", result, ttl=300)
    return result


def get_vnindex_stats() -> Dict[str, Any]:
    """VN-Index stats from vnstock / TCBS."""
    cached = _cache_get("vnindex_stats")
    if cached is not None:
        return cached

    result: Dict[str, Any] = {
        "index": "VN-Index",
        "price": None,
        "change_pct": None,
        "ma20": None,
        "trend": "unknown",
    }

    try:
        from vnstock import Vnstock
        vn = Vnstock()
        stock = vn.stock(symbol="VNINDEX", source="TCBS")
        end_date = datetime.now(VN_TZ).strftime("%Y-%m-%d")
        start_date = (datetime.now(VN_TZ) - timedelta(days=60)).strftime("%Y-%m-%d")
        hist = stock.quote.history(start=start_date, end=end_date, interval="1D")

        if hist is not None and not hist.empty:
            hist.columns = [c.lower() for c in hist.columns]
            rename = {"c": "close", "o": "open", "h": "high", "l": "low", "v": "volume"}
            hist.rename(columns=rename, inplace=True)

            import pandas as pd
            hist["close"] = pd.to_numeric(hist["close"], errors="coerce")
            hist.dropna(subset=["close"], inplace=True)

            latest = float(hist["close"].iloc[-1])
            prev = float(hist["close"].iloc[-2]) if len(hist) >= 2 else latest
            change_pct = (latest - prev) / prev * 100 if prev > 0 else 0.0
            ma20 = float(hist["close"].rolling(20).mean().iloc[-1]) if len(hist) >= 20 else None

            result.update({
                "price": round(latest, 2),
                "change_pct": round(change_pct, 2),
                "ma20": round(ma20, 2) if ma20 else None,
                "trend": "bullish" if (ma20 and latest > ma20) else "bearish",
            })
    except Exception as exc:
        logger.warning("VN-Index stats failed: %s", exc)

    _cache_set("vnindex_stats", result, ttl=300)
    return result


# ──────────────────────────────────────────────────────────────────────────────
# Active catalyst detection
# ──────────────────────────────────────────────────────────────────────────────

def get_active_catalysts() -> List[Dict[str, Any]]:
    """
    Determine which macro catalysts are currently active based on live data.
    Returns list of active catalyst dicts.
    """
    cached = _cache_get("active_catalysts")
    if cached is not None:
        return cached

    active: List[Dict[str, Any]] = []

    oil = get_oil_price()
    gold = get_gold_price()
    vni = get_vnindex_stats()

    oil_change = oil.get("change_pct") or 0.0
    gold_change = gold.get("change_pct") or 0.0

    # Oil price rise (> 3% daily move, relaxed from 5% for sensitivity)
    if oil_change > 3.0:
        active.append({
            "id": "oil_price_rise",
            **MACRO_CATALYSTS["oil_price_rise"],
            "trigger_value": f"Oil +{oil_change:.1f}%",
        })
    elif oil_change < -3.0:
        active.append({
            "id": "oil_price_drop",
            **MACRO_CATALYSTS["oil_price_drop"],
            "trigger_value": f"Oil {oil_change:.1f}%",
        })

    # Gold rally
    if gold_change > 2.0:
        active.append({
            "id": "gold_rally",
            **MACRO_CATALYSTS["gold_rally"],
            "trigger_value": f"Gold +{gold_change:.1f}%",
        })

    # VN-Index bullish (above MA20)
    if vni.get("trend") == "bullish":
        active.append({
            "id": "vn_index_bullish",
            **MACRO_CATALYSTS["vn_index_bullish"],
            "trigger_value": f"VN-Index {vni.get('price', 'N/A')} > MA20 {vni.get('ma20', 'N/A')}",
        })

    _cache_set("active_catalysts", active, ttl=300)
    return active


def get_macro_score(symbol: str) -> int:
    """
    Return 0–10 pts based on active macro catalysts affecting *symbol*.
    Beneficiary: +boost points (capped at 10)
    Victim:      -5 points (min 0)
    """
    catalysts = get_active_catalysts()
    score = 5  # neutral baseline

    for cat in catalysts:
        boost = cat.get("score_boost", 0)
        if symbol in cat.get("beneficiaries", []):
            score += boost
        elif symbol in cat.get("victims", []):
            score -= 5

    return max(0, min(10, score))


def get_macro_dashboard() -> Dict[str, Any]:
    """Full macro dashboard: oil, gold, USD index, VN-Index, active catalysts."""
    return {
        "oil": get_oil_price(),
        "gold": get_gold_price(),
        "usd_index": get_usd_index(),
        "vn_index": get_vnindex_stats(),
        "active_catalysts": get_active_catalysts(),
        "timestamp": datetime.now(VN_TZ).isoformat(),
    }
