# bist-plan

Koda başlamadan önce net, ölçülebilir ve adımlara bölünmüş bir uygulama planı oluştur, planı `docs/superpowers/specs/` altına kaydet.

---

### Ne Zaman Kullanılır
- Birden fazla dosyayı etkileyen orta veya büyük ölçekli görevlerde.
- Full pipeline entegrasyonu (`/api/analyze/full`) veya UI kartı bağlama işlemlerinde.
- Yeni bir mikro servis veya Python motoru eklendiğinde.

---

### Nasıl Yapılır
1. **Mevcut Durumu Analiz Et**:
   - Etkilenecek dosyaları listele (`server/index.ts`, `TacticalCard.tsx`, vb.).
   - Bağımlılıkları ve veri akış yönünü haritalandır.
2. **Plan Belgesi Oluştur**:
   - `docs/superpowers/specs/PLAN_<KONU>.md` dosyası aç.
   - 3-5 maddelik net aşamalar belirle:
     - Aşama 1: Veri modeli & Type tanımları
     - Aşama 2: Backend endpoint veya motor implementasyonu
     - Aşama 3: Frontend state & UI entegrasyonu
     - Aşama 4: Doğrulama testleri
3. **Her Adım İçin Kabul Kriteri Belirle**:
   - Adımın tamamlandığı nasıl anlaşılacak? (ör. curl cevabı, UI render, test script çıktısı).
4. **Kullanıcıya Sun**:
   - Planı özetle ve başlamadan önce teyit al.

---

### Kurallar
- Plansız büyük kod değişikliklerine girişmek YASAKTIR.
- Plan içinde Qodi v6.1 kısıtları açıkça belirtilmelidir.
- Plan dosyası `docs/superpowers/specs/` klasöründe kalıcı olarak arşivlenmelidir.

---

### Kırmızı Bayraklar (Anti-Patterns)
- 🚩 "Aklımdan planladım, yazmaya gerek yok" yaklaşımı.
- 🚩 Kabul kriteri olmayan belirsiz plan maddeleri ("Backend'i bağla" gibi).
- 🚩 Uygulama sırasında plandan habersizce sapmak.
