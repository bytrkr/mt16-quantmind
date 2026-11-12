// BIST Tax (BSMV / Stopaj) Calculator
export function calculateBistTax(grossGain: number, isEquity: boolean = true): { stopajPct: number; netGain: number } {
  // BIST hisse senetlerinde bireysel yatırımcılar için stopaj %0
  const stopajPct = isEquity ? 0.0 : 10.0;
  const taxAmount = (grossGain * stopajPct) / 100;
  return {
    stopajPct,
    netGain: grossGain - taxAmount
  };
}
