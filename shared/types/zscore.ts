// shared/types/zscore.ts
/**
 * 2. KUANT, SİNYAL VE ANOMALİ MODÜLLERİ - ZSCORE
 * Z-Skor metrikleri, anomali eşikleri ve Zaman Serisi Noktalarını tanımlar.
 */

export interface ZScoreSeriesPoint {
  time: string;
  zScore: number;
  price?: number;
  volume?: number;
}

export interface AnomalyThreshold {
  warningLevel: number; // örn: 1.5σ
  triggerLevel: number; // örn: 2.0σ
  criticalLevel: number; // örn: 3.0σ
}

export interface ZScoreMetrics {
  currentZScore: number;
  mean30d: number;
  stdDev30d: number;
  threshold: AnomalyThreshold;
  history: ZScoreSeriesPoint[];
  isAnomalyTriggered: boolean;
}
