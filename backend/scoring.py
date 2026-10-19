"""
scoring.py
100-point multi-factor scoring engine:
- Technical (65 pts): RSI, MACD, Bollinger Bands, Volume, Moving Averages
- Seasonal Pattern (15 pts): Historical date/time, Tet, fiscal year-end, AGM
- Macro Catalyst (10 pts): Oil price, USD/VND, interest rates, geopolitics
- Financial Moat (10 pts): ROE, P/E, EPS growth
"""

import logging
from typing import Any, Dict, Tuple
from seasonal import get_seasonal_score
from macro import get_macro_score

logger = logging.getLogger(__name__)

def calculate_total_score(
    symbol: str,
    indicators: Dict[str, Any],
    financials: Dict[str, Any]
) -> Tuple[int, Dict[str, Any], str]:
    """
    Returns (total_score, score_breakdown, signal_name)
    Signal classes:
    - score >= 80: STRONG_BUY (MUA MẠNH 🟢)
    - score >= 65: BUY (MUA 🟩)
    - score >= 50: WATCH (THEO DÕI 🟡)
    - score < 50: AVOID (TRÁNH 🔴)
    """
    scores = {}

    # 1. Technical Score (Max 65 pts)
    # A. RSI (15 pts)
    rsi = indicators.get("rsi")
    rsi_score = 0
    if rsi is not None:
        if 35 <= rsi <= 52:
            rsi_score = 15  # Optimal accumulation zone
        elif 52 < rsi <= 65:
            rsi_score = 12  # Healthy momentum
        elif rsi < 35:
            rsi_score = 10  # Deep oversold / potential rebound
        elif 65 < rsi <= 75:
            rsi_score = 5   # Near overbought
        else:
            rsi_score = 0   # Severely overbought
    scores["rsi"] = rsi_score

    # B. MACD (15 pts)
    hist = indicators.get("macd_histogram")
    macd = indicators.get("macd")
    signal = indicators.get("macd_signal")
    macd_score = 0
    if hist is not None and macd is not None and signal is not None:
        if macd > signal and hist > 0:
            macd_score = 15  # Clear bullish convergence
        elif macd > signal:
            macd_score = 12  # Bullish crossover
        elif hist > 0:
            macd_score = 8   # Momentum improving
        else:
            macd_score = 3
    scores["macd"] = macd_score

    # C. Bollinger Bands (10 pts)
    bb_pos = indicators.get("bb_position")  # 0 to 1
    bb_score = 0
    if bb_pos is not None:
        if bb_pos < 0.35:
            bb_score = 10  # Rebounding from lower band
        elif bb_pos < 0.65:
            bb_score = 7   # Mid-band equilibrium
        elif bb_pos < 0.85:
            bb_score = 4
        else:
            bb_score = 1   # Upper band squeeze/resistance
    scores["bollinger"] = bb_score

    # D. Volume Surge (15 pts)
    vol_ratio = indicators.get("vol_ma_ratio", 1.0)
    vol_score = 0
    if vol_ratio is not None:
        if vol_ratio >= 1.8:
            vol_score = 15  # Institutional buying breakout
        elif vol_ratio >= 1.3:
            vol_score = 11  # Healthy above-average volume
        elif vol_ratio >= 0.9:
            vol_score = 6
        else:
            vol_score = 2   # Low liquidity
    scores["volume"] = vol_score

    # E. MA Alignment & Trend (10 pts)
    trend = indicators.get("trend", "sideways")
    ma_score = 0
    if trend == "strong_uptrend":
        ma_score = 10
    elif trend == "uptrend":
        ma_score = 8
    elif trend == "sideways":
        ma_score = 5
    else:
        ma_score = 2
    scores["ma_trend"] = ma_score

    tech_score = rsi_score + macd_score + bb_score + vol_score + ma_score

    # 2. Seasonal Score (Max 15 pts)
    seasonal_score = get_seasonal_score(symbol)
    scores["seasonal"] = seasonal_score

    # 3. Macro Catalyst Score (Max 10 pts)
    macro_score = get_macro_score(symbol)
    scores["macro"] = macro_score

    # 4. Financial Moat & Fundamentals (Max 10 pts)
    fin_score = 0
    ratios = financials.get("ratios", {})
    roe = ratios.get("roe", 0)
    rev_growth = ratios.get("revenue_growth", 0)
    pe = ratios.get("pe", 20)

    if roe >= 20:
        fin_score += 4
    elif roe >= 14:
        fin_score += 2

    if rev_growth >= 15:
        fin_score += 3
    elif rev_growth > 0:
        fin_score += 1

    if pe <= 12 and pe > 0:
        fin_score += 3
    elif pe <= 18:
        fin_score += 2

    scores["financial"] = fin_score

    total_score = min(100, int(tech_score + seasonal_score + macro_score + fin_score))

    if total_score >= 80:
        signal = "STRONG_BUY"
    elif total_score >= 65:
        signal = "BUY"
    elif total_score >= 50:
        signal = "WATCH"
    else:
        signal = "AVOID"

    breakdown = {
        "technical_score": tech_score,
        "seasonal_score": seasonal_score,
        "macro_score": macro_score,
        "financial_score": fin_score,
        "components": scores
    }

    return total_score, breakdown, signal
