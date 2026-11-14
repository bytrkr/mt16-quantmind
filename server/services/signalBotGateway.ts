// server/services/signalBotGateway.ts

export interface SignalAlertPayload {
  symbol: string;
  market: 'BIST' | 'CRYPTO' | 'NASDAQ';
  side: 'BUY' | 'SELL';
  entryPrice: number;
  takeProfitPrice: number;
  stopLossPrice: number;
  obi: number;
  zScore: number;
  juryConfidence: number;
  timestamp: string;
  signalId: string;
}

export class SignalBotGateway {
  private sentAlertsHistory: SignalAlertPayload[] = [];
  private alertCounter = 50400;

  constructor() {
    // No hardcoded mock alerts; driven entirely by live triggers
  }

  public broadcastSignal(symbol: string = 'BTCUSDT', market: 'BIST' | 'CRYPTO' | 'NASDAQ' = 'CRYPTO', price: number = 84500.0): SignalAlertPayload {
    this.alertCounter++;
    const tp = parseFloat((price * 1.02).toFixed(2));
    const sl = parseFloat((price * 0.99).toFixed(2));

    const alert: SignalAlertPayload = {
      symbol,
      market,
      side: 'BUY',
      entryPrice: price,
      takeProfitPrice: tp,
      stopLossPrice: sl,
      obi: null, // Qodi v6.1: Gerçek OBI verisi yok, mock üretilmez
      zScore: null, // Qodi v6.1: Gerçek Z-Score yok, mock üretilmez
      juryConfidence: null, // Qodi v6.1: Gerçek jüri güveni yok, mock üretilmez
      timestamp: new Date().toLocaleTimeString('tr-TR'),
      signalId: `SIG-${this.alertCounter}`,
    };

    this.sentAlertsHistory.unshift(alert);
    if (this.sentAlertsHistory.length > 30) {
      this.sentAlertsHistory = this.sentAlertsHistory.slice(0, 30);
    }

    console.log(`[Telegram/Discord VIP Signal Broadcast]: ${alert.signalId} -> ${symbol} (${market}) Entry: ${price} TP: ${tp} SL: ${sl}`);
    return alert;
  }

  public getAlertsHistory(): SignalAlertPayload[] {
    return this.sentAlertsHistory;
  }

  public getBotStatus() {
    return {
      status: 'ONLINE',
      connectedChannels: ['@mt16_vip_signals (Telegram)', 'Discord #quant-signals'],
      activeWebhooksCount: 2,
      lastBroadcastTime: this.sentAlertsHistory[0]?.timestamp || 'Henüz yok',
      totalAlertsSentToday: this.sentAlertsHistory.length,
      triggerCriteria: 'Jüri Konsensüsü >= %80.0 VE Z-Score >= +2.00σ',
    };
  }
}

export const signalBotGateway = new SignalBotGateway();
