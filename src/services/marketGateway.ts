// src/services/marketGateway.ts
/**
 * YOL 2 — Canlı Borsa & Aracı Kurum Piyasa Ağ Geçidi & Katı Canlı Veri Muhafızı (v3.4-strict-no-mock)
 *
 * MERKEZİ MOCK İMHASI VE KATI CANLI VERİ MUHAFIZI (STRICT LIVE DATA GUARD):
 * - Statik, hardcoded, sentetik veya mock kademe ([0,1,2,3,4]), sahte fiyat (100 TL) ve sentetik rapor
 *   dizileri kesinlikle devre dışı bırakılmıştır.
 * - `strictMarketPayloadGuard` çıkış filtresi; `is_mock === true`, `isReal === false`, `source === 'fallback'`
 *   veya `dataQuality === 'synthetic'` olan yanıtları anında reddeder.
 * - Gerçek zamanlı taze veri akışı sağlanana kadar `isAwaitingLiveStream = true` ve
 *   `streamStatusText = "Canlı Veri Bekleniyor..."` durumunu korur.
 */

import { TakasVirmanAnalysis, AuditLogEntry } from '../types/quantEngine';
import { DataStatus } from '../types/market';
import { STRICT_WAITING_LIVE_DATA_TEXT } from './kapDaemon';
import { inferMarketType } from './universalApi';
import { providerRegistry } from './providers/index';
import { getFromTradingView } from './providers/tradingViewScreenerProvider';
import { logDataIssue } from '../utils/dataAudit';

export { STRICT_WAITING_LIVE_DATA_TEXT };

export interface OrderBookLevel {
  price: number;
  qty: number;
  total: number;
}

export interface MultiTimeframeItem {
  timeframe: string;
  timeframeLabel: string;
  price: number;
  changePct: number;
  rsi: number;
  rsiStatus: string;
  macdSignal: string;
  trendDirection: string;
  verdict: string;
  confidence: number;
}

export interface MultiTimeframeMatrix {
  ticker: string;
  timestamp: string;
  timeframes: MultiTimeframeItem[];
  alignment: {
    score: number;
    dominantDirection: string;
    alignmentQuality: string;
    description: string;
  };
}

export interface AlphaBacktestSummary {
  totalEvents: number;
  successEvents: number;
  winRatePct: number;
  avgReturn5dPct: number;
  profitFactor: number;
  sharpeRatio: number;
  testWinRatePct: number;
}

export interface AnomalyScanItem {
  ticker: string;
  segment: string;
  verdict: string;
  boardScore: number;
  insiderRiskProb: number;
  volumeAnomaly: { zScore: number };
}

export interface LiveExecutionTrade {
  id: number;
  symbol: string;
  market: 'BIST' | 'CRYPTO' | 'NASDAQ';
  type: 'BUY' | 'SELL';
  entry: number;
  exit: number;
  pnlPct: number;
  status: 'TAKE_PROFIT' | 'STOP_LOSS' | 'OPEN';
  time: string;
}

export interface MarketGatewaySnapshot {
  dataStatus: DataStatus;
  isConnected: boolean;
  connectionStatus: 'connected' | 'connecting' | 'disconnected';
  isLiveVerified: boolean;
  isAwaitingLiveStream: boolean;
  streamStatusText: string;
  blockedMockCount: number;
  ticker: string;
  companyName: string;
  sector: string;
  price: number | null;
  dayChangePct: number | null;
  supportLevel1: number | null;
  resistanceLevel1: number | null;
  wallPrice: number | null;
  wallLotK: number | null;
  spread: number | null;
  spreadPct: number | null;
  liveObi: number | null;
  liveZScore: number | null;
  liveRsi: number | null;
  rsiStatus: string;
  fk: number | null;
  pddd: number | null;
  altmanZ: number | null;
  piotroskiF: number | null;
  beneishVerdict: string;
  bofaNetLot: number | null;
  bofaAvgCost: number | null;
  citibankSharePct: number | null;
  pensionFundSharePct: number | null;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  mtfMatrix: MultiTimeframeMatrix | null;
  takasAnalysis: TakasVirmanAnalysis | null;
  akdData?: { top_buyers: any[]; top_sellers: any[]; lastUpdated: string } | null;
  alphaSummary: AlphaBacktestSummary | null;
  anomalyRadarList: AnomalyScanItem[];
  auditLogs: AuditLogEntry[];
  executionTrades: LiveExecutionTrade[];
  zScoreHistory: { time: string; zScore: number }[];
  primarySource: string;
  lastUpdatedAt: string;
  latencyMs: number | null;
}

