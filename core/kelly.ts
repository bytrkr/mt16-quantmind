// Pure Kelly Criterion Fraction Calculation
export function calculateKellyFraction(winRate: number, winLossRatio: number): number {
  if (winLossRatio <= 0) return 0;
  const p = winRate;
  const q = 1 - p;
  const b = winLossRatio;
  const f = (p * b - q) / b;
  return Math.max(0, Math.round(f * 10000) / 10000);
}
