// src/services/universalMarketScreener.ts
/**
 * MT16 Evrensel Çoklu Piyasa Kuant Tarayıcısı (UniversalMarketScreener)
 * BIST, NASDAQ ve Kripto (Binance/Bybit) varlık evrenini paralel olarak
 * QuantPipelineEnforcer ve 5'li Anomali Motoru (AnomalyAggregator) boru hattından geçirir.
 * Varlıkları compositeAnomalyScore (0-100), Tavan/Pump Potansiyeli, Taban/Dump Riski ve
 * Yapay FOMO Tuzağı durumuna göre filtreler ve sıralar.
 */

import { QuantMarketType } from '../types/market';
import { QuantPipelineEnforcer, RawMarketSnapshot, EnrichedQuantPayload } from './quantPipelineEnforcer';

export interface ScreenerAssetDefinition {
  symbol: string;
  name: string;
  market: QuantMarketType;
  basePrice: number | null;
  sector?: string;
}

export interface ScreenerResultItem {
  symbol: string;
  name: string;
  market: QuantMarketType;
  price: number | null;
  changePct: number | null;
  compositeAnomalyScore: number | null; // 0 - 100
  anomalyTag: string;
  urgencyLevel: string;
  primaryDriver: string;
  decision: string;
  zScore: number | null;
  obi: number | null;
  isPumpPotential: boolean;
  isDumpRisk: boolean;
  isCeilingLocked: boolean;
  isFloorLocked: boolean;
  isFomoTrap: boolean;
  isSpoofingRisk: boolean;
  isQualityValueStock: boolean;
  limitStatusBadge: string;
  synthesizedInsight: string;
  payload: EnrichedQuantPayload;
}

export interface ScreenerFilterOptions {
  market?: QuantMarketType | 'ALL';
  minScore?: number;
  maxScore?: number;
  onlyPumpCandidates?: boolean;
  onlyDumpRisks?: boolean;
  onlyFomoTraps?: boolean;
  onlyQualityValue?: boolean;
  limit?: number;
}

export interface UniversalScreeningReport {
  timestamp: string;
  marketFilter: string;
  totalScanned: number;
  topPumpCandidates: ScreenerResultItem[];
  topDumpRisks: ScreenerResultItem[];
  topFomoTraps: ScreenerResultItem[];
  topQualityValue: ScreenerResultItem[];
  allRanked: ScreenerResultItem[];
}

