// shared/types/currency.ts
/**
 * 1. TEMEL PİYASA VE VARLIK MODÜLÜ - CURRENCY
 * Para birimi kodları ve döviz kuru anlık görüntülerini tanımlar.
 */

export type CurrencyCode = 'TRY' | 'USD' | 'EUR';

export interface ExchangeRateSnapshot {
  base: CurrencyCode;
  quote: CurrencyCode;
  rate: number;
  change24hPct: number;
  lastUpdated: string;
}
