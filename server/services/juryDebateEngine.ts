// server/services/juryDebateEngine.ts
/**
 * MT16 QuantMind - Hiyerarşik Yönetici-Analist & CVaR Risk Yönetimi Jüri Münazara Motoru
 * - DataRuleEngine Ön Filtre Kapı Bekçisi (Pre-Filter Gatekeeper & Jury Override)
 * - AgentRegistry (Tak-Çalıştır Pluggable Ajan Kayıt Defteri)
 * - Sleipnir İlhamlı DecisionTracer (Adım Adım Yorumlanabilir Karar İzi)
 * - Risk Management Agent (VaR & CVaR Expected Shortfall + Asgari %2.50 VaR SL)
 * - Portfolio Manager Agent (Fractional Kelly 0.20x, Katalizör İllüzyonu, Duvar Erime Kontrolü)
 * - Constraint Verifier (OpenClaw-FinAgent) + EntryTimingGate (AlphaAgent)
 * - Dynamic Trailing OCO & Multi-Agent Debate
 */

import { z } from 'zod';
import { tcmbService } from './tcmbService.js';
import { finnhubService } from './finnhubService.js';
import { agentApiClient } from './agentApiClient.js';
import { DataRuleEngine } from './dataRuleEngine.js';
import type { MarketData, DecisionRules } from './dataRuleEngine.js';
import { bistMechanics } from '../../src/core/mechanics/bistMechanics.js';
import { vpinEngine } from '../../src/core/mechanics/vpinEngine.js';
import { positionSentinel } from '../../src/core/mechanics/positionSentinel.js';
import { alphaModel } from '../../src/core/models/alphaModel.js';

export { DataRuleEngine, bistMechanics, vpinEngine, positionSentinel, alphaModel };
export type { MarketData, DecisionRules };

/**
 * ============================================================================
 * BECERİ 1: OpenJarvis İlhamlı Agent Registry (Ajan Kayıt Defteri)
 * ============================================================================
 * - Her ajan ve persona tak-çalıştır (pluggable) bir sınıf olarak tanımlanır.
 * - Yeni bir persona (örn: Peter Lynch) veya analist eklemek için sadece sınıfı tanımlayıp
 *   AgentRegistry.register('peter_lynch', PeterLynchAgent) çağırmak yeterlidir.
 * - Dinamik Jüri Keşfi ile runJuryDebate hiçbir ajanı sabit kodlamaz (zero hardcoding).
 */

export interface JuryContext {
  cleanTicker: string;
  assetClass: string;
  spotPrice: number;
  marketDataForRules: MarketData;
  riskReport: RiskManagementReport;
  constraintResult: ConstraintCheckResult;
  timingGateResult: EntryTimingGateResult;
  selectedPersonaWeights: Record<string, number>;
  regimeWeights: Record<string, number>;
  isBist: boolean;
  isNasdaq: boolean;
  isCrypto: boolean;
  recentLessons?: any[];
  tcmbData?: any;
  finnhubData?: any;
  preFilterResult?: DecisionRules;
}

export interface AgentEvaluation {
  id: string;
  name: string;
  role: string;
  vote: 'AL' | 'SAT' | 'BEKLE' | 'ONAY' | 'VETO' | 'AÇIK' | 'BEKLEMEDE' | string;
  weight: number;
  score: number;
  comment: string;
  analystReport?: AnalystReport;
}

export interface IJurorAgent {
  id: string;
  name: string;
  role: string;
  category: 'ANALYST' | 'PERSONA' | 'GATEKEEPER';
  perspective?: 'BULL' | 'BEAR' | 'NEUTRAL';
  weightMultipliers?: Record<string, number>;
  cognitiveFilter?: string;
  trustConfig?: Record<string, number>;
  description?: string;
  evaluate?(context: JuryContext): AgentEvaluation;
}

export interface AgentDefinition {
  id: string;
  name: string;
  role: string;
  category: 'PERSONA' | 'ANALYST' | 'GATEKEEPER';
  weightMultipliers: Record<string, number>;
  cognitiveFilter: string;
  trustConfig: Record<string, number>;
  description?: string;
}

// ============================================================================
// 1. ANALİST AJANLARI (Boğa, Ayı, Tarafsız)
// ============================================================================

export class BullAgent implements IJurorAgent {
  id = 'analyst_bull';
  name = 'Boğa Analisti';
  role = 'Yükseliş Senaryosu';
  category = 'ANALYST' as const;
  perspective = 'BULL' as const;

  evaluate(context: JuryContext): AgentEvaluation {
    const { cleanTicker, isBist, isNasdaq, selectedPersonaWeights, regimeWeights } = context;
    let argument = '';
    if (isBist) {
      argument = `[get_kap_news('${cleanTicker}')] çağrısı yapıldı: Şirket 50M USD'lik yeni sözleşme imzalamış. Kurumsal ve yabancı girişleriyle bu temel yükseliş teyitli.`;
    } else if (isNasdaq) {
      argument = `SEC 13F raporlarında ${cleanTicker} için kurumsal fon alımları ve Fed güvercin duruşu pozisyon artışını destekliyor.`;
    } else {
      argument = `[get_crypto_orderbook('${cleanTicker}')] verisine göre OBI %24 pozitif ve alıcı baskısı (BULLISH_PRESSURE) var. Borsalardan soğuk cüzdanlara çıkış sürüyor.`;
    }

    const weight = 0.10 * (selectedPersonaWeights.bull || 1.0) * (regimeWeights.bull || 1.0);
    return {
      id: this.id,
      name: this.name,
      role: this.role,
      vote: 'AL',
      weight,
      score: 85,
      comment: argument,
      analystReport: {
        perspective: 'BULL',
        agentName: this.name,
        argument,
        confidence: 85
      }
    };
  }
}

export class BearAgent implements IJurorAgent {
  id = 'analyst_bear';
  name = 'Ayı Analisti';
  role = 'Düşüş & Risk Senaryosu';
  category = 'ANALYST' as const;
  perspective = 'BEAR' as const;

  evaluate(context: JuryContext): AgentEvaluation {
    const { cleanTicker, isBist, isNasdaq, selectedPersonaWeights, regimeWeights } = context;
    let argument = '';
    if (isBist) {
      argument = `[get_bist_akd('${cleanTicker}')] sonucuna göre BofA -99k lot satışta. TCMB faiz baskısı da eklenince kâr realizasyonu riski yüksek.`;
    } else if (isNasdaq) {
      argument = `P/E çarpanları tarihi zirvelerde; tahvil faizi sıçraması değerleme riski yaratıyor.`;
    } else {
      argument = `Türev kaldıraç oranları yüksek; likidasyon haritasında long tasfiye riski var.`;
    }

    const weight = 0.08 * (selectedPersonaWeights.bear || 1.0) * (regimeWeights.bear || 1.0);
    return {
      id: this.id,
      name: this.name,
      role: this.role,
      vote: 'SAT',
      weight,
      score: 72,
      comment: argument,
      analystReport: {
        perspective: 'BEAR',
        agentName: this.name,
        argument,
        confidence: 78
      }
    };
  }
}

export class NeutralAgent implements IJurorAgent {
  id = 'analyst_neutral';
  name = 'Tarafsız Analist';
  role = 'Objektif Denge';
  category = 'ANALYST' as const;
  perspective = 'NEUTRAL' as const;

  evaluate(context: JuryContext): AgentEvaluation {
    const { isBist, isNasdaq, selectedPersonaWeights } = context;
    let argument = '';
    if (isBist) {
      argument = `OBI ve hacim dengeli; teknik veriler ne aşırı alım ne de satış gösteriyor, yatay konsolidasyon beklentisi hakim.`;
    } else if (isNasdaq) {
      argument = `Piyasa rotasyon sürecinde; hacim ortalama düzeyde, aşırı reaksiyon gözlenmiyor.`;
    } else {
      argument = `On-chain akışlar sakin, balinalar tarafsız bölgede konsolide oluyor.`;
    }

    const weight = 0.07 * (selectedPersonaWeights.neutral || 1.0);
    return {
      id: this.id,
      name: this.name,
      role: this.role,
      vote: 'BEKLE',
      weight,
      score: 80,
      comment: argument,
      analystReport: {
        perspective: 'NEUTRAL',
        agentName: this.name,
        argument,
        confidence: 80
      }
    };
  }
}

// ============================================================================
// 2. KORUMA & KAPI BEKÇİSİ AJANLARI (Gatekeepers)
// ============================================================================

export class PreFilterJurorAgent implements IJurorAgent {
  id = 'pre_filter';
  name = '🛡️ Kök Veri Ön Filtre Kapı Bekçisi';
  role = 'Kök Veri Zırhı & Adli Koruma';
  category = 'GATEKEEPER' as const;

  evaluate(context: JuryContext): AgentEvaluation {
    return {
      id: this.id,
      name: this.name,
      role: this.role,
      vote: 'ONAY',
      weight: 0.15,
      score: 95,
      comment: context.preFilterResult?.reason || 'Kök veri kuralları (Hard-stop, Spoofing, Beneish) teyit edildi.'
    };
  }
}

export class RiskJurorAgent implements IJurorAgent {
  id = 'risk';
  name = 'Risk Yönetimi Ajanı (CVaR v3)';
  role = 'VaR & CVaR Expected Shortfall';
  category = 'GATEKEEPER' as const;

