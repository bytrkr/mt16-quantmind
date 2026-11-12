# DENETİM RAPORU
- **Silinen Sayılar ve Nedenleri:**
  - VPIN CDF %90 eşiği silindi. (Easley, Lopez de Prado makalesinde mutlak bir sınır değil, konsept olarak verilmiştir. "Toksisite artışı" olarak sözel ifadeye çevrildi, sistemsel olarak > 0.35 eşiğine bağlandı).
  - %3 Günlük Zarar Limiti ve %10 Drawdown'da riski %0.5'e düşürme kuralları silindi. (Prop firmadan firmaya değişir, spesifik akademik kaynağı yoktur. "Önceden belirlenmiş limit" olarak revize edildi).
  - 15 Dakika Haber Blackout'u silindi. (Kesin 15 dk kuralı her botta değişir, akademik kaynağı mutlak 15 değildir. "Kritik zaman penceresi" olarak düzeltildi).
- **Tutulan Sayılar ve Kaynakları:**
  - 5:1 Risk/Ödül Oranı (Kaynak: Market Wizards, Jack Schwager - Paul Tudor Jones röportajı).
  - %1 Kasa Riski Kuralı (Kaynak: Market Wizards, Jack Schwager - Larry Hite röportajı).
- **Yanlış Verilen Kaynağın Düzeltilmesi:**
  - Pozisyon boyutlandırma formülünün kaynağı psikoloji kitabı olan "Trading in the Zone"dan alınıp, asıl matematiksel kaynağı olan "Trade Your Way to Financial Freedom" (Van K. Tharp, Bölüm 12) olarak düzeltilmiştir.

---

# BISTAPP STRATEJİ KİTABI

## 0. CANLI SİSTEM VE PAPER TRADER KURALLARI (KRİTİK UYARI)
Bu dokümanda geçen "AL", "SAT" veya "İŞLEM" ifadeleri canlı sistemi değil, sadece sanal analiz ve test ortamını ifade eder.
1. **Paper Trader Kuralı:** Sistem gerçek parayla emir göndermez, sadece analiz yapar. Tüm KADEMELİ AL / KADEMELİ SAT kararları, "Paper Trader" (Sanal İşlem) modülünde, varsayılan 100.000 USDT sanal bakiye ile yürütülür. Her sanal işlem loglanır (Kayıt içeriği: Sembol, Küp No, Giriş, Çıkış, Neden).
2. **VETO Önceliği:** VPIN değeri > 0.35 seviyesine ulaşırsa veya sistemde veri eksikliği (VERİ YOK) tespit edilirse sistem VETO_HOLD durumuna geçer. **VETO kararı, Hayal Küplerinin ürettiği tüm AL/SAT sinyallerini mutlak şekilde ezer.**
3. **%1 ve 5:1 Sanal İşlem Bağlantısı:** Disiplin dokümanındaki "%1 Kasa Riski" ve bu dokümandaki "5:1 Risk/Ödül" kuralları, canlı hesaplarda DEĞİL, yalnızca Paper Trader üzerindeki sanal lot/kontrat matematiksel hesaplamalarında geçerlidir.
4. **Veri Saklama:** Sistem tarafından toplanan tüm piyasa verileri ve işlem logları 30 gün boyunca aktif veri tabanında saklanır. 30. günün sonunda otomatik olarak arşive taşınır.

---

## 1. MİMARİ VE VERİ KURALLARI
- **Kesin Ekran Ayrımı:** BIST, KRİPTO ve NASDAQ ekranları kesinlikle ayrı olacaktır. Sekme (tab) yapısı kullanılamaz.
- **Veri İzolasyonu:** KAP verileri sadece BIST'te, SEC verileri sadece NASDAQ'da, Funding (Fonlama Oranı) ve Fear (Korku) endeksi sadece Kripto ekranında kullanılır.
- **Güvenlik Mührü (VETO_HOLD):** Eğer API'den veya piyasadan veri akışı kesilirse veya eksikse, fiyat kutusu boş bırakılır ve ekrana kesin bir şekilde **VERİ YOK, VETO_HOLD** yazılır. Asla sahte, gecikmeli veya tahmini fiyat basılmaz.

## 2. GÖSTERGELER (DİJİTAL ZARLAR)
Aynı şeyi farklı söyleyen dedikodu göstergeleri (RSI, MACD) eklenmemiştir.

