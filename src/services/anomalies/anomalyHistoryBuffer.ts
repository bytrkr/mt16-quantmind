// src/services/anomalies/anomalyHistoryBuffer.ts
/**
 * MT16 Anomali Geçmişi ve Sparkline Tampon Bellek Servisi (AnomalyHistoryBuffer)
 * Son 24 saatlik compositeAnomalyScore verilerini bellekte ve localStorage'da saklar,
 * SmartJuryDiagnosisCard Sparkline grafiğine kesintisiz canlı akış sağlar.
 */

export interface AnomalyHistoryRecord {
  timestamp: number;
  timeString: string;
  symbol: string;
  compositeAnomalyScore: number;
  zScore: number;
}

export class AnomalyHistoryBuffer {
  private static STORAGE_KEY = 'mt16_anomaly_history_buffer_v1';
  private static MAX_RECORDS = 24;

  public static recordAnomaly(symbol: string, score: number, zScore: number): AnomalyHistoryRecord[] {
    try {
      const records = this.getHistory(symbol);
      const now = Date.now();
      const timeString = new Date(now).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
      
      const newRecord: AnomalyHistoryRecord = {
        timestamp: now,
        timeString,
        symbol: symbol.toUpperCase(),
        compositeAnomalyScore: Math.round(Math.max(0, Math.min(100, score))),
        zScore: Number(zScore.toFixed(2)),
      };

      records.push(newRecord);
      const trimmed = records.slice(-this.MAX_RECORDS);
      localStorage.setItem(`${this.STORAGE_KEY}_${symbol.toUpperCase()}`, JSON.stringify(trimmed));
      return trimmed;
    } catch {
      return [];
    }
  }

  public static getHistory(symbol: string): AnomalyHistoryRecord[] {
    try {
      const raw = localStorage.getItem(`${this.STORAGE_KEY}_${symbol.toUpperCase()}`);
      if (!raw) return this.generateDefaultHistory(symbol);
      const parsed: AnomalyHistoryRecord[] = JSON.parse(raw);
      if (!Array.isArray(parsed) || parsed.length === 0) return this.generateDefaultHistory(symbol);
      return parsed;
    } catch {
      return this.generateDefaultHistory(symbol);
    }
  }

  public static clearAllHistory(): void {
    if (typeof window === 'undefined') return;
    try {
      const toRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(this.STORAGE_KEY)) {
          toRemove.push(k);
        }
      }
      toRemove.forEach((k) => localStorage.removeItem(k));
    } catch {}
  }

  private static generateDefaultHistory(symbol: string): AnomalyHistoryRecord[] {
    const list: AnomalyHistoryRecord[] = [];
    const now = Date.now();
    
    // Nötr başlangıç durumu (50 puan, 0 Z-Skor)
    for (let i = 12; i >= 0; i--) {
      const ts = now - i * 3600 * 1000;
      const timeString = new Date(ts).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
      
      list.push({
        timestamp: ts,
        timeString,
        symbol: symbol.toUpperCase(),
        compositeAnomalyScore: 50,
        zScore: 0,
      });
    }
    return list;
  }
}
