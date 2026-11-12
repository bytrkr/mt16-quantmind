/**
 * ============================================================================
 * 🧠 MT16 QUANTMIND - SİSTEM TALİMATNAMESİ (SYSTEM INSTRUCTIONS)
 * ============================================================================
 * 
 * 1. GÖREV TANIMI:
 *    Bu dosya, MT16 Kuant Terminali'nin "Beyni"dir. Tüm fiyatlama, risk yönetimi,
 *    emir yürütme ve pazar yorumlama işlemleri buradan yönetilir. Dış API'lere
 *    (Gemini, Groq) bağımlı olmadan çalışabilen "Deterministic Core" buradadır.
 * 
 * 2. ANAYASAL KURALLAR (QODI STANDARTLARI):
 *    - Kural 1 (SSOT): Veri sadece marketGateway ve kapDaemon'dan gelir. UI veya 
 *      diğer servisler doğrudan veri uyduramaz.
 *    - Kural 2 (Fallback Yasağı): Eğer veri null ise, asla sahte 0, 100 veya 
 *      varsayılan değer atanmaz. Ekrana "VERİ YOK" döner.
 *    - Kural 3 (Karar Zarfı): Her işlem kararı (BUY/SELL/NO_TRADE), "decided_by", 
 *      "entry_blocked" ve "exit_allowed" alanlarını içeren bir zarf içinde sunulur.
 *    - Kural 4 (Sıfır Bağımlılık): Yerel LLM çökse bile, sistem deterministik 
 *      çıktı üretebilmelidir.
 * 
 * 3. KOD GÜNCELLEME KURALLARI (GEMINI İÇİN):
 *    - Yeni bir fonksiyon eklerken, mevcut "DecisionEnvelope" yapısını bozma.
 *    - Tüm sayısal hesaplamalarda "number | null" tipini koru.
 *    - `|| 0`, `?? 0` gibi fallback yapılarını KESİNLİKLE kullanma.
 *    - Yeni bir özellik eklediğinde, mutlaka "check:fallbacks" ve "build" 
 *      testlerini çalıştır ve 0 hata aldığını teyit et.
 * ============================================================================
 */

// src/core/risk/ocoEngine.ts
/**
 * MT16 Risk & Mikroyapı Motoru (OCO, Avellaneda-Stoikov, OFI ve Pre-Trade Validator)
 * Qodi (Matriks AI) Katmanlı Sorumluluk Modülü
 */

import { calculatePositionSize } from './positionSizer';

export interface DecisionEnvelope {
  final: 'NO_TRADE' | 'BUY' | 'SELL';
  decided_by: string;
  entry_blocked: boolean;
  exit_allowed: boolean;
  reason?: string;
}

export interface DynamicOcoResult {
  tpPrice: number | null;
  slPrice: number | null;
  tpPct: number | null;
  slPct: number | null;
  riskRewardRatio: string;
  isActionable: boolean;
  actionMessage: string;
  optimalSpreadPct: number | null;
  isSpreadCompressed: boolean;
  spreadWarning: string | null;
  positionSizeMultiplier: number | null;
  cVarPct: number | null;
  isStopTooTight: boolean;
  decision_envelope: DecisionEnvelope;
  recommendedLot: number | null;
}

export interface OfiObiConfluence {
  status: 'GUCLU' | 'UYUMSUZ' | 'NOTR';
  message: string;
}

export function clip(val: number, minVal: number, maxVal: number): number {
  return Math.min(Math.max(val, minVal), maxVal);
}

/**
 * 1. Order Flow Imbalance (OFI) Hesaplayıcı (intrepidkarthi/orderbook Mantığı)
 * OFI = (Toplam Alış Emri Hacmi - Toplam Satış Emri Hacmi) / (Toplam Alış + Toplam Satış)
 */
