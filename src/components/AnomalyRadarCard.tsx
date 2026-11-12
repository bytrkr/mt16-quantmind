// src/components/AnomalyRadarCard.tsx
/**
 * MT16 Anomali & Rejim Radarı (AnomalyRadarCard)
 * 5'li Anomali Motoru (Takvim, Mean Reversion, Mikroyapı/Spoofing, Değer/Kalite, Sürü/FOMO)
 * ve Bileşik Anomali Skoru (0-100) kurumsal kuant denetim bileşeni.
 */

import React, { useState, useEffect } from 'react';
import {
  Activity,
  AlertTriangle,
  Zap,
  Calendar,
  Compass,
  Radio,
  Clock,
  ShieldAlert,
  Send,
  CheckCircle2,
  TrendingUp,
  Layers,
  Award,
  Users,
  Gauge,
  Flame,
  FileText
} from 'lucide-react';
import {
  CalendarAnomalyResult,
  CalendarAnomalyService,
} from '../services/anomalies/calendarAnomalyService';
import {
  MeanReversionResult,
  MeanReversionEngine,
} from '../services/anomalies/meanReversionEngine';
import {
  MicrostructureAnomalyResult,
  MicrostructureAnomalyService,
} from '../services/anomalies/microstructureAnomaly';
import {
  ValueQualityAnomalyResult,
  ValueQualityAnomalyService,
} from '../services/anomalies/valueQualityAnomaly';
import {
  BehavioralHerdingResult,
  BehavioralHerdingEngine,
} from '../services/anomalies/behavioralHerdingEngine';
import {
  CompositeAnomalyResult,
  AnomalyAggregator,
} from '../services/anomalies/anomalyAggregator';
import { NotificationDaemon, AlertMessage } from '../services/notificationDaemon';

export interface AnomalyRadarCardProps {
  symbol: string;
  price?: number | null;
  calendarAnomaly?: CalendarAnomalyResult | null;
  meanReversion?: MeanReversionResult | null;
  microstructureAnomaly?: MicrostructureAnomalyResult | null;
  valueQualityAnomaly?: ValueQualityAnomalyResult | null;
  behavioralHerding?: BehavioralHerdingResult | null;
  compositeAnomaly?: CompositeAnomalyResult | null;
  viopBasis?: string;
  onTriggerSimulatedAlert?: () => void;
}

