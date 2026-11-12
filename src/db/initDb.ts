// src/db/initDb.ts

export interface CachedPriceItem {
  price: number | null;
  status: 'VERİ_VAR' | 'İŞLEM DURDURULDU (VERİ YOK)';
  updatedAt: string;
}

const PRICE_CACHE_KEY = 'MT16_PRICE_CACHE_V2';
const inMemoryCache: Record<string, CachedPriceItem> = {};
const isBrowser = typeof window !== 'undefined' && typeof localStorage !== 'undefined';

/**
 * LocalStorage ve in-memory fiyat önbelleğini yükler.
 * Sahte $100 / $50 varsayılanlarını kesin olarak engeller.
 */
export async function initializeDatabase(): Promise<void> {
  console.log('MT16 Database & Price Cache Initialization starting...');
  if (!isBrowser) {
    console.log('[MT16 DB] Node environment detected; using pure in-memory price cache.');
    return;
  }
  try {
    const raw = localStorage.getItem(PRICE_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, CachedPriceItem>;
      Object.assign(inMemoryCache, parsed);
      console.log(`[MT16 DB] Cache loaded successfully. ${Object.keys(parsed).length} symbols registered.`);
    } else {
      console.log('[MT16 DB] No existing price cache found. Initialized empty cache.');
    }
  } catch (err) {
    console.warn('[MT16 DB WARN] LocalStorage read failed, using pure in-memory cache:', err);
  }
}

/**
 * Belirtilen sembol için güncel doğrulanmış fiyatı cache'e yazar.
 */
export function updatePriceCache(
  symbol: string, 
  price: number | null, 
  status: 'VERİ_VAR' | 'İŞLEM DURDURULDU (VERİ YOK)' = price !== null ? 'VERİ_VAR' : 'İŞLEM DURDURULDU (VERİ YOK)'
): void {
  const item: CachedPriceItem = {
    price,
    status,
    updatedAt: new Date().toISOString()
  };

  inMemoryCache[symbol] = item;

  if (isBrowser) {
    try {
      localStorage.setItem(PRICE_CACHE_KEY, JSON.stringify(inMemoryCache));
    } catch (err) {
      console.warn('[MT16 DB WARN] LocalStorage write failed:', err);
    }
  }
}

/**
 * Cache'ten sembolün son fiyatını okur. Fiyat yoksa null döner, asla sahte değer üretmez.
 */
export function getCachedPrice(symbol: string): CachedPriceItem | null {
  return inMemoryCache[symbol] || null;
}

/**
 * Tüm önbelleği temizler (Denetim & Test amaçlı)
 */
export function clearPriceCache(): void {
  for (const key of Object.keys(inMemoryCache)) {
    delete inMemoryCache[key];
  }
  if (isBrowser) {
    try {
      localStorage.removeItem(PRICE_CACHE_KEY);
    } catch (err) {
      // Ignore
    }
  }
}


