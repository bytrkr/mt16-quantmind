"""
MT16 QuantMind - Kuantitatif Eksik Veri ve Skorlama Simülasyonu
Senior Quantitative Analyst Raporu ve Hesaplama Motoru
"""

def main():
    # Veri Paketi
    factors = {
        "Trend Puanı": {"score": 25, "weight": 0.25},
        "Risk Puanı": {"score": 35, "weight": 0.20},
        "Katalizör Puanı": {"score": 40, "weight": 0.15},
        "Fiyat Konumu Puanı": {"score": 45, "weight": 0.15},
        "Mikroyapı (L2 OBI) Puanı": {"score": 50, "weight": 0.25}
    }

    print("==================================================")
    print("MT16 QUANTMIND - KUANTİTATİF SKORLAMA SİMÜLASYONU")
    print("==================================================\n")

    # SENARYO A: Mevcut Durum (Eksik veri 50 nötr dolgu ile)
    score_a = sum(f["score"] * f["weight"] for f in factors.values())
    
    # SENARYO B: Doğru Yaklaşım - Dışlama (Mikroyapı dışı 4 faktör %100'e normalize edilir)
    factors_b_keys = ["Trend Puanı", "Risk Puanı", "Katalizör Puanı", "Fiyat Konumu Puanı"]
    sum_weights_b = sum(factors[k]["weight"] for k in factors_b_keys) # 0.75
    score_b = sum(factors[k]["score"] * (factors[k]["weight"] / sum_weights_b) for k in factors_b_keys)

    # SENARYO C: Gerçek Tick Verisi (OBI = -0.048 -> Mikroyapı Puanı = 50 + (250 * -0.048) = 38.0)
    obi_real = -0.048
    micro_score_c = 50 + (250 * obi_real) # 38.0
    
    factors_c = factors.copy()
    factors_c["Mikroyapı (L2 OBI) Puanı"] = {"score": micro_score_c, "weight": 0.25}
    score_c = sum(f["score"] * f["weight"] for f in factors_c.values())

    # Yapay Şişirme Hesabı
    inflation = score_a - score_c

    print(f"Senaryo A (Mevcut Durum - Nötr Dolgu OBI=50): {score_a:.2f} / 100")
    print(f"Senaryo B (Mikroyapı Dışlama & Normalizasyon):  {score_b:.2f} / 100")
    print(f"Senaryo C (Gerçek Tick OBI=-0.048, Puan={micro_score_c}): {score_c:.2f} / 100")
    print(f"Yapay Şişirme Farkı (Senaryo A - Senaryo C):     {inflation:.2f} puan\n")

    print("--------------------------------------------------")
    print("SONUÇ TABLOSU")
    print("--------------------------------------------------")
    print(f"{'Senaryo':<40} | {'Mikroyapı Puanı':<15} | {'Toplam Skor':<12}")
    print("-" * 75)
    print(f"{'Senaryo A: Mevcut Durum (Varsayılan Dolgu)':<40} | {50.0:<15.1f} | {score_a:<12.2f}")
    print(f"{'Senaryo B: Faktör Dışlama & Normalizasyon':<40} | {'Dışlandı (N/A)':<15} | {score_b:<12.2f}")
    print(f"{'Senaryo C: Gerçek Tick Verisi (OBI=-0.048)':<40} | {micro_score_c:<15.1f} | {score_c:<12.2f}")
    print("--------------------------------------------------")

if __name__ == "__main__":
    main()
