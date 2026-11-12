// src/services/providers/yahooProvider.ts
/**
 * OPENBB YAHOO FINANCE PROVIDER ADAPTER (yahooProvider.ts)
 * --------------------------------------------------------
 * OpenBB Fetcher Lifecycle Pattern (fetcher.py):
 * - Veri Çekme: Yahoo Finance Proxy API üzerinden canlı veri sorgular.
 * - Dönüştürme: Fiyat ve Değişim Oranını OBBject/Standard Model formatına çevirir.
 * - Hata Yönetimi: Hata veya eksiklikte return null + logDataIssue() + VERİ YOK.
 */

import { BaseFetcher, FetcherQueryParams, FetcherResult, providerRegistry } from './providerRegistry';
import { logDataIssue } from '../../utils/dataAudit';

export interface YahooDataModel {
  price: number | null;
  changePct: number | null;
  previousClose: number | null;
  marketCap: number | null;
}

export class YahooFetcher implements BaseFetcher<YahooDataModel> {
  public name = 'YahooFinance';

  public async fetchData(params: FetcherQueryParams): Promise<FetcherResult<YahooDataModel>> {
    const symbol = String(params.symbol || '').toUpperCase().trim();
    if (!symbol) {
      return {
        success: false,
        provider: this.name,
        data: null,
        statusText: 'VERİ YOK',
        latencyMs: null,
      };
    }

    const startMs = performance.now();
    const formattedSymbol = symbol.includes('.') ? symbol : `${symbol}.IS`;

    try {
      const res = await fetch(`/api/yahoo-proxy?symbol=${encodeURIComponent(formattedSymbol)}`, {
        signal: AbortSignal.timeout(4000),
      });

      const latencyMs = Math.round(performance.now() - startMs);

      if (!res.ok) {
        logDataIssue('YahooFetcher', symbol, 'price', `Yahoo proxy HTTP ${res.status}`);
        return {
          success: false,
          provider: this.name,
          data: null,
          statusText: 'VERİ YOK',
          latencyMs,
        };
      }

      const json = await res.json();
      const transformed = this.transform(json);

      if (!transformed || transformed.price === null || isNaN(transformed.price) || transformed.price <= 0) {
        logDataIssue('YahooFetcher', symbol, 'price', 'Yahoo payload parse null');
        return {
          success: false,
          provider: this.name,
          data: null,
          statusText: 'VERİ YOK',
          latencyMs,
        };
      }

      return {
        success: true,
        provider: this.name,
        data: transformed,
        statusText: 'OK',
        latencyMs,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      logDataIssue('YahooFetcher', symbol, 'price', `Fetch exception: ${msg}`);
      return {
        success: false,
        provider: this.name,
        data: null,
        statusText: 'VERİ YOK',
        latencyMs: Math.round(performance.now() - startMs),
      };
    }
  }

  public transform(rawData: unknown): YahooDataModel | null {
    if (!rawData || typeof rawData !== 'object') return null;
    const typed = rawData as Record<string, any>;
    const meta = typed.chart?.result?.[0]?.meta;

    if (!meta) return null;

    const price = typeof meta.regularMarketPrice === 'number' && !isNaN(meta.regularMarketPrice) && meta.regularMarketPrice > 0
      ? meta.regularMarketPrice
      : null;

    const previousClose = typeof meta.chartPreviousClose === 'number' && !isNaN(meta.chartPreviousClose) && meta.chartPreviousClose > 0
      ? meta.chartPreviousClose
      : null;

    let changePct: number | null = null;
    if (price !== null && previousClose !== null && previousClose > 0) {
      changePct = Number((((price - previousClose) / previousClose) * 100).toFixed(2));
    }

    return {
      price,
      changePct,
      previousClose,
      marketCap: typeof meta.marketCap === 'number' && !isNaN(meta.marketCap) ? meta.marketCap : null,
    };
  }
}

export const yahooFetcher = new YahooFetcher();
providerRegistry.register(yahooFetcher);
