// shared/types/orderbook.ts
/**
 * 4. DERİNLİK, TAKAS VE KURUMSAL AKIŞ MODÜLLERİ - ORDERBOOK
 * L2 Emir defteri seviyeleri, likidite duvarları ve anlık görüntülerini tanımlar.
 */

export interface OrderBookLevel {
  price: number;
  qty: number;
  total: number;
  count?: number;
}

export interface LiquidityWall {
  price: number;
  volumeK: number;
  side: 'BID' | 'ASK';
  distancePct: number;
}

export interface L2OrderBookSnapshot {
  ticker: string;
  symbol: string;
  timestamp: string;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  bestBid: number;
  bestAsk: number;
  spread: number;
  spreadPct: number;
  walls: LiquidityWall[];
}
