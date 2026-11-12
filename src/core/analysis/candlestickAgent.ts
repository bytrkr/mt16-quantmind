/**
 * ============================================================================
 * 🧠 MT16 QUANTMIND - SİSTEM TALİMATNAMESİ (SYSTEM INSTRUCTIONS)
 * ============================================================================
 * 
 * 1. GÖREV TANIMI:
 *    src/core/analysis/candlestickAgent.ts
 *    Mum Formasyonu Ajanı (Candlestick Agent - Sadeleştirilmiş).
 *    technicalindicators kütüphanesini kullanarak mum formasyonlarını tespit 
 *    eder, Hacim + KAP + Zaman Dilimi uyumuyla Kalite Skoru hesaplar.
 *    (Not: AKD ve OBI çapraz kontrolü Jüri / Arbiter katmanında yönetilir).
 * 
 * 2. ANAYASAL KURALLAR (QODI STANDARTLARI):
 *    - Kural 1 (SSOT): Veri sadece marketGateway ve kapDaemon'dan gelir.
 *    - Kural 2 (Fallback Yasağı): Eğer veri null ise, asla sahte 0 veya 100 
 *      üretilmez. Ekrana "VERİ YOK" döner ve Jüri'ye oy verilmez.
 *    - Kural 3 (Karar Zarfı): Her formasyon kararı, hangi formasyonun 
 *      tespit edildiğini ve kalite skorunu içerir.
 *    - Kural 4 (Sıfır Bağımlılık): technicalindicators kütüphanesi çökse 
 *      veya veri sağlayamazsa, saf matematiksel fallback devreye girer.
 * 
 * 3. KALİTE SKORU KURALLARI (Hacim + KAP + Zaman Dilimi):
 *    - Hacim Onayı (+35): Son mumun hacmi > 20 periyotluk SMA
 *    - KAP Onayı (+35): Formasyon yönü (AL/SAT) KAP duygu skoruyla uyumlu
 *    - Zaman Dilimi Onayı (+30): 5H, 1D, 1W formasyonları aynı yönü gösteriyor
 *      (Çelişki varsa, Skor = 0, NO_TRADE dönülür).
 * 
 * 4. JÜRİ ENTEGRASYONU:
 *    - Kalite Skoru < 50 ise → "ÇÖP", Jüri'ye oy verilmez (weight: 0).
 *    - Kalite Skoru > 75 ise → Jüri'ye %20 ağırlıkla AL veya SAT oyu verilir.
 *    - Skor 50-75 arası ise → "PAS" (Nötr).
 * ============================================================================
 */

import {
  bullishengulfingpattern,
  bearishengulfingpattern,
  morningstar,
  eveningstar,
  hammerpattern,
  shootingstar,
  bullishharami,
  bearishharami,
  doji,
  bullishmarubozu,
  bearishmarubozu,
} from 'technicalindicators';

export type PatternDirection = 'BULLISH' | 'BEARISH' | 'NEUTRAL';
export type CandlestickVote = 'AL' | 'SAT' | 'PAS' | 'NO_TRADE';
export type QualityStatus = 'ÇÖP' | 'PAS' | 'ONAYLI' | 'VERİ_YOK';

export interface CandleSeries {
  open: number[];
  high: number[];
  low: number[];
  close: number[];
  volume?: number[];
}

export interface CandlestickEvaluationInput {
  candles?: CandleSeries | null;
  timeframeDirections?: {
    '5H'?: PatternDirection | null;
    '1D'?: PatternDirection | null;
    '1W'?: PatternDirection | null;
  } | null;
  kapSentimentScore?: number | null;
  lastVolume?: number | null;
  volumeSma20?: number | null;
}

export interface CandlestickFilterDetails {
  volumePassed: boolean;
  kapPassed: boolean;
  timeframePassed: boolean;
  timeframeConflict: boolean;
  breakdown: {
    volumePoints: number;
    kapPoints: number;
    timeframePoints: number;
  };
}

export interface CandlestickDecisionEnvelope {
  final: CandlestickVote;
  decided_by: 'Qodi-Candlestick-Agent';
  entry_blocked: boolean;
  exit_allowed: boolean;
  reason: string;
}

export interface CandlestickAgentResult {
  detected: boolean;
  patternName: string | null;
  patternDirection: PatternDirection | null;
  qualityScore: number | null; // 0 - 100 veya null
  qualityStatus: QualityStatus;
  vote: CandlestickVote;
  juryWeight: number; // 0.20 if ONAYLI else 0
  filters: CandlestickFilterDetails;
  badgeText: string;
  decisionEnvelope: CandlestickDecisionEnvelope;
}

/**
 * Kalite Skoru Hesaplayıcı (Hacim + KAP + Zaman Dilimi)
 */
