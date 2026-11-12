// server/services/cryptoMarketStream.service.ts
import WebSocket from 'ws';

export interface CryptoLevel {
  price: number;
  qty: number;
  total: number;
}

export interface CryptoOrderBook {
  pair: string;
  symbol: string;
  timestamp: string;
  lastPrice: number;
  priceChange24h: number;
  priceChangePercent24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  bestBid: number;
  bestAsk: number;
  spread: number;
  spreadPct: number;
  microPrice: number;
  bids: CryptoLevel[];
  asks: CryptoLevel[];
  bidTotalVolume: number;
  askTotalVolume: number;
  obi: number; // Range: -1.0 to +1.0
  obiPct: number; // e.g. 65 (% Alıcı)
  zScore: number;
  anomalyStatus: 'NORMAL' | 'DIKKAT' | 'ANORMAL_HACIM_PATLAMASI';
  signal: 'GUCLU_AL' | 'AL' | 'NOTR' | 'SAT' | 'GUCLU_SAT';
  quantComment: string;
}

export interface CryptoTickerSummary {
  pair: string;
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  obi: number;
  zScore: number;
  signal: string;
}

export interface CryptoDerivativesData {
  pair: string;
  symbol: string;
  markPrice: number;
  indexPrice: number;
  lastFundingRate: number; // e.g. 0.0001
  fundingRatePct: number; // e.g. 0.0100
  annualizedFundingApy: number; // fundingRate * 3 * 365 * 100
  nextFundingTime: number; // timestamp ms
  fundingCountdownSeconds: number;
  fundingRegime: 'BULLISH_CROWDED' | 'BALANCED' | 'SHORT_SQUEEZE_RISK';
  openInterest: number;
  openInterestUsd: number;
  longAccountPct: number;
  shortAccountPct: number;
  longShortRatio: number;
  spotPrice: number;
  basisSpreadPct: number;
  annualizedBasisApy: number;
  shortLiquidationWall: number;
  longLiquidationCascade: number;
  cascadeRisk: 'LOW' | 'ELEVATED' | 'HIGH' | 'CRITICAL';
  timestamp: string;
}

export interface FearAndGreedData {
  score: number;
  classification: string;
  history: Array<{ value: number; classification: string; timestamp: number }>;
  updatedAt: string;
}

const SUPPORTED_PAIRS = [
  'BTCUSDT',
  'ETHUSDT',
  'SOLUSDT',
  'BNBUSDT',
  'AVAXUSDT',
  'XRPUSDT',
  'DOGEUSDT',
  'ADAUSDT',
  'LINKUSDT',
  'SUIUSDT'
];

const PAIR_NAMES: Record<string, string> = {
  BTCUSDT: 'Bitcoin',
  ETHUSDT: 'Ethereum',
  SOLUSDT: 'Solana',
  BNBUSDT: 'BNB',
  AVAXUSDT: 'Avalanche',
  XRPUSDT: 'XRP / Ripple',
  DOGEUSDT: 'Dogecoin',
  ADAUSDT: 'Cardano',
  LINKUSDT: 'Chainlink',
  SUIUSDT: 'Sui Network'
};

const WS_ENDPOINTS = [
  'wss://stream.binance.com:9443/stream',
  'wss://stream.binance.com:443/stream',
  'wss://data-stream.binance.vision/stream'
];

const REST_ENDPOINTS = [
  'https://api.binance.com',
  'https://api1.binance.com',
  'https://data-api.binance.vision'
];

class CryptoMarketStreamService {
  private orderBooks: Map<string, CryptoOrderBook> = new Map();
  private volumeHistory: Map<string, number[]> = new Map();
  private ws: WebSocket | null = null;
  private isConnecting = false;
  private syncInterval: NodeJS.Timeout | null = null;
  private wsEndpointIdx = 0;
  private restEndpointIdx = 0;
  private reconnectAttempts = 0;
  private failoverEventsCount = 0;
  private activeChannelMode: 'PRIMARY_WS' | 'FAILOVER_WS' | 'REST_MIRROR' | 'SYNTHETIC_RESILIENT' = 'PRIMARY_WS';

