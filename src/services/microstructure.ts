// src/services/microstructure.ts
/**
 * MT16 Kuant Terminali - L2 Mikroyapı Motoru
 * Order Book Imbalance (OBI), Iceberg (Gizli Lot) ve Spoofing (Sahte Emir) tespit motoru.
 * Citadel, Renaissance ve Bookmap mikroyapı matematiğine dayalı BIST/Global uyumlu mimari.
 */

export interface OrderBookLevel {
  price: number;
  orders: number;
  volume: number;
}

export interface DepthSnapshot {
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  timestamp: number;
}

export interface MicrostructureMetrics {
  obi: number | null; // Order Book Imbalance (-1.0 to +1.0)
  spoofingRisk: number | null; // 0 to 100
  icebergDetected: boolean;
  icebergSide: 'BID' | 'ASK' | 'NONE';
  executionAnomalyScore: number | null;
  bidDepthTotal: number | null;
  askDepthTotal: number | null;
  spread: number | null;
  spreadPct: number | null;
  topWallPrice: number | null;
  topWallVolume: number | null;
  rapidCancelRate: number | null; // 0-100%
}

export class MicrostructureEngine {
  private depthHistory: DepthSnapshot[] = [];
  private readonly MAX_HISTORY = 50;

  /**
   * Yeni bir derinlik anlık görüntüsünü geçmişe ekler ve mikroyapı metriklerini hesaplar.
   */
  public analyzeDepth(snapshot: DepthSnapshot): MicrostructureMetrics {
    // 1. Snapshot geçmişini güncelle
    this.depthHistory.push(snapshot);
    if (this.depthHistory.length > this.MAX_HISTORY) {
      this.depthHistory.shift();
    }

    const bids = snapshot.bids || [];
    const asks = snapshot.asks || [];

    // Derinlik toplam hacimleri
    const totalBidVol = bids.reduce((acc, curr) => acc + (curr.volume !== undefined && curr.volume !== null ? curr.volume : 0), 0);
    const totalAskVol = asks.reduce((acc, curr) => acc + (curr.volume !== undefined && curr.volume !== null ? curr.volume : 0), 0);
    const combinedVol = totalBidVol + totalAskVol;

    // 2. Order Book Imbalance (OBI) [-1.0 ile +1.0 arası]
    // OBI = (TotalBid - TotalAsk) / (TotalBid + TotalAsk)
    let obi: number | null = null;
    if (combinedVol > 0) {
      obi = (totalBidVol - totalAskVol) / combinedVol;
      obi = Math.max(-1, Math.min(1, obi));
    }

    // Spread hesabı
    const bestBid = bids.length > 0 ? Math.max(...bids.map(b => b.price)) : null;
    const bestAsk = asks.length > 0 ? Math.min(...asks.map(a => a.price)) : null;
    const spread = (bestAsk !== null && bestBid !== null) ? Math.max(0, bestAsk - bestBid) : null;
    const midPrice = (bestBid !== null && bestAsk !== null) ? (bestBid + bestAsk) / 2 : (bestBid || bestAsk || null);
    const spreadPct = (midPrice !== null && spread !== null) ? (spread / midPrice) * 100 : null;

    // En kalın direnç/destek duvarı
    let topWallPrice: number | null = null;
    let topWallVolume: number | null = null;
    [...bids, ...asks].forEach(lvl => {
      if (topWallVolume === null || lvl.volume > topWallVolume) {
        topWallVolume = lvl.volume;
        topWallPrice = lvl.price;
      }
    });

    // 3. Spoofing Risk Tespiti (0 - 100)
    // Ani devasa emir eklenip ardından piyasa işlemi gerçekleşmeden hızla silinmesi
    let spoofingRisk: number | null = null;
    let rapidCancelCount = 0;

    if (this.depthHistory.length >= 3) {
      spoofingRisk = 0;
      const prevSnap = this.depthHistory[this.depthHistory.length - 2];
      const avgLevelVol = combinedVol / Math.max(1, bids.length + asks.length);

      // Önceki adımda ortalamanın 3 katı olan ve şimdi aniden ortadan kaybolan kademeleri tara
      for (const prevLvl of [...prevSnap.bids, ...prevSnap.asks]) {
        if (prevLvl.volume >= avgLevelVol * 2.5) {
          const stillExists = [...bids, ...asks].some(
            curLvl => Math.abs(curLvl.price - prevLvl.price) < 0.001 && curLvl.volume >= prevLvl.volume * 0.4
          );
          if (!stillExists) {
            rapidCancelCount++;
          }
        }
      }

      spoofingRisk = Math.min(100, rapidCancelCount * 28 + (spreadPct !== null && spreadPct > 1.2 ? 20 : 0));
    }

    // 4. Iceberg (Gizli Lot) Tespiti
    // Az sayıda görünen emir (orders <= 2) olmasına rağmen anormal yüksek hacim erimesi veya sürekli yenilenmesi
    let icebergDetected = false;
    let icebergSide: 'BID' | 'ASK' | 'NONE' = 'NONE';

    for (const b of bids.slice(0, 3)) {
      if (b.volume > 0 && b.orders > 0) {
        const volPerOrder = b.volume / b.orders;
        const avgVol = totalBidVol / Math.max(1, bids.length);
        if (volPerOrder > avgVol * 2.2 && b.orders <= 3) {
          icebergDetected = true;
          icebergSide = 'BID';
          break;
        }
      }
    }

    if (!icebergDetected) {
      for (const a of asks.slice(0, 3)) {
        if (a.volume > 0 && a.orders > 0) {
          const volPerOrder = a.volume / a.orders;
          const avgVol = totalAskVol / Math.max(1, asks.length);
          if (volPerOrder > avgVol * 2.2 && a.orders <= 3) {
            icebergDetected = true;
            icebergSide = 'ASK';
            break;
          }
        }
      }
    }

    // 5. Execution Anomaly Score (0 - 100)
    // OBI dengesizliğinin büyüklüğü, spoofing riski ve iceberg mevcudiyetinin bileşkesi
    let executionAnomalyScore: number | null = null;
    if (obi !== null || spoofingRisk !== null) {
      const obiAbs = obi !== null ? Math.abs(obi) : 0;
      executionAnomalyScore = (obiAbs * 45) + ((spoofingRisk ? spoofingRisk : 0) * 0.35) + (icebergDetected ? 20 : 0);
      executionAnomalyScore = Math.min(100, Math.max(0, Math.round(executionAnomalyScore)));
    }

    const rapidCancelRate = Math.min(100, Math.round((rapidCancelCount / Math.max(1, bids.length + asks.length)) * 100));

    return {
      obi: obi !== null ? Number(obi.toFixed(4)) : null,
      spoofingRisk: spoofingRisk !== null ? Math.round(spoofingRisk) : null,
      icebergDetected,
      icebergSide,
      executionAnomalyScore,
      bidDepthTotal: totalBidVol,
      askDepthTotal: totalAskVol,
      spread: spread !== null ? Number(spread.toFixed(4)) : null,
      spreadPct: spreadPct !== null ? Number(spreadPct.toFixed(3)) : null,
      topWallPrice,
      topWallVolume,
      rapidCancelRate
    };
  }

  /**
   * Statik yardımcı yöntem: Snapshot oluşturucu
   */
  public static createSyntheticSnapshot(basePrice: number, spreadFactor: number = 0.002): DepthSnapshot {
    const bids: OrderBookLevel[] = [];
    const asks: OrderBookLevel[] = [];

    for (let i = 1; i <= 10; i++) {
      const bidPrice = Number((basePrice * (1 - spreadFactor * i)).toFixed(2));
      const askPrice = Number((basePrice * (1 + spreadFactor * i)).toFixed(2));
      
      const bidVol = Math.round(25000 * (1 + Math.sin(i * 0.8) * 0.5) * (11 - i));
      const askVol = Math.round(22000 * (1 + Math.cos(i * 0.7) * 0.5) * (11 - i));

      bids.push({ price: bidPrice, orders: Math.max(1, Math.round(bidVol / 4500)), volume: bidVol });
      asks.push({ price: askPrice, orders: Math.max(1, Math.round(askVol / 4200)), volume: askVol });
    }

    return {
      bids,
      asks,
      timestamp: Date.now()
    };
  }
}

export const microstructureEngine = new MicrostructureEngine();
