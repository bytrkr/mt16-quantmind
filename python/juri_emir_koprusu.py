import json, os

def coklu_ajan_juri_onayi(sembol, fiyat, skor, rsi=55.0, hacim_carpani=1.0):
    # 1. Teknik Analist Ajan Oyu
    teknik_oy = skor >= 80 and 45 <= float(rsi) <= 72
    # 2. Likidite & Akilli Emir Yonlendirici Oyu (Kayma / Slippage kontrolu)
    kayma_pct = 0.0015 if float(hacim_carpani) >= 1.2 else 0.0035
    yonlendirici_oy = float(hacim_carpani) >= 0.9 and float(fiyat) > 0
    # 3. Risk Yoneticisi & Sektor Kalkani Oyu
    risk_oy = skor >= 78
    onay_sayisi = sum([teknik_oy, yonlendirici_oy, risk_oy])
    return {
        "onay": onay_sayisi >= 2,
        "konsensus": f"{onay_sayisi}/3 Ajan Onayi",
        "tahmini_kayma": kayma_pct,
        "ajanlar": {"Teknik": teknik_oy, "SmartRouter": yonlendirici_oy, "RiskGuard": risk_oy}
    }
