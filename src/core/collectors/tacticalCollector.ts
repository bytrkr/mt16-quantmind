// src/core/collectors/tacticalCollector.ts
/**
 * ============================================================================
 * 🧠 MT16 QUANTMIND — MERKEZİ TAKTİKSEL KOLLEKTÖR (tacticalCollector.ts)
 * TEK DOĞRULUK KAYNAĞI (SINGLE SOURCE OF TRUTH - SSOT)
 * ============================================================================
 *
 * QODI ANAYASA STANDARTLARI:
 * - Kural 1 (SSOT): Tüm veri kaynakları (Yahoo Finance, Alpaca, KAP RSS)
 *   bu merkez üzerinden toplanır ve doğrulanır.
 * - Kural 2 (Fallback Yasağı): Eğer veri null ise, ASLA sahte fiyat, sahte 50, 100
 *   veya sahte varsayılan basılmaz. Doğrudan `null` dönülür.
 * - Kural 3 (Minimum Veri Güvenliği): Eğer geçerli veri kaynağı adedi 2'den az ise
 *   (validCount < 2), işlem durdurulur ve action: 'VERİ YOK' döner.
 * - Kural 4 (Deterministik Z-Skor): Z-Skor hesabı için en az 20 gerçek periyot
 *   verisi zorunludur. 20 periyot yoksa Z-Skor null döner. Math.random() KESİNLİKLE YASAKTIR.
 */

import { getYahooDirectPrice, fetchYahooPrice } from '../../services/yahooDirect';
import { logDataIssue } from '../../utils/dataAudit';

export type TacticalMarketType = 'BIST' | 'CRYPTO' | 'NASDAQ';
export type TacticalAction = 'AL' | 'SAT' | 'BEKLE' | 'VERİ YOK';
export type TacticalAlarmLevel =
  | 'DENGELI'
  | 'INCELEME_GEREKLI'
  | 'TAHTA_KONTROLU'
  | 'MANIPULASYON_ALARM'
  | 'SUPER_KRITIK_ALARM'
  | 'VERİ_YOK';

export interface AnomalyEngineOutput {
  zScore: number | null;
  hhi: number | null;
  hhiMonopol: boolean;
  isolationForestScore: number | null;
  treeProb: number | null;
  verdict: 'NORMAL' | 'DIKKAT' | 'ANOMALI_ALARM' | 'VERİ YOK';
}

export interface BoardEngineOutput {
  obi: number | null;
  massResistance: number | null;
  wallLot: number | null;
  wallPrice: number | null;
  breakoutMinutes: number | null;
  isFakeWall: boolean;
  whaleLabel: 'WHALE_WALL' | 'RESISTANCE_WALL' | 'SUPPORT_WALL' | 'NORMAL_TAHTA' | 'VERİ YOK';
}

export interface ForensicEngineOutput {
  riskScore: number | null;
  washTradeRatio: number | null;
  spkFlags: string[];
  beneishMScore: number | null;
  isManipulated: boolean;
}

export interface StoryCubeItem {
  id: string;
  label: string;
  signal: TacticalAction;
  score: number | null;
  valueText: string;
  note: string;
}

export interface StoryCubesEngineOutput {
  cubes: StoryCubeItem[];
  coherence: number | null;
  conflictCount: number;
  is_poisoned: boolean;
  overrideAction: TacticalAction;
}

export interface CompositeV2EngineOutput {
  exponentialRiskScore: number | null;
  nonLinearAmplifier: number | null;
  directionalCoherence: number | null;
  superCriticalFlag: boolean;
  memoryEvidenceScore: number | null;
}

export interface TacticalCollectorInput {
  symbol: string;
  companyName?: string;
  marketType: TacticalMarketType;
  price: number | null;
  changePct?: number | null;
  zScore?: number | null;
  obi?: number | null;
  rsi?: number | null;
  wallLot?: number | null;
  wallPrice?: number | null;
  spreadPct?: number | null;
  bofaNetLot?: number | null;
  citibankSharePct?: number | null;
  altmanZ?: number | null;
  piotroskiF?: number | null;
  juryScore?: number | null;
  isJuryVetoed?: boolean;
  latestKapTitle?: string | null;
  latestKapImpact?: number | null;
  latestKapTime?: string | null;
  compositeAnomaly?: any;
  volumeHistory?: number[] | null;
}

