// src/services/portfolioGuard.ts
/**
 * MT16 Risk & Pozisyon Yönetimi Kalkanı (PortfolioGuard)
 * Kelly Kriteri, VaR %95 ve azami portföy tahsis tavanı (max_portfolio_allocation) ile OCO risk/ödül seviyelerini yönetir.
 * Ayrıca portföy korelasyon kalkanı (Pearson correlation) sağlar.
 */

export interface RiskParameters {
  portfolioValue: number;
  winRate: number;
  rewardRiskRatio: number;
  volatilityDailyPct: number;
  maxAllowedAllocationPct?: number;
}

export interface PortfolioAllocationResult {
  kellyMultiplier: number;
  recommendedPositionAmount: number;
  recommendedLots: number;
  maxAllocationPct: number;
  maxPortfolioAllocationPct: number;
  var95Pct: number;
  stopLossPct: number;
  takeProfitPct: number;
  riskRewardRatio: string;
  formattedSummary: string;
}

export interface CorrelationCheckResult {
  approved: boolean;
  maxCorrelation: number;
  correlatedWith: string | null;
  threshold: number;
  reason: string;
}

export class PortfolioGuard {
  public static readonly DEFAULT_MAX_ALLOCATION_PCT = 20.0;
  public static readonly CORRELATION_THRESHOLD = 0.85;

  /**
   * Kelly Kriteri ve VaR 95% ile risk-ayarlı pozisyon büyüklüğü ve azami portföy tahsisini hesaplar.
   * Kelly Formülü: f* = (p * b - q) / b
   * p = Win Rate (Kazanma Olasılığı)
   * q = 1 - p (Kaybetme Olasılığı)
   * b = Kar/Zarar Oranı (Win/Loss Oranı)
   */
  public static calculateAllocation(params: RiskParameters, currentPrice: number = 100): PortfolioAllocationResult {
    const portfolioValue = Math.max(params.portfolioValue, 1000);
    const winRate = Math.min(Math.max(params.winRate, 0.01), 0.99);
    const b = Math.max(params.rewardRiskRatio, 0.5);
    const q = 1 - winRate;

    // Kelly f* hesaplama
    const rawKelly = (winRate * b - q) / b;
    // Kuant risk yönetiminde tam Kelly yerine Fractional Kelly (Yarım Kelly) ve azami tavan uygulanır
    const halfKelly = Math.max(0, rawKelly * 0.5);

    const maxAllowedPct = (params.maxAllowedAllocationPct || PortfolioGuard.DEFAULT_MAX_ALLOCATION_PCT) / 100;
    const effectiveMultiplier = Math.min(halfKelly, maxAllowedPct);

    const recommendedAmount = Math.round(portfolioValue * effectiveMultiplier);
    const validPrice = currentPrice > 0 ? currentPrice : 100;
    const recommendedLots = Math.max(1, Math.floor(recommendedAmount / validPrice));

    // Parametrik VaR %95 (1 Günlük = 1.645 * Günlük Oynaklık)
    const dailyVol = params.volatilityDailyPct > 0 ? params.volatilityDailyPct : 2.5;
    const var95Pct = Number((1.645 * dailyVol).toFixed(2));

    // Dinamik OCO Seviyeleri (VaR ve R:R bazlı)
    const stopLossPct = Number(Math.max(1.0, var95Pct * 0.6).toFixed(2));
    const takeProfitPct = Number((stopLossPct * b).toFixed(2));
    const riskRewardRatio = `1:${b.toFixed(2)}`;

    const formattedSummary = `Kelly: %${(effectiveMultiplier * 100).toFixed(1)} | Önerilen Pozisyon: ₺${recommendedAmount.toLocaleString('tr-TR')} (${recommendedLots} Lot) | VaR 95%: %${var95Pct} | SL: -%${stopLossPct} | TP: +%${takeProfitPct}`;
    const maxAlloc = Number((maxAllowedPct * 100).toFixed(1));

    return {
      kellyMultiplier: Number(effectiveMultiplier.toFixed(3)),
      recommendedPositionAmount: recommendedAmount,
      recommendedLots,
      maxAllocationPct: maxAlloc,
      maxPortfolioAllocationPct: maxAlloc,
      var95Pct,
      stopLossPct,
      takeProfitPct,
      riskRewardRatio,
      formattedSummary,
    };
  }

  /**
   * İki fiyat serisi arasındaki Pearson korelasyon katsayısını hesaplar.
   */
  public static calculatePearsonCorrelation(seriesA: number[], seriesB: number[]): number {
    if (!seriesA || !seriesB || seriesA.length !== seriesB.length || seriesA.length < 2) {
      return 0.0;
    }

    const n = seriesA.length;
    const meanA = seriesA.reduce((sum, v) => sum + v, 0) / n;
    const meanB = seriesB.reduce((sum, v) => sum + v, 0) / n;

    let num = 0;
    let denA = 0;
    let denB = 0;

    for (let i = 0; i < n; i++) {
      const diffA = seriesA[i] - meanA;
      const diffB = seriesB[i] - meanB;
      num += diffA * diffB;
      denA += diffA * diffA;
      denB += diffB * diffB;
    }

    if (denA === 0 || denB === 0) {
      return 0.0;
    }

    return num / (Math.sqrt(denA) * Math.sqrt(denB));
  }

  /**
   * Portföydeki mevcut hisselerle aday varlık arasındaki korelasyonu denetler.
   */
  public static checkCorrelationApproval(
    candidateTicker: string,
    candidatePrices: number[],
    existingPortfolioSeries: Record<string, number[]>
  ): CorrelationCheckResult {
    if (!existingPortfolioSeries || Object.keys(existingPortfolioSeries).length === 0) {
      return {
        approved: true,
        maxCorrelation: 0.0,
        correlatedWith: null,
        threshold: PortfolioGuard.CORRELATION_THRESHOLD,
        reason: 'Portföy boş, korelasyon riski bulunmuyor.',
      };
    }

    let maxCorr = 0.0;
    let correlatedAsset: string | null = null;

    for (const [ticker, series] of Object.entries(existingPortfolioSeries)) {
      if (ticker === candidateTicker) continue;
      const corr = PortfolioGuard.calculatePearsonCorrelation(candidatePrices, series);
      if (Math.abs(corr) > Math.abs(maxCorr)) {
        maxCorr = corr;
        correlatedAsset = ticker;
      }
    }

    const approved = Math.abs(maxCorr) <= PortfolioGuard.CORRELATION_THRESHOLD;
    const reason = approved
      ? `İşlem onaylandı. Maksimum korelasyon: ${maxCorr.toFixed(2)} (${correlatedAsset || 'Yok'})`
      : `İşlem REDDEDİLDİ: '${candidateTicker}' portföydeki '${correlatedAsset}' ile aşırı korelasyonlu (${maxCorr.toFixed(2)} > ${PortfolioGuard.CORRELATION_THRESHOLD}).`;

    return {
      approved,
      maxCorrelation: Number(maxCorr.toFixed(2)),
      correlatedWith: correlatedAsset,
      threshold: PortfolioGuard.CORRELATION_THRESHOLD,
      reason,
    };
  }
}
