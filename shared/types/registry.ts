// shared/types/registry.ts
/**
 * 1. TEMEL PİYASA VE VARLIK MODÜLÜ - REGISTRY
 * Varlık kayıt defteri, katman (tier) ve sektör kategorilerini tanımlar.
 */

import { MarketType } from './market';

export type AssetTier = 'Yıldız Pazar' | 'Ana Pazar' | 'Global Tech' | 'Global Auto' | 'Layer 1' | 'Smart Contract' | 'Fiat' | string;

export type SectorCategory = 'Technology' | 'Banking' | 'Aviation' | 'Defense' | 'Energy' | 'Automotive' | 'Crypto' | 'Forex' | string;

export interface AssetInfo {
  symbol: string;
  ticker: string;
  name: string;
  market: MarketType;
  tier: AssetTier;
  sector: SectorCategory;
  isTradable: boolean;
  minOrderSize?: number;
}

export type GlobalRegistryMap = Record<string, Record<string, AssetInfo>>;
