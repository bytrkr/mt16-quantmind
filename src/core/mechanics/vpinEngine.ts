// src/core/mechanics/vpinEngine.ts
/**
 * MT16 QUANT MIND — VPIN (Volume-Synchronized Probability of Toxicity) Toksik Akış Motoru
 * --------------------------------------------------------------------------------------
 * QODI ANAYASASI v6.1 KESİN KURALLARI:
 * 1. Fallback ve rasgele değer üreticileri kesinlikle yasaktır.
 * 2. Geçersiz veride return null + logDataIssue() + UI "VERİ YOK".
 * 3. Hata fırlatma (exception raising) yasaktır, tüm fonksiyonlar güvenli sonuç döner.
 * 4. toFixed/toLocaleString öncesi typeof === 'number' && !isNaN() kontrolü zorunludur.
 * 
 * VPIN MANTIĞI (Easley et al.):
 * - İşlem akışını eşit hacimli kovalara (Volume Buckets, V) böler.
 * - Her kovada alıcı hacmi (V_buy) ve satıcı hacmi (V_sell) hesaplanır.
 * - VPIN = sum(|V_buy - V_sell|) / (N * V)
 * - Eğer VPIN > 0.35 ise toksik akış (informed trading / kurumsal dağıtım) tespitiyle VETO_HOLD üretilir.
 */

export interface TradeTick {
  price: number;
  volume: number;
  timestamp?: string;
  side?: 'BUY' | 'SELL' | 'UNKNOWN';
}

export interface VpinResult {
  symbol: string;
  vpinScore: number | null;
  toxicityLevel: 'SAFE' | 'ELEVATED' | 'TOXIC';
  isToxic: boolean;
  action: 'PROCEED' | 'VETO_HOLD';
  reason: string;
  bucketSize: number;
  analyzedBuckets: number;
}

function logDataIssue(module: string, symbol: string, field: string, reason: string): void {
  try {
    const payload = {
      timestamp: new Date().toISOString(),
      module,
      symbol: (symbol || 'UNKNOWN').toUpperCase().trim(),
      field,
      reason,
    };
    if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
      window.fetch('/api/audit-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(() => {});
    } else {
      console.warn(`[DATA AUDIT WARN] [${module}] ${payload.symbol} ${field}: ${reason}`);
    }
  } catch {
    // Non-blocking
  }
}

export class VpinEngine {
  /**
   * Ham işlem tiklerinden (trades) VPIN hesaplar.
   */
  public static calculateVpin(
    symbol: string,
    trades: TradeTick[],
    targetBucketSize: number = 10000,
    toxicityThreshold: number = 0.35
  ): VpinResult | null {
    const cleanSym = (symbol || 'THYAO').toUpperCase().trim();

    if (!Array.isArray(trades) || trades.length === 0) {
      logDataIssue('vpinEngine', cleanSym, 'trades', 'İşlem tik listesi boş veya geçersiz.');
      return null;
    }

    if (typeof targetBucketSize !== 'number' || isNaN(targetBucketSize) || targetBucketSize <= 0) {
      logDataIssue('vpinEngine', cleanSym, 'targetBucketSize', 'Geçersiz kova boyutu.');
      return null;
    }

    const V = targetBucketSize;
    const bucketImbalances: number[] = [];

    let currentBucketVolume = 0;
    let currentBucketBuy = 0;
    let currentBucketSell = 0;
    let lastPrice: number | null = null;

    for (let i = 0; i < trades.length; i++) {
      const trade = trades[i];
      if (!trade || typeof trade.price !== 'number' || isNaN(trade.price) || trade.price <= 0 ||
          typeof trade.volume !== 'number' || isNaN(trade.volume) || trade.volume <= 0) {
        continue;
      }

      let tradeSide: 'BUY' | 'SELL' = 'BUY';
      if (trade.side === 'BUY' || trade.side === 'SELL') {
        tradeSide = trade.side;
      } else if (lastPrice !== null) {
        if (trade.price > lastPrice) tradeSide = 'BUY';
        else if (trade.price < lastPrice) tradeSide = 'SELL';
        else tradeSide = 'BUY'; // Eşit fiyatta varsayılan yön
      }
      lastPrice = trade.price;

      let remainingTradeVol = trade.volume;

      while (remainingTradeVol > 0) {
        const spaceInBucket = V - currentBucketVolume;
        const allocVol = Math.min(remainingTradeVol, spaceInBucket);

        if (tradeSide === 'BUY') {
          currentBucketBuy += allocVol;
        } else {
          currentBucketSell += allocVol;
        }

        currentBucketVolume += allocVol;
        remainingTradeVol -= allocVol;

        // Kova dolduysa listeye ekle ve yeni kovaya geç
        if (currentBucketVolume >= V) {
          const imbalance = Math.abs(currentBucketBuy - currentBucketSell);
          bucketImbalances.push(imbalance);

          currentBucketVolume = 0;
          currentBucketBuy = 0;
          currentBucketSell = 0;
        }
      }
    }

    const N = bucketImbalances.length;
    if (N === 0) {
      logDataIssue('vpinEngine', cleanSym, 'buckets', 'Yetersiz hacim nedeniyle hiç tam kova oluşturulamadı.');
      return null;
    }

    const totalImbalanceSum = bucketImbalances.reduce((acc, val) => acc + val, 0);
    const rawVpin = totalImbalanceSum / (N * V);

    if (typeof rawVpin !== 'number' || isNaN(rawVpin)) {
      logDataIssue('vpinEngine', cleanSym, 'rawVpin', 'VPIN skoru sayısal olarak hesaplanamadı.');
      return null;
    }

    const vpinScore = Number(rawVpin.toFixed(4));
    const isToxic = vpinScore > toxicityThreshold;

    let toxicityLevel: 'SAFE' | 'ELEVATED' | 'TOXIC' = 'SAFE';
    if (vpinScore > 0.50) toxicityLevel = 'TOXIC';
    else if (vpinScore > toxicityThreshold) toxicityLevel = 'ELEVATED';

    const action: 'PROCEED' | 'VETO_HOLD' = isToxic ? 'VETO_HOLD' : 'PROCEED';
    const reason = isToxic
      ? `VPIN Toksisite Uyarısı: VPIN skoru (${vpinScore}) toksisite eşiğini (${toxicityThreshold}) aştı. Kurumsal dağıtım riski nedeniyle VETO_HOLD.`
      : `VPIN akışı güvenli bantta (${vpinScore} <= ${toxicityThreshold}).`;

    return {
      symbol: cleanSym,
      vpinScore,
      toxicityLevel,
      isToxic,
      action,
      reason,
      bucketSize: V,
      analyzedBuckets: N,
    };
  }
}

export const vpinEngine = VpinEngine;