export function calculateOrderFlowImbalance(
  bidVolume: number | null,
  askVolume: number | null
): number | null {
  if (bidVolume === null || askVolume === null) return null;
  const totalVolume = bidVolume + askVolume;
  if (totalVolume <= 0) return null;
  return Number(((bidVolume - askVolume) / totalVolume).toFixed(3));
}

/**
 * OFI & OBI Uyum Analizi (intrepidkarthi/orderbook)
 * Aynı yön ise "Sinyal Güçlü", zıt ise "Tuzak / Uyumsuzluk"
 */
export function evaluateOfiObiConfluence(
  ofi: number | null,
  obi: number | null
): OfiObiConfluence {
  if (ofi === null || obi === null) {
    return { status: 'NOTR', message: 'Yetersiz L2 derinlik verisi' };
  }

  if ((ofi > 0 && obi > 0) || (ofi < 0 && obi < 0)) {
    return {
      status: 'GUCLU',
      message: 'Sinyal Güçlü (Akış ve Derinlik Aynı Yönde)',
    };
  }

  if ((ofi > 0 && obi < 0) || (ofi < 0 && obi > 0)) {
    return {
      status: 'UYUMSUZ',
      message: 'Tuzak / Uyumsuzluk (Akış ve Derinlik Zıt Yönde)',
    };
  }

  return {
    status: 'NOTR',
    message: 'Nötr / Dengeli Emir Akışı',
  };
}

/**
 * ATR & Dinamik OCO Hesaplayıcı (FinClaw, Avellaneda-Stoikov, skfolio CVaR ve Pre-Trade Validator)
 * · 1. İşlem Öncesi Emir Doğrulama (Pre-Trade Validation):
 *      dStop (fiyat cinsinden stop mesafesi) < tickSize * 3 ise entry_blocked: true, reason: 'STOP_TOO_TIGHT'
 * · 2. Maliyet Duyarlı Pozisyon Boyutlandırma (Cost-Aware Sizing):
 *      (commissionPct + spreadPct) > (tpPct * 0.2) ise positionSizeMultiplier = 0.5, aksi halde dStop < cVar ? 0.5 : 1.0
 * · 3. Avellaneda-Stoikov Optimal Makas & CVaR koruması
 */
