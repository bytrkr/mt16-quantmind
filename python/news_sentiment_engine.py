import json, os, urllib.request, urllib.parse, xml.etree.ElementTree as ET
from datetime import datetime

POZITIF_KELIMELER = ("kar", "rekor", "ihale", "anlasma", "temettu", "buyume", "onay", "yatirim", "hedef fiyat yukseltti", "al tavsiyesi")
NEGATIF_KELIMELER = ("zarar", "ceza", "sorusturma", "dusus", "iptal", "kredi notu dusurdu", "sat tavsiyesi", "borc", "grev", "iflas")

def hisse_haber_duygu_tara():
    pf = json.load(open("data/sanal_portfoy.json", encoding="utf-8")) if os.path.exists("data/sanal_portfoy.json") else []
    sonuclar = []
    for p in pf:
        if p.get("durum") == "KAPALI": continue
        sem = p.get("sembol", "")
        q = urllib.parse.quote(f"{sem} hisse BIST haber")
        url = f"https://google.com{q}&hl=tr&gl=TR&ceid=TR:tr"
        skor, basliklar = 0.0, []
        try:
            xml_data = urllib.request.urlopen(url, timeout=4).read()
            root = ET.fromstring(xml_data)
            for item in root.findall(".//item")[:4]:
                t = (item.findtext("title") or "").lower()
                basliklar.append(item.findtext("title") or "")
                for k in POZITIF_KELIMELER:
                    if k in t: skor += 0.25
                for k in NEGATIF_KELIMELER:
                    if k in t: skor -= 0.35
        except Exception:
            pass
        skor = round(max(-1.0, min(1.0, skor)), 2)
        durum = "HABER_VETO" if skor <= -0.45 else ("POZITIF_AKIS" if skor >= 0.20 else "NOTR_AKIS")
        sonuclar.append({"sembol": sem, "duygu_skoru": skor, "durum": durum, "son_baslik": basliklar[0] if basliklar else "Guncel haber yok"})
    rapor = {"zaman": datetime.now().strftime("%Y-%m-%d %H:%M:%S"), "haberler": sonuclar}
    json.dump(rapor, open("data/haber_duygu_raporu.json", "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    return rapor

if __name__ == "__main__":
    print("=== KAP & FINANSAL HABER DUYGU MOTORU ===")
    for h in hisse_haber_duygu_tara()["haberler"]:
        print(f"• {h['sembol']:<6} | Skor: {h['duygu_skoru']:+5.2f} | {h['durum']:<13} | {h['son_baslik'][:65]}")
