# Kararlar ve Spesifikasyon Kaydı (Specs)

MT16 Bistapp sisteminde alınan mimari ve mantıksal kararların dökümüdür.

---

### SPEC-001: Tavan Adayı Filtresi ve Yüzde Değişim Hesaplaması
- **Karar Tarihi**: 2026-11-08
- **Kural 1**: Günlük değişim hesaplaması kesin formülle yapılır:
  $$\text{Günlük Değişim} = \frac{\text{Anlık Fiyat} - \text{Dünkü Kapanış}}{\text{Dünkü Kapanış}} \times 100$$
- **Kural 2**: Eğer hesaplanan günlük değişim mutlak değerce `%10` limitini aşıyorsa (`|değişim| > 10`), bu veri geçersiz kabul edilir ve arayüze `VERİ YOK` yazılır. -%17, -%22 gibi uydurma/hatalı yüzdeler gösterilemez.
- **Kural 3**: Tavan adayı tespiti:
  $$\text{Tavan} = \text{Dünkü Kapanış} \times 1.10$$
  $$\text{Tavana Uzaklık} = \frac{\text{Tavan} - \text{Anlık Fiyat}}{\text{Tavan}}$$
  Sadece `tavanaUzaklik < 0.02` (yani fiyata %2 veya daha az kalmış) olan hisseler "Tavan Adayı" olarak listelenir.
- **Kural 4**: Tavan Adayı filtresinde yeşil `BUY` etiketi gösterilmez; bunun yerine dinamik `"Tavana %X kaldı"` bilgisi gösterilir.

---

### SPEC-002: Eksik Veri Durumunda "VERİ YOK" Standartı
- **Kural**: Fiyat veya dünkü kapanış `null` ise ilgili satıra varsayılan değer basılmaz, `VERİ YOK` gösterilir.
- **Gerekçe**: Qodi v6.1 Anayasası gereği yatırımcıya yanıltıcı sahte fiyat/oran sunulması yasaktır.

---

### SPEC-003: Duvar (Wall) Tespiti
- **Kural**: Bir kademedeki toplam lot miktarı, tahtanın ortalama kademe lotunun 3 katını aşarsa duvar kabul edilir.
- **Alış Kademesi**: `TABAN/DESTEK`
- **Satış Kademesi**: `TAVAN/DİRENÇ`
- **Test Örnekleri**:
  - `ASELS 331.75 @ 180.000 lot` alış kademesinde -> `TABAN/DESTEK`
  - `THYAO 312.50 @ 200.000 lot` satış kademesinde -> `TAVAN/DİRENÇ`