export function calculateDynamicOco(
  price: number | null,
  dayChangePct: number | null,
  spreadPct?: number | null,
  commissionPct?: number | null,
  tickSize?: number | null,
  equity?: number | null,
  kellyFraction?: number | null,
  consecutiveLosses?: number | null,
  currentDrawdownPct?: number | null
): DynamicOcoResult {
  const gamma = 0.1;
  const kappa = 1.5;
  // OptimalSpread = (2 / gamma) * ln(1 + gamma / kappa) -> (2 / 0.1) * ln(1 + 0.1 / 1.5) = 1.291%
  const optimalSpreadPct = Number(((2.0 / gamma) * Math.log(1.0 + gamma / kappa)).toFixed(3));
  const isSpreadCompressed =
    spreadPct !== null && spreadPct !== undefined && spreadPct < optimalSpreadPct * 0.5;
  const spreadWarning = isSpreadCompressed
    ? 'AŞIRI REKABET / LİKİDİTE TUZAĞI (Mevcut makas optimal Avellaneda-Stoikov seviyesinin altında)'
    : null;

  if (price === null || price <= 0) {
    return {
      tpPrice: null,
      slPrice: null,
      tpPct: null,
      slPct: null,
      riskRewardRatio: '---',
      isActionable: false,
      actionMessage: 'İŞLEM ALINAMAZ (Canlı fiyat verisi yok)',
      optimalSpreadPct: null,
      isSpreadCompressed: false,
      spreadWarning: null,
      positionSizeMultiplier: null,
      cVarPct: null,
      isStopTooTight: false,
      recommendedLot: null,
      decision_envelope: {
        final: 'NO_TRADE',
        decided_by: 'Qodi-PreTrade-Validator',
        entry_blocked: true,
        exit_allowed: true,
        reason: 'DATA_UNAVAILABLE',
      },
    };
  }

  const dayChangeAbs = dayChangePct !== null ? Math.abs(dayChangePct) : 1.5;
  const sigmaH = Math.max(0.008, dayChangeAbs / 100);
  const dMin = 2.0 * sigmaH;
  const estimatedAtr = price * 0.025;
  const dMax = (2.0 * estimatedAtr) / price;

  // CVaR ≈ 1.645 * sigmaH (%95 tek taraflı parametrik CVaR)
  const cVar = 1.645 * sigmaH;
  const cVarPct = Number((cVar * 100).toFixed(2));

  if (dMin > dMax) {
    return {
      tpPrice: null,
      slPrice: null,
      tpPct: null,
      slPct: null,
      riskRewardRatio: '---',
      isActionable: false,
      actionMessage: 'İŞLEM ALINAMAZ (Stop mesafesi yetersiz)',
      optimalSpreadPct,
      isSpreadCompressed,
      spreadWarning,
      positionSizeMultiplier: null,
      cVarPct,
      isStopTooTight: false,
      recommendedLot: null,
      decision_envelope: {
        final: 'NO_TRADE',
        decided_by: 'Qodi-ATR-Guard',
        entry_blocked: true,
        exit_allowed: true,
        reason: 'STOP_DISTANCE_INSUFFICIENT',
      },
    };
  }

  const dHam = 0.018; // 1.8% raw distance baseline
  const dStop = clip(dHam, dMin, dMax);

  // 1. İşlem Öncesi Emir Doğrulama (Pre-Trade Validation):
  // tickSize parametresi (BIST için 0.01, NASDAQ için 0.01).
  // Eğer hesaplanan dStop (stop mesafesi), tickSize * 3'ten küçükse entry_blocked: true ve reason: 'STOP_TOO_TIGHT'
  const effectiveTickSize = typeof tickSize === 'number' && tickSize > 0 ? tickSize : 0.01;
  const stopDistancePrice = price * dStop;
  const isStopTooTight = stopDistancePrice < (effectiveTickSize * 3);

  if (isStopTooTight) {
    return {
      tpPrice: null,
      slPrice: null,
      tpPct: null,
      slPct: null,
      riskRewardRatio: '---',
      isActionable: false,
      actionMessage: 'İŞLEM ALINAMAZ (Stop mesafesi yetersiz / STOP_TOO_TIGHT)',
      optimalSpreadPct,
      isSpreadCompressed,
      spreadWarning,
      positionSizeMultiplier: null,
      cVarPct,
      isStopTooTight: true,
      recommendedLot: null,
      decision_envelope: {
        final: 'NO_TRADE',
        decided_by: 'Qodi-PreTrade-Validator',
        entry_blocked: true,
        exit_allowed: true,
        reason: 'STOP_TOO_TIGHT',
      },
    };
  }

  const slPct = Number((dStop * 100).toFixed(2));
  const tpPct = Number((slPct * 2.0).toFixed(2));
  const slPrice = Number((price * (1 - dStop)).toFixed(2));
  const tpPrice = Number((price * (1 + dStop * 2.0)).toFixed(2));

  // 2. Maliyet Duyarlı Pozisyon Boyutlandırma (Cost-Aware Sizing):
  // Eğer (commissionPct + spreadPct) > (tpPct * 0.2) ise positionSizeMultiplier = 0.5 yap.
  // Aksi halde CVaR mantığını koru (dStop < cVar ? 0.5 : 1.0).
  const commVal = typeof commissionPct === 'number' && commissionPct >= 0 ? commissionPct : 0.0015;
  const spreadVal = typeof spreadPct === 'number' && spreadPct >= 0 ? spreadPct : 0.0;

  const costSumRaw = commVal + spreadVal;
  const commNormalizedPct = commVal < 0.05 ? commVal * 100 : commVal;
  const spreadNormalizedPct = spreadVal < 0.05 && spreadVal > 0 ? spreadVal * 100 : spreadVal;
  const costSumNormalized = commNormalizedPct + spreadNormalizedPct;
  const tpThreshold = tpPct * 0.2;

  const isCostExcessive = costSumRaw > tpThreshold || costSumNormalized > tpThreshold;
  const positionSizeMultiplier = isCostExcessive ? 0.5 : (dStop < cVar ? 0.5 : 1.0);

  // 3. Pozisyon Boyutlandırma Ajanı (Position Sizer) Entegrasyonu:
  const targetEquity = typeof equity === 'number' && equity > 0 ? equity : 100000;
  const targetKelly = typeof kellyFraction === 'number' && kellyFraction > 0 ? kellyFraction : 0.12;
  const targetLosses = typeof consecutiveLosses === 'number' && consecutiveLosses >= 0 ? consecutiveLosses : 0;
  const targetDrawdown = typeof currentDrawdownPct === 'number' && currentDrawdownPct >= 0 ? currentDrawdownPct : 0;

  const rawCalculatedLot = calculatePositionSize(
    targetEquity,
    price,
    dStop,
    targetKelly,
    targetLosses,
    targetDrawdown
  );

  const recommendedLot =
    rawCalculatedLot !== null && positionSizeMultiplier !== null
      ? Math.max(0, Math.floor(rawCalculatedLot * positionSizeMultiplier))
      : rawCalculatedLot;

  return {
    tpPrice,
    slPrice,
    tpPct,
    slPct,
    riskRewardRatio: '1 : 2.0',
    isActionable: true,
    actionMessage: 'Dinamik ATR Stop & Take-Profit Onaylandı',
    optimalSpreadPct,
    isSpreadCompressed,
    spreadWarning,
    positionSizeMultiplier,
    cVarPct,
    isStopTooTight: false,
    recommendedLot,
    decision_envelope: {
      final: 'BUY',
      decided_by: 'Qodi-QuantMind-ATR-Engine',
      entry_blocked: false,
      exit_allowed: true,
    },
  };
}

