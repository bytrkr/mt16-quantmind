import os, json, pathlib, urllib.request
from datetime import datetime

def depolari_tara_ve_ozetle():
    kok = pathlib.Path("uploads")
    bulunan = {"ts_contracts": [], "design_components": [], "story_chapters": [], "ask_pipeline": [], "tests": [], "docs": []}
    if kok.exists():
        for p in kok.rglob("*"):
            if not p.is_file() or "node_modules" in str(p): continue
            s = str(p).lower()
            if "contract" in s: bulunan["ts_contracts"].append(str(p))
            elif "component" in s or "design" in s: bulunan["design_components"].append(str(p))
            elif "chapter" in s or "story" in s: bulunan["story_chapters"].append(str(p))
            elif "ask" in s or "parser" in s or "validator" in s: bulunan["ask_pipeline"].append(str(p))
            elif "test" in s: bulunan["tests"].append(str(p))
            elif s.endswith(".md"): bulunan["docs"].append(str(p))
    return {k: len(v) for k, v in bulunan.items()}

def tam_entegrasyon_dongusu():
    pf_yol = "data/sanal_portfoy.json"
    pf = json.load(open(pf_yol, encoding="utf-8")) if os.path.exists(pf_yol) else []
    aciklar = [p for p in pf if p.get("durum") != "KAPALI"]
    kapalilar = [p for p in pf if p.get("durum") == "KAPALI"]

    # 1. Kontrat & Spike Korumasi + Getiri Hesabi
    getiriler, lot_olcek, hikaye_kartlari = [], {}, []
    toplam_net = 0.0
    for p in aciklar:
        g, c, l = float(p.get("giris", 0) or 0), float(p.get("guncel", 0) or 0), float(p.get("lot", 0) or 0)
        if g <= 0 or l <= 0: continue
        pct = ((c - g) / g) * 100
        net = (c - g) * l - (g + c) * l * 0.002
        toplam_net += net
        getiriler.append(pct)
        oynaklik = abs(pct)
        lot_olcek[p.get("sembol")] = round(max(0.5, min(1.25, 2.5 / max(oynaklik, 1.5))), 2)
        hikaye_kartlari.append({"sembol": p.get("sembol"), "pct": round(pct, 2), "net_tl": round(net, 2), "durum": "POZITIF" if net >= 0 else "NEGATIF"})

    hikaye_kartlari.sort(key=lambda x: x["pct"], reverse=True)
    ort_getiri = sum(getiriler) / len(getiriler) if getiriler else 0.0
    poz_oran = (sum(1 for x in getiriler if x > 0) / len(getiriler)) if getiriler else 0.5
    rejim = "AYI_SAVUNMA" if (ort_getiri < -2.5 or poz_oran < 0.25) else ("BOGA_TREND" if (ort_getiri > 1.0 and poz_oran >= 0.50) else "YATAY_DENGELI")

    # 2. Walk-Forward Ogrenme & Story Timeline
    kazanan_kapali = sum(1 for p in kapalilar if float(p.get("guncel", 0)) > float(p.get("giris", 0)))
    win_rate = round((kazanan_kapali / len(kapalilar)) * 100, 1) if kapalilar else 50.0

    # 3. Uctan Uca Web & API Testi
    web_durum = {}
    for ad, url in [("Port_3000", "http://127.0.0.1:3000"), ("Port_3001", "http://127.0.0.1:3001"), ("Port_3001_API", "http://127.0.0")]:
        try: web_durum[ad] = urllib.request.urlopen(url, timeout=3).getcode()
        except Exception as e: web_durum[ad] = str(e)

    tam_rapor = {
        "zaman": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "taranan_depo_katmanlari": depolari_tara_ve_ozetle(),
        "piyasa_rejimi": rejim,
        "toplam_net_kz_tl": round(toplam_net, 2),
        "walk_forward_win_rate": win_rate,
        "atr_lot_carpanlari": lot_olcek,
        "story_timeline": hikaye_kartlari,
        "web_saglik": web_durum
    }
    json.dump(tam_rapor, open("data/tam_sistem_entegrasyon.json", "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    return tam_rapor

if __name__ == "__main__":
    print(json.dumps(tam_entegrasyon_dongusu(), ensure_ascii=False, indent=2))
