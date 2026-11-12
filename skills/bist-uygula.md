# bist-uygula

Onaylanmış planı disiplinli bir şekilde adım adım uygula; plandan sapma, adımları atlama ve her adımın doğrulanmasını bekle.

---

### Ne Zaman Kullanılır
- `bist-plan` ile hazırlanmış bir plan onaylandıktan hemen sonra.
- Sıralı dosya değişiklikleri veya aşamalı pipeline geliştirmeleri sırasında.

---

### Nasıl Yapılır
1. **Adımı Oku**: Plandaki sıradaki tek adımı odak noktası yap.
2. **Surgical Değişiklik Yap**:
   - Yalnızca o adımın gerektirdiği dosyayı/bloğu güncelle.
   - Planda olmayan "ekstra" şeyleri koda katma.
3. **Adımı Doğrula**:
   - Adım bittiğinde derleyiciyi çalıştır (`compile_applet` / test).
   - Adımın kabul kriterinin sağlandığından emin ol.
4. **Plan Üzerinde İşaretle**:
   - Bir sonraki adıma geçmeden önce adımı tamamlandı olarak not et.
5. **Sapma Varsa Dur**:
   - Eğer beklenmeyen bir durum planın geçersizleşmesine yol açarsa, KOD YAZMAYI DURDUR, planı revize et ve kullanıcıya sor.

---

### Kurallar
- Aynı anda birden fazla adımı karmaşık bir şekilde birbirine karıştırmak YASAKTIR.
- Planda yazmayan kütüphane veya paketler kafaya göre kurulamaz.
- Sıradaki adım bitmeden bir sonraki adıma geçilemez.

---

### Kırmızı Bayraklar (Anti-Patterns)
- 🚩 "Planı uyguluyorum" deyip tamamen farklı mimariye kaymak.
- 🚩 Adım adımlığı bırakıp tek devasa dosyada her şeyi değiştirmeye çalışmak.
- 🚩 Bir adım fail ettiği halde bir sonrakine devam etmek.
