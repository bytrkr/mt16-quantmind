# bist-test

Test Güdümlü Geliştirme (TDD) kuralı: Kodu yazmadan önce testi yaz, testin başarısız olduğunu gör, sonra kodu yazıp testi geçir.

---

### Ne Zaman Kullanılır
- Yeni bir hesaplama motoru (ör. Duvar tespiti, VPIN, BIST Mekanik) eklendiğinde.
- Fiyat formülü veya yüzde marjı güncellendiğinde.
- Bir bug düzeltildikten sonra gerilemeyi (regression) önlemek için.

---

### Nasıl Yapılır
1. **Test Senaryosunu Tanımla**:
   - Girdi: Hangi hisse, fiyat, hacim veya emir derinliği?
   - Beklenen Çıktı: Hangi karar, etiket veya yüzde?
2. **Örnek Test Vakaları**:
   - **Vaka 1 (ASELS Taban Duvarı)**:
     - Girdi: `ASELS`, Fiyat: `331.75`, Alış kademesinde `180.000 lot` (ortalama kademe 5.000 lot).
     - Beklenen Çıktı: `TABAN/DESTEK`
   - **Vaka 2 (THYAO Tavan Duvarı)**:
     - Girdi: `THYAO`, Fiyat: `312.50`, Satış kademesinde `200.000 lot`.
     - Beklenen Çıktı: `TAVAN/DİRENÇ`
   - **Vaka 3 (BIST %10 Aşımı)**:
     - Girdi: Değişim `%15.0`.
     - Beklenen Çıktı: `VERİ YOK`
3. **Testi Çalıştır**:
   - Kodu yazmadan önce testin fail ettiğini gör.
4. **Minimal Kodu Yaz**:
   - Sadece testi geçirecek kadar temiz kod yaz.
5. **Yeşile Çevir**:
   - Testi çalıştırıp geçtiğini doğrula.

---

### Kurallar
- Test yazılmadan karmaşık matematiksel algoritma veya finansal karar motoru yazılamaz.
- Testlerde `Math.random` kullanılamaz; deterministik test verileri esastır.
- Uç durumlar (null fiyat, sıfır hacim, seans dışı) mutlaka test edilmelidir.

---

### Kırmızı Bayraklar (Anti-Patterns)
- 🚩 "Kod çalışıyor gibi duruyor, teste gerek yok" demek.
- 🚩 Testi kod bittikten sonra formalite icabı yazmak.
- 🚩 Sahte veya hep `true` dönen sahte test assertion'ları yazmak.
