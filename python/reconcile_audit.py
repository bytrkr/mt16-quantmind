import json, os
from datetime import datetime

def portfoy_mutabakat_ve_dogrulama():
    pf_yol = "data/sanal_portfoy.json"
    eq_yol = "data/equity_curve.json"
    if not os.path.exists(pf_yol):
        return {"durum": "EKSIK_DOSYA", "hatalar": ["sanal_portfoy.json yok"]}
    pf = json.load(open(pf_yol, encoding="utf-8"))
    hatalar, duzeltmeler = [], 0
    toplam_net_kz = 0.0
    for p in pf:
        giris = float(p.get("giris", 0) or 0)
        guncel = float(p.get("guncel", 0) or 0)
        lot = float(p.get("lot", 0) or 0)
        if giris <= 0 or lot <= 0:
            hatalar.append(f"{p.get('sembol')}: gecersiz giris/lot")
            continue
        if guncel <= 0:
            p["guncel"] = giris
            guncel = giris
            duzeltmeler += 1
        if p.get("durum") != "KAPALI":
            brut = (guncel - giris) * lot
            komisyon = (giris + guncel) * lot * 0.002
            toplam_net_kz += (brut - komisyon)
    if duzeltmeler > 0:
        json.dump(pf, open(pf_yol, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    eq = json.load(open(eq_yol, encoding="utf-8")) if os.path.exists(eq_yol) else []
    son_eq = float(eq[-1]["kz"]) if eq else 0.0
    fark = round(toplam_net_kz - son_eq, 2)
    rapor = {
        "zaman": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "durum": "DOGRULANDI" if not hatalar else "UYARI",
        "acik_pozisyon": sum(1 for x in pf if x.get("durum") != "KAPALI"),
        "hesaplanan_net_kz": round(toplam_net_kz, 2),
        "equity_son_kz": round(son_eq, 2),
        "mutabakat_farki": fark,
        "otomatik_duzeltme": duzeltmeler,
        "hatalar": hatalar
    }
    json.dump(rapor, open("data/mutabakat_raporu.json", "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    return rapor

if __name__ == "__main__":
    print(json.dumps(portfoy_mutabakat_ve_dogrulama(), ensure_ascii=False, indent=2))
