/**
 * ============================================================================
 * 🧠 MT16 QUANTMIND - SİSTEM TALİMATNAMESİ (SYSTEM INSTRUCTIONS)
 * ============================================================================
 * 
 * 1. GÖREV TANIMI:
 *    Bu dosya, MT16 Kuant Terminali'nin "Beyni"dir. Tüm fiyatlama, risk yönetimi,
 *    emir yürütme ve pazar yorumlama işlemleri buradan yönetilir. Dış API'lere
 *    (Gemini, Groq) bağımlı olmadan çalışabilen "Deterministic Core" buradadır.
 * 
 * 2. ANAYASAL KURALLAR (QODI STANDARTLARI):
 *    - Kural 1 (SSOT): Veri sadece marketGateway ve kapDaemon'dan gelir. UI veya 
 *      diğer servisler doğrudan veri uyduramaz.
 *    - Kural 2 (Fallback Yasağı): Eğer veri null ise, asla sahte 0, 100 veya 
 *      varsayılan değer atanmaz. Ekrana "VERİ YOK" döner.
 *    - Kural 3 (Karar Zarfı): Her işlem kararı (BUY/SELL/NO_TRADE), "decided_by", 
 *      "entry_blocked" ve "exit_allowed" alanlarını içeren bir zarf içinde sunulur.
 *    - Kural 4 (Sıfır Bağımlılık): Yerel LLM çökse bile, sistem deterministik 
 *      çıktı üretebilmelidir.
 * 
 * 3. KOD GÜNCELLEME KURALLARI (GEMINI İÇİN):
 *    - Yeni bir fonksiyon eklerken, mevcut "DecisionEnvelope" yapısını bozma.
 *    - Tüm sayısal hesaplamalarda "number | null" tipini koru.
 *    - `|| 0`, `?? 0` gibi fallback yapılarını KESİNLİKLE kullanma.
 *    - Yeni bir özellik eklediğinde, mutlaka "check:fallbacks" ve "build" 
 *      testlerini çalıştır ve 0 hata aldığını teyit et.
 * ============================================================================
 */

// src/core/nlp/kapSentiment.ts
/**
 * MT16 KAP Duygu Analizi Modülü (Kural Tabanlı Ön Filtre & Yerel NLP)
 * Qodi (Matriks AI) Katmanlı Sorumluluk Modülü
 */

export interface KapSentimentResult {
  impactDelta: number;
  sentimentLabel: 'POZİTİF' | 'NÖTR' | 'NEGATİF';
  matchedKeywords: string[];
  reasoning?: string;
  source: 'LOCAL_LLM_NEEDLE_TR' | 'RULE_BASED_KEYWORDS';
}

/**
 * 3. Türkçe Bağlam Anlama (Needle-TR Mantığı) & Kural Tabanlı Ön Filtre
 * Yerel LLM aktifse KAP metnini önce ona gönderir: { "sentiment": "POZİTİF/NEGATİF/NÖTR", "reasoning": "..." }
 * Model yanıt veremezse kural tabanlı (keyword) güvenlik sistemine geri döner (Qodi Fallback Yasağı).
 */