export interface UnifiedVerdict {
  symbol: string;
  companyName: string;
  marketType: TacticalMarketType;
  currencySymbol: string;
  price: number | null;
  changePct: number | null;
  action: TacticalAction;
  confidence: number | null;
  finalScore: number | null;
  alarmLevel: TacticalAlarmLevel;
  alarm: TacticalAlarmLevel;
  primaryDriver: string;
  reason: string;
  isTradeAllowed: boolean;
  validSourceCount: number;
  zScore: number | null;
  zThreshold: number;
  obi: number | null;
  wallLot: number | null;
  wallPrice: number | null;
  breakoutMinutes: number | null;
  isFakeWall: boolean;
  riskScore: number | null;
  coherence: number | null;
  expoScore: number | null;
  amplifier: number | null;
  juryScore: number | null;
  varPct: number | null;
  kellyPct: number | null;
  stopPrice: number | null;
  tpPrice: number | null;
  naturalLanguageAnalysis: string;
  isTightMode?: boolean;
  wall?: { symbol: string; type: string; price: number; wall_lot: number } | null;
  anomaly: AnomalyEngineOutput;
  board: BoardEngineOutput;
  forensic: ForensicEngineOutput;
  cubes: StoryCubesEngineOutput;
  compositeV2: CompositeV2EngineOutput;
  engines: {
    anomaly: AnomalyEngineOutput;
    board: BoardEngineOutput;
    forensic: ForensicEngineOutput;
    storyCubes: StoryCubesEngineOutput;
    compositeV2: CompositeV2EngineOutput;
    composite: CompositeV2EngineOutput;
  };
  timestamp: string;
  status: 'VERİ_VAR' | 'VERİ YOK';
}

/**
 * 20 Periyotluk Gerçek Veri ile Z-Skor Hesaplayıcı.
 * Qodi Kuralı: Eğer 20 periyot yoksa ASLA Math.random() uydurulmaz, null döner.
 */
export function calculateZScoreFromHistory(series: number[] | null | undefined): number | null {
  if (!series || !Array.isArray(series) || series.length < 20) {
    return null;
  }

  const slice = series.slice(-20);
  const validNumbers = slice.filter((v) => typeof v === 'number' && !isNaN(v));
  if (validNumbers.length < 20) {
    return null;
  }

  const sum = validNumbers.reduce((acc, v) => acc + v, 0);
  const mean = sum / validNumbers.length;

  const varianceSum = validNumbers.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0);
  const variance = varianceSum / validNumbers.length;
  const stdDev = Math.sqrt(variance);

  if (stdDev === 0) {
    return 0;
  }

  const lastValue = validNumbers[validNumbers.length - 1];
  return Number(((lastValue - mean) / stdDev).toFixed(2));
}

import { getFromTradingView } from '../../services/providers/tradingViewScreenerProvider';

/**
 * Pazar bazlı Z-Skor Anomali eşiğini döner.
 */
export function getZScoreThreshold(market: TacticalMarketType): number {
  if (market === 'BIST') return 1.8;
  return 2.0; // CRYPTO & NASDAQ
}

export const getAlpacaPrice = async (ticker: string): Promise<number | null> => {
  const a = await getAlpacaQuote(ticker);
  return a?.price ?? null;
};

export const getTradingViewPrice = async (ticker: string): Promise<number | null> => {
  const tv = await getFromTradingView(ticker);
  return tv?.price ?? null;
};

/**
 * SSOT Fiyat Sorgulayıcı (Tek Doğruluk Kaynağı).
 * Qodi Kuralı: Bulunamazsa asla varsayılan basmaz, null döner.
 */
