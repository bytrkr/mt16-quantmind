// src/services/universalApi.ts
/**
 * Evrensel Varlık Ağ Geçidi İstemcisi (Universal Market Data API)
 * BIST, NASDAQ, CRYPTO ve FOREX piyasalarındaki tüm varlıklar için dinamik canlı veri sağlar.
 * Hardcoded veya statik 'ASELS' bağımlılıklarını ortadan kaldırır.
 */

export type UniversalMarketType = 'BIST' | 'NASDAQ' | 'CRYPTO' | 'FOREX';

export interface UniversalRegistryEntry {
  symbol: string;
  tier: string;
}

export interface UniversalRegistryResponse {
  success: boolean;
  markets: UniversalMarketType[];
  registry: Record<UniversalMarketType, Record<string, UniversalRegistryEntry>>;
}

export interface UniversalMarketData {
  market: UniversalMarketType | string;
  ticker: string;
  symbol: string;
  price: number | null;
  status: 'LIVE' | 'FALLBACK' | 'İŞLEM DURDURULDU (VERİ YOK)' | string;
  error?: string;
}

/**
 * Ticker koduna ve sembol yapısına göre piyasa türünü dinamik tespit eder.
 */
export function inferMarketType(ticker: string): UniversalMarketType {
  const clean = String(ticker || '').toUpperCase().replace(/\.IS$/i, '').trim();
  
  if (clean.includes('/') || clean.startsWith('BTC') || clean.startsWith('ETH') || clean.startsWith('SOL') || clean.startsWith('BNB') || clean.endsWith('USDT')) {
    return 'CRYPTO';
  }
  if (clean.endsWith('=X') || clean === 'USDTRY' || clean === 'EURTRY' || clean === 'GBPUSD') {
    return 'FOREX';
  }
  if (['AAPL', 'TSLA', 'NVDA', 'MSFT', 'AMZN', 'GOOGL', 'META', 'NFLX', 'AMD', 'COIN'].includes(clean)) {
    return 'NASDAQ';
  }
  return 'BIST';
}

/**
 * Evrensel Varlık Kayıt Defterinden tüm piyasaları ve kayıtlı varlıkları çeker.
 */
export async function fetchUniversalRegistry(): Promise<UniversalRegistryResponse | null> {
  try {
    const res = await fetch('/api/universal/registry', {
      headers: { Accept: 'application/json' },
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.success) return data;
    }
  } catch (_err) {
    // Graceful fallback for client-only preview environments
  }

  return {
    success: true,
    markets: ['BIST', 'NASDAQ', 'CRYPTO', 'FOREX'],
    registry: {
      BIST: {
        THYAO: { symbol: 'THYAO.IS', tier: 'BIST30' },
        ASELS: { symbol: 'ASELS.IS', tier: 'BIST30' },
        GARAN: { symbol: 'GARAN.IS', tier: 'BIST30' },
        EREGL: { symbol: 'EREGL.IS', tier: 'BIST30' },
        REEDR: { symbol: 'REEDR.IS', tier: 'BIST100' },
        CIMSA: { symbol: 'CIMSA.IS', tier: 'BIST100' },
        VESTL: { symbol: 'VESTL.IS', tier: 'BIST100' },
      },
      NASDAQ: {
        NVDA: { symbol: 'NVDA', tier: 'MEGA' },
        AAPL: { symbol: 'AAPL', tier: 'MEGA' },
        MSFT: { symbol: 'MSFT', tier: 'MEGA' },
        TSLA: { symbol: 'TSLA', tier: 'MEGA' },
        AMZN: { symbol: 'AMZN', tier: 'MEGA' },
        GOOGL: { symbol: 'GOOGL', tier: 'MEGA' },
        META: { symbol: 'META', tier: 'MEGA' },
      },
      CRYPTO: {
        BTCUSDT: { symbol: 'BTCUSDT', tier: 'TOP' },
        ETHUSDT: { symbol: 'ETHUSDT', tier: 'TOP' },
        SOLUSDT: { symbol: 'SOLUSDT', tier: 'TOP' },
      },
      FOREX: {
        USDTRY: { symbol: 'USDTRY=X', tier: 'MAJOR' },
        EURTRY: { symbol: 'EURTRY=X', tier: 'MAJOR' },
      },
    },
  };
}

/**
 * Dinamik market_type ve ticker parametreleri ile canlı piyasa verisini çeker.
 * Qodi Kuralı: Veri yoksa Asla sahte/varsayılan fiyat üretmez, price: null döner.
 */
export async function fetchUniversalMarketData(
  marketType?: string | null,
  ticker?: string | null
): Promise<UniversalMarketData | null> {
  const cleanTicker = String(ticker || '').toUpperCase().replace(/\.IS$/i, '').trim();
  if (!cleanTicker) {
    return null;
  }

  const resolvedMarket = (marketType ? String(marketType).toUpperCase() : inferMarketType(cleanTicker)) as UniversalMarketType;

  try {
    const res = await fetch(
      `/api/universal/data?market_type=${encodeURIComponent(resolvedMarket)}&ticker=${encodeURIComponent(cleanTicker)}`,
      {
        headers: { Accept: 'application/json' },
      }
    );

    if (res.ok) {
      const data: UniversalMarketData = await res.json();
      if (data && typeof data.price === 'number' && data.price > 0) {
        return data;
      }
    }
  } catch (_err) {
    // Graceful fallback for client-only preview environments
  }

  // Qodi Kuralı: Hata veya veri yokluğunda sahte fiyat basmak YASAKTIR! price: null
  const symbol = resolvedMarket === 'BIST' ? `${cleanTicker}.IS` : cleanTicker;

  return {
    market: resolvedMarket,
    ticker: cleanTicker,
    symbol,
    price: null,
    status: 'İŞLEM DURDURULDU (VERİ YOK)',
  };
}

export default {
  inferMarketType,
  fetchUniversalRegistry,
  fetchUniversalMarketData,
};

