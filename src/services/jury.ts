// src/services/jury.ts
/**
 * MT16 Kuant Terminali - Hiyerarşik Çapraz Doğrulama Jüri Konsensüs Motoru
 * 
 * DataRuleEngine Ön Filtre Entegrasyonu & Jüri Override:
 * - Jüri ana karar fonksiyonunun EN BAŞINA DataRuleEngine.applyRules(marketData) kontrolü yerleştirilmiştir.
 * - Kural İşletim Hiyerarşisi:
 *   1. CRITICAL / Hard-Stop: Fiyat <= Stop-Loss ise STOP_EXECUTED ile acil tasfiyeye kilitler.
 *   2. Veto / Read False (Spoofing veya Beneish M-Score Riski): Jüri tartışmasını tamamen iptal eder, kararı HOLD/VETO konumuna çeker.
 *   3. Pass (Geçiş Onayı): Sadece read === true ve priority !== 'CRITICAL' olduğunda 4 katmanlı Jüri motorunu çalıştırır.
 */

import { MicrostructureMetrics } from './microstructure';
import { OrderflowMetrics } from './orderflow';
import { DataRuleEngine } from './dataRuleEngine';
import type { MarketData, DecisionRules } from './dataRuleEngine';

export { DataRuleEngine };
export type { MarketData, DecisionRules };

export interface Financials {
  altmanZ: number;
  piotroskiF: number;
  beneishM: number;
  peRatio?: number;
}

export interface MarketMetrics {
  microstructure: MicrostructureMetrics;
  orderflow: OrderflowMetrics;
  financials: Financials;
  volumeZScore: number | null; // e.g. +2.5σ
  kapSentimentScore: number | null; // 0 - 100
  candlestickScore?: number | null; // 0 - 100 (%20 ağırlık)
  candlestickPattern?: string | null;
  shortInterestPct?: number | null; // e.g. 15%
  currentPrice?: number | null;
  entryPrice?: number | null;
  stopLossPrice?: number | null;
  isStopLossBreached?: boolean | null;
  dayChangePct?: number | null;
  orderCancelRatePct?: number | null;
  bofaNetLot?: number | null;
  wallLot?: number | null;
  wallPrice?: number | null;
  meltTimeMin?: number | null;
  burnRatePerMin?: number | null;
  dataSource?: 'LIVE' | 'SIMULATION' | 'XML_FEEDER' | string;
  source?: string;
  isRealTime?: boolean;
  isMock?: boolean;
  warning?: string;
}

export interface TrapShieldResult {
  trapFlag: boolean;
  trapType: 'BULL_TRAP' | 'BEAR_TRAP' | 'NONE';
  confidenceMultiplier: number; // 0.25 if trapFlag else 1.0
  timeframeMismatch: boolean;
  reason: string;
}

export interface JuryDecision {
  score: number | null; // 0 - 100
  consensusReached: boolean | null; // 5=5 kuralı
  verdict: 'STRONG_BUY' | 'ACCUMULATION' | 'NEUTRAL' | 'DISTRIBUTION' | 'STRONG_SELL' | 'TRAP_ALERT' | 'SHORT_SQUEEZE' | 'STOP_EXECUTED' | 'HOLD' | 'VETO' | 'UNAVAILABLE';
  isHardStop: boolean | null;
  isDistributionLock: boolean | null;
  isPreFiltered?: boolean;
  preFilterResult?: DecisionRules;
  systemStatus: string;
  dataSource?: string;
  warning?: string;
  trapShieldResult?: TrapShieldResult;
  layerWeights: {
    l2: number;          // 0.30
    forensic: number;    // 0.25
    volume: number;      // 0.15
    nlp: number;         // 0.10
    candlestick: number; // 0.20 (%20 Mum Formasyonu Ajanı)
  };
  layerScores: {
    l2: number | null;
    forensic: number | null;
    volume: number | null;
    nlp: number | null;
    candlestick: number | null;
  };
  warnings: string[];
  rationale: string;
}

export class JuryEngine {
  public readonly layerWeights = {
    l2: 0.30,
    forensic: 0.25,
    volume: 0.15,
    nlp: 0.10,
    candlestick: 0.20 // %20 Mum Formasyonu Ajanı Ağırlığı
  };

