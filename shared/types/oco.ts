// shared/types/oco.ts
/**
 * 5. RİSK, PORTFÖY VE OTONOM MOTOR MODÜLLERİ - OCO
 * OCO (One-Cancels-the-Other) emir kuralları, Stop-Loss ve Take-Profit yapılandırmalarını tanımlar.
 */

import { MarketType } from './market';

export interface StopLossConfig {
  price: number;
  distancePct: number;
  trailingStop: boolean;
  trailingDistancePct?: number;
}

export interface TakeProfitConfig {
  price: number;
  distancePct: number;
  partialExitPct?: number;
}

export interface OCOOrderRule {
  orderId: string;
  symbol: string;
  market: MarketType;
  side: 'BUY' | 'SELL';
  quantity: number;
  triggerPrice: number;
  stopLoss: StopLossConfig;
  takeProfit: TakeProfitConfig;
  status: 'PENDING' | 'EXECUTED' | 'CANCELLED' | 'REJECTED';
  createdAt: string;
}
