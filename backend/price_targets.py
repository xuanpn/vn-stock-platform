"""
price_targets.py
Calculate buy zone, cut-loss, and 3 target prices (TP1, TP2, TP3)
along with Risk/Reward ratios.
"""

from typing import Any, Dict, Optional
import pandas as pd
import numpy as np

def calculate_price_targets(
    symbol: str,
    df: pd.DataFrame,
    indicators: Dict[str, Any],
    financials: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Calculate:
    - buy_zone: Recommended entry price
    - cutloss: Strict stop loss level (max 7% or 1.5 * ATR)
    - tp1: Short-term target (2-4 weeks, near resistance / ~7-10%)
    - tp2: Medium-term target (1-3 months, MA200 / ~15-20%)
    - tp3: Long-term target (6-12 months, Fundamental DCF / fair value ~30-40%)
    - risk_reward_ratio: Target 1 reward vs risk
    """
    if df is None or df.empty:
        return {}

    current_price = float(df["close"].iloc[-1])
    atr = indicators.get("atr") or (current_price * 0.025)
    ma20 = indicators.get("ma20") or current_price
    ma50 = indicators.get("ma50") or current_price
    ma200 = indicators.get("ma200") or (current_price * 1.1)
    lower_bb = indicators.get("lower_bb") or (current_price * 0.96)
    support = indicators.get("support") or (current_price * 0.97)
    resistance = indicators.get("resistance") or (current_price * 1.08)

    # 1. Buy zone: near current price or safe pull-back support
    if current_price <= ma20:
        buy_zone = current_price
    else:
        # Buy on mild pullback or breakout retest
        buy_zone = round(max(support, lower_bb, ma20 * 0.99), -2)
        if buy_zone > current_price or buy_zone < current_price * 0.95:
            buy_zone = current_price

    # 2. Cut-loss: max 7% loss or buy_zone - 1.5 * ATR
    atr_cutloss = buy_zone - (1.5 * atr)
    pct_cutloss = buy_zone * 0.93  # 7% standard cut loss rule on VN stock
    cutloss = round(max(atr_cutloss, pct_cutloss), -2)
    # Ensure cutloss is strictly lower than buy_zone
    if cutloss >= buy_zone:
        cutloss = round(buy_zone * 0.93, -2)

    # 3. TP1 (Ngắn hạn: 2-4 tuần)
    tp1 = round(max(resistance, buy_zone * 1.08), -2)
    if tp1 <= buy_zone:
        tp1 = round(buy_zone * 1.08, -2)

    # 4. TP2 (Trung hạn: 1-3 tháng)
    tp2 = round(max(ma200 * 1.05, buy_zone * 1.18), -2)
    if tp2 <= tp1:
        tp2 = round(tp1 * 1.10, -2)

    # 5. TP3 (Dài hạn: 6-12 tháng - Định giá theo P/E & tăng trưởng EPS)
    fair_value = None
    if financials and "ratios" in financials:
        ratios = financials["ratios"]
        eps = ratios.get("eps", 2500)
        growth = ratios.get("profit_growth", 15.0)
        # Benjamin Graham intrinsic formula adapted: Value = EPS * (8.5 + 1.5 * g)
        fair_value = round(eps * (8.5 + min(growth, 25) * 0.5), -2)

    if fair_value and fair_value > tp2:
        tp3 = fair_value
    else:
        tp3 = round(buy_zone * 1.35, -2)

    # Risk vs Reward calculation
    risk = max(1.0, buy_zone - cutloss)
    reward_tp1 = max(1.0, tp1 - buy_zone)
    rr_ratio = round(reward_tp1 / risk, 2)

    return {
        "current_price": current_price,
        "buy_price": buy_zone,
        "cutloss": cutloss,
        "cutloss_pct": round(((cutloss - buy_zone) / buy_zone) * 100, 2),
        "tp1": tp1,
        "tp1_pct": round(((tp1 - buy_zone) / buy_zone) * 100, 2),
        "tp2": tp2,
        "tp2_pct": round(((tp2 - buy_zone) / buy_zone) * 100, 2),
        "tp3": tp3,
        "tp3_pct": round(((tp3 - buy_zone) / buy_zone) * 100, 2),
        "risk_reward_ratio": rr_ratio,
        "holding_time_advice": "Ngắn hạn: 2-4 tuần (TP1) | Trung hạn: 2-3 tháng (TP2) | Dài hạn: 6-12 tháng (TP3)"
    }
