// shared/types/obi.ts
/**
 * 2. KUANT, SİNYAL VE ANOMALİ MODÜLLERİ - OBI
 * Order Book Imbalance (OBI) verisi ve L2 derinlik baskı oranlarını tanımlar.
 */

export type OrderBookImbalanceRatio = number; // -1.0 ile +1.0 arası

export type L2DepthPressure = 'BULLISH_PRESS' | 'BEARISH_PRESS' | 'NEUTRAL';

export interface OBIData {
  obiRatio: OrderBookImbalanceRatio;
  pressure: L2DepthPressure;
  bidVolumeTotal: number;
  askVolumeTotal: number;
  timestamp: string;
}
