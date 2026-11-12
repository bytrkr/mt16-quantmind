# CONTEXT

MT16 Bistapp Proje Mimarisi, Veri Kısıtları ve Çalışma Çerçevesi.

---

### 1. Veri Kaynakları ve Kısıtlar
- **Matriks API Yok**: Sistemde ücretli doğrudan Matriks/Foreks veri akışı veya broker terminal lisansı bulunmamaktadır.
- **Yahoo Finance Gecikmeli**: Fiyat ve veri akışı Yahoo Finance (.IS uzantılı) proxy servisleri üzerinden gecikmeli olarak sağlanır. Canlıymış gibi davranılmamalı, gecikme hesaba katılmalıdır.
- **KAP Entegrasyonu**: Kamuyu Aydınlatma Platformu bildirimleri RSS daemon (`kapDaemon`) üzerinden taranır.

---

### 2. Borsa İstanbul (BIST) Mekanik Kuralları
- **Seans Saatleri**: `09:40 - 18:10` (Açılış seansı 09:40, sürekli işlem 10:00 - 18:00, kapanış marjı 18:01 - 18:10). Seans dışındaki işlemlerde BIST mekanik denetimi `SESSION_CLOSED` döner.
- **Günlük Marj**: Referans fiyata göre maksimum `±%10` tavan ve taban limiti geçerlidir.
- **Devre Kesici**: Referans fiyata göre `%6.0` sapma oluştuğunda devre kesici tetiklenir.

---

### 3. Qodi v6.1 Kuant Anayasası
- **0 Fallback**: Kod içinde `?? 50`, `|| 100`, `?? "BUY"` gibi yapay varsayılan değerler KESİNLİKLE YASAKTIR.
- **0 Math.random**: Asla simüle edilmiş veya rastgele sayı üretilemez.
- **0 Throw**: Çalışma zamanında arayüzü veya motoru çökertecek kontrolsüz `throw new Error()` yasaktır; güvenli `return null` veya hata nesnesi dönülür.
- **Dürüst Veri (VERİ YOK)**: Veri çekilemediyse veya null/eksik ise ekrana doğrudan **VERİ YOK** yazılır, uydurma veri gösterilmez.

---

### 4. Tek Karar Akışı (`/api/analyze/full`)
Sistemdeki tüm kararlar sıralı 7 P0 filtresinden geçer:
1. BIST Mekanik Kontrolü (Seans, Tavan/Taban, Devre Kesici)
2. VPIN Toksisite Kontrolü (>0.35 ise VETO_HOLD)
3. Position Sentinel Kontrolü (Tek hisse %20, Tek sektör %35, Günlük zarar %2)
4. Alpha Model Insight
5. Duvar (Wall) Tespiti (BistLimitBook)
6. Efficient Frontier Sepet Ağırlığı
7. Bütünleşik Karar Çıktısı (`PROCEED` veya `VETO_HOLD`)
