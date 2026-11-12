// src/services/juryEngine.ts
/**
 * MT16 BistApp Kuant Terminali - Canlı Jüri Karar Motoru (Jury Engine)
 * TechnicalAgent (%30), OrderBookAgent (%30), SentimentAgent (%20) ve
 * AnomalyQualityAgent (%20) canlı verilerini alarak ağırlıklı konsensüs hesabı üretir.
 * Yapay FOMO Tuzağı veya Mikroyapı Spoofing Baskısı durumlarında konsensüs skorunu
 * otomatik olarak 'BEKLE' / 'DENGELİ' seviyesine düşüren risk filtresini içerir.
 */

import { MultiAgentJuryVerdict, AgentWeightMap, JuryConsensusSummary } from '../../shared/types/jury';
import { MarketGatewaySnapshot } from './marketGateway';
import { CompositeAnomalyResult } from './anomalies/anomalyAggregator';
import { ValueQualityAnomalyResult } from './anomalies/valueQualityAnomaly';
import { MicrostructureAnomalyResult } from './anomalies/microstructureAnomaly';
import { BehavioralHerdingResult } from './anomalies/behavioralHerdingEngine';
import { QuantMarketType } from '../types/market';

export interface JuryEngineInputData {
  ticker?: string;
  market?: QuantMarketType;
  zScore?: number;
  obi?: number;
  rsi?: number;
  dayChangePct?: number;
  sentimentScore?: number;
  kapImpactScore?: number;
  netInflowLot?: number;
  isVetoed?: boolean;
  vetoReason?: string;
  snapshot?: MarketGatewaySnapshot | null;
  // 5'li Anomali ve Bilanço Kalite Metrikleri
  compositeAnomaly?: CompositeAnomalyResult;
  valueQuality?: ValueQualityAnomalyResult;
  microstructure?: MicrostructureAnomalyResult;
  behavioralHerding?: BehavioralHerdingResult;
  piotroskiScore?: number;
  beneishMScore?: number;
}

