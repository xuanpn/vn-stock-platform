"""
main.py
FastAPI application serving VN Stock Intelligence Platform.
Endpoints:
- GET /api/signals
- GET /api/stock/{symbol}
- GET /api/seasonal
- GET /api/macro
- GET /api/screener
- GET /api/watchlist
- GET /health
"""

import logging
from datetime import datetime
from typing import Optional
from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pytz

from data_fetcher import get_stock_listing, get_price_history, get_financial_data, get_company_info
from technical import calculate_indicators
from scoring import calculate_total_score
from price_targets import calculate_price_targets
from seasonal import get_seasonal_calendar, get_current_seasonal_context, backtest_seasonal
from macro import get_macro_dashboard, get_active_catalysts

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("main")

app = FastAPI(
    title="VN Stock Intelligence API",
    description="Chuyên gia phân tích chứng khoán Việt Nam: Kỹ thuật + Mùa vụ + Vĩ mô + Giá mục tiêu & Cắt lỗ",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

VN_TZ = pytz.timezone("Asia/Ho_Chi_Minh")

# In-memory watchlist
USER_WATCHLIST = ["HPG", "FPT", "VCB", "PVD", "MWG", "VHM", "VHC"]

@app.get("/")
def root():
    return {
        "status": "online",
        "service": "VN Stock Intelligence & Paper Trading API",
        "docs": "/docs",
        "health": "/health",
        "endpoints": {
            "signals": "/api/signals",
            "stock_detail": "/api/stock/{symbol}",
            "seasonal": "/api/seasonal",
            "macro": "/api/macro",
            "portfolio": "/api/portfolio",
            "screener": "/api/screener"
        },
        "timestamp": datetime.now(VN_TZ).isoformat()
    }

@app.get("/health")
def health():
    return {"status": "ok", "timestamp": datetime.now(VN_TZ).isoformat()}

import concurrent.futures

# In-memory cache for signals to serve instantly
_SIGNALS_CACHE = {"data": None, "timestamp": 0}

@app.get("/api/signals")
def get_signals(
    min_score: int = Query(default=50, ge=0, le=100),
    sector: Optional[str] = None
):
    """Scan Vietnamese stocks and return ranked recommendations with target prices."""
    global _SIGNALS_CACHE
    import time
    now_ts = time.time()

    # Reuse calculated signals cache if under 2 minutes old
    all_evaluated = []
    if _SIGNALS_CACHE["data"] and (now_ts - _SIGNALS_CACHE["timestamp"] < 120):
        all_evaluated = _SIGNALS_CACHE["data"]
    else:
        symbols = get_stock_listing()

        def _evaluate_symbol(sym):
            try:
                info = get_company_info(sym)
                df = get_price_history(sym, days=180)
                if df is None or len(df) < 25:
                    return None

                indicators = calculate_indicators(df)
                financials = get_financial_data(sym)
                score, breakdown, signal_type = calculate_total_score(sym, indicators, financials)
                targets = calculate_price_targets(sym, df, indicators, financials)

                curr_price = float(df["close"].iloc[-1])
                prev_price = float(df["close"].iloc[-2]) if len(df) > 1 else curr_price
                change_pct = round(((curr_price - prev_price) / prev_price) * 100, 2)

                return {
                    "symbol": sym,
                    "company_name": info["name"],
                    "sector": info["sector"],
                    "price": curr_price,
                    "change_pct": change_pct,
                    "score": score,
                    "signal": signal_type,
                    "technical_score": breakdown["technical_score"],
                    "seasonal_score": breakdown["seasonal_score"],
                    "macro_score": breakdown["macro_score"],
                    "financial_score": breakdown["financial_score"],
                    "buy_price": targets.get("buy_price"),
                    "cutloss": targets.get("cutloss"),
                    "cutloss_pct": targets.get("cutloss_pct"),
                    "tp1": targets.get("tp1"),
                    "tp1_pct": targets.get("tp1_pct"),
                    "tp2": targets.get("tp2"),
                    "tp2_pct": targets.get("tp2_pct"),
                    "tp3": targets.get("tp3"),
                    "tp3_pct": targets.get("tp3_pct"),
                    "risk_reward": targets.get("risk_reward_ratio")
                }
            except Exception as e:
                logger.debug("Error evaluating %s: %s", sym, e)
                return None

        with concurrent.futures.ThreadPoolExecutor(max_workers=12) as executor:
            items = list(executor.map(_evaluate_symbol, symbols))

        all_evaluated = [it for it in items if it is not None]
        all_evaluated.sort(key=lambda x: x["score"], reverse=True)
        _SIGNALS_CACHE = {"data": all_evaluated, "timestamp": now_ts}

    # Filter by sector & min_score
    summary = {"strong_buy": 0, "buy": 0, "watch": 0, "avoid": 0}
    results = []

    for item in all_evaluated:
        st = item["signal"]
        if st == "STRONG_BUY":
            summary["strong_buy"] += 1
        elif st == "BUY":
            summary["buy"] += 1
        elif st == "WATCH":
            summary["watch"] += 1
        else:
            summary["avoid"] += 1

        if sector and sector != "Tất cả" and item["sector"] != sector:
            continue
        if item["score"] < min_score:
            continue
        results.append(item)

    # Contextual alerts
    seasonal_ctx = get_current_seasonal_context()
    seasonal_alert = None
    if seasonal_ctx["active_events"]:
        ev = seasonal_ctx["active_events"][0]
        seasonal_alert = f"{ev['name']}: {ev['description']} (Lịch sử Win rate {ev['win_rate']}%, LN TB +{ev['avg_return']}%)"

    macro_data = get_macro_dashboard()
    macro_alert = None
    active_cats = macro_data.get("active_catalysts", [])
    if active_cats:
        macro_alert = f"{active_cats[0]['description']}: Nhóm hưởng lợi: {', '.join(active_cats[0]['beneficiaries'])}"

    return {
        "updated_at": datetime.now(VN_TZ).strftime("%H:%M:%S %d/%m/%Y"),
        "summary": summary,
        "seasonal_alert": seasonal_alert,
        "macro_alert": macro_alert,
        "count": len(results),
        "stocks": results
    }

@app.get("/api/stock/{symbol}")
def get_stock_detail(symbol: str):
    """Detailed analytics for a specific stock ticker."""
    symbol = symbol.upper().strip()
    # Fetch extended history (800 days ~ 2.2 years) for multi-year and seasonal analysis
    df = get_price_history(symbol, days=800)
    if df is None or df.empty:
        raise HTTPException(status_code=404, detail=f"Không tìm thấy dữ liệu cho mã {symbol}")

    indicators = calculate_indicators(df)
    financials = get_financial_data(symbol)
    info = get_company_info(symbol)

    score, breakdown, signal_type = calculate_total_score(symbol, indicators, financials)
    targets = calculate_price_targets(symbol, df, indicators, financials)

    # Seasonal backtest & Historical Date Comparison (Same date 1Y ago, 2Y ago, 2W ago)
    from seasonal import get_historical_date_comparison
    seasonal_backtest = backtest_seasonal(symbol, df)
    historical_comparison = get_historical_date_comparison(df)

    # OHLCV chart data format for Recharts (recent 120 trading sessions)
    chart_data = []
    for _, row in df.tail(120).iterrows():
        chart_data.append({
            "date": str(row["date"]),
            "open": float(row["open"]),
            "high": float(row["high"]),
            "low": float(row["low"]),
            "close": float(row["close"]),
            "volume": float(row["volume"])
        })

    curr_price = float(df["close"].iloc[-1])
    prev_price = float(df["close"].iloc[-2]) if len(df) > 1 else curr_price
    change_pct = round(((curr_price - prev_price) / prev_price) * 100, 2)

    return {
        "symbol": symbol,
        "company_name": info["name"],
        "sector": info["sector"],
        "exchange": info["exchange"],
        "current_price": curr_price,
        "change_pct": change_pct,
        "score": score,
        "signal": signal_type,
        "score_breakdown": breakdown,
        "targets": targets,
        "technical_indicators": indicators,
        "financials": financials,
        "seasonal_backtest": seasonal_backtest,
        "historical_comparison": historical_comparison,
        "chart_data": chart_data
    }

@app.get("/api/seasonal")
def get_seasonal_page_data():
    """Returns calendar of seasonal cycles, current active cycles, and top seasonal stock picks."""
    calendar = get_seasonal_calendar()
    context = get_current_seasonal_context()
    return {
        "current_month": context.get("current_month", datetime.now(VN_TZ).month),
        "month_name": context.get("current_month_name", datetime.now(VN_TZ).strftime("%B")),
        "active_events": context.get("active_events", []),
        "calendar": calendar
    }

@app.get("/api/macro")
def get_macro_page_data():
    """Returns real-time macro indicators (Brent Oil, DXY, Gold) and active market catalysts."""
    return get_macro_dashboard()

@app.get("/api/screener")
def get_screener(
    signal: Optional[str] = None,
    sector: Optional[str] = None,
    min_score: int = 0
):
    """Custom filtering tool."""
    res = get_signals(min_score=min_score, sector=sector)
    stocks = res["stocks"]
    if signal and signal != "ALL":
        stocks = [s for s in stocks if s["signal"] == signal]
    return {"count": len(stocks), "stocks": stocks}

@app.get("/api/watchlist")
def get_watchlist():
    """Retrieve signals for user's watchlist."""
    res = get_signals(min_score=0)
    watched_stocks = [s for s in res["stocks"] if s["symbol"] in USER_WATCHLIST]
    return {"watchlist": USER_WATCHLIST, "stocks": watched_stocks}

# ──────────────────────────────────────────────────────────────────────────────
# Paper Trading / Portfolio Simulation Endpoints
# ──────────────────────────────────────────────────────────────────────────────
from pydantic import BaseModel
from portfolio import get_portfolio_summary, execute_buy_order, execute_sell_order, reset_portfolio

class OrderRequest(BaseModel):
    symbol: str
    shares: int
    custom_price: Optional[float] = None
    note: Optional[str] = ""

class ResetRequest(BaseModel):
    capital: Optional[float] = 500_000_000.0

@app.get("/api/portfolio")
def get_portfolio():
    """Get portfolio NAV, cash balance, active stock holdings with live PnL and history."""
    try:
        return get_portfolio_summary()
    except Exception as e:
        logger.error("Error fetching portfolio: %s", e)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/portfolio/buy")
def buy_order(req: OrderRequest):
    """Place a simulated BUY order at live market price or user-specified custom price."""
    try:
        res = execute_buy_order(
            symbol=req.symbol,
            shares=req.shares,
            custom_price=req.custom_price,
            note=req.note or ""
        )
        return res
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error("Error executing buy order: %s", e)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/portfolio/sell")
def sell_order(req: OrderRequest):
    """Place a simulated SELL order at live market price or user-specified custom price."""
    try:
        res = execute_sell_order(
            symbol=req.symbol,
            shares=req.shares,
            custom_price=req.custom_price,
            note=req.note or ""
        )
        return res
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error("Error executing sell order: %s", e)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/portfolio/reset")
def reset_portfolio_endpoint(req: ResetRequest):
    """Reset paper trading account balance."""
    return reset_portfolio(capital=req.capital or 500_000_000.0)

