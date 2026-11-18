import json, os
from datetime import datetime

def boga_ayi_munazara(sembol: str, fiyat: float, rsi: float = 50.0, deg1g: float = 0.0, deg5g: float = 0.0, ort20: float = 0.0, ort50: float = 0.0):
    boga_puan, ayi_puan = 50.0, 50.0
    boga_tezler, ayi_tezler = [], []

    if ort20 > 0 and fiyat > ort20:
        boga_puan += 14; boga_tezler.append("Fiyat 20-gunluk EMA uzerinde trend destegi aliyor")
    if ort50 > 0 and fiyat > ort50:
        boga_puan += 12; boga_tezler.append("Orta vadeli 50-gunluk ortalama yukari yonlu")
    if 0.5 <= deg1g <= 5.5:
        boga_puan += 10; boga_tezler.append(f"Saglikli gunluk ivme (%{deg1g:+.2f})")
    if 42 <= rsi <= 66:
        boga_puan += 12; boga_tezler.append(f"RSI ({rsi:.1f}) ideal yukselis bolgesinde")

    if rsi > 72:
        ayi_puan += 22; ayi_tezler.append(f"Asiri alim riski (RSI {rsi:.1f} > 72)")
    elif rsi < 35:
        ayi_puan += 15; ayi_tezler.append(f"Zayif momentum / dusus trendi (RSI {rsi:.1f})")
    if deg1g > 6.5:
        ayi_puan += 18; ayi_tezler.append(f"Ani tavan/kopukluk geri cekilme riski (%{deg1g:+.2f})")
    if deg5g < -5.0:
        ayi_puan += 16; ayi_tezler.append(f"5 gunluk satici baskisi (%{deg5g:+.2f})")
    if ort20 > 0 and fiyat < ort20:
        ayi_puan += 14; ayi_tezler.append("Fiyat 20-gunluk ortalamanin altinda direnc goruyor")

    net_fark = round(boga_puan - ayi_puan, 1)
    karar = "ONAY_BOGA_USTUN" if net_fark >= 8.0 else "VETO_AYI_BASKIN"
    return {"sembol": sembol, "karar": karar, "boga_puan": round(boga_puan, 1), "ayi_puan": round(ayi_puan, 1), "net_ustunluk": net_fark, "boga_tezler": boga_tezler, "ayi_tezler": ayi_tezler}

def portfoy_munazara_denetimi():
    pf = json.load(open("data/sanal_portfoy.json", encoding="utf-8")) if os.path.exists("data/sanal_portfoy.json") else []
    sonuclar = []
    for p in pf:
        if p.get("durum") == "KAPALI": continue
        g, c = float(p.get("giris", 0)), float(p.get("guncel", 0))
        deg = ((c - g) / g) * 100 if g > 0 else 0.0
        sonuclar.append(boga_ayi_munazara(p.get("sembol"), c, rsi=54.0 + deg, deg1g=deg, deg5g=deg, ort20=g * 0.99, ort50=g * 0.97))
    json.dump({"zaman": datetime.now().strftime("%Y-%m-%d %H:%M:%S"), "munazaralar": sonuclar}, open("data/bull_bear_raporu.json", "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    return sonuclar

if __name__ == "__main__":
    print("=== TRADINGAGENTS BOGA VS AYI MUNAZARA ODASI ===")
    for r in portfoy_munazara_denetimi():
        print(f"• {r['sembol']:<6} | Karar: {r['karar']:<16} | Boga: {r['boga_puan']} vs Ayi: {r['ayi_puan']} (Fark: {r['net_ustunluk']:+.1f})")
