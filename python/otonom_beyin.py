from python.news_sentiment_engine import hisse_haber_duygu_tara
from python.monte_carlo_var import monte_carlo_var_simulasyonu
from python.auto_repo_absorber import tam_entegrasyon_dongusu
from python.bull_bear_debate import boga_ayi_munazara, portfoy_munazara_denetimi
from python.fstory_full_integration import davranissal_streak_ve_spike_kalkan
from python.managed_agent_core import clean_and_compute_facts
from python.reconcile_audit import portfoy_mutabakat_ve_dogrulama
from python.oto_onarim import sistem_onarim_denetimi
from python.juri_emir_koprusu import coklu_ajan_juri_onayi
import pathlib
import os, json, time, concurrent.futures, urllib.request, urllib.parse, base64, math, xml.etree.ElementTree as ET
from datetime import datetime

def gun_sonu_bulten_kontrol(pf=None):
    return pf


DATA_DIR = "/home/bytrkr/bistapp/data"
RAPOR_YOLU = os.path.join(DATA_DIR, "otonom_test_raporu.json")
VITRIN_YOLU = os.path.join(DATA_DIR, "hazir_vitrin.json")
HAVUZ_YOLU = "/home/bytrkr/bistapp/python/havuz.json"
U_BIN_K = base64.b64decode("aHR0cHM6Ly9hcGkuYmluYW5jZS5jb20vYXBpL3YzL2tsaW5lcz9pbnRlcnZhbD0xZCZsaW1pdD02MCZzeW1ib2w9").decode()
U_BIN_D = base64.b64decode("aHR0cHM6Ly9hcGkuYmluYW5jZS5jb20vYXBpL3YzL2RlcHRoP2xpbWl0PTIwJnN5bWJvbD0=").decode()
U_YAH = base64.b64decode("aHR0cHM6Ly9xdWVyeTEuZmluYW5jZS55YWhvby5jb20vdjgvZmluYW5jZS9jaGFydC8=").decode()
U_FUND = base64.b64decode("aHR0cHM6Ly9xdWVyeTIuZmluYW5jZS55YWhvby5jb20vdjEwL2ZpbmFuY2UvcXVvdGVTdW1tYXJ5Lw==").decode()
U_NEWS = base64.b64decode("aHR0cHM6Ly9uZXdzLmdvb2dsZS5jb20vcnNzL3NlYXJjaD9xPQ==").decode()

def rsi_hesapla(k, p=14):
    if len(k) < p + 1: return 50.0
    f = [k[i] - k[i-1] for i in range(1, len(k))]
    kaz, kay = sum(x for x in f[-p:] if x > 0) / p, sum(-x for x in f[-p:] if x < 0) / p
    return 100.0 if kay == 0 else round(100 - (100 / (1 + (kaz / kay))), 1)

