// Perpetual Futures Funding Rate & Crowd Position Ratio Tracker (Mini Kripto Kural 6)
export interface FundingCrowdResult {
  isCrowdedLong: boolean;
  fundingRatePct: number | null;
  longRatioPct: number | null;
  reason: string | null;
}

export function evaluateFundingCrowd(funding: number | null, longRatio: number | null): FundingCrowdResult {
  if (funding !== null && longRatio !== null && funding > 0 && longRatio > 0.5) {
    return {
      isCrowdedLong: true,
      fundingRatePct: funding,
      longRatioPct: longRatio * 100,
      reason: `Kalabalık Long (F: ${funding}%, L: ${(longRatio * 100).toFixed(1)}%)`
    };
  }

  return {
    isCrowdedLong: false,
    fundingRatePct: funding,
    longRatioPct: longRatio ? longRatio * 100 : null,
    reason: null
  };
}