**Karar Zarları:**
- **VPIN:** İşlem hacmine göre senkronize edilmiş bilgili tüccar olasılığı (Toksisite ölçer).
- **OBI:** Emir defteri dengesizliği (İlk kademelerdeki alış/satış baskısı).
- **CVD:** Kümülatif hacim deltası (Gerçekleşen piyasa alımları vs satımları).
- **WallZ:** Emir duvarları (Emir defterindeki devasa pasif emirler).
- **Funding & Fear:** (Kripto) Vadeli-spot sapma maliyeti ve piyasa duygu durumu.
- **OI & Volatilite:** Açık sözleşme miktarı ve dalgalanma hızı.
- **Likidasyon Riski & L/S Oranı:** Kaldıraçlı yatırımcıların sıkışma yönü.

**Bilgi Zarları (Teyit İçin):**
- Taker Buy/Sell, Basis, Derinlik, Büyük Emir Takibi (Balina Avı), OI Değişimi.

---

## 3. HAYAL KÜPLERİ: PİYASANIN HİKAYELERİ

**Küp 1: Toksik Akış (Flash Crash Habercisi)**
- *Zarlar:* VPIN + OBI (Ağır Negatif) + WallZ (İptal edilen alışlar)
- *Ne Oldu:* VPIN toksisite metrikleri tepe yaptı, emir defterindeki alt alış duvarları (WallZ) iptal edildi ve OBI satıcı baskısına geçti.
- *Ne Demek:* İçeriden bilgi alan akıllı para mal boşaltıyor. Piyasa yapıcılar (Market Makers) pasif emirlerini geri çekerek likidite boşluğu yaratıyor. Fiyat düşecek.
- *Ne Yapacağız:* **BEKLE** (Alım yapma).

**Küp 2: Sessiz Emilim (Short Squeeze Hazırlığı)**
- *Zarlar:* Fear (Yüksek) + CVD (Uyumsuzluk) + Funding (Negatif)
- *Ne Oldu:* Korku çok yüksek, piyasa şortlanıyor (Funding negatif). Ancak CVD daha fazla düşmüyor.
- *Ne Demek:* Küçük yatırımcı panikle satarken, akıllı para pasif limit emirlerle bu satışı emiyor. Tasfiye (squeeze) için fiyat yukarı sürülecek.
- *Ne Yapacağız:* **KADEMELİ AL** (Paper Trader üzerinde).

**Küp 3: FOMO Tuzağı (Spoofing)**
- *Zarlar:* OI (Şişik) + L/S (Long ağırlıklı) + WallZ (Sahte satış emirleri)
- *Ne Oldu:* OI zirvede, L/S long lehine. Fakat yukarıdaki kalın satış duvarları fiyattan sürekli kaçıyor.
- *Ne Demek:* Tahtacı, sahte satış duvarlarıyla (spoofing) yatırımcıyı yönlendiriyor. Yeterince alıcı içeri hapsolduğunda aşağı yönlü tasfiye başlayacak.
- *Ne Yapacağız:* **KADEMELİ SAT** (Paper Trader üzerinde).

**Küp 4: Anomali (Sığ Su Suikastı)**
- *Zarlar:* Volatilite (Düşük) + Derinlik (İnce) + Basis (Anormal Sapma)
- *Ne Oldu:* Emir defteri çok inceyken vadeli ile spot fiyat birbirinden sert koptu.
- *Ne Demek:* Birileri sığ tahtada algoritmaları avlamak için sentetik anomali yaratıyor.
- *Ne Yapacağız:* **BEKLE**.

**Küp 5: Manipülasyon (Stop Avı - Liquidity Grab)**
- *Zarlar:* OBI (Hızlı değişim) + Likidasyon Riski + Büyük Emir Takibi
- *Ne Oldu:* Fiyat destek/direnç noktasını geçtiği an OBI tersine döndü ve agresif emirler geldi.
- *Ne Demek:* Küçük traderların stop emirleri patlatılıp likiditeleri toplandı. Kırılım sahteydi.
- *Ne Yapacağız:* **KADEMELİ AL / SAT** (Orijinal yöne dönüşte, Paper Trader üzerinde).

**Küp 6: Siyah Kuğu (Likidasyon Şelalesi)**
- *Zarlar:* VPIN (Maksimum) + Fear (Maksimum) + Likidasyon Riski (Zincirleme)
- *Ne Oldu:* Makro bir şokla pozisyonlar zincirleme tasfiye ediliyor (Margin Call).
- *Ne Demek:* Rasyonellik bitti. Algoritmalar zorunlu tasfiye yapıyor.
- *Ne Yapacağız:* **BEKLE** (Düşen bıçak tutulmaz).

**Küp 7: Fırsat (Momentum Tükenişi)**
- *Zarlar:* CVD (Yatay) + OI (Sıfırlanmış) + Volatilite (Düşüş sonrası yatay)
- *Ne Oldu:* Sert düşüş sonrası OI temizlendi, CVD yataya bağladı.
- *Ne Demek:* Trendi besleyen yakıt (kaldıraç) bitti. Piyasa ortalamaya dönecek (Mean Reversion).
- *Ne Yapacağız:* **KADEMELİ AL** (Paper Trader üzerinde).

