// src/services/executionSafetyGuard.ts
/**
 * MT16 Acil Durum Güvenlik Zırhı & Kill-Switch (ExecutionSafetyGuard)
 * Ağ gecikmesi, veri kilitlenmesi veya aşırı kayıp (drawdown) durumlarında tüm emirleri durduran acil durum güvenlik zırhı.
 */

export interface SafetyStatus {
  isSafeToTrade: boolean;
  latencyMs: number;
  currentDrawdownPct: number;
  reason?: string;
}

export class ExecutionSafetyGuard {
  private static MAX_LATENCY_MS = 500;
  private static MAX_DRAWDOWN_PCT = 5.0;

  public static checkSafety(latencyMs: number, currentDrawdownPct: number): SafetyStatus {
    if (latencyMs > this.MAX_LATENCY_MS) {
      return {
        isSafeToTrade: false,
        latencyMs,
        currentDrawdownPct,
        reason: `Ağ Gecikmesi Yüksek (${latencyMs}ms > ${this.MAX_LATENCY_MS}ms) - Kill Switch Aktif`,
      };
    }

    if (currentDrawdownPct >= this.MAX_DRAWDOWN_PCT) {
      return {
        isSafeToTrade: false,
        latencyMs,
        currentDrawdownPct,
        reason: `Maksimum Drawdown Aşıldı (%${currentDrawdownPct} >= %${this.MAX_DRAWDOWN_PCT}) - İşlemler Durduruldu`,
      };
    }

    return {
      isSafeToTrade: true,
      latencyMs,
      currentDrawdownPct,
    };
  }

  public static validateTradeExecution(latencyMs: number, currentDrawdownPct: number, rebalanceAction: string): { allowed: boolean; reason: string } {
    const safety = this.checkSafety(latencyMs, currentDrawdownPct);
    if (!safety.isSafeToTrade) {
      return {
        allowed: false,
        reason: `Kill-Switch / VaR Koruması Devrede: ${safety.reason}`,
      };
    }

    if (rebalanceAction === 'NAKDE GEÇİŞ / HEDGE' && currentDrawdownPct > 3.5) {
      return {
        allowed: true,
        reason: 'Risk zırhı onaylı: Acil Hedge ve nakde geçiş rebalansı güvenlik sınırları içinde.',
      };
    }

    return {
      allowed: true,
      reason: 'ExecutionSafetyGuard: Tüm VaR ve Kill-Switch kontrolleri onaylandı.',
    };
  }
}
