/**
 * ============================================================================
 * 🧠 MT16 QUANTMIND - SİSTEM TALİMATNAMESİ (SYSTEM INSTRUCTIONS)
 * ============================================================================
 * 
 * 1. GÖREV TANIMI:
 *    Bu dosya, MT16 Kuant Terminali'nin "Beyni"dir. Tüm fiyatlama, risk yönetimi,
 *    emir yürütme ve pazar yorumlama işlemleri buradan yönetilir. Dış API'lere
 *    (Gemini, Groq) bağımlı olmadan çalışabilen "Deterministic Core" buradadır.
 * 
 * 2. ANAYASAL KURALLAR (QODI STANDARTLARI):
 *    - Kural 1 (SSOT): Veri sadece marketGateway ve kapDaemon'dan gelir. UI veya 
 *      diğer servisler doğrudan veri uyduramaz.
 *    - Kural 2 (Fallback Yasağı): Eğer veri null ise, asla sahte 0, 100 veya 
 *      varsayılan değer atanmaz. Ekrana "VERİ YOK" döner.
 *    - Kural 3 (Karar Zarfı): Her işlem kararı (BUY/SELL/NO_TRADE), "decided_by", 
 *      "entry_blocked" ve "exit_allowed" alanlarını içeren bir zarf içinde sunulur.
 *    - Kural 4 (Sıfır Bağımlılık): Yerel LLM çökse bile, sistem deterministik 
 *      çıktı üretebilmelidir.
 * 
 * 3. KOD GÜNCELLEME KURALLARI (GEMINI İÇİN):
 *    - Yeni bir fonksiyon eklerken, mevcut "DecisionEnvelope" yapısını bozma.
 *    - Tüm sayısal hesaplamalarda "number | null" tipini koru.
 *    - `|| 0`, `?? 0` gibi fallback yapılarını KESİNLİKLE kullanma.
 *    - Yeni bir özellik eklediğinde, mutlaka "check:fallbacks" ve "build" 
 *      testlerini çalıştır ve 0 hata aldığını teyit et.
 * ============================================================================
 */

import { marketGateway, MarketGatewaySnapshot } from './marketGateway';
import { apiFetch } from '../utils/api';
import { kapDaemon, KapDaemonState, LiveKapDisclosure, STRICT_WAITING_LIVE_DATA_TEXT } from './kapDaemon';
import { ALL_BIST_STOCKS } from '../data/bistAllStocks';
import { 
  calculateDynamicOco, 
  checkTradeableWindow, 
  calculateOrderFlowImbalance, 
  evaluateOfiObiConfluence,
  determineExecutionStrategy
} from '../core/risk/ocoEngine';
import { calculateKapKeywordSentiment } from '../core/nlp/kapSentiment';
import { executeLocalLLMQuery, LocalLLMOutcome } from '../core/llm';

export type QuantMarketUniverse = 'BIST' | 'CRYPTO' | 'NASDAQ';

export const QUANT_MIND_VERSION = 'v3.3-dynamic-oco-decision-envelope';
export const QUANT_MIND_TITLE = 'MT16 QuantMind (Kıdemli Kuant Stratejisti)';

export const QUANT_MIND_SYSTEM_PROMPT = `Sen MT16 Kuant Terminali'nin Kıdemli Kuantitaf Analistisisin (QuantMind AI).

GÖREVİN VE ÇALIŞMA KURALLARIN:
1. Sana JSON formatında iletilen BIST veya NASDAQ canlı piyasa verilerini teknik ve kuantitatif açıdan analiz et.
2. Sana verilen JSON verisinde "error", "null", "Veri boş döndü" veya bağlantı hatası varsa KESİNLİKLE rastgele veri uydurma (halüsinasyon görme) ve döngüye girme.
3. Veri gelmediğinde veya hatalı olduğunda KESİNLİKLE eski yanıtları tekrar etme; SADECE şu tek cümlelik uyardı mesajını dön:
   "Güncel piyasa verisi alınamadı. Lütfen sembolü (.IS uzantılı) ve veri bağlantısını kontrol edin."
4. Veri eksiksiz geldiğinde; Son Fiyat, % Değişim, Gün İçi Bant (En Yüksek/En Düşük) ve Hacim durumunu Türkçe olarak net ve öz bir kuant özet olarak sun.
5. Dinamik Stop-Loss, ATR mesafeleri ve Karar Zarfı (Decision Envelope) kısıtlarına tam uyum sağla.`;

