// src/core/mechanics/positionSentinel.ts
/**
 * MT16 QUANT MIND — Position Sentinel (Dinamik Portföy ve Risk Bekçisi)
 * --------------------------------------------------------------------
 * QODI ANAYASASI v6.1 KESİN KURALLARI:
 * 1. Fallback ve rasgele değer üreticileri kesinlikle yasaktır.
 * 2. Geçersiz veride return null + logDataIssue() + UI "VERİ YOK".
 * 3. Hata fırlatma (exception raising) yasaktır, tüm fonksiyonlar güvenli sonuç döner.
 * 4. toFixed/toLocaleString öncesi typeof === 'number' && !isNaN() kontrolü zorunludur.
 * 
 * PORTFÖY BEKÇİSİ KURALLARI:
 * - Tek hisse maksimum ağırlığı: Portföyün %20.0'si
 * - Tek sektör maksimum ağırlığı: Portföyün %35.0'si
 * - Günlük azami zarar eşiği: Portföyün %2.0'si (Aşıldığında yeni işlem kilitlenir - VETO_HOLD)
 */

export interface PortfolioPosition {
  symbol: string;
  sector: string;
  notionalUsd: number;
}

export interface PortfolioState {
  totalEquityUsd: number;
  dailyRealizedLossPct: number;
  positions: PortfolioPosition[];
}

export interface ProposedTrade {
  symbol: string;
  sector: string;
  notionalUsd: number;
}

export interface SentinelEvaluationResult {
  approved: boolean;
  action: 'PROCEED' | 'VETO_HOLD';
  reason: string;
  stockAllocationPct: number;
  sectorAllocationPct: number;
  dailyLossPct: number;
  errorCode: 'NONE' | 'STOCK_CONCENTRATION_EXCEEDED' | 'SECTOR_CONCENTRATION_EXCEEDED' | 'DAILY_LOSS_LOCKED' | 'INVALID_INPUT';
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

export class PositionSentinel {
  public static readonly MAX_STOCK_ALLOCATION_PCT = 20.0;
  public static readonly MAX_SECTOR_ALLOCATION_PCT = 35.0;
  public static readonly MAX_DAILY_LOSS_PCT = 2.0;

