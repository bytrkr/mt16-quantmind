// shared/types/indicators.ts
/**
 * 2. KUANT, SİNYAL VE ANOMALİ MODÜLLERİ - INDICATORS
 * Teknik göstergeler (RSI, MACD, Bollinger, Supertrend) anlık görüntüsünü tanımlar.
 */

export interface TechnicalIndicatorsSnapshot {
  rsi: number;
  rsiStatus: 'OVERBOUGHT' | 'OVERSOLD' | 'NEUTRAL' | string;
  macd: {
    macdLine: number;
    signalLine: number;
    histogram: number;
    trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  };
  bollinger: {
    upper: number;
    middle: number;
    lower: number;
    bandwidth: number;
  };
  supertrend: {
    value: number;
    signal: 'BUY' | 'SELL';
  };
}