  // Derivatives Cache
  private derivativesCache: Map<string, { data: CryptoDerivativesData; expires: number }> = new Map();
  private fngCache: { data: FearAndGreedData; expires: number } | null = null;

  constructor() {
    this.initRealDataBootstrap();
    this.initBinanceWebSocket();
    this.startRestSyncPolling();
  }

  private async initRealDataBootstrap() {
    // Gerçek veriyi doğrudan Binance REST üzerinden çekerek başlat
    try {
      const baseRest = REST_ENDPOINTS[0];
      const res = await fetch(`${baseRest}/api/v3/ticker/24hr`, { signal: AbortSignal.timeout(4000) });
      if (res.ok) {
        const tickers: any[] = await res.json();
        const map = new Map<string, any>();
        tickers.forEach((t) => map.set(t.symbol, t));

        for (const pair of SUPPORTED_PAIRS) {
          const t = map.get(pair);
          if (t) {
            const lastPrice = parseFloat(t.lastPrice);
            const changePct = parseFloat(t.priceChangePercent);
            if (!isNaN(lastPrice)) {
              // Hacim geçmişini gerçek hacim ile başlat
              const vol = parseFloat(t.volume) || 10000;
              this.volumeHistory.set(pair, Array(20).fill(vol / 20));

              // Temel kademeleri gerçek fiyata göre oluştur
              const step = lastPrice * 0.0003;
              const rawBids: Array<[string, string]> = [];
              const rawAsks: Array<[string, string]> = [];
              for (let i = 1; i <= 10; i++) {
                rawBids.push([(lastPrice - i * step).toFixed(2), ((100000 / lastPrice) * 1.1).toFixed(4)]);
                rawAsks.push([(lastPrice + i * step).toFixed(2), ((100000 / lastPrice) * 0.95).toFixed(4)]);
              }

              this.processRawDepth(pair, lastPrice, changePct, rawBids, rawAsks, {
                high24h: parseFloat(t.highPrice),
                low24h: parseFloat(t.lowPrice),
                volume24h: vol
              });
            }
          }
        }
        console.log('⚡ [Binance Boot] Gerçek spot fiyatlar başarıyla yüklendi.');
      }
    } catch (err: any) {
      console.warn('[Binance Boot] İlk REST çağrısı atlandı, WS bağlantısı bekleniyor:', err?.message);
    }
  }

  private initBinanceWebSocket() {
    if (this.isConnecting) return;
    this.isConnecting = true;

    try {
      const streams = SUPPORTED_PAIRS.map(p => `${p.toLowerCase()}@depth20@100ms`).join('/');
      const baseWs = WS_ENDPOINTS[this.wsEndpointIdx % WS_ENDPOINTS.length];
      const wsUrl = `${baseWs}?streams=${streams}`;

      this.ws = new WebSocket(wsUrl);

      this.ws.on('open', () => {
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.activeChannelMode = this.wsEndpointIdx === 0 ? 'PRIMARY_WS' : 'FAILOVER_WS';
        console.log(`⚡ [Binance WS] Canlı derinlik akışı aktif (${baseWs}).`);
      });

      this.ws.on('message', (data: WebSocket.RawData) => {
        try {
          const parsed = JSON.parse(data.toString());
          if (parsed && parsed.stream && parsed.data) {
            const pair = String(parsed.stream).split('@')[0].toUpperCase();
            const depthData = parsed.data;
            const current = this.orderBooks.get(pair);
            const mid = current ? current.lastPrice : (parseFloat(depthData.bids?.[0]?.[0]) || 0);
            const chg = current ? current.priceChangePercent24h : 0;
            if (mid > 0 && Array.isArray(depthData.bids) && Array.isArray(depthData.asks)) {
              this.processRawDepth(pair, mid, chg, depthData.bids, depthData.asks);
            }
          }
        } catch {
          // Ignore malformed WS frame without crashing
        }
      });

      this.ws.on('error', () => {
        this.isConnecting = false;
        this.failoverEventsCount++;
        this.wsEndpointIdx = (this.wsEndpointIdx + 1) % WS_ENDPOINTS.length;
        this.activeChannelMode = 'REST_MIRROR';
      });

      this.ws.on('close', () => {
        this.isConnecting = false;
        this.reconnectAttempts++;
        const backoffMs = Math.min(30000, 2000 * Math.pow(1.5, Math.min(this.reconnectAttempts, 6)));
        setTimeout(() => this.initBinanceWebSocket(), backoffMs);
      });
    } catch {
      this.isConnecting = false;
      this.activeChannelMode = 'SYNTHETIC_RESILIENT';
    }
  }

