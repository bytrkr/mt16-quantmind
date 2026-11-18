import json, os, random, math
from datetime import datetime

def monte_carlo_var_simulasyonu(simulasyon_sayisi=1000):
    pf = json.load(open("data/sanal_portfoy.json", encoding="utf-8")) if os.path.exists("data/sanal_portfoy.json") else []
    aciklar = [p for p in pf if p.get("durum") != "KAPALI"]
    toplam_deger = sum(float(p.get("guncel", 0)) * float(p.get("lot", 0)) for p in aciklar)
    if toplam_deger <= 0: toplam_deger = 100000.0
    random.seed(42)
    gunluk_sonuclar = []
    for _ in range(simulasyon_sayisi):
        portfoy_degisim = 0.0
        for p in aciklar:
            val = float(p.get("guncel", 0)) * float(p.get("lot", 0))
            g, c = float(p.get("giris", 0)), float(p.get("guncel", 0))
            vol = max(0.015, min(0.045, abs((c - g) / g) if g > 0 else 0.022))
            sok = random.gauss(0.0005, vol)
            portfoy_degisim += val * sok
        gunluk_sonuclar.append(portfoy_degisim)
    gunluk_sonuclar.sort()
    var_95 = round(abs(gunluk_sonuclar[int(simulasyon_sayisi * 0.05)]), 2)
    cvar_99 = round(abs(sum(gunluk_sonuclar[:int(simulasyon_sayisi * 0.01)]) / max(1, int(simulasyon_sayisi * 0.01))), 2)
    rapor = {
        "zaman": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "simulasyon": simulasyon_sayisi,
        "portfoy_degeri_tl": round(toplam_deger, 2),
        "gunluk_var_95_tl": var_95,
        "gunluk_var_95_pct": round((var_95 / toplam_deger) * 100, 2),
        "en_kotu_cvar_99_tl": cvar_99,
        "risk_seviyesi": "DUSUK_KONTROLLU" if (var_95 / toplam_deger) < 0.03 else "YUKSEK_OYNAKLIK"
    }
    json.dump(rapor, open("data/monte_carlo_var.json", "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    return rapor

if __name__ == "__main__":
    print("=== MONTE CARLO STRES TESTI & %95 VaR RAPORU ===")
    print(json.dumps(monte_carlo_var_simulasyonu(), ensure_ascii=False, indent=2))