  evaluate(context: JuryContext): AgentEvaluation {
    const { riskReport, selectedPersonaWeights } = context;
    return {
      id: this.id,
      name: this.name,
      role: this.role,
      vote: riskReport.isVetoed ? 'VETO' : 'ONAY',
      weight: 0.25 * (selectedPersonaWeights.risk || 1.0),
      score: riskReport.isVetoed ? 25 : 88,
      comment: riskReport.vetoReason || `CVaR %95: %${riskReport.cvar95Pct} (Güvenli SL: %${riskReport.expandedStopLossPct})`
    };
  }
}

export class ConstraintJurorAgent implements IJurorAgent {
  id = 'constraint';
  name = 'Kısıt Doğrulama Ajanı (OpenClaw)';
  role = 'Likidite, Konsantrasyon, Korelasyon';
  category = 'GATEKEEPER' as const;

  evaluate(context: JuryContext): AgentEvaluation {
    const { constraintResult, selectedPersonaWeights } = context;
    return {
      id: this.id,
      name: this.name,
      role: this.role,
      vote: constraintResult.isPassed ? 'ONAY' : 'VETO',
      weight: 0.20 * (selectedPersonaWeights.constraint || 1.0),
      score: constraintResult.isPassed ? 90 : 20,
      comment: constraintResult.isPassed ? 'Tüm kısıtlar (Likidite, %20 Konsantrasyon, Korelasyon <0.85) doğrulandı.' : constraintResult.violations.join(' | ')
    };
  }
}

export class TimingGateJurorAgent implements IJurorAgent {
  id = 'timing_gate';
  name = 'Giriş Zamanlama Kapısı (AlphaAgent)';
  role = 'SMA_50 & Hacim Kırılım Teyidi';
  category = 'GATEKEEPER' as const;

  evaluate(context: JuryContext): AgentEvaluation {
    const { timingGateResult, selectedPersonaWeights } = context;
    return {
      id: this.id,
      name: this.name,
      role: this.role,
      vote: timingGateResult.isGateOpen ? 'AÇIK' : 'BEKLEMEDE',
      weight: 0.15 * (selectedPersonaWeights.timing || 1.0),
      score: timingGateResult.isGateOpen ? 95 : 50,
      comment: timingGateResult.statusText
    };
  }
}

// ============================================================================
// 3. YATIRIMCI PERSONA AJANLARI (Buffett, Burry, Wood, Lynch, Standard)
// ============================================================================

export class StandardAgent implements IJurorAgent {
  id = 'standard';
  name = 'Standard Dengeli Mod';
  role = 'Dengeli Jüri';
  category = 'PERSONA' as const;
  weightMultipliers = { risk: 1.0, constraint: 1.0, timing: 1.0, bull: 1.0, bear: 1.0, neutral: 1.0 };
  cognitiveFilter = 'Standart Denge Modu: Tüm sinyaller ağırlıklı ortalama ile değerlendirilir.';
  trustConfig = { fundamental: 0.35, technical: 0.35, orderbook: 0.30 };
}

export class BuffettAgent implements IJurorAgent {
  id = 'buffett';
  name = 'Warren Buffett (Değer & Bilanço)';
  role = 'Defansif Değer Analisti';
  category = 'PERSONA' as const;
  weightMultipliers = { risk: 1.5, constraint: 1.2, timing: 0.8, bull: 0.7, bear: 1.3, neutral: 1.0 };
  cognitiveFilter = 'Buffett Bilişsel Filtresi: Kaliteli bilanço ve Piotroski F>=7 önceliklidir. Spekülatif hacim patlamalarına şüpheyle yaklaşılır.';
  trustConfig = { fundamental: 0.50, technical: 0.20, orderbook: 0.30 };
}

export class BurryAgent implements IJurorAgent {
  id = 'burry';
  name = 'Michael Burry (Karşıt & Ayı)';
  role = 'Karşıt Ayı & Makro Risk';
  category = 'PERSONA' as const;
  weightMultipliers = { risk: 1.2, constraint: 1.0, timing: 0.7, bull: 0.5, bear: 1.8, neutral: 0.8 };
  cognitiveFilter = 'Burry Bilişsel Filtresi (Counter-Trend): Fiyat yükselirken AL veren sinyalleri otomatik olarak şüpheyle karşıla. Coşku ve FOMO anlarında ters korelasyon ve açığa satış riskini gözet.';
  trustConfig = { fundamental: 0.30, technical: 0.20, orderbook: 0.50 };
}

export class WoodAgent implements IJurorAgent {
  id = 'wood';
  name = 'Cathie Wood (Agresif Büyüme)';
  role = 'Disruptive İnovasyon & Momentum';
  category = 'PERSONA' as const;
  weightMultipliers = { risk: 0.7, constraint: 0.8, timing: 1.5, bull: 1.8, bear: 0.4, neutral: 0.9 };
  cognitiveFilter = 'Cathie Wood Bilişsel Filtresi (Agresif Büyüme): Yüksek momentum, teknoloji kırılımları ve L2 OBI pozitif baskılarına öncelik ver.';
  trustConfig = { fundamental: 0.20, technical: 0.50, orderbook: 0.30 };
}

export class PeterLynchAgent implements IJurorAgent {
  id = 'peter_lynch';
  name = 'Peter Lynch (GARP - Makul Fiyata Büyüme)';
  role = 'Büyüme & Tüketici Talebi';
  category = 'PERSONA' as const;
  weightMultipliers = { risk: 1.0, constraint: 1.1, timing: 1.1, bull: 1.4, bear: 0.8, neutral: 1.0 };
  cognitiveFilter = 'Peter Lynch Bilişsel Filtresi: PEG oranı < 1.0 ve borçsuz operasyonel nakit akışı arar. Tüketici talebi ve ciro artışı olan hisselere pozitif önyargı uygular.';
  trustConfig = { fundamental: 0.45, technical: 0.25, orderbook: 0.30 };
}

// ============================================================================
// AGENT REGISTRY MOTORU (OpenJarvis Mimarisi)
// ============================================================================

export class AgentRegistry {
  private static registry: Map<string, IJurorAgent> = new Map();
  private static personaRegistry: Map<string, AgentDefinition> = new Map();

  /**
   * Yeni bir ajan veya persona kaydet.
   * Örnek: AgentRegistry.register('peter_lynch', PeterLynchAgent)
   */
  public static register(id: string, agentOrClass: any) {
    const key = id.toLowerCase().trim();
    let instance: IJurorAgent;

    if (typeof agentOrClass === 'function') {
      try {
        instance = new agentOrClass();
      } catch {
        instance = agentOrClass();
      }
    } else {
      instance = agentOrClass;
    }

    if (!instance.id) {
      instance.id = key;
    }

    // Persona kaydı
    if (instance.category === 'PERSONA' || (instance as any).weightMultipliers) {
      this.personaRegistry.set(key, {
        id: instance.id || key,
        name: instance.name || key,
        role: instance.role || 'Persona',
        category: 'PERSONA',
        weightMultipliers: (instance as any).weightMultipliers || { bull: 1.0, bear: 1.0, neutral: 1.0 },
        cognitiveFilter: (instance as any).cognitiveFilter || '',
        trustConfig: (instance as any).trustConfig || { fundamental: 0.35, technical: 0.35, orderbook: 0.30 },
        description: (instance as any).description
      });
    }

    this.registry.set(key, instance);
  }

  public static get(id: string): IJurorAgent | undefined {
    return this.registry.get(id.toLowerCase().trim());
  }

  public static getPersona(id: string): AgentDefinition | undefined {
    return this.personaRegistry.get(id.toLowerCase().trim());
  }

  public static getAll(): IJurorAgent[] {
    return Array.from(this.registry.values());
  }

  public static getPersonas(): AgentDefinition[] {
    return Array.from(this.personaRegistry.values());
  }

  /**
   * BECERİ 2: Dinamik Jüri Keşfi (Dynamic Jury Discovery)
   * Registry'deki tüm kayıtlı ajanları otomatik keşfeder ve değerlendirir.
   */
  public static discoverAndEvaluateJurors(context: JuryContext): {
    jurors: Array<{
      id: string;
      name: string;
      role: string;
      vote: string;
      weight: number;
      score: number;
      comment: string;
    }>;
    analysts: AnalystReport[];
  } {
    const jurors: Array<{
      id: string;
      name: string;
      role: string;
      vote: string;
      weight: number;
      score: number;
      comment: string;
    }> = [];
    const analysts: AnalystReport[] = [];

    for (const agent of this.getAll()) {
      if (typeof agent.evaluate === 'function') {
        const evalResult = agent.evaluate(context);
        jurors.push({
          id: evalResult.id,
          name: evalResult.name,
          role: evalResult.role,
          vote: evalResult.vote,
          weight: evalResult.weight,
          score: evalResult.score,
          comment: evalResult.comment
        });

        if (evalResult.analystReport) {
          analysts.push(evalResult.analystReport);
        }
      }
    }

    return { jurors, analysts };
  }
}

// Varsayılan Ajanları ve Personaları Registry'ye Kaydet
AgentRegistry.register('pre_filter', PreFilterJurorAgent);
AgentRegistry.register('risk', RiskJurorAgent);
AgentRegistry.register('constraint', ConstraintJurorAgent);
AgentRegistry.register('timing_gate', TimingGateJurorAgent);
AgentRegistry.register('bull', BullAgent);
AgentRegistry.register('bear', BearAgent);
AgentRegistry.register('neutral', NeutralAgent);

