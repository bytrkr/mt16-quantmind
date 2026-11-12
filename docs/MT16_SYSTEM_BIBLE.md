📜 MT16 QUANTMIND - NİHAİ SİSTEM ANAYASASI VE KILAVUZU (v4.0)

Sürüm: v4.0 (Qodi Uyumlu - Sıfır Sahte Veri)
Tarih: 2026
Amaç: MT16 Kuant Terminali'nin mimari standartlarını, veri akışını, yapay zeka entegrasyonunu ve hata giderme protokollerini tanımlamak.
Geçerlilik: Bu anayasa, projedeki tüm kodlar, UI bileşenleri, API'ler ve yapay zeka asistanları için MUTLAK ve DEĞİŞMEZdir.

---

🏛️ 1. QODİ ANAYASASI (4 DEĞİŞMEZ KURAL)

Sistemdeki her satır kod, her ajan ve her yapay zeka bu 4 kurala uymak zorundadır.

1. Kural 1 (SSOT - Tek Doğruluk Kaynağı): Tüm veriler (fiyat, OBI, Z-Skor, AKD, KAP) sadece src/core/collectors/tacticalCollector.ts üzerinden akar. Hiçbir UI bileşeni doğrudan dış API'ye veya statik dosyaya bağlanamaz.
2. Kural 2 (Fallback Yasağı - Sıfır Sahte Veri): ?? 347, || 50, Math.random() KESİNLİKLE YASAKTIR. Eğer veri null ise, ekranda sadece "VERİ YOK" veya "Veri Bekleniyor..." yazacaktır. Sahte veriyle yalan söylemek, sistemin en büyük günahıdır.
3. Kural 3 (Çökme Yasağı - Null-Safety): Hiçbir fonksiyon throw new Error fırlatamaz. Veri null ise, fonksiyon sessizce null döner. Tüm .toFixed() çağrıları typeof val === 'number' kontrolü ile korunur. Beyaz ekran (Crash) kabul edilemez.
4. Kural 4 (Halüsinasyon Kalkanı): LLM (Groq/Gemini) cevap ürettiğinde, bu cevap guardLLMResponse fonksiyonundan geçer. LLM'in verdiği fiyat, gerçek fiyattan %0.5'ten fazla sapıyorsa REDDEDİLİR ve deterministik motora dönülür.

---

🏗️ 2. MİMARİ HARİTA VE DOSYA YAPISI

Sistem 4 ana katmandan oluşur. Veri akışı yukarıdan aşağıyadır.

```text
[DIŞ VERİ KAYNAKLARI]
  ├─ Yahoo Finance (BIST .IS) -> CORS Proxy (/api/yahoo-proxy) üzerinden
  ├─ Alpaca (NASDAQ & CRYPTO) -> Doğrudan Fetch
  └─ KAP RSS (Haberler)

          ⬇️ (Veri Çekme ve Doğrulama)

[SERVİS KATMANI]
  ├─ src/services/yahooDirect.ts   (Fiyat + volumeHistory çeker, hata = null)
  ├─ src/services/marketGateway.ts (OBI, AKD, Derinlik - Matriks yoksa null)
  └─ src/services/llmProvider.ts   (Groq/OpenRouter - Hata = null)

          ⬇️ (Veri Toplama ve Karar)

[ÇEKİRDEK KATMAN - tacticalCollector.ts]
  ├─ 5 Motoru çalıştırır (Anomali, L2, Adli, Küpler, CompositeV2).
  ├─ Eğer geçerli veri kaynağı < 2 ise: action = "VERİ YOK".
  └─ Sonuç: UnifiedVerdict (JSON).

          ⬇️ (Sunum ve Etkileşim)

[UI KATMANI - React]
  ├─ src/components/TacticalCard.tsx (Fiyat, OBI, Jüri Skoru)
  ├─ src/components/SmartJuryDiagnosisCard.tsx (R:R, KAP Etkisi)
  └─ "🤖 QuantMind'e Sor" Butonu -> copyForLLM.ts -> LLM Chat
```

---

🛠️ 3. HATA GİDERME VE KODLAMA KURALLARI

Yapay zeka (Gemini) ile kod yazdırma veya hata giderme yaparken şu kurallara uyulmalıdır:

· CORS Sorunları: Tarayıcıdan (Client) doğrudan Yahoo/Alpaca'ya fetch atılamaz (CORS bloğu). Mutlaka server/index.js içindeki /api/yahoo-proxy gibi bir proxy kullanılmalıdır. Sebep: "Veri Bekleniyor..." döngüsü.
· Build Boyutu (5 MB): Sahte veri silmek boyutu 500 KB yapmaz. Boyutun asıl suçluları Recharts ve Mermaid kütüphaneleridir. Çözüm: React.lazy ve manualChunks ile lazy-loading yapmak.
· LLM Entegrasyonu: LLM çağrıları asla doğrudan React içinden yapılmamalıdır (API Key güvenliği). server/index.js içindeki /api/llm-proxy üzerinden yapılmalıdır.
· Test Protokolü: Her kod değişikliğinden sonra şu 3 komut çalıştırılmalıdır:
  · grep -r "?? 347" src/ -> 0 sonuç dönmeli.
  · npm run lint -> 0 hata.
  · npm run build -> Başarılı.

---

💻 4. NİHAİ KODLAR (Kopyala-Yapıştır Hazır)

Aşağıdaki kodlar, Qodi Anayasası'na tam uyumlu, son sürümlerdir.

4.1. src/services/yahooDirect.ts (CORS Proxy Kullanımı)

