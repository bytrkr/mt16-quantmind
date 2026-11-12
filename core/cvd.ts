// Pure Cumulative Volume Delta (CVD) Calculation
export function calculateCvd(buyVol: number, sellVol: number): number {
  return Math.round((buyVol - sellVol) * 10000) / 10000;
}