export const UNIVERSAL_ASSET_UNIVERSE: ScreenerAssetDefinition[] = [
  // BIST Varlık Evreni (BIST 30 / 100 Temsilcileri)
  { symbol: 'THYAO', name: 'Türk Hava Yolları', market: 'BIST', basePrice: null, sector: 'Havacılık' },
  { symbol: 'ASELS', name: 'Aselsan', market: 'BIST', basePrice: null, sector: 'Savunma' },
  { symbol: 'EREGL', name: 'Ereğli Demir Çelik', market: 'BIST', basePrice: null, sector: 'Metal' },
  { symbol: 'GARAN', name: 'Garanti BBVA', market: 'BIST', basePrice: null, sector: 'Bankacılık' },
  { symbol: 'KCHOL', name: 'Koç Holding', market: 'BIST', basePrice: null, sector: 'Holding' },
  { symbol: 'TUPRS', name: 'Tüpraş', market: 'BIST', basePrice: null, sector: 'Enerji' },
  { symbol: 'BIMAS', name: 'BİM Mağazalar', market: 'BIST', basePrice: null, sector: 'Perakende' },
  { symbol: 'AKBNK', name: 'Akbank', market: 'BIST', basePrice: null, sector: 'Bankacılık' },
  { symbol: 'SISE', name: 'Şişecam', market: 'BIST', basePrice: null, sector: 'Cam' },
  { symbol: 'SAHOL', name: 'Sabancı Holding', market: 'BIST', basePrice: null, sector: 'Holding' },

  // NASDAQ Global Teknoloji & Endeks Evreni
  { symbol: 'NVDA', name: 'NVIDIA Corp', market: 'NASDAQ', basePrice: null, sector: 'Yarı İletken' },
  { symbol: 'AAPL', name: 'Apple Inc', market: 'NASDAQ', basePrice: null, sector: 'Tüketici Elektroniği' },
  { symbol: 'MSFT', name: 'Microsoft Corp', market: 'NASDAQ', basePrice: null, sector: 'Bulut & Yazılım' },
  { symbol: 'TSLA', name: 'Tesla Inc', market: 'NASDAQ', basePrice: null, sector: 'Otomotiv & Enerji' },
  { symbol: 'AMZN', name: 'Amazon.com Inc', market: 'NASDAQ', basePrice: null, sector: 'E-Ticaret & AWS' },
  { symbol: 'GOOGL', name: 'Alphabet Inc', market: 'NASDAQ', basePrice: null, sector: 'Arama & Yapay Zeka' },
  { symbol: 'META', name: 'Meta Platforms Inc', market: 'NASDAQ', basePrice: null, sector: 'Sosyal Medya' },
  { symbol: 'AMD', name: 'Advanced Micro Devices', market: 'NASDAQ', basePrice: null, sector: 'Yarı İletken' },
  { symbol: 'QQQ', name: 'Invesco QQQ Trust', market: 'NASDAQ', basePrice: null, sector: 'Endeks ETF' },
  { symbol: 'COIN', name: 'Coinbase Global', market: 'NASDAQ', basePrice: null, sector: 'Kripto Finans' },

  // Kripto (Binance / Bybit) Vadeli & Spot Evreni
  { symbol: 'BTCUSDT', name: 'Bitcoin', market: 'CRYPTO', basePrice: null, sector: 'Layer 1' },
  { symbol: 'ETHUSDT', name: 'Ethereum', market: 'CRYPTO', basePrice: null, sector: 'Smart Contract' },
  { symbol: 'SOLUSDT', name: 'Solana', market: 'CRYPTO', basePrice: null, sector: 'High-Throughput L1' },
  { symbol: 'BNBUSDT', name: 'BNB', market: 'CRYPTO', basePrice: null, sector: 'Borsa Varlığı' },
  { symbol: 'XRPUSDT', name: 'XRP Ripple', market: 'CRYPTO', basePrice: null, sector: 'Ödeme Ağı' },
  { symbol: 'AVAXUSDT', name: 'Avalanche', market: 'CRYPTO', basePrice: null, sector: 'Layer 1' },
  { symbol: 'SUIUSDT', name: 'Sui Network', market: 'CRYPTO', basePrice: null, sector: 'Move L1' },
  { symbol: 'NEARUSDT', name: 'NEAR Protocol', market: 'CRYPTO', basePrice: null, sector: 'AI & Sharding' },
];

