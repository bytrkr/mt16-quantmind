// src/services/anomalies/anomalyAggregator.ts
/**
 * MT16 Merkezi Anomali Toplayıcı ve Orkestrasyon Servisi (AnomalyAggregator)
 * 5 temel anomali motorundan (Calendar, Mean Reversion, Microstructure, Value Quality, Behavioral Herding)
 * gelen metrikleri füzyonlayarak 0-100 arasında tek bir 'Bileşik Anomali Skoru (Composite Anomaly Score)',
 * anomali etiketi ve kurumsal kuant teşhis raporu üretir.
 */

import { CalendarAnomalyResult } from './calendarAnomalyService';
import { MeanReversionResult } from './meanReversionEngine';
import { MicrostructureAnomalyResult } from './microstructureAnomaly';
import { ValueQualityAnomalyResult } from './valueQualityAnomaly';
import { BehavioralHerdingResult } from './behavioralHerdingEngine';

export interface AnomalySubsystemInputs {
  calendar: CalendarAnomalyResult;
  meanReversion: MeanReversionResult;
  microstructure: MicrostructureAnomalyResult;
  valueQuality: ValueQualityAnomalyResult;
  behavioralHerding: BehavioralHerdingResult;
}

export type CompositeUrgency = 'INFO' | 'WARNING' | 'CRITICAL';

export interface AnomalyWeightsBreakdown {
  meanReversionWeight: number; // 25%
  microstructureWeight: number; // 25%
  behavioralHerdingWeight: number; // 20%
  valueQualityWeight: number; // 15%
  calendarWeight: number; // 15%
}

export interface CompositeAnomalyResult {
  compositeScore: number; // 0 - 100
  compositeAnomalyScore: number; // Alias for Express & AI Prompt
  anomalyLabel: string;
  anomalyTag: string; // Alias for Express & AI Prompt
  urgency: CompositeUrgency;
  urgencyLevel: CompositeUrgency; // Alias for Express & AI Prompt
  primaryDriver: string;
  weights: AnomalyWeightsBreakdown;
  subsystemScores: {
    meanReversion: number; // 0 - 100
    microstructure: number; // 0 - 100
    behavioralHerding: number; // 0 - 100
    valueQuality: number; // 0 - 100 (inversely adjusted for distress or directly for opportunity)
    calendar: number; // 0 - 100
  };
  synthesizedInsight: string;
  isActionableAnomaly: boolean;
}