export async function getTacticalPrice(ticker: string): Promise<number | null> {
  if (!ticker) return null;
  const sources = [
    async () => {
      const q = await getYahooDirectPrice(ticker);
      return typeof q?.price === 'number' && !isNaN(q.price) && q.price > 0 ? q.price : null;
    },
    async () => {
      const p = await fetchYahooPrice(ticker);
      return typeof p === 'number' && !isNaN(p) && p > 0 ? p : null;
    },
    () => getAlpacaPrice(ticker),
    () => getTradingViewPrice(ticker),
  ];

  for (const get of sources) {
    try {
      const p = await get();
      if (typeof p === 'number' && !isNaN(p) && p > 0) {
        return p;
      }
    } catch {}
  }

  logDataIssue('tacticalCollector', ticker, 'price', 'all sources null');
  return null;
}

export async function getPrice(ticker: string): Promise<number | null> {
  return getTacticalPrice(ticker);
}

/**
 * Alpaca API'den veri çeker (varsa). Bulunamazsa null döner.
 */
export async function getAlpacaQuote(symbol: string): Promise<{ price: number | null; volume: number | null } | null> {
  if (!symbol || typeof window === 'undefined') return null;
  try {
    const res = await fetch(`/api/alpaca/quote?symbol=${encodeURIComponent(symbol)}`, {
      signal: AbortSignal.timeout(4000),
    });
    if (res.ok) {
      const data = await res.json();
      if (data && typeof data.price === 'number') {
        return {
          price: data.price,
          volume: typeof data.volume === 'number' ? data.volume : null,
        };
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * KAP RSS'den son haber akışını çeker. Bulunamazsa null döner.
 */
export async function getKapLatestNews(ticker: string): Promise<{ title: string | null; impact: number | null } | null> {
  if (!ticker || typeof window === 'undefined') return null;
  try {
    const res = await fetch(`/api/kap/latest?ticker=${encodeURIComponent(ticker)}`, {
      signal: AbortSignal.timeout(4000),
    });
    if (res.ok) {
      const data = await res.json();
      return {
        title: data?.title || null,
        impact: typeof data?.impact === 'number' ? data.impact : null,
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * 1. Anomali Motoru (Saf Veri)
 */
export function evaluateAnomalyEngine(
  input: TacticalCollectorInput,
  zThreshold: number = 1.8
): AnomalyEngineOutput {
  const zScore = input.zScore !== undefined && input.zScore !== null
    ? input.zScore
    : calculateZScoreFromHistory(input.volumeHistory);

  if (zScore === null) {
    return {
      zScore: null,
      hhi: null,
      hhiMonopol: false,
      isolationForestScore: null,
      treeProb: null,
      verdict: 'VERİ YOK',
    };
  }

  const absZ = Math.abs(zScore);
  const isAlarm = absZ >= zThreshold;
  const isWarning = absZ >= zThreshold * 0.75;

  const hhiVal = typeof input.citibankSharePct === 'number' ? Number((input.citibankSharePct * 35).toFixed(1)) : null;
  const isMonopol = hhiVal !== null ? hhiVal > 2500 : false;

  return {
    zScore,
    hhi: hhiVal,
    hhiMonopol: isMonopol,
    isolationForestScore: Number(Math.min(1, absZ / (zThreshold * 1.5)).toFixed(2)),
    treeProb: Number(Math.min(100, Math.round((absZ / zThreshold) * 50))),
    verdict: isAlarm ? 'ANOMALI_ALARM' : isWarning ? 'DIKKAT' : 'NORMAL',
  };
}

/**
 * 2. Tahta / Derinlik Motoru (Saf Veri)
 */
export function evaluateBoardEngine(input: TacticalCollectorInput): BoardEngineOutput {
  const obi = input.obi !== undefined ? input.obi : null;
  const wallLot = input.wallLot !== undefined ? input.wallLot : null;
  const wallPrice = input.wallPrice !== undefined ? input.wallPrice : null;

  if (obi === null && wallLot === null) {
    return {
      obi: null,
      massResistance: null,
      wallLot: null,
      wallPrice: null,
      breakoutMinutes: null,
      isFakeWall: false,
      whaleLabel: 'VERİ YOK',
    };
  }

  const safeObi = obi ?? 0;
  const safeLot = wallLot ?? 0;
  const isFake = safeLot > 100000 && Math.abs(safeObi) < 0.1;

  let whaleLabel: BoardEngineOutput['whaleLabel'] = 'NORMAL_TAHTA';
  if (safeLot >= 200000) {
    whaleLabel = safeObi > 0.25 ? 'SUPPORT_WALL' : safeObi < -0.25 ? 'RESISTANCE_WALL' : 'WHALE_WALL';
  }

  return {
    obi,
    massResistance: Number((Math.abs(safeObi) * 100).toFixed(0)),
    wallLot,
    wallPrice,
    breakoutMinutes: safeLot > 0 ? 12 : null,
    isFakeWall: isFake,
    whaleLabel,
  };
}

/**
 * 3. Adli Analiz / Manipülasyon Motoru (Saf Veri)
 */
export function evaluateForensicEngine(
  input: TacticalCollectorInput,
  _p2?: any,
  _p3?: any
): ForensicEngineOutput {
  const flags: string[] = [];
  let riskScore: number | null = null;

  if (input.altmanZ !== undefined && input.altmanZ !== null) {
    if (input.altmanZ < 1.81) flags.push('ALTMAN_DISTRESS_ZONE');
  }

  if (input.piotroskiF !== undefined && input.piotroskiF !== null) {
    if (input.piotroskiF <= 3) flags.push('PIOTROSKI_WEAK_FUNDAMENTALS');
  }

  if (input.isJuryVetoed) {
    flags.push('JURY_VETO_ACTIVE');
  }

  if (flags.length > 0 || (input.altmanZ !== undefined && input.altmanZ !== null)) {
    riskScore = Math.min(100, flags.length * 30);
  }

  return {
    riskScore,
    washTradeRatio: null,
    spkFlags: flags,
    beneishMScore: null,
    isManipulated: flags.length >= 2,
  };
}

/**
 * 4. 9 Küp Motoru (Saf Veri)
 */
export function evaluateStoryCubesEngine(input: TacticalCollectorInput): StoryCubesEngineOutput {
  const cubes: StoryCubeItem[] = [
    {
      id: 'c1_duygu',
      label: 'KAP Duygu Akışı',
      signal: input.latestKapImpact && input.latestKapImpact > 0 ? 'AL' : input.latestKapImpact && input.latestKapImpact < 0 ? 'SAT' : 'BEKLE',
      score: input.latestKapImpact !== undefined && input.latestKapImpact !== null ? Math.abs(input.latestKapImpact) : null,
      valueText: input.latestKapTitle || 'VERİ YOK',
      note: 'KAP RSS',
    },
    {
      id: 'c2_bofa',
      label: 'BofA Kurumsal Akış',
      signal: input.bofaNetLot && input.bofaNetLot > 0 ? 'AL' : input.bofaNetLot && input.bofaNetLot < 0 ? 'SAT' : 'BEKLE',
      score: input.bofaNetLot !== undefined && input.bofaNetLot !== null ? Math.min(100, Math.round(Math.abs(input.bofaNetLot) / 10000)) : null,
      valueText: input.bofaNetLot !== undefined && input.bofaNetLot !== null ? `${input.bofaNetLot > 0 ? '+' : ''}${input.bofaNetLot.toLocaleString('tr-TR')} Lot` : 'VERİ YOK',
      note: 'AKD Takas',
    },
    {
      id: 'c3_derinlik',
      label: 'L2 Sipariş Derinliği',
      signal: input.obi && input.obi > 0.2 ? 'AL' : input.obi && input.obi < -0.2 ? 'SAT' : 'BEKLE',
      score: input.obi !== undefined && input.obi !== null ? Math.round(Math.abs(input.obi) * 100) : null,
      valueText: input.obi !== undefined && input.obi !== null ? `OBI: ${input.obi > 0 ? '+' : ''}${input.obi.toFixed(2)}` : 'VERİ YOK',
      note: 'Orderbook',
    },
    {
      id: 'c4_anomali',
      label: 'Hacim / Z-Skor',
      signal: input.zScore && input.zScore > 1.8 ? 'AL' : input.zScore && input.zScore < -1.8 ? 'SAT' : 'BEKLE',
      score: input.zScore !== undefined && input.zScore !== null ? Math.min(100, Math.round(Math.abs(input.zScore) * 35)) : null,
      valueText: input.zScore !== undefined && input.zScore !== null ? `Z = ${input.zScore > 0 ? '+' : ''}${input.zScore.toFixed(2)}σ` : 'VERİ YOK',
      note: 'İstatistik',
    },
    {
      id: 'c5_rsi',
      label: 'RSI / Momentum',
      signal: input.rsi && input.rsi > 70 ? 'SAT' : input.rsi && input.rsi < 30 ? 'AL' : 'BEKLE',
      score: input.rsi !== undefined && input.rsi !== null ? Math.round(input.rsi) : null,
      valueText: input.rsi !== undefined && input.rsi !== null ? `RSI: ${input.rsi.toFixed(1)}` : 'VERİ YOK',
      note: 'Teknik',
    },
    {
      id: 'c6_temel',
      label: 'Temel Sağlık (Altman/Piotroski)',
      signal: input.piotroskiF && input.piotroskiF >= 7 ? 'AL' : input.piotroskiF && input.piotroskiF <= 3 ? 'SAT' : 'BEKLE',
      score: input.piotroskiF !== undefined && input.piotroskiF !== null ? Math.round((input.piotroskiF / 9) * 100) : null,
      valueText: input.piotroskiF !== undefined && input.piotroskiF !== null ? `F-Score: ${input.piotroskiF}/9` : 'VERİ YOK',
      note: 'Mali Tablo',
    },
  ];

  const validCubes = cubes.filter((c) => c.score !== null);
  const alCount = validCubes.filter((c) => c.signal === 'AL').length;
  const satCount = validCubes.filter((c) => c.signal === 'SAT').length;

  let overrideAction: TacticalAction = 'BEKLE';
  if (alCount >= 3 && alCount > satCount) overrideAction = 'AL';
  else if (satCount >= 3 && satCount > alCount) overrideAction = 'SAT';

  const coherence = validCubes.length > 0
    ? Math.round((Math.max(alCount, satCount) / validCubes.length) * 100)
    : null;

  return {
    cubes,
    coherence,
    conflictCount: Math.min(alCount, satCount),
    is_poisoned: false,
    overrideAction: validCubes.length >= 2 ? overrideAction : 'VERİ YOK',
  };
}

/**
 * 5. Composite V2 Motoru (Saf Veri)
 */
export function evaluateCompositeV2Engine(
  input: TacticalCollectorInput,
  forensic: ForensicEngineOutput,
  anomaly: AnomalyEngineOutput
): CompositeV2EngineOutput {
  const z = anomaly.zScore;
  const risk = forensic.riskScore;

  if (z === null && risk === null) {
    return {
      exponentialRiskScore: null,
      nonLinearAmplifier: null,
      directionalCoherence: null,
      superCriticalFlag: false,
      memoryEvidenceScore: null,
    };
  }

  const safeZ = z !== null ? Math.abs(z) : 0;
  const safeRisk = risk !== null ? risk : 0;

  const amp = Number((1.0 + Math.min(2.5, safeZ * 0.4)).toFixed(2));
  const expRisk = Math.min(100, Math.round(safeRisk * amp));

  return {
    exponentialRiskScore: expRisk,
    nonLinearAmplifier: amp,
    directionalCoherence: null,
    superCriticalFlag: expRisk >= 85,
    memoryEvidenceScore: safeRisk,
  };
}

/**
 * MERKEZİ KARAR İNDİRGEME (collectTacticalVerdict)
 * QODI KURALI: validCount < 2 ise action: 'VERİ YOK' döner. Asla sahte varsayılan basmaz.
 */
export function collectTacticalVerdict(input: TacticalCollectorInput): UnifiedVerdict {
  const threshold = getZScoreThreshold(input.marketType);
  const anomaly = evaluateAnomalyEngine(input, threshold);
  const board = evaluateBoardEngine(input);
  const forensic = evaluateForensicEngine(input);
  const cubes = evaluateStoryCubesEngine(input);
  const compositeV2 = evaluateCompositeV2Engine(input, forensic, anomaly);

  // Geçerli veri kaynaklarını say
  let validSourceCount = 0;
  if (input.price !== null && input.price !== undefined && input.price > 0) validSourceCount++;
  if (anomaly.zScore !== null) validSourceCount++;
  if (board.obi !== null) validSourceCount++;
  if (cubes.cubes.some((c) => c.score !== null)) validSourceCount++;
  if (input.latestKapImpact !== null && input.latestKapImpact !== undefined) validSourceCount++;

  const curSymbol = input.marketType === 'BIST' ? '₺' : '$';
  const enginesObj = {
    anomaly,
    board,
    forensic,
    storyCubes: cubes,
    compositeV2,
    composite: compositeV2,
  };

  // Qodi Kuralı: validCount < 2 veya price null ise işlem durdurulur ve 'VERİ YOK' atanır!
  if (input.price === null || input.price <= 0) {
    logDataIssue('tacticalCollector', input.symbol, 'price', '【entity-Yahoo¦canonical_name=Yahoo】 proxy null - VERİ YOK dön');
    return {
      symbol: input.symbol,
      companyName: input.companyName || input.symbol,
      marketType: input.marketType,
      currencySymbol: curSymbol,
      price: null,
      changePct: input.changePct ?? null,
      action: 'VERİ YOK',
      confidence: 0.3,
      finalScore: null,
      alarmLevel: 'VERİ_YOK',
      alarm: 'VERİ_YOK',
      primaryDriver: 'Yahoo proxy null - VERİ YOK',
      reason: 'Yahoo proxy null - VERİ YOK',
      isTradeAllowed: false,
      validSourceCount,
      zScore: anomaly.zScore,
      zThreshold: threshold,
      obi: board.obi,
      wallLot: board.wallLot,
      wallPrice: board.wallPrice,
      breakoutMinutes: board.breakoutMinutes,
      isFakeWall: board.isFakeWall,
      riskScore: forensic.riskScore,
      coherence: cubes.coherence,
      expoScore: compositeV2.exponentialRiskScore,
      amplifier: compositeV2.nonLinearAmplifier,
      juryScore: input.juryScore ?? null,
      varPct: null,
      kellyPct: null,
      stopPrice: null,
      tpPrice: null,
      naturalLanguageAnalysis: 'Canlı veri yetersiz olduğundan otomatik analiz durdurulmuştur.',
      anomaly,
      board,
      forensic,
      cubes,
      compositeV2,
      engines: enginesObj,
      timestamp: new Date().toISOString(),
      status: 'VERİ YOK',
    };
  }

  // Karar Ağacı Mantığı (Saf Deterministik)
  let action: TacticalAction = 'BEKLE';
  let primaryDriver = 'Dengeli Piyasa Görünümü';
  let alarmLevel: TacticalAlarmLevel = 'DENGELI';
  let isTradeAllowed = true;

  // 1. Öncelik: Adli Manipülasyon ve Jüri Vetosu
  if (input.isJuryVetoed || forensic.isManipulated || (compositeV2.exponentialRiskScore !== null && compositeV2.exponentialRiskScore >= 80)) {
    action = 'SAT';
    alarmLevel = 'MANIPULASYON_ALARM';
    primaryDriver = 'Adli Risk ve Manipülasyon Vetosu Devrede';
    isTradeAllowed = false;
  }
  // 2. Öncelik: Aşırı Hacim Anomali Kırılımı
  else if (anomaly.verdict === 'ANOMALI_ALARM') {
    alarmLevel = 'SUPER_KRITIK_ALARM';
    if (anomaly.zScore !== null && anomaly.zScore > 0 && board.obi !== null && board.obi > 0.2) {
      action = 'AL';
      primaryDriver = `Hacim Patlaması (Z = +${anomaly.zScore}σ) ve Pozitif OBI (+${board.obi.toFixed(2)})`;
    } else if (anomaly.zScore !== null && anomaly.zScore < 0 && board.obi !== null && board.obi < -0.2) {
      action = 'SAT';
      primaryDriver = `Hacim Bozulması (Z = ${anomaly.zScore}σ) ve Negatif OBI (${board.obi.toFixed(2)})`;
    }
  }
  // 3. Öncelik: Küp Konsensüsü
  else if (cubes.overrideAction === 'AL' || cubes.overrideAction === 'SAT') {
    action = cubes.overrideAction;
    primaryDriver = `Çoklu Küp Konsensüsü (${cubes.coherence ?? 0}% Uyum)`;
  }

  const spot = input.price;
  const stopLossPrice = spot !== null ? Number((spot * 0.985).toFixed(2)) : null;
  const takeProfitPrice = spot !== null ? Number((spot * 1.03).toFixed(2)) : null;

  return {
    symbol: input.symbol,
    companyName: input.companyName || input.symbol,
    marketType: input.marketType,
    currencySymbol: curSymbol,
    price: input.price,
    changePct: input.changePct ?? null,
    action,
    confidence: cubes.coherence ?? 50,
    finalScore: cubes.coherence ?? 50,
    alarmLevel,
    alarm: alarmLevel,
    primaryDriver,
    reason: primaryDriver,
    isTradeAllowed,
    validSourceCount,
    zScore: anomaly.zScore,
    zThreshold: threshold,
    obi: board.obi,
    wallLot: board.wallLot,
    wallPrice: board.wallPrice,
    breakoutMinutes: board.breakoutMinutes,
    isFakeWall: board.isFakeWall,
    riskScore: forensic.riskScore,
    coherence: cubes.coherence,
    expoScore: compositeV2.exponentialRiskScore,
    amplifier: compositeV2.nonLinearAmplifier,
    juryScore: input.juryScore ?? null,
    varPct: 2.1,
    kellyPct: 15.0,
    stopPrice: stopLossPrice,
    tpPrice: takeProfitPrice,
    naturalLanguageAnalysis: `${input.symbol}: ${primaryDriver} (Eylem: ${action})`,
    anomaly,
    board,
    forensic,
    cubes,
    compositeV2,
    engines: enginesObj,
    timestamp: new Date().toISOString(),
    status: 'VERİ_VAR',
  };
}

// Geriye dönük uyumluluk için run... alias'ları
export const runAnomalyEngine = evaluateAnomalyEngine;
export const runBoardEngine = evaluateBoardEngine;
export const runForensicEngine = evaluateForensicEngine;
export const runStoryCubesEngine = evaluateStoryCubesEngine;
export const runCompositeV2Engine = evaluateCompositeV2Engine;

/**
 * Belirtilen ticker için taktiksel veriyi toplayıp tek karar zarfı (UnifiedVerdict) üretir.
 */
export async function collectTactical(ticker: string, marketType: TacticalMarketType = 'BIST'): Promise<UnifiedVerdict> {
  const yahooQuote = await getYahooDirectPrice(ticker);
  return collectTacticalVerdict({
    symbol: ticker.replace(/\.IS$/i, ''),
    marketType,
    price: yahooQuote?.price ?? null,
    changePct: yahooQuote?.changePct ?? null,
    volumeHistory: yahooQuote?.volumeHistory ?? null,
    wallLot: yahooQuote?.volume ?? null,
  });
}

export default {
  getPrice,
  calculateZScoreFromHistory,
  getZScoreThreshold,
  evaluateAnomalyEngine,
  evaluateBoardEngine,
  evaluateForensicEngine,
  evaluateStoryCubesEngine,
  evaluateCompositeV2Engine,
  collectTacticalVerdict,
  collectTactical,
  runAnomalyEngine,
  runBoardEngine,
  runForensicEngine,
  runStoryCubesEngine,
  runCompositeV2Engine,
};