export class UniversalMarketScreener {
  /**
   * Deterministik / pseudo-gerçekçi piyasa anlık görüntüsü üretir
   * @deprecated Anayasa gereği canlı veri SSOT üzerinden gelmelidir.
   */
  private static generateLiveSnapshotForAsset(
    asset: ScreenerAssetDefinition,
    dynamicOffset: number = 0
  ): RawMarketSnapshot | null {
    if (asset.basePrice === null) return null;
    let seed = 0;
    for (let i = 0; i < asset.symbol.length; i++) {
      seed = (seed * 37 + asset.symbol.charCodeAt(i)) % 10000;
    }
    const pseudoRand = (offset: number) => {
      const x = Math.sin(seed + offset * 9301 + dynamicOffset) * 49297;
      return x - Math.floor(x);
    };

    const volMultiplier = asset.market === 'CRYPTO' ? 4.5 : asset.market === 'NASDAQ' ? 2.8 : 2.0;
    const priceChangePct = Number(((pseudoRand(1) * 2 - 1) * volMultiplier * 2.2).toFixed(2));
    const spotPrice = Number((asset.basePrice * (1 + priceChangePct / 100)).toFixed(2));

    const zScore = Number(((pseudoRand(2) * 2 - 1) * 2.4).toFixed(2));
    const obi = Number(((pseudoRand(3) * 2 - 1) * 0.65).toFixed(2));
    const stdDev = Number((spotPrice * 0.02).toFixed(2));
    const sma20 = Number((spotPrice - (zScore * stdDev)).toFixed(2));
    const viopPrice = Number((spotPrice * (1 + (pseudoRand(4) * 0.015))).toFixed(2));

    const orderCancelCount = Math.round(10 + pseudoRand(5) * 50);
    const totalOrderCount = Math.round(100 + pseudoRand(6) * 200);
    const wallLot = Math.round((500000 / spotPrice) * (0.8 + pseudoRand(7) * 2.5));
    const wallPrice = Number((spotPrice * (1 + (pseudoRand(8) > 0.5 ? 0.02 : -0.02))).toFixed(2));

    const piotroskiScore = Math.floor(3 + pseudoRand(9) * 6);
    const beneishMScore = Number((-3.0 + pseudoRand(10) * 1.8).toFixed(2));
    const hasKapDisclosure = pseudoRand(11) > 0.45;
    const socialHypeScore = Math.round(20 + pseudoRand(12) * 75);

    let currentDecision = 'BEKLE';
    if (zScore >= 1.2 && obi > 0.15) currentDecision = 'AL';
    else if (zScore >= 2.0 && obi > 0.3) currentDecision = 'GÜÇLÜ AL';
    else if (zScore <= -1.2 && obi < -0.15) currentDecision = 'SAT';

    return {
      symbol: asset.symbol,
      market: asset.market,
      spotPrice,
      viopPrice,
      zScore,
      sma20,
      stdDev,
      timestamp: Date.now(),
      currentDecision,
      priceChangePct,
      hasKapDisclosureLast24h: hasKapDisclosure,
      piotroskiScore,
      beneishMScore,
      peRatio: Number((8 + pseudoRand(13) * 18).toFixed(1)),
      pbRatio: Number((1.2 + pseudoRand(14) * 3.5).toFixed(2)),
      roePct: Number((12 + pseudoRand(15) * 25).toFixed(1)),
      socialHypeScore,
      retailOrderRatioPct: Math.round(35 + pseudoRand(16) * 45),
      orderBook: {
        bidDepthTotal: Math.round(200000 + pseudoRand(17) * 300000),
        askDepthTotal: Math.round(200000 + pseudoRand(18) * 300000),
        obi,
        wallLot,
        wallPrice,
        burnRatePerMin: Math.round(500 + pseudoRand(19) * 1500),
        orderCancelCount,
        totalOrderCount,
      },
      brokerFlow: {
        bofaNetLot: Math.round((pseudoRand(20) * 2 - 1) * 25000),
        brokers: [
          { name: 'Kurumsal Blok A', netLot: Math.round(15000 * pseudoRand(21)), percentage: 40 },
          { name: 'Piyasa Yapıcı B', netLot: Math.round(10000 * pseudoRand(22)), percentage: 30 },
          { name: 'Fon C', netLot: Math.round(8000 * pseudoRand(23)), percentage: 20 },
        ],
        totalVolumeLot: Math.round(100000 + pseudoRand(24) * 200000),
      },
      riskParams: {
        portfolioValue: 100000,
        winRate: 0.62,
        rewardRiskRatio: 2.2,
        volatilityDailyPct: Math.abs(priceChangePct),
        maxAllowedAllocationPct: 20.0,
      },
      latencyMs: Math.round(12 + pseudoRand(25) * 35),
      currentDrawdownPct: Number((pseudoRand(26) * 4.5).toFixed(2)),
    };
  }