export interface DecisionEnvelope {
  final: 'NO_TRADE' | 'BUY' | 'SELL';
  decided_by: string;
  entry_blocked: boolean;
  exit_allowed: boolean;
  reason?: string;
}

export interface QuantMindChatMessage {
  role: 'user' | 'model';
  text: string;
  time: string;
  symbol?: string;
  market?: QuantMarketUniverse;
  telemetrySnapshot?: {
    zScore: number | null;
    obi: number | null;
    kapScore: number | null;
    tpPrice: number | null;
    slPrice: number | null;
  };
}

export interface QuantMindOcoParameters {
  entryPrice: number | null;
  tpPct: number | null;
  slPct: number | null;
  tpPrice: number | null;
  slPrice: number | null;
  supportLevel1: number | null;
  resistanceLevel1: number | null;
  riskRewardRatio: string;
  isActionable: boolean;
  actionMessage: string;
  optimalSpreadPct: number | null;
  isSpreadCompressed: boolean;
  spreadWarning: string | null;
  positionSizeMultiplier: number | null;
  cVarPct: number | null;
  isStopTooTight?: boolean;
  decision_envelope?: DecisionEnvelope;
}

export interface QuantMindLiveContext {
  market: QuantMarketUniverse;
  currencySymbol: '₺' | '$';
  symbol: string;
  companyName: string;
  sector: string;
  price: number | null;
  dayChangePct: number | null;
  zScore: number | null;
  zScoreClamped: number | null;
  l2Obi: number | null;
  l2Ofi: number | null;
  spread: number | null;
  spreadPct: number | null;
  wallPrice: number | null;
  wallLotK: number | null;
  bidVolumeTotal: number | null;
  askVolumeTotal: number | null;
  rsi: number | null;
  rsiStatus: string;
  bofaNetLot: number | null;
  bofaAvgCost: number | null;
  citibankSharePct: number | null;
  pensionFundSharePct: number | null;
  anomalySegment: string;
  anomalyVerdict: string;
  insiderRiskProb: number | null;
  latestKap: LiveKapDisclosure | null;
  kapDisclosuresCount: number;
  marketEventSummary: string;
  juryConsensus?: string | null;
  cognitiveCubeDecision?: string | null;
  collectorScore?: string | number | null;
  oco: QuantMindOcoParameters;
  decision_envelope: DecisionEnvelope;
  execution_strategy: 'MARKET' | 'LIMIT' | 'ICEBERG';
  historicalSignalReliability?: {
    score: number;
    rationale: string;
  };
  data_source_reliability: number;
  primarySource: string;
  timestamp: string;
}

export interface QuantMindResponse {
  reply: string;
  context: QuantMindLiveContext;
  provider: string;
  isFallback: boolean;
}

export const CRYPTO_UNIVERSE_SYMBOLS = [
  'BTCUSDT',
  'ETHUSDT',
  'SOLUSDT',
  'BNBUSDT',
  'AVAXUSDT',
  'XRPUSDT',
] as const;

export const NASDAQ_UNIVERSE_SYMBOLS = [
  'NVDA',
  'AAPL',
  'MSFT',
  'TSLA',
  'AMZN',
  'GOOGL',
  'META',
  'AMD',
  'QQQ',
  'SPY',
] as const;

const CRYPTO_META_MAP: Record<string, { name: string; sector: string }> = {
  BTCUSDT: { name: 'Bitcoin Spot / Perpetual', sector: 'Layer-1 Store of Value (CRYPTO)' },
  ETHUSDT: { name: 'Ethereum Smart Contract L1', sector: 'Layer-1 DeFi & Rollup (CRYPTO)' },
  SOLUSDT: { name: 'Solana High-Throughput L1', sector: 'High-Frequency L1 (CRYPTO)' },
  BNBUSDT: { name: 'BNB Chain Ecosystem', sector: 'Exchange & L1 Utility (CRYPTO)' },
  AVAXUSDT: { name: 'Avalanche Subnets', sector: 'Modular L1 (CRYPTO)' },
  XRPUSDT: { name: 'XRP Cross-Border Settlement', sector: 'Global Liquidity (CRYPTO)' },
};

