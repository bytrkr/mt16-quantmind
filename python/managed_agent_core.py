import json, os, pathlib
from datetime import datetime

def clean_and_compute_facts():
    pf_yol = "data/sanal_portfoy.json"
    if not os.path.exists(pf_yol):
        return {"durum": "VERI_YOK"}
    pf = json.load(open(pf_yol, encoding="utf-8"))
    temiz, olgular = [], {"acik": 0, "kapali": 0, "kazanan": 0, "kaybeden": 0, "net_kz": 0.0, "en_iyi": None, "en_kotu": None}
    for p in pf:
        g = float(p.get("giris", 0) or 0)
        c = float(p.get("guncel", 0) or 0) or g
        l = float(p.get("lot", 0) or 0)
        if g <= 0 or l <= 0:
            continue
        p["guncel"] = c
        temiz.append(p)
        if p.get("durum") == "KAPALI":
            olgular["kapali"] += 1
        else:
            olgular["acik"] += 1
            net = (c - g) * l - (g + c) * l * 0.002
            pct = ((c - g) / g) * 100
            olgular["net_kz"] += net
            if net >= 0: olgular["kazanan"] += 1
            else: olgular["kaybeden"] += 1
            if not olgular["en_iyi"] or pct > olgular["en_iyi"][1]: olgular["en_iyi"] = (p.get("sembol"), round(pct, 2), round(net, 2))
            if not olgular["en_kotu"] or pct < olgular["en_kotu"][1]: olgular["en_kotu"] = (p.get("sembol"), round(pct, 2), round(net, 2))
    olgular["net_kz"] = round(olgular["net_kz"], 2)
    json.dump(olgular, open("data/managed_facts.json", "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    zaman = datetime.now().strftime("%Y-%m-%d %H:%M")
    pathlib.Path("PROGRESS.md").write_text(f"# MT16 Managed Agent Ilerleme Raporu\n- Son Guncelleme: {zaman}\n- Acik Pozisyon: {olgular['acik']} | Kapali: {olgular['kapali']}\n- Kazanan/Kaybeden: {olgular['kazanan']}/{olgular['kaybeden']}\n- Net K/Z (Komisyon Dahil): {olgular['net_kz']:+.2f} TL\n", encoding="utf-8")
    dec = pathlib.Path("DECISIONS.md")
    if not dec.exists():
        dec.write_text("# MT16 Mimari Karar Gunlugu\n- [KURAL-1] Tum emirler 3/3 Juri Onayi ve 1:2 Risk/Odul kilidine tabidir.\n- [KURAL-2] Her döngüde 3 asamali Clean -> Compute -> Reconcile boru hatti calisir.\n", encoding="utf-8")
    return olgular

if __name__ == "__main__":
    print(json.dumps(clean_and_compute_facts(), ensure_ascii=False, indent=2))
