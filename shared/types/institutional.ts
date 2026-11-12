// shared/types/institutional.ts
/**
 * 4. DERİNLİK, TAKAS VE KURUMSAL AKIŞ MODÜLLERİ - INSTITUTIONAL
 * Kurumsal takas akışı, BofA net lot, Citibank oranı ve aracı kurum dağılımlarını tanımlar.
 */

export type BofANetLot = number;

export type CitibankRatio = number;

export interface BrokerDistribution {
  brokerName: string;
  netLot: number;
  avgCost: number;
  sharePct: number;
  side: 'BUYER' | 'SELLER';
}

export interface InstitutionalFlow {
  ticker: string;
  bofaNetLot: BofANetLot;
  citibankSharePct: CitibankRatio;
  pensionFundSharePct: number;
  topBuyers: BrokerDistribution[];
  topSellers: BrokerDistribution[];
  updatedAt: string;
}
