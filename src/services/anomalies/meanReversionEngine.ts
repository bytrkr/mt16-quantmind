// src/services/anomalies/meanReversionEngine.ts

export interface MeanReversionMetrics {
  currentPrice: number;
  sma20: number;
  stdDev: number;
}

export interface MeanReversionResult {
  zScore: number;
  isOverbought: boolean;
  isOversold: boolean;
  reversionProbabilityPct: number;
  regime: 'EXTREME_EXPANSION' | 'NORMAL_RANGE' | 'EXTREME_COMPRESSION';
}

export class MeanReversionEngine {
  public static calculate(metrics: MeanReversionMetrics): MeanReversionResult {
    const { currentPrice, sma20, stdDev } = metrics;
    
    if (stdDev <= 0) {
      return {
        zScore: 0,
        isOverbought: false,
        isOversold: false,
        reversionProbabilityPct: 0,
        regime: 'NORMAL_RANGE',
      };
    }

    const zScore = (currentPrice - sma20) / stdDev;
    const absZ = Math.abs(zScore);
    const isOverbought = zScore >= 2.0;
    const isOversold = zScore <= -2.0;

    // Standart sapma açıldıkça ortalamaya dönüş olasılığı artar (tavan %95)
    let reversionProbabilityPct = Math.min(absZ * 35, 95);

    let regime: 'EXTREME_EXPANSION' | 'NORMAL_RANGE' | 'EXTREME_COMPRESSION' = 'NORMAL_RANGE';
    if (absZ >= 2.5) {
      regime = 'EXTREME_EXPANSION';
    } else if (absZ <= 0.5) {
      regime = 'EXTREME_COMPRESSION';
    }

    return {
      zScore: Number(zScore.toFixed(2)),
      isOverbought,
      isOversold,
      reversionProbabilityPct: Number(reversionProbabilityPct.toFixed(1)),
      regime,
    };
  }
}
