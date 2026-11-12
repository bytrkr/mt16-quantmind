// src/services/anomalies/valueQualityAnomaly.ts
/**
 * MT16 Değer ve Finansal Kalite Anomali Servisi (ValueQualityAnomalyService)
 * Piotroski F-Skoru (>= 7), Beneish M-Skoru (<-1.78) ve çarpan iskonto oranını (PD/DD, F/K)
 * harmanlayarak "Kaliteli Değer Hissesi Anomali Skoru" üretir ve adli muhasebe denetimi yapar.
 */

export interface ValueQualityInput {
  piotroskiScore?: number;
  beneishMScore?: number;
  peRatio?: number;
  pbRatio?: number;
  roePct?: number;
  sectorMedianPe?: number;
  sectorMedianPb?: number;
}

export type QualityVerdict =
  | 'STRONG_VALUE_QUALITY'
  | 'MODERATE_VALUE'
  | 'EXPENSIVE_GROWTH'
  | 'FORENSIC_DISTRESS_RISK';

export interface ValueQualityAnomalyResult {
  piotroskiScore: number;
  beneishMScore: number;
  isQualityValueStock: boolean;
  isFinancialDistressRisk: boolean;
  isEarningsManipulationRisk: boolean;
  valuationDiscountPct: number;
  qualityScore: number;
  verdict: QualityVerdict;
  description: string;
}

export class ValueQualityAnomalyService {
  public static analyze(input?: ValueQualityInput): ValueQualityAnomalyResult {
    const pScoreRaw = input?.piotroskiScore;
    const bScoreRaw = input?.beneishMScore;
    const peRaw = input?.peRatio;
    const pbRaw = input?.pbRatio;
    const roeRaw = input?.roePct;
    const secPeRaw = input?.sectorMedianPe;
    const secPbRaw = input?.sectorMedianPb;

    const piotroskiScore = pScoreRaw !== null && pScoreRaw !== undefined ? pScoreRaw : 6;
    const beneishMScore = bScoreRaw !== null && bScoreRaw !== undefined ? bScoreRaw : -2.25;
    const peRatio = peRaw !== null && peRaw !== undefined ? peRaw : 12.0;
    const pbRatio = pbRaw !== null && pbRaw !== undefined ? pbRaw : 2.0;
    const roePct = roeRaw !== null && roeRaw !== undefined ? roeRaw : 20.0;
    const sectorMedianPe = secPeRaw !== null && secPeRaw !== undefined ? secPeRaw : 12.5;
    const sectorMedianPb = secPbRaw !== null && secPbRaw !== undefined ? secPbRaw : 2.2;

    const isEarningsManipulationRisk = beneishMScore > -1.78;
    const isFinancialDistressRisk = piotroskiScore <= 3 || beneishMScore > -1.49;

    const peDiscount = sectorMedianPe > 0 && peRatio > 0
      ? ((sectorMedianPe - peRatio) / sectorMedianPe) * 100
      : 0;

    const pbDiscount = sectorMedianPb > 0 && pbRatio > 0
      ? ((sectorMedianPb - pbRatio) / sectorMedianPb) * 100
      : 0;

    const valuationDiscountPct = Number(((peDiscount * 0.5) + (pbDiscount * 0.5)).toFixed(1));

    const isQualityValueStock =
      piotroskiScore >= 7 &&
      !isEarningsManipulationRisk &&
      (valuationDiscountPct >= 5 || (peRatio > 0 && peRatio <= 10 && pbRatio <= 2.0));

    const piotroskiComponent = Math.min(45, (piotroskiScore / 9) * 45);

    let beneishComponent = 0;
    if (beneishMScore <= -2.5) {
      beneishComponent = 30;
    } else if (beneishMScore < -1.78) {
      beneishComponent = 15 + (( -1.78 - beneishMScore ) / 0.72) * 15;
    } else {
      beneishComponent = Math.max(0, 10 - ((beneishMScore - (-1.78)) * 15));
    }

    let discountComponent = 12.5;
    if (valuationDiscountPct > 0) {
      discountComponent = Math.min(25, 12.5 + (valuationDiscountPct / 100) * 12.5);
    } else {
      discountComponent = Math.max(0, 12.5 + (valuationDiscountPct / 100) * 12.5);
    }

    const rawQualityScore = Math.round(piotroskiComponent + beneishComponent + discountComponent);
    const qualityScore = Math.max(0, Math.min(100, rawQualityScore));

    let verdict: QualityVerdict = 'MODERATE_VALUE';
    let description = 'Finansal metrikler ve çarpanlar sektör ortalamaları ile uyumlu seyrediyor.';

    if (isFinancialDistressRisk || isEarningsManipulationRisk) {
      verdict = 'FORENSIC_DISTRESS_RISK';
      description = `Adli muhasebe uyarısı: Beneish M-Skor (${beneishMScore.toFixed(2)}) ve F-Skor (${piotroskiScore}/9) bilanço şeffaflığı riski işaret ediyor.`;
    } else if (isQualityValueStock && qualityScore >= 75) {
      verdict = 'STRONG_VALUE_QUALITY';
      description = `Güçlü Değer Anomalisi: Piotroski ${piotroskiScore}/9, temiz adli skor (M: ${beneishMScore.toFixed(2)}) ve sektöre göre %${valuationDiscountPct} iskontolu.`;
    } else if (valuationDiscountPct < -30) {
      verdict = 'EXPENSIVE_GROWTH';
      description = `Hisse sektör çarpanlarına göre %${Math.abs(valuationDiscountPct).toFixed(1)} primli işlem görüyor (Büyüme/Momentum fiyatlaması).`;
    }

    return {
      piotroskiScore,
      beneishMScore: Number(beneishMScore.toFixed(2)),
      isQualityValueStock,
      isFinancialDistressRisk,
      isEarningsManipulationRisk,
      valuationDiscountPct,
      qualityScore,
      verdict,
      description,
    };
  }
}
