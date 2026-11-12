// src/services/dataRuleEngine.ts
/**
 * MT16 QuantMind - DataRuleEngine (Kök Veri Kuralları & Ön Filtre Kapı Bekçisi - Client/Shared)
 * 
 * Jüri Tartışma Motoru ve Arayüz (LiveJuryBoard / Cubes) için paylaşılan ön filtre kural motoru.
 */

export interface MarketData {
  ticker?: string;
  symbol?: string;
  currentPrice: number | null;
  entryPrice?: number | null;
  stopLossPrice?: number | null;
  isStopLossBreached?: boolean;
  dayChangePct?: number | null;
  changePct?: number | null;
  zScore?: number | null;
  obi?: number | null;
  cmf20?: number | null;
  obvSlope?: number | null;
  spoofingRisk?: number | null;
  orderCancelRatePct?: number | null;
  fakeWallDetected?: boolean;
  financials?: {
    altmanZ?: number;
    piotroskiF?: number;
    beneishM?: number;
    peRatio?: number;
  };
  beneishMScore?: number;
  brokerFlow?: {
    bofaNetLot?: number | null;
    citibankNetLot?: number | null;
    foreignNetLot?: number | null;
    topBuyer?: string;
    topSeller?: string;
    brokers?: Array<{ name: string; netLot: number }>;
  };
  bofaNetLot?: number | null;
  kapSentimentScore?: number | null;
  kapImpactScore?: number | null;
  orderBook?: {
    wallLot?: number | null;
    wallPrice?: number | null;
    meltTimeMin?: number | null;
    burnRatePerMin?: number | null;
    bidDepthTotal?: number | null;
    askDepthTotal?: number | null;
    obi?: number | null;
  };
  [key: string]: any;
}

export interface DecisionRules {
  read: boolean;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'NORMAL';
  finalVerdict: 'STOP_EXECUTED' | 'HOLD' | 'PASS' | 'VETO';
  reason: string;
  ruleTriggered: 'HARD_STOP' | 'SPOOFING_GUARD' | 'BENEISH_FORENSIC_GUARD' | 'BULL_TRAP_GUARD' | 'CATALYST_ILLUSION_GUARD' | 'WALL_MELT_TRAP' | 'DATA_SOURCE_NOHOLD_LOCK' | 'NONE';
  isPreFiltered: boolean;
  dataSource?: 'LIVE' | 'SIMULATION' | 'XML_FEEDER' | string;
  warning?: string;
  adjustedTakeProfit?: number;
  wallTrapDetected?: boolean;
  wallMeltTimeMin?: number;
  timestamp: string;
  details?: Record<string, any>;
}

