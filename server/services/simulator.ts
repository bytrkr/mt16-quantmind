// server/services/simulator.ts
/**
 * MT16 QuantMind - Çoklu Borsa Simülatörü ve Emir Gerçekleştirme Motoru (TradingAgents & TorchTrade İlhamı)
 * - MultiExchangeSimulator (Binance, Bybit, OKX, BIST_SPOT)
 * - Borsaya Özel Komisyon (Maker/Taker) ve Kaldıraç Limitleri
 * - PortfolioState (Nakit, Marjin, Komisyonlar, Açık Pozisyonlar, Kapatılan İşlemler, PnL)
 * - Dinamik OCO & Trailing Stop-Loss
 */

export type ExchangeName = 'BINANCE' | 'BYBIT' | 'OKX' | 'BIST_SPOT';

export interface ExchangeConfig {
  name: ExchangeName;
  displayName: string;
  makerFeePct: number;
  takerFeePct: number;
  maxLeverage: number;
}

export const EXCHANGE_CONFIGS: Record<ExchangeName, ExchangeConfig> = {
  BINANCE: {
    name: 'BINANCE',
    displayName: 'Binance Futures / Spot',
    makerFeePct: 0.02,  // %0.02
    takerFeePct: 0.04,  // %0.04
    maxLeverage: 125
  },
  BYBIT: {
    name: 'BYBIT',
    displayName: 'Bybit Derivatives',
    makerFeePct: 0.02,  // %0.02
    takerFeePct: 0.055, // %0.055
    maxLeverage: 100
  },
  OKX: {
    name: 'OKX',
    displayName: 'OKX Perpetual / Spot',
    makerFeePct: 0.02,  // %0.02
    takerFeePct: 0.05,  // %0.05
    maxLeverage: 125
  },
  BIST_SPOT: {
    name: 'BIST_SPOT',
    displayName: 'Borsa İstanbul Spot / VIOP',
    makerFeePct: 0.05,  // %0.05
    takerFeePct: 0.05,  // %0.05
    maxLeverage: 2
  }
};

export interface Position {
  symbol: string;
  exchange: ExchangeName;
  side: 'BUY' | 'SELL';
  entryPrice: number;
  lots: number;
  leverage: number;
  marginRequired: number;
  feePaid: number;
  stopLoss: number;
  takeProfit: number;
  highestPriceSeen: number;
  trailingStopDistancePct: number; // örn %1.0
  timestamp: number;
}

export interface TradeRecord {
  id: string;
  symbol: string;
  exchange: ExchangeName;
  side: 'BUY' | 'SELL';
  entryPrice: number;
  exitPrice: number;
  lots: number;
  leverage: number;
  marginRequired: number;
  feePaid: number;
  pnl: number;
  pnlPct: number;
  status: 'TAKE_PROFIT' | 'STOP_LOSS' | 'TRAILING_STOP' | 'MANUAL_CLOSE';
  timestamp: number;
}

export interface OrderVerificationContext {
  symbol: string;
  isBullTrapRisk?: boolean;
  isPitViolated?: boolean;
  riskVerdict?: 'APPROVE' | 'VETO' | string;
  managerConfidence?: number;
}

export interface AuditTrailEntry {
  id: string;
  timestamp: number;
  action: string;
  symbol: string;
  status: 'APPROVED' | 'PERMISSION_DENIED';
  reason?: string;
  details?: Record<string, any>;
}

/**
 * Tool Permission Guardrails
 * 1. isBullTrapRisk === true -> REDDET
 * 2. PITGuard.isViolated === true -> REDDET
 * 3. RiskManagementAgent.verdict === 'VETO' -> REDDET
 * 4. PortfolioManagerAgent.confidence < 60 -> REDDET
 * Her engelleme "Permission Denied" olarak Audit Trail'e kaydedilir.
 */
export class PermissionGuard {
  private static auditTrail: AuditTrailEntry[] = [];

  public static getAuditTrail(): AuditTrailEntry[] {
    return [...this.auditTrail];
  }

