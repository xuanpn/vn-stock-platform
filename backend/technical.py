"""
technical.py
Calculate technical indicators using the 'ta' library.
Provides RSI, MACD, Bollinger Bands, MAs, ATR, Volume MA, Support/Resistance, Trend.
"""

import logging
from typing import Any, Dict, List, Optional

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)


def _safe_float(val) -> Optional[float]:
    """Convert to Python float, return None if NaN/None."""
    try:
        f = float(val)
        return None if np.isnan(f) else f
    except (TypeError, ValueError):
        return None


def calculate_indicators(df: pd.DataFrame) -> Dict[str, Any]:
    """
    Given an OHLCV DataFrame with columns [open, high, low, close, volume],
    return a dict of all technical indicators needed by the scoring engine.
    """
    if df is None or len(df) < 26:
        return {}

    df = df.copy()
    close = df["close"]
    high = df["high"]
    low = df["low"]
    volume = df["volume"]

    indicators: Dict[str, Any] = {}

    # ── RSI(14) ───────────────────────────────────────────────────────────────
    try:
        from ta.momentum import RSIIndicator
        rsi_ind = RSIIndicator(close=close, window=14)
        indicators["rsi"] = _safe_float(rsi_ind.rsi().iloc[-1])
    except Exception as e:
        logger.debug("RSI error: %s", e)
        indicators["rsi"] = None

    # ── MACD(12,26,9) ─────────────────────────────────────────────────────────
    try:
        from ta.trend import MACD
        macd_ind = MACD(close=close, window_slow=26, window_fast=12, window_sign=9)
        macd_series = macd_ind.macd()
        signal_series = macd_ind.macd_signal()
        hist_series = macd_ind.macd_diff()

        indicators["macd"] = _safe_float(macd_series.iloc[-1])
        indicators["macd_signal"] = _safe_float(signal_series.iloc[-1])
        indicators["macd_histogram"] = _safe_float(hist_series.iloc[-1])
        indicators["macd_histogram_prev"] = _safe_float(hist_series.iloc[-2]) if len(hist_series) >= 2 else None
        # Detect crossover: histogram flipped from negative to positive
        indicators["macd_crossed_up"] = (
            indicators["macd_histogram"] is not None
            and indicators["macd_histogram_prev"] is not None
            and indicators["macd_histogram"] > 0
            and indicators["macd_histogram_prev"] <= 0
        )
    except Exception as e:
        logger.debug("MACD error: %s", e)
        for k in ("macd", "macd_signal", "macd_histogram", "macd_histogram_prev", "macd_crossed_up"):
            indicators.setdefault(k, None)

    # ── Bollinger Bands(20,2) ─────────────────────────────────────────────────
    try:
        from ta.volatility import BollingerBands
        bb_ind = BollingerBands(close=close, window=20, window_dev=2)
        indicators["upper_bb"] = _safe_float(bb_ind.bollinger_hband().iloc[-1])
        indicators["middle_bb"] = _safe_float(bb_ind.bollinger_mavg().iloc[-1])
        indicators["lower_bb"] = _safe_float(bb_ind.bollinger_lband().iloc[-1])
    except Exception as e:
        logger.debug("BB error: %s", e)
        for k in ("upper_bb", "middle_bb", "lower_bb"):
            indicators.setdefault(k, None)

    # ── Moving Averages ────────────────────────────────────────────────────────
    for window, label in [(20, "ma20"), (50, "ma50"), (200, "ma200")]:
        try:
            indicators[label] = _safe_float(close.rolling(window=window).mean().iloc[-1])
        except Exception:
            indicators[label] = None

    # ── ATR(14) ───────────────────────────────────────────────────────────────
    try:
        from ta.volatility import AverageTrueRange
        atr_ind = AverageTrueRange(high=high, low=low, close=close, window=14)
        indicators["atr"] = _safe_float(atr_ind.average_true_range().iloc[-1])
    except Exception as e:
        logger.debug("ATR error: %s", e)
        indicators["atr"] = None

    # ── Volume MA(20) ─────────────────────────────────────────────────────────
    try:
        indicators["volume_ma20"] = _safe_float(volume.rolling(window=20).mean().iloc[-1])
        indicators["volume_current"] = _safe_float(volume.iloc[-1])
        if indicators["volume_ma20"] and indicators["volume_ma20"] > 0:
            indicators["volume_ratio"] = indicators["volume_current"] / indicators["volume_ma20"]
        else:
            indicators["volume_ratio"] = None
    except Exception as e:
        logger.debug("Volume MA error: %s", e)
        indicators["volume_ma20"] = None
        indicators["volume_current"] = None
        indicators["volume_ratio"] = None

    # ── Support / Resistance (pivot highs/lows over last 20 sessions) ─────────
    try:
        window_sr = min(20, len(df))
        recent = df.tail(window_sr)
        indicators["support"] = _safe_float(recent["low"].min())
        indicators["resistance"] = _safe_float(recent["high"].max())

        # More precise: find the most recent swing low/high
        lows = recent["low"].values
        highs = recent["high"].values
        pivot_lows: List[float] = []
        pivot_highs: List[float] = []
        for i in range(1, len(lows) - 1):
            if lows[i] < lows[i - 1] and lows[i] < lows[i + 1]:
                pivot_lows.append(float(lows[i]))
            if highs[i] > highs[i - 1] and highs[i] > highs[i + 1]:
                pivot_highs.append(float(highs[i]))

        current_price = _safe_float(close.iloc[-1])
        if pivot_lows:
            below = [p for p in pivot_lows if p < (current_price or float("inf"))]
            indicators["support"] = max(below) if below else float(min(pivot_lows))
        if pivot_highs:
            above = [p for p in pivot_highs if p > (current_price or 0)]
            indicators["resistance_near"] = min(above) if above else float(max(pivot_highs))
        else:
            indicators["resistance_near"] = indicators["resistance"]
    except Exception as e:
        logger.debug("Support/Resistance error: %s", e)
        indicators.setdefault("support", None)
        indicators.setdefault("resistance", None)
        indicators.setdefault("resistance_near", None)

    # ── Current price ──────────────────────────────────────────────────────────
    indicators["current_price"] = _safe_float(close.iloc[-1])
    indicators["prev_close"] = _safe_float(close.iloc[-2]) if len(close) >= 2 else None
    if indicators["current_price"] and indicators["prev_close"]:
        indicators["change_pct"] = (
            (indicators["current_price"] - indicators["prev_close"]) / indicators["prev_close"] * 100
        )
    else:
        indicators["change_pct"] = None

    # ── Trend direction ────────────────────────────────────────────────────────
    indicators["trend"] = _determine_trend(indicators)

    return indicators


def _determine_trend(ind: Dict[str, Any]) -> str:
    """
    Classify trend based on MA alignment:
      uptrend   — price > MA20 > MA50 > MA200
      downtrend — price < MA20 < MA50
      sideways  — everything else
    """
    price = ind.get("current_price")
    ma20 = ind.get("ma20")
    ma50 = ind.get("ma50")
    ma200 = ind.get("ma200")

    if None in (price, ma20, ma50):
        return "sideways"

    if price > ma20 and ma20 > ma50:
        if ma200 is None or ma50 > ma200:
            return "uptrend"
        return "uptrend"   # partial uptrend counts
    elif price < ma20 and ma20 < ma50:
        return "downtrend"
    return "sideways"