export const AnomalyRadarCard: React.FC<AnomalyRadarCardProps> = ({
  symbol,
  price = 0,
  calendarAnomaly,
  meanReversion,
  microstructureAnomaly,
  valueQualityAnomaly,
  behavioralHerding,
  compositeAnomaly,
  viopBasis,
}) => {
  const [latestAlert, setLatestAlert] = useState<AlertMessage | null>(null);
  const [testNotificationStatus, setTestNotificationStatus] = useState<string>('');
  const [isBroadcasting, setIsBroadcasting] = useState<boolean>(false);

  const safePrice = typeof price === 'number' && !isNaN(price) && price > 0 ? price : 100;

  // Fallback defaults if not supplied
  const effectiveCalendar: CalendarAnomalyResult =
    calendarAnomaly || CalendarAnomalyService.analyze();

  const effectiveReversion: MeanReversionResult =
    meanReversion || {
      zScore: 0,
      isOverbought: false,
      isOversold: false,
      reversionProbabilityPct: 0,
      regime: 'NORMAL_RANGE',
    };

  const effectiveMicro = microstructureAnomaly || MicrostructureAnomalyService.analyze({
    bidDepthTotal: 490000,
    askDepthTotal: 511000,
    obi: -0.02,
    orderCancelRatePct: 18.5,
    wallLot: 180000,
    wallPrice: safePrice * 0.985,
    currentPrice: safePrice,
  });

  const effectiveValue = valueQualityAnomaly || ValueQualityAnomalyService.analyze({
    piotroskiScore: 7,
    beneishMScore: -2.35,
    peRatio: 9.8,
    pbRatio: 1.75,
    roePct: 22.0,
  });

  const effectiveHerding = behavioralHerding || BehavioralHerdingEngine.analyze({
    volumeZScore: typeof effectiveReversion.zScore === 'number' && !isNaN(effectiveReversion.zScore) ? effectiveReversion.zScore : 0,
    priceChangePct: 1.5,
    hasKapDisclosureLast24h: true,
    socialHypeScore: 45,
    retailOrderRatioPct: 48,
  });

  const effectiveComposite = compositeAnomaly || AnomalyAggregator.aggregate({
    calendar: effectiveCalendar,
    meanReversion: effectiveReversion,
    microstructure: effectiveMicro,
    valueQuality: effectiveValue,
    behavioralHerding: effectiveHerding,
  });

  // Subscribe to NotificationDaemon alerts
  useEffect(() => {
    const unsub = NotificationDaemon.subscribe((alert) => {
      setLatestAlert(alert);
    });

    const history = NotificationDaemon.getAlertHistory();
    if (history.length > 0) {
      setLatestAlert(history[0]);
    }

    return () => unsub();
  }, []);

  const handleSimulateAlert = async (type: 'EXPANSION' | 'SPOOFING' | 'HERDING') => {
    setIsBroadcasting(true);
    setTestNotificationStatus('');
    try {
      let mockReversion = effectiveReversion;
      let mockMicro = effectiveMicro;
      let mockHerding = effectiveHerding;

      if (type === 'EXPANSION') {
        mockReversion = {
          zScore: 2.85,
          isOverbought: true,
          isOversold: false,
          reversionProbabilityPct: 94.0,
          regime: 'EXTREME_EXPANSION',
        };
      } else if (type === 'SPOOFING') {
        mockMicro = {
          isSpoofingDetected: true,
          spoofingRisk: 'CRITICAL',
          isIcebergDetected: false,
          icebergSide: 'NONE',
          estimatedIcebergLot: 0,
          cancelRatePct: 68.4,
          imbalanceRatio: 0.72,
          microstructureScore: 88,
          anomalyLabel: 'SPOOFING_YAPAY_LIKIDITE',
          description: 'Kademe iptal oranı %68.4 ve sahte alış duvarı teyit edildi.',
        };
      } else if (type === 'HERDING') {
        mockHerding = {
          isHerdingDetected: true,
          herdingLevel: 'EXTREME_RETAIL_HERD',
          fomoRiskScore: 85,
          volumeZScore: 3.10,
          priceChangePct: 5.4,
          isKapBacked: false,
          divergenceLevel: 'CRITICAL',
          description: 'Haber akışı olmaksızın aşırı sürü psikolojisi (+3.10σ hacim) ve FOMO riski!',
        };
      }

      const mockComposite = AnomalyAggregator.aggregate({
        calendar: effectiveCalendar,
        meanReversion: mockReversion,
        microstructure: mockMicro,
        valueQuality: effectiveValue,
        behavioralHerding: mockHerding,
      });

      const alert = await NotificationDaemon.evaluateAndNotifyAnomalies({
        symbol,
        calendar: effectiveCalendar,
        meanReversion: mockReversion,
        microstructure: mockMicro,
        valueQuality: effectiveValue,
        behavioralHerding: mockHerding,
        composite: mockComposite,
        price: typeof price === 'number' && !isNaN(price) ? price : 0,
        oco: {
          takeProfit: safePrice * 1.025,
          stopLoss: safePrice * 0.985,
        },
        forceBroadcast: true,
      });

      if (alert) {
        setTestNotificationStatus(`✅ ${alert.title} fırlatıldı!`);
        setTimeout(() => setTestNotificationStatus(''), 4500);
      }
    } catch (e) {
      setTestNotificationStatus('Hata oluştu');
    } finally {
      setIsBroadcasting(false);
    }
  };

  const isCritical = effectiveComposite.urgency === 'CRITICAL';
  const isWarning = effectiveComposite.urgency === 'WARNING';
  const score = effectiveComposite.compositeScore;

  return (
    <div
      className={`bg-slate-900/95 border rounded-2xl p-5 shadow-xl backdrop-blur-md space-y-4 transition-all duration-300 ${
        isCritical
          ? 'border-rose-500/80 shadow-[0_0_35px_rgba(244,63,94,0.25)]'
          : isWarning
          ? 'border-amber-500/70 shadow-[0_0_30px_rgba(245,158,11,0.2)]'
          : 'border-slate-800 shadow-slate-950/50'
      }`}
    >
      {/* 1. Üst Başlık & Bileşik Anomali Skoru Rozeti */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className={`p-2 rounded-xl bg-slate-950 border ${isCritical ? 'border-rose-500/50 text-rose-400' : isWarning ? 'border-amber-500/50 text-amber-400' : 'border-slate-800 text-cyan-400'}`}>
            <Compass className={`w-4 h-4 ${isCritical ? 'animate-spin text-rose-400' : 'text-cyan-400'}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-white uppercase tracking-wider font-mono">
                Anomali &amp; Rejim Radarı
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-950 border border-slate-700 text-slate-300">
                #{symbol}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-950/60 border border-cyan-500/40 text-cyan-300">
                5 Motor Füzyonu
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium">
              Mean Reversion • Takvim • Mikroyapı/Spoofing • Değer/Kalite • Sürü/FOMO
            </p>
          </div>
        </div>

        {/* Bileşik Anomali Durum Rozeti */}
        <div className="flex items-center gap-2">
          {isCritical ? (
            <span className="px-3 py-1.5 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/60 text-xs font-mono font-black flex items-center gap-1.5 animate-pulse shadow-sm">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              {effectiveComposite.anomalyLabel}
            </span>
          ) : isWarning ? (
            <span className="px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/60 text-xs font-mono font-black flex items-center gap-1.5 shadow-sm">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              {effectiveComposite.anomalyLabel}
            </span>
          ) : (
            <span className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 text-xs font-mono font-black flex items-center gap-1.5 shadow-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              {effectiveComposite.anomalyLabel}
            </span>
          )}
        </div>
      </div>

      {/* 2. Bileşik Anomali Göstergesi (Master Composite Score Card) */}
      <div className="bg-slate-950/90 border border-slate-800/90 rounded-xl p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-xl">
            <div className="flex items-center gap-2">
              <Gauge className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200">
                Bileşik Anomali Skoru (Composite Anomaly Score)
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                (Ağırlıklı Çoklu Ajan Konsensüsü)
              </span>
            </div>
            <p className="text-xs text-slate-300 font-mono leading-relaxed">
              {effectiveComposite.synthesizedInsight}
            </p>
            <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400 pt-1">
              <span>Birincil Sürücü:</span>
              <span className="text-cyan-300 font-bold bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                {effectiveComposite.primaryDriver}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 self-end md:self-center shrink-0">
            <div className="text-right">
              <div className="text-[10px] font-mono text-slate-400 uppercase">Anomali Şiddeti</div>
              <div
                className={`text-3xl font-black font-mono tracking-tight ${
                  score >= 75
                    ? 'text-rose-400'
                    : score >= 50
                    ? 'text-amber-400'
                    : 'text-emerald-400'
                }`}
              >
                {score}
                <span className="text-sm font-normal text-slate-500">/100</span>
              </div>
            </div>

            {/* Dairesel / Yatay İlerleme Çubuğu */}
            <div className="w-24 h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
              <div
                className={`h-full transition-all duration-700 rounded-full ${
                  score >= 75
                    ? 'bg-gradient-to-r from-amber-500 to-rose-500'
                    : score >= 50
                    ? 'bg-gradient-to-r from-cyan-500 to-amber-500'
                    : 'bg-gradient-to-r from-emerald-500 to-cyan-500'
                }`}
                style={{ width: `${Math.min(score, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 3. Beş Alt Anomali Motorunun Ayrıştırılmış Izgarası (5 Sub-Engines) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {/* MOTOR 1: Ortalamaya Dönüş (Mean Reversion) */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200 font-mono">
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              <span>1. Mean Reversion</span>
            </div>
            <span className="text-[10px] font-mono text-cyan-300">
              Ağırlık: %25
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
              <div className="text-[10px] text-slate-400">Z-Skor Sapma</div>
              <div
                className={`text-sm font-black mt-0.5 ${
                  typeof effectiveReversion.zScore === 'number' && !isNaN(effectiveReversion.zScore)
                    ? Math.abs(effectiveReversion.zScore) >= 2.0
                      ? effectiveReversion.zScore >= 0
                        ? 'text-rose-400'
                        : 'text-emerald-400'
                      : 'text-cyan-300'
                    : 'text-slate-400'
                }`}
              >
                {typeof effectiveReversion.zScore === 'number' && !isNaN(effectiveReversion.zScore)
                  ? `${effectiveReversion.zScore >= 0 ? '+' : ''}${effectiveReversion.zScore.toFixed(2)}σ`
                  : 'VERİ YOK'}
              </div>
            </div>

            <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
              <div className="text-[10px] text-slate-400">Dönüş İhtimali</div>
              <div className="text-sm font-black text-purple-300 mt-0.5">
                {typeof effectiveReversion.reversionProbabilityPct === 'number' && !isNaN(effectiveReversion.reversionProbabilityPct)
                  ? `%${effectiveReversion.reversionProbabilityPct.toFixed(1)}`
                  : 'VERİ YOK'}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                effectiveReversion.isOverbought
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  : 'bg-slate-900 text-slate-500 border-slate-800'
              }`}
            >
              {effectiveReversion.isOverbought ? '🔴 Aşırı Alım' : '⚪ Aşırı Alım Yok'}
            </span>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                effectiveReversion.isOversold
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-slate-900 text-slate-500 border-slate-800'
              }`}
            >
              {effectiveReversion.isOversold ? '🟢 Aşırı Satım' : '⚪ Aşırı Satım Yok'}
            </span>
          </div>
        </div>

        {/* MOTOR 2: L2 Mikroyapı & Spoofing Dedektörü */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200 font-mono">
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span>2. Mikroyapı &amp; Spoofing</span>
            </div>
            <span className="text-[10px] font-mono text-amber-300">
              Ağırlık: %25
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
              <div className="text-[10px] text-slate-400">İptal Oranı</div>
              <div
                className={`text-sm font-black mt-0.5 ${
                  effectiveMicro.cancelRatePct >= 35 ? 'text-rose-400' : 'text-slate-200'
                }`}
              >
                %{effectiveMicro.cancelRatePct}
              </div>
            </div>

            <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
              <div className="text-[10px] text-slate-400">Spoofing Riski</div>
              <div
                className={`text-xs font-black mt-1 ${
                  effectiveMicro.spoofingRisk === 'CRITICAL'
                    ? 'text-rose-400 animate-pulse'
                    : effectiveMicro.spoofingRisk === 'HIGH'
                    ? 'text-amber-400'
                    : 'text-emerald-400'
                }`}
              >
                {effectiveMicro.spoofingRisk}
              </div>
            </div>
          </div>

          <div className="space-y-1 text-[10px] font-mono text-slate-400">
            <div className="flex items-center justify-between">
              <span>Gizli Blok (Iceberg):</span>
              <span className={`font-bold ${effectiveMicro.isIcebergDetected ? 'text-purple-300' : 'text-slate-500'}`}>
                {effectiveMicro.isIcebergDetected ? `Teyitli (~${effectiveMicro.estimatedIcebergLot} lot)` : 'Yok'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Mikroyapı Skoru:</span>
              <span className="text-amber-300 font-bold">{effectiveMicro.microstructureScore}/100</span>
            </div>
          </div>
        </div>

        {/* MOTOR 3: Sürü Psikolojisi & FOMO Riski (Behavioral Herding) */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200 font-mono">
              <Users className="w-3.5 h-3.5 text-rose-400" />
              <span>3. Sürü Psikolojisi / FOMO</span>
            </div>
            <span className="text-[10px] font-mono text-rose-300">
              Ağırlık: %20
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
              <div className="text-[10px] text-slate-400">FOMO Riski</div>
              <div
                className={`text-sm font-black mt-0.5 ${
                  effectiveHerding.fomoRiskScore >= 70 ? 'text-rose-400' : 'text-emerald-400'
                }`}
              >
                %{effectiveHerding.fomoRiskScore}
              </div>
            </div>

            <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
              <div className="text-[10px] text-slate-400">KAP Dayanağı</div>
              <div
                className={`text-xs font-black mt-1 ${
                  effectiveHerding.isKapBacked ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {effectiveHerding.isKapBacked ? '✅ TEYİTLİ' : '❌ HABERSİZ'}
              </div>
            </div>
          </div>

          <div className="space-y-1 text-[10px] font-mono text-slate-400">
            <div className="flex items-center justify-between">
              <span>Sürü Seviyesi:</span>
              <span className="font-bold text-slate-300">{effectiveHerding.herdingLevel}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Hacim Şoku:</span>
              <span className="text-cyan-300 font-bold">+{effectiveHerding.volumeZScore}σ</span>
            </div>
          </div>
        </div>

        {/* MOTOR 4: Finansal Kalite & Değer (Value & Forensic Quality) */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200 font-mono">
              <Award className="w-3.5 h-3.5 text-emerald-400" />
              <span>4. Değer &amp; Kalite (Adli)</span>
            </div>
            <span className="text-[10px] font-mono text-emerald-300">
              Ağırlık: %15
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
              <div className="text-[10px] text-slate-400">Piotroski F-Skor</div>
              <div
                className={`text-sm font-black mt-0.5 ${
                  effectiveValue.piotroskiScore >= 7 ? 'text-emerald-400' : 'text-slate-300'
                }`}
              >
                {effectiveValue.piotroskiScore}/9
              </div>
            </div>

            <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
              <div className="text-[10px] text-slate-400">Beneish M-Skor</div>
              <div
                className={`text-sm font-black mt-0.5 ${
                  effectiveValue.beneishMScore < -1.78 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {effectiveValue.beneishMScore}
              </div>
            </div>
          </div>

          <div className="space-y-1 text-[10px] font-mono text-slate-400">
            <div className="flex items-center justify-between">
              <span>Kalite Durumu:</span>
              <span className={`font-bold ${effectiveValue.isQualityValueStock ? 'text-emerald-300' : 'text-slate-300'}`}>
                {effectiveValue.verdict}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Sektör İskontosu:</span>
              <span className="text-cyan-300 font-bold">%{effectiveValue.valuationDiscountPct}</span>
            </div>
          </div>
        </div>

        {/* MOTOR 5: Takvim / Seans Zamanı (Calendar Anomaly) */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200 font-mono">
              <Calendar className="w-3.5 h-3.5 text-purple-400" />
              <span>5. Takvim &amp; Seans Saati</span>
            </div>
            <span className="text-[10px] font-mono text-purple-300">
              Ağırlık: %15
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
              <div className="text-[10px] text-slate-400">Takvim Z-Katkı</div>
              <div className="text-sm font-black text-purple-300 mt-0.5">
                {typeof effectiveCalendar.calendarZScore === 'number' && !isNaN(effectiveCalendar.calendarZScore)
                  ? `${effectiveCalendar.calendarZScore >= 0 ? '+' : ''}${effectiveCalendar.calendarZScore.toFixed(2)}σ`
                  : 'VERİ YOK'}
              </div>
            </div>

            <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
              <div className="text-[10px] text-slate-400">Seans Durumu</div>
              <div className="text-[11px] font-bold text-slate-200 mt-0.5 truncate" title={effectiveCalendar.description || 'Standart'}>
                {effectiveCalendar.description || 'VERİ YOK'}
              </div>
            </div>
          </div>

          <div className="space-y-1 text-[10px] font-mono text-slate-400">
            <div className="flex items-center justify-between">
              <span>Açılış Şoku (10:00-10:30):</span>
              <span className={`font-bold ${effectiveCalendar.isOpeningSpike ? 'text-rose-400' : 'text-slate-500'}`}>
                {effectiveCalendar.isOpeningSpike ? '🚨 AKTİF' : 'BEKLEMEDE'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Kapanış / Karanlık Oda:</span>
              <span className={`font-bold ${effectiveCalendar.isClosingSpike ? 'text-amber-400' : 'text-slate-500'}`}>
                {effectiveCalendar.isClosingSpike ? '⚠️ BASKI' : 'BEKLEMEDE'}
              </span>
            </div>
          </div>
        </div>

        {/* MODÜL 6: Canlı Simülasyon & Test Tetikleme */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2.5 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200 font-mono">
              <Zap className="w-3.5 h-3.5 text-yellow-400" />
              <span>Kuant Test Tetikleyici</span>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
              <Radio className="w-3 h-3 animate-pulse" /> Canlı
            </span>
          </div>

          <div className="space-y-2">
            <button
              type="button"
              onClick={() => handleSimulateAlert('EXPANSION')}
              disabled={isBroadcasting}
              className="w-full py-1.5 px-2 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-[11px] font-mono font-bold transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Activity className="w-3 h-3" />
              <span>1. Aşırı Genişleme Alarmı Test Et</span>
            </button>

            <button
              type="button"
              onClick={() => handleSimulateAlert('SPOOFING')}
              disabled={isBroadcasting}
              className="w-full py-1.5 px-2 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-[11px] font-mono font-bold transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Layers className="w-3 h-3" />
              <span>2. Spoofing &amp; Sahte Tahta Test Et</span>
            </button>

            <button
              type="button"
              onClick={() => handleSimulateAlert('HERDING')}
              disabled={isBroadcasting}
              className="w-full py-1.5 px-2 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-300 text-[11px] font-mono font-bold transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Users className="w-3 h-3" />
              <span>3. Sürü / FOMO Hacmi Test Et</span>
            </button>
          </div>

          {testNotificationStatus && (
            <div className="text-[10px] font-mono text-emerald-300 bg-emerald-950/40 border border-emerald-500/30 p-1.5 rounded-lg text-center animate-fadeIn">
              {testNotificationStatus}
            </div>
          )}
        </div>
      </div>

      {/* 4. En Son Fırlatılan VIP Sinyal / Bildirim Kartı */}
      {latestAlert && (
        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono space-y-1.5">
          <div className="flex items-center justify-between text-slate-400">
            <span className={`font-bold flex items-center gap-1.5 ${latestAlert.level === 'CRITICAL' ? 'text-rose-400' : latestAlert.level === 'WARNING' ? 'text-amber-400' : 'text-cyan-400'}`}>
              <Send className="w-3.5 h-3.5" />
              {latestAlert.title}
            </span>
            <span className="text-[10px] text-slate-500">
              {new Date(latestAlert.timestamp).toLocaleTimeString('tr-TR')}
            </span>
          </div>
          <p className="text-slate-300 text-[11px] leading-relaxed">
            {latestAlert.message}
          </p>
        </div>
      )}
    </div>
  );
};
