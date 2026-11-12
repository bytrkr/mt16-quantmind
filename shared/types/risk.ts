// shared/types/risk.ts
/**
 * 5. RİSK, PORTFÖY VE OTONOM MOTOR MODÜLLERİ - RISK
 * Pozisyon risk konfigürasyonları, Kelly çarpanı, kayma (slippage) ve korelasyon muhafızlarını tanımlar.
 */

export type KellyMultiplier = number;

export type SlippageBps = number;

export type PortfolioGuardCorr = number;

export interface PositionRiskConfig {
  maxPositionSizePct: number;
  maxPortfolioDrawdownPct: number;
  kellyMultiplier: KellyMultiplier;
  maxSlippageBps: SlippageBps;
  correlationLimit: PortfolioGuardCorr;
}