  /**
   * Tuzak Kalkanı (Arbiter): Formasyon yönü ile Yabancı Net Akışı (BofA/Citi) ve L2 OBI arasındaki çelişkiyi denetler.
   * - AL formasyonu var ama yabancı akışı veya OBI negatifse -> Boğa Tuzağı (0.25x güven çarpanı)
   * - SAT formasyonu var ama yabancı akışı veya OBI pozitifse -> Ayı Tuzağı (0.25x güven çarpanı)
   * - Eğer zaman dilimi uyumsuzluğu varsa (5H/1D vs AKD/OBI ufku) ceza uygulanmaz.
   */
  public evaluateTrapShield(
    patternDir: 'BULLISH' | 'BEARISH' | 'AL' | 'SAT' | string | null,
    foreignNetFlow: number | null,
    obiImbalance: number | null,
    options?: { patternTimeframe?: string; dataTimeframe?: string }
  ): TrapShieldResult {
    if (!patternDir || patternDir === 'NEUTRAL' || patternDir === 'PAS') {
      return {
        trapFlag: false,
        trapType: 'NONE',
        confidenceMultiplier: 1.0,
        timeframeMismatch: false,
        reason: 'Nötr formasyon veya yön belirtilmedi.',
      };
    }

    const patternTf = options?.patternTimeframe ?? null;
    const dataTf = options?.dataTimeframe ?? null;
    const isTimeframeMismatch = patternTf !== null && dataTf !== null && patternTf !== dataTf;

    if (isTimeframeMismatch) {
      return {
        trapFlag: false,
        trapType: 'NONE',
        confidenceMultiplier: 1.0,
        timeframeMismatch: true,
        reason: `Zaman ufku uyumsuzluğu (${patternTf} vs ${dataTf}): AKD/OBI tuzak cezası uygulanmadı.`,
      };
    }

    const isBullish = patternDir === 'BULLISH' || patternDir === 'AL';
    const isBearish = patternDir === 'BEARISH' || patternDir === 'SAT';

    let trapFlag = false;
    let trapType: 'BULL_TRAP' | 'BEAR_TRAP' | 'NONE' = 'NONE';
    let reason = 'Tuzak algılanmadı (AKD & OBI uyumlu).';

    if (isBullish) {
      const isForeignNegative = foreignNetFlow !== null && foreignNetFlow < 0;
      const isObiNegative = obiImbalance !== null && obiImbalance < 0;
      if (isForeignNegative || isObiNegative) {
        trapFlag = true;
        trapType = 'BULL_TRAP';
        reason = 'Boğa Tuzağı Algılandı: Formasyon AL gösteriyor fakat yabancı akışı veya OBI negatif!';
      }
    } else if (isBearish) {
      const isForeignPositive = foreignNetFlow !== null && foreignNetFlow > 0;
      const isObiPositive = obiImbalance !== null && obiImbalance > 0;
      if (isForeignPositive || isObiPositive) {
        trapFlag = true;
        trapType = 'BEAR_TRAP';
        reason = 'Ayı Tuzağı Algılandı: Formasyon SAT gösteriyor fakat yabancı akışı veya OBI pozitif!';
      }
    }

    return {
      trapFlag,
      trapType,
      confidenceMultiplier: trapFlag ? 0.25 : 1.0,
      timeframeMismatch: false,
      reason,
    };
  }

