"""
portfolio.py
Paper Trading / Simulation Engine for VN Stock Intelligence Platform.
Tracks:
- Cash balance (starting default 500,000,000 VND)
- Holdings (symbol, shares, buy_price, buy_date, notes)
- Real-time PnL calculation against live market prices
- Order history (BUY / SELL)
- Persisted to local JSON file (portfolio_data.json)
"""

import json
import os
import logging
from datetime import datetime
from typing import Any, Dict, List, Optional
import pytz

from data_fetcher import get_price_history, get_company_info

logger = logging.getLogger(__name__)
VN_TZ = pytz.timezone("Asia/Ho_Chi_Minh")

DATA_FILE = os.path.join(os.path.dirname(__file__), "portfolio_data.json")

DEFAULT_PORTFOLIO = {
    "cash": 500_000_000.0,  # 500 million VND initial paper capital
    "initial_capital": 500_000_000.0,
    "holdings": {},  # symbol -> { "shares": int, "avg_price": float, "first_buy_date": str }
    "transactions": []
}

def _load_data() -> Dict[str, Any]:
    if not os.path.exists(DATA_FILE):
        _save_data(DEFAULT_PORTFOLIO)
        return DEFAULT_PORTFOLIO.copy()
    try:
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        logger.error("Error reading portfolio_data.json: %s", e)
        return DEFAULT_PORTFOLIO.copy()

