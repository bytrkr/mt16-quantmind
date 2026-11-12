# DENETİM RAPORU
- **Silinen Sayılar ve Nedenleri:**
  - Önceki sürümlerdeki %3 günlük zarar limiti ve %10 drawdown eşikleri gibi mutlak yüzdeler, akademik bir kaynağı olmadığı ve kurumdan kuruma değiştiği için silindi. Yerine "önceden belirlenmiş limit" ve "belirgin sermaye düşüşü" kavramları getirildi.
  - Haber öncesi/sonrası için verilen kesin 15 dakika kuralı, algoritmik sistemlerde değişkenlik gösterdiği için silinerek "kritik zaman penceresi" olarak esnekleştirildi.
- **Tutulan Sayılar ve Kaynakları:**
  - %1 Kasa Riski Kuralı tutuldu (Kaynak: Market Wizards, Jack Schwager - Larry Hite röportajı). Bu kural artık doğrudan Paper Trader sanal lot hesaplamasına bağlandı.
- **Eklenen Emniyet Protokolleri:**
  - Dosyanın başına canlı sistemin korunması ve Paper Trader mimarisi hakkında "Bölüm 0" eklenerek, kural ihlali durumunda canlı bakiyenin zarar görmesi tamamen engellendi.

---

# BISTAPP DİSİPLİN VE DAVRANIŞ KİTABI

Bu dosya strateji içermez. Sistemin ve yatırımcının piyasada hayatta kalmasını (survive) sağlayan, esnetilemez davranış kurallarıdır.

## 0. CANLI SİSTEM VE PAPER TRADER KURALLARI (KRİTİK UYARI)
Bu dokümanda geçen risk ve kasa yönetimi kuralları, gerçek API veya canlı bakiye (Live Account) üzerinde işlem açmak için DEĞİL, Paper Trader modülünün analitik doğruluğunu sağlamak için oluşturulmuştur.
1. **Paper Trader Kuralı:** Sistem gerçek parayla emir göndermez, sadece analiz yapar. Performans logları 100.000 USDT sanal bakiye varsayımıyla hesaplanır.
2. **VETO Önceliği:** Piyasa koşulları ne olursa olsun, sistemde VETO_HOLD bayrağı kalktığında disiplin kuralları veya Hayal Küpleri devre dışı kalır. VETO, her türlü pozisyon alma mantığını ezer.
3. **%1 Kasa Riski Bağlantısı:** Bu dokümanda bahsedilen "Kasanın %1'i" kuralı, canlı hesaplardaki parayı değil, Paper Trader'ın dinamik lot/kontrat boyutlandırma matematiğini ifade eder.
4. **Veri Saklama:** Loglanan sanal işlemler ve disiplin ihlalleri 30 gün boyunca veri tabanında tutulur, ardından arşivlenir.

---

## 1. KORUMA VE KASA KURALLARI

**Kural 1: %1 Kasa Riski Kuralı (Paper Trader Sanal Riski)**
- *Neden Var:* İflas riskini (Risk of Ruin) matematiksel olarak ortadan kaldırmak için.
- *Kural:* Açılacak her sanal işlemde, stop olunduğu takdirde hesabın (sanal kasanın) toplam özsermayesinin maksimum %1'i risk edilmelidir. Pozisyon boyutu buna göre hesaplanır.
- *Bozulursa Ne Olur:* Analiz ve test sonuçları gerçeklikten kopar, sistemin risk profili ölçülemez hale gelir.
- *Kaynak:* Kitap: *Market Wizards*, Jack Schwager, Larry Hite Röportajı (HarperBusiness edisyonu syf. 170).

