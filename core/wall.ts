// Pure Order Book Depth Wall Z-Score Calculation
export interface WallResult {
  maxLot: number;
  meanLot: number;
  stdLot: number;
  wallZScore: number;
  isWallDetected: boolean;
}

export function calculateWallZScore(lots: number[]): WallResult {
  if (!lots || lots.length === 0) {
    return { maxLot: 0, meanLot: 0, stdLot: 0, wallZScore: 0, isWallDetected: false };
  }

  const maxLot = Math.max(...lots);
  const sum = lots.reduce((a, b) => a + b, 0);
  const meanLot = sum / lots.length;
  const variance = lots.reduce((a, b) => a + (b - meanLot) ** 2, 0) / lots.length;
  const stdLot = Math.sqrt(variance);

  const wallZScore = stdLot > 0 ? (maxLot - meanLot) / stdLot : 0;

  return {
    maxLot: Math.round(maxLot * 100) / 100,
    meanLot: Math.round(meanLot * 100) / 100,
    stdLot: Math.round(stdLot * 100) / 100,
    wallZScore: Math.round(wallZScore * 100) / 100,
    isWallDetected: wallZScore >= 3.0
  };
}
