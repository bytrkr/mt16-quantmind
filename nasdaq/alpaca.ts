// Alpaca Paper Trading API Reader & Executor for Nasdaq Stocks
export interface AlpacaStatus {
  hasKey: boolean;
  paperTradingActive: boolean;
  statusText: string;
}

export function checkAlpacaStatus(): AlpacaStatus {
  const apiKey = process.env.ALPACA_API_KEY;
  const secretKey = process.env.ALPACA_SECRET_KEY;
  const isPaper = process.env.ALPACA_PAPER === 'true';

  const hasKey = Boolean(apiKey && secretKey && apiKey.trim().length > 5);

  return {
    hasKey,
    paperTradingActive: isPaper,
    statusText: hasKey ? "ALPACA PAPER TRADING ACTIVE (READ-ONLY + PAPER EMİR)" : "ALPACA API ANAHTARI YOK"
  };
}
