// server/services/orderEmulator.service.ts
/**
 * MT16 QUANT MIND — BIST İçin İstemci Taraflı Emir Emülatörü (Order Emulator - Nautilus Execution Engine)
 * -----------------------------------------------------------------------------------------------------
 * Borsa İstanbul (BIST) pay piyasasında yerel borsa OCO (One-Cancels-the-Other) ve
 * dinamik trailing stop desteği bulunmadığından; Nautilus mimarisinde olduğu gibi
 * istemci/sunucu taraflı emülatör olarak çalışır:
 * 1. Trailing Stop Tracker: En yüksek fiyatı izler, tepe noktasından trailing_pct düştüğünde piyasa emri tetikler.
 * 2. Sentetik OCO: TP (Kâr Al) veya SL (Zarar Durdur) seviyelerinden biri tetiklendiğinde diğerini derhal iptal eder.
 * 3. Her olay persistenceService üzerinden kaydedilir.
 */

import { persistenceService, PersistentTradeEvent } from './persistence.service.js';

export interface EmulatedOrder {
  orderId: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  lots: number;
  entryPrice: number;
  currentPeakPrice: number;
  trailingStopPct: number;
  stopLossPrice: number;
  takeProfitPrice: number;
  status: 'ACTIVE' | 'FILLED_TP' | 'FILLED_SL' | 'FILLED_TRAILING' | 'CANCELLED';
  createdAt: string;
  updatedAt: string;
}

export class OrderEmulatorService {
  private activeOrders: Map<string, EmulatedOrder> = new Map();
  private orderCounter = 5000;

  /**
   * Yeni bir sentetik OCO / Trailing Stop emri oluşturur.
   */
  public createTrailingOcoOrder(
    symbol: string,
    lots: number,
    entryPrice: number,
    trailingStopPct: number = 2.5,
    takeProfitPct: number = 5.0,
    stopLossPct: number = 2.5
  ): EmulatedOrder {
    this.orderCounter++;
    const orderId = `EMU-ORD-${Date.now()}-${this.orderCounter}`;
    const cleanSym = (symbol || 'THYAO').toUpperCase().trim();

    const stopLossPrice = Number((entryPrice * (1 - stopLossPct / 100)).toFixed(2));
    const takeProfitPrice = Number((entryPrice * (1 + takeProfitPct / 100)).toFixed(2));

    const order: EmulatedOrder = {
      orderId,
      symbol: cleanSym,
      side: 'BUY',
      lots: Math.max(1, lots),
      entryPrice,
      currentPeakPrice: entryPrice,
      trailingStopPct,
      stopLossPrice,
      takeProfitPrice,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.activeOrders.set(orderId, order);

    // Persistence Store'a yaz
    persistenceService.recordEvent(
      'ORDER_SUBMITTED',
      cleanSym,
      'BIST',
      'BUY',
      entryPrice,
      lots,
      { orderId, stopLossPrice, takeProfitPrice, trailingStopPct }
    );

    return order;
  }

  /**
   * Gelen anlık fiyat tikinde emrin trailing stop veya OCO kurallarını işletir.
   */
  public updatePriceTick(symbol: string, currentPrice: number): EmulatedOrder[] {
    const cleanSym = symbol.toUpperCase().trim();
    const updated: EmulatedOrder[] = [];

    for (const [orderId, order] of this.activeOrders.entries()) {
      if (order.symbol !== cleanSym || order.status !== 'ACTIVE') continue;

      order.updatedAt = new Date().toISOString();

      // Tepe fiyat güncellemesi
      if (currentPrice > order.currentPeakPrice) {
        order.currentPeakPrice = currentPrice;
      }

      // 1. Kâr Al (Take Profit) Tetiklendi mi?
      if (currentPrice >= order.takeProfitPrice) {
        order.status = 'FILLED_TP';
        this.activeOrders.delete(orderId);
        persistenceService.recordEvent('ORDER_FILLED', cleanSym, 'BIST', 'SELL', currentPrice, order.lots, { orderId, reason: 'TAKE_PROFIT' });
        updated.push(order);
        continue;
      }

      // 2. Sert Zarar Durdur (Hard Stop Loss) Tetiklendi mi?
      if (currentPrice <= order.stopLossPrice) {
        order.status = 'FILLED_SL';
        this.activeOrders.delete(orderId);
        persistenceService.recordEvent('ORDER_FILLED', cleanSym, 'BIST', 'SELL', currentPrice, order.lots, { orderId, reason: 'HARD_STOP_LOSS' });
        updated.push(order);
        continue;
      }

      // 3. İstemci Taraflı Trailing Stop (Takip Eden Zarar Durdur)
      const trailingThreshold = order.currentPeakPrice * (1 - order.trailingStopPct / 100);
      if (currentPrice <= trailingThreshold && currentPrice < order.entryPrice) {
        order.status = 'FILLED_TRAILING';
        this.activeOrders.delete(orderId);
        persistenceService.recordEvent('ORDER_FILLED', cleanSym, 'BIST', 'SELL', currentPrice, order.lots, { orderId, reason: 'TRAILING_STOP' });
        updated.push(order);
        continue;
      }
    }

    return updated;
  }

  public getActiveOrders(): EmulatedOrder[] {
    return Array.from(this.activeOrders.values());
  }
}

export const orderEmulatorService = new OrderEmulatorService();
