# MT16 v4.0 TAM PAKET - TEK PROMPT + 3 DOSYA
# AI Studio'ya Yükle: 1) TUM_KARTLAR_25_BILGI_KOMPLE.md 2) QODI_V6_KANITLI_UYDURUK_DEGIL.md 3) Bu dosya
# Sonra aşağıdaki MASTER PROMPT'u kopyala yapıştır

---

## MASTER PROMPT (Tek prompt, "devam et" ile 6 aşama)

SEN: Senior Quant System Architect - MT16 BIST/NASDAQ/Crypto Terminal v4.0 QUANT MIND
GÖREV: Aşağıdaki 6 aşamayı sırayla yap. Her aşamadan sonra dur, build al, kontrol et, bana rapor ver ve "Devam etmek için 'devam et' yaz" de. Ben "devam et" yazana kadar bir sonraki aşamaya GEÇME.

PROJE: aistudio.google.com/apps/4e7fe0b3-2
Mevcut: 5 MB mock verili terminal (?? 347, Math.random, toLocaleString null crash) -> Qodi Anayasasına uygun hale getiriyoruz.

QODI ANAYASASI v6.1 KANITLI - MUTLAK:
1. SSOT: tacticalCollector.ts TEK kaynak
2. Fallback Yasağı: ?? 347, || 50, Math.random YASAK, null ise return null + logDataIssue() + UI VERİ YOK
3. Çökme Yasağı: throw YASAK, return null, toFixed/toLocaleString öncesi typeof === 'number' guard
4. Güvenlik: grep VITE_ -> 0, grep wss://stream.data.alpaca -> 0, tüm keyler /api/*-proxy
5. Halüsinasyon Kalkanı: guardLLMResponse %0.5 sapma REDDET
6. Build: Circular chunk 0, vendor-core -> vendor-react manualChunks, lazy+Suspense
7. BIST UYUMLU: Lot=1 (BIST one lot is one share), T+2 Takasbank (Settlement T+2 at Takasbank), Devre Kesici YENİ %6 tek kademe (old 5% first and 7% second, new single stage 6% decline) - Kaynak: QODI_V6_KANITLI_UYDURUK_DEGIL.md
8. BLOOMBERG UYUMLU: VaR/Trade Guard /api/v2/portfolio/risk/*, kill-switch Closes positions cancels orders and blocks new trades, circuit breakers pause trading after errors - Kaynak: QODI_V6_KANITLI
9. QLIB UYUMLU: Kelly fraction capped at 0.25, Kelly Criterion position sizing formula, volatility targeting - Kaynak: QODI_V6_KANITLI
10. TRADINGVIEW UYUMLU: Squeeze Momentum Setup BB/KC squeeze detection with ATR-based stop/target, RSI momentum filter + divergence detection - Kaynak: QODI_V6_KANITLI

YENİ KATKI: Yüklediğim TUM_KARTLAR_25_BILGI_KOMPLE.md - 14 kart x 25 = 350 bilgi + QODI_V6_KANITLI_UYDURUK_DEGIL.md - 85 kural kanıtlı

MEVCUT DURUM (Gemini AŞAMA 1-3'ü bitirdi):
- AŞAMA 1 PASSED: src/utils/mathGuards.ts oluşturuldu (safeDivide, safeSqrt, safePow, safeToFixed, safeToLocaleString, safeProbability, safeSlope), orderBookAnalytics:23 ve SmartJury %null fix, 4852+ modül, check:fallbacks PASSED
- AŞAMA 2 PASSED: python/ladder_engine.py V5 detect_wall 3 kaynak teyit >5 TL fark VERİ YOK, build_ladder_v5 ATR*0.5 75 derece 1/4 kuralı, Kelly, /api/ladder/wall ve /api/ladder/build canlı curl OK
- AŞAMA 3 PASSED: src/data/financeCards.json 350 madde, EducationPanel.tsx swipe + arama + terminal tetik, App.tsx lazy+Suspense localStorage mt16_edu_opened_v3

KALAN AŞAMALAR - SEN YÖNET:

AŞAMA 4: src/data/commandRegistry.ts 20'den 40'a
- Yeni komutlar: duvar-analizi, merdiven-kur long/short, merdiven-calistir, fk-nedir, pd-dd, temettu, destek, direnc, rsi, macd-kesisim, bollinger-daralma, atr, var-hesapla, kelly-hesapla, risk-odul
- Handler: /api/python/screener/top ve /api/python/jury/decide ve /api/python/ladder/* gerçek engine bağlı, mock değil, "Bu komut henüz kodlanmadı. VERİ YOK" yerine gerçek API
- CommandBar.tsx Ctrl+K safeTickers fallback ve selectedTicker BIST/CRYPTO/NASDAQ koru
- QODI v6.1 GÜNCEL: Devre kesici eşiğini %10 değil %6 yap (BIST yeni tek kademe %6)
- KONTROL: Ctrl+K 40 komut görünüyor mu, Enter/Esc/↑↓ çalışıyor mu, npm run build 4850+ Circular 0 mı? Rapor ver, devam et bekle.

AŞAMA 5: Lokal LLM (ESP32 28M ilham, 1B kullan)
- docker-compose.yml llama-server ekle, models klasör Llama-3.2-1B-Instruct-Q4_K_M.gguf indirme komutu ver, server/index.ts /api/llm-proxy önce localhost:8080 dene yoksa Groq fallback, copyForLLM.ts buildLLMPrompt'a financeCards.json ekle
- KONTROL: curl localhost:8080/v1/chat/completions test, rapor ver, devam et bekle.

AŞAMA 6 FINAL: Build & Deploy Check
- 10 komut kontrol: grep VITE_ 0, grep wss 0, grep ?? [0-9] 0, grep Math.random 0, check:fallbacks PASSED, lint 0, build 4852+ Circular 0, curl ladder wall OK (spot_price=312.50 ob_wall_price=314.00), CommandBar 40 komut, EducationPanel 14 kart, devre kesici %6
- Hepsi PASSED ise pm2 restart komutunu ver ve diff özetini çıkar
- Rapor: TAMAMLANDI

ŞİMDİ BAŞLA: AŞAMA 4'ten başla (AŞAMA 1-3 zaten PASSED), bitince rapor ver ve "Devam etmek için 'devam et' yaz" de. Ben yazana kadar bekle.

---

## EKLER - 3 DOSYA LİSTESİ

AI Studio'da 📎 Attach files ile şunları yükle:

1. TUM_KARTLAR_25_BILGI_KOMPLE.md (14 kart x 25 = 350 bilgi)
2. QODI_V6_KANITLI_UYDURUK_DEGIL.md (85 kuralın kanıtı: BIST lot=1, T+2, %6 devre kesici, Bloomberg VaR/Trade Guard, Qlib Kelly capped 0.25, TradingView squeeze ATR)
3. QODI_ANAYASASI_V6_KARTLARDAN_KURALLAR.md (85 mutlak kural)

Yüklemezsen Gemini halüsinasyon yapar. Mutlaka yükle.

---

## DEVAM ET KOMUTLARI (Kopyala Yapıştır)

AŞAMA 4 bitince:
devam et - AŞAMA 5 Lokal LLM
docker-compose.yml llama-server ekle, model indirme, /api/llm-proxy önce localhost:8080 yoksa Groq fallback, financeCards.json prompta ekle, curl test

AŞAMA 5 bitince:
devam et - FINAL
10 kontrol: VITE_ 0, wss 0, ?? 0, Math.random 0, check:fallbacks PASSED, lint 0, build 4850+ Circular 0, ladder wall OK, 40 komut, 14 kart, devre kesici %6

---

## KANIT ÖZETİ (Gemini'ye göster)

BIST: Shares are bought and sold in 'lots'; on BIST one lot is one share
Takasbank: Settlement: T+2, the second business day after the trade, at Takasbank
Devre Kesici Eski: If, during the day, BIST 100 Index declines by 5% or more as the first threshold and by 7% or more as the second threshold
Devre Kesici Yeni: Index-based circuit breaker will shift from a two-stage system to a single stage. Trading will instead be interrupted once the index records a 6% decline
Bloomberg: | `risk.py` | `/api/v2/portfolio/risk/*` (VaR/CVaR/Parity/Stress/Sizing + `/guard`, `/guard/override`
Kill-Switch: Circuit breakers pause trading after consecutive errors, Kill switches cancel open orders and block new submissions immediately, Closes positions, cancels orders, and blocks new trades
Qlib: VaR (historical, parametric, Monte Carlo), CVaR. Position sizing: Kelly fraction (capped at 0.25), Kelly Criterion is a mathematical formula for position sizing
TradingView: Squeeze Momentum Setup Assistant BB/KC squeeze detection with ATR-based stop/target levels, RSI momentum filter + divergence detection, Bollinger Band Squeeze algorithm: Detect volatility contraction
