// src/data/bistAllStocks.ts
import { BIST_FULL_REGISTRY, BISTStockItem } from '../constants/bistRegistry';
import { updateHisselerFromAlpaca } from './hisseler';
import { updatePriceCache, getCachedPrice } from '../db/initDb';

export interface BISTStock {
  code: string;
  ticker: string;
  symbol: string;
  name: string;
  sector: string;
  market?: string;
  marketCap?: number | null;
  pe?: number | null;
  peg?: number | null;
  price: number | null;
  rate: number | null;
  fairValue?: number;
  fairValuePotentialPct?: number;
  analystTarget?: number;
  targetPotentialPct?: number;
  healthScore?: number;
  indices?: string[];
  lastUpdated?: string;
  dataStatus?: 'VERİ_VAR' | 'İŞLEM DURDURULDU (VERİ YOK)';
}

export const ALL_BIST_STOCKS: BISTStock[] = BIST_FULL_REGISTRY.map((item: BISTStockItem) => {
  const code = item.code || item.symbol.replace(/\.IS$/i, '');
  const ticker = item.ticker || (item.symbol.includes('.IS') ? item.symbol : `${code}.IS`);
  
  // Qodi Kuralı: Sahte || 50, || 10 varsayılanları KALDIRILDI. Veri yoksa null döner.
  const cached = getCachedPrice(ticker);
  const initialPrice = item.price ?? cached?.price ?? null;

  return {
    code,
    ticker,
    symbol: ticker,
    name: item.name,
    sector: item.sector,
    market: item.market || 'Yıldız',
    marketCap: item.marketCap ?? null,
    pe: item.pe ?? null,
    peg: item.peg ?? null,
    price: initialPrice,
    rate: item.rate ?? null,
    fairValue: item.fairValue,
    fairValuePotentialPct: item.fairValuePotentialPct,
    analystTarget: item.analystTarget,
    targetPotentialPct: item.targetPotentialPct,
    healthScore: item.healthScore,
    indices: item.indices || ['XUTUM'],
    dataStatus: initialPrice !== null ? 'VERİ_VAR' : 'İŞLEM DURDURULDU (VERİ YOK)'
  };
});

export const bistAllStocks = ALL_BIST_STOCKS;

/**
 * Alpaca API ve Gerçek Zamanlı Veri Sağlayıcıdan Fiyat Çeken Asenkron Fonksiyon.
 * Qodi Kuralı: Fiyat bulunamazsa asla varsayılan üretmez, null atar ve 'İŞLEM DURDURULDU (VERİ YOK)' uyarısı döner.
 */
export async function fetchRealTimePrices(symbols?: string[]): Promise<Record<string, BISTStock>> {
  const targetSymbols = symbols && symbols.length > 0 
    ? symbols 
    : ALL_BIST_STOCKS.slice(0, 30).map(s => s.ticker);

  const priceMap: Record<string, { price: number | null; rate: number | null; status: 'VERİ_VAR' | 'İŞLEM DURDURULDU (VERİ YOK)' }> = {};

  try {
    for (const sym of targetSymbols) {
      const cleanSym = sym.replace('.IS', '');
      let price: number | null = null;
      let rate: number | null = null;

      try {
        const res = await fetch(`/api/alpaca-proxy?symbol=${encodeURIComponent(cleanSym)}`);
        if (res.ok) {
          const data = await res.json();
          if (data?.trade?.p) {
            price = Number(data.trade.p);
          }
        }
      } catch (e) {
        console.warn(`[ALPACA API WARN] ${sym} için canlı veri alınamadı:`, e);
      }

      // Qodi Kuralı: Eğer Alpaca API'den fiyat alınamazsa sahte 50/100 DEĞERİ BASILMAZ, NULL kalır!
      const finalStatus = price !== null ? 'VERİ_VAR' : 'İŞLEM DURDURULDU (VERİ YOK)';
      priceMap[sym] = { price, rate, status: finalStatus };

      // Bellek ve Cache Güncelleme
      const stockObj = ALL_BIST_STOCKS.find(s => s.ticker === sym || s.code === cleanSym);
      if (stockObj) {
        stockObj.price = price;
        stockObj.rate = rate;
        stockObj.dataStatus = finalStatus;
        stockObj.lastUpdated = new Date().toISOString();
      }

      updatePriceCache(sym, price, finalStatus);
    }

    // hisseler.js sözlüğünü canlı verilerle senkronize et
    updateHisselerFromAlpaca(priceMap);

  } catch (error) {
    console.error('[REALTIME PRICE FETCH ERROR] Canlı veri hattı hatası:', error);
  }

  const resultMap: Record<string, BISTStock> = {};
  ALL_BIST_STOCKS.forEach(s => {
    resultMap[s.ticker] = s;
  });

  return resultMap;
}

export function searchBISTStocks(query: string): BISTStock[] {
  if (!query) return [];
  const q = query.toLowerCase().trim();
  return ALL_BIST_STOCKS.filter((stock) => {
    return (
      stock.code.toLowerCase().includes(q) ||
      stock.ticker.toLowerCase().includes(q) ||
      stock.name.toLowerCase().includes(q) ||
      stock.sector.toLowerCase().includes(q)
    );
  });
}

export default ALL_BIST_STOCKS;