  public static verifyOrder(context: OrderVerificationContext): { permitted: boolean; reason?: string } {
    const symbol = context.symbol || 'GENERIC';

    // 1. Boğa Tuzağı (Bull Trap) Kontrolü
    if (context.isBullTrapRisk === true) {
      const reason = `[Permission Denied: Bull Trap Risk Guard] Boğa Tuzağı (Bull Trap) riski tespit edildi. Emir reddedildi.`;
      this.recordAudit(symbol, 'ORDER_EXECUTION', 'PERMISSION_DENIED', reason, context);
      return { permitted: false, reason };
    }

    // 2. PIT Guard (Point-in-Time) İhlal Kontrolü
    if (context.isPitViolated === true) {
      const reason = `[Permission Denied: PIT Guard Violation] PIT Guard ihlali (Look-ahead bias / Gelecek veri sızıntısı saptandı). Emir reddedildi.`;
      this.recordAudit(symbol, 'ORDER_EXECUTION', 'PERMISSION_DENIED', reason, context);
      return { permitted: false, reason };
    }

    // 3. Risk Yönetimi Vetosu Kontrolü
    if (context.riskVerdict === 'VETO') {
      const reason = `[Permission Denied: Risk Yönetimi Vetosu] RiskManagementAgent emri VETO etti (VaR/CVaR risk sınırları aşıldı). Emir reddedildi.`;
      this.recordAudit(symbol, 'ORDER_EXECUTION', 'PERMISSION_DENIED', reason, context);
      return { permitted: false, reason };
    }

    // 4. Düşük Güven Skoru Kontrolü (Minimum %60)
    if (context.managerConfidence !== undefined && context.managerConfidence < 60) {
      const reason = `[Permission Denied: Düşük Güven Skoru] PortfolioManagerAgent güven skoru %60 sınırının altında (%${context.managerConfidence.toFixed(1)} < %60). Emir reddedildi.`;
      this.recordAudit(symbol, 'ORDER_EXECUTION', 'PERMISSION_DENIED', reason, context);
      return { permitted: false, reason };
    }

    this.recordAudit(symbol, 'ORDER_EXECUTION', 'APPROVED', 'Tüm güvenlik zırhları onaylandı.', context);
    return { permitted: true };
  }

  private static recordAudit(symbol: string, action: string, status: 'APPROVED' | 'PERMISSION_DENIED', reason: string, details: any) {
    this.auditTrail.unshift({
      id: `AUDIT-${Date.now()}-${this.auditTrail.length}`,
      timestamp: Date.now(),
      action,
      symbol,
      status,
      reason,
      details
    });
    if (this.auditTrail.length > 200) {
      this.auditTrail.pop();
    }
  }
}

export class MultiExchangeSimulator {
  private activeExchange: ExchangeName = 'BINANCE';
  private cash: number = 100000.0; // 100,000 TL / USD başlangıç serbest bakiyesi
  private initialCapital: number = 100000.0;
  private totalFeesPaid: number = 0.0;
  private positions: Map<string, Position> = new Map();
  private tradeHistory: TradeRecord[] = [];

  // BECERİ 1: Agent-Based Simulation (StockAgent İlhamı)
  private isAgentSimEnabled: boolean = false;
  private agentSentiments: Record<string, { bull: number, bear: number }> = {};
  private simulatedPrices: Record<string, number> = {};
  private simInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Örnek başlangıç pozisyonu (ASELS - Binance Spot/Futures)
    const entry = 358.50;
    const sl = 354.91;
    const distancePct = Number(((entry - sl) / entry * 100).toFixed(2));
    const margin = entry * 100;
    const fee = (entry * 100) * (EXCHANGE_CONFIGS.BINANCE.takerFeePct / 100);

    this.positions.set('ASELS', {
      symbol: 'ASELS',
      exchange: 'BINANCE',
      side: 'BUY',
      entryPrice: entry,
      lots: 100,
      leverage: 1,
      marginRequired: margin,
      feePaid: Number(fee.toFixed(2)),
      stopLoss: sl,
      takeProfit: 365.67,
      highestPriceSeen: entry,
      trailingStopDistancePct: distancePct > 0 ? distancePct : 1.0,
      timestamp: Date.now() - 3600000
    });

    // Varsayılan simüle fiyatlar (KÜRESEL VARLIKLAR)
    this.simulatedPrices['ASELS'] = entry;
    this.simulatedPrices['NVDA'] = 142.50; // NASDAQ
    this.simulatedPrices['BTC'] = 88450.0; // CRYPTO

