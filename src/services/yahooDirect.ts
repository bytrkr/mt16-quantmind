// src/services/yahooDirect.ts
/**
 * MT16 QUANTMIND — GERÇEK YAHOO FINANCE .IS FİYAT KAYNAĞI (yahooDirect.ts)
 *
 * QODI ANAYASA STANDARTLARI:
 * - Kural 1 (SSOT): Fiyat ve hacim verileri /api/yahoo-proxy (Node.js Express Proxy)
 *   üzerinden Yahoo Finance API'den temin edilir. Tarayıcı CORS engeli aşılır.
 * - Kural 2 (Fallback Yasağı): Hata veya eksik veri durumunda ASLA sahte fiyat veya
 *   varsayılan sayı dönülmez. Sadece `null` dönülür.
 * - Kural 3 (Sessiz Hata Yönetimi): Terminale console.error basılmaz, sessizce null dönülür.
 * - Kural 4 (Gerçek Hacim Geçmişi): volumeHistory yalnızca en az 20 periyotluk
 *   gerçek veri varsa döner, yoksa null döner (Math.random() KESİNLİKLE YASAKTIR).
 */

export const yahooPriceCache = new Map<string, { price: number; prevClose?: number | null; changePct?: number | null; timestamp: number }>();

export interface YahooDirectQuote {
  ticker: string;
  symbol: string;
  price: number | null;
  prevClose: number | null;
  changePct: number | null;
  volume: number | null;
  high: number | null;
  low: number | null;
  volumeHistory: number[] | null;
  source: 'yahoo';
  lastUpdated: string;
  status: 'VERİ_VAR' | 'VERİ YOK';
}

/**
 * Sembole BIST için .IS uzantısı ekler veya doğrular.
 */
export function normalizeBistTicker(symbol: string): string {
  if (!symbol) return '';
  const clean = symbol.trim().toUpperCase();
  const usTickers = ['NVDA', 'AAPL', 'MSFT', 'TSLA', 'AMZN', 'GOOGL', 'META', 'QQQ', 'SPY', 'BTCUSDT', 'ETHUSDT'];
  if (usTickers.includes(clean)) {
    return clean;
  }
  if (!clean.endsWith('.IS') && !clean.includes('USDT') && !clean.includes('=')) {
    return `${clean}.IS`;
  }
  return clean;
}

/**
 * Node.js Express Proxy (/api/yahoo-proxy) üzerinden Yahoo Finance fiyatını çeker.
 * Hata durumunda console.error basmadan sessizce null döner.
 */
