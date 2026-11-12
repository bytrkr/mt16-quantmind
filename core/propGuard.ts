// Pure Risk & Portfolio Exposure Guard
export interface PropGuardConfig {
  maxPositionPct: number; // e.g. 20%
  maxSectorPct: number;   // e.g. 35%
  maxDailyLossPct: number; // e.g. 2.0%
}

export interface PropGuardResult {
  approved: boolean;
  action: "PROCEED" | "VETO_HOLD";
  reason: string;
}

export function evaluateRiskGuard(
  positionPct: number,
  sectorPct: number,
  dailyLossPct: number,
  config: PropGuardConfig = { maxPositionPct: 20.0, maxSectorPct: 35.0, maxDailyLossPct: 2.0 }
): PropGuardResult {
  if (dailyLossPct >= config.maxDailyLossPct) {
    return {
      approved: false,
      action: "VETO_HOLD",
      reason: `Günlük Azami Zarar Limiti Aşıldı: %${dailyLossPct.toFixed(2)} >= %${config.maxDailyLossPct.toFixed(2)}`
    };
  }

  if (positionPct > config.maxPositionPct) {
    return {
      approved: false,
      action: "VETO_HOLD",
      reason: `Azami Pozisyon Payı Aşıldı: %${positionPct.toFixed(2)} > %${config.maxPositionPct.toFixed(2)}`
    };
  }

  if (sectorPct > config.maxSectorPct) {
    return {
      approved: false,
      action: "VETO_HOLD",
      reason: `Azami Sektör Payı Aşıldı: %${sectorPct.toFixed(2)} > %${config.maxSectorPct.toFixed(2)}`
    };
  }

  return {
    approved: true,
    action: "PROCEED",
    reason: `Risk Guard Onayladı: Pozisyon %${positionPct.toFixed(2)}, Sektör %${sectorPct.toFixed(2)}`
  };
}
