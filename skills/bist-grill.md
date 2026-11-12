# bist-grill

Kod yazmadan önce kullanıcıyı sorgula, gereksinimleri netleştir, kullanıcı onayı almadan asla kod yazmaya başlama.

---

### Ne Zaman Kullanılır
- Kullanıcı yeni bir özellik, analiz metriği, filtre veya sayfa talep ettiğinde.
- İsteğin kapsamı, veri kaynağı veya hesaplama mantığı belirsiz olduğunda.
- Mevcut çalışan akışları değiştirebilecek kritik kararlar öncesinde.

---

### Nasıl Yapılır
1. **İsteği Ayrıştır**: Kullanıcının tam olarak ne istediğini listele (hangi hisse, hangi pazar, hangi metrik).
2. **Kısıtları Çapraz Kontrol Et**:
   - Matriks var mı? (Yok, Yahoo gecikmeli)
   - Tavan/Taban kurallarına uyuyor mu? (±%10)
   - Qodi v6.1 kuralları (0 fallback, 0 Math.random, 0 throw) sağlanıyor mu?
3. **Net Sorular Sor**:
   - Veri kaynağı nedir?
   - Hedeflenen eşik değerler nelerdir?
   - Veri bulunamazsa `VERİ YOK` durumu nasıl ele alınacak?
4. **Onay Al**: Kullanıcı "Onaylıyorum" veya "Evet" demeden koda tek bir satır dahi yazma.

---

### Kurallar
- Kullanıcıya sormadan varsayımda bulunarak kod yazmak YASAKTIR.
- Yeni bir API veya kütüphane eklemeden önce kullanıcıya danışılmalıdır.
- Soru sorarken seçenekleri kısa ve net tut.

---

### Kırmızı Bayraklar (Anti-Patterns)
- 🚩 "Muhtemelen kullanıcı bunu demek istemiştir" diyerek doğrudan koda dalmak.
- 🚩 Veri kaynağı belli olmadan rastgele mock veri oluşturmak.
- 🚩 Onay almadan dosya düzenleyip "yaptım bitti" demek.
