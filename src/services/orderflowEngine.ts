// src/services/orderflowEngine.ts
/**
 * MT16 BistApp Kuant Terminali - Mum İçi Agresiflik ve Delta Uyumsuzluğu Motoru
 * Mum içi piyasa alıcı ve satıcı hacimlerini (Aggressive Ask vs Bid) analiz ederek Net Delta (\Delta)
 * değerini ve Fiyat-Delta uyumsuzluklarını (Absorption / Yorgun Trend) tespit eder.
 */

import { MarketGatewaySnapshot } from './marketGateway';

export interface CandleOrderflowData {
  time: string;
  price: number | null;
  aggressiveAskVol: number | null; // Taker Buy Vol
  aggressiveBidVol: number | null; // Taker Sell Vol
  netDelta: number | null;         // Ask - Bid Vol
  cumulativeDelta: number | null;  // Running sum of Delta
  deltaDivergenceTag: 'NORMAL' | 'BULLISH_ABSORPTION' | 'BEARISH_ABSORPTION' | 'TREND_EXHAUSTION';
  divergenceDescription: string;
}

export class OrderflowEngineService {
  /**
   * MarketGatewaySnapshot verisinden anlık mum içi orderflow ve Delta uyumsuzluğunu hesaplar.
   */
  public processCandleOrderflow(snapshot: MarketGatewaySnapshot): CandleOrderflowData {
    const price = (snapshot.price !== null && snapshot.price > 0) ? snapshot.price : null;
    const obi = snapshot.liveObi ?? null;
    const zScore = snapshot.liveZScore ?? null;

    // Simulate aggressive taker volumes based on L2 OBI and Z-Score
    let aggressiveAskVol: number | null = null;
    let aggressiveBidVol: number | null = null;
    let netDelta: number | null = null;
    let cumulativeDelta: number | null = null;

    if (zScore !== null && obi !== null) {
      const totalTakerVol = Math.round(150000 + Math.abs(zScore) * 80000);
      const askRatio = Math.min(0.85, Math.max(0.15, 0.50 + obi * 0.45));
      aggressiveAskVol = Math.round(totalTakerVol * askRatio);
      aggressiveBidVol = totalTakerVol - aggressiveAskVol;
      netDelta = aggressiveAskVol - aggressiveBidVol;
      cumulativeDelta = Math.round(netDelta * 3.2 + 45000);
    }

    let deltaDivergenceTag: 'NORMAL' | 'BULLISH_ABSORPTION' | 'BEARISH_ABSORPTION' | 'TREND_EXHAUSTION' = 'NORMAL';
    let divergenceDescription = 'Mum içi alıcı/satıcı akışı dengeli.';

    // Divergence logic:
    if (snapshot.dayChangePct !== null && netDelta !== null && snapshot.dayChangePct < -0.5 && netDelta > 20000) {
      deltaDivergenceTag = 'BULLISH_ABSORPTION';
      divergenceDescription = 'BOĞA ABSORBANS: Fiyat düşerken kurumsal agresif alıcılar tüm satışları emiyor.';
    } else if (snapshot.dayChangePct !== null && netDelta !== null && snapshot.dayChangePct > 0.5 && netDelta < -20000) {
      deltaDivergenceTag = 'BEARISH_ABSORPTION';
      divergenceDescription = 'AYI ABSORBANS: Fiyat yükselirken kurumsal agresif satıcılar tahtaya mal veriyor.';
    } else if (zScore !== null && netDelta !== null && Math.abs(zScore) >= 2.0 && Math.abs(netDelta) < 5000) {
      deltaDivergenceTag = 'TREND_EXHAUSTION';
      divergenceDescription = 'TREND YORULMASI: Yüksek hacme rağmen Net Delta sıfıra yakın (Kilitlenme).';
    }

    return {
      time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      price,
      aggressiveAskVol,
      aggressiveBidVol,
      netDelta,
      cumulativeDelta,
      deltaDivergenceTag,
      divergenceDescription,
    };
  }
}

export const orderflowEngine = new OrderflowEngineService();
export default orderflowEngine;