  private startRestSyncPolling() {
    const fetchPair = async (pair: string) => {
      const baseRest = REST_ENDPOINTS[this.restEndpointIdx % REST_ENDPOINTS.length];
      try {
        const [tickerRes, depthRes] = await Promise.all([
          fetch(`${baseRest}/api/v3/ticker/24hr?symbol=${pair}`, { signal: AbortSignal.timeout(3000) }),
          fetch(`${baseRest}/api/v3/depth?symbol=${pair}&limit=10`, { signal: AbortSignal.timeout(3000) })
        ]);

        if (tickerRes.ok && depthRes.ok) {
          const ticker = await tickerRes.json();
          const depth = await depthRes.json();

          const lastPrice = parseFloat(ticker.lastPrice);
          const changePct = parseFloat(ticker.priceChangePercent);

          if (!isNaN(lastPrice) && Array.isArray(depth.bids) && Array.isArray(depth.asks)) {
            this.processRawDepth(pair, lastPrice, changePct, depth.bids, depth.asks, {
              high24h: parseFloat(ticker.highPrice),
              low24h: parseFloat(ticker.lowPrice),
              volume24h: parseFloat(ticker.volume)
            });
            return;
          }
        }
      } catch {
        this.failoverEventsCount++;
        this.restEndpointIdx = (this.restEndpointIdx + 1) % REST_ENDPOINTS.length;
      }
    };

    const pollAll = async () => {
      for (const pair of SUPPORTED_PAIRS) {
        await fetchPair(pair);
      }
    };

    pollAll();
    this.syncInterval = setInterval(pollAll, 4000);
  }

