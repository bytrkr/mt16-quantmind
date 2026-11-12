# bist-böl

Büyük, karmaşık ve çok bileşenli işleri atomik, bağımsız ve küçük parçalara böl; tek seferde monolitik iş yapma.

---

### Ne Zaman Kullanılır
- 6-7 motoru birleştiren pipeline entegrasyonlarında.
- 1000+ satırlık büyük dosyalarda (ör. `TacticalCard.tsx`, `server/index.ts`) yapılacak modifikasyonlarda.
- Docker, backend ve frontend katmanlarının hepsini kapsayan geniş görevlerde.

---

### Nasıl Yapılır
1. **İş Kapsamını Parçala**:
   - Görevi bağımsız çalışabilen alt görevlere (sub-tasks) ayır:
     - Parça 1: Schema / Interface (Types)
     - Parça 2: Logic / Engine (Pure Function)
     - Parça 3: Express / FastAPI Route
     - Parça 4: React UI Component
2. **Sıralama Belirle**:
   - Bağımlılık ağacına göre en temelden (tiplerden) en tepeye (UI) doğru bir sıra kur.
3. **Her Parçayı Bağımsız Tamamla**:
   - Bir parçayı bitir, doğrula, sonra diğer parçaya geç.
4. **Entegrasyon Testi Yap**:
   - Parçalar birleştiğinde uçtan uca akışın çalıştığını test et.

---

### Kurallar
- Tek yanıtta tüm projeyi baştan aşağı yeniden yazmaya kalkışmak YASAKTIR.
- Her parça kendi içinde derlenebilir (compilable) durumda olmalıdır.
- Parçalara bölünen görevlerin durumu şeffaf şekilde takip edilmelidir.

---

### Kırmızı Bayraklar (Anti-Patterns)
- 🚩 "Hepsini tek seferde halledeyim" diyerek yüzlerce satırı birden kırıp geçirmek.
- 🚩 Modülerliği yok edip her şeyi tek dev fonksiyona gömmek.
- 🚩 Ara adımlarda derleme hatası varken üzerine yeni katmanlar eklemeye devam etmek.
