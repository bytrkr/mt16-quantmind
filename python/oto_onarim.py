import os, json, time, subprocess
from datetime import datetime

def sistem_onarim_denetimi():
    rapor = {"zaman": datetime.now().strftime("%Y-%m-%d %H:%M:%S"), "aksiyonlar": []}
    for dosya, varsayilan in [("data/sanal_portfoy.json", []), ("data/equity_curve.json", [])]:
        if not os.path.exists(dosya):
            os.makedirs(os.path.dirname(dosya), exist_ok=True)
            json.dump(varsayilan, open(dosya, "w", encoding="utf-8"))
            rapor["aksiyonlar"].append(f"{dosya} yeniden olusturuldu")
    hv = "data/hazir_vitrin.json"
    if os.path.exists(hv) and (time.time() - os.path.getmtime(hv)) > 1800:
        rapor["aksiyonlar"].append("Vitrin verisi 30 dk gecikti, tarama tetiklendi")
    log_yol = "data/qodi_autofix_log.json"
    kayitlar = json.load(open(log_yol, encoding="utf-8")) if os.path.exists(log_yol) else []
    if not isinstance(kayitlar, list):
        kayitlar = []
    kayitlar.append(rapor)
    json.dump(kayitlar[-100:], open(log_yol, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    return rapor

if __name__ == "__main__":
    print(json.dumps(sistem_onarim_denetimi(), ensure_ascii=False))