  /**
   * Pazar metriklerini önce DataRuleEngine Ön Filtresinden, ardından 4 katmanlı hiyerarşik süzgeçten geçirir.
   */
  public evaluate(metrics: MarketMetrics): JuryDecision {
    const warnings: string[] = [];
    const {
      microstructure,
      orderflow,
      financials,
      volumeZScore,
      kapSentimentScore,
      shortInterestPct,
      currentPrice,
      entryPrice,
      stopLossPrice,
      isStopLossBreached,
      dayChangePct,
      orderCancelRatePct,
      bofaNetLot,
      wallLot,
      wallPrice,
      meltTimeMin,
      burnRatePerMin,
      dataSource: explicitSource,
      isRealTime: explicitRealTime,
      isMock,
      warning: explicitWarning
    } = metrics;

    const isPriceMissing = currentPrice === undefined || currentPrice === null || currentPrice <= 0;
    const effectivePrice = currentPrice ?? null;
    const effectiveSource = explicitSource || (isPriceMissing ? 'VERİ_YOK' : 'LIVE');
    const effectiveRealTime = explicitRealTime ?? (!isPriceMissing && effectiveSource === 'LIVE');
    const effectiveWarning = explicitWarning || (isPriceMissing ? '⚠️ İŞLEM DURDURULDU (VERİ YOK)' : undefined);

    if (effectiveWarning) {
      warnings.push(effectiveWarning);
    }

    if (isPriceMissing) {
      return {
        score: null,
        consensusReached: false,
        verdict: 'UNAVAILABLE',
        isHardStop: null,
        isDistributionLock: null,
        systemStatus: '⚠️ VERİ YOK',
        dataSource: effectiveSource,
        layerWeights: this.layerWeights,
        layerScores: { l2: null, forensic: null, volume: null, nlp: null, candlestick: null },
        warnings: [effectiveWarning || 'Fiyat verisi eksik.'],
        rationale: 'Fiyat verisi olmadan jüri değerlendirme yapamaz.'
      };
    }

    const marketDataForRules: MarketData = {
      currentPrice: effectivePrice!,
      entryPrice: entryPrice ?? effectivePrice!,
      stopLossPrice: stopLossPrice ?? null,
      isStopLossBreached: isStopLossBreached ?? null,
      dayChangePct: dayChangePct ?? null,
      zScore: volumeZScore ?? null,
      obi: microstructure.obi ?? null,
      cmf20: null, // Hardcoded 0.12 removed
      obvSlope: null, // Hardcoded 0.08 removed
      spoofingRisk: microstructure.spoofingRisk ?? null,
      orderCancelRatePct: orderCancelRatePct ?? microstructure.spoofingRisk ?? null,
      financials,
      beneishMScore: financials.beneishM ?? null,
      bofaNetLot: bofaNetLot ?? (orderflow.dominantBrokerFlow ? orderflow.dominantBrokerFlow.netVolume : null),
      kapSentimentScore: kapSentimentScore ?? null,
      dataSource: effectiveSource,
      isRealTime: effectiveRealTime,
      isMock: isMock || false,
      warning: effectiveWarning,
      orderBook: {
        wallLot: wallLot ?? microstructure.topWallVolume ?? null,
        wallPrice: wallPrice ?? microstructure.topWallPrice ?? null,
        meltTimeMin: meltTimeMin ?? null,
        burnRatePerMin: burnRatePerMin ?? null
      }
    };

    const preFilter = DataRuleEngine.applyRules(marketDataForRules);

    // Manipülasyon Kalkanı (MANIPULASYON_ALARM) Kontrolü
    const manipRisk = (metrics as any)?.manipulationRiskScore ?? null;
    const manipAlarm = Boolean((metrics as any)?.manipulationAlarm || (typeof manipRisk === 'number' && manipRisk > 70));
    if (manipAlarm) {
      const manipReason = `MANIPULASYON_ALARM: Sosyal medya spekülasyonu / pump & dump tespiti. Jüri kararı BEKLE (HOLD) konumuna kilitlendi.`;
      warnings.unshift(manipReason);
      console.warn(`[DATA AUDIT WARN] [JuryEngine] manipulation: ${manipReason}`);
      return {
        score: null,
        consensusReached: false,
        verdict: 'HOLD',
        isHardStop: false,
        isDistributionLock: true,
        isPreFiltered: true,
        preFilterResult: {
          ...preFilter,
          read: false,
          reason: manipReason,
          ruleTriggered: 'SPOOFING_GUARD',
          finalVerdict: 'HOLD'
        },
        systemStatus: '🛡️ MANİPÜLASYON KALKANI (BEKLE)',
        dataSource: effectiveSource,
        warning: effectiveWarning,
        layerWeights: this.layerWeights,
        layerScores: { l2: null, forensic: null, volume: null, nlp: null, candlestick: null },
        warnings,
        rationale: manipReason
      };
    }

    if (preFilter.priority === 'CRITICAL' || preFilter.finalVerdict === 'STOP_EXECUTED') {
      warnings.unshift(preFilter.reason);
      return {
        score: null,
        consensusReached: false,
        verdict: 'STOP_EXECUTED',
        isHardStop: true,
        isDistributionLock: true,
        isPreFiltered: true,
        preFilterResult: preFilter,
        systemStatus: '🛑 CRITICAL HARD-STOP - Pozisyon Kapat',
        dataSource: effectiveSource,
        warning: effectiveWarning,
        layerWeights: this.layerWeights,
        layerScores: { l2: null, forensic: null, volume: null, nlp: null, candlestick: null },
        warnings,
        rationale: preFilter.reason
      };
    }

    if (!preFilter.read) {
      warnings.unshift(preFilter.reason);
      const isDataSourceLock = preFilter.ruleTriggered === 'DATA_SOURCE_NOHOLD_LOCK';
      return {
        score: null,
        consensusReached: false,
        verdict: 'HOLD',
        isHardStop: false,
        isDistributionLock: true,
        isPreFiltered: true,
        preFilterResult: preFilter,
        systemStatus: isDataSourceLock ? '🔒 NOHOLD / SATIŞ KİLİT' : '🛡️ ÖN FİLTRE DEVREDE (VETO / HOLD)',
        dataSource: effectiveSource,
        warning: effectiveWarning,
        layerWeights: this.layerWeights,
        layerScores: { l2: null, forensic: null, volume: null, nlp: null, candlestick: null },
        warnings,
        rationale: preFilter.reason
      };
    }

    // ==========================================
    // 1. KATMAN: L2 MİKROYAPI PUANI (%40)
    // ==========================================
    let l2Score: number | null = null;
    if (microstructure.obi !== null) {
      l2Score = ((microstructure.obi + 1) / 2) * 75;
      
      if (microstructure.icebergDetected && microstructure.icebergSide === 'BID') {
        l2Score += 20;
      } else if (microstructure.icebergDetected && microstructure.icebergSide === 'ASK') {
        l2Score -= 20;
      }

      if (microstructure.spoofingRisk !== null && microstructure.spoofingRisk > 40) {
        l2Score -= (microstructure.spoofingRisk * 0.35);
        warnings.push(`⚠️ Yüksek Spoofing Riski (%${microstructure.spoofingRisk}): Tahtada sahte likidite duvarları algılandı!`);
      }
      l2Score = Math.max(0, Math.min(100, Math.round(l2Score)));
    }

    // ==========================================
    // 2. KATMAN: ADLİ BİLANÇO PUANI (%30)
    // ==========================================
    const pScore = Math.min(100, (financials.piotroskiF / 9) * 50);

    let zScorePoints = 25;
    if (financials.altmanZ > 2.99) zScorePoints = 40;
    else if (financials.altmanZ < 1.81) {
      zScorePoints = 5;
      warnings.push('⚠️ Altman Z İflas Bölgesi (<1.81): Şirket finansal stres altında.');
    }

    let beneishPoints = 10;
    if (financials.beneishM > -1.78) {
      beneishPoints = -30;
      warnings.push(`🚨 Beneish M-Skor Kırmızı Bayrak (${financials.beneishM.toFixed(2)} > -1.78): Adli Bilanço Makyajı / SPK Riski!`);
    } else {
      beneishPoints = 10;
    }

    const forensicScore = Math.max(0, Math.min(100, Math.round(pScore + zScorePoints + beneishPoints)));

    // ==========================================
    // 3. KATMAN: HACİM Z-SKOR ANOMALİ PUANI (%20)
    // ==========================================
    let volumeScore: number | null = null;
    if (volumeZScore !== null) {
      if (volumeZScore >= 3.0) volumeScore = 100;
      else if (volumeZScore >= 2.0) volumeScore = 85;
      else if (volumeZScore >= 1.0) volumeScore = 70;
      else if (volumeZScore >= 0) volumeScore = 55;
      else volumeScore = 30;
    }

    // ==========================================
    // 4. KATMAN: NLP / KAP SENTİMENT PUANI (%10)
    // ==========================================
    const nlpScore = kapSentimentScore !== null ? Math.max(0, Math.min(100, Math.round(kapSentimentScore))) : null;

    // ==========================================
    // 5. KATMAN: MUM FORMASYONU KALİTE PUANI (%20) & TUZAK KALKANI (ARBITER)
    // ==========================================
    // Kural:
    // - Skor < 50 ise → "ÇÖP", Jüri'ye oy verilmez (null).
    // - Skor >= 70 ise → Jüri'ye %20 ağırlıkla AL veya SAT oyu verilir.
    // - Skor 50-69 arası ise → "PAS" (Nötr: 50).
    let candlestickScore: number | null = null;
    if (metrics.candlestickScore !== undefined && metrics.candlestickScore !== null) {
      if (metrics.candlestickScore < 50) {
        candlestickScore = null; // ÇÖP - Oy verilmez
      } else if (metrics.candlestickScore >= 70) {
        candlestickScore = metrics.candlestickScore;
      } else {
        candlestickScore = 50; // PAS (Nötr)
      }
    }

    // Tuzak Kalkanı Denetimi (evaluateTrapShield)
    const effectiveBofa = bofaNetLot ?? (orderflow.dominantBrokerFlow ? orderflow.dominantBrokerFlow.netVolume : null);
    const trapShieldResult = this.evaluateTrapShield(
      metrics.candlestickPattern || null,
      effectiveBofa,
      microstructure.obi ?? null
    );

    if (trapShieldResult.trapFlag) {
      warnings.push(`🛡️ TUZAK KALKANI (Arbiter): ${trapShieldResult.reason} (Güven Çarpanı: 0.25x)`);
      if (candlestickScore !== null) {
        candlestickScore = Math.round(candlestickScore * trapShieldResult.confidenceMultiplier);
      }
    }

    // ==========================================
    // AĞIRLIKLI BİLEŞİK JÜRİ SKORU
    // ==========================================
    let totalScore: number | null = null;
    const scores = [
      { s: l2Score, w: this.layerWeights.l2 },
      { s: forensicScore, w: this.layerWeights.forensic },
      { s: volumeScore, w: this.layerWeights.volume },
      { s: nlpScore, w: this.layerWeights.nlp },
      { s: candlestickScore, w: this.layerWeights.candlestick }
    ];

    const validScores = scores.filter(x => x.s !== null);
    if (validScores.length > 0) {
      let weightSum = 0;
      let weightedTotal = 0;
      for (const entry of validScores) {
        weightedTotal += entry.s! * entry.w;
        weightSum += entry.w;
      }
      totalScore = weightedTotal / weightSum;
    }

    // ==========================================
    // ÖZEL DURUMLAR: TUZAK & SHORT SQUEEZE TESPİTİ
    // ==========================================
    let verdict: JuryDecision['verdict'] = 'NEUTRAL';
    const hasBeneishRedFlag = financials.beneishM > -1.78;

    const isBullTrap = (
      orderflow.divergenceType === 'BEARISH_ABSORPTION' ||
      (orderflow.cumulativeDelta !== null && orderflow.cumulativeDelta < -15000 && microstructure.obi !== null && microstructure.obi < -0.15 && volumeZScore !== null && volumeZScore > 1.0)
    );

    const isShortSqueeze = (
      (shortInterestPct !== undefined && shortInterestPct !== null && shortInterestPct >= 12) &&
      (microstructure.obi !== null && microstructure.obi > 0.35 || microstructure.icebergSide === 'BID') &&
      (orderflow.cumulativeDelta !== null && orderflow.cumulativeDelta > 5000)
    );

    if (totalScore !== null) {
      if (isBullTrap) {
        verdict = 'TRAP_ALERT';
        totalScore = Math.min(totalScore, 42);
        warnings.push('🪤 TUZAK ALARMI (Bull Trap): Fiyat yukarı itilirken Net Delta negatif ve pasif kurumsal blok satışı var!');
      } else if (isShortSqueeze) {
        verdict = 'SHORT_SQUEEZE';
        totalScore = Math.max(totalScore, 88);
        warnings.push('⚡ SHORT SQUEEZE: Yüksek açığa satış / ödünç oranı ve agresif kurumsal süpürme!');
      } else if (hasBeneishRedFlag) {
        verdict = 'DISTRIBUTION';
        totalScore = Math.min(totalScore, 48);
      } else if (totalScore >= 80) {
        verdict = 'STRONG_BUY';
      } else if (totalScore >= 65) {
        verdict = 'ACCUMULATION';
      } else if (totalScore <= 35) {
        verdict = 'STRONG_SELL';
      } else if (totalScore <= 50) {
        verdict = 'DISTRIBUTION';
      } else {
        verdict = 'NEUTRAL';
      }
    }

    const isDistributionLock = (verdict === 'DISTRIBUTION' || verdict === 'TRAP_ALERT' || verdict === 'STRONG_SELL');

    const consensusReached = totalScore !== null && (
      (l2Score !== null && l2Score >= 70) &&
      (forensicScore !== null && forensicScore >= 65) &&
      !hasBeneishRedFlag &&
      (volumeScore !== null && volumeScore >= 70) &&
      (nlpScore !== null && nlpScore >= 60) &&
      (microstructure.spoofingRisk !== null && microstructure.spoofingRisk < 35) &&
      !isBullTrap &&
      !isDistributionLock
    );

    let systemStatus = 'NÖTR GÖZLEM';
    if (consensusReached) {
      systemStatus = '⚡ 5=5 KUSURSUZ KONSENSÜS';
    } else if (isDistributionLock) {
      systemStatus = verdict === 'TRAP_ALERT' ? '🪤 TUZAK ALARMI / SATIŞ KİLİT' : '🔒 NOHOLD / SATIŞ KİLİT';
    } else if (verdict === 'SHORT_SQUEEZE') {
      systemStatus = '⚡ SQUEEZE ALARMI';
    } else if (verdict === 'STRONG_BUY' || verdict === 'ACCUMULATION') {
      systemStatus = '🟢 ONAYLI BİRİKİM';
    }

    let rationale = totalScore !== null 
      ? `MT16 Jüri Kararı: ${verdict} (Skor: ${Math.round(totalScore)}/100). `
      : `MT16 Jüri Kararı: ${verdict} (Skor: HESAPLANAMADI). `;

    if (consensusReached) {
      rationale += '5=5 TAM KONSENSÜS SAĞLANDI: L2 derinlik, adli bilanço, hacim anomalisi ve duygu katmanları kusursuz örtüşüyor.';
    } else if (isBullTrap) {
      rationale += 'DİKKAT: Emir akışı ve OBI uyumsuzluğu boğa tuzağına işaret ediyor. Alım şartı kilitlendi.';
    } else if (isDistributionLock) {
      rationale += 'NOHOLD / SATIŞ KİLİT: Tahtada kurumsal dağıtım veya adli risk tespit edildi; alım şartı iptal.';
    } else if (isShortSqueeze) {
      rationale += 'FIRSAT: Açığa satanların sıkışmasıyla parabolik yükseliş dinamiği aktif.';
    } else {
      rationale += `Katman Dağılımı: L2 ${l2Score ?? '---'}, Bilanço ${forensicScore}, Hacim ${volumeScore ?? '---'}, NLP ${nlpScore ?? '---'}, Mum ${candlestickScore ?? '---'}.`;
    }

    return {
      score: totalScore !== null ? Math.round(totalScore) : null,
      consensusReached,
      verdict,
      isHardStop: false,
      isDistributionLock,
      isPreFiltered: false,
      preFilterResult: preFilter,
      systemStatus,
      trapShieldResult,
      layerWeights: this.layerWeights,
      layerScores: {
        l2: l2Score,
        forensic: forensicScore,
        volume: volumeScore,
        nlp: nlpScore,
        candlestick: candlestickScore
      },
      warnings,
      rationale
    };
  }
}

export const juryEngine = new JuryEngine();