---

## 4. AKADEMİK VE TEKNİK STRATEJİ KURALLARI

**Kural 1: VPIN ve Toksisite Çöküşü**
- *Neden Var:* Piyasaya sızan asimetrik bilgiyi yön bağımsız ölçmek için.
- *Kural:* VPIN metriği ekstrem yüksek seviyelere ulaşıp emir akışında "toksisite" tespit ettiğinde, piyasa yapıcılar pasif emirlerini iptal eder. Bu aşamada sistem yeni girişleri bloke eder (VETO_HOLD). (Not: Sistem bazında sınır > 0.35 olarak belirlenmiştir).
- *Bozulursa Ne Olur:* Piyasadaki anlık likidite çöküşlerinin (Flash Crash) altında kalınır.
- *Kaynak:* Makale: "The Microstructure of the 'Flash Crash'", Easley, Lopez de Prado, O'Hara (2011), (Sayfa 118-128 genel konsept, özellikle Exhibit 4).

**Kural 2: Asimetrik Risk/Ödül Dengesi (5:1 Prensibi)**
- *Neden Var:* Kazanma oranının (Win Rate) düşük olduğu dönemlerde dahi hesabın büyümesini matematiksel olarak garanti altına almak için.
- *Kural:* Açılacak işlemlerde risk/ödül asimetrik olmalıdır. Örnek alınan tavan metrik 5:1 (1 birim riske karşı 5 birim kazanç) hedefidir.
- *Bozulursa Ne Olur:* Sistemin matematiksel avantajı (Edge) kaybolur, kazançlar ufak tefek kayıplarla erir.
- *Kaynak:* Kitap: *Market Wizards*, Jack Schwager, Paul Tudor Jones Röportajı (Basıma göre değişmekle birlikte genellikle HarperBusiness edisyonu syf. 130-132).

**Kural 3: Pozisyon Boyutlandırma Matematiği (Paper Trader İçin)**
- *Neden Var:* Volatilitesi farklı varlıklarda "eşit para miktarıyla" değil, "eşit risk miktarıyla" işleme girmek için.
- *Kural:* Lot/Kontrat büyüklüğü, işlemin stop mesafesine göre dinamik hesaplanır. (Formül: Pozisyon Boyutu = Kasa Risk Miktarı / (Giriş Fiyatı - Stop Fiyatı)).
- *Bozulursa Ne Olur:* Geniş stoplu volatil bir işlem, dar stoplu bir işleme göre kasaya orantısız zarar verir.
- *Kaynak:* Kitap: *Trade Your Way to Financial Freedom*, Van K. Tharp, Bölüm 12 (syf. 308-315).

**Kural 4: Spoofing (Manipülasyon) Filtresi**
- *Neden Var:* Sahte likidite duvarlarına aldanıp yanlış yöne pozisyon almamak için.
- *Kural:* Emir defterindeki pasif büyük emirler, fiyat yaklaştıkça sürekli iptal ediliyorsa (Yüksek emir iptal oranı), o yöndeki sinyaller iptal edilir.
- *Bozulursa Ne Olur:* HFT algoritmalarının sahte duvarlarına çarpıp Stop olunur.
- *Kaynak:* Kitap: *Advances in Financial Machine Learning*, Marcos Lopez de Prado.

**Kural 5: VWAP ve Kurumsal Rejim**
- *Neden Var:* Kurumsal yatırımcıların ağırlıklı işlem yönüne karşı pozisyon almamak için.
- *Kural:* Fiyat günlük VWAP'ın altındaysa sadece satıcılı, üstündeyse sadece alıcılı agresif setuplara izin verilir.
- *Bozulursa Ne Olur:* Kurumlar kâr realizasyonu yaparken sistem körü körüne akıntıya karşı yüzer.
- *Kaynak:* Kitap: *Algorithmic Trading*, Ernie Chan.

**Kural 6: Düşen Bıçak Kuralı**
- *Neden Var:* Siyah kuğu olaylarında paniğin dibini tahmin etmenin imkansız olması nedeniyle.
- *Kural:* Sert düşüşlerde, fiyat sadece "ucuzladı" diye alınmaz. CVD uyumsuzluğu veya sessiz emilim görülmeden (taban oluşmadan) işleme girilmez.
- *Bozulursa Ne Olur:* Varlık ucuz zannedilip alınır, tasfiye sürecinde bakiye sıfırlanır.
- *Kaynak:* Kitap: *Reminiscences of a Stock Operator*, Edwin Lefèvre (Jesse Livermore'un prensipleri).
