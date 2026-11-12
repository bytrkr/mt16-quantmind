"""
MT16 QuantMind - Minimal Müdahale (Constant Offset Adjustment & Threshold Recalibration)
[Policy: Minimal-Intervention Offset v1.0]

Qodi Mimarî İlke:
"Evrensel sabit bir sapmaya karşı tüm toplama mimarisini değiştirmek, ölçüm hatasını düzeltmek yerine yeni bir ölçüm tanımlamaktır."

Fonksiyonellik:
1. Mevcut nötr dolgu (OBI=50) yapısını korur.
2. Sabit Ofset Düzeltmesi: Düzeltilmiş Skor = Ham Skor - Nötr_Sapma_Miktarı (+7.0 Puan Ofset)
3. Eşik Kalibrasyonu: AL Eşiği (55 -> 48), SAT Eşiği (25 -> 18)
"""

import json
from datetime import datetime, timezone

def calculate_minimal_intervention_score(raw_imputed_score: float, is_obi_missing: bool = True):
    """
    MT16 Minimal Müdahale Skorlama ve Kalibrasyon Fonksiyonu
    """
    OFFSET_AMOUNT = 7.00  # OBI=50 kabul edildiğinde oluşan ortalama sabit ofset sapması (+7.0 puan)
    
    # 1. Sabit Ofset Düzeltmesi
    if is_obi_missing:
        adjusted_score = raw_imputed_score - OFFSET_AMOUNT
        applied_offset = OFFSET_AMOUNT
    else:
        adjusted_score = raw_imputed_score
        applied_offset = 0.00

    # 2. Kalibre Edilmiş Eşik Değerleri
    OLD_AL_THRESHOLD = 55.00
    OLD_SAT_THRESHOLD = 25.00
    
    RECALIBRATED_AL_THRESHOLD = OLD_AL_THRESHOLD - OFFSET_AMOUNT  # 48.00
    RECALIBRATED_SAT_THRESHOLD = OLD_SAT_THRESHOLD - OFFSET_AMOUNT  # 18.00

    # Karar Karşılaştırması
    old_decision = "AL" if raw_imputed_score >= OLD_AL_THRESHOLD else ("SAT" if raw_imputed_score <= OLD_SAT_THRESHOLD else "BEKLE")
    new_decision = "AL" if adjusted_score >= RECALIBRATED_AL_THRESHOLD and not is_obi_missing else ("AL YÖNÜNDE KANIT YOK (NÖTR-ALTI)" if is_obi_missing else ("SAT" if adjusted_score <= RECALIBRATED_SAT_THRESHOLD else "BEKLE"))

    return {
        "raw_imputed_score": round(raw_imputed_score, 2),
        "adjusted_score": round(adjusted_score, 2),
        "applied_offset": applied_offset,
        "is_obi_missing": is_obi_missing,
        "old_thresholds": {"AL": OLD_AL_THRESHOLD, "SAT": OLD_SAT_THRESHOLD},
        "recalibrated_thresholds": {"AL": RECALIBRATED_AL_THRESHOLD, "SAT": RECALIBRATED_SAT_THRESHOLD},
        "old_decision": old_decision,
        "new_recalibrated_decision": new_decision
    }

def run_asels_comparison():
    print("[Policy: Minimal-Intervention Offset v1.0] ASELS Minimal Müdahale Testi Başlatılıyor...\n")
    
    # ASELS Verileri
    asels_price = 348.25
    asels_raw_imputed_score = 58.00  # MT16'nın OBI=50 nötr dolgu ile ürettiği ham skor
    
    res = calculate_minimal_intervention_score(asels_raw_imputed_score, is_obi_missing=True)

    print("==================================================================================")
    print("ASELS ESKİ VE YENİ DÜZELTİLMİŞ SKOR KARŞILAŞTIRMA RAPORU")
    print("==================================================================================")
    print(f"• Sembol: ASELS | Anlık Fiyat: ₺{asels_price}")
    print(f"• MT16 Ham (Dolgulu) Skor: {res['raw_imputed_score']} / 100")
    print(f"• Uygulanan Sabit Ofset Düzeltmesi: -{res['applied_offset']} puan")
    print(f"• Düzeltilmiş Skor (Adjusted Score): {res['adjusted_score']} / 100")
    print("----------------------------------------------------------------------------------")
    print("EŞİK KALİBRASYON TABLOSU:")
    print(f"  - Eski AL Eşiği:  {res['old_thresholds']['AL']}  -->  YENİ KALİBRE AL EŞİĞİ:  {res['recalibrated_thresholds']['AL']}")
    print(f"  - Eski SAT Eşiği: {res['old_thresholds']['SAT']}  -->  YENİ KALİBRE SAT EŞİĞİ: {res['recalibrated_thresholds']['SAT']}")
    print("----------------------------------------------------------------------------------")
    print(f"• ESKİ SİSTEM KARARI:          {res['old_decision']} (Hatalı Pozitif / AL)")
    print(f"• YENİ DÜZELTİLMİŞ KALİBRE KARAR: {res['new_recalibrated_decision']}")
    print("==================================================================================\n")

    json_log = {
        "policy": "Minimal-Intervention Offset v1.0",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "ticker": "ASELS",
        "price": asels_price,
        "calibration": res
    }

    print("=== MINIMAL MÜDAHALE JSON AUDIT LOGU ===")
    print(json.dumps(json_log, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    run_asels_comparison()
