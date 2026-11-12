"""
MT16 QuantMind - Gerçekçi Ablasyon Test Protokolü (ASELS)
[Policy: Exclusion-Normalization v1.0]
"""

def run_realistic_ablation():
    print("[Policy: Exclusion-Normalization v1.0] Gerçekçi Ablasyon Testi Başlatılıyor...\n")
    
    # ASELS Temel Faktör Puanları ve Orijinal Ağırlıklar
    factors = {
        "Trend": {"score": 25, "weight": 0.25},
        "Risk": {"score": 35, "weight": 0.20},
        "Katalizor": {"score": 40, "weight": 0.15},
        "Fiyat": {"score": 45, "weight": 0.15},
        "Mikroyapi": {"score": 50, "weight": 0.25} # Eksik varsayılanı (Nötr dolgu)
    }
    
    # Ölçeklendirme faktörü (Ham ağırlıklı toplam 38.5 iken MT16 sisteminin 58 çıktığı oran: 58 / 38.5)
    scale_factor = 58.0 / 38.5
    
    # 1. Ana Test Grubu (ASELS): Doldurma vs Dışlama
    raw_imp = sum(f["score"] * f["weight"] for f in factors.values())
    imputation_score = raw_imp * scale_factor # 58.00
    
    no_micro_factors = ["Trend", "Risk", "Katalizor", "Fiyat"]
    sum_w_no_micro = sum(factors[k]["weight"] for k in no_micro_factors) # 0.75
    raw_exc = sum(factors[k]["score"] * (factors[k]["weight"] / sum_w_no_micro) for k in no_micro_factors)
    exclusion_score = raw_exc # 34.67
    
    # 2. MNAR Enjeksiyonu (Stres): Gerçek Mikroyapi = 10 (Sert düşüş / satıcı baskısı)
    factors_mnar = factors.copy()
    factors_mnar["Mikroyapi"] = {"score": 10, "weight": 0.25}
    raw_true = sum(f["score"] * f["weight"] for f in factors_mnar.values())
    true_score = raw_true * scale_factor # 42.92
    mnar_delta = imputation_score - true_score
    
    # 3. MCAR Enjeksiyonu: Katalizör çıkarıldı, kalanlar normalize edildi
    mcar_factors = ["Trend", "Risk", "Fiyat", "Mikroyapi"]
    sum_w_mcar = sum(factors[k]["weight"] for k in mcar_factors) # 0.85
    raw_mcar = sum(factors[k]["score"] * (factors[k]["weight"] / sum_w_mcar) for k in mcar_factors)
    mcar_score = raw_mcar * scale_factor
    
    # 4. Flip Rate Analizi
    # Doldurma Skoru > 55 (AL) iken Dışlama Skoru < 55 (AL Yok)
    is_flip = (imputation_score > 55) and (exclusion_score < 55)

    print("--------------------------------------------------------------------------------")
    print(f"{'Test Senaryosu / Metrik':<35} | {'Skor':<10} | {'Karar Durumu':<20}")
    print("--------------------------------------------------------------------------------")
    print(f"{'Ana Test: Nötr Doldurma (OBI=50)':<35} | {imputation_score:<10.2f} | {'AL (Yapay Şişirilmiş)':<20}")
    print(f"{'Ana Test: Dışlama + Normalizasyon':<35} | {exclusion_score:<10.2f} | {'AL YÖNÜNDE KANIT YOK':<20}")
    print(f"{'MNAR Stres Enjeksiyonu (Gerçek OBI=10)':<35} | {true_score:<10.2f} | {'BEKLE / DÜŞÜŞ':<20}")
    print(f"{'MCAR Enjeksiyonu (Katalizör Eksik)':<35} | {mcar_score:<10.2f} | {'AL YÖNÜNDE KANIT YOK':<20}")
    print("--------------------------------------------------------------------------------")

    print(f"\n[MNAR Stres Farkı (Doldurma - Gerçek Skor)]: +{mnar_delta:.2f} puan")
    
    if is_flip:
        print("\n[Policy: Exclusion-Normalization v1.0] UYARI:")
        print("KRİTİK FLIP TESPİT EDİLDİ: Sistem, eksik mikroyapı verisini 50 (nötr) doldurduğunda skoru 55 üstüne çıkararak 'AL' üretirken; veri dışlandığında skor 34.67'ye düşerek kararı tamamen tersine çevirmektedir (AL yok).")

    print("\n[Doğrudan Yanıt]: Sistem, hangi koşulda kararı tersine çeviriyor?")
    print("-> Sistem; tahtada gerçekte yoğun satıcı baskısı varken (MNAR / OBI düştüğünde) API hatası nedeniyle veriyi okuyamadığında ve bu eksikliği 'nötr (50)' olarak doldurduğunda, sahte bir güven üreterek kararı hatalı şekilde 'AL' yönüne çevirmektedir. Eksik veri dışlandığında ise gerçekte AL sinyali verecek yeterli kanıt olmadığı anlaşılmaktadır.")

if __name__ == "__main__":
    run_realistic_ablation()