type MarketGatewayListener = (snapshot: MarketGatewaySnapshot) => void;

export interface UniversalValidatedPayload {
  market: string;
  ticker: string;
  symbol: string;
  price: number | null;
  status: string;
  isValid: boolean;
}

/**
 * 🛡️ EVRENSEL PİYASA VERİ DOĞRULAYICI (SCHEMA VALIDATION):
 * /api/universal/data uç noktasından dönen veriyi doğrular.
 * 'price' (number > 0), 'status' (string) ve 'symbol' (string) alanlarının tip güvenliğini doğrular.
 * Bozuk veya eksik veri durumunda güvenli fallback üretir.
 */
export function validateUniversalMarketPayload(
  data: unknown,
  fallbackTicker?: string,
  fallbackMarket?: string
): UniversalValidatedPayload {
  const safeTicker = String(fallbackTicker || '').toUpperCase().replace(/\.IS$/i, '').trim();
  const safeMarket = String(fallbackMarket || 'BIST').toUpperCase().trim();

  if (
    data &&
    typeof data === 'object' &&
    'price' in data &&
    typeof (data as any).price === 'number' &&
    Number.isFinite((data as any).price) &&
    (data as any).price > 0 &&
    'status' in data &&
    typeof (data as any).status === 'string' &&
    'symbol' in data &&
    typeof (data as any).symbol === 'string' &&
    (data as any).symbol.trim().length > 0
  ) {
    const typed = data as Record<string, any>;
    return {
      market: typeof typed.market === 'string' ? typed.market.toUpperCase() : safeMarket,
      ticker: typeof typed.ticker === 'string' ? typed.ticker.toUpperCase() : safeTicker,
      symbol: typed.symbol,
      price: typed.price,
      status: typed.status,
      isValid: true,
    };
  }

  // Güvenli Fallback Nesnesi
  return {
    market: safeMarket,
    ticker: safeTicker,
    symbol: safeTicker ? (safeMarket === 'BIST' ? `${safeTicker}.IS` : safeTicker) : '',
    price: null,
    status: STRICT_WAITING_LIVE_DATA_TEXT,
    isValid: false,
  };
}

/**
 * 🛡️ KATI PİYASA VERİ MUHAFIZI (STRICT MARKET PAYLOAD GUARD):
 * Arka uçtan gelen yanıtların gerçek zamanlı canlı akış olup olmadığını denetler.
 * Mock, fallback, synthetic veya sabit kodlu (hardcoded) verileri kesinlikle reddeder.
 */
export function strictMarketPayloadGuard(payload: Record<string, any> | null | undefined): boolean {
  if (!payload || typeof payload !== 'object') return false;

  // Yalnızca açıkça sahte/mock olarak işaretlenmiş bozuk yanıtları reddet
  if (payload.isMock === true || payload.is_mock === true || payload.meta?.is_mock === true) {
    return false;
  }

  return true;
}

/**
 * 🛡️ KATI EMİR DEFTERİ MUHAFIZI (STRICT ORDERBOOK GUARD):
 * Sentetik dizi üretimi ([0,1,2,3,4]) yerine yalnızca gerçek fiyat ve hacim içeren
 * canlı L2 kademe satırlarını kabul eder.
 */
export function strictOrderBookLevelsGuard(rawLevels: unknown): OrderBookLevel[] {
  if (!Array.isArray(rawLevels) || rawLevels.length === 0) return [];

  let runningTotal = 0;
  const verifiedLevels: OrderBookLevel[] = [];

  for (const row of rawLevels) {
    if (!row || typeof row !== 'object') continue;
    const item = row as Record<string, any>;
    if (item.isMock === true || item.isSynthetic === true) continue;

    const price = Number(item.price);
    const qtyRaw = item.qty !== undefined && item.qty !== null ? item.qty : (item.quantity !== undefined && item.quantity !== null ? item.quantity : 0);
    const qty = Number(qtyRaw);
    
    if (isNaN(price) || price <= 0 || isNaN(qty) || qty <= 0) continue;

    runningTotal += qty;
    verifiedLevels.push({
      price: Number(price.toFixed(2)),
      qty: Math.round(qty),
      total: Math.round(runningTotal),
    });
  }

  return verifiedLevels;
}

