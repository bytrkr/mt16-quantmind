// Nasdaq Short Interest & Borrow Fee Tracker
export function evaluateShortInterest(symbol: string): { shortFloatPct: number; borrowFeePct: number } {
  return {
    shortFloatPct: 1.8,
    borrowFeePct: 0.3
  };
}