export async function calculateKapKeywordSentiment(
  text: string,
  useLocalLLM?: boolean
): Promise<KapSentimentResult> {
  if (!text || typeof text !== 'string') {
    return {
      impactDelta: 0,
      sentimentLabel: 'NÖTR',
      matchedKeywords: [],
      source: 'RULE_BASED_KEYWORDS',
    };
  }

  // 1. Needle-TR Mantığı: Yerel LLM üzerinden Türkçe bağlam analizi
  if (useLocalLLM) {
    try {
      const endpoint = 'http://127.0.0.1:8080/v1/chat/completions';

      const prompt = `Sen uzman bir BIST Finansal NLP analistisisin (Needle-TR mantığı). Aşağıdaki Türkçe KAP bildirimini incele ve hisse fiyatlamasına olan kısa vadeli etkisini JSON olarak belirle:
      
BİLDİRİM:
"${text.slice(0, 800)}"

KURALLAR:
1. SADECE geçerli bir JSON döndür: { "sentiment": "POZİTİF" | "NEGATİF" | "NÖTR", "reasoning": "Kısa açıklama (en fazla 15 kelime)" }
2. Başka metin veya markdown ekleme.`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'local-model',
          messages: [
            {
              role: 'system',
              content:
                'Sen finansal bildirimleri { "sentiment": "POZİTİF/NEGATİF/NÖTR", "reasoning": "..." } JSON formatında puanlayan deterministik bir finansal NLP motorusun.',
            },
            { role: 'user', content: prompt },
          ],
          temperature: 0.1,
          max_tokens: 150,
        }),
        signal: AbortSignal.timeout(2500),
      });

      if (res.ok) {
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content;
        if (typeof content === 'string' && content.trim().length > 0) {
          const cleaned = content.replace(/```json/g, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(cleaned);

          if (parsed && typeof parsed.sentiment === 'string') {
            const rawSent = parsed.sentiment.toUpperCase().trim();
            const sentimentLabel: 'POZİTİF' | 'NÖTR' | 'NEGATİF' =
              rawSent.includes('POZ') ? 'POZİTİF' : rawSent.includes('NEG') ? 'NEGATİF' : 'NÖTR';
            const impactDelta =
              sentimentLabel === 'POZİTİF' ? 35 : sentimentLabel === 'NEGATİF' ? -40 : 0;
            const reasoning = typeof parsed.reasoning === 'string' ? parsed.reasoning.trim() : undefined;

            return {
              impactDelta,
              sentimentLabel,
              matchedKeywords: [`[Needle-TR LLM: ${sentimentLabel}]`],
              reasoning,
              source: 'LOCAL_LLM_NEEDLE_TR',
            };
          }
        }
      }
    } catch {
      // Yerel LLM yanıt veremezse kural tabanlı sisteme geri dön (Qodi Fallback Yasağı)
    }
  }

  // 2. Kural Tabanlı (Keyword) Geri Dönüş
  const normalized = text
    .toLocaleLowerCase('tr-TR')
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, ' ');

  const posWords = [
    'sözleşme', 'sozlesme', 'ihale', 'anlaşma', 'anlasma', 'sipariş', 'siparis', 'kâr', 'kar', 'onay',
    'büyüme', 'buyume', 'yatırım', 'yatirim', 'ihracat', 'temettü', 'temettu', 'iş birliği', 'is birligi',
    'ortaklık', 'ortaklik', 'satış artışı', 'satis artisi', 'lisans', 'kapasite artışı', 'kapasite artisi', 'teşvik', 'tesvik',
  ];

  const negWords = [
    'soruşturma', 'sorusturma', 'ceza', 'dava', 'iptal', 'zarar', 'tedbir', 'iflas', 'konkordato', 'fesih',
    'haciz', 'uyarı', 'uyari', 'kayıp', 'kayip', 'durdurma', 'erteleme', 'istifa', 'vbts', 'brüt takas', 'brut takas',
  ];

  const matchedKeywords: string[] = [];
  let score = 0;

  for (const word of posWords) {
    if (normalized.includes(word)) {
      score += 15;
      matchedKeywords.push(`+${word}`);
    }
  }

  for (const word of negWords) {
    if (normalized.includes(word)) {
      score -= 20;
      matchedKeywords.push(`-${word}`);
    }
  }

  const clampedScore = Math.max(-100, Math.min(100, score));
  const sentimentLabel: 'POZİTİF' | 'NÖTR' | 'NEGATİF' =
    clampedScore > 10 ? 'POZİTİF' : clampedScore < -10 ? 'NEGATİF' : 'NÖTR';

  return {
    impactDelta: clampedScore,
    sentimentLabel,
    matchedKeywords,
    source: 'RULE_BASED_KEYWORDS',
  };
}
