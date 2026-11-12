// Pure Volume-Synchronized Probability of Toxicity (VPIN) Calculation
export interface TradeTick {
  qty: number;
  isSell: boolean;
}

export interface VpinResult {
  vpinScore: number;
  isToxic: boolean;
  bucketSize: number;
  analyzedTradesCount: number;
}

export function calculateVpin(trades: TradeTick[], numBuckets: number = 50, threshold: number = 0.35): VpinResult {
  if (!trades || trades.length === 0) {
    return { vpinScore: 0, isToxic: false, bucketSize: 0, analyzedTradesCount: 0 };
  }

  let totalBuyVol = 0;
  let totalSellVol = 0;
  for (const t of trades) {
    if (t.isSell) {
      totalSellVol += t.qty;
    } else {
      totalBuyVol += t.qty;
    }
  }

  const totalVolume = totalBuyVol + totalSellVol;
  const bucketSize = totalVolume > 0 ? totalVolume / numBuckets : 0;

  let vpinScore = 0;
  if (bucketSize > 0) {
    let currentBucketBuy = 0;
    let currentBucketSell = 0;
    let currentBucketVol = 0;
    let bucketAbsDiffSum = 0;

    for (const t of trades) {
      let remainingQty = t.qty;
      while (remainingQty > 0) {
        const spaceInBucket = bucketSize - currentBucketVol;
        const fillQty = Math.min(remainingQty, spaceInBucket);

        if (t.isSell) {
          currentBucketSell += fillQty;
        } else {
          currentBucketBuy += fillQty;
        }
        currentBucketVol += fillQty;
        remainingQty -= fillQty;

        if (currentBucketVol >= bucketSize - 1e-9) {
          bucketAbsDiffSum += Math.abs(currentBucketBuy - currentBucketSell);
          currentBucketBuy = 0;
          currentBucketSell = 0;
          currentBucketVol = 0;
        }
      }
    }
    if (currentBucketVol > 0) {
      bucketAbsDiffSum += Math.abs(currentBucketBuy - currentBucketSell);
    }
    vpinScore = bucketAbsDiffSum / totalVolume;
  }

  return {
    vpinScore: Math.round(vpinScore * 10000) / 10000,
    isToxic: vpinScore > threshold,
    bucketSize: Math.round(bucketSize * 100) / 100,
    analyzedTradesCount: trades.length
  };
}
