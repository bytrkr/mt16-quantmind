# bist-doğrula

"Bitirdim" demeden önce sıkı doğrulama yap: Qodi v6.1 Anayasasını tara (`grep ??`, `Math.random`, `throw`), testlerin geçtiğinden emin ol ve kullanıcıya kanıt sun.

---

### Ne Zaman Kullanılır
- Bir görevi, bug fix'i veya entegrasyonu tamamlandığını iddia etmeden hemen önce.
- Deployment veya sunucu yeniden başlatma öncesinde.

---

### Nasıl Yapılır
1. **Qodi v6.1 Grep Taraması**:
   - `grep -rnE "\?\?" <değişen_dosyalar>` -> 0 sonuç olmalı (fallback yok).
   - `grep -rn "Math.random" <değişen_dosyalar>` -> 0 sonuç olmalı (rastgele veri yok).
   - `grep -rn "throw" <değişen_dosyalar>` -> 0 sonuç olmalı (güvenli return).
2. **Derleme & Linter Kontrolü**:
   - Web / TS tarafında: `tsc --noEmit` veya `lint_applet` & `compile_applet` çalıştır. Sıfır hata olmalı.
   - Python tarafında: syntax ve import hataları kontrol edilmeli.
3. **Senaryo Doğrulama Testi**:
   - `ASELS 331.75 @ 180.000` -> `TABAN/DESTEK` mi?
   - `THYAO 312.50 @ 200.000` -> `TAVAN/DİRENÇ` mi?
   - VPIN toksik durumda `VETO_HOLD` veriyor mu?
4. **Kanıt Sun ve Dur**:
   - Kullanıcıya test ve tarama sonuçlarını net rakamlarla göster.
   - Onay almadan yeni bir adıma geçme, bitirince DUR.

---

### Kurallar
- Grep kontrolleri yapılmadan ve test çıktısı görülmeden "İşlem bitti" denmesi KESİNLİKLE YASAKTIR.
- Uyarı veya lint hatası varken görev tamamlandı sayılamaz.
- Doğrulama sonuçları şeffaf bir şekilde raporlanmalıdır.

---

### Kırmızı Bayraklar (Anti-Patterns)
- 🚩 "Kod yazdım, herhalde çalışıyordur" diyerek görevi teslim etmek.
- 🚩 Grep sonuçlarını kontrol etmeden `??` veya `Math.random` kaçırmak.
- 🚩 Hata varken sunucuyu kapatıp sessiz kalmak.
