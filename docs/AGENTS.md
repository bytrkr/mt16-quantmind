# AGENTS.md — BISTAPP / MT16

## Proje Nedir?
BIST için Project Manager tarzı analiz terminali.
İşlem yapmaz, analiz yapar. Canlı para bağlanmadıysa ekranda "DEMO / SADECE ANALİZ" yazar.

## Mimari — Sıra Sabittir, Değiştirme
Fiyat → VPIN → Sentinel → Alpha → Wall → Karar → Portföy

- **Fiyat**: Yahoo (yfinance) / Matriks gecikmeli
- **VPIN**: Order flow toksisitesi, 0-1 arası
- **Sentinel**: Veto motoru
- **Alpha**: Yön + güç
- **Wall**: Limit book duvarları, ortalamanın 3x üstü = Duvar
- **Karar**: BUY / PROCEED veya VETO_HOLD

## Kritik Kurallar — Qodi

1. **VERİ YOK ise VERİ YOK yaz.** Asla uydurma.
2. **Math.random yasak.** Sahte fiyat, sahte VPIN üretme.
3. **VPIN > 0.35 ise Wall'u atla.** Log'a "VPIN VETO, Wall atlandı" yaz.
4. **Verification Before Completion (bist-doğrula):**
   "Bitti / çalışıyor" demeden önce komutu çalıştır, çıktıyı göster, öyle söyle.
   Örn: `THYAO BUY` diyorsan `/api/analyze/full?symbol=THYAO` çıktısını göster.
5. **Systematic Debugging (bist-fix):**
   Bug'u tahminle düzeltme. Önce tekrar üret, sonra daralt, sonra düzelt.
6. **Writing Plans (bist-plan):**
   Kod yazmadan önce plan yaz: Proje → Görevler → Log. Görev bitmeden diğerine geçme.

## Arayüz — Project Manager
- **Sol**: Proje ağacı (THYAO, ASELS, Tavan Adayı)
- **Orta**: Blok diyagramı (Fiyat → VPIN → Sentinel → Alpha → Wall → Karar)
- **Sağ**: Seçili bloğun özellikleri
- **Alt**: Log terminali
- **Renkler**: Yeşil = tamam, Sarı = çalışıyor, Kırmızı = VETO, Gri = atlandı

## Brokerlar
- **Alpaca**: ABD hisse / kripto, sadece salt-okunur API
- **Binance**: Kripto Spot / Futures, sadece salt-okunur API, çekim kapalı
- **BIST**: Alpaca / Binance'e bağlanmaz, Türk aracı kurum gerekir.
- Secret key'i asla kodda / chatte paylaşma.

## Test
- **THYAO**: VPIN 0.22 → BUY / PROCEED beklenir
- **ASELS**: VPIN 0.75 → VETO_HOLD beklenir, Wall atlanır
- Bu ikisi tutmuyorsa teslim etme.
