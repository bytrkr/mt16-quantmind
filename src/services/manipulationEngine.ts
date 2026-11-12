// src/services/manipulationEngine.ts
import { SocialData, FinalDecision } from '../types/quantEngine';

export type ManipulationRiskLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export interface ManipulationViewModel {
  ticker: string;
  mentionCount: number;
  sentimentScore: number;
  manipulationRiskScore: number;
  level: ManipulationRiskLevel;
  levelLabel: 'Yüksek Risk' | 'Orta' | 'Düşük';
  badgeClass: string;
  summary: string;
  toon: string;
}

export class ManipulationEngine {
  /**
   * Python backend'den gelen SocialData veya FinalDecision nesnesini (snake_case)
   * TypeScript camelCase SocialData arayüzüne güvenli biçimde eşler.
   */
  public normalizeSocialData(
    ticker: string,
    rawDecision?: Partial<FinalDecision> | Record<string, any> | null,
    fallbackRiskScore: number | null = null
  ): SocialData {
    const cleanTicker = (ticker || 'BIST').trim().toUpperCase().replace('.IS', '');

    if (!rawDecision) {
      const safeScore = fallbackRiskScore !== null ? Math.max(0, Math.min(100, Math.round(fallbackRiskScore))) : null;
      const fallbackData: SocialData = {
        ticker: cleanTicker,
        mentionCount: null,
        sentimentScore: null,
        manipulationRiskScore: safeScore,
        summary: (safeScore !== null && safeScore > 0) ? `${cleanTicker} sosyal manipülasyon taraması aktif.` : 'Veri yok',
      };
      fallbackData.toon = this.buildToon(fallbackData);
      return fallbackData;
    }

    const rawSocial =
      rawDecision.socialData ||
      rawDecision.social_data ||
      rawDecision.metadata?.social_data ||
      null;

    const mentionCount = (rawSocial?.mentionCount ?? rawSocial?.mention_count ?? null);
    const sentimentScore = (rawSocial?.sentimentScore ?? rawSocial?.sentiment_score ?? null);

    const rawRisk =
      rawSocial?.manipulationRiskScore ??
      rawSocial?.manipulation_risk_score ??
      rawDecision.manipulationRiskScore ??
      rawDecision.manipulation_risk_score ??
      rawDecision.metadata?.manipulation_risk_score ??
      fallbackRiskScore ??
      null;

    const manipulationRiskScore = rawRisk !== null 
      ? Math.max(0, Math.min(100, Math.round(Number(rawRisk))))
      : null;

    const summary =
      rawSocial?.summary ||
      (manipulationRiskScore !== null && manipulationRiskScore > 70
        ? `${cleanTicker} tahtasında yüksek sosyal medya manipülasyon riski (pump & dump) tespit edildi.`
        : manipulationRiskScore !== null && manipulationRiskScore >= 40
        ? `${cleanTicker} sosyal medya akışında orta düzey spekülatif hareketlilik izleniyor.`
        : 'Veri yok');

    const normalized: SocialData = {
      ticker: rawSocial?.ticker || cleanTicker,
      mentionCount,
      sentimentScore,
      manipulationRiskScore,
      summary,
      mention_count: mentionCount,
      sentiment_score: sentimentScore,
      manipulation_risk_score: manipulationRiskScore,
    };

    normalized.toon = rawSocial?.toon || this.buildToon(normalized);
    return normalized;
  }

  /**
   * 0-100 arası manipülasyon risk skorunu seviye (High/Medium/Low) ve renge çevirir.
   */
  public evaluateScore(rawScore: number | null): {
    score: number | null;
    level: ManipulationRiskLevel;
    levelDisplay: 'High' | 'Medium' | 'Low';
    levelLabel: 'Yüksek Risk' | 'Orta' | 'Düşük';
    color: 'red' | 'yellow' | 'green';
    badgeClass: string;
  } {
    const score = rawScore !== null ? Math.max(0, Math.min(100, Math.round(Number(rawScore)))) : null;

    if (score !== null && score > 70) {
      return {
        score,
        level: 'HIGH',
        levelDisplay: 'High',
        levelLabel: 'Yüksek Risk',
        color: 'red',
        badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/50 animate-pulse',
      };
    }

    if (score !== null && score >= 40) {
      return {
        score,
        level: 'MEDIUM',
        levelDisplay: 'Medium',
        levelLabel: 'Orta',
        color: 'yellow',
        badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/50',
      };
    }

    return {
      score,
      level: 'LOW',
      levelDisplay: 'Low',
      levelLabel: 'Düşük',
      color: 'green',
      badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
    };
  }

  /**
   * Risk skoruna göre arayüz rozet (Badge) görünüm modelini üretir:
   * - > 70: Kırmızı (Yüksek Risk)
   * - 40 - 70: Sarı (Orta)
   * - < 40: Yeşil (Düşük)
   */
  public formatForUI(
    ticker: string,
    rawDecision?: Partial<FinalDecision> | Record<string, any> | null,
    fallbackRiskScore: number | null = null
  ): ManipulationViewModel {
    const social = this.normalizeSocialData(ticker, rawDecision, fallbackRiskScore);
    const evaluated = this.evaluateScore(social.manipulationRiskScore);

    return {
      ticker: social.ticker,
      mentionCount: social.mentionCount,
      sentimentScore: social.sentimentScore,
      manipulationRiskScore: evaluated.score,
      level: evaluated.level,
      levelLabel: evaluated.levelLabel,
      badgeClass: evaluated.badgeClass,
      summary: social.summary,
      toon: social.toon || this.buildToon(social),
    };
  }