  /**
   * Tüm varlıkları QuantPipelineEnforcer üzerinden tarar ve analiz eder
   */
  public static scanAllMarkets(options: ScreenerFilterOptions = {}): UniversalScreeningReport {
    const {
      market = 'ALL',
      minScore = 0,
      maxScore = 100,
      limit = 50,
    } = options;

    let targetAssets = UNIVERSAL_ASSET_UNIVERSE;
    if (market && market !== 'ALL') {
      targetAssets = UNIVERSAL_ASSET_UNIVERSE.filter(a => a.market === market);
    }

    const scannedItems: ScreenerResultItem[] = targetAssets.map((asset) => {
      const snapshot = this.generateLiveSnapshotForAsset(asset);
      if (!snapshot) {
        return null;
      }
      const payload = QuantPipelineEnforcer.processSnapshot(snapshot);
      if (!payload) {
        return null;
      }

      const comp = payload.composite_anomaly;
      const isFomoTrap =
        comp.anomalyLabel === 'YAPAY_FOMO_TUZAGI' ||
        comp.anomalyTag === 'YAPAY_FOMO_TUZAGI' ||
        comp.anomalyLabel === 'SURU_FOMO_ALIS_COSKUSU' ||
        payload.behavioral_herding.fomoRiskScore >= 70;

      const isSpoofingRisk =
        comp.anomalyLabel === 'MIKROYAPI_SPOOFING_BASKISI' ||
        payload.microstructure_anomaly.isSpoofingDetected;

      return {
        symbol: asset.symbol,
        name: asset.name,
        market: asset.market,
        price: payload.price,
        changePct: snapshot.priceChangePct ?? null,
        compositeAnomalyScore: comp.compositeAnomalyScore,
        anomalyTag: comp.anomalyTag,
        urgencyLevel: comp.urgencyLevel,
        primaryDriver: comp.primaryDriver,
        decision: snapshot.currentDecision,
        zScore: snapshot.zScore,
        obi: payload.raw_metrics.obi,
        isPumpPotential: payload.market_dynamics.isPumpPotential,
        isDumpRisk: payload.market_dynamics.isDumpRisk,
        isCeilingLocked: payload.market_dynamics.isCeilingLocked,
        isFloorLocked: payload.market_dynamics.isFloorLocked,
        isFomoTrap,
        isSpoofingRisk,
        isQualityValueStock: payload.value_quality_anomaly.isQualityValueStock,
        limitStatusBadge: payload.market_dynamics.statusBadge,
        synthesizedInsight: comp.synthesizedInsight,
        payload,
      };
    }).filter(x => x !== null) as ScreenerResultItem[];

    // Filtreleme (skor aralığı)
    const filtered = scannedItems.filter(
      item => item.compositeAnomalyScore !== null && item.compositeAnomalyScore >= minScore && item.compositeAnomalyScore <= maxScore
    );

    // Sıralı tüm liste (Bileşik anomali skoruna göre azalan)
    const allRanked = [...filtered].sort((a, b) => {
      const sA = a.compositeAnomalyScore;
      const sB = b.compositeAnomalyScore;
      if (sA === null) return 1;
      if (sB === null) return -1;
      return sB - sA;
    }).slice(0, limit);

    // 1. Top Tavan / Pump Adayları (Tavan potansiyeli + Z-Skor pozitif + sahte duvar olmayanlar)
    const topPumpCandidates = [...filtered]
      .filter(i => (i.isPumpPotential || (i.changePct !== null && i.changePct >= 4.0) || (i.zScore !== null && i.zScore >= 1.5)) && !i.isFomoTrap)
      .sort((a, b) => {
        if (a.changePct === null) return 1;
        if (b.changePct === null) return -1;
        return b.changePct - a.changePct;
      })
      .slice(0, 5);

    // 2. Top Taban / Dump Riskleri (Taban riski + negatif Z-skor + satış baskısı)
    const topDumpRisks = [...filtered]
      .filter(i => i.isDumpRisk || (i.changePct !== null && i.changePct <= -3.5) || (i.zScore !== null && i.zScore <= -1.5))
      .sort((a, b) => {
        if (a.changePct === null) return 1;
        if (b.changePct === null) return -1;
        return a.changePct - b.changePct;
      })
      .slice(0, 5);

    // 3. Top Yapay FOMO Tuzakları (Haber olmadan aşırı sürü veya spoofing)
    const topFomoTraps = [...filtered]
      .filter(i => i.isFomoTrap || i.isSpoofingRisk)
      .sort((a, b) => {
        const sA = a.compositeAnomalyScore;
        const sB = b.compositeAnomalyScore;
        if (sA === null) return 1;
        if (sB === null) return -1;
        return sB - sA;
      })
      .slice(0, 5);

    // 4. Top Kaliteli Değer Hisseleri (Piotroski >= 7 + İskontolu)
    const topQualityValue = [...filtered]
      .filter(i => i.isQualityValueStock)
      .sort((a, b) => b.payload.value_quality_anomaly.qualityScore - a.payload.value_quality_anomaly.qualityScore)
      .slice(0, 5);

    return {
      timestamp: new Date().toISOString(),
      marketFilter: market,
      totalScanned: scannedItems.length,
      topPumpCandidates,
      topDumpRisks,
      topFomoTraps,
      topQualityValue,
      allRanked,
    };
  }
}