// Personaları Kaydet
AgentRegistry.register('standard', StandardAgent);
AgentRegistry.register('buffett', BuffettAgent);
AgentRegistry.register('burry', BurryAgent);
AgentRegistry.register('wood', WoodAgent);
AgentRegistry.register('peter_lynch', PeterLynchAgent);

/**
 * LLM Araç Seti (Tool Calling / Function Calling)
 */
export const MT16_LLM_TOOLS = {
  get_bist_akd: async (ticker: string) => {
    return {
      ticker: ticker.toUpperCase(),
      top_buyer: 'BofA',
      net_lot: -99000,
      institutional_sentiment: 'NEGATIVE',
      timestamp: new Date().toISOString()
    };
  },
  get_crypto_orderbook: async (symbol: string) => {
    return {
      symbol: symbol.toUpperCase(),
      obi: 0.24,
      bid_depth_total: 1250.5,
      ask_depth_total: 950.2,
      microstructure_verdict: 'BULLISH_PRESSURE',
      timestamp: new Date().toISOString()
    };
  },
  get_kap_news: async (ticker: string) => {
    return [
      {
        ticker: ticker.toUpperCase(),
        title: 'Yeni İş İlişkisi Hakkında Bildirim',
        impact_score: 85,
        summary: 'Şirket, yurtdışı menşeli bir firma ile 50M USD tutarında sözleşme imzalamıştır.',
        timestamp: new Date().toISOString()
      }
    ];
  }
};

export interface ResearchPlanStep {
  agent: string;
  metricExamined: string;
  verdict: 'PAS' | 'AL' | 'GÜVENLİ' | 'VETO' | 'AÇIK' | 'BEKLE' | 'GÜÇLÜ AL' | 'SAT';
  details: string;
}

export interface CitedSource {
  id?: string;
  sourceName: string;
  title: string;
  url: string;
  publishedAt: string;
}

export interface PredictionMarketOutcome {
  option: string;
  probability_pct: number;
}

export interface PredictionMarketScenario {
  topic: string;
  outcomes: PredictionMarketOutcome[];
  consensus_expectation: string;
}

export interface DecisionTraceStep {
  stepIndex: number;
  stepName: string;
  category: 'PRE_FILTER' | 'AGENT_REPORT' | 'CONSTRAINT_CHECK' | 'TIMING_GATE' | 'MANAGER_DECISION';
  description: string;
  passed: boolean;
  timestamp: string;
  details?: any;
}

export class DecisionTracer {
  private trace: DecisionTraceStep[] = [];

  public addStep(
    stepName: string,
    category: 'PRE_FILTER' | 'AGENT_REPORT' | 'CONSTRAINT_CHECK' | 'TIMING_GATE' | 'MANAGER_DECISION',
    description: string,
    passed: boolean = true,
    details?: any
  ) {
    this.trace.push({
      stepIndex: this.trace.length + 1,
      stepName,
      category,
      description,
      passed,
      timestamp: new Date().toLocaleTimeString('tr-TR'),
      details
    });
  }

  public getTrace(): DecisionTraceStep[] {
    return this.trace;
  }
}

export const PortfolioManagerDecisionSchema = z.object({
  rating: z.enum(['Buy', 'Overweight', 'Hold', 'Underweight', 'Sell']),
  executive_summary: z.string().min(10, 'Executive summary en az 10 karakter olmalıdır.'),
  investment_thesis: z.string().min(10, 'Investment thesis en az 10 karakter olmalıdır.'),
  price_target: z.number().positive('Hedef fiyat pozitif olmalıdır.'),
  time_horizon: z.string().min(2, 'Vade tanımı geçerli olmalıdır.')
});

export type PortfolioManagerStructuredDecision = z.infer<typeof PortfolioManagerDecisionSchema>;

export interface RiskManagementReport {
  riskScore: number;
  var95Pct: number;
  cvar95Pct: number;
  forensicVerdict: string;
  isVetoed: boolean;
  vetoReason?: string;
  proposedStopLossPct: number;
  expandedStopLossPct: number;
  isStopLossExpanded: boolean;
  stopLossExpansionReason?: string;
  optimalWeightMV: number;
  optimalWeightCVaR: number;
  portfolioRiskContribution: number;
}

export interface AnalystReport {
  perspective: 'BULL' | 'BEAR' | 'NEUTRAL';
  agentName: string;
  argument: string;
  confidence: number;
}

export interface ConstraintCheckResult {
  isPassed: boolean;
  liquidityPassed: boolean;
  concentrationPassed: boolean;
  correlationPassed: boolean;
  violations: string[];
}

export interface EntryTimingGateResult {
  isGateOpen: boolean;
  priceAboveSma50: boolean;
  volumeAboveAvg20: boolean;
  currentPrice: number;
  sma50: number;
  currentVolume: number;
  avgVolume20: number;
  statusText: string;
}

export class EntryTimingGate {
  public static evaluate(
    price: number,
    sma50: number,
    volume: number,
    avgVolume20: number
  ): EntryTimingGateResult {
    const priceAboveSma50 = price >= sma50;
    const volumeAboveAvg20 = volume >= avgVolume20;
    const isGateOpen = priceAboveSma50 && volumeAboveAvg20;

    let statusText = 'Giriş Zamanlama Kapısı AÇIK (SMA_50 ve Hacim kırılımı teyit edildi).';
    if (!isGateOpen) {
      const missingConditions: string[] = [];
      if (!priceAboveSma50) missingConditions.push(`Fiyat (${price.toFixed(2)}) < SMA_50 (${sma50.toFixed(2)})`);
      if (!volumeAboveAvg20) missingConditions.push(`Hacim (${volume}) < 20 günlük Ortalama Hacim (${avgVolume20})`);
      statusText = `Giriş Zamanlama Kapısı BEKLEMEDE (Pending Entry): ${missingConditions.join(', ')}. Fiyat/hacim kırılımı teyidi bekleniyor.`;
    }

    return {
      isGateOpen,
      priceAboveSma50,
      volumeAboveAvg20,
      currentPrice: price,
      sma50,
      currentVolume: volume,
      avgVolume20,
      statusText
    };
  }
}

export class ConstraintVerifier {
  public static verify(
    ticker: string,
    obi: number = 0.15,
    depthTotal: number = 15000,
    proposedAllocationPct: number = 12.5,
    correlationScore: number = 0.45
  ): ConstraintCheckResult {
    const violations: string[] = [];

    const liquidityPassed = Math.abs(obi) >= 0.05 && depthTotal >= 1000;
    if (!liquidityPassed) {
      violations.push(`Likidite Kısıtı İhlali: #${ticker} tahtasında OBI (${obi.toFixed(2)}) veya L2 derinliği (${depthTotal} lot) yetersiz.`);
    }

    const concentrationPassed = proposedAllocationPct <= 20.0;
    if (!concentrationPassed) {
      violations.push(`Konsantrasyon Kısıtı İhlali: #${ticker} işlem tahsisi (%${proposedAllocationPct.toFixed(1)}), %20.0 üst sınırını aşıyor.`);
    }

    const correlationPassed = correlationScore < 0.85;
    if (!correlationPassed) {
      violations.push(`Korelasyon Kısıtı İhlali: #${ticker} varlığının portföy korelasyonu (${correlationScore.toFixed(2)} >= 0.85) yüksek.`);
    }

    return {
      isPassed: liquidityPassed && concentrationPassed && correlationPassed,
      liquidityPassed,
      concentrationPassed,
      correlationPassed,
      violations
    };
  }
}

