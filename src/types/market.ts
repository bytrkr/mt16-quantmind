export type DataStatus = 'MISSING' | 'STALE' | 'UNCOMPUTABLE' | 'ERROR' | 'OK';

export interface MarketDataEnvelope<T> {
  data: T | null;
  status: DataStatus;
  asOf: string;
  source: string;
  error?: string;
}

// src/types/market.ts
/**
 * MT16 Çoklu Piyasa & Evrensel Limit Dinamikleri Tipleri
 * BIST (%10 tavan/taban devre kesici), NASDAQ (LULD / serbest kırılım) ve
 * Kripto (limitsiz volatilite, likidasyon duvarı, 7/24 kesintisiz seans) adaptörü.
 */

export type QuantMarketType = 'BIST' | 'NASDAQ' | 'CRYPTO';

export type PriceBandModel =
  | 'FIXED_10_PCT' // BIST sabit %10 tavan/taban ve otomatik seans devre kesici
  | 'CIRCUIT_BREAKER_LULD' // NASDAQ Limit-Up/Limit-Down ve Seans Sonrası (After-Hours)
  | 'UNLIMITED_VOLATILITY'; // Kripto (Binance/Bybit) limitsiz pump/dump & likidasyon kaskadı

export type LiquidationRiskModel =
  | 'NONE'
  | 'LEVERAGE_MARGIN_CALL'
  | 'PERPETUAL_CASCADE';

export interface MarketLimitDynamics {
  market: QuantMarketType;
  priceBandModel: PriceBandModel;
  ceilingPrice?: number | null; // BIST tavan fiyatı
  floorPrice?: number | null; // BIST taban fiyatı
  distanceToCeilingPct?: number | null; // Tavana kalan % mesafe
  distanceToFloorPct?: number | null; // Tabana kalan % mesafe
  circuitBreakerThresholdPct: number | null; // Devre kesici eşiği
  isCeilingLocked: boolean; // Tavan kilit (BIST +%9.8+)
  isFloorLocked: boolean; // Taban kilit (BIST -%9.8-)
  isPumpPotential: boolean; // Tavan / Pump adayı
  isDumpRisk: boolean; // Taban / Dump riski
  isAfterHoursActive: boolean; // NASDAQ After-Hours veya Pre-Market
  liquidationModel: LiquidationRiskModel;
  sessionDescription: string;
  statusBadge: string;
}

/**
 * Piyasa bazlı dinamikleri ve limit/kırılım yakınlığını hesaplayan adaptör
 * Qodi Kuralı: Sahte currentPrice = 100 varsayılanı KALDIRILDI. Veri yoksa 'İŞLEM DURDURULDU (VERİ YOK)' dönülür.
 */
