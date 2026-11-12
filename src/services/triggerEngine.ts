// src/services/triggerEngine.ts
/**
 * MT16 Otonom Tetikleme Motoru (TriggerEngine)
 * Z-Skor anomali momentunu ve L2 OBI derinlik baskısını değerlendirerek
 * BEKLE (Hold) durumundan aktif işlem tetiğine (GUCLU_AL, AL, SAT, GUCLU_SAT) geçiş koşullarını (trigger_condition) yönetir.
 */

export interface MarketConditions {
  zScore: number | null;
  obi: number | null;
  juryConsensusPct?: number | null;
  currentPrice?: number | null;
  currentDecision?: 'AL' | 'GÜÇLÜ AL' | 'SAT' | 'BEKLE' | string;
  rsi?: number | null;
}

export interface TriggerAnalysis {
  isTriggered: boolean;
  action: 'GUCLU_AL' | 'AL' | 'BEKLE' | 'SAT' | 'GUCLU_SAT';
  confidencePct: number;
  triggerReason: string;
  triggerConditionText: string;
  alarmLevel: 'CRITICAL' | 'WARNING' | 'NORMAL';
  formattedSummary: string;
}

export class TriggerEngine {
  public static readonly Z_SCORE_ANOMALY_THRESHOLD = 2.0; // ±2.0σ
  public static readonly OBI_IMBALANCE_THRESHOLD = 0.20; // ±0.20
  public static readonly JURY_CONSENSUS_THRESHOLD = 75.0; // %75

  /**
   * Piyasa koşullarını kuant kriterlere göre analiz ederek işlem tetiğini belirler.
   */
  public static evaluateTrigger(conditions: MarketConditions): TriggerAnalysis {
    const {
      zScore,
      obi,
      juryConsensusPct,
      currentPrice,
      rsi,
    } = conditions;

    if (zScore === null || zScore === undefined || obi === null || obi === undefined) {
      const safeConsensus = juryConsensusPct !== null && juryConsensusPct !== undefined ? juryConsensusPct : 50;
      return {
        isTriggered: false,
        action: 'BEKLE',
        confidencePct: Math.round(safeConsensus),
        triggerReason: 'Yetersiz canlı piyasa verisi (Z-Skor veya OBI null).',
        triggerConditionText: 'VERİ YOK',
        alarmLevel: 'NORMAL',
        formattedSummary: 'BEKLE | Yetersiz Veri (Z: ---, OBI: ---)',
      };
    }

    const consensus = juryConsensusPct !== null && juryConsensusPct !== undefined ? juryConsensusPct : 70;
    const rsiVal = rsi !== null && rsi !== undefined ? rsi : 50;

    const isZPositive = zScore >= TriggerEngine.Z_SCORE_ANOMALY_THRESHOLD;
    const isZNegative = zScore <= -TriggerEngine.Z_SCORE_ANOMALY_THRESHOLD;
    const isObiBullish = obi >= TriggerEngine.OBI_IMBALANCE_THRESHOLD;
    const isObiBearish = obi <= -TriggerEngine.OBI_IMBALANCE_THRESHOLD;
    const isJuryStrong = consensus >= TriggerEngine.JURY_CONSENSUS_THRESHOLD;

    // 1. GÜÇLÜ AL TETİĞİ (Hem Z-Score anomali hem OBI alış baskısı hem yüksek jüri güveni)
    if (isZPositive && isObiBullish && isJuryStrong) {
      const reason = `Hacim anomalisi (Z +${zScore.toFixed(2)}σ) ve L2 alış baskısı (OBI +${obi.toFixed(2)}) ile jüri konsensüsü (%${consensus.toFixed(1)}) eşiği aştı.`;
      return {
        isTriggered: true,
        action: 'GUCLU_AL',
        confidencePct: Math.min(95, Math.round(consensus * 1.1)),
        triggerReason: reason,
        triggerConditionText: reason,
        alarmLevel: 'CRITICAL',
        formattedSummary: `GÜÇLÜ AL TETİKLENDİ | Z: +${zScore.toFixed(2)}σ | OBI: +${obi.toFixed(2)} | Güven: %${consensus.toFixed(1)}`,
      };
    }

    // 2. AL TETİĞİ (Pozitif Z veya OBI ile ılımlı jüri desteği)
    if ((isZPositive || isObiBullish) && consensus >= 65 && rsiVal < 75) {
      const reason = `Yükseliş yönlü kuant kırılım teyit edildi (Z: ${zScore.toFixed(2)}σ, OBI: ${obi.toFixed(2)}).`;
      return {
        isTriggered: true,
        action: 'AL',
        confidencePct: Math.round(consensus),
        triggerReason: reason,
        triggerConditionText: reason,
        alarmLevel: 'WARNING',
        formattedSummary: `AL TETİKLENDİ | Z: ${zScore.toFixed(2)}σ | OBI: ${obi.toFixed(2)} | Güven: %${consensus.toFixed(1)}`,
      };
    }

    // 3. GÜÇLÜ SAT TETİĞİ (Negatif Z anomali veya yoğun satış OBI ile düşüş konsensüsü)
    if (isZNegative && isObiBearish) {
      const reason = `Hacimsel boşalma (Z ${zScore.toFixed(2)}σ) ve derin satış baskısı (OBI ${obi.toFixed(2)}) panik satış anomalisi oluşturdu.`;
      return {
        isTriggered: true,
        action: 'GUCLU_SAT',
        confidencePct: Math.min(95, Math.round(consensus)),
        triggerReason: reason,
        triggerConditionText: reason,
        alarmLevel: 'CRITICAL',
        formattedSummary: `GÜÇLÜ SAT TETİKLENDİ | Z: ${zScore.toFixed(2)}σ | OBI: ${obi.toFixed(2)}`,
      };
    }

    // 4. SAT TETİĞİ (Düşüş yönlü baskı veya aşırı alım doyum noktası)
    if (isObiBearish || isZNegative || (rsiVal >= 80 && obi < 0)) {
      const reason = `Düşüş yönlü baskı veya aşırı şişkinlik tespit edildi (RSI: ${rsiVal.toFixed(1)}, OBI: ${obi.toFixed(2)}).`;
      return {
        isTriggered: true,
        action: 'SAT',
        confidencePct: Math.max(60, Math.round(consensus)),
        triggerReason: reason,
        triggerConditionText: reason,
        alarmLevel: 'WARNING',
        formattedSummary: `SAT TETİKLENDİ | Z: ${zScore.toFixed(2)}σ | OBI: ${obi.toFixed(2)}`,
      };
    }

    // 5. BEKLE DURUMU (Dengeli veya kırılım öncesi sakin piyasa)
    const zSign = zScore >= 0 ? '+' : '';
    const obiSign = obi >= 0 ? '+' : '';
    const reason = `Tahta dengede, hacim sakin (Z ${zSign}${zScore.toFixed(2)}σ, OBI ${obiSign}${obi.toFixed(2)}), yön kırılımı bekleniyor.`;
    return {
      isTriggered: false,
      action: 'BEKLE',
      confidencePct: Math.round(consensus),
      triggerReason: reason,
      triggerConditionText: reason,
      alarmLevel: 'NORMAL',
      formattedSummary: `BEKLE | Tahta dengede (Z ${zSign}${zScore.toFixed(2)}σ, OBI ${obiSign}${obi.toFixed(2)}) | Karar eşiği bekleniyor.`,
    };
  }
}