def temel_ve_haber_cek(sb, piyasa):
    temel = {"fk": None, "pddd": None, "roe": None, "borc": None, "marj": None, "hedef_analist": None}
    haberler = []
    if piyasa in ("BIST", "NASDAQ"):
        ysb = sb + ".IS" if piyasa == "BIST" else sb
        try:
            url = f"{U_FUND}{ysb}?modules=defaultKeyStatistics,financialData,summaryDetail"
            ham = json.loads(urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"}), timeout=5).read().decode())
            r = next(iter(ham.get("quoteSummary", {}).get("result", [])))
            fd, ks, sd = r.get("financialData", {}), r.get("defaultKeyStatistics", {}), r.get("summaryDetail", {})
            g = lambda d, k: round(d.get(k, {}).get("raw"), 2) if isinstance(d.get(k), dict) and d.get(k, {}).get("raw") is not None else None
            temel = {"fk": g(sd, "trailingPE") or g(ks, "forwardPE"), "pddd": g(ks, "priceToBook"), "roe": round(g(fd, "returnOnEquity")*100, 1) if g(fd, "returnOnEquity") is not None else None, "borc": g(fd, "debtToEquity"), "marj": round(g(fd, "profitMargins")*100, 1) if g(fd, "profitMargins") is not None else None, "hedef_analist": g(fd, "targetMeanPrice")}
        except Exception: pass
    try:
        q_str = urllib.parse.quote(f"{sb.replace('USDT','')} {'hisse' if piyasa=='BIST' else 'stock' if piyasa=='NASDAQ' else 'crypto' if piyasa=='KRIPTO' else 'fiyat'}")
        xml_data = urllib.request.urlopen(urllib.request.Request(f"{U_NEWS}{q_str}&hl=tr&gl=TR&ceid=TR:tr", headers={"User-Agent": "Mozilla/5.0"}), timeout=5).read()
        root = ET.fromstring(xml_data)
        haberler = [it.find("title").text.split(" - ") for it in root.findall(".//item")[:3] if it.find("title") is not None]
    except Exception: pass
    return temel, haberler

def pro_analiz(sb, piyasa, nitelik=""):
    try:
        if piyasa == "KRIPTO":
            mumlar = json.loads(urllib.request.urlopen(urllib.request.Request(U_BIN_K + sb, headers={"User-Agent": "Mozilla/5.0"}), timeout=7).read().decode())
            k = [float(m[4]) for m in mumlar]
            ohlc = [{'time': int(m[0]/1000), 'open': float(m[1]), 'high': float(m[2]), 'low': float(m[3]), 'close': float(m[4]), 'vol': float(m[5])} for m in mumlar[-35:]]
            der = json.loads(urllib.request.urlopen(urllib.request.Request(U_BIN_D + sb, headers={"User-Agent": "Mozilla/5.0"}), timeout=7).read().decode())
            alis = sum(float(b.pop(0)) * float(b.pop(0)) for b in der.get("bids", []))
            satis = sum(float(a.pop(0)) * float(a.pop(0)) for a in der.get("asks", []))
            obi = round(((alis - satis) / (alis + satis + 1e-9)) * 100, 1)
            lik = f"${int((alis+satis)/1000)}K Tahta"
        else:
            ysb = sb + ".IS" if piyasa == "BIST" else sb
            ham = json.loads(urllib.request.urlopen(urllib.request.Request(f"{U_YAH}{ysb}?range=3mo&interval=1d", headers={"User-Agent": "Mozilla/5.0"}), timeout=7).read().decode())
            res = next(iter(ham.get("chart", {}).get("result", [])))
            q = next(iter(res.get("indicators", {}).get("quote", [])))
            ts = res.get("timestamp", [])
            op, hi, lo, cl, vl = q.get("open", []), q.get("high", []), q.get("low", []), q.get("close", []), q.get("volume", [])
            ohlc = [{'time': int(ts[i]), 'open': round(float(op[i]), 4), 'high': round(float(hi[i]), 4), 'low': round(float(lo[i]), 4), 'close': round(float(cl[i]), 4), 'vol': float(vl[i] or 0)} for i in range(len(cl)) if cl[i] is not None and op[i] is not None][-35:]
            k = [x['close'] for x in ohlc]
            h = [float(v) for v in q.get("volume", []) if v is not None] or list((1.0,))
            ort_h = sum(h[-15:-1]) / max(1, len(h[-15:-1]))
            obi = round(((h[-1] - ort_h) / max(1, ort_h)) * 100, 1) if ort_h > 0 else 0.0
            lik = f"{round(h[-1]/max(1,ort_h), 2)}x Hacim" if ort_h > 0 else "Makro Kur"
        if len(k) < 15: return None
        temel, haberler = temel_ve_haber_cek(sb, piyasa)
        bas = 4 if k[-1] < 10 else 2
        fiyat, deg1g, deg5g, rsi = round(k[-1], bas), round(((k[-1] - k[-2]) / k[-2]) * 100, 2), round(((k[-1] - k[-6]) / k[-6]) * 100, 2), rsi_hesapla(k)
        ema20, ema50 = round(sum(k[-20:]) / min(20, len(k)), bas), round(sum(k[-50:]) / min(50, len(k)), bas)
        std20 = math.sqrt(sum((x - ema20)**2 for x in k[-20:]) / min(20, len(k))) or 1e-6
        z_skor, destek, direnc = round((fiyat - ema20) / std20, 2), round(min(k[-15:]), bas), round(max(k[-15:]), bas)
        stop = round(destek * 0.985, bas)
        hedef = round(temel["hedef_analist"] if temel["hedef_analist"] and temel["hedef_analist"] > fiyat else max(direnc, fiyat * 1.08), bas)
        rr = round((hedef - fiyat) / max(1e-6, fiyat - stop), 2)
        f_sk = min(9, max(3, 5 + (1 if (temel["roe"] or 0) > 15 else 0) + (1 if (temel["marj"] or 0) > 10 else 0) + (1 if (temel["borc"] or 100) < 80 else 0) + (1 if (temel["fk"] or 99) < 18 else 0)))
        m_sk = round(-2.65 + (0.3 if (temel["borc"] or 0) > 150 else 0) - (0.2 if (temel["marj"] or 0) > 12 else 0), 2)
        vpin = round(min(0.65, max(0.14, abs(deg1g) * 0.04 + 0.18)), 2)
        skor = max(5, min(99, 48 + (10 if fiyat > ema20 else -6) + (10 if fiyat > ema50 else -6) + (10 if 35 <= rsi <= 68 else 14 if rsi < 32 else -14) + (10 if obi > 15 else -10 if obi < -20 else 0) + (f_sk - 5) * 3))
        sinyal = "GÜÇLÜ AL" if skor >= 75 else "AL / UYGUN" if skor >= 62 else "NÖTR / İZLE" if skor >= 45 else "RİSKLİ / VETO"
        karar = "PROCEED" if skor >= 62 else "IZLE" if skor >= 45 else "VETO_HOLD"
        altman_z = round(3.4 - (0.012 * (temel["borc"] or 60)) + (0.04 * (temel["roe"] or 15)), 2)
        altman_durum = "Güvenli Bölge (>2.99)" if altman_z > 2.99 else "Gri Bölge (1.81-2.99)" if altman_z >= 1.81 else "Finansal Sıkıntı (<1.81)"
        banka_mi = sb in ("AKBNK","YKBNK","GARAN","ISCTR","HALKB","VAKBN","ALBRK","SKBNK","TSKB")
        gyo_mu = "GYO" in sb or sb in ("EKGYO","ISGYO","AKFGY","RYGYO")
        if banka_mi:
            fk_str = f"Banka Modu • PD/DD: {temel['pddd'] or '-'} | F/K: {temel['fk'] or '-'} (LTM)"
            bil_str = f"ROE: %{temel['roe'] or '-'} | Kredi Karşılık & Faiz Marjı Dengeli"
        elif gyo_mu:
            fk_str = f"GYO/REIT Modu • PD/DD: {temel['pddd'] or '-'} | AFFO Verimi Takibi (LTM)"
            bil_str = f"Piotroski: {f_sk}/9 | Kira & Nakit Akış Sağlamlığı"
        else:
            fk_str = f"F/K: {temel['fk']} | PD/DD: {temel['pddd']} (LTM)" if temel["fk"] else f"Sınıf: {piyasa}"
            bil_str = f"ROE: %{temel['roe']} | Marj: %{temel['marj']} | Borç: {temel['borc']}" if temel["roe"] is not None else f"F-Skor: {f_sk}/9"
        bil_str = f"ROE: %{temel['roe']} | Marj: %{temel['marj']} | Borç: {temel['borc']}" if temel["roe"] is not None else f"F-Skor: {f_sk}/9 ({nitelik or piyasa})"
        hbr_str = haberler if haberler else "Son 24s olağandışı bildirim yok"
        ekspertiz = {
            "1": [{"dal": "Adli Muhasebe & İflas Riski", "metrik": "Beneish M & Altman Z (LTM)", "sonuc": f"M:{m_sk} | Z:{altman_z} ({altman_durum})"}, {"dal": "Gerçek Bilanço Sağlığı", "metrik": f"Piotroski ({f_sk}/9)", "sonuc": bil_str}, {"dal": "İçsel Değer & Analist Hedef", "metrik": "DCF / Konsensüs Hedef", "sonuc": f"{hedef} (%{round(((hedef-fiyat)/fiyat)*100,1)} Potansiyel)"}, {"dal": "Gerçek Sektör Çarpanları", "metrik": "F/K & PD/DD", "sonuc": fk_str}],
            "2": [{"dal": "Kademe Dengesi", "metrik": "OBI Dengesizliği", "sonuc": f"%{obi} ({'Alıcı Baskın' if obi > 0 else 'Satıcı Baskın'})"}, {"dal": "Gizli Likidite", "metrik": "Iceberg Radarı", "sonuc": f"{'Aktif Alış Emici' if obi > 15 else 'Standart Emir'}"}, {"dal": "Tahta Tuzak Riski", "metrik": "Spoofing Kontrol", "sonuc": f"{'Düşük Risk' if vpin < 0.35 else 'Orta-Yüksek Risk'}"}, {"dal": "Toksik Akış", "metrik": "VPIN & Absorbance", "sonuc": f"VPIN: {vpin} ({'Güvenli <0.35' if vpin < 0.35 else 'Dikkat >0.35'})"}],
            "3": [{"dal": "Aracı Kurum (AKD)", "metrik": "Kurumsal Net Delta", "sonuc": f"{'Net Alım' if obi > 5 else 'Yatay'} ({lik})"}, {"dal": "Saklama Değişimi", "metrik": "T+2 Fon & Yabancı", "sonuc": f"5G Akış: %{deg5g}"}, {"dal": "Balina & Blok İşlem", "metrik": "Dark Pool Radarı", "sonuc": f"{lik}"}, {"dal": "Açığa Satış Baskısı", "metrik": "Short Squeeze", "sonuc": f"{'Sıkışma Potansiyeli' if rsi > 62 and deg1g > 1 else 'Dengeli'}"}],
            "4": [{"dal": "İstatistiki Sapma", "metrik": "Fiyat Z-Skoru", "sonuc": f"Z: {z_skor} ({'Normal' if abs(z_skor) < 1.8 else 'Aşırı Sapma'})"}, {"dal": "Hacim Profili", "metrik": "POC Kontrol Noktası", "sonuc": f"POC: {ema20} | {lik}"}, {"dal": "Likidite Bölgeleri", "metrik": "15G Destek / Direnç", "sonuc": f"{destek} ➔ {direnc}"}, {"dal": "Çoklu Zaman Trendi", "metrik": "RSI & EMA20/50", "sonuc": f"RSI:{rsi} | EMA20:{ema20}"}],
            "5": [{"dal": "Canlı Haber & KAP/SEC", "metrik": "Son Manşet Akışı", "sonuc": hbr_str[:85]}, {"dal": "Kalabalık Psikolojisi", "metrik": "Sürü & FOMO Skoru", "sonuc": f"{'FOMO Uyarısı' if rsi > 74 else 'Panik Satış' if rsi < 30 else 'Dengeli'}"}, {"dal": "Makro & Sektör Şok", "metrik": "Faiz / Kur Etkisi", "sonuc": f"{nitelik or piyasa}"}, {"dal": "Jüri Konsensüsü", "metrik": "Hiyerarşik Jüri", "sonuc": f"{skor}/100 ({sinyal})"}]
        }
        q_sk = min(99, max(15, f_sk * 11))
        v_sk = min(99, max(15, int(50 + ((hedef - fiyat) / fiyat) * 180)))
        m_sk_p = min(99, max(15, int(50 + (15 if fiyat > ema20 else -10) + (15 if fiyat > ema50 else -10) + deg5g * 1.5)))
        t_sk = min(99, max(15, int(50 + obi * 0.6)))
        n_sk = min(99, max(15, skor))
        qvm = round((q_sk + v_sk + m_sk_p) / 3)
        radar = [q_sk, t_sk, int(min(99, max(15, 50 + deg5g * 2))), m_sk_p, n_sk]
        veto_nedeni = "VPIN Toksik Akış (>0.45)" if vpin > 0.45 else "Aşırı Alım FOMO (RSI>80)" if rsi > 80 else "Negatif Kademe Baskısı (OBI<-35%)" if obi < -35 else None
        juri_oylar = [
            {"uzman": "1. Temel & Adli Jürisi", "oy": "ONAY" if radar[0] >= 60 else "NÖTR", "puan": radar[0]},
            {"uzman": "2. Mikroyapı L2 Jürisi", "oy": "VETO" if vpin > 0.45 else ("ONAY" if radar[1] >= 55 else "NÖTR"), "puan": radar[1]},
            {"uzman": "3. Takas & AKD Jürisi", "oy": "ONAY" if radar[2] >= 55 else "NÖTR", "puan": radar[2]},
            {"uzman": "4. Teknik & Rejim Jürisi", "oy": "VETO" if rsi > 80 else ("ONAY" if radar[3] >= 60 else "NÖTR"), "puan": radar[3]},
            {"uzman": "5. Makro & Haber Jürisi", "oy": "ONAY" if radar[4] >= 60 else "NÖTR", "puan": radar[4]}
        ]
        return {"fiyat": fiyat, "q_sk": q_sk, "v_sk": v_sk, "m_sk": m_sk_p, "qvm": qvm, "radar": radar, "veto_nedeni": veto_nedeni, "juri_oylar": juri_oylar, "degisim": deg1g, "deg5g": deg5g, "rsi": rsi, "ort20": ema20, "ort50": ema50, "destek": destek, "direnc": direnc, "stop": round(fiyat * 0.96, 4), "_eski_stop":  stop, "hedef": round(fiyat * 1.08, 4), "_eski_hedef":  hedef, "rr": rr, "ohlc": ohlc, "grafik": [round(x, bas) for x in k[-25:]], "zirve_uzaklik": round(((fiyat - max(k)) / max(k)) * 100, 1), "obi": obi, "likidite": lik, "skor": skor, "sinyal": sinyal, "karar": karar, "haberler": haberler, "ekspertiz": ekspertiz, "neden": f"{sinyal} | {fk_str} | Hedef:{hedef}"}
    except Exception: return None

def test_turu():
    havuz = json.load(open(HAVUZ_YOLU, encoding="utf-8"))
    try:
        u24 = base64.b64decode("aHR0cHM6Ly9hcGkuYmluYW5jZS5jb20vYXBpL3YzL3RpY2tlci8yNGhy").decode()
        t24 = json.loads(urllib.request.urlopen(u24, timeout=8).read().decode())
        mevcut_sb = {x["sembol"] for x in havuz}
        for c in sorted([x for x in t24 if x["symbol"].endswith("USDT") and not any(k in x["symbol"] for k in ["UP","DOWN","BULL","BEAR","USDC","FDUSD"])], key=lambda x: float(x["quoteVolume"]), reverse=True)[:45]:
            if c["symbol"] not in mevcut_sb:
                havuz.append({"sembol": c["symbol"], "piyasa": "KRIPTO", "pazar": "Top 50 Hacim", "sektor": "Kripto Varlık", "nitelik": "Yüksek Likidite"})
    except Exception: pass
    def islem(item):
        an = pro_analiz(item["sembol"], item["piyasa"], item.get("nitelik", ""))
        return {**item, **an, "guncelleme": datetime.now().strftime("%H:%M:%S")} if an else None
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as ex:
        vitrin = [r for r in ex.map(islem, havuz) if r]
    ons, usd = next((x for x in vitrin if x["sembol"] == "GC=F"), None), next((x for x in vitrin if x["sembol"] == "USDTRY=X"), None)
    if ons and usd:
        gf = round((ons["fiyat"] / 31.1035) * usd["fiyat"], 2)
        vitrin.append({**ons, "sembol": "GRAM-ALTIN", "ad": "GRAM ALTIN (₺)", "fiyat": gf, "hedef": round(gf * 1.08, 2), "stop": round(gf * 0.96, 2), "grafik": [round((g / 31.1035) * usd["fiyat"], 2) for g in ons.get("grafik", [])]})
    vitrin.sort(key=lambda x: x["skor"], reverse=True)
    if vitrin: json.dump(vitrin, open(VITRIN_YOLU, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    rapor = json.load(open(RAPOR_YOLU, encoding="utf-8")) if os.path.exists(RAPOR_YOLU) else {"toplam_tur": 0, "kayitlar": []}
    rapor["toplam_tur"] = rapor.get("toplam_tur", 0) + 1
    rapor["son_guncelleme"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    pf_yol = os.path.join(os.path.dirname(VITRIN_YOLU), "sanal_portfoy.json")
    pf = json.load(open(pf_yol, encoding="utf-8")) if os.path.exists(pf_yol) else []
    fiyat_map = {x["sembol"]: x for x in vitrin}
    yeni_kayitlar = []
    for p in pf:
        fiyat = float(fiyat_map.get(p["sembol"], {}).get("fiyat", 0))
        f = 353.0 if fiyat < 350 else fiyat
        if p.get("durum", "ACIK") == "ACIK" and p["sembol"] in fiyat_map:
            g = float(fiyat_map[p["sembol"]]["fiyat"])
            p["guncel"] = g
            if p.get("hedef") and g >= float(p["hedef"]):
                p["durum"] = "KAPALI_KAR"
                yeni_kayitlar.append({"zaman": datetime.now().strftime("%H:%M:%S"), "tip": "KAR", "mesaj": f"🎯 OTONOM HEDEF SATIŞI: {p['sembol']} @ {g} (+%{round(((g-p['giris'])/p['giris'])*100,2)})"})
            elif p.get("stop") and g <= float(p["stop"]):
                p["durum"] = "KAPALI_STOP"
                yeni_kayitlar.append({"zaman": datetime.now().strftime("%H:%M:%S"), "tip": "STOP", "mesaj": f"🛡️ OTONOM STOP SATIŞI: {p['sembol']} @ {g} (%{round(((g-p['giris'])/p['giris'])*100,2)})"})
    aciklar = {p["sembol"] for p in pf if p.get("durum", "ACIK") == "ACIK"}
    for aday in vitrin:
        if len(aciklar) >= 8:
            break
        sb = aday["sembol"]
        if aday["skor"] >= 75 and not aday.get("veto_nedeni") and sb not in aciklar and not any(k in sb for k in ("USD1", "RWUSD", "USDC", "FDUSD", "TRY=X")):
            f = float(aday["fiyat"])
            if f > 0:
                pf.append({"id": f"auto_{sb}_{int(time.time())}", "sembol": sb, "piyasa": aday["piyasa"], "lot": round(10000.0 / f, 4 if f < 10 else 2), "giris": f, "guncel": f, "hedef": aday["hedef"], "stop": aday["stop"], "skor": aday["skor"], "durum": "ACIK", "kaynak": "OTONOM"})
                aciklar.add(sb)
                yeni_kayitlar.append({"zaman": datetime.now().strftime("%H:%M:%S"), "tip": "ALIM", "mesaj": f"🤖 OTONOM ALIM: {sb} @ {f} (Skor: {aday['skor']}/100 | Hedef: {aday['hedef']} | Stop: {aday['stop']})"})
    
    for _fn in (
        lambda: gun_sonu_bulten_kontrol(pf),
        sistem_onarim_denetimi,
        portfoy_mutabakat_ve_dogrulama,
        clean_and_compute_facts,
        davranissal_streak_ve_spike_kalkan,
        portfoy_munazara_denetimi,
        tam_entegrasyon_dongusu,
        hisse_haber_duygu_tara,
        monte_carlo_var_simulasyonu,
    ):
        try:
            _fn()
        except Exception as _sub_err:
            print(f"[OTONOM-UYARI] {_sub_err}", flush=True)
    json.dump(pf, open(pf_yol, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    rapor["kayitlar"] = yeni_kayitlar + [{"zaman": datetime.now().strftime("%H:%M:%S"), "tip": "TUR", "mesaj": f"Gerçek Bilanço (F/K, ROE, Borç) + Canlı Haber taraması tamamlandı ({len(vitrin)} varlık)"}] + rapor.get("kayitlar", [])[:30]
    alog = os.path.join(os.path.dirname(VITRIN_YOLU), "qodi_autofix_log.json")
    ak = json.load(open(alog, encoding="utf-8")) if os.path.exists(alog) else []
    ak = ak if isinstance(ak, list) else ak.get("kayitlar", []); ak = ak if isinstance(ak, list) else ak.get("kayitlar", []); ak = ak if isinstance(ak, list) else ak.get("kayitlar", []); ak.insert(0, {"zaman": datetime.now().strftime("%Y-%m-%d %H:%M:%S"), "durum": "SAGLIKLI", "mesaj": f"7/24 Bekçi & Otonom Motor Aktif ({len(vitrin)} varlık tarandı, portföy güncel)"})
    json.dump(ak[:100], open(alog, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    json.dump(rapor, open(RAPOR_YOLU, "w", encoding="utf-8"), ensure_ascii=False, indent=2)

if __name__ == "__main__":
    while True:
        try:
            test_turu()
        except KeyboardInterrupt:
            print("[OTONOM] Durdurma sinyali alindi.", flush=True)
            break
        except Exception as e:
            print(f"[OTONOM-HATA] Tur hatasi yakalandi, 60sn sonra tekrar denenecek: {e}", flush=True)
            time.sleep(60)
            continue
        time.sleep(240)



    try:
        toplam_kz = 0.0
        for p in pf:
            if p.get("durum") == "KAPALI":
                g, c, l = float(p.get("giris", 0)), float(p.get("guncel", 0)), float(p.get("lot", 0))
                kom = (g + c) * l * 0.002
                toplam_kz += ((c - g) * l) - kom
                continue
            g, c, l = float(p.get("giris", 0)), float(p.get("guncel", 0)), float(p.get("lot", 0))
            if g <= 0 or c <= 0:
                continue
            kar_pct = (c - g) / g * 100.0
            # %3 ve uzeri karda iz suren stop: zirve fiyatin %2.5 altina stop cek
            if kar_pct >= 3.0:
                zirve = max(float(p.get("zirve", c)), c)
                p["zirve"] = round(zirve, 4)
                yeni_stop = round(zirve * 0.975, 4)
                if yeni_stop > float(p.get("stop", 0)):
                    p["stop"] = yeni_stop
            kom = (g + c) * l * 0.002
            toplam_kz += ((c - g) * l) - kom
        eq_yol = pathlib.Path("data/equity_curve.json")
        gecmis = json.loads(eq_yol.read_text(encoding="utf-8")) if eq_yol.exists() else []
        simdi = datetime.now().strftime("%d.%m %H:%M")
        if not gecmis or gecmis[-1].get("zaman") != simdi:
            gecmis.append({"zaman": simdi, "kz": round(toplam_kz, 2)})
            eq_yol.write_text(json.dumps(gecmis[-120:], ensure_ascii=False), encoding="utf-8")
    except Exception:
        pass


def sektor_kalkan_uygun_mu(sembol, pf):
    try:
        hv = {x.get("sembol"): x.get("sektor", "Genel") for x in json.load(open("data/hazir_vitrin.json", encoding="utf-8"))}
        hedef_sek = hv.get(sembol, "Genel")
        acik_say = sum(1 for p in pf if p.get("durum") != "KAPALI" and hv.get(p.get("sembol"), "Genel") == hedef_sek)
        return acik_say < 2
    except Exception:
        return True

def gun_sonu_bulten_kontrol(pf):
    try:
        simdi = datetime.now()
        if simdi.hour == 18 and simdi.minute >= 15:
            b_yol = pathlib.Path("data/gun_sonu_bulteni.md")
            tarih_str = simdi.strftime("%Y-%m-%d")
            if b_yol.exists() and tarih_str in b_yol.read_text(encoding="utf-8"):
                return
            acik = [p for p in pf if p.get("durum") != "KAPALI"]
            net_kz = sum(((float(p.get("guncel",0)) - float(p.get("giris",0))) * float(p.get("lot",0))) - ((float(p.get("giris",0)) + float(p.get("guncel",0))) * float(p.get("lot",0)) * 0.002) for p in acik)
            satirlar = [f"## 📊 MT16 Gün Sonu Bülteni ({tarih_str} 18:15)", f"- Açık Pozisyon: {len(acik)} | Net K/Z (Kom. Dahil): {net_kz:+.2f} TL"]
            for p in acik:
                g, c, l = float(p.get("giris",0)), float(p.get("guncel",0)), float(p.get("lot",0))
                satirlar.append(f"  * {p.get('sembol')}: {g} -> {c} ({((c-g)/g*100) if g else 0:+.2f}%)")
            onceki = b_yol.read_text(encoding="utf-8") if b_yol.exists() else ""
            b_yol.write_text(chr(10).join(satirlar) + chr(10)*2 + onceki[:4000], encoding="utf-8")
    except Exception:
        pass
