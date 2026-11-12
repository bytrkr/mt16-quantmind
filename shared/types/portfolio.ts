// shared/types/portfolio.ts
/**
 * 5. RİSK, PORTFÖY VE OTONOM MOTOR MODÜLLERİ - PORTFOLIO
 * Kullanıcı pozisyonları, Kar/Zarar metrikleri ve portföy özetlerini tanımlar.
 */

import { MarketType } from './market';

export interface PnLMetrics {
  realizedPnL: number;
  unrealizedPnL: number;
  totalPnLPct: number;
  dailyPnL: number;
}

export interface UserPositionItem {
  id: string;
  symbol: string;
  market: MarketType;
  side: 'LONG' | 'SHORT';
  entryPrice: number;
  currentPrice: number;
  amount: number;
  currentNotional: number;
  pnl: PnLMetrics;
  openTime: string;
}

export interface PortfolioSummary {
  totalEquity: number;
  cashBalance: number;
  marginUsed: number;
  freeMargin: number;
  positions: UserPositionItem[];
  pnlSummary: PnLMetrics;
  updatedAt: string;
}
