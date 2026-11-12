// Crypto Fear & Greed Index Tracker
export interface FearIndexResult {
  fearIndex: number | null;
  sentimentLabel: string;
}

export function evaluateFearIndex(fearIndex: number | null): FearIndexResult {
  if (fearIndex === null) {
    return { fearIndex: null, sentimentLabel: "NEUTRAL" };
  }
  if (fearIndex < 25) return { fearIndex, sentimentLabel: "EXTREME_FEAR" };
  if (fearIndex < 45) return { fearIndex, sentimentLabel: "FEAR" };
  if (fearIndex > 75) return { fearIndex, sentimentLabel: "EXTREME_GREED" };
  if (fearIndex > 55) return { fearIndex, sentimentLabel: "GREED" };
  return { fearIndex, sentimentLabel: "NEUTRAL" };
}
