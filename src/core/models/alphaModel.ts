// src/core/models/alphaModel.ts
/**
 * MT16 QUANT MIND — Alpha Model Framework (LEAN Tarzı Standart Sinyal Sözleşmesi)
 * ----------------------------------------------------------------------------
 * QODI ANAYASASI v6.1 KESİN KURALLARI:
 * 1. Fallback ve rasgele değer üreticileri kesinlikle yasaktır.
 * 2. Geçersiz veride return null + logDataIssue() + UI "VERİ YOK".
 * 3. Hata fırlatma (exception raising) yasaktır, tüm fonksiyonlar güvenli sonuç döner.
 * 4. toFixed/toLocaleString öncesi typeof === 'number' && !isNaN() kontrolü zorunludur.
 * 
 * ALPHA MODEL MANTIĞI (LEAN Altyapısı):
 * Jüri ve analist çıktılarını standart bir Insight sözleşmesine dönüştürür:
 * Insight(symbol, direction, confidence, timeHorizon, sourceModel)
 */

export type AlphaDirection = 'BULLISH' | 'BEARISH' | 'FLAT';

export interface AlphaInsight {
  symbol: string;
  direction: AlphaDirection;
  confidence: number; // 0 - 100
  timeHorizon: string;
  sourceModel: string;
  timestamp: string;
  rationale: string;
}

function logDataIssue(module: string, symbol: string, field: string, reason: string): void {
  try {
    const payload = {
      timestamp: new Date().toISOString(),
      module,
      symbol: (symbol || 'UNKNOWN').toUpperCase().trim(),
      field,
      reason,
    };
    if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
      window.fetch('/api/audit-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(() => {});
    } else {
      console.warn(`[DATA AUDIT WARN] [${module}] ${payload.symbol} ${field}: ${reason}`);
    }
  } catch {
    // Non-blocking
  }
}

export class AlphaModel {
  /**
   * Jüri veya ham piyasa raporundan standart Alpha Insight sözleşmesi üretir.
   */
  public static generateInsight(
    symbol: string,
    juryVerdict: string | null | undefined,
    confidenceScore: number | null | undefined,
    timeHorizonInput?: string | null,
    sourceModelName?: string | null
  ): AlphaInsight | null {
    const cleanSym = typeof symbol === 'string' && symbol.trim().length > 0 ? symbol.toUpperCase().trim() : '';
    if (!cleanSym) {
      logDataIssue('alphaModel', 'UNKNOWN', 'symbol', 'Sembol geçersiz veya boş.');
      return null;
    }

    if (typeof juryVerdict !== 'string' || juryVerdict.trim().length === 0) {
      logDataIssue('alphaModel', cleanSym, 'juryVerdict', 'Jüri kararı geçersiz.');
      return null;
    }

    let confidence = 50.0;
    if (typeof confidenceScore === 'number' && !isNaN(confidenceScore)) {
      confidence = Math.max(0, Math.min(100, Number(confidenceScore.toFixed(2))));
    }

    const vUpper = juryVerdict.toUpperCase();
    let direction: AlphaDirection = 'FLAT';

    if (vUpper.includes('BUY') || vUpper.includes('STRONG_BUY') || vUpper.includes('AL') || vUpper.includes('ACCUMULATION')) {
      direction = 'BULLISH';
    } else if (vUpper.includes('SELL') || vUpper.includes('STRONG_SELL') || vUpper.includes('SAT') || vUpper.includes('DISTRIBUTION') || vUpper.includes('VETO')) {
      direction = 'BEARISH';
    } else {
      direction = 'FLAT';
    }

    const timeHorizon = typeof timeHorizonInput === 'string' && timeHorizonInput.trim().length > 0
      ? timeHorizonInput.trim().slice(0, 50)
      : '2-4 Hafta (Stratejik Vade)';

    const sourceModel = typeof sourceModelName === 'string' && sourceModelName.trim().length > 0
      ? sourceModelName.trim().slice(0, 50)
      : 'MT16-QuantMind-AlphaModel';

    return {
      symbol: cleanSym,
      direction,
      confidence,
      timeHorizon,
      sourceModel,
      timestamp: new Date().toISOString(),
      rationale: `Alpha Model Insight: #${cleanSym} için yön ${direction}, güven skoru %${confidence.toFixed(1)}, vade ${timeHorizon}.`,
    };
  }
}

export const alphaModel = AlphaModel;