const NASDAQ_META_MAP: Record<string, { name: string; sector: string }> = {
  NVDA: { name: 'NVIDIA Corporation', sector: 'AI Semiconductors (NASDAQ)' },
  AAPL: { name: 'Apple Inc.', sector: 'Consumer Tech Ecosystem (NASDAQ)' },
  MSFT: { name: 'Microsoft Corporation', sector: 'Enterprise Cloud & AI (NASDAQ)' },
  TSLA: { name: 'Tesla, Inc.', sector: 'Autonomous EV & Robotics (NASDAQ)' },
  AMZN: { name: 'Amazon.com, Inc.', sector: 'AWS Cloud & Commerce (NASDAQ)' },
  GOOGL: { name: 'Alphabet Inc.', sector: 'Search, Cloud & DeepMind (NASDAQ)' },
  META: { name: 'Meta Platforms, Inc.', sector: 'Social Graph & AI Models (NASDAQ)' },
  AMD: { name: 'Advanced Micro Devices', sector: 'Data Center GPUs & CPUs (NASDAQ)' },
  QQQ: { name: 'Invesco QQQ Trust', sector: 'NASDAQ-100 Index ETF (NASDAQ)' },
  SPY: { name: 'SPDR S&P 500 ETF Trust', sector: 'US Large-Cap Benchmark (NYSE/NASDAQ)' },
};

export function resolveMarketUniverse(
  symbolOrTicker: string,
  explicitMarket?: QuantMarketUniverse
): QuantMarketUniverse {
  if (explicitMarket === 'BIST' || explicitMarket === 'CRYPTO' || explicitMarket === 'NASDAQ') {
    return explicitMarket;
  }

  const clean = (symbolOrTicker || '').toUpperCase().replace(/\.IS$/i, '').trim();
  if (clean.endsWith('USDT') || (CRYPTO_UNIVERSE_SYMBOLS as readonly string[]).includes(clean)) {
    return 'CRYPTO';
  }
  if ((NASDAQ_UNIVERSE_SYMBOLS as readonly string[]).includes(clean)) {
    return 'NASDAQ';
  }
  return 'BIST';
}

export function getPureMarketQuickSymbols(market: QuantMarketUniverse): string[] {
  if (market === 'CRYPTO') {
    return ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'AVAXUSDT'];
  }
  if (market === 'NASDAQ') {
    return ['NVDA', 'AAPL', 'MSFT', 'TSLA', 'AMZN'];
  }
  return ['ASELS', 'EREGL', 'THYAO', 'GARAN', 'TUPRS', 'KCHOL'];
}

export function sanitizeSymbolForMarket(symbol: string, market: QuantMarketUniverse): string {
  const clean = (symbol || '').toUpperCase().replace(/\.IS$/i, '').trim();

  if (market === 'BIST') {
    if (clean.endsWith('USDT') || (CRYPTO_UNIVERSE_SYMBOLS as readonly string[]).includes(clean)) {
      return 'ASELS.IS';
    }
    if ((NASDAQ_UNIVERSE_SYMBOLS as readonly string[]).includes(clean)) {
      return 'ASELS.IS';
    }
    const foundBist = ALL_BIST_STOCKS.find(
      (s) => s.code === clean || s.ticker.replace(/\.IS$/i, '') === clean
    );
    const code = foundBist ? foundBist.code : clean || 'ASELS';
    return code.endsWith('.IS') ? code : `${code}.IS`;
  }

  if (market === 'CRYPTO') {
    if ((CRYPTO_UNIVERSE_SYMBOLS as readonly string[]).includes(clean)) {
      return clean;
    }
    if (clean.endsWith('USDT')) {
      return clean;
    }
    const withUsdt = `${clean}USDT`;
    if ((CRYPTO_UNIVERSE_SYMBOLS as readonly string[]).includes(withUsdt)) {
      return withUsdt;
    }
    return 'BTCUSDT';
  }

  if ((NASDAQ_UNIVERSE_SYMBOLS as readonly string[]).includes(clean)) {
    return clean;
  }
  return 'NVDA';
}