export function calculateJuryConsensus(data: JuryEngineInputData): JuryConsensusSummary {
  const rawZ = data.zScore ?? data.snapshot?.liveZScore ?? null;
  const zScore = typeof rawZ === 'number' && !isNaN(rawZ) ? rawZ : null;

  const rawObi = data.obi ?? data.snapshot?.liveObi ?? null;
  const obi = typeof rawObi === 'number' && !isNaN(rawObi) ? rawObi : null;

  const rawRsi = data.rsi ?? data.snapshot?.liveRsi ?? null;
  const rsi = typeof rawRsi === 'number' && !isNaN(rawRsi) ? rawRsi : null;

  const rawDayChange = data.dayChangePct ?? data.snapshot?.dayChangePct ?? null;
  const dayChangePct = typeof rawDayChange === 'number' && !isNaN(rawDayChange) ? rawDayChange : null;

  const rawSentiment = data.sentimentScore ?? null;
  const sentimentScore = typeof rawSentiment === 'number' && !isNaN(rawSentiment) ? rawSentiment : null;

  const isVetoed = data.isVetoed ?? false;

  // 0. Temel Katalizör Tespiti (Bilanço/KAP Etki Puanı >= +15 veya Güçlü Net Para Girişi >= 10.000 lot)
  const rawKap = data.kapImpactScore ?? (data.snapshot as any)?.latestKapImpact ?? null;
  const kapImpact = typeof rawKap === 'number' && !isNaN(rawKap) ? rawKap : null;

  const rawNet = data.netInflowLot ?? data.snapshot?.bofaNetLot ?? null;
  const netInflow = typeof rawNet === 'number' && !isNaN(rawNet) ? rawNet : null;

  const isStrongFundamentalCatalyst = ((kapImpact !== null && kapImpact >= 15) || (netInflow !== null && netInflow >= 10000)) && !isVetoed;

  // Ağırlık Katsayıları Dinamik Ayarı: Güçlü temel katalizörde L2 OBI ağırlığı düşürülür, KAP & Duygu ve Bilanço Kalite ağırlığı yükseltilir
  const weights = isStrongFundamentalCatalyst
    ? { tech: 0.25, ob: 0.15, sent: 0.35, anomQual: 0.25 }
    : { tech: 0.30, ob: 0.30, sent: 0.20, anomQual: 0.20 };

  // 1. Technical Agent Score
  let techScore: number | null = null;
  if (zScore !== null || rsi !== null || dayChangePct !== null) {
    techScore = 50;
    if (zScore !== null) {
      if (zScore >= 2.0) techScore += 30;
      else if (zScore >= 1.0) techScore += 15;
      else if (zScore <= -2.0) techScore -= 30;
      else if (zScore <= -1.0) techScore -= 15;
    }

    if (rsi !== null) {
      if (rsi <= 30) techScore += 20;
      else if (rsi >= 70) techScore -= 20;
    }

    if (dayChangePct !== null) {
      if (dayChangePct > 0) techScore += 10;
      else if (dayChangePct < 0) techScore -= 10;
    }

    techScore = Math.max(0, Math.min(100, techScore));
  }

  let techDecision: 'AL' | 'SAT' | 'PAS' | 'NÖTR' = 'NÖTR';
  if (techScore !== null) {
    if (techScore >= 65) techDecision = 'AL';
    else if (techScore <= 35) techDecision = 'SAT';
    else techDecision = 'PAS';
  }

  const technicalAgent: MultiAgentJuryVerdict = {
    agentId: 'agent-1-technical',
    agentName: 'Teknik Anomali & Z-Skor Ajanı',
    decision: techDecision,
    confidenceScore: techScore,
    reasoning: `Z-Skor: ${zScore !== null ? `${zScore >= 0 ? '+' : ''}${zScore.toFixed(2)}σ` : '---'}, RSI: ${rsi !== null ? rsi.toFixed(1) : '---'}, Değişim: ${dayChangePct !== null ? `${dayChangePct >= 0 ? '+' : ''}${dayChangePct.toFixed(2)}%` : '---'}`,
    weight: weights.tech,
  };

  // 2. OrderBook Agent Score
  let obScore: number | null = null;
  if (obi !== null) {
    obScore = 50 + (obi * 40);
    obScore = Math.max(0, Math.min(100, obScore));
  }

  let obDecision: 'AL' | 'SAT' | 'PAS' | 'NÖTR' = 'NÖTR';
  if (obScore !== null) {
    if (obScore >= 65) obDecision = 'AL';
    else if (obScore <= 35) obDecision = 'SAT';
    else obDecision = 'PAS';
  }

  const orderBookAgent: MultiAgentJuryVerdict = {
    agentId: 'agent-2-orderbook',
    agentName: 'L2 Emir Defteri & OBI Ajanı',
    decision: obDecision,
    confidenceScore: obScore !== null ? Number(obScore.toFixed(1)) : null,
    reasoning: `L2 Derinlik OBI Baskı Skoru: ${obi !== null ? `${obi >= 0 ? '+' : ''}${obi.toFixed(2)}` : '---'} (${obi !== null ? (obi >= 0.2 ? 'Alış Baskısı Hakim' : obi <= -0.2 ? 'Satış Baskısı Hakim' : 'Dengeli Kademe') : 'VERİ YOK'})${isStrongFundamentalCatalyst ? ' [Katalizör Bypass]' : ''}`,
    weight: weights.ob,
  };

  // 3. Sentiment Agent Score
  let sentScore: number | null = null;
  if (sentimentScore !== null) {
    sentScore = sentimentScore * 100;
    if (isVetoed) {
      sentScore = 10;
    } else if (isStrongFundamentalCatalyst) {
      // Güçlü Bilanço / KAP Katalizöründe Duygu Skoru Üst Seviyeye Yükseltilir
      sentScore = Math.max(sentScore, 88);
    }
    sentScore = Math.max(0, Math.min(100, sentScore));
  }

  let sentDecision: 'AL' | 'SAT' | 'PAS' | 'NÖTR' = 'NÖTR';
  if (isVetoed) sentDecision = 'SAT';
  else if (sentScore !== null) {
    if (sentScore >= 65) sentDecision = 'AL';
    else if (sentScore <= 35) sentDecision = 'SAT';
    else sentDecision = 'PAS';
  }

  const sentimentAgent: MultiAgentJuryVerdict = {
    agentId: 'agent-3-sentiment',
    agentName: 'KAP & Haber Duygu Akış Ajanı',
    decision: sentDecision,
    confidenceScore: sentScore !== null ? Number(sentScore.toFixed(1)) : (isVetoed ? 10 : null),
    reasoning: isVetoed
      ? `🚨 VETO DEVREDE: ${data.vetoReason || 'Finnhub sentiment score < 0.35 bozulma tespiti.'}`
      : isStrongFundamentalCatalyst
      ? `🔥 Güçlü KAP/Bilanço Katalizörü (Etki: ${kapImpact !== null ? `+${kapImpact}` : '---'}, Net Giriş: ${netInflow !== null ? `+${netInflow.toLocaleString('tr-TR')} lot` : '---'}) — YUKARI TREND DESTEKLENİYOR`
      : `Piyasa Algı Skoru: ${sentimentScore !== null ? sentimentScore.toFixed(2) : '---'} (Finnhub & EVDS Pozitif Teyitli)`,
    weight: weights.sent,
  };

  // 4. Anomaly & Balance Sheet Quality Agent
  const rawPiotroski = data.piotroskiScore ?? data.valueQuality?.piotroskiScore ?? data.snapshot?.piotroskiF ?? null;
  const piotroski = typeof rawPiotroski === 'number' && !isNaN(rawPiotroski) ? rawPiotroski : null;

  const rawBeneish = data.beneishMScore ?? data.valueQuality?.beneishMScore ?? null;
  const beneish = typeof rawBeneish === 'number' && !isNaN(rawBeneish) ? rawBeneish : null;

  const compLabel = data.compositeAnomaly?.anomalyLabel || data.compositeAnomaly?.anomalyTag;

  let anomQualScore: number | null = null;
  if (piotroski !== null || beneish !== null || compLabel || isStrongFundamentalCatalyst) {
    anomQualScore = 55;
    if (piotroski !== null) {
      if (piotroski >= 7) anomQualScore += 15;
      else if (piotroski <= 3) anomQualScore -= 20;
    }

    if (beneish !== null) {
      if (beneish < -1.78) anomQualScore += 15;
      else if (beneish > -1.49) anomQualScore -= 25;
    }

    if (isStrongFundamentalCatalyst) {
      anomQualScore += 20; // Katalizör kalite bonusu
    }

    if (compLabel === 'KURUMSAL_DEGER_DIP_FIRSATI') {
      anomQualScore += 20;
    } else if (compLabel === 'YAPAY_FOMO_TUZAGI') {
      anomQualScore -= 35;
    } else if (compLabel === 'MIKROYAPI_SPOOFING_BASKISI') {
      anomQualScore -= 30;
    } else if (compLabel === 'ASIRI_FIYAT_GENISLEMESI') {
      anomQualScore -= 15;
    }

    anomQualScore = Math.max(0, Math.min(100, anomQualScore));
  }

  let anomQualDecision: 'AL' | 'SAT' | 'PAS' | 'NÖTR' = 'NÖTR';
  if (anomQualScore !== null) {
    if (anomQualScore >= 65) anomQualDecision = 'AL';
    else if (anomQualScore <= 35) anomQualDecision = 'SAT';
    else anomQualDecision = 'PAS';
  }

  // 5. Piyasaya Özel Risk Dinamikleri
  const market: QuantMarketType = data.market || (data.snapshot as any)?.marketType || 'BIST';
  let marketSpecificRiskAlert: string | undefined = undefined;

  if (market === 'BIST') {
    if (dayChangePct !== null && dayChangePct >= 9.6) {
      marketSpecificRiskAlert = 'BIST %10 Tavan Kilit Uyarısı: Alış kademeleri kilitli, alım emri girmek aşırı riskli!';
    } else if (dayChangePct !== null && dayChangePct <= -9.5) {
      marketSpecificRiskAlert = 'BIST %10 Taban Kilit / Devre Kesici Uyarısı: Satış kademeleri kilitli!';
    }
  } else if (market === 'NASDAQ') {
    const utcHours = new Date().getUTCHours();
    const isAfterHours = utcHours < 13 || utcHours >= 20;
    if (isAfterHours) {
      marketSpecificRiskAlert = 'NASDAQ After-Hours / Pre-Market Uyarısı: Geniş spread, düşük kademe derinliği ve ani likidite açığı riski!';
    }
  } else if (market === 'CRYPTO') {
    if (dayChangePct !== null && (Math.abs(dayChangePct) >= 10.0 || (zScore !== null && Math.abs(zScore) >= 2.0))) {
      marketSpecificRiskAlert = 'Kripto Balina & Likidasyon Kaskadı Uyarısı: Yüksek kaldıraç tasfiyesi ve limitsiz pump/dump dalgalanması!';
    }
  }

  const anomalyQualityAgent: MultiAgentJuryVerdict = {
    agentId: 'agent-4-anomaly-quality',
    agentName: 'Anomali ve Bilanço Kalite Ajanı',
    decision: anomQualDecision,
    confidenceScore: anomQualScore !== null ? Number(anomQualScore.toFixed(1)) : null,
    reasoning: `Piotroski F: ${piotroski !== null ? `${piotroski}/9` : '---'}, Beneish M: ${beneish !== null ? beneish.toFixed(2) : '---'}, Anomali: ${compLabel || 'DENGELİ'}${marketSpecificRiskAlert ? ` | ⚠️ ${marketSpecificRiskAlert}` : ''}`,
    weight: weights.anomQual,
  };

  // 🛡️ 6. RİSK FİLTRESİ KONTROLÜ
  const isSpoofingPressure =
    compLabel === 'MIKROYAPI_SPOOFING_BASKISI' ||
    data.microstructure?.isSpoofingDetected === true ||
    data.microstructure?.spoofingRisk === 'HIGH' ||
    data.microstructure?.spoofingRisk === 'CRITICAL';

    const fomoScore = data.behavioralHerding ? data.behavioralHerding.fomoRiskScore : null;
    const isFomoTrap =
      compLabel === 'YAPAY_FOMO_TUZAGI' ||
      compLabel === 'SURU_FOMO_ALIS_COSKUSU' ||
      data.behavioralHerding?.herdingLevel === 'EXTREME_RETAIL_HERD' ||
      (fomoScore !== null && fomoScore >= 70);

  const isFloorLocked = market === 'BIST' && dayChangePct !== null && dayChangePct <= -9.5;
  const isCeilingLocked = market === 'BIST' && dayChangePct !== null && dayChangePct >= 9.6;

  const isAnomalyRiskFilterTriggered = isSpoofingPressure || isFomoTrap || isFloorLocked || isCeilingLocked;
  const anomalyFilterReason = isFloorLocked
    ? 'BIST taban kilitlenme / devre kesici riski'
    : isCeilingLocked
    ? 'BIST tavan kilitlenme marjı'
    : isFomoTrap
    ? 'Yapay FOMO tuzağı / KAP desteksiz hacim şoku tespiti'
    : isSpoofingPressure
    ? 'Mikroyapı spoofing baskısı ve sahte likidite duvarı tespiti'
    : undefined;

  // 7. Ağırlıklı Konsensüs Hesabı (Dinamik Ağırlıklar)
  let overallScore: number | null = null;
  if (techScore !== null || obScore !== null || sentScore !== null || anomQualScore !== null) {
    overallScore =
      ((techScore !== null ? techScore : 0) * weights.tech) +
      ((obScore !== null ? obScore : 0) * weights.ob) +
      ((sentScore !== null ? sentScore : 0) * weights.sent) +
      ((anomQualScore !== null ? anomQualScore : 0) * weights.anomQual);
  }

  if (isVetoed && overallScore !== null) {
    overallScore = Math.min(overallScore, 30);
  }

  if (isAnomalyRiskFilterTriggered && overallScore !== null) {
    overallScore = Math.min(overallScore, 48.0);
  }

  if (overallScore !== null) {
    overallScore = Number(overallScore.toFixed(1));
  }

  let consensusAction: 'AL' | 'SAT' | 'NÖTR' = 'NÖTR';
  if (isVetoed) {
    consensusAction = 'SAT';
  } else if (isAnomalyRiskFilterTriggered) {
    consensusAction = 'NÖTR';
  } else if (overallScore !== null) {
    if (isStrongFundamentalCatalyst && overallScore >= 55) {
      // 💡 Temel Katalizör Baskılama: L2 OBI nötr (+0.00) olsa dahi 'BEKLE' yerine 'GÜÇLÜ TREND / YUKARI SÜRDÜR' (AL) kararı
      consensusAction = 'AL';
    } else if (overallScore >= 66) {
      consensusAction = 'AL';
    } else if (overallScore <= 40) {
      consensusAction = 'SAT';
    } else {
      consensusAction = 'NÖTR';
    }
  }

  const agentVerdicts = [technicalAgent, orderBookAgent, sentimentAgent, anomalyQualityAgent];
  const agreeingAgents = agentVerdicts.filter(
    a => a.decision === consensusAction || (consensusAction === 'NÖTR' && a.decision === 'PAS')
  ).length;

  const weightMap: AgentWeightMap = {
    'TechnicalAgent': weights.tech,
    'OrderBookAgent': weights.ob,
    'SentimentAgent': weights.sent,
    'AnomalyQualityAgent': weights.anomQual,
  };

  return {
    consensusAction,
    overallScore,
    totalAgents: 4,
    agreeingAgents,
    agentVerdicts,
    weightMap,
    isVetoed,
    isAnomalyRiskFilterTriggered,
    anomalyFilterReason,
    marketSpecificRiskAlert,
    isFundamentalCatalyst: isStrongFundamentalCatalyst,
    catalystOverrideNote: isStrongFundamentalCatalyst
      ? 'Bilanço & KAP Etki Puanı (>= +15) veya güçlü net para girişi sebebiyle L2 OBI nötr seviyesi bypass edilerek GÜÇLÜ TREND / YUKARI SÜRDÜR kararı verildi.'
      : undefined,
  };
}