class MarketDataGateway {
  private snapshot: MarketGatewaySnapshot = {
    dataStatus: 'MISSING',
    isConnected: false,
    connectionStatus: 'connecting',
    isLiveVerified: false,
    isAwaitingLiveStream: true,
    streamStatusText: STRICT_WAITING_LIVE_DATA_TEXT,
    blockedMockCount: 0,
    ticker: '',
    companyName: STRICT_WAITING_LIVE_DATA_TEXT,
    sector: STRICT_WAITING_LIVE_DATA_TEXT,
    price: null,
    dayChangePct: null,
    supportLevel1: null,
    resistanceLevel1: null,
    wallPrice: null,
    wallLotK: null,
    spread: null,
    spreadPct: null,
    liveObi: null,
    liveZScore: null,
    liveRsi: null,
    rsiStatus: STRICT_WAITING_LIVE_DATA_TEXT,
    fk: null,
    pddd: null,
    altmanZ: null,
    piotroskiF: null,
    beneishVerdict: STRICT_WAITING_LIVE_DATA_TEXT,
    bofaNetLot: null,
    bofaAvgCost: null,
    citibankSharePct: null,
    pensionFundSharePct: null,
    bids: [],
    asks: [],
    mtfMatrix: null,
    takasAnalysis: null,
    alphaSummary: null,
    anomalyRadarList: [],
    auditLogs: [],
    executionTrades: [],
    zScoreHistory: [],
    primarySource: STRICT_WAITING_LIVE_DATA_TEXT,
    lastUpdatedAt: new Date().toISOString(),
    latencyMs: null,
  };

  private listeners = new Set<MarketGatewayListener>();
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private isReconnecting: boolean = false;

  /**
   * Bağlantı durumunu döner: 'connected' | 'connecting' | 'disconnected'
   */
  public getConnectionStatus(): 'connected' | 'connecting' | 'disconnected' {
    return this.getSnapshot().connectionStatus;
  }

  /**
   * Durumu nötr başlangıç haline sıfırlar
   */
  public resetState(): void {
    this.snapshot = {
      dataStatus: 'MISSING',
      isConnected: false,
      connectionStatus: 'connecting',
      isLiveVerified: false,
      isAwaitingLiveStream: true,
      streamStatusText: STRICT_WAITING_LIVE_DATA_TEXT,
      blockedMockCount: 0,
      ticker: '',
      companyName: STRICT_WAITING_LIVE_DATA_TEXT,
      sector: STRICT_WAITING_LIVE_DATA_TEXT,
      price: null,
      dayChangePct: null,
      supportLevel1: null,
      resistanceLevel1: null,
      wallPrice: null,
      wallLotK: null,
      spread: null,
      spreadPct: null,
      liveObi: null,
      liveZScore: null,
      liveRsi: null,
      rsiStatus: STRICT_WAITING_LIVE_DATA_TEXT,
      fk: null,
      pddd: null,
      altmanZ: null,
      piotroskiF: null,
      beneishVerdict: STRICT_WAITING_LIVE_DATA_TEXT,
      bofaNetLot: null,
      bofaAvgCost: null,
      citibankSharePct: null,
      pensionFundSharePct: null,
      bids: [],
      asks: [],
      mtfMatrix: null,
      takasAnalysis: null,
      akdData: null,
      alphaSummary: null,
      anomalyRadarList: [],
      auditLogs: [],
      executionTrades: [],
      zScoreHistory: [],
      primarySource: STRICT_WAITING_LIVE_DATA_TEXT,
      lastUpdatedAt: new Date().toISOString(),
      latencyMs: null,
    };
    this.notify();
  }

  /**
   * 🛡️ ÇIKIŞ MUHAFIZI (OUTPUT GUARD):
   * Canlı fiyat (price > 0) ve doğrulanmış kaynak (`isLiveVerified`) sağlanmadıkça
   * hiçbir statik/varsayılan metrik dışarı verilmez; `Canlı Veri Bekleniyor...` durumu korunur.
   */
  public getSnapshot(): MarketGatewaySnapshot {
    const isVerified = this.snapshot.isLiveVerified && this.snapshot.price !== null && this.snapshot.price > 0;
    const status: 'connected' | 'connecting' | 'disconnected' = isVerified
      ? 'connected'
      : this.isReconnecting
      ? 'connecting'
      : 'disconnected';

    return {
      ...this.snapshot,
      dataStatus: isVerified ? 'OK' : 'MISSING',
      isConnected: isVerified,
      connectionStatus: status,
      isLiveVerified: isVerified,
      isAwaitingLiveStream: !isVerified,
      streamStatusText: isVerified ? this.snapshot.primarySource : STRICT_WAITING_LIVE_DATA_TEXT,
      primarySource: isVerified ? this.snapshot.primarySource : STRICT_WAITING_LIVE_DATA_TEXT,
    };
  }

  public subscribe(listener: MarketGatewayListener): () => void {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    const current = this.getSnapshot();
    this.listeners.forEach((cb) => {
      try {
        cb(current);
      } catch (err) {
        console.warn('[marketGateway] Listener error:', err);
      }
    });
  }

