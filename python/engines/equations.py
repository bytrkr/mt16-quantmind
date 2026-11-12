# python/engines/equations.py
"""
============================================================================
🧠 MT16 QUANTMIND — KUANT DENKLEM VE FORMÜLASYON MOTORU (equations.py)
============================================================================
QODI v6.1 ANAYASASI:
- 0 fallback
- 0 Math.random / random
- Veri eksikse uydurma yapma, None / 'VERİ YOK' dön.
"""

from typing import List, Optional, Dict, Any

class QuantEquations:
    
    @staticmethod
    def calculate_vpin(buy_volumes: List[float], sell_volumes: List[float]) -> Optional[float]:
        """
        VPIN = sum(|buy - sell|) / sum(buy + sell)  [50 Volume Buckets]
        """
        if not buy_volumes or not sell_volumes or len(buy_volumes) != len(sell_volumes):
            return None
        total_vol = sum(b + s for b, s in zip(buy_volumes, sell_volumes))
        if total_vol <= 0:
            return None
        abs_diff = sum(abs(b - s) for b, s in zip(buy_volumes, sell_volumes))
        return abs_diff / total_vol

    @staticmethod
    def calculate_obi(bid_vol: float, ask_vol: float) -> Optional[float]:
        """
        OBI = (bidVol - askVol) / (bidVol + askVol)
        """
        total = bid_vol + ask_vol
        if total <= 0:
            return None
        return (bid_vol - ask_vol) / total

    @staticmethod
    def calculate_cvd(prev_cvd: float, aggressive_buys: float, aggressive_sells: float) -> float:
        """
        CVD(t) = CVD(t-1) + (agresifAlim - agresifSatim)
        """
        return prev_cvd + (aggressive_buys - aggressive_sells)

    @staticmethod
    def calculate_wall_z(kademe_lot: float, ortalama_lot: float, std_sapma: float) -> Optional[float]:
        """
        Wall Z = (kademeLot - ortalamaLot) / stdSapma
        """
        if std_sapma <= 0:
            return None
        return (kademe_lot - ortalama_lot) / std_sapma

    @staticmethod
    def calculate_kelly_fraction(win_prob: float, win_loss_ratio: float) -> Optional[float]:
        """
        Kelly f* = (p*b - q) / b  [p: kazanma olasılığı, q: 1-p, b: kazanma/kaybetme oranı]
        """
        if win_loss_ratio <= 0 or win_prob < 0 or win_prob > 1:
            return None
        q = 1.0 - win_prob
        f_star = (win_prob * win_loss_ratio - q) / win_loss_ratio
        return max(0.0, f_star)

    @staticmethod
    def calculate_volatility(daily_returns: List[float]) -> Optional[float]:
        """
        Volatilite (2. Derece) = StdSapma(Günlük Getiri) * sqrt(252)
        """
        if not daily_returns or len(daily_returns) < 2:
            return None
        mean_ret = sum(daily_returns) / len(daily_returns)
        variance = sum((r - mean_ret) ** 2 for r in daily_returns) / (len(daily_returns) - 1)
        std_dev = variance ** 0.5
        return std_dev * (252 ** 0.5)

    @staticmethod
    def calculate_sharpe(annual_return: float, risk_free_rate: float, volatility: float) -> Optional[float]:
        """
        Sharpe = (Getiri - Risksiz Faiz) / Volatilite
        """
        if volatility <= 0:
            return None
        return (annual_return - risk_free_rate) / volatility

    @staticmethod
    def calculate_beta(stock_returns: List[float], market_returns: List[float]) -> Optional[float]:
        """
        Beta = Cov(Hisse, BIST100) / Var(BIST100)
        """
        if not stock_returns or not market_returns or len(stock_returns) != len(market_returns) or len(stock_returns) < 2:
            return None
        mean_s = sum(stock_returns) / len(stock_returns)
        mean_m = sum(market_returns) / len(market_returns)
        cov = sum((s - mean_s) * (m - mean_m) for s, m in zip(stock_returns, market_returns)) / (len(stock_returns) - 1)
        var_m = sum((m - mean_m) ** 2 for m in market_returns) / (len(market_returns) - 1)
        if var_m <= 0:
            return None
        return cov / var_m

    @staticmethod
    def calculate_portfolio_risk(positions: List[float], volatilities: List[float]) -> Optional[float]:
        """
        Portföy Riski = sum(Pozisyon * Volatilite)
        """
        if not positions or not volatilities or len(positions) != len(volatilities):
            return None
        return sum(p * v for p, v in zip(positions, volatilities))

FORMULAS = {
    "PRICE": "Limit = BasePrice × (1 ± 0.10) [Tavan/Taban %10]",
    "VPIN": "VPIN = ∑|Buy - Sell| / ∑(Buy + Sell)  [50 Buckets]",
    "SENTINEL": "Allocation ≤ MaxStock(20%) & Sector(35%)",
    "ALPHA": "Alpha = Confidence × DirectionScore",
    "WALL_Z": "Wall Z = (KademeLot - OrtalamaLot) / StdSapma",
    "DECISION": "Decision = Consensus(VPIN, Sentinel, Wall, Alpha)",
    "PORTFOLIO": "Portföy Riski = ∑(Pozisyon × Volatilite) & Kelly f* = (p·b - q)/b",
    "VOLATILITY": "Volatilite = StdSapma(Günlük Getiri) × √252",
    "SHARPE": "Sharpe = (Getiri - Risksiz Faiz) / Volatilite [Risksiz Faiz: %40]",
    "BETA": "Beta = Cov(Hisse, BIST100) / Var(BIST100)",
    "OBI": "OBI = (BidVol - AskVol) / (BidVol + AskVol)",
    "CVD": "CVD(t) = CVD(t-1) + (AgresifAlım - AgresifSatım)",
    "KELLY": "Kelly f* = (p · b - q) / b"
}
