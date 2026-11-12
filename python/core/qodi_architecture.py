"""
MT16 QuantMind - Qodi Metodolojisi Mimarisi ve Karar Zarfı (Decision Envelope) Simülasyonu
[Policy: Exclusion-Normalization v1.0]

Düzeltilen 3 Kritik Husus:
1. Birim/Ölçek Assertion'ı: d_ham (TL cinsinden) < 3 * tick_size (0.75 TL) ise ValueError fırlatılır.
2. Giriş/Çıkış Asimetrisi (Karar Zarfı): JSON çıktısında entry_blocked, exit_allowed ve decided_by alanları zorunludur.
3. Sessiz Fallback Yasağı: spoof_index "TESTABLE_DEĞİL" durumunda varsayılan sayı üretilmez, null döner ve NO_TRADE (Bilinmiyor) işaretlenir.
"""

import json
from datetime import datetime, timezone

class QodiQuantArchitecture:
    def __init__(self, ticker: str, price: float, tick_size: float = 0.25):
        self.ticker = ticker
        self.price = price
        self.tick_size = tick_size

    def mnar_shield(self, total_factors: int, available_factors: int, error_type: str = None) -> dict:
        """
        Modül 1: MNAR Kalkanı (Kademe Yöneticisi & 5 Kademeli Ağaç)
        """
        coverage = available_factors / total_factors if total_factors > 0 else 0.0
        
        if error_type == "AUTH_401":
            tier = "L4"
            status = "NO_SIGNAL"
            message = "AUTH (401) hatası: Retry yapılmadı, doğrudan en alt kademeye (L4) düşürüldü."
            return {"coverage": coverage, "tier": tier, "status": status, "message": message, "hard_stop": True}
        elif error_type == "TIMEOUT":
            tier = "L3"
            status = "NO_SIGNAL"
            message = "TIMEOUT hatası: Gecikmeli akış, kademe düşürüldü."
            return {"coverage": coverage, "tier": tier, "status": status, "message": message, "hard_stop": False}

        if coverage < 0.50:
            tier = "L4"
            status = "NO_SIGNAL"
            message = "Kapsam <%50 (L4): Hard Stop zorunluluğu devrede. Skor basılmıyor."
            return {"coverage": coverage, "tier": tier, "status": status, "message": message, "hard_stop": True}
        elif coverage < 0.85:
            tier = "L2"
            status = "NO_SIGNAL"
            message = f"Kapsam < %85 (Kapsam: %{coverage*100:.1f}): Skor basılmıyor (NO_SIGNAL)."
            return {"coverage": coverage, "tier": tier, "status": status, "message": message, "hard_stop": False}
        else:
            tier = "L0"
            status = "PASS"
            message = "Kapsam yeterli (>=%85). Tam kuant analizi aktif."
            return {"coverage": coverage, "tier": tier, "status": status, "message": message, "hard_stop": False}

    def dynamic_stop_and_sizing(self, d_ham: float, sigma_h: float, atr_tf: float, risk_budget_pct: float = 0.01, capital: float = 100000.0) -> dict:
        """
        Modül 2: Dinamik Stop ve Boyut Motoru
        Birim/Ölçek Assertion'ı: d_ham mesafesi (TL cinsinden) 3 * tick_size (0.75 TL) altındaysa ValueError fırlatır.
        """
        # Birim/Ölçek Assertion'ı
        d_ham_tl = d_ham * self.price if d_ham < 1.0 else d_ham
        min_allowed_tl = 3.0 * self.tick_size  # 3 * 0.25 TL = 0.75 TL
        
        if d_ham_tl < min_allowed_tl:
            raise ValueError(
                f"Birim/Ölçek Assertion Hatası: Hesaplanan d_ham mesafesi ({d_ham_tl:.4f} TL) "
                f"fiyat adımının 3 katından ({min_allowed_tl:.2f} TL) küçük olamaz! "
                f"Lütfen ATR/ölçek birimlerini kontrol edin."
            )

        d_min = 2.0 * sigma_h
        d_max = 2.0 * atr_tf / self.price
        
        if d_min > d_max:
            return {
                "status": "İŞLEM ALINAMAZ",
                "reason": "Stop mesafesi yetersiz (D_min > D_max)",
                "d_stop": None,
                "position_size_lot": 0
            }
            
        if d_ham < d_min:
            return {
                "status": "İŞLEM ALINAMAZ",
                "reason": f"Stop mesafesi volatiliteye göre çok dar (d_ham: {d_ham:.4f} < D_min: {d_min:.4f})",
                "d_stop": None,
                "position_size_lot": 0
            }
            
        d_stop = max(d_min, min(d_ham, d_max))
        
        risk_amount = capital * risk_budget_pct
        risk_per_share = self.price * d_stop
        position_lots = int(risk_amount / risk_per_share) if risk_per_share > 0 else 0
        
        return {
            "status": "APPROVED",
            "d_stop": round(d_stop, 4),
            "d_min": round(d_min, 4),
            "d_max": round(d_max, 4),
            "position_size_lot": position_lots,
            "risk_amount_try": round(risk_amount, 2)
        }

    def spoof_index(self, wall_approached: bool, cr_rel_n: float = 0.0, bc: float = 0.0, ln: float = 0.0, rn: float = 0.0, r2: float = 0.0, d: float = 0.0, sigma: float = 1.0, t_gun: float = 1.0) -> dict:
        """
        Modül 3: Spoof Endeksi (SI) ve T_reach
        Sessiz Fallback Yasağı: Asla varsayılan sayı üretilmez, spoof_index None döner.
        """
        if not wall_approached:
            return {
                "status": "TESTABLE_DEĞİL",
                "spoof_index": None,
                "reason": "Sessiz Fallback Yasağı: Fiyat duvara yaklaşmadığı için varsayılan sayı üretilmedi (TESTABLE_DEĞİL)."
            }
            
        t_reach = ((d / sigma) ** 2) * t_gun
        si = 0.30 * cr_rel_n + 0.25 * bc + 0.20 * ln + 0.15 * rn + 0.10 * (1 - r2)
        
        return {
            "status": "COMPUTED",
            "spoof_index": round(si, 4),
            "t_reach_hours": round(t_reach, 2)
        }


