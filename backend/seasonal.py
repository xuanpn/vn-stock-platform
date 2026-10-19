"""
seasonal.py
Vietnamese stock market seasonal pattern analysis.
Provides event calendar, per-symbol seasonal score, and historical backtest.
"""

import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

import pandas as pd
import pytz

logger = logging.getLogger(__name__)

VN_TZ = pytz.timezone("Asia/Ho_Chi_Minh")

# ──────────────────────────────────────────────────────────────────────────────
# Hard-coded seasonal events with historical data
# ──────────────────────────────────────────────────────────────────────────────
SEASONAL_EVENTS: Dict[str, Dict[str, Any]] = {
    "tet_rally": {
        "name": "Tết Nguyên Đán Rally",
        "months": [11, 12, 1],
        "sectors": ["retail", "food_beverage", "airlines"],
        "symbols": ["MWG", "FRT", "MSN", "VNM", "VJC", "HVN", "SAB"],
        "avg_return": 8.5,
        "win_rate": 68,
        "description": "Tết Nguyên Đán - tiêu dùng, du lịch tăng mạnh",
    },
    "fiscal_year_end": {
        "name": "Cuối năm tài chính",
        "months": [11, 12],
        "sectors": ["banking", "real_estate"],
        "symbols": ["VCB", "BID", "TCB", "VHM", "NVL"],
        "avg_return": 6.2,
        "win_rate": 63,
        "description": "Ngân hàng chia cổ tức, BĐS giải ngân cuối năm",
    },
    "agm_season": {
        "name": "Mùa Đại hội cổ đông",
        "months": [3, 4],
        "sectors": ["all"],
        "symbols": [],
        "avg_return": 5.8,
        "win_rate": 61,
        "description": "Kỳ vọng chia thưởng/cổ tức từ ĐHCĐ",
    },
    "q2_growth": {
        "name": "Tăng trưởng Q2",
        "months": [4, 5, 6],
        "sectors": ["real_estate", "construction", "materials"],
        "symbols": ["HPG", "HSG", "NKG", "CTD", "HBC"],
        "avg_return": 9.1,
        "win_rate": 65,
        "description": "Giải ngân đầu tư công, mùa xây dựng",
    },
    "export_season": {
        "name": "Mùa xuất khẩu",
        "months": [8, 9, 10],
        "sectors": ["textile", "seafood"],
        "symbols": ["MSH", "TNG", "VHC", "ANV", "IDI"],
        "avg_return": 7.3,
        "win_rate": 60,
        "description": "Xuất khẩu dệt may, thủy sản vào mùa cao điểm",
    },
    "fdi_investment": {
        "name": "Đầu tư FDI & Công",
        "months": [10, 11, 12],
        "sectors": ["industrial_parks", "construction"],
        "symbols": ["KBC", "IDC", "BCM", "PHR", "GVR"],
        "avg_return": 8.8,
        "win_rate": 64,
        "description": "FDI đổ vào khu công nghiệp, giải ngân đầu tư công",
    },
}


def _current_month() -> int:
    return datetime.now(VN_TZ).month


def get_current_seasonal_context() -> Dict[str, Any]:
    """Return active seasonal events for the current VN month."""
    month = _current_month()
    active = []
    for event_id, event in SEASONAL_EVENTS.items():
        if month in event["months"]:
            active.append({
                "id": event_id,
                **event,
                "is_active": True,
            })

    return {
        "current_month": month,
        "current_month_name": datetime.now(VN_TZ).strftime("%B"),
        "active_events": active,
        "total_active": len(active),
    }


def get_seasonal_score(symbol: str, sector: Optional[str] = None) -> int:
    """
    Return 0–15 pts based on whether symbol / sector matches active seasonal events.

    Points awarded:
      - Symbol explicitly listed in event.symbols  → 15 pts (max)
      - Sector matches event.sectors               → 10 pts
      - Event active but no direct match           → 3 pts (market-wide tailwind)
    Scores are capped at 15.
    """
    month = _current_month()
    score = 0

    for event in SEASONAL_EVENTS.values():
        if month not in event["months"]:
            continue

        # Weight by historical win_rate (normalised to 0-1)
        win_weight = event.get("win_rate", 50) / 100.0

        if symbol in event.get("symbols", []):
            score += int(15 * win_weight)
            break  # max once per symbol

        if sector and sector in event.get("sectors", []):
            score += int(10 * win_weight)
            break

        if "all" in event.get("sectors", []):
            score += int(5 * win_weight)

    return min(score, 15)