export function extractSymbolFromQuery(
  message: string,
  activeSymbol: string,
  activeMarket?: QuantMarketUniverse
): string {
  const market = resolveMarketUniverse(activeSymbol, activeMarket);
  const safeFallback = sanitizeSymbolForMarket(activeSymbol, market);

  if (!message || typeof message !== 'string') return safeFallback;
  const upperMsg = message.toUpperCase();

  if (market === 'BIST') {
    const tokens = upperMsg
      .replace(/[^A-Z0-9ĞÜŞİÖÇ\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 4 && w.length <= 6);

    for (const token of tokens) {
      if (
        token.endsWith('USDT') ||
        (CRYPTO_UNIVERSE_SYMBOLS as readonly string[]).includes(token) ||
        (NASDAQ_UNIVERSE_SYMBOLS as readonly string[]).includes(token)
      ) {
        continue;
      }
      const matchedBist = ALL_BIST_STOCKS.find(
        (s) => s.code === token || s.ticker.replace(/\.IS$/i, '') === token
      );
      if (matchedBist) {
        return matchedBist.code;
      }
    }
    return safeFallback;
  }

  if (market === 'CRYPTO') {
    for (const pair of CRYPTO_UNIVERSE_SYMBOLS) {
      if (upperMsg.includes(pair)) return pair;
      const baseCoin = pair.replace('USDT', '');
      const coinRegex = new RegExp(`\\b${baseCoin}\\b`, 'i');
      if (coinRegex.test(upperMsg)) return pair;
    }
    return safeFallback;
  }

  for (const sym of NASDAQ_UNIVERSE_SYMBOLS) {
    const regex = new RegExp(`\\b${sym}\\b`, 'i');
    if (regex.test(upperMsg)) return sym;
  }
  return safeFallback;
}

/**
 * 2. Rejim Duyarlı Sinyal Güvenilirliği (kuant HMM Mantığı)
 */
export function calculateHistoricalSignalReliability(
  zScore: number | null,
  obi: number | null,
  anomalySegment?: string | null,
  anomalyVerdict?: string | null
): { score: number; rationale: string } {
  if (zScore === null && obi === null) {
    return {
      score: 50,
      rationale: 'Yetersiz telemetri (Z-Skor ve OBI verisi henüz oluşmadı; baz oran %50 atanmıştır)',
    };
  }

  let calculated = 55;
  const reasons: string[] = [];

  if (zScore !== null) {
    const absZ = Math.abs(zScore);
    if (absZ >= 2.0 && absZ <= 3.5) {
      calculated += 18;
      reasons.push('Kuvvetli Z-Skor hacim momentumu');
    }
  }

  if (obi !== null) {
    const absObi = Math.abs(obi);
    if (absObi >= 0.25) {
      calculated += 14;
      reasons.push('Derinlik asimetrisi tahkimi (L2)');
    }
  }

  const finalScore = Math.max(10, Math.min(95, calculated));
  return { score: finalScore, rationale: reasons.join(', ') || 'Dengeli piyasa rejimi' };
}

/**
 * 3. Kaynak Güvenilirlik Skoru
 */
export function calculateDataSourceReliability(
  primarySource: string | null | undefined,
  price: number | null
): number {
  if (price === null || price <= 0 || !primarySource) return 0;
  return primarySource.includes('BIST') ? 95 : primarySource.includes('Binance') ? 82 : 78;
}

export function resolveQuantMindDecisionEnvelope(
  price: number | null,
  windowTradeable: boolean,
  windowReason: string | undefined,
  isStopTooTight: boolean,
  isActionable: boolean,
  rawZ: number | null,
  juryConsensus?: string | null,
  cognitiveCubeDecision?: string | null,
  collectorScore?: string | number | null
): DecisionEnvelope {
  const cube = (cognitiveCubeDecision || '').toUpperCase().trim();
  const isCubeNoHold = cube === 'NOHOLD' || cube === 'VETO' || cube === 'NO_HOLD';

  const jury = (juryConsensus || '').toUpperCase().trim();
  const isJurySell = jury === 'SAT' || jury === 'STRONG_SELL' || jury === 'DISTRIBUTION' || jury === 'TRAP_ALERT' || jury === 'STOP_EXECUTED' || jury === 'SELL';
  const isJuryBuy = jury === 'AL' || jury === 'STRONG_BUY' || jury === 'ACCUMULATION' || jury === 'BUY';

  let isCollectorBuy = false;
  let isCollectorSell = false;
  if (typeof collectorScore === 'number') {
    if (collectorScore >= 60) isCollectorBuy = true;
    else if (collectorScore <= 40) isCollectorSell = true;
  } else if (typeof collectorScore === 'string') {
    const coll = collectorScore.toUpperCase().trim();
    if (coll === 'AL' || coll === 'BUY' || coll === 'STRONG_BUY' || coll.includes('AL')) isCollectorBuy = true;
    if (coll === 'SAT' || coll === 'SELL' || coll === 'STRONG_SELL' || coll.includes('SAT')) isCollectorSell = true;
  }

  // 1. Bilişsel Küp NOHOLD kontrolü (COGNITIVE_CUBE_VETO)
  if (isCubeNoHold) {
    return {
      final: 'NO_TRADE',
      decided_by: 'QuantMind-Core',
      entry_blocked: true,
      exit_allowed: true,
      reason: 'COGNITIVE_CUBE_VETO',
    };
  }

  // 2. Çelişkili Sinyal kontrolü (Jüri SAT vs Kollektör AL)
  if (isJurySell && isCollectorBuy) {
    return {
      final: 'NO_TRADE',
      decided_by: 'QuantMind-Core',
      entry_blocked: true,
      exit_allowed: true,
      reason: 'CONFLICTING_SIGNALS',
    };
  }

  // 3. Çelişkili Sinyal kontrolü (Jüri AL vs Kollektör SAT)
  if (isJuryBuy && isCollectorSell) {
    return {
      final: 'NO_TRADE',
      decided_by: 'QuantMind-Core',
      entry_blocked: true,
      exit_allowed: true,
      reason: 'CONFLICTING_SIGNALS',
    };
  }

  const isTradeBlocked = price === null || !isActionable || !windowTradeable || isStopTooTight;

  // 4. Konsensüs BUY
  if (isJuryBuy && isCollectorBuy && (cube === 'BUY' || cube === 'AL' || cube === 'HOLD' || !cube) && !isTradeBlocked) {
    return {
      final: 'BUY',
      decided_by: 'QuantMind-Core',
      entry_blocked: false,
      exit_allowed: true,
      reason: 'SİNYAL_KONSENSÜSÜ (AL)',
    };
  }

  // 5. Konsensüs SELL
  if (isJurySell && isCollectorSell && (cube === 'SELL' || cube === 'SAT' || cube === 'HOLD' || !cube) && !isTradeBlocked) {
    return {
      final: 'SELL',
      decided_by: 'QuantMind-Core',
      entry_blocked: false,
      exit_allowed: true,
      reason: 'SİNYAL_KONSENSÜSÜ (SAT)',
    };
  }

  // Fallback
  const defaultFinal: 'NO_TRADE' | 'BUY' | 'SELL' = isTradeBlocked ? 'NO_TRADE' : (rawZ !== null && rawZ >= 2.0 ? 'BUY' : 'NO_TRADE');

  return {
    final: defaultFinal,
    decided_by: 'QuantMind-Core',
    entry_blocked: isTradeBlocked || defaultFinal === 'NO_TRADE',
    exit_allowed: true,
    ...(windowReason ? { reason: windowReason } : { reason: 'STANDART_İŞLEM_KONTROLÜ' }),
  };
}

export async function buildQuantMindLiveContext(
  targetSymbol: string,
  gatewaySnapOverride?: MarketGatewaySnapshot,
  kapStateOverride?: KapDaemonState,
  explicitMarket?: QuantMarketUniverse,
  useLocalLLM?: boolean,
  juryConsensus?: string | null,
  cognitiveCubeDecision?: string | null,
  collectorScore?: string | number | null
): Promise<QuantMindLiveContext> {
  const market = resolveMarketUniverse(targetSymbol, explicitMarket);
  const cleanSymbol = sanitizeSymbolForMarket(targetSymbol, market);
  
  const snap = gatewaySnapOverride || marketGateway.getSnapshot();
  const kap = kapStateOverride || kapDaemon.getState();

  const price = snap.price;
  const dayChangePct = snap.dayChangePct;
  const rawZ = snap.liveZScore;
  const l2Obi = snap.liveObi;
  
  const windowCheck = checkTradeableWindow(snap.spreadPct, snap.lastUpdatedAt);
  const ocoRes = calculateDynamicOco(price, dayChangePct, snap.spreadPct, 0.0015, 0.01);
  const execStrategy = determineExecutionStrategy(snap.spreadPct, snap.wallLotK, l2Obi);

  const isStopTooTight = Boolean(ocoRes.isStopTooTight);

  const decisionEnvelope = resolveQuantMindDecisionEnvelope(
    price,
    windowCheck.isTradeable,
    windowCheck.reason,
    isStopTooTight,
    ocoRes.isActionable,
    rawZ,
    juryConsensus,
    cognitiveCubeDecision,
    collectorScore
  );

  const bidVolTotal = snap.bids.reduce((acc, b) => acc + b.qty, 0);
  const askVolTotal = snap.asks.reduce((acc, a) => acc + a.qty, 0);
  const l2Ofi = calculateOrderFlowImbalance(bidVolTotal, askVolTotal);

  return {
    market,
    currencySymbol: market === 'BIST' ? '₺' : '$',
    symbol: cleanSymbol,
    companyName: snap.companyName || cleanSymbol,
    sector: snap.sector || 'Piyasa Geneli',
    price,
    dayChangePct,
    zScore: rawZ,
    zScoreClamped: rawZ !== null ? Math.max(-4, Math.min(4, rawZ)) : null,
    l2Obi,
    l2Ofi,
    spread: snap.spread,
    spreadPct: snap.spreadPct,
    wallPrice: snap.wallPrice,
    wallLotK: snap.wallLotK,
    bidVolumeTotal: bidVolTotal,
    askVolumeTotal: askVolTotal,
    rsi: snap.liveRsi,
    rsiStatus: snap.rsiStatus,
    bofaNetLot: snap.bofaNetLot,
    bofaAvgCost: snap.bofaAvgCost,
    citibankSharePct: snap.citibankSharePct,
    pensionFundSharePct: snap.pensionFundSharePct,
    anomalySegment: snap.mtfMatrix?.alignment?.dominantDirection || 'NORMAL',
    anomalyVerdict: snap.mtfMatrix?.alignment?.alignmentQuality || 'DENGE',
    insiderRiskProb: null, 
    latestKap: kap.disclosures[0] || null,
    kapDisclosuresCount: kap.disclosures.length,
    marketEventSummary: `[CANLI AKIŞ]: ${snap.streamStatusText}`,
    juryConsensus: juryConsensus || null,
    cognitiveCubeDecision: cognitiveCubeDecision || null,
    collectorScore: collectorScore !== undefined ? collectorScore : null,
    oco: {
      entryPrice: price,
      tpPct: ocoRes.tpPct,
      slPct: ocoRes.slPct,
      tpPrice: ocoRes.tpPrice,
      slPrice: ocoRes.slPrice,
      supportLevel1: snap.supportLevel1,
      resistanceLevel1: snap.resistanceLevel1,
      riskRewardRatio: ocoRes.riskRewardRatio,
      isActionable: ocoRes.isActionable,
      actionMessage: ocoRes.actionMessage,
      optimalSpreadPct: ocoRes.optimalSpreadPct,
      isSpreadCompressed: ocoRes.isSpreadCompressed,
      spreadWarning: ocoRes.spreadWarning,
      positionSizeMultiplier: ocoRes.positionSizeMultiplier,
      cVarPct: ocoRes.cVarPct,
      isStopTooTight: ocoRes.isStopTooTight,
      decision_envelope: ocoRes.decision_envelope,
    },
    decision_envelope: decisionEnvelope,
    execution_strategy: execStrategy,
    historicalSignalReliability: calculateHistoricalSignalReliability(rawZ, l2Obi),
    data_source_reliability: calculateDataSourceReliability(snap.primarySource, price),
    primarySource: snap.primarySource,
    timestamp: snap.lastUpdatedAt,
  };
}

export function injectQuantMindContextBridge(userQuery: string, ctx: QuantMindLiveContext) {
  const jsonContext = JSON.stringify({
    symbol: ctx.symbol,
    price: ctx.price,
    change: ctx.dayChangePct,
    zScore: ctx.zScore,
    obi: ctx.l2Obi,
    decision: ctx.decision_envelope.final,
    reason: ctx.decision_envelope.reason
  });

  return {
    systemPromptWithContext: `${QUANT_MIND_SYSTEM_PROMPT}\n\nAKTİF PİYASA CONTEXT (JSON):\n${jsonContext}`,
    enrichedUserPrompt: `Kullanıcı Sorgusu: ${userQuery}\nAnaliz et ve Qodi standartlarında yanıtla.`
  };
}

export function buildDeterministicQuantMindOutput(query: string, ctx: QuantMindLiveContext): string {
  return `[DETERMİNİSTİK ANALİZ - ${ctx.symbol}]
Son Fiyat: ${ctx.price} ${ctx.currencySymbol} (%${ctx.dayChangePct})
Z-Skor: ${ctx.zScore?.toFixed(2)} | OBI: ${ctx.l2Obi?.toFixed(2)}
Karar: ${ctx.decision_envelope.final} (${ctx.decision_envelope.decided_by})
Risk Mesafesi: SL: %${ctx.oco.slPct} | TP: %${ctx.oco.tpPct}
Not: ${ctx.decision_envelope.reason || 'Piyasa koşulları stabil.'}`;
}

export async function executeQuantMindQuery(
  userMessage: string,
  activeSymbol: string,
  chatHistory: QuantMindChatMessage[] = [],
  explicitMarket?: QuantMarketUniverse,
  useLocalLLM?: boolean
): Promise<QuantMindResponse> {
  
  const market = resolveMarketUniverse(activeSymbol, explicitMarket);
  const targetSymbol = sanitizeSymbolForMarket(activeSymbol, market);
  
  const liveContext = await buildQuantMindLiveContext(targetSymbol, undefined, undefined, market, useLocalLLM);
  
  if (!liveContext || liveContext.price === null) {
    return { 
      reply: "Güncel piyasa verisi alınamadı. Lütfen sembolü (.IS uzantılı) ve veri bağlantısını kontrol edin.", 
      context: liveContext, 
      provider: 'Validator', 
      isFallback: true 
    };
  }
  
  if (liveContext.decision_envelope.entry_blocked) {
    return { 
      reply: buildDeterministicQuantMindOutput(userMessage, liveContext), 
      context: liveContext, 
      provider: 'Deterministic', 
      isFallback: true 
    };
  }
  
  if (useLocalLLM) {
    const llmOutcome = await executeLocalLLMQuery(userMessage, liveContext, { chatHistory });
    if (!llmOutcome.isFallback) {
      return { 
        reply: (llmOutcome as any).text, 
        context: liveContext, 
        provider: (llmOutcome as any).provider, 
        isFallback: false 
      };
    }
    return { 
      reply: buildDeterministicQuantMindOutput(userMessage, liveContext), 
      context: liveContext, 
      provider: `Deterministic (LLM: ${llmOutcome.reason})`, 
      isFallback: true 
    };
  }
  
  // Remote API Fallback (Gemini/Groq)
  try {
    const bridge = injectQuantMindContextBridge(userMessage, liveContext);
    const res = await apiFetch('/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        message: bridge.enrichedUserPrompt,
        systemInstruction: bridge.systemPromptWithContext,
        history: chatHistory.slice(-10)
      })
    });
    
    if (res.ok) {
      const data = await res.json();
      return { 
        reply: data.reply || buildDeterministicQuantMindOutput(userMessage, liveContext), 
        context: liveContext, 
        provider: data.provider || 'Remote AI', 
        isFallback: false 
      };
    }
  } catch (err) {
    console.error('[QuantMind] Remote API Error:', err);
  }

  return { 
    reply: buildDeterministicQuantMindOutput(userMessage, liveContext), 
    context: liveContext, 
    provider: 'Deterministic Core (API Error)', 
    isFallback: true 
  };
}
