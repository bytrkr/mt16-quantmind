// src/services/anomalies/microstructureAnomaly.ts
/**
 * MT16 Mikroyapı & Tahta Manipülasyon Anomali Servisi (MicrostructureAnomalyService)
 * L2 derinlik verisini, OBI dengesizliğini, iptal oranını ve kademe duvarlarını denetleyerek
 * yapay likidite (Spoofing) ve gizli kurumsal lot (Iceberg Order) varlığını tespit eder.
 */

export interface MicrostructureInput {
  bidDepthTotal: number | null;
  askDepthTotal: number | null;
  obi: number | null; // -1.0 ile +1.0
  orderCancelRatePct: number | null; // 0 - 100%
  wallLot: number | null;
  wallPrice: number | null;
  currentPrice: number | null;
  executedVolumeRecent?: number | null;
  displayedTopDepth?: number | null;
}

export type SpoofingRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type IcebergSide = 'BID' | 'ASK' | 'NONE';

export interface MicrostructureAnomalyResult {
  isSpoofingDetected: boolean;
  spoofingRisk: SpoofingRiskLevel;
  isIcebergDetected: boolean;
  icebergSide: IcebergSide;
  estimatedIcebergLot: number | null;
  cancelRatePct: number | null;
  imbalanceRatio: number | null; // bid / (bid + ask)
  microstructureScore: number | null; // 0 - 100 (Anomali / Manipülasyon şiddeti)
  anomalyLabel: string;
  description: string;
}

export class MicrostructureAnomalyService {
  /**
   * L2 derinlik, emir iptal oranı ve kademe verilerini mikroyapı anomalisi açısından değerlendirir.
   */
  public static analyze(input: MicrostructureInput): MicrostructureAnomalyResult {
    const {
      bidDepthTotal,
      askDepthTotal,
      obi,
      orderCancelRatePct,
      wallLot,
      wallPrice,
      currentPrice,
      executedVolumeRecent = null,
      displayedTopDepth = null,
    } = input;

    const totalDepth = (bidDepthTotal !== null && askDepthTotal !== null) ? bidDepthTotal + askDepthTotal : null;
    const imbalanceRatio = (totalDepth !== null && totalDepth > 0 && bidDepthTotal !== null) ? bidDepthTotal / totalDepth : null;

    // 1. Spoofing (Yapay Likidite / Sahte Duvar) Tespiti
    const wallRatio = (totalDepth !== null && totalDepth > 0 && wallLot !== null) ? wallLot / totalDepth : null;
    const isPriceCloseToWall = (currentPrice !== null && currentPrice > 0 && wallPrice !== null) && Math.abs(currentPrice - wallPrice) / currentPrice < 0.025;

    let spoofingRisk: SpoofingRiskLevel = 'LOW';
    let isSpoofingDetected = false;

    if (orderCancelRatePct !== null && wallRatio !== null) {
      if (orderCancelRatePct >= 60 && wallRatio >= 0.28) {
        spoofingRisk = 'CRITICAL';
        isSpoofingDetected = true;
      } else if (orderCancelRatePct >= 42 && (wallRatio >= 0.20 || (obi !== null && Math.abs(obi) >= 0.45))) {
        spoofingRisk = 'HIGH';
        isSpoofingDetected = true;
      } else if (orderCancelRatePct >= 30 && wallRatio >= 0.15) {
        spoofingRisk = 'MEDIUM';
      }
    }

    // 2. Iceberg (Gizli Kurumsal Emir) Tespiti
    let isIcebergDetected = false;
    let icebergSide: IcebergSide = 'NONE';
    let estimatedIcebergLot: number | null = null;

    if (executedVolumeRecent !== null && displayedTopDepth !== null && executedVolumeRecent > 0 && displayedTopDepth > 0) {
      const fillRatio = executedVolumeRecent / displayedTopDepth;
      if (fillRatio >= 2.2) {
        isIcebergDetected = true;
        estimatedIcebergLot = Math.round(executedVolumeRecent * 1.5);
        icebergSide = (obi !== null && obi >= 0) ? 'BID' : 'ASK';
      }
    } else if (wallLot !== null && wallLot > 50000 && isPriceCloseToWall && orderCancelRatePct !== null && orderCancelRatePct < 15) {
      isIcebergDetected = true;
      icebergSide = (wallPrice !== null && currentPrice !== null && wallPrice < currentPrice) ? 'BID' : 'ASK';
      estimatedIcebergLot = Math.round(wallLot * 1.8);
    }

    // 3. Mikroyapı Anomali Skoru (0 - 100)
    let microstructureScore: number | null = null;
    const scores = [
      { v: orderCancelRatePct, w: 0.6, base: 1.0 },
      { v: obi !== null ? Math.abs(obi) * 100 : null, w: 0.25, base: 1.0 },
      { v: wallRatio !== null ? wallRatio * 100 : null, w: 0.35, base: 1.0 }
    ];

    const validScores = scores.filter(x => x.v !== null);
    if (validScores.length > 0) {
      let weightedTotal = 0;
      for (const entry of validScores) {
        weightedTotal += entry.v! * entry.w;
      }
      microstructureScore = Math.min(100, Math.round(
        weightedTotal +
        (isIcebergDetected ? 20 : 0) +
        (isSpoofingDetected ? 25 : 0)
      ));
      microstructureScore = Math.max(0, microstructureScore);
    }

    // 4. Teşhis Etiketi ve Açıklaması
    let anomalyLabel = 'NORMAL_MIKROYAPI';
    let description = 'Tahta mikroyapısı dengeli; yapay likidite veya gizli emir baskısı saptanmadı.';

    if (spoofingRisk === 'CRITICAL' || spoofingRisk === 'HIGH') {
      anomalyLabel = 'SPOOFING_YAPAY_LIKIDITE';
      description = `Yüksek emir iptali (${orderCancelRatePct !== null ? `%${orderCancelRatePct.toFixed(1)}` : '---'}) ve ${wallLot !== null ? wallLot.toLocaleString('tr-TR') : '---'} lotluk duvarda sahte emir (Spoofing) anomalisi tespit edildi.`;
    } else if (isIcebergDetected) {
      anomalyLabel = 'ICEBERG_GIZLI_BLOK';
      description = `${icebergSide} kademesinde yaklaşık ~${estimatedIcebergLot !== null ? estimatedIcebergLot.toLocaleString('tr-TR') : '---'} lotluk gizli kurumsal (Iceberg) alım/satım bloku teyit edildi.`;
    } else if (orderCancelRatePct !== null && orderCancelRatePct >= 35) {
      anomalyLabel = 'YUKSEK_IPTAL_TURBULANSI';
      description = `Kademe iptal oranı %${orderCancelRatePct.toFixed(1)} seviyesinde. Kısa vadeli kademe kayması (slippage) riski mevcut.`;
    }

    return {
      isSpoofingDetected,
      spoofingRisk,
      isIcebergDetected,
      icebergSide,
      estimatedIcebergLot,
      cancelRatePct: orderCancelRatePct !== null ? Number(orderCancelRatePct.toFixed(1)) : null,
      imbalanceRatio: imbalanceRatio !== null ? Number(imbalanceRatio.toFixed(3)) : null,
      microstructureScore,
      anomalyLabel,
      description,
    };
  }
}