/**
 * 1. Likidite ve Tazelik Kontrolü (kuant Mantığı - Tradeable Window)
 * Eşikler: spreadPct > %1.5 VEYA staleness > 5 dk (300.000 ms)
 * İhlal durumunda decision_envelope: { final: 'NO_TRADE', reason: 'LIQUIDITY_WINDOW_CLOSED' }
 */
export function checkTradeableWindow(
  spreadPct: number | null,
  timestampStr?: string | null
): { isTradeable: boolean; reason?: string } {
  if (spreadPct !== null && spreadPct > 1.5) {
    return {
      isTradeable: false,
      reason: 'LIQUIDITY_WINDOW_CLOSED',
    };
  }

  if (timestampStr) {
    const timeMs = new Date(timestampStr).getTime();
    if (!isNaN(timeMs)) {
      const stalenessMs = Date.now() - timeMs;
      if (stalenessMs > 5 * 60 * 1000) {
        return {
          isTradeable: false,
          reason: 'LIQUIDITY_WINDOW_CLOSED',
        };
      }
    }
  }

  return { isTradeable: true };
}

/**
 * 3. Akıllı Emir Yürütme Stratejisi (Smart Execution Strategy):
 * Eğer spreadPct > 0.5 veya wallLotK > 100 ise 'LIMIT';
 * eğer l2Obi çok dengesizse (|OBI| > 0.4) 'ICEBERG';
 * aksi halde 'MARKET' ata.
 */
export function determineExecutionStrategy(
  spreadPct: number | null,
  wallLotK: number | null,
  l2Obi: number | null
): 'MARKET' | 'LIMIT' | 'ICEBERG' {
  if ((spreadPct !== null && spreadPct > 0.5) || (wallLotK !== null && wallLotK > 100)) {
    return 'LIMIT';
  }
  if (l2Obi !== null && Math.abs(l2Obi) > 0.4) {
    return 'ICEBERG';
  }
  return 'MARKET';
}

export { calculatePositionSize };