export class DataRuleEngine {
  /**
   * Kök Veri Kurallarını işletir ve Jüri Ön Filtre sonucunu döner.
   */
  public static applyRules(marketData: MarketData): DecisionRules {
    const timestamp = new Date().toISOString();
    const currentPrice = (marketData.currentPrice ?? marketData.price) ?? null;
    const stopLossPrice = (marketData.stopLossPrice ?? marketData.stopLoss) ?? null;
    const isStopLossBreached = Boolean(marketData.isStopLossBreached);

    // 1. KURAL: CRITICAL / Hard-Stop (Fiyat <= Stop-Loss)
    if (isStopLossBreached || (currentPrice !== null && stopLossPrice !== null && stopLossPrice > 0 && currentPrice <= stopLossPrice)) {
      return {
        read: false,
        priority: 'CRITICAL',
        finalVerdict: 'STOP_EXECUTED',
        reason: `🛑 CRITICAL HARD-STOP: Stop-Loss Tetiklendi! Anlık Fiyat (${currentPrice !== null ? `₺${currentPrice.toFixed(2)}` : 'VERİ YOK'}) SL seviyesinin (${stopLossPrice !== null ? `₺${stopLossPrice.toFixed(2)}` : 'VERİ YOK'}) altına/seviyesine indi. Ajan tartışması atlandı; acil tasfiye devrede.`,
        ruleTriggered: 'HARD_STOP',
        isPreFiltered: true,
        timestamp,
        details: { currentPrice, stopLossPrice }
      };
    }

    // =========================================================================
    // BECERİ 3: Karar Kilidi (NOHOLD / SATIŞ KİLİT)
    // Eğer veri kaynağı "Simülasyon" veya "XML Feeder" ise (yani gerçek zamanlı değilse),
    // Jüri kararı otomatik olarak "NOHOLD / SATIŞ KİLİT" olur. Eksik veriyle AL vermek risklidir.
    // =========================================================================
    const rawSource = String(marketData.dataSource || marketData.source || marketData.provider || '').toUpperCase();
    const isMock = Boolean(marketData.isMock || marketData.is_mock);
    const isExplicitlyNotRealTime = marketData.isRealTime === false || marketData.is_realtime === false;
    const isSimulationOrXml = rawSource.includes('SIMULAT') || rawSource.includes('MOCK') || rawSource.includes('XML') || isMock || isExplicitlyNotRealTime;

    if (isSimulationOrXml) {
      const isXml = rawSource.includes('XML');
      const sourceLabel = isXml ? 'Matriks XML Feeder (Gecikmeli)' : 'Simülasyon (yfinance Yanıt Vermedi)';
      const warningText = isXml ? '⚠️ Veri Kaynağı: XML Feeder (Gecikmeli)' : '⚠️ Veri Kaynağı: Simülasyon (yfinance Yanıt Vermedi)';

      return {
        read: false,
        priority: 'HIGH',
        finalVerdict: 'HOLD',
        reason: `🔒 KARAR KİLİDİ (NOHOLD / SATIŞ KİLİT): Veri kaynağı ${sourceLabel} modundadır. Gerçek zamanlı olmayan veya gecikmeli piyasa verisiyle 'AL' sinyali vermek risklidir. Sistem sermaye koruması amacıyla NOHOLD / SATIŞ KİLİT kararına kilitlendi.`,
        ruleTriggered: 'DATA_SOURCE_NOHOLD_LOCK',
        isPreFiltered: true,
        dataSource: isXml ? 'XML_FEEDER' : 'SIMULATION',
        warning: warningText,
        timestamp,
        details: { rawSource, isRealTime: false }
      };
    }

    // 2. KURAL: Beneish M-Score Adli Bilanço Zırhı
    const beneishM = marketData.beneishMScore ?? marketData.financials?.beneishM ?? null;
    if (beneishM !== null && beneishM > -1.49) {
      return {
        read: false,
        priority: 'HIGH',
        finalVerdict: 'HOLD',
        reason: `🛡️ ÖN FİLTRE VETOSU: Beneish M-Skoru (${beneishM.toFixed(2)} > -1.49) Finansal Tablo Manipülasyon Riski Algılandı. Adli koruma kalkanı devrede; Jüri oturumu kilitlendi.`,
        ruleTriggered: 'BENEISH_FORENSIC_GUARD',
        isPreFiltered: true,
        timestamp,
        details: { beneishM }
      };
    }

    // 3. KURAL: Spoofing ve L2 Mikroyapı İptal Baskısı
    const spoofingRisk = marketData.spoofingRisk ?? null;
    const orderCancelRatePct = marketData.orderCancelRatePct ?? null;
    const fakeWallDetected = Boolean(marketData.fakeWallDetected);

    if ((spoofingRisk !== null && spoofingRisk >= 75) || (orderCancelRatePct !== null && orderCancelRatePct > 75) || fakeWallDetected) {
      const displayVal = orderCancelRatePct !== null ? `%${orderCancelRatePct}` : (spoofingRisk !== null ? `%${spoofingRisk}` : 'VERİ YOK');
      return {
        read: false,
        priority: 'HIGH',
        finalVerdict: 'HOLD',
        reason: `🛡️ ÖN FİLTRE VETOSU: L2 Mikroyapı Spoofing / Sahte Kademe İptali Algılandı (${displayVal}). Tahta manipülasyonu riski nedeniyle işlem durduruldu.`,
        ruleTriggered: 'SPOOFING_GUARD',
        isPreFiltered: true,
        timestamp,
        details: { spoofingRisk, orderCancelRatePct, fakeWallDetected }
      };
    }

    // 4. KURAL: OBI Nötr Boğa Tuzağı (Bull Trap)
    const dayChangePct = marketData.dayChangePct ?? marketData.changePct ?? null;
    const zScore = marketData.zScore ?? null;
    const obi = marketData.obi ?? null;
    const cmf20 = marketData.cmf20 ?? null;

    if (dayChangePct !== null && dayChangePct < 0 && ((obi !== null && obi > 0) || (zScore !== null && zScore > 0)) && cmf20 !== null && cmf20 < 0) {
      return {
        read: false,
        priority: 'HIGH',
        finalVerdict: 'HOLD',
        reason: `🛡️ ÖN FİLTRE VETOSU: Boğa Tuzağı (Bull Trap) - Fiyat düşüşte (%${dayChangePct.toFixed(2)}), OBI pozitif (+${obi !== null ? obi.toFixed(2) : '---'}) ancak CMF negatif (${cmf20.toFixed(2)}). Para çıkışlı sahte tahta baskısı nedeniyle NOHOLD / VETO verildi.`,
        ruleTriggered: 'BULL_TRAP_GUARD',
        isPreFiltered: true,
        timestamp,
        details: { dayChangePct, obi, zScore, cmf20 }
      };
    }

    // 5. KURAL: Katalizör İllüzyonu Engeli (Kurumsal Akış vs KAP)
    const bofaNet = 
      marketData.bofaNetLot ??
      marketData.brokerFlow?.bofaNetLot ??
      marketData.brokerFlow?.foreignNetLot ??
      null;
    const citibankNet = marketData.brokerFlow?.citibankNetLot ?? null;
    
    let institutionalNetLot: number | null = null;
    if (bofaNet !== null && citibankNet !== null) {
      institutionalNetLot = bofaNet + citibankNet;
    } else {
      institutionalNetLot = bofaNet ?? citibankNet;
    }

    const kapSentiment = marketData.kapSentimentScore ?? marketData.kapImpactScore ?? null;

    if (institutionalNetLot !== null && institutionalNetLot <= -50000) {
      return {
        read: false,
        priority: 'HIGH',
        finalVerdict: 'HOLD',
        reason: `🛡️ ÖN FİLTRE VETOSU: Katalizör İllüzyonu Engeli - Kurumsal Akış (BofA/Citibank: ${institutionalNetLot.toLocaleString('tr-TR')} lot) net satıştadır. KAP etkisi (+${kapSentiment !== null ? kapSentiment : '---'}) olsa dahi Bypass Trend engellendi; karar BEKLE / NOHOLD konumuna kilitlendi.`,
        ruleTriggered: 'CATALYST_ILLUSION_GUARD',
        isPreFiltered: true,
        timestamp,
        details: { institutionalNetLot, kapSentiment }
      };
    }

    // 6. KURAL: Duvar Erime Hızı Kontrolü
    const wallLot = marketData.orderBook?.wallLot ?? null;
    const wallPrice = marketData.orderBook?.wallPrice ?? null;
    const burnRatePerMin = marketData.orderBook?.burnRatePerMin ?? null;
    const meltTimeMin = marketData.orderBook?.meltTimeMin ?? (burnRatePerMin !== null && burnRatePerMin > 0 && wallLot !== null && wallLot > 0 ? wallLot / burnRatePerMin : null);

    let wallTrapDetected = false;
    let adjustedTakeProfit: number | undefined = undefined;

    if (meltTimeMin !== null && meltTimeMin > 30 && wallPrice !== null && currentPrice !== null && wallPrice > currentPrice) {
      wallTrapDetected = true;
      adjustedTakeProfit = Number(Math.max(currentPrice * 1.005, wallPrice - 0.75).toFixed(2));
    }

    // 7. GEÇİŞ: Başarılı
    return {
      read: true,
      priority: 'NORMAL',
      finalVerdict: 'PASS',
      reason: 'Tüm kök veri ön filtre kuralları (Hard-Stop, Spoofing, Beneish, Boğa Tuzağı, Kurumsal Akış) onaylandı. Jüri tartışma motoru çalıştırılabilir.',
      ruleTriggered: 'NONE',
      isPreFiltered: false,
      wallTrapDetected,
      wallMeltTimeMin: meltTimeMin,
      adjustedTakeProfit,
      timestamp,
      details: {
        currentPrice,
        dayChangePct,
        obi,
        zScore,
        cmf20,
        bofaNet,
        beneishM,
        meltTimeMin
      }
    };
  }
}
