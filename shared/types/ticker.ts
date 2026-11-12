// shared/types/ticker.ts
/**
 * 1. TEMEL PİYASA VE VARLIK MODÜLÜ - TICKER
 * Ticker doğrulama kuralları ve sembol eşleme şemalarını tanımlar.
 */

import { MarketType } from './market';

export interface TickerValidationRules {
  minLength: number;
  maxLength: number;
  allowedCharsPattern: string;
  suffixRequired?: string;
}

export interface TickerSymbolMapping {
  ticker: string;
  market: MarketType;
  fullSymbol: string;
  isisSymbol?: string;
  baseCurrency: string;
  quoteCurrency: string;
}