export class AnomalyAggregator {
  /**
   * 5 anomali alt motorunun çıktısını birleştirerek nihai Bileşik Anomali Skorunu üretir.
   */
  public static aggregate(inputs: AnomalySubsystemInputs): CompositeAnomalyResult {
    const { calendar, meanReversion, microstructure, valueQuality, behavioralHerding } = inputs;

    // 1. Alt Sistem Skorlarının 0-100 Aralığına Normalize Edilmesi
    // Mean Reversion: reversionProbabilityPct (0 - 100)
    const mrScore = Math.max(0, Math.min(100, Math.round(meanReversion.reversionProbabilityPct)));

    // Microstructure: microstructureScore (0 - 100)
    const microScore = Math.max(0, Math.min(100, microstructure.microstructureScore));

    // Behavioral Herding: fomoRiskScore (0 - 100)
    const herdingScore = Math.max(0, Math.min(100, behavioralHerding.fomoRiskScore));

    // Value Quality: Eğer adli risk varsa anomali yükselir, veya aşırı iskonto/kalite de fırsat anomalisidir
    let vqAnomalyScore = 20;
    if (valueQuality.isEarningsManipulationRisk || valueQuality.isFinancialDistressRisk) {
      vqAnomalyScore = 85;
    } else if (valueQuality.isQualityValueStock) {
      vqAnomalyScore = Math.round(valueQuality.qualityScore);
    } else {
      vqAnomalyScore = Math.round(Math.abs(valueQuality.valuationDiscountPct) * 1.5);
    }
    vqAnomalyScore = Math.max(0, Math.min(100, vqAnomalyScore));

    // Calendar: Açılış / kapanış / cuma şokları
    let calScore = 20;
    if (calendar.isOpeningSpike || calendar.isClosingSpike) {
      calScore = 75;
    } else if (calendar.isWeekendRisk) {
      calScore = 60;
    } else if (Math.abs(calendar.calendarZScore) > 1.0) {
      calScore = Math.min(80, Math.round(Math.abs(calendar.calendarZScore) * 45));
    }

    // 2. Ağırlıklı Bileşik Skor Hesabı
    // Mean Reversion: 25%
    // Microstructure: 25%
    // Behavioral Herding: 20%
    // Value Quality: 15%
    // Calendar: 15%
    const weights: AnomalyWeightsBreakdown = {
      meanReversionWeight: 0.25,
      microstructureWeight: 0.25,
      behavioralHerdingWeight: 0.20,
      valueQualityWeight: 0.15,
      calendarWeight: 0.15,
    };

    const weightedScore = Math.round(
      (mrScore * weights.meanReversionWeight) +
      (microScore * weights.microstructureWeight) +
      (herdingScore * weights.behavioralHerdingWeight) +
      (vqAnomalyScore * weights.valueQualityWeight) +
      (calScore * weights.calendarWeight)
    );

    const compositeScore = Math.max(0, Math.min(100, weightedScore));

    // 3. Birincil Sürücü (Primary Driver) Tespiti
    const scores = [
      { name: 'Ortalamaya Dönüş (Mean Reversion)', score: mrScore },
      { name: 'Mikroyapı & Spoofing', score: microScore },
      { name: 'Sürü & FOMO Hacmi', score: herdingScore },
      { name: 'Finansal Kalite & Değer', score: vqAnomalyScore },
      { name: 'Takvim & Seans Zamanı', score: calScore },
    ];
    scores.sort((a, b) => b.score - a.score);
    const primaryDriver = scores[0].name;

    // 4. Anomali Etiketi ve Aciliyet Seviyesi
    let urgency: CompositeUrgency = 'INFO';
    let anomalyLabel = 'DENGELI_PIYASA_REJIMI';
    let synthesizedInsight = 'Piyasa ve emir tahtası dengeli parametrelerle çalışmaktadır; olağandışı anomali gözlenmedi.';

    if (behavioralHerding.fomoRiskScore >= 70 && microstructure.isSpoofingDetected) {
      urgency = 'CRITICAL';
      anomalyLabel = 'YAPAY_FOMO_TUZAGI';
      synthesizedInsight = 'Kritik Uyarı: KAP desteği olmayan yapay hacim sıçraması ve emir iptalli sahte tahta (Spoofing) saptandı! Tuzak riski yüksek.';
    } else if (valueQuality.isQualityValueStock && meanReversion.isOversold) {
      urgency = 'WARNING';
      anomalyLabel = 'KURUMSAL_DEGER_DIP_FIRSATI';
      synthesizedInsight = `Fırsat: Yüksek kaliteli bilanço (Piotroski ${valueQuality.piotroskiScore}/9, temiz adli skor) aşırı satım bölgesinde (Z: ${meanReversion.zScore.toFixed(2)}σ). Kuant ortalamaya dönüş alım potansiyeli.`;
    } else if (meanReversion.regime === 'EXTREME_EXPANSION') {
      urgency = 'CRITICAL';
      anomalyLabel = 'ASIRI_FIYAT_GENISLEMESI';
      synthesizedInsight = `Fiyat Bollinger / SMA20 bandından aşırı saptı (+${meanReversion.zScore.toFixed(2)}σ). %${meanReversion.reversionProbabilityPct.toFixed(1)} olasılıkla sert ortalamaya dönüş bekleniyor.`;
    } else if (microstructure.spoofingRisk === 'CRITICAL' || microstructure.spoofingRisk === 'HIGH') {
      urgency = 'WARNING';
      anomalyLabel = 'MIKROYAPI_SPOOFING_BASKISI';
      synthesizedInsight = `Kademe iptal oranı %${microstructure.cancelRatePct} ile yüksek. Tahtada sahte derinlik ve kademe kayması riski mevcut.`;
    } else if (behavioralHerding.herdingLevel === 'EXTREME_RETAIL_HERD') {
      urgency = 'WARNING';
      anomalyLabel = 'SURU_FOMO_ALIS_COSKUSU';
      synthesizedInsight = 'KAP bildirimi olmaksızın gelişen olağanüstü hacim dalgası perakende sürü psikolojisini tetikliyor.';
    } else if (compositeScore >= 65) {
      urgency = 'WARNING';
      anomalyLabel = 'YUKSEK_BILESIK_ANOMALI';
      synthesizedInsight = `Bileşik anomali skoru ${compositeScore}/100 ile eşiği aştı. Birincil itici güç: ${primaryDriver}.`;
    }

    const isActionableAnomaly = compositeScore >= 60 || urgency === 'CRITICAL' || urgency === 'WARNING';

    return {
      compositeScore,
      compositeAnomalyScore: compositeScore,
      anomalyLabel,
      anomalyTag: anomalyLabel,
      urgency,
      urgencyLevel: urgency,
      primaryDriver,
      weights,
      subsystemScores: {
        meanReversion: mrScore,
        microstructure: microScore,
        behavioralHerding: herdingScore,
        valueQuality: vqAnomalyScore,
        calendar: calScore,
      },
      synthesizedInsight,
      isActionableAnomaly,
    };
  }
}
