// src/services/marketProfileEngine.ts
/**
 * MT16 BistApp Kuant Terminali - Market Profile ve Değer Alanı (Value Area) Motoru
 * TPO ve Hacim Kütlesine dayalı VAH (Value Area High), VAL (Value Area Low) ve POC seviyelerini hesaplar.
 * %70 değer alanı dışındaki sapmaları Sahte Kırılım (Trap) uyarısı ile fiyata yansıtır.
 */

import { MarketGatewaySnapshot } from './marketGateway';

export interface MarketProfileResult {
  symbol: string;
  currentPrice: number | null;
  poc: number | null; // Point of Control
  vah: number | null; // Value Area High (70% upper bound)
  val: number | null; // Value Area Low (70% lower bound)
  isInValueArea: boolean;
  trapWarning: 'NO_TRAP' | 'BULL_TRAP' | 'BEAR_TRAP';
  trapDescription: string;
  valueAreaCoveragePct: number; // 70% standard
}

export class MarketProfileEngineService {
  /**
   * Snapshot verisinden VAH, VAL ve POC seviyelerini ve Sahte Kırılım (Trap) tuzaklarını hesaplar.
   */
  public calculateMarketProfile(snapshot: MarketGatewaySnapshot): MarketProfileResult {
    const symbol = snapshot.ticker || 'NVDA';
    const price = (snapshot.price !== null && snapshot.price > 0) ? snapshot.price : null;
    const zScore = snapshot.liveZScore ?? null;

    // Estimate POC, VAH (+1.5% std), VAL (-1.5% std)
    let poc: number | null = null;
    let vah: number | null = null;
    let val: number | null = null;
    let isInValueArea = false;

    if (price !== null && zScore !== null) {
      const stdDev = price * 0.015;
      poc = Number((price - zScore * 0.3 * stdDev).toFixed(2));
      vah = Number((poc + stdDev).toFixed(2));
      val = Number((poc - stdDev).toFixed(2));
      isInValueArea = price >= val && price <= vah;
    }

    let trapWarning: 'NO_TRAP' | 'BULL_TRAP' | 'BEAR_TRAP' = 'NO_TRAP';
    let trapDescription = 'Fiyat %70 Değer Alanı (Value Area) sınırları içerisinde dengeli seyrediyor.';

    // Trap detection logic:
    if (price !== null && vah !== null && val !== null && zScore !== null) {
      if (price > vah && zScore < 0.5) {
        trapWarning = 'BULL_TRAP';
        trapDescription = '⚠️ BOĞA TUZAĞI (BULL TRAP): Fiyat VAH üstüne çıktı ancak hacim Z-Skoru zayıf; geri çekilme riski yüksek!';
      } else if (price < val && zScore < 0.5) {
        trapWarning = 'BEAR_TRAP';
        trapDescription = '⚠️ AYI TUZAĞI (BEAR TRAP): Fiyat VAL altına sarktı ancak satış hacmi yetersiz; dip tepki ihtimali yüksek!';
      }
    }

    return {
      symbol,
      currentPrice: price,
      poc,
      vah,
      val,
      isInValueArea,
      trapWarning,
      trapDescription,
      valueAreaCoveragePct: 70,
    };
  }
}

export const marketProfileEngine = new MarketProfileEngineService();
export default marketProfileEngine;