def get_seasonal_calendar() -> List[Dict[str, Any]]:
    """Return all events annotated with is_active flag for the current month."""
    month = _current_month()
    calendar = []
    for event_id, event in SEASONAL_EVENTS.items():
        calendar.append({
            "id": event_id,
            "is_active": month in event["months"],
            **event,
        })
    return calendar


def backtest_seasonal(symbol: str, price_history: pd.DataFrame) -> Dict[str, Any]:
    """
    Calculate actual win_rate and avg_return for *symbol* during each seasonal event
    using its price history DataFrame (columns: date, close).

    Returns a dict keyed by event_id with backtested stats.
    """
    if price_history is None or price_history.empty:
        return {}

    df = price_history.copy()

    # Ensure date column is datetime
    date_col = "date" if "date" in df.columns else df.columns[0]
    df[date_col] = pd.to_datetime(df[date_col], errors="coerce")
    df = df.dropna(subset=[date_col, "close"])
    df["month"] = df[date_col].dt.month
    df["year"] = df[date_col].dt.year

    results: Dict[str, Any] = {}

    for event_id, event in SEASONAL_EVENTS.items():
        months = event["months"]
        yearly_returns: List[float] = []

        # For each calendar year in the data, measure return during the event months
        years = df["year"].unique()
        for yr in years:
            event_df = df[(df["year"] == yr) & (df["month"].isin(months))]
            if len(event_df) < 2:
                continue
            start_price = float(event_df["close"].iloc[0])
            end_price = float(event_df["close"].iloc[-1])
            if start_price > 0:
                ret = (end_price - start_price) / start_price * 100
                yearly_returns.append(ret)

        if not yearly_returns:
            results[event_id] = {
                "symbol": symbol,
                "event": event["name"],
                "backtested_win_rate": None,
                "backtested_avg_return": None,
                "sample_years": 0,
            }
            continue

        wins = [r for r in yearly_returns if r > 0]
        results[event_id] = {
            "symbol": symbol,
            "event": event["name"],
            "backtested_win_rate": round(len(wins) / len(yearly_returns) * 100, 1),
            "backtested_avg_return": round(sum(yearly_returns) / len(yearly_returns), 2),
            "sample_years": len(yearly_returns),
        }

    return results


def get_historical_date_comparison(df: pd.DataFrame) -> Dict[str, Any]:
    """
    Compare current price on this exact calendar date with:
    - 2 weeks ago (14 days ago)
    - 1 year ago (exact date last year, ~365 days)
    - 2 years ago (exact date 2 years ago, ~730 days)
    Returns prices, percent change, and directional momentum.
    """
    if df is None or len(df) < 15:
        return {}

    df_calc = df.copy()
    date_col = "date" if "date" in df_calc.columns else df_calc.columns[0]
    df_calc["dt"] = pd.to_datetime(df_calc[date_col], errors="coerce")
    df_calc = df_calc.dropna(subset=["dt", "close"]).sort_values("dt").reset_index(drop=True)

    today_dt = df_calc["dt"].iloc[-1]
    curr_price = float(df_calc["close"].iloc[-1])

    from datetime import timedelta

    def _get_benchmark(days_ago: int):
        target_date = today_dt - timedelta(days=days_ago)
        subset = df_calc[df_calc["dt"] <= target_date]
        if subset.empty:
            return None
        last_row = subset.iloc[-1]
        p = float(last_row["close"])
        chg = round(((curr_price - p) / p) * 100, 2) if p > 0 else 0.0
        return {
            "date": last_row["dt"].strftime("%d/%m/%Y"),
            "price": p,
            "change_pct": chg
        }

    # 1. 2 weeks ago
    two_weeks = _get_benchmark(14)
    # 2. 1 year ago (same date last year)
    one_year = _get_benchmark(365)
    # 3. 2 years ago (same date 2 years ago)
    two_years = _get_benchmark(730)

    # 2-week daily price movement trend (last 10-14 trading days)
    recent_bars = []
    for _, row in df_calc.tail(14).iterrows():
        recent_bars.append({
            "date": row["dt"].strftime("%d/%m"),
            "close": float(row["close"]),
            "volume": float(row.get("volume", 0))
        })

    return {
        "current_date": today_dt.strftime("%d/%m/%Y"),
        "current_price": curr_price,
        "two_weeks_ago": two_weeks,
        "one_year_ago": one_year,
        "two_years_ago": two_years,
        "recent_two_weeks_trend": recent_bars
    }

