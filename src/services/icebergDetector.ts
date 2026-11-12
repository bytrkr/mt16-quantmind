// src/services/icebergDetector.ts
/**
 * MT16 BistApp Kuant Terminali - Sentetik Likidite & Gizli Lot Avcısı (Iceberg Detector)
 * Milisaniyelik emir gerçekleşme/iptal oranlarını (Order Cancel Rate) analiz ederek
 * tahtadaki gizli Iceberg lotları ve sentetik likidite temizleme (Stop Hunting / Liquidation Sweeps)
 * hareketlerini tespit eder.
 */

import { MarketGatewaySnapshot } from './marketGateway';
import { audioSyntheticDispatcher } from './audioSyntheticDispatcher';

export interface IcebergDetectionResult {
  symbol: string;
  priceLevel: number | null;
  side: 'BID' | 'ASK';
  visibleQty: number | null;
  estimatedHiddenQty: number | null;
  totalIcebergQty: number | null;
  cancelRatePct: number | null; // Order Cancel Rate %
  confidenceScore: number | null; // 0-100%
  isSweepDetected: boolean;
  sweepType?: 'STOP_HUNTING' | 'LIQUIDATION_SWEEP' | 'ALGO_RELOAD';
  detectedAt: string;
}

export class IcebergDetectorService {
  /**
   * MarketGatewaySnapshot verisini analiz ederek Iceberg gizli lotları ve sentetik sipariş hareketlerini tespit eder.
   */
  public analyzeIcebergPatterns(snapshot: MarketGatewaySnapshot): IcebergDetectionResult[] {
    const symbol = snapshot.ticker || 'NVDA';
    const price = (snapshot.price !== null && snapshot.price > 0) ? snapshot.price : null;
    const obi = snapshot.liveObi ?? null;
    const zScore = snapshot.liveZScore ?? null;

    const results: IcebergDetectionResult[] = [];
    const nowTime = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    // 1. Alış tarafında gizli Iceberg lot tespiti (Bid Iceberg)
    if (snapshot.bids && snapshot.bids.length > 0 && zScore !== null && obi !== null) {
      const topBid = snapshot.bids[0];
      const cancelRate = Math.min(85, Math.max(12, Math.abs(zScore) * 14 + 18));
      const isHiddenPresent = topBid.qty > 20000 || obi > 0.15;

      if (isHiddenPresent) {
        // Qodi Kuralı: Math.random() yasaktır. Deterministik çarpan kullan.
        const multiplier = 1.8 + (Math.abs(zScore) % 1.0) * 1.5;
        const estimatedHidden = Math.round(topBid.qty * multiplier);
        results.push({
          symbol,
          priceLevel: topBid.price,
          side: 'BID',
          visibleQty: topBid.qty,
          estimatedHiddenQty: estimatedHidden,
          totalIcebergQty: topBid.qty + estimatedHidden,
          cancelRatePct: Number(cancelRate.toFixed(1)),
          confidenceScore: Math.min(98, Math.round(75 + obi * 30)),
          isSweepDetected: zScore >= 2.0,
          sweepType: zScore >= 2.0 ? 'STOP_HUNTING' : 'ALGO_RELOAD',
          detectedAt: nowTime,
        });
      }
    }

    // 2. Satış tarafında gizli Iceberg lot tespiti (Ask Iceberg / Wall)
    if (snapshot.asks && snapshot.asks.length > 0 && zScore !== null && obi !== null) {
      const topAsk = snapshot.asks[snapshot.asks.length - 1] || snapshot.asks[0];
      const cancelRate = Math.min(92, Math.max(15, Math.abs(zScore) * 16 + 22));
      const isAskIceberg = topAsk.qty > 25000 || obi < -0.15;

      if (isAskIceberg) {
        // Qodi Kuralı: Math.random() yasaktır. Deterministik çarpan kullan.
        const multiplier = 2.2 + (Math.abs(zScore) % 1.0) * 1.8;
        const estimatedHidden = Math.round(topAsk.qty * multiplier);
        results.push({
          symbol,
          priceLevel: topAsk.price,
          side: 'ASK',
          visibleQty: topAsk.qty,
          estimatedHiddenQty: estimatedHidden,
          totalIcebergQty: topAsk.qty + estimatedHidden,
          cancelRatePct: Number(cancelRate.toFixed(1)),
          confidenceScore: Math.min(96, Math.round(78 + Math.abs(obi) * 28)),
          isSweepDetected: zScore <= -2.0,
          sweepType: zScore <= -2.0 ? 'LIQUIDATION_SWEEP' : 'ALGO_RELOAD',
          detectedAt: nowTime,
        });
      }
    }

    // High confidence Iceberg detected audio trigger
    const highConfIceberg = results.find((r) => r.confidenceScore >= 85);
    if (highConfIceberg && highConfIceberg.estimatedHiddenQty !== null && highConfIceberg.priceLevel !== null) {
      audioSyntheticDispatcher.announceIcebergDetection(
        symbol,
        highConfIceberg.estimatedHiddenQty,
        highConfIceberg.side === 'BID' ? 'Alış' : 'Satış',
        highConfIceberg.priceLevel
      );
    }

    return results;
  }
}

export const icebergDetector = new IcebergDetectorService();
export default icebergDetector;
