# MT16 v3.0 TAM PAKET - AISTUDIO'YA YÜKLE
Bu dosyayı AI Studio'ya 2 dosya ile birlikte yükle:
1. TUM_KARTLAR_25_BILGI_KOMPLE.md (350 madde)
2. MT16_Quant_Terminal_Aktarim.md (proje aktarım)

Sonra aşağıdaki MASTER PROMPT'u yapıştır.

---
# MASTER PROMPT (Tek prompt, "devam et" ile ilerler)

SEN: Senior Quant System Architect - MT16 BIST/NASDAQ/Crypto Terminal v3.0 QUANT MIND
GÖREV: Aşağıdaki 6 aşamayı sırayla yap. Her aşamadan sonra dur, build al, kontrol et, bana rapor ver ve "Devam etmek için 'devam et' yaz" de. Ben "devam et" yazana kadar bir sonraki aşamaya GEÇME.

PROJE: aistudio.google.com/apps/4e7fe0b3-2
Mevcut: 5 MB mock verili terminal (?? 347, Math.random, toLocaleString null crash) -> Qodi Anayasasına uygun hale getiriyoruz.

QODI ANAYASASI v5.0 - MUTLAK:
1. SSOT: tacticalCollector.ts TEK kaynak
2. Fallback Yasağı: ?? 347, || 50, Math.random YASAK, null ise return null + logDataIssue() + UI VERİ YOK
3. Çökme Yasağı: throw YASAK, return null, toFixed/toLocaleString öncesi typeof === 'number' guard
4. Güvenlik: grep VITE_ -> 0, grep wss://stream.data.alpaca -> 0, tüm keyler /api/*-proxy
5. Halüsinasyon Kalkanı: guardLLMResponse %0.5 sapma REDDET
6. Build: Circular chunk 0, vendor-core -> vendor-react manualChunks, lazy+Suspense

YENİ KATKI: Yüklediğim TUM_KARTLAR_25_BILGI_KOMPLE.md - 14 kart x 25 = 350 bilgi - Matematik, Borsa, Teknik, Risk, Finans, Muhasebe, İktisat, Eğitim, Felsefe, Psikoloji, ARGE, Bilişim, Programlama, Yapay Zeka

MEVCUT DURUM:
- server/index.ts: /api/yahoo-proxy, /api/alpaca-proxy, /api/tradingview-proxy, /api/llm-proxy, /api/audit-log, /api/python/* -> 8001 proxy
- python/server.py: FastAPI 8001, 80+ engine
- Bug: OrderBookAnalytics.analyzeBook:23 toFixed null crash, L2 OBI NÖTR %null
- Build: 4852 modules, check:fallbacks PASSED, lint 0

AŞAMALAR:

AŞAMA 1: src/utils/mathGuards.ts OLUŞTUR
- safeDivide(a,b), safeSqrt(x), safePow(base,exp), safeToFixed(num), safeProbability(p), safeSlope(y2,y1,x2,x1)
- typeof check, 0 kontrolü, logDataIssue, return null veya VERİ YOK
- Tüm src'de toFixed ve toLocaleString arat, guard kullanmayanları düzelt: OrderBookAnalytics:23, quantPipelineEnforcer, SmartJuryDiagnosisCard %null
- KONTROL: npm run check:fallbacks, grep VITE_ 0 mı, npm run build 4852+ modules Circular 0 mı? Rapor ver, devam et bekle.

AŞAMA 2: python/ladder_engine.py V5 OLUŞTUR
- detect_wall(symbol): tactical_collector.get_price SSOT, order_book_analytics L2 duvar, market_gateway.get_swing_levels 20, 3 kaynak uyuşmazsa veya fark >5 TL ise VERİ YOK
- build_ladder_v5(symbol, wall_data, direction): atr = volatility_engine.get_atr(14), step = atr*0.5 (fiziki 75 derece 1/4 kuralı), kelly = risk_engine.kelly_fraction(), size=kelly, stop=price±atr, typeof guard, price==0 VERİ YOK
- python/server.py'ye /api/ladder/wall ve /api/ladder/build ekle, server/index.ts'e proxy /api/python/ladder/* -> 8001
- KONTROL: curl 8001 ve 3000 proxy test, rapor ver, devam et bekle.

AŞAMA 3: src/components/EducationPanel.tsx + src/data/financeCards.json
- financeCards.json: Yüklediğim TUM_KARTLAR md içindeki 14 kartı JSON yap
- EducationPanel: Swipe 14 kart, her kart 25 madde, tıklayınca commandRegistry çalıştır (destek kartı -> duvar-analizi THYAO), lazy+Suspense, App.tsx'e entegre ama localStorage ile ilk açılışta 1 kez
- KONTROL: npm run build Circular 0 mı, 4852+ modules mı, rapor ver, devam et bekle.

AŞAMA 4: src/data/commandRegistry.ts 20'den 40'a
- Yeni komutlar: duvar-analizi, merdiven-kur long/short, merdiven-calistir, fk-nedir, pd-dd, temettu, destek, direnc, rsi, macd-kesisim, bollinger-daralma, atr, var-hesapla, kelly-hesapla, risk-odul
- Handler: /api/python/screener/top ve /api/python/jury/decide ve /api/python/ladder/* gerçek engine bağlı
- CommandBar.tsx Ctrl+K safeTickers fallback ve selectedTicker koru
- KONTROL: Ctrl+K 40 komut görünüyor mu, Enter/Esc/↑↓ çalışıyor mu, rapor ver, devam et bekle.

AŞAMA 5: Lokal LLM (ESP32 28M ilham, 1B kullan)
- docker-compose.yml llama-server ekle, models klasör Llama-3.2-1B-Instruct-Q4_K_M.gguf indirme komutu ver, server/index.ts /api/llm-proxy önce localhost:8080 dene yoksa Groq fallback, copyForLLM.ts buildLLMPrompt'a financeCards.json ekle
- KONTROL: curl localhost:8080/v1/chat/completions test, rapor ver, devam et bekle.

AŞAMA 6 FINAL: Build & Deploy Check
- 10 komut: grep VITE_ 0, grep wss 0, grep ?? [0-9] 0, grep Math.random 0, check:fallbacks PASSED, lint 0, build 4852+ Circular 0, curl ladder wall OK, CommandBar 40 komut, EducationPanel 14 kart
- Hepsi PASSED ise pm2 restart komutunu ver ve diff özetini çıkar
- Rapor: TAMAMLANDI

ŞİMDİ BAŞLA: AŞAMA 1'den başla, bitince rapor ver ve "Devam etmek için 'devam et' yaz" de.

---
# NASIL YÜKLENİR?

AI Studio'da:
1. Sol üst Attach files -> TUM_KARTLAR_25_BILGI_KOMPLE.md seç
2. Tekrar Attach -> MT16_Quant_Terminal_Aktarim.md seç (varsa)
3. Prompt kutusuna yukarıdaki MASTER PROMPT'u yapıştır
4. Enter -> Gemini AŞAMA 1'i yapacak
5. Sen "devam et" yaz -> AŞAMA 2
6. 6 kez devam et ile biter

NOT: Dosyaları yüklemezsen Gemini kartları göremez, TUM_KARTLAR içindeki 350 bilgiyi halüsinasyonla uydurur. Mutlaka yükle.