  /**
   * Portföy durumunu ve önerilen işlemi denetler.
   */
  public static evaluatePortfolioRisk(
    portfolio: PortfolioState | null | undefined,
    trade: ProposedTrade | null | undefined
  ): SentinelEvaluationResult {
    const cleanSym = trade && typeof trade.symbol === 'string' ? trade.symbol.toUpperCase().trim() : 'UNKNOWN';

    if (!portfolio || typeof portfolio.totalEquityUsd !== 'number' || isNaN(portfolio.totalEquityUsd) || portfolio.totalEquityUsd <= 0 ||
        typeof portfolio.dailyRealizedLossPct !== 'number' || isNaN(portfolio.dailyRealizedLossPct) ||
        !Array.isArray(portfolio.positions) ||
        !trade || typeof trade.notionalUsd !== 'number' || isNaN(trade.notionalUsd) || trade.notionalUsd <= 0) {
      const reason = 'Geçersiz portföy veya işlem girdisi.';
      logDataIssue('positionSentinel', cleanSym, 'portfolioState', reason);
      return {
        approved: false,
        action: 'VETO_HOLD',
        reason,
        stockAllocationPct: 0,
        sectorAllocationPct: 0,
        dailyLossPct: 0,
        errorCode: 'INVALID_INPUT',
      };
    }

    const equity = portfolio.totalEquityUsd;
    const dailyLoss = portfolio.dailyRealizedLossPct;

    // 1. KONTROL: Günlük Azami Zarar Kilidi (%2.0)
    if (dailyLoss >= PositionSentinel.MAX_DAILY_LOSS_PCT) {
      const reason = `Günlük Azami Zarar Kilidi Aktif: Günlük gerçekleşen zarar (%${dailyLoss.toFixed(2)}) >= %${PositionSentinel.MAX_DAILY_LOSS_PCT.toFixed(1)}. Yeni pozisyon açılamaz.`;
      logDataIssue('positionSentinel', cleanSym, 'dailyLoss', reason);
      return {
        approved: false,
        action: 'VETO_HOLD',
        reason,
        stockAllocationPct: 0,
        sectorAllocationPct: 0,
        dailyLossPct: dailyLoss,
        errorCode: 'DAILY_LOSS_LOCKED',
      };
    }

    const tradeSymbol = trade.symbol.toUpperCase().trim();
    const tradeSector = trade.sector ? trade.sector.toUpperCase().trim() : 'GENEL';
    const tradeNotional = trade.notionalUsd;

    // Mevcut pozisyonların toplanması
    let existingStockNotional = 0;
    let existingSectorNotional = 0;

    for (let i = 0; i < portfolio.positions.length; i++) {
      const pos = portfolio.positions[i];
      if (pos && typeof pos.notionalUsd === 'number' && !isNaN(pos.notionalUsd) && pos.notionalUsd > 0) {
        const posSym = typeof pos.symbol === 'string' ? pos.symbol.toUpperCase().trim() : '';
        const posSector = typeof pos.sector === 'string' ? pos.sector.toUpperCase().trim() : 'GENEL';

        if (posSym === tradeSymbol) {
          existingStockNotional += pos.notionalUsd;
        }
        if (posSector === tradeSector) {
          existingSectorNotional += pos.notionalUsd;
        }
      }
    }

    const totalStockNotional = existingStockNotional + tradeNotional;
    const totalSectorNotional = existingSectorNotional + tradeNotional;

    const stockAllocationPct = Number(((totalStockNotional / equity) * 100).toFixed(2));
    const sectorAllocationPct = Number(((totalSectorNotional / equity) * 100).toFixed(2));

    // 2. KONTROL: Tek Hisse Konsantrasyon Limiti (%20.0)
    if (stockAllocationPct > PositionSentinel.MAX_STOCK_ALLOCATION_PCT) {
      const reason = `Tek Hisse Konsantrasyon İhlali: #${tradeSymbol} toplam portföyün %${stockAllocationPct.toFixed(2)}'sine ulaşıyor (Azami: %${PositionSentinel.MAX_STOCK_ALLOCATION_PCT.toFixed(1)}).`;
      logDataIssue('positionSentinel', tradeSymbol, 'stockAllocation', reason);
      return {
        approved: false,
        action: 'VETO_HOLD',
        reason,
        stockAllocationPct,
        sectorAllocationPct,
        dailyLossPct: dailyLoss,
        errorCode: 'STOCK_CONCENTRATION_EXCEEDED',
      };
    }

    // 3. KONTROL: Tek Sektör Konsantrasyon Limiti (%35.0)
    if (sectorAllocationPct > PositionSentinel.MAX_SECTOR_ALLOCATION_PCT) {
      const reason = `Tek Sektör Konsantrasyon İhlali: ${tradeSector} sektörü toplam portföyün %${sectorAllocationPct.toFixed(2)}'sine ulaşıyor (Azami: %${PositionSentinel.MAX_SECTOR_ALLOCATION_PCT.toFixed(1)}).`;
      logDataIssue('positionSentinel', tradeSymbol, 'sectorAllocation', reason);
      return {
        approved: false,
        action: 'VETO_HOLD',
        reason,
        stockAllocationPct,
        sectorAllocationPct,
        dailyLossPct: dailyLoss,
        errorCode: 'SECTOR_CONCENTRATION_EXCEEDED',
      };
    }

    return {
      approved: true,
      action: 'PROCEED',
      reason: `Position Sentinel Denetimi Başarılı: Hisse payı %${stockAllocationPct.toFixed(2)}, Sektör payı %${sectorAllocationPct.toFixed(2)}, Günlük zarar %${dailyLoss.toFixed(2)}.`,
      stockAllocationPct,
      sectorAllocationPct,
      dailyLossPct: dailyLoss,
      errorCode: 'NONE',
    };
  }
}

export const positionSentinel = PositionSentinel;
