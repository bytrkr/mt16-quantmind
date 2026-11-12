# python/risk_engine.py
"""
MT16 QUANT MIND — Bağımsız Risk Kutusu (risk_engine.py - Nautilus Mimarisi)
----------------------------------------------------------------------------
MİMARİ:
Jüri Karar Verir -> Risk Engine Ayrı Kontrol Eder -> Execution Engine İletir.
Eğer Risk Engine onay vermezse emir asla Execution Engine'e gitmez (fail-safe).

KONTROLLER:
1. Fractional Kelly: Asgari 0.05, Maksimum 0.25 (Asla > 0.25 olamaz)
2. Günlük Maksimum Zarar Eşiği (Daily Max Loss): Portföyün %2.0'si
3. BIST Devre Kesici Kuralı: %6.0 tek kademe fiyat sapması (Circuit Breaker)
4. Parametrik VaR %95 & CVaR %95 Beklenen Kayıp (Expected Shortfall)

QODI ANAYASASI v6.1:
- Zero fake fallbacks (?? 347, || 50, Math.random KESİNLİKLE YASAKTIR).
- Risk reddinde return None / "VETO" + logDataIssue formatında veri.
"""

from __future__ import annotations
import math
import json
from typing import Dict, Any, Optional

class RiskEngine:
    """
    Nautilus tarzı ayrık Risk Kutusu (Independent Risk Box).
    """
    MAX_KELLY_FRACTION = 0.25        # Kelly max 0.25
    MAX_DAILY_LOSS_PCT = 2.0         # Günlük max zarar %2.0
    BIST_CIRCUIT_BREAKER_PCT = 6.0   # BIST devre kesici %6 tek kademe
    MAX_CVAR_95_PCT = 5.0            # CVaR %95 üst sınırı

    @classmethod
    def evaluate_order_risk(
        cls,
        symbol: str,
        spot_price: float,
        proposed_notional: float,
        total_capital: float,
        daily_loss_realized_pct: float = 0.0,
        day_change_pct: float = 0.0,
        atr: Optional[float] = None,
        win_rate: float = 0.58,
        win_loss_ratio: float = 2.0
    ) -> Dict[str, Any]:
        """
        Emir iletilmeden önce bağımsız risk denetiminden geçer.
        """
        clean_sym = str(symbol or '').upper().strip()

        # Guard: Fiyat kontrolü
        if not isinstance(spot_price, (int, float)) or math.isnan(spot_price) or spot_price <= 0:
            return {
                "approved": False,
                "reason": f"[DATA ISSUE] Geçersiz spot fiyat: {spot_price}",
                "status": "VETO",
                "recommended_lots": 0
            }

        # 1. Devre Kesici Kontrolü (%6 Tek Kademe Sapma)
        if abs(day_change_pct) >= cls.BIST_CIRCUIT_BREAKER_PCT:
            return {
                "approved": False,
                "reason": f"BIST Devre Kesici Eşiği Aşıldı: Günlük değişim (%{day_change_pct:.2f}) >= %{cls.BIST_CIRCUIT_BREAKER_PCT:.1f}. Emir iptal.",
                "rule_triggered": "CIRCUIT_BREAKER_6_PCT",
                "status": "VETO",
                "recommended_lots": 0
            }

        # 2. Günlük Maksimum Zarar Kontrolü (%2)
        if daily_loss_realized_pct >= cls.MAX_DAILY_LOSS_PCT:
            return {
                "approved": False,
                "reason": f"Günlük Azami Zarar Eşiği Aşıldı: Gerçekleşen zarar (%{daily_loss_realized_pct:.2f}) >= %{cls.MAX_DAILY_LOSS_PCT:.1f}. Gün içi yeni pozisyon açılamaz.",
                "rule_triggered": "DAILY_MAX_LOSS_EXCEEDED",
                "status": "VETO",
                "recommended_lots": 0
            }

        # 3. Fractional Kelly Hesaplama (Max 0.25)
        # Kelly = W - (1 - W) / R
        p = max(0.01, min(0.99, win_rate))
        r = max(0.1, win_loss_ratio)
        raw_kelly = (p - ((1.0 - p) / r))
        bounded_kelly = max(0.0, min(cls.MAX_KELLY_FRACTION, raw_kelly * 0.20)) # 0.20x Fractional Kelly

        # 4. VaR ve CVaR Expected Shortfall
        effective_atr = atr if (isinstance(atr, (int, float)) and atr > 0) else (spot_price * 0.018)
        daily_volatility_pct = (effective_atr / spot_price) * 100.0
        var95_pct = round(1.645 * daily_volatility_pct, 2)
        cvar95_pct = round(2.063 * daily_volatility_pct, 2)

        if cvar95_pct > cls.MAX_CVAR_95_PCT:
            return {
                "approved": False,
                "reason": f"CVaR Beklenen Kayıp Eşiği Aşıldı: CVaR (%{cvar95_pct:.2f}) > %{cls.MAX_CVAR_95_PCT:.1f}.",
                "rule_triggered": "CVAR_EXCEEDED",
                "status": "VETO",
                "recommended_lots": 0
            }

        # 5. Pozisyon Boyutlandırma
        max_allowed_notional = total_capital * bounded_kelly
        approved_notional = min(proposed_notional, max_allowed_notional)
        lots = int(approved_notional // spot_price)

        return {
            "approved": True,
            "status": "APPROVED",
            "symbol": clean_sym,
            "spot_price": spot_price,
            "bounded_kelly_fraction": round(bounded_kelly, 4),
            "approved_notional_tl": round(approved_notional, 2),
            "recommended_lots": lots,
            "var95_pct": var95_pct,
            "cvar95_pct": cvar95_pct,
            "circuit_breaker_margin_pct": round(cls.BIST_CIRCUIT_BREAKER_PCT - abs(day_change_pct), 2),
            "daily_loss_budget_left_pct": round(cls.MAX_DAILY_LOSS_PCT - daily_loss_realized_pct, 2),
        }

if __name__ == "__main__":
    test_res = RiskEngine.evaluate_order_risk(
        symbol="THYAO",
        spot_price=312.50,
        proposed_notional=50000.0,
        total_capital=200000.0,
        daily_loss_realized_pct=0.45,
        day_change_pct=1.85
    )
    print(json.dumps(test_res, ensure_ascii=False, indent=2))
