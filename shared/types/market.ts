// shared/types/market.ts
/**
 * 1. TEMEL PİYASA MODÜLÜ
 * Evrensel piyasa tipleri, fiyat teklifleri ve piyasa veri anlık görüntülerini tanımlar.
 */

export type MarketType = 'BIST' | 'NASDAQ' | 'CRYPTO' | 'FOREX';

export interface PriceQuote {
  symbol: string;
  market: MarketType;
  price: number | null;
  changePct: number | null;
  high: number | null;
  low: number | null;
  volume: number | null;
  timestamp: string;
  status: string;
}

export interface MarketDataSnapshot {
  market: MarketType;
  ticker: string;
  symbol: string;
  price: number | null;
  dayChangePct: number | null;
  isLiveVerified: boolean;
  lastUpdatedAt: string;
  status: string;
}