  /**
   * SocialData nesnesini #TOON/v3.5 schema=BISTAPP_SOCIAL_MANIPULATION formatına dönüştürür.
   */
  public buildToon(data: SocialData): string {
    const score = data.manipulationRiskScore ?? data.manipulation_risk_score ?? null;
    const mentions = data.mentionCount ?? data.mention_count ?? null;
    const sentiment = data.sentimentScore ?? data.sentiment_score ?? null;
    const level = score !== null ? (score > 70 ? 'HIGH' : score >= 40 ? 'MEDIUM' : 'LOW') : 'LOW';
    const sign = (sentiment !== null && sentiment >= 0) ? '+' : '';

    return [
      '#TOON/v3.5 schema=BISTAPP_SOCIAL_MANIPULATION',
      `@social{sym:${data.ticker};mentions:${mentions ?? '---'};sentiment:${sentiment !== null ? `${sign}${sentiment.toFixed(2)}` : '---'};risk_score:${score !== null ? `${Math.round(score)}/100` : '---'};level:${level}}`,
      `@summary{${data.summary || 'Veri yok'}}`,
    ].join('\n');
  }

  public formatAkdViewModel(rawAkd: any) {
    if (!rawAkd) {
      return {
        ticker: 'ASELS',
        top3NetLot: null,
        bofaNetLot: null,
        garantiNetLot: null,
        isYatirimNetLot: null,
        hhi: null,
        signalType: 'DENGELI',
        signalLabel: 'Dengeli Kurumsal Akış',
        summary: 'Veri yok',
        toon: '',
      };
    }
    return {
      ticker: rawAkd.ticker || 'ASELS',
      top3NetLot: (rawAkd.top3_net_lot ?? rawAkd.top3NetLot ?? null),
      bofaNetLot: (rawAkd.bofa_net_lot ?? rawAkd.bofaNetLot ?? null),
      garantiNetLot: (rawAkd.garanti_net_lot ?? rawAkd.garantiNetLot ?? null),
      isYatirimNetLot: (rawAkd.is_yatirim_net_lot ?? rawAkd.isYatirimNetLot ?? null),
      hhi: (rawAkd.hhi_concentration ?? rawAkd.hhi ?? null),
      signalType: rawAkd.signal_type || rawAkd.signalType || 'DENGELI',
      signalLabel: rawAkd.signal_label || rawAkd.signalLabel || 'Dengeli Kurumsal Akış',
      summary: rawAkd.summary || 'Veri yok',
      toon: rawAkd.toon || '',
    };
  }

  public formatTaxViewModel(rawTax: any) {
    if (!rawTax) {
      return {
        ticker: 'ASELS',
        nominalPnlTl: null,
        nominalPnlPct: null,
        realPnlUsd: null,
        realPnlUsdPct: null,
        withholdingRate: null,
        netPnlTl: null,
        taxStatus: 'EXEMPT_STOPAJ_0',
        summary: 'Veri yok',
        toon: '',
      };
    }
    const nom = rawTax.nominal || {};
    const fx = rawTax.fx_real_return || {};
    const tax = rawTax.taxation || {};

    return {
      ticker: rawTax.ticker || 'ASELS',
      nominalPnlTl: (nom.nominal_pnl_tl ?? rawTax.nominalPnlTl ?? null),
      nominalPnlPct: (nom.nominal_pnl_pct ?? rawTax.nominalPnlPct ?? null),
      realPnlUsd: (fx.real_pnl_usd ?? rawTax.realPnlUsd ?? null),
      realPnlUsdPct: (fx.real_pnl_usd_pct ?? rawTax.realPnlUsdPct ?? null),
      withholdingRate: (tax.withholding_tax_rate ?? rawTax.withholdingRate ?? null),
      netPnlTl: (tax.net_pnl_tl ?? rawTax.netPnlTl ?? null),
      taxStatus: tax.tax_status || rawTax.taxStatus || 'EXEMPT_STOPAJ_0',
      summary: rawTax.summary || 'Veri yok',
      toon: rawTax.toon || '',
    };
  }

  public formatRiskViewModel(rawDecision: any) {
    const pos = rawDecision?.positionSizing || rawDecision?.position_sizing || rawDecision?.metadata?.position_sizing || {};
    const guard = rawDecision?.portfolioGuardStatus || rawDecision?.portfolio_guard_status || { approved: true, max_correlation: 0.12, reason: 'Korelasyon riski bulunmuyor.' };
    const slip = rawDecision?.slippageImpact || rawDecision?.slippage_impact || { executed_price: 100, fee_amount: 15.0, slippage_bps: 5.0 };

    return {
      capital: (pos.capital ?? null),
      kellyFraction: (pos.kelly_fraction ?? pos.kellyFraction ?? null),
      recommendedAllocationUsd: (pos.recommended_allocation_usd ?? pos.recommendedAllocationUsd ?? null),
      recommendedLots: (pos.recommended_lots ?? pos.recommendedLots ?? null),
      suggestedStopPrice: (pos.suggested_stop_price ?? pos.suggestedStopPrice ?? null),
      atr: (pos.atr ?? null),
      guardApproved: Boolean(guard.approved ?? true),
      guardCorrelation: (guard.max_correlation ?? guard.maxCorrelation ?? null),
      guardReason: guard.reason || 'Portföy riski dengeli.',
      slippageBps: (slip.slippage_bps ?? slip.slippageBps ?? null),
      feeAmount: (slip.fee_amount ?? slip.feeAmount ?? null),
    };
  }
}

export const manipulationEngine = new ManipulationEngine();
export default manipulationEngine;
