// shared/types/signals.ts
/**
 * 2. KUANT, SİNYAL VE ANOMALİ MODÜLLERİ - SIGNALS
 * OCO sinyal kartları, karar tipleri ve güven skorlarını tanımlar.
 */

import { MarketType } from './market';

export type SignalVerdict = 'BUY' | 'SELL' | 'HOLD' | 'STRONG_BUY' | 'STRONG_SELL';

export type ConfidenceScore = number; // 0..100

export interface OCOSignalCard {
  signalId: string;
  timestamp: string;
  market: MarketType;
  symbol: string;
  side: 'BUY' | 'SELL';
  verdict: SignalVerdict;
  entryPrice: number | null;
  takeProfitPrice: number | null;
  stopLossPrice: number | null;
  obi: number | null;
  zScore: number | null;
  juryConfidence: ConfidenceScore | null;
  status: 'ACTIVE' | 'FILLED' | 'CANCELLED' | 'EXPIRED';
}
