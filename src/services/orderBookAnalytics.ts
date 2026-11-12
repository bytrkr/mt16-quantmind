// src/services/orderBookAnalytics.ts
/**
 * MT16 L2 Bookmap & Tahta Analiz Servisi (OrderBookAnalytics)
 * L2 emir defterindeki iptal/silme oranını (order_cancel_rate), kademe duvar erime süresini ve spoofing riskini hesaplar.
 */

export interface OrderBookMetrics {
  wallLot?: number | null;
  wallPrice?: number | null;
  burnRatePerMin?: number | null;
  orderCancelCount?: number | null;
  totalOrderCount?: number | null;
  bidDepthTotal?: number | null;
  askDepthTotal?: number | null;
  obi?: number | null;
  price?: number | null;
  midPrice?: number | null;
  lastPrice?: number | null;
}

export interface OrderBookAnalysisResult {
  cancelRatePct: number;
  orderCancelRatePct: number;
  estimatedMeltMinutes: number;
  wallMeltTimeMin: number;
  spoofingRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  isSpoofingDetected: boolean;
  isSpoofingRisk: boolean;
  formattedMeltTime: string;
  formattedSummary: string;
  obi: number;
}

export class OrderBookAnalytics {
  /**
   * L2 derinlik metriklerini ve iptal dinamiklerini analiz eder.
   */
  public static analyzeBook(book: any): OrderBookAnalysisResult | null {
    // NULL GUARD - EN BAŞA EKLE
    if (!book || typeof book !== 'object') {
      return null;
    }
    const price = book.price ?? book.midPrice ?? book.lastPrice ?? book.wallPrice;
    if (typeof price !== 'number' || isNaN(price)) {
      // Qodi: null ise VERİ YOK, crash yok
      return null;
    }

    const totalOrders = typeof book.totalOrderCount === 'number' && book.totalOrderCount > 0 ? book.totalOrderCount : 1;
    const cancelCount = typeof book.orderCancelCount === 'number' && !isNaN(book.orderCancelCount) ? book.orderCancelCount : 0;
    const cancelRatePct = Number(((cancelCount / totalOrders) * 100).toFixed(2));

    // Kademe Duvarı Erime Süresi (Dakika cinsinden)
    const wallLot = typeof book.wallLot === 'number' && !isNaN(book.wallLot) ? book.wallLot : 0;
    const burnRate = typeof book.burnRatePerMin === 'number' && book.burnRatePerMin > 0 ? book.burnRatePerMin : 500;
    const rawMeltTime = wallLot > 0 ? wallLot / burnRate : 0;
    const estimatedMeltMinutes = Math.max(1, Math.round(rawMeltTime));
    const formattedMeltTime = `${estimatedMeltMinutes} dk`;

    // Spoofing Riski Değerlendirmesi:
    const bidDepth = typeof book.bidDepthTotal === 'number' && !isNaN(book.bidDepthTotal) ? book.bidDepthTotal : 0;
    const askDepth = typeof book.askDepthTotal === 'number' && !isNaN(book.askDepthTotal) ? book.askDepthTotal : 0;
    const totalDepth = Math.max(bidDepth + askDepth, 1);
    const wallRatio = wallLot / totalDepth;

    let spoofingRisk: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
    let isSpoofingDetected = false;

    if (cancelRatePct > 45 || (cancelRatePct > 30 && wallRatio > 0.35)) {
      spoofingRisk = 'HIGH';
      isSpoofingDetected = true;
    } else if (cancelRatePct > 20 || wallRatio > 0.20) {
      spoofingRisk = 'MEDIUM';
    }

    // OBI hesapla veya sağlanan OBI'yi kullan: (Bid - Ask) / (Bid + Ask)
    const obi = typeof book.obi === 'number' && !isNaN(book.obi)
      ? book.obi
      : Number(((bidDepth - askDepth) / totalDepth).toFixed(2));

    const safeWallLot = typeof book.wallLot === 'number' && !isNaN(book.wallLot) ? `${book.wallLot.toLocaleString('tr-TR')} lot` : 'VERİ YOK';
    const safeWallPrice = typeof book.wallPrice === 'number' && !isNaN(book.wallPrice)
      ? `₺${book.wallPrice.toFixed(2)}`
      : (typeof price === 'number' && !isNaN(price) ? `₺${price.toFixed(2)}` : 'VERİ YOK');

    const formattedSummary = `İptal Oranı: %${cancelRatePct.toFixed(1)} | Duvar: ${safeWallLot} @ ${safeWallPrice} | Erime: ${formattedMeltTime} | Spoofing: ${spoofingRisk}`;

    return {
      cancelRatePct,
      orderCancelRatePct: cancelRatePct,
      estimatedMeltMinutes,
      wallMeltTimeMin: estimatedMeltMinutes,
      spoofingRisk,
      isSpoofingDetected,
      isSpoofingRisk: isSpoofingDetected,
      formattedMeltTime,
      formattedSummary,
      obi,
    };
  }

  public static getSpread(book: any): string | null {
    if (!book || typeof book !== 'object') return null;
    const bid = book.bid ?? book.bestBid;
    const ask = book.ask ?? book.bestAsk;
    if (typeof bid !== 'number' || typeof ask !== 'number' || isNaN(bid) || isNaN(ask)) {
      return null;
    }
    return (ask - bid).toFixed(2);
  }
}
