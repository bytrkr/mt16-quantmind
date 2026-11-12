// Liquidation Cascade & Risk Evaluator (Mini Kripto Kural 7)
export interface LiquidationRiskResult {
  isHighRisk: boolean;
  reason: string | null;
}

export function evaluateLiquidationRisk(fearIndex: number | null, liqRisk: string | null): LiquidationRiskResult {
  if (fearIndex !== null && liqRisk === 'HIGH' && fearIndex < 40) {
    return {
      isHighRisk: true,
      reason: `Korku/Liq Riski (F: ${fearIndex}, R: ${liqRisk})`
    };
  }

  return {
    isHighRisk: false,
    reason: null
  };
}
