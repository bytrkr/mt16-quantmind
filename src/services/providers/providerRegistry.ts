// src/services/providers/providerRegistry.ts
/**
 * OPENBB PLATFORM PROVIDER REGISTRY & FETCHER LIFECYCLE (providerRegistry.ts)
 * -------------------------------------------------------------------------
 * OpenBB Architecture (registry.py & fetcher.py):
 * 1. Provider Registry: Dinamik provider kaydı (Single-file provider extension pattern).
 * 2. Fetcher Lifecycle: Veri çekme -> Dönüştürme -> Hata/Eksik durumunda VERİ YOK + logDataIssue().
 *
 * QODI ANAYASASI v6.1 KESİN KURALLARI:
 * - 0 fallback, 0 ??, 0 Math.random, 0 throw, 0 VITE_.
 * - Eksik veya hatalı veride return null + logDataIssue() + "VERİ YOK".
 */

import { logDataIssue } from '../../utils/dataAudit';

export interface FetcherQueryParams {
  symbol: string;
  market?: string;
  [key: string]: unknown;
}

export interface FetcherResult<T = unknown> {
  success: boolean;
  provider: string;
  data: T | null;
  statusText: string;
  latencyMs: number | null;
}

export interface BaseFetcher<T = unknown> {
  name: string;
  fetchData(params: FetcherQueryParams): Promise<FetcherResult<T>>;
  transform?(rawData: unknown): T | null;
}

export class ProviderRegistry {
  private providers = new Map<string, BaseFetcher<any>>();

  public register(provider: BaseFetcher<any>): void {
    if (!provider || !provider.name) return;
    const key = provider.name.toLowerCase().trim();
    this.providers.set(key, provider);
  }

  public get<T = unknown>(providerName: string): BaseFetcher<T> | null {
    if (!providerName) return null;
    const key = providerName.toLowerCase().trim();
    const found = this.providers.get(key);
    return (found as BaseFetcher<T>) || null;
  }

  public getAll(): BaseFetcher<any>[] {
    return Array.from(this.providers.values());
  }

  public clear(): void {
    this.providers.clear();
  }
}

export const providerRegistry = new ProviderRegistry();
