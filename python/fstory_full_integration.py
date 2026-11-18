import json, os, urllib.request
from datetime import datetime

def davranissal_streak_ve_spike_kalkan():
    pf_yol = "data/sanal_portfoy.json"
    if not os.path.exists(pf_yol):
        return {"durum": "VERI_YOK"}
    pf = json.load(open(pf_yol, encoding="utf-8"))
    karantina, win_s, loss_s, max_w, max_l, liste = 0, 0, 0, 0, 0, []
    for p in pf:
        g = float(p.get("giris", 0) or 0)
        c = float(p.get("guncel", 0) or 0) or g
        if g > 0 and abs((c - g) / g) > 0.35:
            p["guncel"] = g
            karantina += 1
            c = g
        if g > 0:
            pct = ((c - g) / g) * 100
            if pct > 0: win_s += 1; loss_s = 0; max_w = max(max_w, win_s)
            elif pct < 0: loss_s += 1; win_s = 0; max_l = max(max_l, loss_s)
            liste.append((p.get("sembol"), round(pct, 2)))
    if karantina > 0:
        json.dump(pf, open(pf_yol, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    rapor = {
        "zaman": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "profil": "Dengeli Momentum Avcisi" if max_w >= max_l else "Savunmaci Risk Kalkanli",
        "max_kazanma_serisi": max_w,
        "max_kaybetme_serisi": max_l,
        "spike_karantina": karantina,
        "pozisyonlar": liste
    }
    json.dump(rapor, open("data/fstory_behavior.json", "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    return rapor

def web_saglik_testi():
    sonuc = {}
    for ad, url in [("Port_3000", "http://127.0.0.1:3000"), ("Port_3001", "http://127.0.0.1:3001"), ("Port_3001_API", "http://127.0.0")]:
        try: sonuc[ad] = f"OK ({urllib.request.urlopen(url, timeout=4).getcode()})"
        except Exception as e: sonuc[ad] = f"HATA ({e})"
    return sonuc

if __name__ == "__main__":
    print("=== DAVRANISSAL STREAK & SPIKE KALKANI ===")
    print(json.dumps(davranissal_streak_ve_spike_kalkan(), ensure_ascii=False, indent=2))
    print("=== WEB & API SAGLIK TESTI ===")
    print(json.dumps(web_saglik_testi(), ensure_ascii=False, indent=2))