```typescript
export async function fetchYahooPrice(ticker: string): Promise<number | null> {
  try {
    const symbol = ticker.includes('.') ? ticker : `${ticker}.IS`;
    // Tarayıcı yerine kendi proxy'mize istek atıyoruz (CORS çözümü)
    const res = await fetch(`/api/yahoo-proxy?symbol=${encodeURIComponent(symbol)}`);
    if (!res.ok) return null;
    const data = await res.json();
    const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
    // Qodi: Sayı değilse null dön, sahte 347 yok
    return typeof price === 'number' && !isNaN(price) ? price : null;
  } catch {
    return null; // Hata = null (throw yok)
  }
}
```

4.2. src/services/copyForLLM.ts (LLM Chat ve Halüsinasyon Kalkanı)

```typescript
export interface UnifiedVerdict { ticker: string; price: number | null; changePct: number | null; zScore: number | null; obi: number | null; juryScore: number | null; riskScore: number | null; finalScore: number | null; action: string; reason: string }

function fmt(v: number | null, s=''){ return typeof v==='number'&&!isNaN(v) ? `${v.toFixed(2)}${s}` : 'VERİ YOK' }

export function buildLLMPrompt(v: UnifiedVerdict): string | null {
  if (typeof v.price !== 'number' || isNaN(v.price)) return null; // Qodi: throw yok
  
  return `
Sen MT16 QuantMind'sin. Sana VERİLEN skorların dışına ASLA çıkma.
VERİ (SSOT):
Sembol: ${v.ticker}
Fiyat: ${fmt(v.price,'₺')} (BUNU DEĞİŞTİRME, UYDURMA)
Z-Skor: ${fmt(v.zScore,'σ')}
OBI: ${fmt(v.obi)}
Jüri: ${fmt(v.juryScore,'/100')}
Final: ${fmt(v.finalScore,'/100')}

GÖREV: Final skor ≥70 AL, ≤30 SAT, diğer BEKLE. 
ÇIKTI: Sadece JSON: {"action":"AL|SAT|BEKLE","reason":"tek cümle Türkçe","price":${v.price}}
`.trim()
}

export function buildChatMessages(v: UnifiedVerdict){
  const prompt = buildLLMPrompt(v);
  if (!prompt) return null;
  return [{role:'system', content:'Sen MT16 QuantMind, fiyat uydurma.'},{role:'user', content:prompt}]
}

export function guardLLMResponse(llmJson: any, original: UnifiedVerdict): boolean {
  if (!llmJson || typeof llmJson.price !== 'number') return false;
  if (Math.abs(llmJson.price - (original.price||0)) > 0.5) return false; // Halüsinasyon kalkanı
  if (!['AL','SAT','BEKLE'].includes(llmJson.action)) return false;
  return true;
}
```

4.3. server/index.js (Yahoo CORS Proxy + LLM Proxy)

```javascript
// Yahoo CORS Proxy
app.get('/api/yahoo-proxy', async (req, res) => {
  const { symbol } = req.query;
  if (!symbol) return res.json(null);
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1mo&interval=1d`;
    const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!response.ok) return res.json(null);
    const data = await response.json();
    res.json(data);
  } catch { res.json(null); } // Qodi: throw yok
});

// LLM (Groq) Proxy
app.post('/api/llm-proxy', async (req, res) => {
  try {
    const { messages } = req.body;
    if (!messages) return res.json(null);
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages, temperature: 0.2, max_tokens: 300 })
    });
    if (!groqRes.ok) return res.json(null);
    const data = await groqRes.json();
    res.json(data);
  } catch { res.json(null); } // Qodi: throw yok
});
```

---

🚀 5. GELECEK VİZYON (Deployment ve Sonraki Adımlar)

1. Deployment: AI Studio'daki yeni dist/ klasörünü sunucuya (136.144.200.54) atıp pm2 restart bistapp yapmak. Eski 347 sahte fiyatları sunucudan temizlemek.
2. Lazy Loading: 5 MB'lik build boyutunu düşürmek için Recharts ve Mermaid kütüphanelerini sadece ilgili sekme açıldığında yüklemek (React.lazy).
3. Gerçek AKD: Matriks API lisansı alındığında, visionService yerine doğrudan marketGateway üzerinden gerçek AKD verisi çekmek.

---

🤖 6. YAPAY ZEKA İÇİN NİHAİ PROMPT (Kopyala-Yapıştır)

Bu promptu, kod yazdırmak istediğiniz herhangi bir yapay zekaya (Gemini, ChatGPT, Claude) verebilirsiniz. Sadece köşeli parantez içindeki görevi değiştirin.

Görev: Kıdemli Kuant Sistem Mimarısın. Kök dizindeki MT16_SYSTEM_BIBLE.md dosyasını oku. Bu anayasa MUTLAKtır. Şimdi aşağıdaki görevi bu anayasaya %100 uygun şekilde yerine getir:

Görev: [BURAYA YAPILACAK İŞİ YAZIN - Örn: "TacticalCard'a yeni bir buton ekle", "Hata var düzelt", "Yeni bir ajan ekle"]

Kurallar:

1. ?? 347, || 50, Math.random() kullanma.
2. throw new Error kullanma, return null dön.
3. Tüm .toFixed() çağrılarını typeof === 'number' ile koru.
4. Build ve Lint testlerinin 0 hata ile geçtiğini teyit et.

---

Bu dosya, projenizin hem teknik hafızası hem de gelecek nesil yapay zeka asistanları için bir kılavuzudur. "Kutsal Kitap" olarak kaydedin ve her kodlama seansında referans alın.