export function calculateQualityScore(
  direction: PatternDirection,
  input: CandlestickEvaluationInput
): {
  score: number | null;
  filters: CandlestickFilterDetails;
  timeframeConflict: boolean;
  status: QualityStatus;
} {
  if (direction === 'NEUTRAL') {
    return {
      score: 50,
      filters: {
        volumePassed: false,
        kapPassed: false,
        timeframePassed: false,
        timeframeConflict: false,
        breakdown: { volumePoints: 0, kapPoints: 0, timeframePoints: 0 },
      },
      timeframeConflict: false,
      status: 'PAS',
    };
  }

  // 1. Hacim Onayı (+35)
  let volumePassed = false;
  let volumePoints = 0;
  const lastVol = input.lastVolume ?? null;
  const smaVol = input.volumeSma20 ?? null;
  if (lastVol !== null && smaVol !== null && smaVol > 0 && lastVol > smaVol) {
    volumePassed = true;
    volumePoints = 35;
  }

  // 2. KAP Onayı (+35)
  let kapPassed = false;
  let kapPoints = 0;
  const kap = input.kapSentimentScore ?? null;
  if (kap !== null) {
    if (Math.abs(kap) > 1.0) {
      if ((direction === 'BULLISH' && kap > 55) || (direction === 'BEARISH' && kap < 45)) {
        kapPassed = true;
        kapPoints = 35;
      }
    } else {
      if ((direction === 'BULLISH' && kap > 0.1) || (direction === 'BEARISH' && kap < -0.1)) {
        kapPassed = true;
        kapPoints = 35;
      }
    }
  }

  // 3. Zaman Dilimi Uyum Testi (+30 veya Çelişkide İptal / NO_TRADE)
  let timeframeConflict = false;
  let timeframePassed = false;
  let timeframePoints = 0;
  const tf = input.timeframeDirections;

  if (tf) {
    const opposingDir: PatternDirection = direction === 'BULLISH' ? 'BEARISH' : 'BULLISH';
    const hasOpposition =
      tf['5H'] === opposingDir ||
      tf['1D'] === opposingDir ||
      tf['1W'] === opposingDir;

    if (hasOpposition) {
      timeframeConflict = true;
    } else {
      timeframePassed = true;
      timeframePoints = 30;
    }
  } else {
    timeframePassed = true;
    timeframePoints = 30;
  }

  if (timeframeConflict) {
    return {
      score: 0,
      filters: {
        volumePassed,
        kapPassed,
        timeframePassed: false,
        timeframeConflict: true,
        breakdown: { volumePoints, kapPoints, timeframePoints: 0 },
      },
      timeframeConflict: true,
      status: 'ÇÖP',
    };
  }

  const totalScore = volumePoints + kapPoints + timeframePoints;
  let status: QualityStatus = 'PAS';
  if (totalScore < 50) status = 'ÇÖP';
  else if (totalScore >= 70) status = 'ONAYLI';

  return {
    score: totalScore,
    filters: {
      volumePassed,
      kapPassed,
      timeframePassed,
      timeframeConflict: false,
      breakdown: { volumePoints, kapPoints, timeframePoints },
    },
    timeframeConflict: false,
    status,
  };
}

/**
 * Mum Formasyonu Tespit Ajanı (10+ Formasyon + Saf Kuant Fallback)
 */
export function detectCandlestickPattern(
  candles?: CandleSeries | null
): { detected: boolean; name: string | null; direction: PatternDirection | null } {
  if (!candles || !candles.close || candles.close.length === 0) {
    return { detected: false, name: null, direction: null };
  }

  const { open, high, low, close } = candles;
  const len = close.length;

  try {
    if (len >= 3) {
      const s = { open: open.slice(-3), high: high.slice(-3), low: low.slice(-3), close: close.slice(-3) };
      if (morningstar(s)) return { detected: true, name: 'Morning Star', direction: 'BULLISH' };
      if (eveningstar(s)) return { detected: true, name: 'Evening Star', direction: 'BEARISH' };
    }
    if (len >= 2) {
      const s = { open: open.slice(-2), high: high.slice(-2), low: low.slice(-2), close: close.slice(-2) };
      if (bullishengulfingpattern(s)) return { detected: true, name: 'Bullish Engulfing', direction: 'BULLISH' };
      if (bearishengulfingpattern(s)) return { detected: true, name: 'Bearish Engulfing', direction: 'BEARISH' };
      if (bullishharami(s)) return { detected: true, name: 'Bullish Harami', direction: 'BULLISH' };
      if (bearishharami(s)) return { detected: true, name: 'Bearish Harami', direction: 'BEARISH' };
    }
    if (len >= 1) {
      const s = { open: open.slice(-1), high: high.slice(-1), low: low.slice(-1), close: close.slice(-1) };
      if (hammerpattern(s)) return { detected: true, name: 'Hammer', direction: 'BULLISH' };
      if (shootingstar(s)) return { detected: true, name: 'Shooting Star', direction: 'BEARISH' };
      if (bullishmarubozu(s)) return { detected: true, name: 'Bullish Marubozu', direction: 'BULLISH' };
      if (bearishmarubozu(s)) return { detected: true, name: 'Bearish Marubozu', direction: 'BEARISH' };
      if (doji(s)) return { detected: true, name: 'Doji', direction: 'NEUTRAL' };
    }
  } catch {}

  // Saf Matematiksel Fallback
  if (len >= 2) {
    const prevOpen = open[len - 2], prevClose = close[len - 2];
    const currOpen = open[len - 1], currClose = close[len - 1];
    const currHigh = high[len - 1], currLow = low[len - 1];

    if (prevClose < prevOpen && currClose > currOpen && currOpen <= prevClose && currClose >= prevOpen) {
      return { detected: true, name: 'Bullish Engulfing', direction: 'BULLISH' };
    }
    if (prevClose > prevOpen && currClose < currOpen && currOpen >= prevClose && currClose <= prevOpen) {
      return { detected: true, name: 'Bearish Engulfing', direction: 'BEARISH' };
    }

    const body = Math.abs(currClose - currOpen);
    const totalRange = currHigh - currLow;
    if (totalRange > 0) {
      const lowerShadow = Math.min(currOpen, currClose) - currLow;
      const upperShadow = currHigh - Math.max(currOpen, currClose);
      if (lowerShadow >= 2.0 * body && upperShadow <= 0.2 * body) {
        return { detected: true, name: 'Hammer', direction: 'BULLISH' };
      }
      if (upperShadow >= 2.0 * body && lowerShadow <= 0.2 * body) {
        return { detected: true, name: 'Shooting Star', direction: 'BEARISH' };
      }
    }
  }

  return { detected: false, name: null, direction: null };
}

