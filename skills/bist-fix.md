# bist-fix

Hataları (bug) sistemli ve metodik olarak çöz. Tahminle hareket etme, önce hatayı tekrarla ve kök nedeni izole et, sonra cerrahi müdahale yap.

---

### Ne Zaman Kullanılır
- Bir runtime hatası, derleme hatası veya Docker konteyner çökmesi olduğunda.
- Kullanıcı ekrandaki bir verinin yanlış olduğunu bildirdiğinde (ör. -%17 tavan adayı hatası).
- API uç noktaları beklenen JSON şeması yerine 500/null döndürdüğünde.

---

### Nasıl Yapılır
1. **Hatayı Tekrarla (Reproduce)**:
   - İlgili logları, trace'leri veya test betiklerini çalıştırarak hatanın tam olarak nerede patladığını gör.
2. **Kök Nedeni Bul (Root Cause Analysis)**:
   - Tahmin yürütme; dosyanın ilgili satırlarını oku.
   - Hatayı tetikleyen girdi kombinasyonunu tespit et.
3. **Surgical Düzeltme**:
   - Yalnızca hatalı mantığı düzelt.
   - Asla alakasız çalışan kodları refactor etme.
   - Kesinlikle bu aşamada YENİ ÖZELLİK EKLEME.
4. **Hatanın Çözüldüğünü Doğrula**:
   - Tekrarlanan testi veya derleyiciyi yeniden çalıştırarak hatanın kaybolduğunu teyit et.

---

### Kurallar
- Hatayı görmeden veya log okumadan rastgele deneme-yanılma yapmak YASAKTIR.
- Hatayı `try ... except: pass` ile sessizce yutmak kesinlikle YASAKTIR.
- Qodi v6.1 Anayasası: Düzeltme yaparken `??`, `|| 50`, `Math.random` veya `throw` eklenemez.

---

### Kırmızı Bayraklar (Anti-Patterns)
- 🚩 "Galiba şuradan olabilir" diyerek kodu rastgele değiştirmek.
- 🚩 Bug fix yaparken araya yeni buton veya yeni özellik sıkıştırmak.
- 🚩 Hata fırlatan yeri boş `catch` ile sarıp veriyi gizlemek.