def simulate_asels():
    architect = QodiQuantArchitecture("ASELS", 348.25, tick_size=0.25)
    
    # 1. MNAR Kalkanı Testi (AUTH 401 hatası simülasyonu)
    mnar_result = architect.mnar_shield(total_factors=5, available_factors=4, error_type="AUTH_401")
    
    # 2. Dinamik Stop Testi (Gerçek Veriler: d_ham = (348.25 - 346.28) / 348.25 = 0.0056568 -> 1.97 TL >= 0.75 TL)
    d_ham = (348.25 - 346.28) / 348.25
    try:
        stop_result = architect.dynamic_stop_and_sizing(d_ham=d_ham, sigma_h=0.032, atr_tf=14.5)
    except ValueError as e:
        stop_result = {"status": "ERROR", "reason": str(e)}

    # 3. Spoof Endeksi Testi (Sessiz Fallback Yasağı)
    spoof_result = architect.spoof_index(wall_approached=False)
    
    # Karar Zarfı (Decision Envelope) Oluşturma
    # Öncelikli kural değerlendirmesi
    if mnar_result["status"] == "NO_SIGNAL":
        decided_by = "MNAR_SHIELD"
        final_status = "NO_TRADE"
        reason = mnar_result["message"]
    elif stop_result["status"] == "İŞLEM ALINAMAZ":
        decided_by = "DYNAMIC_STOP"
        final_status = "NO_TRADE"
        reason = stop_result["reason"]
    elif spoof_result["status"] == "TESTABLE_DEĞİL":
        decided_by = "SPOOF_INDEX"
        final_status = "NO_TRADE (Bilinmiyor)"
        reason = spoof_result["reason"]
    else:
        decided_by = "QUANT_ENGINE"
        final_status = "APPROVE_TRADE"
        reason = "Tüm kuant kalkanlar onaylandı."

    decision_envelope = {
        "final": final_status,
        "decided_by": decided_by,
        "entry_blocked": True if final_status.startswith("NO_TRADE") else False,
        "exit_allowed": True,  # Giriş/Çıkış Asimetrisi: Yeni girişler engellense dahi mevcut pozisyondan çıkışa/stopa izin verilir.
        "reason": reason
    }
    
    log_output = {
        "policy": "Exclusion-Normalization v1.0",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "ticker": "ASELS",
        "last_price": 348.25,
        "tick_size_try": 0.25,
        "modules": {
            "mnar_shield": mnar_result,
            "dynamic_stop_sizing": stop_result,
            "spoof_index": spoof_result
        },
        "decision_envelope": decision_envelope
    }
    
    print("=== QODİ DENETİM STANDARTLARINA UYGUN KARAR ZARFI (DECISION ENVELOPE) JSON LOGU ===")
    print(json.dumps(log_output, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    simulate_asels()