export function calculateMarketLimitDynamics(
  market: QuantMarketType = 'BIST',
  currentPrice: number | null = null,
  dayChangePct: number | null = null,
  referenceClosePrice?: number
): MarketLimitDynamics {
  if (currentPrice === null || currentPrice <= 0) {
    return {
      market,
      priceBandModel: market === 'BIST' ? 'FIXED_10_PCT' : market === 'NASDAQ' ? 'CIRCUIT_BREAKER_LULD' : 'UNLIMITED_VOLATILITY',
      circuitBreakerThresholdPct: null,
      isCeilingLocked: false,
      isFloorLocked: false,
      isPumpPotential: false,
      isDumpRisk: false,
      isAfterHoursActive: false,
      liquidationModel: 'NONE',
      sessionDescription: 'Canlı Piyasa Verisi Bekleniyor...',
      statusBadge: 'İŞLEM DURDURULDU (VERİ YOK)'
    };
  }

  const basePrice = referenceClosePrice && referenceClosePrice > 0
    ? referenceClosePrice
    : (dayChangePct !== null ? currentPrice / (1 + (dayChangePct / 100)) : null);

  if (market === 'BIST') {
    const ceilingPrice = basePrice !== null ? Number((basePrice * 1.10).toFixed(2)) : null;
    const floorPrice = basePrice !== null ? Number((basePrice * 0.90).toFixed(2)) : null;
    const distanceToCeilingPct = (ceilingPrice !== null) ? Number(((ceilingPrice - currentPrice) / currentPrice * 100).toFixed(2)) : null;
    const distanceToFloorPct = (floorPrice !== null) ? Number(((currentPrice - floorPrice) / currentPrice * 100).toFixed(2)) : null;
    
    const isCeilingLocked = dayChangePct !== null && dayChangePct >= 9.85;
    const isFloorLocked = dayChangePct !== null && dayChangePct <= -9.85;
    const isPumpPotential = dayChangePct !== null && dayChangePct >= 6.5 && !isCeilingLocked;
    const isDumpRisk = dayChangePct !== null && dayChangePct <= -6.0 && !isFloorLocked;

    return {
      market: 'BIST',
      priceBandModel: 'FIXED_10_PCT',
      ceilingPrice,
      floorPrice,
      distanceToCeilingPct: distanceToCeilingPct !== null ? Math.max(0, distanceToCeilingPct) : null,
      distanceToFloorPct: distanceToFloorPct !== null ? Math.max(0, distanceToFloorPct) : null,
      circuitBreakerThresholdPct: 5.0, // BIST endeks/hisse devre kesici eşiği %5
      isCeilingLocked,
      isFloorLocked,
      isPumpPotential,
      isDumpRisk,
      isAfterHoursActive: false,
      liquidationModel: 'NONE',
      sessionDescription: 'BIST 10:00 - 18:10 (Sabit ±%10 Bant & Devre Kesici)',
      statusBadge: isCeilingLocked
        ? '🔴 TAVAN KİLİT (%+10)'
        : isFloorLocked
        ? '🔴 TABAN KİLİT (%-10)'
        : isPumpPotential
        ? '🚀 TAVAN ADAYI'
        : isDumpRisk
        ? '⚠️ TABAN / DEVRE KESİCİ RİSKİ'
        : '🟢 NORMAL BANT',
    };
  }

  if (market === 'NASDAQ') {
    const isPumpPotential = dayChangePct !== null && dayChangePct >= 8.0;
    const isDumpRisk = dayChangePct !== null && dayChangePct <= -7.5;

    // Saat kontrolü (Basit simülasyon: UTC saatine göre after hours veya normal)
    const nowHour = new Date().getUTCHours();
    const isAfterHoursActive = nowHour < 13 || nowHour >= 20;

    return {
      market: 'NASDAQ',
      priceBandModel: 'CIRCUIT_BREAKER_LULD',
      circuitBreakerThresholdPct: 7.0, // LULD Kademe 1 %7
      isCeilingLocked: false,
      isFloorLocked: false,
      isPumpPotential,
      isDumpRisk,
      isAfterHoursActive,
      liquidationModel: 'LEVERAGE_MARGIN_CALL',
      sessionDescription: isAfterHoursActive
        ? 'NASDAQ After-Hours / Pre-Market (Geniş Makas & Düşük Likidite)'
        : 'NASDAQ Regular Hours (LULD & SEC Devre Kesici)',
      statusBadge: isPumpPotential
        ? '🚀 MOMENTUM BREAKOUT'
        : isDumpRisk
        ? '⚠️ SERT KIRILIM RİSKİ'
        : isAfterHoursActive
        ? '🌙 AFTER-HOURS'
        : '🟢 SEANS AÇIK',
    };
  }

  // CRYPTO
  const isPumpPotential = dayChangePct !== null && dayChangePct >= 12.0;
  const isDumpRisk = dayChangePct !== null && dayChangePct <= -10.0;

  return {
    market: 'CRYPTO',
    priceBandModel: 'UNLIMITED_VOLATILITY',
    circuitBreakerThresholdPct: 0,
    isCeilingLocked: false,
    isFloorLocked: false,
    isPumpPotential,
    isDumpRisk,
    isAfterHoursActive: false,
    liquidationModel: 'PERPETUAL_CASCADE',
    sessionDescription: '7/24 Kesintisiz Piyasa (Limitsiz Volatilite & Kaskat Likidasyon)',
    statusBadge: isPumpPotential
      ? '🔥 PUMP DALGASI'
      : isDumpRisk
      ? '🚨 DUMP / LİKİDASYON KASKADI'
      : '⚡ 7/24 CANLI',
  };
}