  private processRawDepth(
    pair: string,
    lastPrice: number,
    changePct: number,
    rawBids: Array<[string, string]>,
    rawAsks: Array<[string, string]>,
    extra?: { high24h?: number; low24h?: number; volume24h?: number }
  ) {
    if (typeof lastPrice !== 'number' || isNaN(lastPrice) || lastPrice <= 0) {
      return;
    }

    let bidVolTotal = 0;
    const bids: CryptoLevel[] = [];
    for (let i = 0; i < Math.min(rawBids.length, 10); i++) {
      const price = parseFloat(rawBids[i][0]);
      const qty = parseFloat(rawBids[i][1]);
      if (!isNaN(price) && !isNaN(qty)) {
        bidVolTotal += qty;
        bids.push({ price, qty, total: bidVolTotal });
      }
    }

    let askVolTotal = 0;
    const asks: CryptoLevel[] = [];
    for (let i = 0; i < Math.min(rawAsks.length, 10); i++) {
      const price = parseFloat(rawAsks[i][0]);
      const qty = parseFloat(rawAsks[i][1]);
      if (!isNaN(price) && !isNaN(qty)) {
        askVolTotal += qty;
        asks.push({ price, qty, total: askVolTotal });
      }
    }

    const totalLiquidity = bidVolTotal + askVolTotal;
    const rawObi = totalLiquidity > 0 ? (bidVolTotal - askVolTotal) / totalLiquidity : 0;
    const obi = Number(Math.max(-1, Math.min(1, rawObi)).toFixed(3));
    const obiPct = Number(((obi + 1) * 50).toFixed(1)); // 0 to 100%

    const bestBid = bids.length > 0 ? bids[0].price : lastPrice;
    const bestAsk = asks.length > 0 ? asks[0].price : lastPrice;
    const spread = Number(Math.max(0, bestAsk - bestBid).toFixed(2));
    const spreadPct = Number(((spread / lastPrice) * 100).toFixed(4));

    const microPrice = totalLiquidity > 0
      ? Number(((bestBid * askVolTotal + bestAsk * bidVolTotal) / totalLiquidity).toFixed(2))
      : lastPrice;

    // Volume Z-Score
    const history = this.volumeHistory.get(pair) || [1000, 1000, 1000];
    const mean = history.reduce((a, b) => a + b, 0) / history.length;
    const variance = history.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / history.length;
    const stdDev = Math.max(Math.sqrt(variance), mean * 0.1);
    const currentVol = (extra?.volume24h || mean) * 0.05;
    const rawZ = (currentVol - mean) / stdDev;
    const zScore = Number(Math.max(-3.5, Math.min(4.5, rawZ)).toFixed(2));

    let anomalyStatus: 'NORMAL' | 'DIKKAT' | 'ANORMAL_HACIM_PATLAMASI' = 'NORMAL';
    if (zScore >= 2.5) {
      anomalyStatus = 'ANORMAL_HACIM_PATLAMASI';
    } else if (zScore >= 1.6 || Math.abs(obi) >= 0.45) {
      anomalyStatus = 'DIKKAT';
    }

    let signal: 'GUCLU_AL' | 'AL' | 'NOTR' | 'SAT' | 'GUCLU_SAT' = 'NOTR';
    let quantComment = 'Derinlik dengeli seviyede seyrediyor.';

    if (obi > 0.35 && zScore > 1.2) {
      signal = 'GUCLU_AL';
      quantComment = `L2 OBI (+%${((obi)*100).toFixed(0)}) yoğun alıcı baskısı ve Z-Skor (+${zScore}σ) hacim patlaması teyit edildi.`;
    } else if (obi > 0.15) {
      signal = 'AL';
      quantComment = 'Alış kademelerinde birikim mevcut, mikro fiyat yukarı eğilimli.';
    } else if (obi < -0.35 && zScore > 1.2) {
      signal = 'GUCLU_SAT';
      quantComment = `L2 OBI (-%${(Math.abs(obi)*100).toFixed(0)}) satış duvarı baskısı ve Z-Skor (+${zScore}σ) boşaltma hareketi tespit edildi.`;
    } else if (obi < -0.15) {
      signal = 'SAT';
      quantComment = 'Satıcı kademeleri kalınlaşıyor, kademeli kâr alımı önerilir.';
    }

    const high24h = extra?.high24h ?? Number((lastPrice * 1.025).toFixed(2));
    const low24h = extra?.low24h ?? Number((lastPrice * 0.975).toFixed(2));
    const volume24h = extra?.volume24h ?? 150000;

    const book: CryptoOrderBook = {
      pair,
      symbol: pair.replace('USDT', '/USDT'),
      timestamp: new Date().toISOString(),
      lastPrice,
      priceChange24h: Number((lastPrice * (changePct / 100)).toFixed(2)),
      priceChangePercent24h: Number(changePct.toFixed(2)),
      high24h,
      low24h,
      volume24h,
      bestBid,
      bestAsk,
      spread,
      spreadPct,
      microPrice,
      bids,
      asks,
      bidTotalVolume: Number(bidVolTotal.toFixed(4)),
      askTotalVolume: Number(askVolTotal.toFixed(4)),
      obi,
      obiPct,
      zScore,
      anomalyStatus,
      signal,
      quantComment
    };

    this.orderBooks.set(pair, book);
  }

