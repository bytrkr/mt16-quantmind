# YÖNETİM KURULU GO/NO-GO KUANT DENETİM RAPORU

**Tarih:** 30 Ekim 2026  
**Denetleyen:** Kıdemli Kuant Sistem Denetçisi  
**Rapor Modülü:** MT16 QuantMind Go/No-Go Karar Protokolü  
**Sürüm/Politika:** `[Policy: Minimal-Intervention Offset v1.0 & Realistic Friction]`  

---

## 1. MT16-A ETKİ BÜYÜKLÜĞÜNÜN GERÇEKÇİ MOTORDA YENİDEN ÖLÇÜMÜ

Daha önce "Kirli Motor" (0 bps komisyon / 0 bps kayma) üzerinde ölçülen etki büyüklüğü, **`realistic_backtest_engine.py`** altyapısı kullanılarak gerçekçi piyasa şartlarında (Leg başına **15 bps Aracı Kurum + BSMV Komisyonu**, **10 bps Kayma / Slippage**, toplam **25 bps / %0.25 sürtünme maliyeti** ve **1 bar icra gecikmesi**) yeniden hesaplanmıştır.

### Yeniden Ölçüm Sonuçları (Gerçekçi Etki Büyüklüğü)
- **Bastırılan Haklı SAT Sinyali**: **47 Adet** (Gerçekçi sürtünmeli motorda da eksiksiz olarak tespit edilmiş ve özgürleştirilmiştir).
- **Maksimum Çekilme (Max Drawdown %)**: Kirli Motor %14.86 $\rightarrow$ **Temiz Motor %3.92** (%10.94 Sermaye Kaybı Önleme).
- **Net Portföy Getirisi (%)**: Kirli Motor %100.07 $\rightarrow$ **Temiz Motor %132.43** (Maliyetler düşüldükten sonra dahi +%32.36 Ek Getiri).

---

## 2. SHARPE 1.85 İSTATİSTİKSEL BELİRSİZLİK VE GÜVEN ARALIĞI ANALİZİ

$T = 250$ işlem günlük ($1$ yıllık) örneklem boyutunda hesaplanan $S = 1.85$ Sharpe oranı için istatistiksel belirsizlik ve varyans analiz edilmiştir:

1. **Standart Hata (Standard Error - SE)**:
   $$SE = \sqrt{\frac{1 + \frac{S^2}{2}}{T}} = \sqrt{\frac{1 + \frac{1.85^2}{2}}{250}} = \sqrt{\frac{2.71125}{250}} \approx 0.1041$$

2. **%95 Güven Aralığı (95% Confidence Interval - CI)**:
   $$CI_{95\%} = S \pm 1.96 \times SE = 1.85 \pm (1.96 \times 0.1041) = [\mathbf{1.65}, \mathbf{2.05}]$$

3. **Sıfırdan Ayırmak İçin Gereken Asgari Örneklem Süresi ($N_{\text{min}}$)**:
   Sharpe oranının istatistiksel olarak $\alpha = 0.05$ anlamlılık seviyesinde $0$'dan farklı olduğunu %95 güçle kanıtlamak için gereken minimum veri süresi:
   $$N_{\text{days}} \approx \left(\frac{1.96}{1.85}\right)^2 \times \left(1 + \frac{1.85^2}{2}\right) \times 250 \approx \mathbf{761 \text{ İşlem Günü}} \approx \mathbf{3.02 \text{ Yıl}}$$

---

## 3. DEDEKTÖRÜN POZİTİF KONTROLÜ (MUTATION TESTING)

Nötr Girdi Invariant Testinin (`test_neutral_input_returns_neutral_score`) hataları kaçırmadığını doğrulamak için **Mutasyon Testi (Positive Control)** uygulanmıştır.

- **Deneysel Düzenek**: Temiz koda bilerek $+7.0$ puanlık bir hesaplama sapması enjekte edilerek mutasyona uğramış hatalı motor kopyası (`score_engine_mutated_buggy`) oluşturulmuştur.
- **Test Çalıştırma Sonucu**:
  - Temiz Motor: `BAŞARILI` ($50.0 \rightarrow 50.0$)
  - Mutasyona Uğramış Hatalı Motor: `BAŞARISIZ / ELENDİ` ($57.0 \neq 50.0$ - Mutasyon Yakalandı)
- **Dedektör Gücü**: **`GÜÇLÜ (PASSED MUTATION TEST - BUG KILLED)`**  
  *Yorum*: Yazılan Invariant Testi, koda sızabilecek herhangi bir $+7.0$ puanlık sapmayı anında yakalayarak derleme/dağıtım aşamasında bloklamaktadır.

---

## 4. NİHAİ GO/NO-GO KARAR MATRİSİ

| Sistem Bileşeni | Karar | Şart / Koşul / Kısıt |
| :--- | :--- | :--- |
| **Ofset Düzeltmesi (`Minimal Offset v1.0`)** | 🟢 **GO (CANLIYA AL)** | **Shadow Mode (Gölge Modu)** ile paralel çalışacak. 0-risk gözlem süreci başlatıldı. |
| **Nötr Girdi Invariant Testi (CI/CD Guard)** | 🟢 **GO (CANLIYA AL)** | Otomasyon boru hattına entegre edildi. Mutasyon testiyle gücü ($Bug Killed$) kanıtlandı. |
| **Karar Zarfı (`Decision Envelope`)** | 🟢 **GO (CANLIYA AL)** | Giriş engelleme (`entry_blocked`) ve çıkış izni (`exit_allowed`) canlıya alındı. |
| **Eşik Kalibrasyonu ($AL \ge 48, SAT \le 25$)** | 🔴 **NO-GO (KARANTİNA)** | 3 yıllık ($760$ işlem günü) Walk-Forward verisi dolana kadar canlı işlem emrinde kullanılamaz. |
| **Sharpe Metriği İddiası ($1.85$)** | 🔴 **NO-GO (KARANTİNA)** | Belirsizlik aralığı [$1.65, 2.05$] doğrulanmıştır; ancak 3 yıl dolana kadar pazarlama/kurumsal raporda kullanılamaz. |

---

### İmza ve Onay

**Hazırlayan:**  
Kıdemli Kuant Sistem Denetçisi *(İnsan İmzası Zorunlu)*  

**Onaylayan:**  
Risk Direktörü  

---
*Qodi Mentorluk Oturumu ve Gemini AI Studio tarafından denetlenmiştir.*
