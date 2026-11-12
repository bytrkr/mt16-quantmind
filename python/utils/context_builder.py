from __future__ import annotations
from python.schemas import (
    UnifiedContext,
    MarketData,
    DepthData,
    FundamentalData,
    NewsData,
    MarketRegime,
    CompanyDirectData,
    TrendData
)
from python.schemas.requests import AnalyzeRequest

def build_default_context(req: AnalyzeRequest) -> UnifiedContext:
    """Istemci detayli mikro-veri gondermediginde hisseye ozel gercekci BIST baglami olusturur."""
    clean_ticker = req.ticker.upper().replace(".IS", "").strip()
    
    # Fiyat Referans Tablosu
    ref_prices = {
        "ASELS": {"p": 0.0, "pe": 0.0, "pb": 0.0, "z": 0.0, "f": 0, "m": 0.0},
        "THYAO": {"p": 284.00, "pe": 6.2, "pb": 1.1, "z": 3.20, "f": 8, "m": -2.90},
        "EREGL": {"p": 37.94, "pe": 14.2, "pb": 1.4, "z": 2.45, "f": 6, "m": -2.60},
        "GARAN": {"p": 112.30, "pe": 4.8, "pb": 1.2, "z": 2.90, "f": 7, "m": -2.75},
        "TUPRS": {"p": 164.80, "pe": 7.5, "pb": 1.6, "z": 3.10, "f": 7, "m": -2.80},
    }
    ref = ref_prices.get(clean_ticker, {"p": 50.0, "pe": 10.0, "pb": 2.0, "z": 2.5, "f": 6, "m": -2.50})

    m_data = req.market_data or MarketData(
        ticker=clean_ticker,
        price=ref["p"],
        change_pct=1.20,
        volume=1_500_000_000,
        moving_avg_50=ref["p"] * 1.02,
        moving_avg_200=ref["p"] * 0.98,
        rsi=56.0,
    )

    bid_tot = 500_000.0
    ask_tot = 420_000.0
    calc_obi = round((bid_tot - ask_tot) / (bid_tot + ask_tot), 4)

    d_data = req.depth_data or DepthData(
        ticker=clean_ticker,
        best_bid=ref["p"] - 0.10,
        best_ask=ref["p"] + 0.10,
        bid_depth_total=bid_tot,
        ask_depth_total=ask_tot,
        wall_pressure_ratio=round(bid_tot / ask_tot, 2),
        bofa_net_lot=85_000,
        is_wall_spoofing=False,
        hhi_concentration=0.12,
        obi=calc_obi,
        data_source="SIMULATED",
    )

    f_data = req.fundamental_data or FundamentalData(
        ticker=clean_ticker,
        sector="BIST 100",
        pe_ratio=ref["pe"],
        pb_ratio=ref["pb"],
        altman_z_score=ref["z"],
        piotroski_f_score=ref["f"],
        beneish_m_score=ref["m"],
        roic_wacc_spread=3.5,
    )

    n_data = req.news_data or NewsData(
        ticker=clean_ticker,
        sentiment_score=0.20,
        headlines=[f"{clean_ticker} genel kurul toplantisi tamamlandi"],
    )

    return UnifiedContext(
        ticker=clean_ticker,
        market_data=m_data,
        depth_data=d_data,
        fundamental_data=f_data,
        news_data=n_data,
        vbts_level=req.vbts_level or 0,
        market_regime=req.market_regime or MarketRegime.BULL,
    )