  public getOrderBook(pair: string): CryptoOrderBook | null {
    const clean = pair.toUpperCase().replace('/', '').replace('-USD', 'USDT').trim();
    return this.orderBooks.get(clean) || this.orderBooks.get('BTCUSDT') || null;
  }

  public getTickers(): CryptoTickerSummary[] {
    const list: CryptoTickerSummary[] = [];
    for (const pair of SUPPORTED_PAIRS) {
      const book = this.orderBooks.get(pair);
      if (book) {
        list.push({
          pair: book.pair,
          symbol: book.symbol,
          name: PAIR_NAMES[book.pair] || book.pair,
          price: book.lastPrice,
          change24h: book.priceChangePercent24h,
          high24h: book.high24h,
          low24h: book.low24h,
          volume24h: book.volume24h,
          obi: book.obi,
          zScore: book.zScore,
          signal: book.signal
        });
      }
    }
    return list;
  }

  /**
   * 📊 Binance USDS-M Vadeli İşlemler (Futures) Türev & Fonlama Göstergeleri
   * Coinglass & Binance standartlarında 8 saatlik fonlama, açık faiz (OI) ve Long/Short oranı
   */
  public async getDerivativesData(pair: string): Promise<CryptoDerivativesData | null> {
    const cleanPair = pair.toUpperCase().replace('/', '').replace('-USD', 'USDT').trim();
    const now = Date.now();
    const cached = this.derivativesCache.get(cleanPair);
    if (cached && cached.expires > now) {
      return cached.data;
    }

    try {
      const [premRes, oiRes, lsRes] = await Promise.all([
        fetch(`https://fapi.binance.com/fapi/v1/premiumIndex?symbol=${cleanPair}`, {
          signal: AbortSignal.timeout(3500)
        }).then(r => (r.ok ? r.json() : null)).catch(() => null),
        fetch(`https://fapi.binance.com/fapi/v1/openInterest?symbol=${cleanPair}`, {
          signal: AbortSignal.timeout(3500)
        }).then(r => (r.ok ? r.json() : null)).catch(() => null),
        fetch(`https://fapi.binance.com/futures/data/globalLongShortAccountRatio?symbol=${cleanPair}&period=1h&limit=1`, {
          signal: AbortSignal.timeout(3500)
        }).then(r => (r.ok ? r.json() : null)).catch(() => null)
      ]);

      const spotBook = this.getOrderBook(cleanPair);
      const spotPrice = spotBook ? spotBook.lastPrice : (premRes ? parseFloat(premRes.indexPrice) : 0);

      const markPrice = premRes ? parseFloat(premRes.markPrice) : spotPrice;
      const indexPrice = premRes ? parseFloat(premRes.indexPrice) : spotPrice;
      const lastFundingRate = premRes ? parseFloat(premRes.lastFundingRate) : 0.0001;
      const fundingRatePct = Number((lastFundingRate * 100).toFixed(4));
      // 8 saatlik oran * 3 (günlük) * 365 = Yıllık Basit Getiri (APY)
      const annualizedFundingApy = Number((lastFundingRate * 3 * 365 * 100).toFixed(2));
      const nextFundingTime = premRes ? parseInt(premRes.nextFundingTime, 10) : now + (8 * 3600 * 1000);
      const fundingCountdownSeconds = Math.max(0, Math.floor((nextFundingTime - now) / 1000));

      let fundingRegime: 'BULLISH_CROWDED' | 'BALANCED' | 'SHORT_SQUEEZE_RISK' = 'BALANCED';
      if (lastFundingRate >= 0.0003) {
        fundingRegime = 'BULLISH_CROWDED';
      } else if (lastFundingRate <= -0.0001) {
        fundingRegime = 'SHORT_SQUEEZE_RISK';
      }

      const openInterest = oiRes ? parseFloat(oiRes.openInterest) : 0;
      const openInterestUsd = Number((openInterest * markPrice).toFixed(0));

      const lsItem = Array.isArray(lsRes) && lsRes.length > 0 ? lsRes[0] : null;
      const longAccountPct = lsItem ? Number((parseFloat(lsItem.longAccount) * 100).toFixed(1)) : 50.0;
      const shortAccountPct = lsItem ? Number((parseFloat(lsItem.shortAccount) * 100).toFixed(1)) : 50.0;
      const longShortRatio = lsItem ? parseFloat(lsItem.longShortRatio) : 1.0;

      const basisSpreadPct = spotPrice > 0 ? Number((((markPrice - spotPrice) / spotPrice) * 100).toFixed(3)) : 0;
      const annualizedBasisApy = Number((basisSpreadPct * (365 / 30)).toFixed(2));

      // Likidasyon Kümeleri & Kaskad Riski
      const shortLiquidationWall = Number((markPrice * 1.025).toFixed(2));
      const longLiquidationCascade = Number((markPrice * 0.975).toFixed(2));

      let cascadeRisk: 'LOW' | 'ELEVATED' | 'HIGH' | 'CRITICAL' = 'LOW';
      if (Math.abs(basisSpreadPct) >= 0.5 || Math.abs(fundingRatePct) >= 0.03 || longShortRatio >= 2.2 || longShortRatio <= 0.6) {
        cascadeRisk = 'HIGH';
      } else if (Math.abs(basisSpreadPct) >= 0.2 || Math.abs(fundingRatePct) >= 0.015) {
        cascadeRisk = 'ELEVATED';
      }

      const derivativesData: CryptoDerivativesData = {
        pair: cleanPair,
        symbol: cleanPair.replace('USDT', '/USDT'),
        markPrice,
        indexPrice,
        lastFundingRate,
        fundingRatePct,
        annualizedFundingApy,
        nextFundingTime,
        fundingCountdownSeconds,
        fundingRegime,
        openInterest,
        openInterestUsd,
        longAccountPct,
        shortAccountPct,
        longShortRatio,
        spotPrice,
        basisSpreadPct,
        annualizedBasisApy,
        shortLiquidationWall,
        longLiquidationCascade,
        cascadeRisk,
        timestamp: new Date().toISOString()
      };

      this.derivativesCache.set(cleanPair, { data: derivativesData, expires: now + 12000 }); // 12s cache
      return derivativesData;
    } catch (err: any) {
      console.warn('[CryptoDerivatives] Hata:', err?.message);
      return null;
    }
  }

