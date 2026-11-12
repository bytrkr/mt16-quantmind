// Open Interest & Volume Z-Score Anomaly Tracker (Mini Kripto Kural 8)
export interface VolumeAnomalyResult {
  isAnomalous: boolean;
  reason: string | null;
}

export function evaluateVolumeAnomaly(volZ: number | null): VolumeAnomalyResult {
  if (volZ !== null && Math.abs(volZ) > 2.0) {
    return {
      isAnomalous: true,
      reason: `Hacim Z-Skor Anomali (Z: ${volZ})`
    };
  }

  return {
    isAnomalous: false,
    reason: null
  };
}
