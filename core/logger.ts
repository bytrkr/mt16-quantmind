// Pure Quant Terminal Decision Logger
export function logDecision(symbol: string, action: "PROCEED" | "VETO_HOLD", reason: string, details?: Record<string, any>): void {
  const timestamp = new Date().toISOString();
  console.log(`[QUANT_LOGGER ${timestamp}] ${symbol} -> ${action}: ${reason}`, details ? JSON.stringify(details) : '');
}