  /**
   * 🧠 Alternative.me Kripto Korku & Açgözlülük Endeksi (Fear & Greed Index)
   * Doğrudan canlı API'den çekilir, 3 dakika önbelleklenir.
   */
  public async getFearAndGreed(): Promise<FearAndGreedData | null> {
    const now = Date.now();
    if (this.fngCache && this.fngCache.expires > now) {
      return this.fngCache.data;
    }

    try {
      const res = await fetch('https://api.alternative.me/fng/?limit=7', { signal: AbortSignal.timeout(4000) });
      if (res.ok) {
        const json = await res.json();
        if (json && Array.isArray(json.data) && json.data.length > 0) {
          const current = json.data[0];
          const score = parseInt(current.value, 10);
          const classification = current.value_classification || 'Neutral';
          const history = json.data.map((d: any) => ({
            value: parseInt(d.value, 10),
            classification: d.value_classification,
            timestamp: parseInt(d.timestamp, 10) * 1000
          }));

          const data: FearAndGreedData = {
            score,
            classification,
            history,
            updatedAt: new Date().toLocaleTimeString('tr-TR')
          };

          this.fngCache = { data, expires: now + 180000 }; // 3 dk önbellek
          return data;
        }
      }
    } catch (err: any) {
      console.warn('[CryptoFNG] Alternative.me API hatası:', err?.message);
    }
    return this.fngCache ? this.fngCache.data : null;
  }
}

export const cryptoMarketStreamService = new CryptoMarketStreamService();
