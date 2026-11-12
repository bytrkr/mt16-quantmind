// shared/types/macro.ts
/**
 * 4. DERİNLİK, TAKAS VE KURUMSAL AKIŞ MODÜLLERİ - MACRO
 * Makroekonomik göstergeler (Enflasyon, Politika Faizi, CDS) anlık görüntüsünü tanımlar.
 */

export interface MacroDataSnapshot {
  usdTry: number;
  eurTry: number;
  inflationPct: number;
  policyInterestRatePct: number;
  cds5Year: number;
  borsaIstanbulIndex: number;
  lastUpdated: string;
}