**Kural 2: Günlük Zarar Limiti (Hard Stop)**
- *Neden Var:* Piyasayla uyumsuz olunan (kötü gün) günlerde sermaye kanamasını durdurmak için.
- *Kural:* Sistemde önceden tanımlanmış maksimum günlük zarar limitine ulaşıldığında analiz ve sinyal üretimi dondurulur, o gün başka Paper Trader işlemi loglanmaz.
- *Bozulursa Ne Olur:* Algoritma yatay veya uyumsuz piyasada "zararı çıkarma" (Revenge Trading) döngüsüne girer ve sanal bakiyeyi eritir.
- *Kaynak:* Profesyonel Prop Firm (Özel Fon) Risk Masası kuralları ve *Trading in the Zone* (Mark Douglas).

**Kural 3: Kapı Sistemi (Kârı Kilitleme)**
- *Neden Var:* Piyasadan kazanılmış kârı geri vermemek için.
- *Kural:* Fiyat, Paper Trader'da belirlenen ara hedeflere (kapılara) ulaştığında, Stop-Loss noktası derhal başa baş (breakeven) seviyesine sanal olarak çekilmelidir.
- *Bozulursa Ne Olur:* Başarılı olmuş işlem eksiye döner, istatistiksel avantaj (Edge) zedelenir.
- *Kaynak:* 【entity-GitHub¦canonical_name=GitHub】: disciplined-trader (trade-discipline).

---

## 2. PSİKOLOJİ VE SÜREÇ YÖNETİMİ

**Kural 4: İşlem Öncesi Kontrol Listesi**
- *Neden Var:* Sistemsel eksiklik varken analizleri kirletmemek için.
- *Kural:* Sistemin veri API'leri tam kapasite çalışmıyorsa veya makro-veri anıysa sistem ekranına geçilmez, VETO_HOLD aktif edilir.
- *Bozulursa Ne Olur:* Eksik veri seti ile yapılan işlemler Paper Trader sonuçlarını yanıltır.
- *Kaynak:* 【entity-GitHub¦canonical_name=GitHub】: SwingTrader (trading-discipline).

**Kural 5: Haber Blackout (Likidite Çölü)**
- *Neden Var:* Makro veri anlarındaki spread açılmalarından (makas) ve slippage (kayma) riskinden korunmak için.
- *Kural:* Yüksek etkili makro haberlerin açıklanmasından hemen önceki ve sonraki kritik zaman penceresinde, likidite kuruduğu için sistem VETO_HOLD verir.
- *Bozulursa Ne Olur:* Loglanan giriş/çıkış fiyatları, canlı piyasadaki makas açılmalarından dolayı gerçek hayatta ulaşılamaz (hayali) fiyatlar olur.
- *Kaynak:* Profesyonel Pit Trader kuralları / Algoritmik Bot Disiplin Metinleri.

**Kural 6: Günlük Tutma (Journaling) ve İnceleme**
- *Neden Var:* Sistematik hataları tespit edip düzeltmek için.
- *Kural:* Her Paper Trader işlemi, sembol, küp numarası, giriş-çıkış nedenleri ile birlikte loglanır. Hafta sonu bu veritabanı incelenerek Hayal Küplerinin başarı oranları ölçülür.
- *Bozulursa Ne Olur:* Sistemin hangi küplerde iyi, hangi küplerde kötü çalıştığı anlaşılamaz, optimizasyon durur.
- *Kaynak:* GitHub: SwingTrader (trading-discipline).

**Kural 7: Kurtarma Protokolü (Recovery Protocol)**
- *Neden Var:* Sistemi aşırı drawdown (düşüş) durumunda kalibre etmek için.
- *Kural:* Sanal kasada belirgin bir ana para düşüşü yaşandığında, işlem loglama boyutları (risk katsayısı) düşürülür ve sadece kusursuz (A+) zarların eşleştiği küpler beklenir.
- *Bozulursa Ne Olur:* Sistem art arda zararlı sinyaller üretmeye devam ederek sanal iflasa (Bust) sürüklenir.
- *Kaynak:* Kurumsal Risk Yönetimi Kuralları (Risk Desk Protocols).