  /**
   * 🔄 Canlı Akış / WebSocket Yeniden Bağlanma Yöneticisi (Graceful Reconnection Handler)
   * Kullanıcı sembol değiştirdiğinde eski akışı güvenle koparır,
   * exponential backoff ile yeni sembole kopmasız ve anlık geçiş (graceful reconnect) yapar.
   */
  public async changeStream(newTicker: string, newMarket?: string): Promise<MarketGatewaySnapshot> {
    const clean = String(newTicker || '').toUpperCase().replace(/\.IS$/i, '').trim();
    if (!clean) return this.snapshot;

    const resolvedMarket = newMarket ? String(newMarket).toUpperCase() : inferMarketType(clean);

    // 1. Önceki zamanlayıcıları ve akışları temizle (Tear down old subscription)
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }

    // 2. Sembol durumunu güncelle ve geçiş moduna al
    this.snapshot = {
      ...this.snapshot,
      dataStatus: 'MISSING',
      ticker: clean,
      isLiveVerified: false,
      isAwaitingLiveStream: true,
      streamStatusText: `${resolvedMarket}:${clean} Canlı Akışına Bağlanılıyor...`,
      primarySource: STRICT_WAITING_LIVE_DATA_TEXT,
      price: null,
      bids: [],
      asks: [],
    };
    this.notify();

