// server/services/dataRuleEngine.ts
/**
 * MT16 QuantMind - DataRuleEngine (Kök Veri Kuralları & Ön Filtre Kapı Bekçisi)
 * 
 * Jüri Tartışma Motoru (juryDebateEngine / jury) öncesinde çalışan "Pre-Filter Gatekeeper".
 * Kural İşletim Hiyerarşisi:
 * 1. CRITICAL / Hard-Stop: Fiyat <= Stop-Loss ise Boğa/Ayı ajanlarını çalıştırmadan doğrudan STOP_EXECUTED kararına kilitler.
 * 2. Veto / Read False: Spoofing, Beneish M-Score veya Boğa Tuzağı riski varsa Jüri tartışmasını iptal edip HOLD kararı verir.
 * 3. Pass: Sadece read === true ve priority !== 'CRITICAL' olduğunda Jüri tartışma motoruna onay verir.
 * 4. Katalizör İllüzyonu & Duvar Erime Hızı kontrolleri ile sahte alımları engeller.
 */

export interface MarketData {
  ticker?: string;
  symbol?: string;
  currentPrice: number;
  entryPrice?: number;
  stopLossPrice?: number;
  isStopLossBreached?: boolean;
  dayChangePct?: number;
  changePct?: number;
  zScore?: number;
  obi?: number;
  cmf20?: number;
  obvSlope?: number;
  spoofingRisk?: number;
  orderCancelRatePct?: number;
  fakeWallDetected?: boolean;
  financials?: {
    altmanZ?: number;
    piotroskiF?: number;
    beneishM?: number;
    peRatio?: number;
  };
  beneishMScore?: number;
  brokerFlow?: {
    bofaNetLot?: number;
    citibankNetLot?: number;
    foreignNetLot?: number;
    topBuyer?: string;
    topSeller?: string;
    brokers?: Array<{ name: string; netLot: number }>;
  };
  bofaNetLot?: number;
  kapSentimentScore?: number;
  kapImpactScore?: number;
  orderBook?: {
    wallLot?: number;
    wallPrice?: number;
    meltTimeMin?: number;
    burnRatePerMin?: number;
    bidDepthTotal?: number;
    askDepthTotal?: number;
    obi?: number;
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
    const currentPrice = Number(marketData.currentPrice || marketData.price || 0);
    const stopLossPrice = Number(marketData.stopLossPrice || marketData.stopLoss || 0);
    const isStopLossBreached = Boolean(marketData.isStopLossBreached);

    // =========================================================================
    // 1. KURAL: CRITICAL / Hard-Stop (Fiyat <= Stop-Loss)
    // =========================================================================
    if ((stopLossPrice > 0 && currentPrice > 0 && currentPrice <= stopLossPrice) || isStopLossBreached) {
      return {
        read: false,
        priority: 'CRITICAL',
        finalVerdict: 'STOP_EXECUTED',
        reason: `🛑 CRITICAL HARD-STOP: Stop-Loss Tetiklendi! Anlık Fiyat (₺${currentPrice.toFixed(2)}) SL seviyesinin (₺${stopLossPrice.toFixed(2)}) altına/seviyesine indi. Ajan tartışması atlandı; acil tasfiye devrede.`,
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

    // =========================================================================
    // 2. KURAL: Beneish M-Score Adli Bilanço Zırhı (Manipülasyon Riski)
    // =========================================================================
    const beneishM = Number(marketData.beneishMScore ?? marketData.financials?.beneishM ?? -2.85);
    // Beneish M > -1.49 ise manipülasyon / bilanço makyaj riski yüksektir
    if (beneishM > -1.49) {
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

    // =========================================================================
    // 3. KURAL: Spoofing ve L2 Mikroyapı İptal Baskısı
    // =========================================================================
    const spoofingRisk = Number(marketData.spoofingRisk ?? 0);
    const orderCancelRatePct = Number(marketData.orderCancelRatePct ?? 0);
    const fakeWallDetected = Boolean(marketData.fakeWallDetected);

    if (spoofingRisk >= 75 || orderCancelRatePct > 75 || fakeWallDetected) {
      return {
        read: false,
        priority: 'HIGH',
        finalVerdict: 'HOLD',
        reason: `🛡️ ÖN FİLTRE VETOSU: L2 Mikroyapı Spoofing / Sahte Kademe İptali Algılandı (%${orderCancelRatePct || spoofingRisk}). Tahta manipülasyonu riski nedeniyle işlem durduruldu.`,
        ruleTriggered: 'SPOOFING_GUARD',
        isPreFiltered: true,
        timestamp,
        details: { spoofingRisk, orderCancelRatePct, fakeWallDetected }
      };
    }

    // =========================================================================
    // 4. KURAL: OBI Nötr Boğa Tuzağı (OBI Neutral Bull Trap / Definite Trap)
    // =========================================================================
    const dayChangePct = Number(marketData.dayChangePct ?? marketData.changePct ?? 0);
    const zScore = Number(marketData.zScore ?? 0);
    const obi = Number(marketData.obi ?? 0);
    const cmf20 = Number(marketData.cmf20 ?? 0);

    if (dayChangePct < 0 && (obi > 0 || zScore > 0) && cmf20 < 0) {
      return {
        read: false,
        priority: 'HIGH',
        finalVerdict: 'HOLD',
        reason: `🛡️ ÖN FİLTRE VETOSU: Boğa Tuzağı (Bull Trap) - Fiyat düşüşte (%${dayChangePct.toFixed(2)}), OBI pozitif (+${obi.toFixed(2)}) ancak CMF negatif (${cmf20.toFixed(2)}). Para çıkışlı sahte tahta baskısı nedeniyle NOHOLD / VETO verildi.`,
        ruleTriggered: 'BULL_TRAP_GUARD',
        isPreFiltered: true,
        timestamp,
        details: { dayChangePct, obi, zScore, cmf20 }
      };
    }

    // =========================================================================
    // 5. KURAL: Katalizör İllüzyonu Engeli (Kurumsal Akış vs KAP)
    // =========================================================================
    const bofaNet = Number(
      marketData.bofaNetLot ??
      marketData.brokerFlow?.bofaNetLot ??
      marketData.brokerFlow?.foreignNetLot ??
      0
    );
    const citibankNet = Number(marketData.brokerFlow?.citibankNetLot ?? 0);
    const institutionalNetLot = bofaNet + citibankNet;
    const kapSentiment = Number(marketData.kapSentimentScore ?? marketData.kapImpactScore ?? 0);

    // Eğer Kurumsal Akış (BofA/Citibank) net satıştaysa (<= -50k lot), KAP etkisi (+15) ne kadar yüksek olursa olsun
    // "Bypass Trend" YAPILAMAZ. Jüri "BEKLE" veya "NOHOLD" vermelidir.
    if (institutionalNetLot <= -50000) {
      return {
        read: false,
        priority: 'HIGH',
        finalVerdict: 'HOLD',
        reason: `🛡️ ÖN FİLTRE VETOSU: Katalizör İllüzyonu Engeli - Kurumsal Akış (BofA/Citibank: ${institutionalNetLot.toLocaleString('tr-TR')} lot) net satıştadır. KAP etkisi (+${kapSentiment || 15}) olsa dahi Bypass Trend engellendi; karar BEKLE / NOHOLD konumuna kilitlendi.`,
        ruleTriggered: 'CATALYST_ILLUSION_GUARD',
        isPreFiltered: true,
        timestamp,
        details: { institutionalNetLot, kapSentiment }
      };
    }

    // =========================================================================
    // 6. KURAL: Duvar Erime Hızı Kontrolü (Tuzak Duvar & TP Ayarı)
    // =========================================================================
    const wallLot = Number(marketData.orderBook?.wallLot ?? 0);
    const wallPrice = Number(marketData.orderBook?.wallPrice ?? 0);
    const burnRatePerMin = Number(marketData.orderBook?.burnRatePerMin ?? 1200);
    const meltTimeMin = Number(marketData.orderBook?.meltTimeMin ?? (burnRatePerMin > 0 && wallLot > 0 ? wallLot / burnRatePerMin : 0));

    let wallTrapDetected = false;
    let adjustedTakeProfit: number | undefined = undefined;

    // Eğer duvarın "Tahmini Erime Süresi" 30 dakikadan fazlaysa (örn: 45 dk), bu duvarı "Tuzak" olarak işaretle.
    // Take-Profit seviyesini duvarın hemen önüne çek (örn: ₺369.25 duvarı varsa, TP'yi ₺368.50 yap).
    if (meltTimeMin > 30 && wallPrice > currentPrice) {
      wallTrapDetected = true;
      // Duvarın hemen 1-2 kademe (yaklaşık ₺0.75 veya %0.20) önüne çek
      adjustedTakeProfit = Number(Math.max(currentPrice * 1.005, wallPrice - 0.75).toFixed(2));
    }

    // =========================================================================
    // 7. GEÇİŞ: Tüm Kök Veri Kuralları Onaylandı
    // =========================================================================
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
