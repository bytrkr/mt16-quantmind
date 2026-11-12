// src/services/api.ts
import { BIST_FULL_REGISTRY, BISTStockItem } from '../constants/bistRegistry';
import { fetchRealTimePrices, ALL_BIST_STOCKS } from '../data/bistAllStocks';

export const BASE_API_URL = '';

export interface ApiStockResponse {
  data?: BISTStockItem[];
  stocks?: BISTStockItem[];
  result?: BISTStockItem[];
  [key: string]: unknown;
}

export async function getStocks(): Promise<BISTStockItem[]> {
  try {
    const res = await fetch('/api/stocks', {
      headers: {
        Accept: 'application/json',
      },
    });
    if (res.ok) {
      const data: ApiStockResponse | BISTStockItem[] = await res.json();
      let rawList: BISTStockItem[] = [];
      if (Array.isArray(data)) rawList = data;
      else if (data && Array.isArray(data.data)) rawList = data.data;
      else if (data && Array.isArray(data.stocks)) rawList = data.stocks;
      else if (data && Array.isArray(data.result)) rawList = data.result;

      if (rawList.length > 0) return rawList;
    }
  } catch (_e) {
    // Client-side fallback
  }

  // Qodi Kuralı: Gerçek Alpaca / Canlı Veri Servisinden taze fiyatları çek
  try {
    await fetchRealTimePrices();
  } catch (_e) {
    // Ignore
  }

  return ALL_BIST_STOCKS.map(s => ({
    code: s.code,
    symbol: s.symbol,
    ticker: s.ticker,
    name: s.name,
    sector: s.sector,
    market: (s.market as 'Yıldız' | 'Ana' | 'Alt') || 'Yıldız',
    price: s.price ?? null,
    rate: s.rate ?? null,
    healthScore: s.healthScore
  }));
}

export const fetchBistStocks = async (): Promise<BISTStockItem[]> => {
  return getStocks();
};

export {
  inferMarketType,
  fetchUniversalRegistry,
  fetchUniversalMarketData,
  type UniversalMarketType,
  type UniversalMarketData,
  type UniversalRegistryResponse
} from './universalApi';

export default {
  BASE_API_URL,
  getStocks,
  fetchBistStocks,
};
