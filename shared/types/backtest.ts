// shared/types/backtest.ts
/**
 * 5. RİSK, PORTFÖY VE OTONOM MOTOR MODÜLLERİ - BACKTEST
 * Strateji backtest ayarları, performans metrikleri (Sharpe, MaxDrawdown, WinRate) ve sonuç özetlerini tanımlar.
 */

export interface BacktestConfig {
  strategyName: string;
  initialCapital: number;
  startDate: string;
  endDate: string;
  tickerList: string[];
  slippageBps: number;
  feePct: number;
}

export interface BacktestResult {
  totalTrades: number;
  winRatePct: number;
  profitFactor: number;
  sharpeRatio: number;
  maxDrawdownPct: number;
  totalReturnPct: number;
  annualisedReturnPct: number;
  tradesHistory: any[];
}