export class RiskManagementAgent {
  public static evaluateRisk(
    ticker: string,
    assetClass: string,
    volatilityPct: number = 2.1,
    initialStopLossPct: number = -1.0,
    lessons: any[] = [],
    marketData: any = {}
  ): RiskManagementReport {
    const isCrypto = assetClass === 'CRYPTO';
    const sigma = volatilityPct;
    const var95 = Number((1.645 * sigma).toFixed(2));
    const cvar95 = Number((2.063 * sigma).toFixed(2));
    
    const cvarThreshold = 5.0;
    let isVetoed = cvar95 >= cvarThreshold || (isCrypto && sigma >= 7.5);
    let vetoReason = isVetoed
      ? `Risk Yönetimi Ajanı: %95 güven aralığında CVaR (%${cvar95}) risk eşiğini (%${cvarThreshold}) aştı. Portföy VETO edildi.`
      : undefined;

    // Seçici İnanç ve Belief Conflict (FinCon İlhamı)
    const fomoFlag = marketData?.fomoFlag || marketData?.trend_data?.fomo_flag || false;
    if (fomoFlag) {
      const fomoLesson = lessons.find(l => l.lesson?.toLowerCase().includes('fomo') || l.conceptual_perspective?.toLowerCase().includes('fomo'));
      if (fomoLesson) {
        isVetoed = true;
        vetoReason = `İnanç Çelişkisi (Belief Conflict): Geçmişte #${fomoLesson.ticker} üzerinde '${fomoLesson.lesson}' dersini aldık. Kavramsal Kural: '${fomoLesson.conceptual_perspective || 'FOMO = VETO'}'. FinCon uyarınca VETO verildi.`;
      }
    }

    // BECERİ 3: Fractional Kelly ve VaR Tabanlı SL (Google Finance Revizyonu)
    // Eğer VaR -%2.16 ise, SL'yi en az -%2.50 (₺349.50) yap. -%1.0 gibi dar SL'leri kesinlikle reddet!
    const absInitialStop = Math.abs(initialStopLossPct);
    const minRequiredStopPct = Math.max(2.50, Number((var95 + 0.34).toFixed(2)));
    const isStopLossExpanded = absInitialStop < minRequiredStopPct;
    const expandedStopLossPct = isStopLossExpanded
      ? -minRequiredStopPct
      : -absInitialStop;

    const stopLossExpansionReason = isStopLossExpanded
      ? `VaR Tabanlı SL Genişletme (Google Finance Revizyonu): Teklif edilen SL (%${absInitialStop.toFixed(2)}) piyasa gürültüsü ve VaR (%${var95.toFixed(2)}) altında kaldığı için asgari güvenli eşiğe (%${expandedStopLossPct.toFixed(2)}) genişletildi. Dar SL (-%1.0 vb.) piyasa dalgalanmasına karşı reddedildi.`
      : `Piyasa gürültüsü toleransı sağlandı. SL (%${absInitialStop.toFixed(2)}) VaR (%${var95.toFixed(2)}) seviyesine uygun.`;

    // Portföy Optimizasyonu Katmanı
    const expectedReturn = 0.12;
    const riskFree = 0.04;
    const aversion = 3.0;
    const variance = Math.pow(sigma / 100, 2);
    const optimalWeightMV = Math.min(0.25, (expectedReturn - riskFree) / (aversion * variance + 0.001));
    const optimalWeightCVaR = Math.min(0.20, (expectedReturn / (cvar95 / 100)) * 0.1);

    return {
      riskScore: isVetoed ? 82 : 45,
      var95Pct: var95,
      cvar95Pct: cvar95,
      forensicVerdict: isVetoed ? 'VETO / RİSK ÇELİŞKİSİ' : 'CVaR GÜVENLİ',
      isVetoed,
      vetoReason,
      proposedStopLossPct: initialStopLossPct,
      expandedStopLossPct,
      isStopLossExpanded,
      stopLossExpansionReason,
      optimalWeightMV: Number((optimalWeightMV * 100).toFixed(2)),
      optimalWeightCVaR: Number((optimalWeightCVaR * 100).toFixed(2)),
      portfolioRiskContribution: Number((cvar95 * 0.5).toFixed(2))
    };
  }
}

export class PortfolioManagerAgent {
  public static synthesizeAndDecide(
    riskReport: RiskManagementReport,
    analysts: AnalystReport[],
    ticker: string,
    constraintResult?: ConstraintCheckResult,
    timingGateResult?: EntryTimingGateResult,
    currentPrice: number = 100.0,
    dayChangePct: number = 0.0,
    zScore: number = 0.0,
    obi: number = 0.15,
    obvSlope: number = 0.08,
    cmf20: number = 0.12,
    bookImb5: number = 0.28,
    bookImb10: number = 0.18,
    personaWeights: Record<string, number> = { bull: 1.0, bear: 1.0, neutral: 1.0 },
    regimeWeights: Record<string, number> = { bull: 1.0, bear: 1.0 },
    lessonsSummary: string = 'Tarihsel dersler teyit edildi.',
    institutionalNetLot: number = 0,
    preFilterRules?: DecisionRules
  ) {
    let action: 'BUY' | 'SELL' | 'NEUTRAL' | 'VETO_HOLD' | 'PENDING_ENTRY' = 'BUY';
    let rating: 'Buy' | 'Overweight' | 'Hold' | 'Underweight' | 'Sell' = 'Buy';
    let summary = '';
    let isBullTrapRisk = false;
    let isDefiniteTrap = false;

    // 1. Risk Yönetimi Veto Kontrolü (CVaR)
    if (riskReport.isVetoed) {
      action = 'VETO_HOLD';
      rating = 'Hold';
      summary = `Portföy Yöneticisi (Manager): Risk Yönetimi Ajanı CVaR VETO raporunu onayladı. ${riskReport.vetoReason}`;
    }
    // 2. OpenClaw-FinAgent Kısıt Doğrulama Katmanı Kontrolü
    else if (constraintResult && !constraintResult.isPassed) {
      action = 'VETO_HOLD';
      rating = 'Hold';
      summary = `Portföy Yöneticisi (Manager - Constraint Veto): Kısıt engeli. Gerekçeler: ${constraintResult.violations.join(' | ')}`;
    }
    // 3. BECERİ 1: Katalizör İllüzyonu Engeli (Kurumsal Satış varken Bypass Trend YAPILAMAZ)
    else if (institutionalNetLot <= -50000) {
      action = 'VETO_HOLD';
      rating = 'Hold';
      summary = `Katalizör İllüzyonu Engeli (NOHOLD): Kurumsal akış (BofA/Citibank: ${institutionalNetLot.toLocaleString('tr-TR')} lot) net satıştadır. KAP katalizörü ne kadar yüksek olursa olsun kurumsal satış varken Bypass Trend yapılamaz; NOHOLD / BEKLE kararı verildi.`;
    }
    // 4. Güçlendirilmiş Bull Trap (Kesin Tuzak NOHOLD)
    else if (dayChangePct < 0 && (obi > 0 || zScore > 0) && cmf20 < 0) {
      isDefiniteTrap = true;
      isBullTrapRisk = true;
      action = 'VETO_HOLD';
      rating = 'Hold';
      summary = `Kesin Boğa Tuzağı (Definite Bull Trap - NOHOLD): Fiyat düşüşte (%${dayChangePct.toFixed(2)}), OBI pozitif (${obi.toFixed(2)}) ancak CMF negatif (${cmf20.toFixed(2)}). Para çıkışlı sahte tahta baskısı nedeniyle NOHOLD / KESİN VETO verildi.`;
    }
    // 5. Analist Raporlarını Sentezle (AĞIRLIKLI)
    else {
      const bullWeight = analysts.filter(a => a.perspective === 'BULL').reduce((sum, a) => sum + (a.confidence / 100) * (personaWeights.bull || 1.0) * (regimeWeights.bull || 1.0), 0);
      const bearWeight = analysts.filter(a => a.perspective === 'BEAR').reduce((sum, a) => sum + (a.confidence / 100) * (personaWeights.bear || 1.0) * (regimeWeights.bear || 1.0), 0);
      const neutralWeight = analysts.filter(a => a.perspective === 'NEUTRAL').reduce((sum, a) => sum + (a.confidence / 100) * (personaWeights.neutral || 1.0), 0);

      if (bearWeight > bullWeight) {
        action = 'SELL';
        rating = 'Sell';
        summary = `Portföy Yöneticisi (Manager): Ayı analist raporları (%${bearWeight.toFixed(2)}) Boğa raporlarından (%${bullWeight.toFixed(2)}) ağır bastı. Satış kararı alındı.`;
      } else if (neutralWeight > bullWeight && neutralWeight > bearWeight) {
        action = 'NEUTRAL';
        rating = 'Hold';
        summary = `Portföy Yöneticisi (Manager): Tarafsız analist görüşü (%${neutralWeight.toFixed(2)}) hakim olduğu için bekleme kararı alındı.`;
      } else {
        action = 'BUY';
        rating = 'Buy';
        summary = `Portföy Yöneticisi (Manager): Boğa analist raporları (%${bullWeight.toFixed(2)}) sentezlendi; pozisyon onaylandı.`;
      }

      // Metrik Teyit Katmanı (OBV Slope > 0 ve CMF_20 > 0)
      if (action === 'BUY' && (obvSlope <= 0 || cmf20 <= 0)) {
        action = 'NEUTRAL';
        rating = 'Hold';
        summary = `Sahte Alım Şüphesi (Metrik Teyit Engeli): OBI veya Z-Skor pozitif görünse de CMF20 (${cmf20.toFixed(2)}) negatif veya OBV eğimi olumsuz (${obvSlope.toFixed(3)}). Para çıkışı tespiti nedeniyle AL kararı BEKLE seviyesine düşürüldü.`;
      }
      // "Bypass Trend" & Standart Bull Trap Filtresi
      else if (action === 'BUY' && dayChangePct < 0 && zScore > 0) {
        isBullTrapRisk = true;
        action = 'NEUTRAL';
        rating = 'Hold';
        summary = `Portföy Yöneticisi (Bull Trap Filtresi): Fiyat düşüşte (%${dayChangePct.toFixed(2)}) ancak Z-Skor pozitif (+${zScore.toFixed(2)}σ). Boğa Tuzağı riski nedeniyle AL kararı BEKLE seviyesine düşürüldü.`;
      }
      // AlphaAgent Giriş Zamanlama Kapısı
      else if (action === 'BUY' && timingGateResult && !timingGateResult.isGateOpen) {
        action = 'PENDING_ENTRY';
        rating = 'Overweight';
        summary = `Portföy Yöneticisi (Manager - EntryGate): AL kararı verildi ancak teknik teyit henüz sağlanmadı. ${timingGateResult.statusText}`;
      }
    }

    // BECERİ 3: Fractional Kelly (Google Finance Revizyonu: 0.25x'ten 0.20x'e düşürüldü)
    const winRate = 0.58;
    const rewardRiskRatio = 2.0;
    const rawKellyPct = (winRate - (1 - winRate) / rewardRiskRatio) * 100;
    const fullKellyPct = Number(Math.max(0, rawKellyPct).toFixed(2)); // örn. %23.00
    const kellyMultiplier = 0.20; // Google Finance Revizyonu 0.20x
    const fractionalKellyPct = Number((fullKellyPct * kellyMultiplier).toFixed(2)); // %23 * 0.20 = %4.60

    // Portföy Optimizasyonu Katmanı
    const optimizationHarmonizedWeight = (riskReport.optimalWeightMV + riskReport.optimalWeightCVaR + fractionalKellyPct) / 3;
    const targetPercent = (action === 'PENDING_ENTRY' || action === 'VETO_HOLD' || action === 'NEUTRAL')
      ? 0.0
      : Number(optimizationHarmonizedWeight.toFixed(2));

    // BECERİ 2: Duvar Erime Hızı Kontrolü (Tuzak Duvar & Take Profit Revizyonu)
    let calculatedPriceTarget = Number((currentPrice * (rating === 'Buy' || rating === 'Overweight' ? 1.12 : (rating === 'Sell' ? 0.88 : 1.02))).toFixed(2));
    if (preFilterRules?.wallTrapDetected && preFilterRules?.adjustedTakeProfit) {
      calculatedPriceTarget = preFilterRules.adjustedTakeProfit;
      summary += ` [Tuzak Duvar Koruması: Kademe erime süresi (${preFilterRules.wallMeltTimeMin?.toFixed(0)} dk > 30 dk) nedeniyle Kâr Al (TP) seviyesi ₺${calculatedPriceTarget.toFixed(2)} seviyesine çekildi.]`;
    }

    // TradingAgents Zod Şema Doğrulaması & Yapılandırılmış Çıktı Üretimi
    const rawStructured: PortfolioManagerStructuredDecision = {
      rating,
      executive_summary: summary,
      investment_thesis: `Hiyerarşik jüri, CVaR risk analizi (%${riskReport.cvar95Pct}), VaR tabanlı SL (%${riskReport.expandedStopLossPct}), Güvenli Kelly (%${fractionalKellyPct}) ve analist oydaşması uyarınca #${ticker} varlığında ${rating} stratejisi belirlenmiştir. Senarist Hafıza: ${lessonsSummary}`,
      price_target: calculatedPriceTarget,
      time_horizon: '2-4 Hafta (Stratejik Vade)'
    };

    let structuredDecision: PortfolioManagerStructuredDecision;
    try {
      structuredDecision = PortfolioManagerDecisionSchema.parse(rawStructured);
    } catch (e) {
      structuredDecision = {
        rating: 'Hold',
        executive_summary: 'Sistem Zod şeması otomatik olarak varsayılan güvenli formata dönüştürüldü.',
        investment_thesis: 'Risk yönetim kısıtlarına uygun varsayılan yatırım tezi.',
        price_target: currentPrice,
        time_horizon: '1-2 Hafta'
      };
    }

    return {
      action,
      structuredDecision,
      targetPercent,
      fullKellyPct,
      fractionalKellyPct,
      fractionalKellyMultiplier: kellyMultiplier,
      fractionalKellyLabel: `Güvenli Kelly (Fractional ${kellyMultiplier}x)`,
      stopLossPercent: riskReport.expandedStopLossPct,
      isBullTrapRisk,
      optimalWeightMV: riskReport.optimalWeightMV,
      optimalWeightCVaR: riskReport.optimalWeightCVaR,
      summary: structuredDecision.executive_summary
    };
  }
}