def _save_data(data: Dict[str, Any]) -> None:
    try:
        with open(DATA_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    except Exception as e:
        logger.error("Error writing portfolio_data.json: %s", e)

def get_portfolio_summary() -> Dict[str, Any]:
    """Calculate total NAV, cash, stock values, and live PnL against latest market prices."""
    data = _load_data()
    cash = data.get("cash", 500_000_000.0)
    initial_cap = data.get("initial_capital", 500_000_000.0)
    holdings_dict = data.get("holdings", {})

    total_stock_value = 0.0
    total_cost_basis = 0.0
    items = []

    for sym, pos in holdings_dict.items():
        shares = pos.get("shares", 0)
        if shares <= 0:
            continue
        avg_price = pos.get("avg_price", 0.0)
        cost_basis = shares * avg_price

        # Fetch latest real market price
        df = get_price_history(sym, days=30)
        if df is not None and not df.empty:
            curr_price = float(df["close"].iloc[-1])
            prev_price = float(df["close"].iloc[-2]) if len(df) > 1 else curr_price
            day_change_pct = round(((curr_price - prev_price) / prev_price) * 100, 2)
        else:
            curr_price = avg_price
            day_change_pct = 0.0

        market_val = shares * curr_price
        unrealized_pnl = market_val - cost_basis
        unrealized_pnl_pct = round((unrealized_pnl / cost_basis) * 100, 2) if cost_basis > 0 else 0.0
        day_pnl = shares * (curr_price - (prev_price if 'prev_price' in locals() else curr_price))

        total_stock_value += market_val
        total_cost_basis += cost_basis

        info = get_company_info(sym)

        items.append({
            "symbol": sym,
            "company_name": info.get("name", sym),
            "sector": info.get("sector", "Khác"),
            "shares": shares,
            "avg_price": avg_price,
            "current_price": curr_price,
            "day_change_pct": day_change_pct,
            "cost_basis": cost_basis,
            "market_value": market_val,
            "unrealized_pnl": unrealized_pnl,
            "unrealized_pnl_pct": unrealized_pnl_pct,
            "day_pnl": day_pnl,
            "first_buy_date": pos.get("first_buy_date")
        })

    total_nav = cash + total_stock_value
    total_pnl = total_nav - initial_cap
    total_pnl_pct = round((total_pnl / initial_cap) * 100, 2)

    return {
        "nav": total_nav,
        "cash": cash,
        "stock_value": total_stock_value,
        "cost_basis": total_cost_basis,
        "total_pnl": total_pnl,
        "total_pnl_pct": total_pnl_pct,
        "initial_capital": initial_cap,
        "holdings": items,
        "transactions": data.get("transactions", [])[-30:] # return last 30 txs
    }

def execute_buy_order(
    symbol: str,
    shares: int,
    custom_price: Optional[float] = None,
    note: str = ""
) -> Dict[str, Any]:
    """Execute a simulated buy order. If custom_price is None, uses live market price."""
    symbol = symbol.upper().strip()
    if shares <= 0:
        raise ValueError("Số lượng cổ phiếu phải lớn hơn 0")

    # Get execution price
    if custom_price and custom_price > 0:
        exec_price = float(custom_price)
    else:
        df = get_price_history(symbol, days=10)
        if df is None or df.empty:
            raise ValueError(f"Không lấy được giá thị trường cho mã {symbol}")
        exec_price = float(df["close"].iloc[-1])

    # Fee and tax simulation (0.15% transaction fee)
    fee = (shares * exec_price) * 0.0015
    total_cost = (shares * exec_price) + fee

    data = _load_data()
    cash = data.get("cash", 500_000_000.0)

    if cash < total_cost:
        raise ValueError(f"Không đủ tiền mặt khả dụng (Cần: {total_cost:,.0f} ₫, Khả dụng: {cash:,.0f} ₫)")

    data["cash"] -= total_cost

    # Update holdings
    now_str = datetime.now(VN_TZ).strftime("%H:%M %d/%m/%Y")
    holdings = data.get("holdings", {})
    if symbol in holdings and holdings[symbol]["shares"] > 0:
        cur_shares = holdings[symbol]["shares"]
        cur_avg = holdings[symbol]["avg_price"]
        new_shares = cur_shares + shares
        new_avg = round(((cur_shares * cur_avg) + (shares * exec_price)) / new_shares, 2)
        holdings[symbol]["shares"] = new_shares
        holdings[symbol]["avg_price"] = new_avg
    else:
        holdings[symbol] = {
            "shares": shares,
            "avg_price": exec_price,
            "first_buy_date": now_str
        }

    # Record transaction
    tx = {
        "id": f"tx_{int(datetime.now().timestamp())}",
        "type": "BUY",
        "symbol": symbol,
        "shares": shares,
        "price": exec_price,
        "fee": fee,
        "total_amount": total_cost,
        "timestamp": now_str,
        "note": note or "Khớp lệnh giả lập"
    }
    data.setdefault("transactions", []).insert(0, tx)

    _save_data(data)
    return {"status": "success", "order": tx, "remaining_cash": data["cash"]}

def execute_sell_order(
    symbol: str,
    shares: int,
    custom_price: Optional[float] = None,
    note: str = ""
) -> Dict[str, Any]:
    """Execute a simulated sell order."""
    symbol = symbol.upper().strip()
    data = _load_data()
    holdings = data.get("holdings", {})

    if symbol not in holdings or holdings[symbol]["shares"] < shares:
        cur_owned = holdings.get(symbol, {}).get("shares", 0)
        raise ValueError(f"Không đủ cổ phiếu {symbol} để bán (Hiện có: {cur_owned:,}, Đặt bán: {shares:,})")

    # Get execution price
    if custom_price and custom_price > 0:
        exec_price = float(custom_price)
    else:
        df = get_price_history(symbol, days=10)
        if df is None or df.empty:
            raise ValueError(f"Không lấy được giá thị trường cho mã {symbol}")
        exec_price = float(df["close"].iloc[-1])

    gross_val = shares * exec_price
    # Tax 0.1% + Fee 0.15% = 0.25%
    fee_and_tax = gross_val * 0.0025
    net_proceeds = gross_val - fee_and_tax

    avg_cost = holdings[symbol]["avg_price"]
    realized_pnl = net_proceeds - (shares * avg_cost)

    # Deduct shares
    holdings[symbol]["shares"] -= shares
    if holdings[symbol]["shares"] == 0:
        del holdings[symbol]

    data["cash"] += net_proceeds

    now_str = datetime.now(VN_TZ).strftime("%H:%M %d/%m/%Y")
    tx = {
        "id": f"tx_{int(datetime.now().timestamp())}",
        "type": "SELL",
        "symbol": symbol,
        "shares": shares,
        "price": exec_price,
        "fee": fee_and_tax,
        "total_amount": net_proceeds,
        "realized_pnl": realized_pnl,
        "realized_pnl_pct": round((realized_pnl / (shares * avg_cost)) * 100, 2) if avg_cost > 0 else 0.0,
        "timestamp": now_str,
        "note": note or "Khớp lệnh bán chốt lời/cắt lỗ"
    }
    data.setdefault("transactions", []).insert(0, tx)

    _save_data(data)
    return {"status": "success", "order": tx, "remaining_cash": data["cash"]}

def reset_portfolio(capital: float = 500_000_000.0) -> Dict[str, Any]:
    """Reset paper trading account with new capital."""
    data = {
        "cash": float(capital),
        "initial_capital": float(capital),
        "holdings": {},
        "transactions": []
    }
    _save_data(data)
    return {"status": "reset", "cash": float(capital)}
