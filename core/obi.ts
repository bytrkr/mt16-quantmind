// Pure Order Book Imbalance (OBI) Calculation
export function calculateObi(bidVol: number, askVol: number): number {
  const total = bidVol + askVol;
  if (total <= 0) return 0;
  return Math.round(((bidVol - askVol) / total) * 10000) / 10000;
}
