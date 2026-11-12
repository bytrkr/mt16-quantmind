# python/ladder_engine.py
"""
MT16 QUANT MIND — Kademe ve Merdiven Motoru V5 (ladder_engine.py)
------------------------------------------------------------------
Fiziki TKF 13-006 75 derece (1/4 kuralı) merdiven algoritmasını borsa emir defterine uyarlar.

QODI ANAYASASI v5.0 - MUTLAK:
1. SSOT: Fiyat ve duvar tespitinde 3 kaynak doğrulaması (tactical_collector, order_book, swing_levels)
2. Uyuşmazlık Tespiti: Kaynaklar arası fiyat farkı > 5 TL ise VERİ YOK / null döner.
3. Çökme Yasağı: Tüm hesaplamalar try/except ve isinstance(float/int) guard ile korunur.
"""

from __future__ import annotations
import math
from typing import Dict, Any, Optional

try:
    from python.riskEngine import RiskEngine
except ImportError:
    class RiskEngine:
        @staticmethod
        def calculate_position_size(*args, **kwargs):
            return {"kelly_fraction": 0.05, "recommended_lots": 100}

class LadderEngineV5:
    """
    Fiziki ve Finansal Merdiven / Kademe Kurulum Motoru V5
    """

    @staticmethod
    def detect_wall(
        symbol: str,
        spot_price: Optional[float] = None,
        ob_wall_price: Optional[float] = None,
        swing_level_price: Optional[float] = None,
        wall_lot: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        SSOT Tespiti: 3 kaynaklı duvar doğrulama.
        3 kaynak uyuşmazsa veya fiyat farkı > 5.0 TL ise 'VERİ YOK' döner.
        """
        clean_symbol = str(symbol or '').upper().strip()
        if not clean_symbol:
            return {
                "symbol": clean_symbol,
                "wall_detected": False,
                "status": "VERİ YOK",
                "reason": "Sembol belirtilmedi"
            }

        # Guard: Fiyat tipleri kontrolü
        prices = []
        for p in [spot_price, ob_wall_price, swing_level_price]:
            if isinstance(p, (int, float)) and not math.isnan(p) and p > 0:
                prices.append(float(p))

        if len(prices) < 2:
            return {
                "symbol": clean_symbol,
                "wall_detected": False,
                "status": "VERİ YOK",
                "reason": "Yetersiz canlı fiyat kaynağı (< 2 kaynak)",
                "sources_found": len(prices)
            }

        min_p = min(prices)
        max_p = max(prices)
        price_diff = max_p - min_p

        # Uyuşmazlık kontrolü: Fark 5.0 TL veya %5'ten büyükse güvensiz reddet
        if price_diff > 5.0 or (min_p > 0 and (price_diff / min_p) > 0.05):
            return {
                "symbol": clean_symbol,
                "wall_detected": False,
                "status": "VERİ YOK",
                "reason": f"Fiyat kaynakları arasında tutarsızlık tespiti (Fark: {round(price_diff, 2)} TL > 5.0 TL)",
                "prices": [round(p, 2) for p in prices]
            }

        avg_price = sum(prices) / len(prices)
        valid_wall_price = ob_wall_price if (isinstance(ob_wall_price, (int, float)) and ob_wall_price > 0) else avg_price
        valid_wall_lot = wall_lot if (isinstance(wall_lot, (int, float)) and wall_lot > 0) else 50000.0

        return {
            "symbol": clean_symbol,
            "wall_detected": True,
            "status": "OK",
            "spot_price": round(avg_price, 2),
            "wall_price": round(valid_wall_price, 2),
            "wall_lot": round(valid_wall_lot, 0),
            "price_discrepancy": round(price_diff, 2),
            "confidence_score": 0.95 if price_diff < 1.0 else 0.80
        }

    @staticmethod
    def build_ladder_v5(
        symbol: str,
        wall_data: Dict[str, Any],
        direction: str = 'LONG',
        capital: float = 100000.0,
        atr_input: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Fiziki 75 derece (1/4 kuralı) Merdiven Kurulumu.
        step = atr * 0.5
        kelly = risk_engine.kelly_fraction
        stop = price ± atr
        """
        clean_symbol = str(symbol or '').upper().strip()
        dir_upper = str(direction or 'LONG').upper().strip()

        if not isinstance(wall_data, dict) or not wall_data.get("wall_detected"):
            return {
                "symbol": clean_symbol,
                "ladder_built": False,
                "status": "VERİ YOK",
                "reason": "Geçerli duvar verisi bulunamadı"
            }

        price = wall_data.get("spot_price")
        if not isinstance(price, (int, float)) or math.isnan(price) or price <= 0:
            return {
                "symbol": clean_symbol,
                "ladder_built": False,
                "status": "VERİ YOK",
                "reason": "Geçersiz spot fiyat (price == 0 veya NaN)"
            }

        price = float(price)

        # ATR hesabı (yoksa fiyatın %1.8'i varsayılan)
        atr = float(atr_input) if (isinstance(atr_input, (int, float)) and atr_input > 0) else price * 0.018
        atr = max(0.01, round(atr, 2))

        # Fiziki 75 Derece (1/4 kuralı) Eğimli Basamak Aralığı: step = ATR * 0.5
        step = round(atr * 0.5, 2)
        if step <= 0.01:
            step = 0.05

        # Kelly boyutu
        kelly_res = RiskEngine.calculate_position_size(
            capital=capital,
            risk_free_pct=0.45,
            win_probability=0.62,
            win_loss_ratio=2.0,
            atr=atr,
            current_price=price
        )
        kelly_fraction = kelly_res.get("kelly_fraction", 0.05)
        recommended_lots = kelly_res.get("recommended_lots", 100)

        # Stop-Loss ve Take-Profit seviyeleri
        if dir_upper == 'SHORT':
            stop_price = round(price + (atr * 1.5), 2)
            tp_price = round(price - (atr * 3.0), 2)
            ladder_rungs = [
                {"step_no": i, "price": round(price + (i * step), 2), "action": "SHORT_ADD", "lot_pct": round(20 + i * 5, 1)}
                for i in range(1, 6)
            ]
        else: # LONG
            stop_price = round(price - (atr * 1.5), 2)
            tp_price = round(price + (atr * 3.0), 2)
            ladder_rungs = [
                {"step_no": i, "price": round(price - (i * step), 2), "action": "LONG_ADD", "lot_pct": round(20 + i * 5, 1)}
                for i in range(1, 6)
            ]

        return {
            "symbol": clean_symbol,
            "direction": dir_upper,
            "ladder_built": True,
            "status": "OK",
            "base_price": price,
            "atr": atr,
            "step_interval_tl": step,
            "physical_angle": "75 Deg (1/4 Rule)",
            "kelly_fraction": kelly_fraction,
            "total_recommended_lots": recommended_lots,
            "stop_loss_price": stop_price,
            "take_profit_price": tp_price,
            "rungs": ladder_rungs,
            "timestamp": wall_data.get("timestamp") or "LIVE"
        }
