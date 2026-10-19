"""
financials.py
Parse financial statements, key ratios, moat, and Graham valuation.
"""

from typing import Any, Dict
from data_fetcher import get_financial_data

def get_income_statement(symbol: str):
    data = get_financial_data(symbol)
    return data.get("income_statement", [])

def get_balance_sheet(symbol: str):
    data = get_financial_data(symbol)
    return data.get("balance_sheet", [])

def get_ratios(symbol: str):
    data = get_financial_data(symbol)
    return data.get("ratios", {})

def get_sector_comparison(symbol: str, sector: str) -> Dict[str, Any]:
    """Compare symbol's P/E and ROE with industry benchmarks."""
    ratios = get_ratios(symbol)
    sector_benchmarks = {
        "Ngân hàng": {"pe": 9.5, "roe": 18.0},
        "Thép": {"pe": 10.0, "roe": 14.0},
        "Bất động sản": {"pe": 12.0, "roe": 13.5},
        "Bán lẻ": {"pe": 17.0, "roe": 16.0},
        "Công nghệ": {"pe": 20.0, "roe": 25.0},
        "Dầu khí": {"pe": 15.0, "roe": 11.0},
        "Chứng khoán": {"pe": 14.0, "roe": 15.0},
        "Thủy sản": {"pe": 11.0, "roe": 15.5},
        "Dệt may": {"pe": 9.0, "roe": 16.0}
    }
    benchmark = sector_benchmarks.get(sector, {"pe": 12.0, "roe": 15.0})
    return {
        "company_pe": ratios.get("pe"),
        "sector_avg_pe": benchmark["pe"],
        "company_roe": ratios.get("roe"),
        "sector_avg_roe": benchmark["roe"],
        "valuation_assessment": "Hấp dẫn (rẻ hơn TB ngành)" if (ratios.get("pe", 99) < benchmark["pe"]) else "Định giá hợp lý"
    }

def calculate_fair_value(symbol: str) -> float:
    ratios = get_ratios(symbol)
    eps = ratios.get("eps", 2500)
    growth = ratios.get("profit_growth", 15.0)
    return round(eps * (8.5 + 0.5 * min(growth, 25)), -2)