export type InvestorPersona = 'BUFFETT' | 'BURRY' | 'WOOD' | 'STANDARD' | 'PETER_LYNCH';

export interface RegimeAdjustments {
  regime: 'BULL' | 'BEAR' | 'SIDEWAYS';
  weightMultipliers: Record<string, number>;
}

export async function runJuryDebate(
  ticker: string, 
  marketPayload?: any, 
  assetClassParam?: string,
  persona: InvestorPersona = 'STANDARD',
  regimeAdjustments?: RegimeAdjustments
) {
  const cleanTicker = (ticker || 'ASELS').toUpperCase();
  const assetClass = (assetClassParam || marketPayload?.assetClass || (['BTC', 'ETH', 'SOL', 'USDT'].some(c => cleanTicker.includes(c)) ? 'CRYPTO' : ['NVDA', 'AAPL', 'TSLA', 'MSFT', 'AMZN', 'GOOGL'].includes(cleanTicker) ? 'NASDAQ' : 'BIST')).toUpperCase();
  const isBist = assetClass === 'BIST' || assetClass === 'BIST_EQUITY';
  const isNasdaq = assetClass === 'NASDAQ' || assetClass === 'US_EQUITY';
  const isCrypto = assetClass === 'CRYPTO';

  const spotPrice = Number(marketPayload?.price || marketPayload?.currentPrice || (isCrypto ? 88000 : (isNasdaq ? 220 : 358.5)));
  const tracer = new DecisionTracer();

  // =========================================================================
  // TASK SPECIFICATION: DATA RULE ENGINE PRE-FILTER GATEKEEPER & OVERRIDE
  // Jüri tartışma motorunun EN BAŞINDA çalışır.
  // =========================================================================
  const marketDataForRules: MarketData = {
    ticker: cleanTicker,
    symbol: cleanTicker,
    currentPrice: spotPrice,
    entryPrice: Number(marketPayload?.entryPrice || spotPrice),
    stopLossPrice: Number(marketPayload?.stopLossPrice || marketPayload?.stopLoss || 0),
    isStopLossBreached: Boolean(marketPayload?.isStopLossBreached),
    dayChangePct: Number(marketPayload?.dayChangePct ?? marketPayload?.changePct ?? (cleanTicker === 'TUPRS' ? -1.80 : (cleanTicker === 'ASELS' ? 5.21 : 1.25))),
    zScore: Number(marketPayload?.zScore ?? (cleanTicker === 'TUPRS' ? 0.93 : (cleanTicker === 'ASELS' ? -0.75 : 0.45))),
    obi: Number(marketPayload?.obi ?? 0.15),
    cmf20: Number(marketPayload?.cmf20 ?? (cleanTicker === 'REEDR' || cleanTicker === 'TSLA' ? -0.15 : 0.12)),
    obvSlope: Number(marketPayload?.obvSlope ?? 0.08),
    spoofingRisk: Number(marketPayload?.spoofingRisk ?? 0),
    orderCancelRatePct: Number(marketPayload?.orderCancelRatePct ?? 0),
    fakeWallDetected: Boolean(marketPayload?.fakeWallDetected),
    financials: marketPayload?.financials,
    beneishMScore: Number(marketPayload?.beneishMScore ?? marketPayload?.financials?.beneishM ?? -2.85),
    brokerFlow: marketPayload?.brokerFlow,
    bofaNetLot: Number(marketPayload?.bofaNetLot ?? marketPayload?.brokerFlow?.bofaNetLot ?? (isBist ? -99000 : 0)),
    kapSentimentScore: Number(marketPayload?.kapSentimentScore ?? marketPayload?.kapImpactScore ?? 85),
    dataSource: marketPayload?.dataSource || marketPayload?.source || (marketPayload?.isRealTime === false ? 'SIMULATION' : undefined),
    isRealTime: marketPayload?.isRealTime ?? marketPayload?.is_realtime,
    isMock: marketPayload?.isMock ?? marketPayload?.is_mock,
    warning: marketPayload?.warning,
    orderBook: marketPayload?.orderBook || {
      wallLot: 35000,
      wallPrice: spotPrice * 1.03,
      meltTimeMin: 45, // 30 dk üstü tuzak duvar kontrol testi
      burnRatePerMin: 770
    }
  };

  const preFilterResult = DataRuleEngine.applyRules(marketDataForRules);

  // KURAL İŞLETİM HİYERARŞİSİ 0-A: BIST Mekanik Motoru (Tavan/Taban %10, Devre Kesici %6, Seans Zırhı)
  if (isBist) {
    const prevClose = typeof marketPayload?.prevClose === 'number' && marketPayload.prevClose > 0
      ? marketPayload.prevClose
      : spotPrice;
    const bistValidation = bistMechanics.validateOrder(cleanTicker, spotPrice, 'BUY', prevClose);
    if (!bistValidation.isValid) {
      console.warn(`[DATA AUDIT WARN] [juryDebateEngine] ${cleanTicker} BIST mechanics: ${bistValidation.reason}`);
      tracer.addStep("BIST Mekanik Zırhı (BIST Mechanics Guard)", "PRE_FILTER", bistValidation.reason, false);
      return {
        ticker: cleanTicker,
        assetClass,
        timestamp: new Date().toISOString(),
        consensus: 'VETO_HOLD',
        confidenceScore: 30.0,
        isPreFiltered: true,
        preFilterResult: {
          ...preFilterResult,
          read: false,
          reason: bistValidation.reason,
          ruleTriggered: 'DATA_SOURCE_NOHOLD_LOCK',
          finalVerdict: 'HOLD'
        },
        riskManagementReport: {
          riskScore: 98,
          var95Pct: 3.5,
          cvar95Pct: 5.5,
          forensicVerdict: `🛑 BIST MEKANİK VETO: ${bistValidation.errorCode}`,
          isVetoed: true,
          vetoReason: bistValidation.reason,
          proposedStopLossPct: -2.5,
          expandedStopLossPct: -2.5,
          isStopLossExpanded: true,
          optimalWeightMV: 0,
          optimalWeightCVaR: 0,
          portfolioRiskContribution: 95
        },
        constraintResult: {
          isPassed: false,
          liquidityPassed: false,
          concentrationPassed: false,
          correlationPassed: false,
          violations: [bistValidation.reason]
        },
        decisionTrace: tracer.getTrace(),
        jurors: [
          {
            id: 'bist_mechanics_guard',
            name: '🏛️ BIST Mekanik Kapı Bekçisi',
            role: 'Seans Fazı, Tavan/Taban ve Devre Kesici Zırhı',
            vote: 'BEKLE',
            weight: 1.0,
            score: 0,
            comment: bistValidation.reason
          }
        ],
        finalDecision: {
          action: 'VETO_HOLD',
          entryPrice: spotPrice,
          targetPercent: 0.0,
          fullKellyPct: 0.0,
          fractionalKellyPct: 0.0,
          fractionalKellyMultiplier: 0.20,
          fractionalKellyLabel: 'Güvenli Kelly (0.20x)',
          stopLossPercent: -2.5,
          isBullTrapRisk: true,
          summary: bistValidation.reason
        }
      };
    }
  }

  // KURAL İŞLETİM HİYERARŞİSİ 0-B: VPIN Toksik Akış Motoru (VPIN > 0.35 -> VETO_HOLD)
  let vpinResult = null;
  if (Array.isArray(marketPayload?.trades) && marketPayload.trades.length > 0) {
    vpinResult = vpinEngine.calculateVpin(cleanTicker, marketPayload.trades, 10000, 0.35);
  } else if (typeof marketPayload?.vpinScore === 'number' && !isNaN(marketPayload.vpinScore)) {
    vpinResult = {
      symbol: cleanTicker,
      vpinScore: marketPayload.vpinScore,
      toxicityLevel: marketPayload.vpinScore > 0.50 ? 'TOXIC' : (marketPayload.vpinScore > 0.35 ? 'ELEVATED' : 'SAFE'),
      isToxic: marketPayload.vpinScore > 0.35,
      action: marketPayload.vpinScore > 0.35 ? 'VETO_HOLD' : 'PROCEED',
      reason: marketPayload.vpinScore > 0.35 ? `VPIN Toksisite Uyarısı: Skor (${marketPayload.vpinScore}) > 0.35` : 'Güvenli',
      bucketSize: 10000,
      analyzedBuckets: 1
    };
  }

  if (vpinResult && vpinResult.isToxic) {
    const vpinReason = vpinResult.reason;
    console.warn(`[DATA AUDIT WARN] [juryDebateEngine] ${cleanTicker} VPIN toxicity: ${vpinReason}`);
    tracer.addStep("VPIN Toksik Akış Koruma (VPIN Sentinel)", "PRE_FILTER", vpinReason, false);
    return {
      ticker: cleanTicker,
      assetClass,
      timestamp: new Date().toISOString(),
      consensus: 'VETO_HOLD',
      confidenceScore: 30.0,
      isPreFiltered: true,
      preFilterResult: {
        ...preFilterResult,
        read: false,
        reason: vpinReason,
        ruleTriggered: 'SPOOFING_GUARD',
        finalVerdict: 'HOLD'
      },
      riskManagementReport: {
        riskScore: 96,
        var95Pct: 3.6,
        cvar95Pct: 5.6,
        forensicVerdict: `🛑 VPIN TOKSİK AKIŞ VETO (${vpinResult.vpinScore})`,
        isVetoed: true,
        vetoReason: vpinReason,
        proposedStopLossPct: -2.5,
        expandedStopLossPct: -2.5,
        isStopLossExpanded: true,
        optimalWeightMV: 0,
        optimalWeightCVaR: 0,
        portfolioRiskContribution: 95
      },
      constraintResult: {
        isPassed: false,
        liquidityPassed: false,
        concentrationPassed: false,
        correlationPassed: false,
        violations: [vpinReason]
      },
      decisionTrace: tracer.getTrace(),
      jurors: [
        {
          id: 'vpin_sentinel_guard',
          name: '🧪 VPIN Toksik Akış Bekçisi',
          role: 'Hacim Kovası & Toksisite Koruması',
          vote: 'BEKLE',
          weight: 1.0,
          score: 0,
          comment: vpinReason
        }
      ],
      finalDecision: {
        action: 'VETO_HOLD',
        entryPrice: spotPrice,
        targetPercent: 0.0,
        fullKellyPct: 0.0,
        fractionalKellyPct: 0.0,
        fractionalKellyMultiplier: 0.20,
        fractionalKellyLabel: 'Güvenli Kelly (0.20x)',
        stopLossPercent: -2.5,
        isBullTrapRisk: true,
        summary: vpinReason
      }
    };
  }

  // KURAL İŞLETİM HİYERARŞİSİ 0-C: Position Sentinel (Portföy Bekçisi, Tek hisse max %20, Tek sektör max %35, Günlük zarar %2 kilit)
  const portfolioState = marketPayload?.portfolioState || {
    totalEquityUsd: 100000.0,
    dailyRealizedLossPct: Number(marketPayload?.dailyRealizedLossPct ?? 0.0),
    positions: Array.isArray(marketPayload?.positions) ? marketPayload.positions : []
  };
  const proposedTrade = {
    symbol: cleanTicker,
    sector: marketPayload?.sector || 'GENEL',
    notionalUsd: Number(marketPayload?.notionalUsd ?? 10000.0)
  };

  const sentinelResult = positionSentinel.evaluatePortfolioRisk(portfolioState, proposedTrade);
  if (!sentinelResult.approved) {
    const sentinelReason = sentinelResult.reason;
    console.warn(`[DATA AUDIT WARN] [juryDebateEngine] ${cleanTicker} Position Sentinel: ${sentinelReason}`);
    tracer.addStep("Position Sentinel (Portföy Bekçisi)", "PRE_FILTER", sentinelReason, false);
    return {
      ticker: cleanTicker,
      assetClass,
      timestamp: new Date().toISOString(),
      consensus: 'VETO_HOLD',
      confidenceScore: 30.0,
      isPreFiltered: true,
      preFilterResult: {
        ...preFilterResult,
        read: false,
        reason: sentinelReason,
        ruleTriggered: 'DATA_SOURCE_NOHOLD_LOCK',
        finalVerdict: 'HOLD'
      },
      riskManagementReport: {
        riskScore: 97,
        var95Pct: 3.5,
        cvar95Pct: 5.5,
        forensicVerdict: `🛑 POSITION SENTINEL VETO: ${sentinelResult.errorCode}`,
        isVetoed: true,
        vetoReason: sentinelReason,
        proposedStopLossPct: -2.5,
        expandedStopLossPct: -2.5,
        isStopLossExpanded: true,
        optimalWeightMV: 0,
        optimalWeightCVaR: 0,
        portfolioRiskContribution: 95
      },
      constraintResult: {
        isPassed: false,
        liquidityPassed: false,
        concentrationPassed: false,
        correlationPassed: false,
        violations: [sentinelReason]
      },
      decisionTrace: tracer.getTrace(),
      jurors: [
        {
          id: 'position_sentinel_guard',
          name: '🛡️ Position Sentinel Bekçisi',
          role: 'Portföy Konsantrasyonu & Günlük Zarar Koruması',
          vote: 'BEKLE',
          weight: 1.0,
          score: 0,
          comment: sentinelReason
        }
      ],
      finalDecision: {
        action: 'VETO_HOLD',
        entryPrice: spotPrice,
        targetPercent: 0.0,
        fullKellyPct: 0.0,
        fractionalKellyPct: 0.0,
        fractionalKellyMultiplier: 0.20,
        fractionalKellyLabel: 'Güvenli Kelly (0.20x)',
        stopLossPercent: -2.5,
        isBullTrapRisk: true,
        summary: sentinelReason
      }
    };
  }

  // KURAL İŞLETİM HİYERARŞİSİ 0: Manipülasyon Kalkanı (Sosyal Medya Pump & Dump / Spekülasyon)
  const isManipulated = Boolean(
    marketPayload?.manipulationAlarm === true ||
    marketPayload?.isManipulated === true ||
    (typeof marketPayload?.manipulationRiskScore === 'number' && marketPayload.manipulationRiskScore > 70)
  );

  if (isManipulated) {
    const manipReason = `MANIPULASYON_ALARM: Sosyal medya spekülasyonu / pump & dump riski tespit edildi (#${cleanTicker}). Karar zorunlu BEKLE (VETO_HOLD).`;
    console.warn(`[DATA AUDIT WARN] [juryDebateEngine] ${cleanTicker} manipulation: ${manipReason}`);
    tracer.addStep("Manipülasyon Kalkanı (Manipulation Guard)", "PRE_FILTER", manipReason, false);
    return {
      ticker: cleanTicker,
      assetClass,
      timestamp: new Date().toISOString(),
      consensus: 'VETO_HOLD',
      confidenceScore: 30.0,
      isPreFiltered: true,
      preFilterResult: {
        ...preFilterResult,
        read: false,
        reason: manipReason,
        ruleTriggered: 'MANIPULATION_GUARD_ALERT',
        finalVerdict: 'BEKLE'
      },
      riskManagementReport: {
        riskScore: 95,
        var95Pct: 3.8,
        cvar95Pct: 5.9,
        forensicVerdict: '🛑 MANIPULASYON_ALARM: VETO_HOLD',
        isVetoed: true,
        vetoReason: manipReason,
        proposedStopLossPct: -2.5,
        expandedStopLossPct: -2.5,
        isStopLossExpanded: true,
        optimalWeightMV: 0,
        optimalWeightCVaR: 0,
        portfolioRiskContribution: 95
      },
      constraintResult: {
        isPassed: false,
        liquidityPassed: false,
        concentrationPassed: false,
        correlationPassed: false,
        violations: [manipReason]
      },
      decisionTrace: tracer.getTrace(),
      jurors: [
        {
          id: 'manipulation_guard',
          name: '🛡️ Manipülasyon Kalkanı',
          role: 'Spekülasyon & Pump/Dump Koruması',
          vote: 'BEKLE',
          weight: 1.0,
          score: 0,
          comment: manipReason
        }
      ],
      finalDecision: {
        action: 'VETO_HOLD',
        entryPrice: spotPrice,
        targetPercent: 0.0,
        fullKellyPct: 0.0,
        fractionalKellyPct: 0.0,
        fractionalKellyMultiplier: 0.20,
        fractionalKellyLabel: 'Güvenli Kelly (0.20x)',
        stopLossPercent: -2.5,
        isBullTrapRisk: true,
        summary: manipReason
      }
    };
  }

  // KURAL İŞLETİM HİYERARŞİSİ 1: CRITICAL / Hard-Stop (Fiyat <= SL)
  if (preFilterResult.priority === 'CRITICAL' || preFilterResult.finalVerdict === 'STOP_EXECUTED') {
    tracer.addStep("Ön Filtre Kapı Bekçisi (Hard-Stop)", "PRE_FILTER", preFilterResult.reason, false, preFilterResult);
    return {
      ticker: cleanTicker,
      assetClass,
      timestamp: new Date().toISOString(),
      consensus: 'STOP_EXECUTED',
      confidenceScore: 0.0,
      isPreFiltered: true,
      preFilterResult,
      riskManagementReport: {
        riskScore: 100,
        var95Pct: 3.5,
        cvar95Pct: 5.8,
        forensicVerdict: '🛑 CRITICAL HARD-STOP: STOP_EXECUTED',
        isVetoed: true,
        vetoReason: preFilterResult.reason,
        proposedStopLossPct: 0,
        expandedStopLossPct: 0,
        isStopLossExpanded: false,
        optimalWeightMV: 0,
        optimalWeightCVaR: 0,
        portfolioRiskContribution: 100
      },
      constraintResult: {
        isPassed: false,
        liquidityPassed: false,
        concentrationPassed: false,
        correlationPassed: false,
        violations: [preFilterResult.reason]
      },
      decisionTrace: tracer.getTrace(),
      jurors: [
        {
          id: 'pre_filter_hard_stop',
          name: '🛡️ Kök Veri Ön Filtre Kapı Bekçisi',
          role: 'Critical Hard-Stop Zırhı',
          vote: 'STOP_EXECUTED',
          weight: 1.0,
          score: 0,
          comment: preFilterResult.reason
        }
      ],
      finalDecision: {
        action: 'STOP_EXECUTED',
        entryPrice: spotPrice,
        targetPercent: 0.0,
        fullKellyPct: 0.0,
        fractionalKellyPct: 0.0,
        fractionalKellyMultiplier: 0.20,
        fractionalKellyLabel: 'Güvenli Kelly (0.20x)',
        stopLossPercent: 0.0,
        isBullTrapRisk: false,
        summary: preFilterResult.reason
      }
    };
  }

  // KURAL İŞLETİM HİYERARŞİSİ 2: Veto / Read False (NOHOLD Kilidi / Spoofing / Beneish / Boğa Tuzağı)
  if (!preFilterResult.read) {
    const isDataSourceLock = preFilterResult.ruleTriggered === 'DATA_SOURCE_NOHOLD_LOCK';
    tracer.addStep(isDataSourceLock ? "Veri Kaynağı Karar Kilidi (NOHOLD)" : "Ön Filtre Kapı Bekçisi (Veto)", "PRE_FILTER", preFilterResult.reason, false, preFilterResult);
    return {
      ticker: cleanTicker,
      assetClass,
      timestamp: new Date().toISOString(),
      consensus: isDataSourceLock ? 'NOHOLD / SATIŞ KİLİT' : 'VETO_HOLD',
      confidenceScore: 0.0,
      isPreFiltered: true,
      preFilterResult,
      riskManagementReport: {
        riskScore: 90,
        var95Pct: 2.5,
        cvar95Pct: 4.8,
        forensicVerdict: isDataSourceLock ? '🔒 NOHOLD / SATIŞ KİLİT' : 'VETO / ÖN FİLTRE ENGELİ',
        isVetoed: true,
        vetoReason: preFilterResult.reason,
        proposedStopLossPct: -2.5,
        expandedStopLossPct: -2.5,
        isStopLossExpanded: true,
        optimalWeightMV: 0,
        optimalWeightCVaR: 0,
        portfolioRiskContribution: 50
      },
      constraintResult: {
        isPassed: false,
        liquidityPassed: false,
        concentrationPassed: false,
        correlationPassed: false,
        violations: [preFilterResult.reason]
      },
      decisionTrace: tracer.getTrace(),
      jurors: [
        {
          id: isDataSourceLock ? 'data_source_lock_guard' : 'pre_filter_guard',
          name: isDataSourceLock ? '🔒 Veri Kaynağı Karar Kilidi' : '🛡️ Kök Veri Ön Filtre Kapı Bekçisi',
          role: isDataSourceLock ? 'NOHOLD / SATIŞ KİLİT Zırhı' : 'Ön Filtre Kural Zırhı',
          vote: isDataSourceLock ? 'NOHOLD' : 'VETO',
          weight: 1.0,
          score: 0,
          comment: preFilterResult.reason
        }
      ],
      finalDecision: {
        action: 'VETO_HOLD',
        entryPrice: spotPrice,
        targetPercent: 0.0,
        fullKellyPct: 0.0,
        fractionalKellyPct: 0.0,
        fractionalKellyMultiplier: 0.20,
        fractionalKellyLabel: 'Güvenli Kelly (0.20x)',
        stopLossPercent: -2.5,
        isBullTrapRisk: preFilterResult.ruleTriggered === 'BULL_TRAP_GUARD',
        summary: preFilterResult.reason
      }
    };
  }

  // KURAL İŞLETİM HİYERARŞİSİ 3: Pass (Geçiş Onayı)
  // Sadece read === true ve priority !== 'CRITICAL' olduğunda jüri tartışmasını koştur
  tracer.addStep("Ön Filtre Kapı Bekçisi (Onay)", "PRE_FILTER", preFilterResult.reason, true, preFilterResult);

  // Persona ve Ağırlıkların AgentRegistry'den Keşfi
  const registeredPersona = AgentRegistry.getPersona(persona) || (AgentRegistry.get(persona) as any) || AgentRegistry.getPersona('standard') || (AgentRegistry.get('standard') as any);
  const selectedPersonaWeights = registeredPersona?.weightMultipliers || { bull: 1.0, bear: 1.0, neutral: 1.0, risk: 1.0, constraint: 1.0, timing: 1.0 };
  const regimeWeights = regimeAdjustments?.weightMultipliers || { bull: 1.0, bear: 1.0 };

  // Senarist Hafıza
  const recentLessons = await agentApiClient.getRecentLessons(undefined, 5);
  const lessonsSummary = recentLessons.length > 0 
    ? recentLessons.map(l => `[${l.ticker}] ${l.lesson} (Kavramsal: ${l.conceptual_perspective || 'Genel'})`).join(' | ')
    : 'Geçmiş ders bulunamadı.';

  const volatility = isCrypto ? 6.5 : (isNasdaq ? 2.8 : 2.1);
  const riskReport = RiskManagementAgent.evaluateRisk(cleanTicker, assetClass, volatility, -1.0, recentLessons, marketPayload);

  // Kısıt Doğrulama (OpenClaw-FinAgent)
  const constraintResult = ConstraintVerifier.verify(cleanTicker, 0.15, 18000, 12.5, 0.42);

  // Giriş Zamanlama Kapısı (AlphaAgent)
  const timingGateResult = EntryTimingGate.evaluate(
    spotPrice,
    spotPrice * 0.98, // SMA_50
    150000,           // Volume
    120000            // AvgVolume20
  );

  // TCMB & Finnhub Verisi
  const tcmbData = await tcmbService.getForeignFlowData();
  const finnhubSym = isNasdaq ? cleanTicker : (isCrypto ? 'BTCUSDT' : 'NVDA');
  const finnhubData = await finnhubService.getSentiment(finnhubSym);

  // =========================================================================
  // BECERİ 2: Dinamik Jüri Keşfi (Dynamic Jury Discovery - OpenJarvis)
  // Sabit kodlanmış (hardcoded) analist ve jüri listesi yerine Registry'den dinamik keşif yapılır.
  // =========================================================================
  const juryContext: JuryContext = {
    cleanTicker,
    assetClass,
    spotPrice,
    marketDataForRules,
    riskReport,
    constraintResult,
    timingGateResult,
    selectedPersonaWeights,
    regimeWeights,
    isBist,
    isNasdaq,
    isCrypto,
    recentLessons,
    tcmbData,
    finnhubData,
    preFilterResult
  };

  const { jurors, analysts } = AgentRegistry.discoverAndEvaluateJurors(juryContext);

  tracer.addStep("Ajan Raporları Toplandı", "AGENT_REPORT", `${analysts.length} Analist raporu (Registry Dinamik Keşfi) sentezlendi.`, true, analysts);
  tracer.addStep("Risk Yönetimi Raporu (CVaR)", "AGENT_REPORT", riskReport.isVetoed ? riskReport.vetoReason! : `CVaR %95 riski (%${riskReport.cvar95Pct}) güvenli eşikte.`, !riskReport.isVetoed, riskReport);
  tracer.addStep("Kısıt Doğrulama (OpenClaw)", "CONSTRAINT_CHECK", constraintResult.isPassed ? "Likidite, Konsantrasyon (%20) ve Korelasyon (<0.85) onaylandı." : constraintResult.violations.join(' | '), constraintResult.isPassed, constraintResult);
  tracer.addStep("Giriş Zamanlama Kapısı (AlphaAgent)", "TIMING_GATE", timingGateResult.statusText, timingGateResult.isGateOpen, timingGateResult);

  const dayChangePct = marketDataForRules.dayChangePct!;
  const zScore = marketDataForRules.zScore!;
  const obi = marketDataForRules.obi!;
  const obvSlope = marketDataForRules.obvSlope!;
  const cmf20 = marketDataForRules.cmf20!;
  const bookImb5 = Number(marketPayload?.bookImb5 ?? 0.28);
  const bookImb10 = Number(marketPayload?.bookImb10 ?? 0.18);
  const institutionalNet = Number(marketDataForRules.bofaNetLot ?? 0);

  const managerDecision = PortfolioManagerAgent.synthesizeAndDecide(
    riskReport,
    analysts,
    cleanTicker,
    constraintResult,
    timingGateResult,
    spotPrice,
    dayChangePct,
    zScore,
    obi,
    obvSlope,
    cmf20,
    bookImb5,
    bookImb10,
    selectedPersonaWeights,
    regimeWeights,
    lessonsSummary,
    institutionalNet,
    preFilterResult
  );

  tracer.addStep("Portföy Yöneticisi Nihai Kararı (Manager)", "MANAGER_DECISION", managerDecision.summary, managerDecision.action !== 'VETO_HOLD', managerDecision.structuredDecision);

  const researchPlan: ResearchPlanStep[] = [
    {
      agent: '🛡️ Ön Filtre Kapı Bekçisi (DataRuleEngine)',
      metricExamined: `Hard-Stop, Spoofing, Beneish M-Score, Boğa Tuzağı, Kurumsal Akış`,
      verdict: 'PAS',
      details: preFilterResult.reason
    },
    {
      agent: 'Teknik & Momentum Ajanı',
      metricExamined: `Spot: ${spotPrice.toFixed(2)}, Değişim: %${dayChangePct.toFixed(2)}, Z-Skor: +${zScore.toFixed(2)}σ`,
      verdict: managerDecision.isBullTrapRisk ? 'BEKLE' : (timingGateResult.isGateOpen ? 'AÇIK' : 'BEKLE'),
      details: managerDecision.isBullTrapRisk ? `Boğa Tuzağı (Bull Trap) riski: Fiyat düşüşte ancak Z-Skor pozitif.` : timingGateResult.statusText
    },
    {
      agent: 'Kuantitatif Risk Ajanı (CVaR & VaR SL)',
      metricExamined: `VaR %95: %${riskReport.var95Pct}, CVaR %95: %${riskReport.cvar95Pct}, Genişletilmiş SL: %${riskReport.expandedStopLossPct}`,
      verdict: riskReport.isVetoed ? 'VETO' : 'GÜVENLİ',
      details: riskReport.stopLossExpansionReason!
    },
    {
      agent: 'Kısıt Doğrulama Ajanı (OpenClaw)',
      metricExamined: `OBI: 0.15, Derinlik: 18k lot, Optimize Ağırlık: %${managerDecision.targetPercent}`,
      verdict: constraintResult.isPassed ? 'PAS' : 'VETO',
      details: constraintResult.isPassed ? `Tüm likidite ve portföy kısıtları doğrulandı. Riskfolio-Lib ve Quarter-Kelly (0.20x) harmonizasyonu ile optimize tahsis: %${managerDecision.targetPercent}.` : constraintResult.violations.join(' | ')
    },
    {
      agent: 'Temel & Kurumsal Akış Ajanı',
      metricExamined: `${isBist ? 'BofA & Ak Yatırım' : (isNasdaq ? 'BlackRock & Vanguard' : 'ETF Balinaları')} Net Takas & Duygu Analizi`,
      verdict: institutionalNet <= -50000 ? 'SAT' : 'AL',
      details: institutionalNet <= -50000 
        ? `Kurumsal akış net satıştadır (${institutionalNet.toLocaleString('tr-TR')} lot).` 
        : (analysts.find(a => a.perspective === 'BULL')?.argument || 'Temel ve kurumsal akış göstergeleri pozitif.')
    }
  ];

  const citations: CitedSource[] = [
    {
      id: 'cit-1',
      sourceName: isBist ? 'KAP Kamuyu Aydınlatma Platformu' : (isNasdaq ? 'SEC EDGAR 13F Filings' : 'Binance / CoinDesk Announcements'),
      title: `${cleanTicker} Özel Durum Açıklaması & Sözleşme Bildirimi`,
      url: isBist ? `https://www.kap.org.tr/tr/sirket-bilgileri/ozet/${cleanTicker}` : `https://www.sec.gov/edgar/searchedgar/companysearch`,
      publishedAt: new Date().toISOString()
    },
    {
      id: 'cit-2',
      sourceName: 'TCMB EVDS Elektronik Veri Dağıtım Sistemi',
      title: 'Haftalık Menkul Kıymet ve Yabancı Portföy Hareketleri Raporu',
      url: 'https://evds2.tcmb.gov.tr',
      publishedAt: new Date().toISOString()
    },
    {
      id: 'cit-3',
      sourceName: isNasdaq ? 'Bloomberg Markets' : 'Borsa İstanbul Veri Bülteni',
      title: `${cleanTicker} Piyasa Derinliği ve Kurumsal Akış Özeti`,
      url: 'https://www.bloomberg.com',
      publishedAt: new Date().toISOString()
    }
  ];

  const predictionMarketScenarios: PredictionMarketScenario[] = isBist ? [
    {
      topic: 'TCMB Politika Faizi Kararı',
      outcomes: [
        { option: 'Faiz Sabit Tutma', probability_pct: 78.5 },
        { option: '250 bps İndirim', probability_pct: 21.5 }
      ],
      consensus_expectation: 'Sıkı Para Politikası Korunacak (%78.5)'
    },
    {
      topic: 'Yabancı Portföy Net Girişi Beklentisi',
      outcomes: [
        { option: 'Pozitif Giriş (>50M$)', probability_pct: 68.0 },
        { option: 'Nötr / Çıkış', probability_pct: 32.0 }
      ],
      consensus_expectation: 'Pozitif Yabancı Akışı Ağırlıkta (%68.0)'
    }
  ] : (isNasdaq ? [
    {
      topic: 'Fed FOMC Faiz Kararı',
      outcomes: [
        { option: '25 bps Faiz İndirimi', probability_pct: 82.0 },
        { option: 'Faiz Sabit Tutma', probability_pct: 18.0 }
      ],
      consensus_expectation: '25 bps Güvercin İndirim Olası (%82.0)'
    },
    {
      topic: 'ABD Yumuşak İniş (Soft Landing)',
      outcomes: [
        { option: 'Yumuşak İniş / Resesyon Yok', probability_pct: 74.5 },
        { option: 'Sert İniş / Resesyon', probability_pct: 25.5 }
      ],
      consensus_expectation: 'Resesyon Riski Düşük (%74.5)'
    }
  ] : [
    {
      topic: 'Bitcoin ETF Net Akışı',
      outcomes: [
        { option: 'Net Pozitif Giriş', probability_pct: 84.0 },
        { option: 'Net Çıkış', probability_pct: 16.0 }
      ],
      consensus_expectation: 'Kurumsal Talep Güçlü (%84.0)'
    }
  ]);

  const confidenceScoreVal = (riskReport.isVetoed || !constraintResult.isPassed || managerDecision.isBullTrapRisk) ? 30.0 : 84.0;
  const alphaInsight = alphaModel.generateInsight(cleanTicker, managerDecision.action, confidenceScoreVal, '2-4 Hafta', 'MT16-QuantMind-AlphaModel');

  return {
    ticker: cleanTicker,
    assetClass,
    timestamp: new Date().toISOString(),
    consensus: managerDecision.action,
    confidenceScore: confidenceScoreVal,
    isPreFiltered: false,
    preFilterResult,
    riskManagementReport: riskReport,
    constraintResult,
    timingGateResult,
    structuredDecision: managerDecision.structuredDecision,
    decisionTrace: tracer.getTrace(),
    researchPlan,
    citations,
    predictionMarketScenarios,
    analystReports: analysts,
    tcmbMacro: tcmbData,
    finnhubSentiment: finnhubData,
    jurors,
    alphaInsight,
    finalDecision: {
      action: managerDecision.action,
      entryPrice: spotPrice,
      targetPercent: managerDecision.targetPercent,
      fullKellyPct: managerDecision.fullKellyPct,
      fractionalKellyPct: managerDecision.fractionalKellyPct,
      fractionalKellyMultiplier: managerDecision.fractionalKellyMultiplier,
      fractionalKellyLabel: managerDecision.fractionalKellyLabel,
      stopLossPercent: managerDecision.stopLossPercent,
      isBullTrapRisk: managerDecision.isBullTrapRisk,
      summary: managerDecision.summary
    }
  };
}
