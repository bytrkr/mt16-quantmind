// src/services/providers/tradingViewScreenerProvider.ts
/**
 * OPENBB TRADINGVIEW SCREENER PROVIDER ADAPTER (tradingViewScreenerProvider.ts)
 * ----------------------------------------------------------------------------
 * OpenBB Architecture (fetcher.py & registry.py):
 * - Single-file Provider Adapter
 * - Implement BaseFetcher lifecycle interface
 * - Register into providerRegistry
 * - Qodi v6.1: 0 fallback, 0 ??, 0 Math.random, 0 throw, 0 VITE_
 */

import { BaseFetcher, FetcherQueryParams, FetcherResult, providerRegistry } from './providerRegistry';
import { logDataIssue } from '../../utils/dataAudit';

export interface TVPrice {
  price: number | null;
  changePct: number | null;
}

export async function getFromTradingView(symbol: string): Promise<TVPrice | null> {
  const fetcher = providerRegistry.get<TVPrice>('TradingView');
  if (fetcher) {
    const res = await fetcher.fetchData({ symbol });
    return res.data;
  }
  return null;
}

export class TradingViewFetcher implements BaseFetcher<TVPrice> {
  public name = 'TradingView';

  public async fetchData(params: FetcherQueryParams): Promise<FetcherResult<TVPrice>> {
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

    try {
      const res = await fetch(`/api/tradingview-proxy?symbol=${encodeURIComponent(symbol)}`, {
        signal: AbortSignal.timeout(4000),
      });

      const latencyMs = Math.round(performance.now() - startMs);

      if (!res.ok) {
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
        logDataIssue('TradingViewFetcher', symbol, 'price', 'TV row parse null');
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
      logDataIssue('TradingViewFetcher', symbol, 'price', `TV fetch fail: ${msg}`);
      return {
        success: false,
        provider: this.name,
        data: null,
        statusText: 'VERİ YOK',
        latencyMs: Math.round(performance.now() - startMs),
      };
    }
  }

  public transform(rawData: unknown): TVPrice | null {
    if (!rawData || typeof rawData !== 'object') return null;
    const json = rawData as Record<string, any>;
    if (!Array.isArray(json.data) || json.data.length === 0) return null;

    const row = json.data[0]?.d;
    if (!Array.isArray(row) || typeof row[0] !== 'number' || isNaN(row[0]) || row[0] <= 0) {
      return null;
    }

    return {
      price: row[0],
      changePct: typeof row[1] === 'number' && !isNaN(row[1]) ? row[1] : null,
    };
  }
}

export const tradingViewFetcher = new TradingViewFetcher();
providerRegistry.register(tradingViewFetcher);

export default {
  getFromTradingView,
  tradingViewFetcher,
};