    this.agentSentiments['ASELS'] = { bull: 0.5, bear: 0.5 };
    this.agentSentiments['NVDA'] = { bull: 0.65, bear: 0.35 };
    this.agentSentiments['BTC'] = { bull: 0.45, bear: 0.55 };
  }

  public toggleAgentSimulation(enabled: boolean) {
    this.isAgentSimEnabled = enabled;
    if (enabled) {
      this.startAgentSimLoop();
    } else {
      this.stopAgentSimLoop();
    }
    return { success: true, isAgentSimEnabled: this.isAgentSimEnabled };
  }

  private startAgentSimLoop() {
    if (this.simInterval) return;
    this.simInterval = setInterval(() => {
      this.runAgentMarketCycle();
    }, 2000); // 2 saniyede bir tık
  }

  private stopAgentSimLoop() {
    if (this.simInterval) {
      clearInterval(this.simInterval);
      this.simInterval = null;
    }
  }

  private runAgentMarketCycle() {
    if (!this.isAgentSimEnabled) return;

    for (const symbol in this.simulatedPrices) {
      const sentiment = this.agentSentiments[symbol] || { bull: 0.5, bear: 0.5 };
      
      // Sürü psikolojisi ve Manipülasyon simülasyonu
      // Boğa ve Ayı ajanları arasındaki "çekişme"
      const bullPressure = (sentiment.bull / 100) * sentiment.bull;
      const bearPressure = (sentiment.bear / 100) * sentiment.bear;
      
      const netPressure = bullPressure - bearPressure;
      const priceChange = this.simulatedPrices[symbol] * (netPressure * 0.005); // %0.5 max hareket
      
      this.simulatedPrices[symbol] += priceChange;

      // Sentiment sürüklenmesi (Herd Psychology)
      if (netPressure > 0.1) {
        sentiment.bull = Math.min(1.0, sentiment.bull + 0.02);
        sentiment.bear = Math.max(0.0, sentiment.bear - 0.01);
      } else if (netPressure < -0.1) {
        sentiment.bear = Math.min(1.0, sentiment.bear + 0.02);
        sentiment.bull = Math.max(0.0, sentiment.bull - 0.01);
      }

      this.agentSentiments[symbol] = sentiment;
    }

    // Pozisyonları simüle fiyatlar ile güncelle
    this.simulateTick(this.simulatedPrices);
  }

  public setExchange(exchangeName: ExchangeName) {
    if (EXCHANGE_CONFIGS[exchangeName]) {
      this.activeExchange = exchangeName;
      return { success: true, activeExchange: this.activeExchange, config: EXCHANGE_CONFIGS[exchangeName] };
    }
    return { success: false, message: `Geçersiz borsa adı: ${exchangeName}` };
  }

  public getActiveExchangeConfig(): ExchangeConfig {
    return EXCHANGE_CONFIGS[this.activeExchange];
  }

  public getState() {
    let openPositionsMargin = 0;
    let openPositionsValue = 0;

    for (const [_, pos] of this.positions.entries()) {
      openPositionsMargin += pos.marginRequired;
      openPositionsValue += pos.lots * pos.entryPrice;
    }

    const totalPortfolioValue = this.cash + openPositionsMargin;
    const totalPnl = totalPortfolioValue - this.initialCapital;
    const totalPnlPct = (totalPnl / this.initialCapital) * 100;

    return {
      activeExchange: this.activeExchange,
      exchangeConfig: EXCHANGE_CONFIGS[this.activeExchange],
      availableExchanges: Object.values(EXCHANGE_CONFIGS),
      cash: Number(this.cash.toFixed(2)),
      initialCapital: this.initialCapital,
      totalFeesPaid: Number(this.totalFeesPaid.toFixed(2)),
      openPositionsMargin: Number(openPositionsMargin.toFixed(2)),
      openPositionsValue: Number(openPositionsValue.toFixed(2)),
      totalPortfolioValue: Number(totalPortfolioValue.toFixed(2)),
      totalPnl: Number(totalPnl.toFixed(2)),
      totalPnlPct: Number(totalPnlPct.toFixed(2)),
      positionsCount: this.positions.size,
      positions: Array.from(this.positions.values()),
      tradeHistory: this.tradeHistory,
      agentSim: {
        enabled: this.isAgentSimEnabled,
        simulatedPrices: this.simulatedPrices,
        agentSentiments: this.agentSentiments,
        correlations: this.calculateAssetCorrelations()
      }
    };
  }

  /**
   * KÜRESEL KORELASYON ANALİZİ
   * Varlıklar arasındaki (BIST, NASDAQ, CRYPTO) anlık fiyat hareket benzerliğini hesaplar.
   */
  private calculateAssetCorrelations() {
    const assets = Object.keys(this.simulatedPrices);
    const matrix: Record<string, Record<string, number>> = {};

    for (const a of assets) {
      matrix[a] = {};
      for (const b of assets) {
        if (a === b) {
          matrix[a][b] = 1.0;
        } else {
          // Mock korelasyon: Gerçek sistemde fiyat geçmişi üzerinden hesaplanır.
          // Burada simülasyon gereği dinamik bir değer dönüyoruz.
          const sentimentA = this.agentSentiments[a];
          const sentimentB = this.agentSentiments[b];
          const corr = (sentimentA.bull * sentimentB.bull + sentimentA.bear * sentimentB.bear) / 1.5;
          matrix[a][b] = Number(Math.min(0.99, Math.max(-0.99, corr)).toFixed(2));
        }
      }
    }
    return matrix;
  }

  public executeOrder(order: {
    symbol: string;
    side: 'BUY' | 'SELL';
    price: number;
    lots: number;
    leverage?: number;
    stopLoss: number;
    takeProfit: number;
    exchange?: ExchangeName;
    isBullTrapRisk?: boolean;
    isPitViolated?: boolean;
    riskVerdict?: string;
    managerConfidence?: number;
  }) {
    const symbol = order.symbol.toUpperCase();

    // 0. Tool Permission Guardrails (Bull Trap, PIT Guard, Risk Veto, Düşük Güven Skoru)
    if (order.side === 'BUY') {
      const guardCheck = PermissionGuard.verifyOrder({
        symbol,
        isBullTrapRisk: order.isBullTrapRisk,
        isPitViolated: order.isPitViolated,
        riskVerdict: order.riskVerdict,
        managerConfidence: order.managerConfidence
      });

      if (!guardCheck.permitted) {
        return {
          success: false,
          message: guardCheck.reason || 'Permission Denied: Güvenlik filtreleri emri reddetti.'
        };
      }
    }

    const exName = order.exchange && EXCHANGE_CONFIGS[order.exchange] ? order.exchange : this.activeExchange;
    const config = EXCHANGE_CONFIGS[exName];

    const requestedLev = order.leverage && order.leverage >= 1 ? order.leverage : 1;

    // 1. Borsa Kaldıraç Sınırı Kontrolü
    if (requestedLev > config.maxLeverage) {
      return {
        success: false,
        message: `Kaldıraç Sınırı Aşıldı. ${config.displayName} borsa üst sınırı ${config.maxLeverage}x iken talep edilen ${requestedLev}x.`
      };
    }

    const totalPositionCost = order.price * order.lots;
    const marginRequired = totalPositionCost / requestedLev;
    const feePaid = Number((totalPositionCost * (config.takerFeePct / 100)).toFixed(2));
    const totalMarginNeeded = marginRequired + feePaid;

    if (order.side === 'BUY') {
      if (this.cash < totalMarginNeeded) {
        return {
          success: false,
          message: `Yetersiz Bakiye / Marjin. Gerekli Tutar (Marjin + Komisyon): ₺${totalMarginNeeded.toFixed(2)}, Kullanılabilir Nakit: ₺${this.cash.toFixed(2)} (${config.displayName} - ${requestedLev}x)`
        };
      }

      // Marjini ve Komisyonu kilitle
      this.cash -= totalMarginNeeded;
      this.totalFeesPaid += feePaid;

      const stopDist = Number(((order.price - order.stopLoss) / order.price * 100).toFixed(2));
      const trailingStopDistancePct = stopDist > 0 ? stopDist : 1.0;

      this.positions.set(symbol, {
        symbol,
        exchange: exName,
        side: 'BUY',
        entryPrice: order.price,
        lots: order.lots,
        leverage: requestedLev,
        marginRequired: Number(marginRequired.toFixed(2)),
        feePaid,
        stopLoss: order.stopLoss,
        takeProfit: order.takeProfit,
        highestPriceSeen: order.price,
        trailingStopDistancePct,
        timestamp: Date.now()
      });

      return {
        success: true,
        message: `#${symbol} için ${config.displayName} üzerinde ${requestedLev}x kaldıraç ile ${order.lots} lot alım açıldı (Marjin: ₺${marginRequired.toFixed(2)}, Komisyon: ₺${feePaid.toFixed(2)}).`
      };
    } else {
      const pos = this.positions.get(symbol);
      if (!pos) {
        return { success: false, message: `#${symbol} için kapatılacak açık pozisyon bulunamadı.` };
      }

      const closeFee = Number((order.price * pos.lots * (config.takerFeePct / 100)).toFixed(2));
      const totalFeesForTrade = pos.feePaid + closeFee;
      const rawPnl = (order.price - pos.entryPrice) * pos.lots - closeFee;
      const pnlPct = (rawPnl / pos.marginRequired) * 100;
      
      this.cash += pos.marginRequired + rawPnl;
      this.totalFeesPaid += closeFee;

      this.tradeHistory.unshift({
        id: `TRD-${Date.now()}`,
        symbol,
        exchange: pos.exchange,
        side: pos.side,
        entryPrice: pos.entryPrice,
        exitPrice: order.price,
        lots: pos.lots,
        leverage: pos.leverage,
        marginRequired: pos.marginRequired,
        feePaid: totalFeesForTrade,
        pnl: Number(rawPnl.toFixed(2)),
        pnlPct: Number(pnlPct.toFixed(2)),
        status: 'MANUAL_CLOSE',
        timestamp: Date.now()
      });

      this.positions.delete(symbol);
      return {
        success: true,
        message: `#${symbol} pozisyonu ${config.displayName} üzerinde kapatıldı. Net PnL (Komisyon Düşülmüş): ₺${rawPnl.toFixed(2)} (%${pnlPct.toFixed(2)})`
      };
    }
  }

  /**
   * TorchTrade İlhamı - Dinamik OCO / Trailing Stop-Loss Güncelleme ve Simülasyon Tıkı
   */
  public simulateTick(currentPrices: Record<string, number>) {
    for (const [symbol, pos] of this.positions.entries()) {
      const currentPrice = currentPrices[symbol];
      if (!currentPrice || currentPrice <= 0) continue;

      const config = EXCHANGE_CONFIGS[pos.exchange] || EXCHANGE_CONFIGS.BINANCE;

      if (pos.side === 'BUY') {
        // 1. Dinamik Trailing Stop Güncellemesi
        if (currentPrice > pos.highestPriceSeen) {
          pos.highestPriceSeen = currentPrice;
          const dynamicStopLoss = Number((pos.highestPriceSeen * (1 - pos.trailingStopDistancePct / 100)).toFixed(2));
          if (dynamicStopLoss > pos.stopLoss) {
            pos.stopLoss = dynamicStopLoss;
          }
        }

        // 2. Tetiklenme Kontrolleri
        if (currentPrice <= pos.stopLoss) {
          const closeFee = Number((pos.stopLoss * pos.lots * (config.takerFeePct / 100)).toFixed(2));
          const rawPnl = (pos.stopLoss - pos.entryPrice) * pos.lots - closeFee;
          const pnlPct = (rawPnl / pos.marginRequired) * 100;
          
          this.cash += pos.marginRequired + rawPnl;
          this.totalFeesPaid += closeFee;

          const isTrail = pos.highestPriceSeen > pos.entryPrice;

          this.tradeHistory.unshift({
            id: `SL-${Date.now()}`,
            symbol,
            exchange: pos.exchange,
            side: pos.side,
            entryPrice: pos.entryPrice,
            exitPrice: pos.stopLoss,
            lots: pos.lots,
            leverage: pos.leverage,
            marginRequired: pos.marginRequired,
            feePaid: pos.feePaid + closeFee,
            pnl: Number(rawPnl.toFixed(2)),
            pnlPct: Number(pnlPct.toFixed(2)),
            status: isTrail ? 'TRAILING_STOP' : 'STOP_LOSS',
            timestamp: Date.now()
          });

          this.positions.delete(symbol);
        } else if (currentPrice >= pos.takeProfit) {
          const closeFee = Number((pos.takeProfit * pos.lots * (config.takerFeePct / 100)).toFixed(2));
          const rawPnl = (pos.takeProfit - pos.entryPrice) * pos.lots - closeFee;
          const pnlPct = (rawPnl / pos.marginRequired) * 100;

          this.cash += pos.marginRequired + rawPnl;
          this.totalFeesPaid += closeFee;

          this.tradeHistory.unshift({
            id: `TP-${Date.now()}`,
            symbol,
            exchange: pos.exchange,
            side: pos.side,
            entryPrice: pos.entryPrice,
            exitPrice: pos.takeProfit,
            lots: pos.lots,
            leverage: pos.leverage,
            marginRequired: pos.marginRequired,
            feePaid: pos.feePaid + closeFee,
            pnl: Number(rawPnl.toFixed(2)),
            pnlPct: Number(pnlPct.toFixed(2)),
            status: 'TAKE_PROFIT',
            timestamp: Date.now()
          });

          this.positions.delete(symbol);
        }
      }
    }
  }

  public getAuditTrail() {
    return PermissionGuard.getAuditTrail();
  }
}

// Global Singleton Instance
export const simulatedExchange = new MultiExchangeSimulator();
export { MultiExchangeSimulator as SimulatedExchange };
export const SimulatedExchangeInstance = simulatedExchange;