/**
 * Mum Formasyonu Ajanı Ana Değerlendirme Fonksiyonu
 */
export function evaluateCandlestickAgent(input: CandlestickEvaluationInput): CandlestickAgentResult {
  if (!input.candles || !input.candles.close || input.candles.close.length === 0) {
    return {
      detected: false,
      patternName: null,
      patternDirection: null,
      qualityScore: null,
      qualityStatus: 'VERİ_YOK',
      vote: 'PAS',
      juryWeight: 0,
      filters: {
        volumePassed: false,
        kapPassed: false,
        timeframePassed: false,
        timeframeConflict: false,
        breakdown: { volumePoints: 0, kapPoints: 0, timeframePoints: 0 },
      },
      badgeText: 'Mum Kalitesi: VERİ YOK',
      decisionEnvelope: { final: 'NO_TRADE', decided_by: 'Qodi-Candlestick-Agent', entry_blocked: true, exit_allowed: true, reason: 'VERİ_YOK' },
    };
  }

  const pattern = detectCandlestickPattern(input.candles);
  if (!pattern.detected || !pattern.direction) {
    return {
      detected: false,
      patternName: null,
      patternDirection: null,
      qualityScore: null,
      qualityStatus: 'PAS',
      vote: 'PAS',
      juryWeight: 0,
      filters: {
        volumePassed: false,
        kapPassed: false,
        timeframePassed: false,
        timeframeConflict: false,
        breakdown: { volumePoints: 0, kapPoints: 0, timeframePoints: 0 },
      },
      badgeText: 'Mum Kalitesi: Formasyon Yok (Nötr)',
      decisionEnvelope: { final: 'NO_TRADE', decided_by: 'Qodi-Candlestick-Agent', entry_blocked: false, exit_allowed: true, reason: 'Formasyon yok' },
    };
  }

  const quality = calculateQualityScore(pattern.direction, input);
  let vote: CandlestickVote = 'PAS';
  let juryWeight = 0;
  let entryBlocked = false;

  if (quality.timeframeConflict) {
    vote = 'NO_TRADE';
    entryBlocked = true;
  } else if (quality.status === 'ONAYLI' && quality.score !== null && quality.score >= 70) {
    vote = pattern.direction === 'BULLISH' ? 'AL' : 'SAT';
    juryWeight = 0.20;
  }

  const volSign = quality.filters.volumePassed ? '+' : '-';
  const kapSign = quality.filters.kapPassed ? '+' : '-';
  const tfSign = quality.filters.timeframePassed ? '+' : '-';

  const badgeText = quality.score !== null
    ? `Mum Kalitesi: ${quality.score}/100 (${pattern.name}, Hacim: ${volSign}, KAP: ${kapSign}, Zaman: ${tfSign})`
    : 'Mum Kalitesi: VERİ YOK';

  return {
    detected: true,
    patternName: pattern.name,
    patternDirection: pattern.direction,
    qualityScore: quality.score,
    qualityStatus: quality.status,
    vote,
    juryWeight,
    filters: quality.filters,
    badgeText,
    decisionEnvelope: {
      final: vote,
      decided_by: 'Qodi-Candlestick-Agent',
      entry_blocked: entryBlocked,
      exit_allowed: true,
      reason: quality.timeframeConflict
        ? 'ZAMAN_DİLİMİ_ÇELİŞKİSİ (Zaman dilimleri çelişiyor)'
        : `Kalite: ${quality.status} (${quality.score}/100)`,
    },
  };
}
