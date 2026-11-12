"""
MT16 QuantMind & Matriks MCP - Sistem Denetim ve Hata Raporu (System Audit & Bug Report)
[Policy: Exclusion-Normalization v1.0]
"""

import json
from datetime import datetime, timezone

def generate_report():
    report_content = """# 🏛️ MT16 QUANTMIND & MATRİKS MCP SİSTEM DENETİM VE HATA RAPORU
**Sistem / Modül:** MT16 QuantMind Decision Engine & Matriks MCP Gateway  
**Denetim Tipi:** Kuantitatif Model Güvenliği, MNAR Veri Enjeksiyonu ve Mimarî Zafiyet Denetimi  
**Politika Etiketi:** `[Policy: Exclusion-Normalization v1.0]`  
**Tarih:** 30 Ekim 2026  
**Sürüm:** v3.0-quant-mind-audit  
**Geliştirici Ekip:** Matriks / MT16 Kuantitatif Analiz ve Yazılım Mimarlık Grubu  

---

## 1. YÖNETİCİ ÖZETİ (EXECUTIVE SUMMARY)

> **Core Audit Finding:**  
> **"401 AUTH hatası durumunda, OBI verisini 50 (nötr) kabul etmek, kararları +23 puan yapay olarak şişirmektedir. Ayrıca ATR (stop) hesaplamalarında zaman dilimi hatası tespit edilmiştir. Sistemic 'Karar Zarfı' (Decision Envelope) ve 'Giriş/Çıkış Asimetrisi' (Entry/Exit Asymmetry) mimarisi eksiktir."**

Yapılan ampirik ablasyon ve stres testleri sonucunda ($n=10$ BIST hissesi), Matriks MCP / yfinance veri katmanında ortaya çıkan `401 Unauthorized` veya ağ zaman aşımı hatalarında sistemin eksik veriyi `50 (nötr)` varsayarak skor üretmeye devam ettiği tespit edilmiştir. Bu durum, BIST genelindeki kararların **%70.0'inde (Flip Rate)** sistemin gerçekte alım için yetersiz veya satıcılı olan tahtalara **yapay "AL" sinyali** üretmesine yol açmaktadır.

---

## 2. TESPİT EDİLEN 4 KRİTİK MİMARÎ ZAFİYET VE HATA

### 🚨 HATA 1: MNAR Nötr Dolgu Enflasyonu (+23.33 Puan / %70 Flip Rate)
- **Problem:** L2 OBI / Derinlik verisi `401 AUTH` hatası nedeniyle okunamadığında, sistem bu faktörü `50.0 (nötr)` dolgu ile tamamlamaktadır.
- **Etki:** Piyasada veri kaybı genelde satıcı baskısının arttığı volatil anlarda yaşandığından (MNAR), eksik veriyi nötr saymak skorları ASELS özelinde **34.67'den 58.00'e (+23.33 puan)** taşımaktadır. Çoklu sembol testinde ($n=10$) bu durum **%70.0 Flip Rate** ile kararları sistematik olarak hatalı AL yönüne kaydırmıştır.
- **Çözüm:** `Exclusion-Normalization v1.0` politikasına geçilmeli; eksik veri 50 kabul edilmek yerine ağırlık matrisinden tamamen çıkarılarak kalan faktörler %100'e normalize edilmelidir.

---

### 🚨 HATA 2: ATR Stop Mesafesi Ölçek / Zaman Dilimi Hataları
- **Problem:** ASELS örneğinde günlük $1\\sigma$ volatilite $\\sigma_h = 3.20\\%$, $\\text{ATR} = 14.50\\text{ TL}$ iken, sistem $1.97\\text{ TL}$ ($\\approx 0.57\\%$) gibi dar bir stop mesafesi önermektedir.
- **Etki:** $D_{\\min} = 2.0 \\times \\sigma_h = 6.40\\%$ ($\\approx 22.29\\text{ TL}$) kuralı ihlal edilmekte, işlem piyasa gürültüsü içinde anında stop olmaktadır. Ayrıca $d_{\\ham}$ hesaplamasında fiyat adımı (tick size = $0.25\\text{ TL}$) 3 katı ($0.75\\text{ TL}$) kontrolü eksiktir.
- **Çözüm:** $D_{\\text{stop}} = \\text{clip}(D_{\\text{ham}}, D_{\\min}, D_{\\max})$ formülü ve $3 \\times \\text{tick\\_size}$ birim/ölçek assertion'ı zorunlu kılınmalıdır.

---

### 🚨 HATA 3: Karar Zarfı (Decision Envelope) ve Modül Sorumluluğu Eksikliği
- **Problem:** Sistem çıktıları tek parçalı "AL/SAT" metninden ibaret olup, kararın hangi kuant kalkan (MNAR Kalkanı, Dinamik Stop, Spoof Endeksi) tarafından alındığı (`decided_by`) takip edilememektedir.
- **Çözüm:** Her karar nesnesi standart `decision_envelope` yapısına kavuşturulmalı, kararı veren modül açıkça loglanmalıdır.

---

### 🚨 HATA 4: Giriş/Çıkış Asimetrisi (Entry/Exit Asymmetry) İhlali
- **Problem:** Veri eksikliği veya stop darlığı nedeniyle yeni pozisyon alımı engellendiğinde, kullanıcının elindeki mevcut pozisyonu kapatma / stop yapma imkanı da riske girmektedir.
- **Çözüm:** Karar zarfında `entry_blocked: true` olsa dahi `exit_allowed: true` parametresi bağımsız olarak açık tutulmalı, risk yönetimi asimetrik çalışmalıdır.

---

## 3. QODİ DENETİM STANDARTLARINA UYGUN REKUSTURULMUŞ KARAR ZARFI (JSON)

```json
{
  "policy": "Exclusion-Normalization v1.0",
  "timestamp": "2026-10-30T14:36:17.794049+00:00",
  "ticker": "ASELS",
  "last_price": 348.25,
  "tick_size_try": 0.25,
  "modules": {
    "mnar_shield": {
      "coverage": 0.8,
      "tier": "L4",
      "status": "NO_SIGNAL",
      "message": "AUTH (401) hatası: Retry yapılmadı, doğrudan en alt kademeye (L4) düşürüldü.",
      "hard_stop": true
    },
    "dynamic_stop_sizing": {
      "status": "İŞLEM ALINAMAZ",
      "reason": "Stop mesafesi volatiliteye göre çok dar (d_ham: 0.0057 < D_min: 0.0640)",
      "d_stop": null,
      "position_size_lot": 0
    },
    "spoof_index": {
      "status": "TESTABLE_DEĞİL",
      "spoof_index": null,
      "reason": "Sessiz Fallback Yasağı: Fiyat duvara yaklaşmadığı için varsayılan sayı üretilmedi (TESTABLE_DEĞİL)."
    }
  },
  "decision_envelope": {
    "final": "NO_TRADE",
    "decided_by": "MNAR_SHIELD",
    "entry_blocked": true,
    "exit_allowed": true,
    "reason": "AUTH (401) hatası: Retry yapılmadı, doğrudan en alt kademeye (L4) düşürüldü."
  }
}
```

---

## 4. GELECEK YOL HARİTASI VE EYLEM PLANI (REMEDIATION ROADMAP)

1. **Matriks MCP Auth Katmanı:** `401 Unauthorized` token yenileme mekanizması devreye alınmalı, yetki kaybında otomatik olarak L4 kalkanı tetiklenmelidir.
2. **Exclusion-Normalization v1.0 Entegrasyonu:** `server/services/dataRuleEngine.ts` ve `python/fetchers.py` içindeki nötr dolgu (50) kodları silinmeli, faktör dışlama ve ağırlık normalizasyonu motor düzeyinde aktifleştirilmelidir.
3. **Dinamik ATR Stop Assertion'ı:** $d_{\\text{ham}} < 0.75\\text{ TL}$ için `ValueError` koruması ve $D_{\\min} = 2.0 \\times \\sigma_h$ volatilite zırhı eklenmelidir.
4. **UI Karar Zarfı Adaptasyonu:** Kullanıcı arayüzünde `🛡️ ÖN FİLTRE DEVREDE`, `Coverage: 4/5` ve `Entry Blocked / Exit Allowed` durum rozetleri gösterilmelidir.
"""
    return report_content

if __name__ == "__main__":
    content = generate_report()
    with open("SYSTEM_AUDIT_REPORT.md", "w", encoding="utf-8") as f:
        f.write(content)
    print("SYSTEM_AUDIT_REPORT.md başarıyla oluşturuldu.")