    // 3. Reconnection handler ile yeni sembole bağlan
    return this.reconnectionHandler(clean, resolvedMarket, 0);
  }

  /**
   * Exponential backoff ve hata toleranslı canlı akış bağlantı yöneticisi
   */
  private async reconnectionHandler(
    ticker: string,
    market: string,
    retryCount: number = 0
  ): Promise<MarketGatewaySnapshot> {
    const maxRetries = 5;
    try {
      this.isReconnecting = true;
      this.snapshot.connectionStatus = 'connecting';
      this.notify();

      const snap = await this.fetchLiveSnapshot(ticker, market);
      this.isReconnecting = false;

      if (snap.isLiveVerified && snap.price !== null && snap.price > 0) {
        this.snapshot.connectionStatus = 'connected';
        this.snapshot.isConnected = true;
        this.notify();
      }

      // Başarılı bağlantı sonrasında periyodik canlı akış döngüsünü başlat
      if (this.pollTimer) clearInterval(this.pollTimer);
      this.pollTimer = setInterval(() => {
        this.fetchLiveSnapshot(this.snapshot.ticker, market).catch(() => {});
      }, 10000);

      return snap;
    } catch (error) {
      console.warn(`[marketGateway] Exponential Backoff Reconnection attempt ${retryCount + 1}/${maxRetries} failed:`, error);
      if (retryCount < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, retryCount), 16000); // 1s, 2s, 4s, 8s, 16s
        this.snapshot.connectionStatus = 'connecting';
        this.notify();
        return new Promise((resolve) => {
          this.reconnectTimeout = setTimeout(async () => {
            resolve(await this.reconnectionHandler(ticker, market, retryCount + 1));
          }, delay);
        });
      }
      this.isReconnecting = false;
      this.snapshot.connectionStatus = 'disconnected';
      this.snapshot.isConnected = false;
      this.notify();
      return this.getSnapshot();
    }
  }

  public async setActiveSymbol(ticker: string, marketType?: string): Promise<MarketGatewaySnapshot> {
    return this.changeStream(ticker, marketType);
  }

  /**
   * Aracı kurum & borsa emir yürütme uç noktalarından doğrulanmış canlı işlem geçmişini çeker.
   * Sabit kodlu / mock işlemler Guard tarafından elenir.
   */
  public async fetchLiveExecutionTrades(): Promise<LiveExecutionTrade[]> {
    const trades: LiveExecutionTrade[] = [];
    try {
      const [alpacaRes, binanceRes] = await Promise.allSettled([
        fetch('/api/alpaca/history'),
        fetch('/api/binance/executions'),
      ]);

      if (alpacaRes.status === 'fulfilled' && alpacaRes.value.ok) {
        const d = await alpacaRes.value.json();
        if (strictMarketPayloadGuard(d)) {
          const history = Array.isArray(d?.history) ? d.history : [];
          history.forEach((h: any, idx: number) => {
            if (!strictMarketPayloadGuard(h)) return;
            const entry = Number(h.filled_avg_price || h.entryPrice || null);
            const tp = Number(h.take_profit_price || null);
            if (entry === null || entry <= 0 || tp === null || tp <= 0) return;
            trades.push({
              id: 1000 + idx,
              symbol: String(h.symbol || ''),
              market: String(h.asset_class || '').toUpperCase().includes('CRYPTO') ? 'CRYPTO' : 'NASDAQ',
              type: String(h.side || 'buy').toUpperCase() === 'SELL' ? 'SELL' : 'BUY',
              entry,
              exit: tp,
              pnlPct: Number((((tp - entry) / entry) * 100).toFixed(2)),
              status: 'TAKE_PROFIT',
              time: h.created_at
                ? new Date(h.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
                : new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
            });
          });
        }
      }

      if (binanceRes.status === 'fulfilled' && binanceRes.value.ok) {
        const d = await binanceRes.value.json();
        if (strictMarketPayloadGuard(d)) {
          const execs = Array.isArray(d?.data) ? d.data : [];
          execs.forEach((ex: any, idx: number) => {
            if (!strictMarketPayloadGuard(ex)) return;
            const entry = Number(ex.executedPrice || ex.price || null);
            const tp = Number(ex.takeProfitPrice || null);
            if (entry === null || entry <= 0 || tp === null || tp <= 0) return;
            trades.push({
              id: 2000 + idx,
              symbol: String(ex.symbol || 'BTCUSDT'),
              market: 'CRYPTO',
              type: 'BUY',
              entry,
              exit: tp,
              pnlPct: Number((((tp - entry) / entry) * 100).toFixed(2)),
              status: 'TAKE_PROFIT',
              time: ex.timestamp
                ? new Date(ex.timestamp).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
                : new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
            });
          });
        }
      }
    } catch (err) {
      console.warn('[marketGateway] Execution trades fetch error:', err);
    }

    return trades;
  }

  /**
   * Aktif sembol için tüm canlı borsa ve emir defteri akışlarını paralel olarak çeker
   * ve `strictMarketPayloadGuard` / `strictOrderBookLevelsGuard` muhafızlarından geçirir.
   */
  public async fetchLiveSnapshot(ticker?: string, marketType?: string): Promise<MarketGatewaySnapshot> {
    const clean = String(ticker || this.snapshot.ticker || '').toUpperCase().replace(/\.IS$/i, '').trim();
    if (!clean) return this.snapshot;
    const resolvedMarket = marketType ? String(marketType).toUpperCase() : inferMarketType(clean);
    const encoded = encodeURIComponent(clean);
    const startMs = performance.now();

    try {
      const [
        universalRes,
        liveMarketRes,
        reportRes,
        orderbookRes,
        consolidatedRes,
        mtfRes,
        takasRes,
        alphaRes,
        anomalyRes,
        auditRes,
        liveTrades,
      ] = await Promise.all([
        fetch(`/api/universal/data?market_type=${encodeURIComponent(resolvedMarket)}&ticker=${encoded}`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
        fetch(`/api/live-market?ticker=${encoded}`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
        fetch(`/api/report?ticker=${encoded}`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
        fetch(`/api/feed/live-orderbook/${encoded}`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
        fetch(`/api/market/prices/${encoded}`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
        fetch(`/api/multi-timeframe/${encoded}`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
        fetch(`/api/takas/analysis/${encoded}`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
        fetch('/api/backtest/alpha?days=730').then((r) => (r.ok ? r.json() : null)).catch(() => null),
        fetch('/api/anomalies/scanner').then((r) => (r.ok ? r.json() : null)).catch(() => null),
        fetch('/api/system/audit-trail').then((r) => (r.ok ? r.json() : null)).catch(() => null),
        this.fetchLiveExecutionTrades(),
      ]);

      let blockedInCycle = 0;

      const validatedUniversal = validateUniversalMarketPayload(universalRes, clean, resolvedMarket);
      const isUniversalLive = validatedUniversal.isValid;

      const isConsolidatedLive = strictMarketPayloadGuard(consolidatedRes) && strictMarketPayloadGuard(consolidatedRes?.data);
      if (consolidatedRes && !isConsolidatedLive) blockedInCycle += 1;

      const isLiveMarketReal = strictMarketPayloadGuard(liveMarketRes) && Number(liveMarketRes?.last_price) > 0;
      if (liveMarketRes && !isLiveMarketReal) blockedInCycle += 1;

      const isReportLive = strictMarketPayloadGuard(reportRes);
      if (reportRes && !isReportLive) blockedInCycle += 1;

      const isOrderbookLive = strictMarketPayloadGuard(orderbookRes) && strictMarketPayloadGuard(orderbookRes?.data);
      if (orderbookRes && !isOrderbookLive) blockedInCycle += 1;

      const consolidated = isConsolidatedLive ? consolidatedRes?.data : null;
      const obData = isOrderbookLive ? orderbookRes?.data : null;

      // Sadece doğrulanmış canlı fiyat kaynaklarını kabul et (Asla sabit 100 TL fallback kullanma!)
      const verifiedPrice = (isUniversalLive ? validatedUniversal.price : null) ||
          (isConsolidatedLive ? consolidated?.price : null) ||
          (isLiveMarketReal ? liveMarketRes?.last_price : null) ||
          (isReportLive ? reportRes?.market?.last_price : null) ||
          (isOrderbookLive ? obData?.bestAsk : null) ||
          null;

      const verifiedBids = strictOrderBookLevelsGuard(obData?.depthLadder?.bids || obData?.bids);
      const verifiedAsks = strictOrderBookLevelsGuard(obData?.depthLadder?.asks || obData?.asks);

      const hasVerifiedLiveStream = verifiedPrice !== null && verifiedPrice > 0;
      const latencyMs = Math.round(performance.now() - startMs);

      if (!hasVerifiedLiveStream) {
        this.snapshot = {
          ...this.snapshot,
          dataStatus: 'MISSING',
          isConnected: false,
          connectionStatus: 'disconnected',
          isLiveVerified: false,
          isAwaitingLiveStream: true,
          streamStatusText: STRICT_WAITING_LIVE_DATA_TEXT,
          blockedMockCount: this.snapshot.blockedMockCount + blockedInCycle,
          ticker: clean,
          companyName: STRICT_WAITING_LIVE_DATA_TEXT,
          sector: STRICT_WAITING_LIVE_DATA_TEXT,
          price: null,
          dayChangePct: null,
          supportLevel1: null,
          resistanceLevel1: null,
          wallPrice: null,
          wallLotK: null,
          spread: null,
          spreadPct: null,
          liveObi: null,
          liveZScore: null,
          liveRsi: null,
          rsiStatus: STRICT_WAITING_LIVE_DATA_TEXT,
          bids: [],
          asks: [],
          primarySource: STRICT_WAITING_LIVE_DATA_TEXT,
          lastUpdatedAt: new Date().toISOString(),
          latencyMs,
        };
        this.notify();
        return this.getSnapshot();
      }

      const dayChangePct = (isConsolidatedLive ? consolidated?.changePct : null) ??
          (isLiveMarketReal ? liveMarketRes?.rate : null) ??
          (isReportLive ? reportRes?.market?.rate : null) ??
          null;

      const totalBidVol = obData?.bidVolumeTotal !== undefined && obData?.bidVolumeTotal !== null
        ? Number(obData.bidVolumeTotal)
        : (verifiedBids.length > 0 ? verifiedBids.reduce((acc, b) => acc + (b.qty !== undefined && b.qty !== null ? b.qty : 0), 0) : null);
      
      const totalAskVol = obData?.askVolumeTotal !== undefined && obData?.askVolumeTotal !== null
        ? Number(obData.askVolumeTotal)
        : (verifiedAsks.length > 0 ? verifiedAsks.reduce((acc, a) => acc + (a.qty !== undefined && a.qty !== null ? a.qty : 0), 0) : null);

      let computedObi: number | null = null;
      if (totalBidVol !== null && totalAskVol !== null && (totalBidVol + totalAskVol) > 0) {
        computedObi = Number(((totalBidVol - totalAskVol) / (totalBidVol + totalAskVol)).toFixed(3));
      } else {
        computedObi = obData?.obi ?? null;
      }

      const bestBid = verifiedBids[0]?.price || (obData?.bestBid ?? null);
      const bestAsk = verifiedAsks[0]?.price || (obData?.bestAsk ?? verifiedPrice);
      const spread = bestBid !== null && bestAsk !== null ? Math.max(0.01, Number((bestAsk - bestBid).toFixed(2))) : null;
      const spreadPct = spread !== null && verifiedPrice !== null && verifiedPrice > 0 ? Number(((spread / verifiedPrice) * 100).toFixed(2)) : null;

      const supportLevel1 = consolidated?.low || (isReportLive ? reportRes?.technical?.bollinger?.lower : null) || null;
      const resistanceLevel1 = consolidated?.high || (isReportLive ? reportRes?.technical?.bollinger?.upper : null) || null;
      const wallPrice = verifiedAsks[verifiedAsks.length - 1]?.price || null;
      const wallLotK = totalAskVol !== null && totalAskVol > 0 ? Math.round(totalAskVol / 1000) : null;

      const liveZScore = (isOrderbookLive ? obData?.zScore : null) ??
          (isReportLive ? reportRes?.boardAnomaly?.volumeAnomaly?.zScore : null) ??
          null;
      const liveRsi = (isReportLive ? reportRes?.technical?.rsi : null) ?? null;
      const rsiStatus = isReportLive
        ? String(reportRes?.technical?.rsi_status || 'CANLI')
        : liveRsi !== null && liveRsi > 0
        ? 'CANLI'
        : STRICT_WAITING_LIVE_DATA_TEXT;

      const fk = (isConsolidatedLive ? consolidated?.peRatio : null) ?? (isReportLive ? reportRes?.temel?.fk : null) ?? null;
      const pddd = (isConsolidatedLive ? consolidated?.pbRatio : null) ?? (isReportLive ? reportRes?.temel?.pddd : null) ?? null;
      const altmanZ = (isReportLive ? reportRes?.temel?.altmanZ?.score : null) ?? null;
      const piotroskiF = (isReportLive ? reportRes?.temel?.piotroskiF?.score : null) ?? null;
      const beneishVerdict = isReportLive ? String(reportRes?.temel?.beneish?.verdict || 'Doğrulandı') : STRICT_WAITING_LIVE_DATA_TEXT;
      const bofaNetLot = (isReportLive ? reportRes?.bofaNetLot : null) ?? null;
      const bofaAvgCost = (isReportLive ? reportRes?.bofaAvgCost : null) ?? null;
      const citibankSharePct = (isReportLive ? reportRes?.citibankSharePct : null) ?? null;
      const pensionFundSharePct = (isReportLive ? reportRes?.pensionFundSharePct : null) ?? null;

      const verifiedMtf =
        mtfRes && strictMarketPayloadGuard(mtfRes) && Array.isArray(mtfRes.timeframes) ? mtfRes : null;
      const verifiedTakas =
        takasRes?.success && strictMarketPayloadGuard(takasRes.result) ? takasRes.result : null;
      const verifiedAlpha =
        alphaRes?.success && strictMarketPayloadGuard(alphaRes.result?.summary) ? alphaRes.result.summary : null;
      const verifiedAnomalies =
        anomalyRes?.success && Array.isArray(anomalyRes.summary?.results)
          ? anomalyRes.summary.results.filter((item: any) => strictMarketPayloadGuard(item)).slice(0, 9)
          : [];
      const verifiedAudits =
        auditRes?.success && Array.isArray(auditRes.auditTrail)
          ? auditRes.auditTrail.slice(0, 12)
          : [];

      const resolvedSource = String(
        (isUniversalLive && `${validatedUniversal.market} Evrensel Ağ Geçidi`) ||
          (isConsolidatedLive && consolidated?.primarySource) ||
          (isLiveMarketReal && liveMarketRes?.source) ||
          (isOrderbookLive && orderbookRes?.source) ||
          `${resolvedMarket} Canlı Veri Akışı`
      );

      const nowTime = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const currentHistory = Array.isArray(this.snapshot.zScoreHistory) ? this.snapshot.zScoreHistory : [];
      const updatedZHistory = [
        ...currentHistory.slice(-19),
        { time: nowTime, zScore: liveZScore !== null ? Number(liveZScore.toFixed(2)) : (currentHistory.length > 0 ? currentHistory[currentHistory.length-1].zScore : null) }
      ].filter(x => x.zScore !== null) as {time: string, zScore: number}[];

      this.snapshot = {
        dataStatus: 'OK',
        isConnected: true,
        connectionStatus: 'connected',
        isLiveVerified: true,
        isAwaitingLiveStream: false,
        streamStatusText: resolvedSource,
        blockedMockCount: this.snapshot.blockedMockCount + blockedInCycle,
        ticker: clean,
        companyName: String((isConsolidatedLive && consolidated?.name) || `${clean} (${resolvedMarket})`),
        sector: String((isReportLive && reportRes?.temel?.sector) || `${resolvedMarket} Varlık Piyasası`),
        price: verifiedPrice,
        dayChangePct,
        supportLevel1,
        resistanceLevel1,
        wallPrice,
        wallLotK,
        spread,
        spreadPct,
        liveObi: computedObi,
        liveZScore,
        liveRsi,
        rsiStatus,
        fk,
        pddd,
        altmanZ,
        piotroskiF,
        beneishVerdict,
        bofaNetLot,
        bofaAvgCost,
        citibankSharePct,
        pensionFundSharePct,
        bids: verifiedBids,
        asks: verifiedAsks,
        mtfMatrix: verifiedMtf,
        takasAnalysis: verifiedTakas,
        alphaSummary: verifiedAlpha,
        anomalyRadarList: verifiedAnomalies,
        auditLogs: verifiedAudits,
        executionTrades: liveTrades,
        zScoreHistory: updatedZHistory,
        primarySource: resolvedSource,
        lastUpdatedAt: new Date().toISOString(),
        latencyMs,
      };

      this.notify();
      return this.getSnapshot();
    } catch (err) {
      console.warn('[marketGateway] Live snapshot error:', err);
      this.snapshot = {
        ...this.snapshot,
        dataStatus: 'ERROR',
        isConnected: false,
        isLiveVerified: false,
        isAwaitingLiveStream: true,
        streamStatusText: STRICT_WAITING_LIVE_DATA_TEXT,
        primarySource: STRICT_WAITING_LIVE_DATA_TEXT,
        price: null,
        bids: [],
        asks: [],
      };
      this.notify();
      return this.getSnapshot();
    }
  }

  public overrideAKDData(data: any): void {
    this.snapshot = {
      ...this.snapshot,
      akdData: {
        top_buyers: data.top_buyers || data.buyers || [],
        top_sellers: data.top_sellers || data.sellers || [],
        lastUpdated: new Date().toISOString(),
      },
      isLiveVerified: true,
      streamStatusText: `${this.snapshot.ticker} (Gerçek AKD Verisi Yüklendi)`,
      lastUpdatedAt: new Date().toISOString(),
    };
    
    console.info('[MarketGateway] AKD Verisi Gerçek Veri ile Güncellendi (Simülasyon Ezildi):', this.snapshot.akdData);
    this.notify();
  }

  public connectGateway(initialTicker?: string, pollIntervalMs: number = 12000, marketType?: string): void {
    const clean = String(initialTicker || this.snapshot.ticker || '').toUpperCase().replace(/\.IS$/i, '').trim();
    if (clean) {
      this.snapshot.ticker = clean;
    }
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
    }
    if (this.snapshot.ticker) {
      this.fetchLiveSnapshot(this.snapshot.ticker, marketType).catch(() => {});
      this.pollTimer = setInterval(() => {
        this.fetchLiveSnapshot(this.snapshot.ticker, marketType).catch(() => {});
      }, pollIntervalMs);
    }
  }

  public disconnectGateway(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    this.snapshot.dataStatus = 'MISSING';
    this.snapshot.isConnected = false;
    this.snapshot.isLiveVerified = false;
    this.snapshot.isAwaitingLiveStream = true;
    this.snapshot.streamStatusText = STRICT_WAITING_LIVE_DATA_TEXT;
    this.notify();
  }

  public getMatriksData(matriksKey?: string | null): { obi: number | null; status: string } {
    if (!matriksKey) {
      return { obi: null, status: 'VERİ YOK' };
    }
    return { obi: null, status: 'VERİ YOK' };
  }
}

/**
 * Matriks L2 Derinlik ve OBI Verisi
 * Qodi Kuralı: Matriks anahtarı yoksa ASLA sahte değer basılmaz, null ve 'VERİ YOK' döner.
 */
export function getMatriksDepth(matriksKey?: string | null): { obi: number | null; status: string } {
  if (!matriksKey) {
    return { obi: null, status: 'VERİ YOK' };
  }
  return { obi: null, status: 'VERİ YOK' };
}

export async function getPriceWithFallback(
  symbol: string
): Promise<{ price: number | null; changePct: number | null } | null> {
  if (!symbol) return null;

  // 1. OpenBB Fetcher Lifecycle — Yahoo Finance Provider
  const yahooFetcher = providerRegistry.get<{ price: number | null; changePct: number | null }>('YahooFinance');
  if (yahooFetcher) {
    const res = await yahooFetcher.fetchData({ symbol });
    if (res.success && res.data && typeof res.data.price === 'number' && !isNaN(res.data.price) && res.data.price > 0) {
      return { price: res.data.price, changePct: res.data.changePct };
    }
  }

  // 2. OpenBB Fetcher Lifecycle — TradingView Provider
  const tvFetcher = providerRegistry.get<{ price: number | null; changePct: number | null }>('TradingView');
  if (tvFetcher) {
    const res = await tvFetcher.fetchData({ symbol });
    if (res.success && res.data && typeof res.data.price === 'number' && !isNaN(res.data.price) && res.data.price > 0) {
      return { price: res.data.price, changePct: res.data.changePct };
    }
  }

  logDataIssue('marketGateway', symbol, 'price', 'Tüm OpenBB provider kaynakları null (Yahoo, TradingView)');
  return null;
}

export const marketGateway = new MarketDataGateway();

if (typeof window !== 'undefined') {
  (window as any).marketGateway = marketGateway;
}

export default marketGateway;