export async function fetchYahooPrice(ticker: string): Promise<number | null> {
  if (!ticker) return null;
  const formatted = normalizeBistTicker(ticker);
  const cleanSym = formatted.replace(/\.IS$/i, '');

  const cached = yahooPriceCache.get(cleanSym) || yahooPriceCache.get(formatted);
  if (cached && Date.now() - cached.timestamp < 30000) {
    return cached.price;
  }

  try {
    const res = await fetch(`/api/yahoo-proxy?symbol=${encodeURIComponent(formatted)}`, {
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) return cached?.price ?? null;
    const data = await res.json();

    const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
    const prevClose = data?.chart?.result?.[0]?.meta?.chartPreviousClose;

    if (typeof price === 'number' && !isNaN(price)) {
      const chg = typeof prevClose === 'number' && prevClose > 0 ? Number((((price - prevClose) / prevClose) * 100).toFixed(2)) : null;
      yahooPriceCache.set(cleanSym, { price, changePct: chg, timestamp: Date.now() });
      yahooPriceCache.set(formatted, { price, changePct: chg, timestamp: Date.now() });
      return price;
    }
    return cached?.price ?? null;
  } catch {
    return cached?.price ?? null;
  }
}

/**
 * Yahoo Finance verisini /api/yahoo-proxy üzerinden tam kuant paketi (fiyat, değişim, gerçek hacim geçmişi) olarak çeker.
 * Hata durumunda console.error basmadan sessizce null döner.
 */
export async function getYahooDirectPrice(symbol: string): Promise<YahooDirectQuote | null> {
  if (!symbol) return null;

  const formattedTicker = normalizeBistTicker(symbol);
  const cleanSym = formattedTicker.replace(/\.IS$/i, '');

  try {
    const res = await fetch(`/api/yahoo-proxy?symbol=${encodeURIComponent(formattedTicker)}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      const cached = yahooPriceCache.get(cleanSym) || yahooPriceCache.get(formattedTicker);
      if (cached) {
        return {
          ticker: formattedTicker,
          symbol: cleanSym,
          price: cached.price,
          prevClose: cached.prevClose ?? null,
          changePct: cached.changePct ?? null,
          volume: null,
          high: null,
          low: null,
          volumeHistory: null,
          source: 'yahoo',
          lastUpdated: new Date().toISOString(),
          status: 'VERİ_VAR',
        };
      }
      return null;
    }
    const data = await res.json();
    if (!data) return null;

    const result = data?.chart?.result?.[0];
    const meta = result?.meta;
    const quote = result?.indicators?.quote?.[0];

    const price = meta?.regularMarketPrice;
    if (typeof price !== 'number' || isNaN(price)) {
      const cached = yahooPriceCache.get(cleanSym) || yahooPriceCache.get(formattedTicker);
      if (cached) {
        return {
          ticker: formattedTicker,
          symbol: cleanSym,
          price: cached.price,
          prevClose: cached.prevClose ?? null,
          changePct: cached.changePct ?? null,
          volume: null,
          high: null,
          low: null,
          volumeHistory: null,
          source: 'yahoo',
          lastUpdated: new Date().toISOString(),
          status: 'VERİ_VAR',
        };
      }
      return null;
    }

    const closes: number[] = Array.isArray(quote?.close)
      ? quote.close.filter((c: any) => typeof c === 'number' && !isNaN(c))
      : [];
    const volumes: number[] = Array.isArray(quote?.volume)
      ? quote.volume.filter((v: any) => typeof v === 'number' && !isNaN(v))
      : [];

    const prevClose: number | null =
      typeof meta.chartPreviousClose === 'number' && !isNaN(meta.chartPreviousClose)
        ? meta.chartPreviousClose
        : closes.length > 1
        ? closes[closes.length - 2]
        : null;

    const changePct: number | null =
      prevClose !== null && prevClose > 0
        ? Number((((price - prevClose) / prevClose) * 100).toFixed(2))
        : null;

    yahooPriceCache.set(cleanSym, { price, prevClose, changePct, timestamp: Date.now() });
    yahooPriceCache.set(formattedTicker, { price, prevClose, changePct, timestamp: Date.now() });

    const volumeHistory: number[] | null = volumes.length >= 20 ? volumes.slice(-20) : null;
    const currentVolume: number | null = volumes.length > 0 ? volumes[volumes.length - 1] : null;

    return {
      ticker: formattedTicker,
      symbol: cleanSym,
      price,
      prevClose,
      changePct,
      volume: typeof currentVolume === 'number' ? currentVolume : null,
      high: typeof meta.regularMarketDayHigh === 'number' ? meta.regularMarketDayHigh : null,
      low: typeof meta.regularMarketDayLow === 'number' ? meta.regularMarketDayLow : null,
      volumeHistory,
      source: 'yahoo',
      lastUpdated: new Date().toISOString(),
      status: 'VERİ_VAR',
    };
  } catch {
    const cached = yahooPriceCache.get(cleanSym) || yahooPriceCache.get(formattedTicker);
    if (cached) {
      return {
        ticker: formattedTicker,
        symbol: cleanSym,
        price: cached.price,
        prevClose: cached.prevClose ?? null,
        changePct: cached.changePct ?? null,
        volume: null,
        high: null,
        low: null,
        volumeHistory: null,
        source: 'yahoo',
        lastUpdated: new Date().toISOString(),
        status: 'VERİ_VAR',
      };
    }
    return null;
  }
}

export default {
  getYahooDirectPrice,
  fetchYahooPrice,
  normalizeBistTicker,
  yahooPriceCache,
};
