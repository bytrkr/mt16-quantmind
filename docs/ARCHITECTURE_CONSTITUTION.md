# MT16 QuantMind - Mimari Anayasa ve Geliştirme Doktrini
**Sürüm:** 1.0.0  
**Tarih:** 2026  
**Sistem:** MT16 QuantMind (BIST, NASDAQ, CRYPTO)

---

## 🏛️ 4 Anayasal Kural

### 1. SSOT (Tek Doğruluk Kaynağı - Single Source of Truth)
- Tüm piyasa verileri, fiyatlar, OBI (Order Book Imbalance), Z-Score ve risk parametreleri **yalnızca tek bir doğruluk kaynağından** (`Python FastAPI Backend` veya `marketGateway` canlı doğrulanmış servis katmanı) akar.
- Hiçbir UI bileşeni, ajan veya hook bağımsız olarak yerel statik dosyalardan uydurma veri üretemez veya doğrudan manipüle edemez.

### 2. Katmanlı Sorumluluk (Hesaplama ve Sunum Ayrımı)
- UI (React Bileşenleri) **asla finansal matematik veya türetilmiş hesaplama** (örn: `fiyat * 1.02` ile hedef belirleme, manuel Z-Score çıkarma) yapamaz.
- Tüm finansal hesaplamalar, Kelly optimizasyonları, VaR/CVaR ve kural kontrolleri `utils`, `services` veya `Python Backend` katmanında gerçekleştirilir. UI yalnızca hazır ve sunuma uygun veriyi ekrana basar.

### 3. "Bilinmeyen ≠ Nötr" (Fallback Yasası)
- API'den veya backend'den veri gelmediğinde (null/undefined durumlarında) sistem **kesinlikle sahte varsayılan değerler** (örneğin `$100.00`, `50.00`, `0.000` OBI vb.) üretemez (`|| 100` yasağı).
- Veri yoksa veya canlı doğrulama başarısızsa (`isLiveVerified === false`), ilgili alan `null` döner. UI tarafında ise açıkça **"İŞLEM DURDURULDU (VERİ YOK)"** veya **"VERİ YOK / BEKLE"** uyarısı gösterilir.

### 4. Giriş/Çıkış Asimetrisi (Entry/Exit Asymmetry)
- Piyasa verisi eksik olduğunda, `DataRuleEngine` kural ihlali tespit ettiğinde veya `Alpaca Realtime Guard` sahte veri bayrağı çektiğinde **yeni pozisyon açılışı (ENTRY) kesinlikle engellenir (`entry_blocked: true`)**.
- Ancak risk yönetimi ve sermaye koruması esası gereğince, **mevcut pozisyonlardan çıkış (EXIT) her zaman serbesttir (`exit_allowed: true`)**.

---

## 🔄 3 Geliştirme Döngüsü

### 1. Harita Güdümlü Geliştirme (Map-Driven Development)
- Her yeni özellik veya sistem değişikliğinde öncelikle `ArchitectureMap` (Mimari Harita) gözden geçirilir.
- Kod geliştirmesi yapıldıktan sonra sistem mimari haritasındaki veri akışı, SSOT uyumluluğu ve kural durum paneli güncellenir.

### 2. İzolasyon ve Test Döngüsü (Isolation & Validation Cycle)
- Yeni eklenen servisler, guard'lar veya karar motorları önce izole olarak (birim/entegrasyon testi düzeyinde) test edilir.
- Canlı piyasa akışına dahil edilmeden önce `isLiveVerified` ve `Qodi Decision Envelope` doğrulamasından geçirilir.

### 3. Hata Ayıklama ve Kök Neden Tespiti (Debug & Root Cause Cycle)
- Hata veya uyumsuzluk durumunda (örneğin beklenmeyen fiyat gösterimi) geçici yamalar (`fallback` değer ataması) yapılmaz.
- Hatanın kaynağı veri zincirinde (Dış API -> Python Backend -> Gateway -> Hook -> UI) adım adım takip edilerek kök neden ortadan kaldırılır.

---

## 🛡️ Varlık Sınıflarına Göre Veri Doğrulama
- **BIST:** Matriks MCP, SPK V-104.1 düzenlemeleri, BofA AKD, TCMB ve KAP verileri ile desteklenir.
- **NASDAQ:** Alpaca Historical/Realtime API, SEC 13F ve FOMC makro göstergeleri ile doğrulanır.
- **CRYPTO:** On-Chain likidasyon, balina hareketleri ve Binance / Alpaca Crypto Data Client ile denetlenir.
