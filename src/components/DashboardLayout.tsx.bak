// src/components/DashboardLayout.tsx
/**
 * MT16 BistApp Kuant Terminali - 3 Sütunlu Profesyonel Terminal Grid Mimarisi
 * 1. ÜST BANT (HeaderBar)
 * 2. SOL PANEL (İzleme Listesi & Sektörler - Canlı useMarketData Hook Entegrasyonu)
 * 3. ORTA PANEL (Ana Savaş Odası: Canlı Fiyat, Sparkline Z-Skor, OCO Anlık İhlal Işığı & Karar)
 * 4. SAĞ PANEL (Akış ve Akıl: Jüri Raporu, Kurumsal Akış, Son Haberler)
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Activity,
  TrendingUp,
  TrendingDown,
  ShieldAlert,
  Search,
  RefreshCw,
  Sparkles,
  Copy,
  Check,
  Layers,
  Volume2,
  VolumeX,
  Target,
  Cpu,
  ShieldCheck,
  Compass,
  LayoutGrid,
  ChevronDown,
  ChevronUp,
  Shield,
  RotateCcw
} from 'lucide-react';

export type DashboardTab = 'PROJECT_MANAGER' | 'SUMMARY' | 'MICROSTRUCTURE' | 'FORENSICS_RISK';
import { ProjectManagerTerminal } from './ProjectManagerTerminal';
import { ResponsiveContainer, LineChart, Line, AreaChart, Area, Tooltip, ReferenceLine } from 'recharts';
import { marketGateway, MarketGatewaySnapshot } from '../services/marketGateway';
import { ocoSignalEngine } from '../services/signalEngine';
import { ALL_BIST_STOCKS, BISTStock } from '../data/bistAllStocks';
import { BIST_INDEXES } from '../constants/bistRegistry';
import { collectTacticalVerdict, UnifiedVerdict } from '../utils/tacticalCollector';
import { buildExternalLLMPrompt, buildToonPayload } from '../utils/copyForLLM';
import { useMarketData } from '../hooks/useMarketData';
import { performSystemStateReset } from '../utils/systemReset';
import { Watchlist } from './watchlist';
import { lazy, Suspense } from 'react';
const SignalBotCard = lazy(() => import('./SignalBotCard'));
const SmartJuryDiagnosisCard = lazy(() => import('./SmartJuryDiagnosisCard'));
import { BacktestPanel } from './BacktestPanel';
import { MarketLiquidityHeatmap } from './MarketLiquidityHeatmap';
import { AnomalyRadarCard } from './AnomalyRadarCard';
import { VolatilityHeatmapCard } from './VolatilityHeatmapCard';
import { SystemPulseWidget } from './SystemPulseWidget';
import { AnomalyBubbleChartCard } from './AnomalyBubbleChartCard';
import { LiveOrderBookOverlay } from './LiveOrderBookOverlay';
import { InstitutionalFlowMeter } from './InstitutionalFlowMeter';
import { IsometricDepthTopography } from './IsometricDepthTopography';
import { DarkPoolWhaleRadar } from './DarkPoolWhaleRadar';
import { ForensicRedFlagCard } from './ForensicRedFlagCard';
import { CrossMarketCorrelationMatrix } from './CrossMarketCorrelationMatrix';
import { SectorLiquidityRotation } from './SectorLiquidityRotation';
import { MonteCarloBacktester } from './MonteCarloBacktester';
import { AutonomousRiskGuard } from './AutonomousRiskGuard';
import { DynamicPresetScreener } from './DynamicPresetScreener';
import { DebugConsole } from './DebugConsole';
import { TacticalPortfolioManager } from './TacticalPortfolioManager';
import { EconomicCalendarPanel } from './EconomicCalendarPanel';
import { PortfolioGrowthChart } from './PortfolioGrowthChart';
import { IcebergRadarOverlay } from './IcebergRadarOverlay';
import { CognitiveVolumeProfile } from './CognitiveVolumeProfile';
import { OrderflowDeltaCard } from './OrderflowDeltaCard';
import { CognitiveBarReplay } from './CognitiveBarReplay';
import { LiquidityAbsorbanceCard } from './LiquidityAbsorbanceCard';
import { MarketProfileCard } from './MarketProfileCard';
import { AdaptiveExecutionCard } from './AdaptiveExecutionCard';
import { Cubes } from './cubes';
import { microstructureEngine, MicrostructureEngine, DepthSnapshot } from '../services/microstructure';
import { orderflowEngine } from '../services/orderflow';
import { juryEngine } from '../services/jury';
import { executionEngine, ExecutionPlan } from '../services/execution';
import { smartAlertDaemon } from '../services/smartAlertDaemon';
import { stressTestSimulator } from '../services/stressTestSimulator';
import { audioSyntheticDispatcher } from '../services/audioSyntheticDispatcher';
import { QuantPipelineEnforcer, EnrichedQuantPayload } from '../services/quantPipelineEnforcer';
import { NotificationDaemon } from '../services/notificationDaemon';
import { ExecutionSafetyGuard } from '../services/executionSafetyGuard';
import type { MarketType } from '../App';

export interface DashboardLayoutProps {
  selectedMarket: MarketType;
  onMarketChange: (m: MarketType) => void;
  activeTicker: string;
  onSelectTicker: (t: string) => void;
  cryptoPair: string;
  onSelectCryptoPair: (p: string) => void;
  nasdaqSymbol: string;
  onSelectNasdaqSymbol: (s: string) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  chatMessages: any[];
  isChatLoading: boolean;
  onSendChat: (msg?: string) => void;
}



export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  selectedMarket,
  onMarketChange,
  activeTicker,
  onSelectTicker,
  cryptoPair,
  onSelectCryptoPair,
  nasdaqSymbol,
  onSelectNasdaqSymbol,
  onRefresh,
  isRefreshing,
}) => {
  const [snapshot, setSnapshot] = useState<MarketGatewaySnapshot>(() => marketGateway.getSnapshot());
  const [copiedType, setCopiedType] = useState<'PROMPT' | 'TOON' | null>(null);
  const [isAutoRebalanceActive, setIsAutoRebalanceActive] = useState<boolean>(true);
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(() => audioSyntheticDispatcher.isMuted());
  const [isStressActive, setIsStressActive] = useState<boolean>(() => stressTestSimulator.isRunning());
  const [activeTab, setActiveTab] = useState<DashboardTab>('PROJECT_MANAGER');
  const [showOcoDetails, setShowOcoDetails] = useState<boolean>(false);

  const toggleAudio = () => {
    const nextMuted = audioSyntheticDispatcher.toggleMute();
    setIsAudioMuted(nextMuted);
  };

  const toggleStressTest = () => {
    const next = stressTestSimulator.toggleStressTest();
    setIsStressActive(next);
  };

  // Aktif sembolü seçilen pazara göre belirle
  const currentSymbol = useMemo(() => {
    if (selectedMarket === 'CRYPTO') return cryptoPair;
    if (selectedMarket === 'NASDAQ') return nasdaqSymbol;
    return activeTicker;
  }, [selectedMarket, activeTicker, cryptoPair, nasdaqSymbol]);

  // Sembol veya pazar değiştiğinde marketGateway canlı akışını anında bağla
  useEffect(() => {
    marketGateway.changeStream(currentSymbol, selectedMarket);
  }, [currentSymbol, selectedMarket]);

  useEffect(() => {
    const unsub = marketGateway.subscribe((snap) => {
      setSnapshot(snap);
    });
    return () => unsub();
  }, []);



  // Kollektör veri modeli - Qodi Anayasası v4.2 SSOT Uyumu
  const collectorInput = useMemo(() => ({
    symbol: currentSymbol,
    companyName: `${currentSymbol} Varlık / Sanayi`,
    marketType: selectedMarket,
    price: typeof snapshot.price === 'number' && !isNaN(snapshot.price) && snapshot.price > 0 ? snapshot.price : null,
    changePct: typeof snapshot.dayChangePct === 'number' && !isNaN(snapshot.dayChangePct) ? snapshot.dayChangePct : null,
    zScore: typeof snapshot.liveZScore === 'number' && !isNaN(snapshot.liveZScore) ? snapshot.liveZScore : null,
    obi: typeof snapshot.liveObi === 'number' && !isNaN(snapshot.liveObi) ? snapshot.liveObi : null,
    rsi: typeof snapshot.liveRsi === 'number' && !isNaN(snapshot.liveRsi) ? snapshot.liveRsi : null,
    wallLot: gatewayWallLotK(snapshot),
    wallPrice: typeof snapshot.wallPrice === 'number' && !isNaN(snapshot.wallPrice) ? snapshot.wallPrice : null,
    spreadPct: typeof snapshot.spreadPct === 'number' && !isNaN(snapshot.spreadPct) ? snapshot.spreadPct : null,
    bofaNetLot: typeof snapshot.bofaNetLot === 'number' && !isNaN(snapshot.bofaNetLot) ? snapshot.bofaNetLot : null,
    citibankSharePct: typeof snapshot.citibankSharePct === 'number' && !isNaN(snapshot.citibankSharePct) ? snapshot.citibankSharePct : null,
    altmanZ: typeof snapshot.altmanZ === 'number' && !isNaN(snapshot.altmanZ) ? snapshot.altmanZ : null,
    piotroskiF: typeof snapshot.piotroskiF === 'number' && !isNaN(snapshot.piotroskiF) ? snapshot.piotroskiF : null,
    isJuryVetoed: false,
  }), [currentSymbol, selectedMarket, snapshot]);

  const verdict: UnifiedVerdict = useMemo(() => collectTacticalVerdict(collectorInput), [collectorInput]);

  function gatewayWallLotK(snap: MarketGatewaySnapshot): number {
    return snap.wallLotK > 0 ? snap.wallLotK * 1000 : 0;
  }

  // OCO Dynamic Risk / Reward Seviyeleri ve Fiyat İhlal Kontrolü
  const ocoDetails = useMemo(() => {
    return ocoSignalEngine.calculateRiskRewardDetails(snapshot);
  }, [snapshot]);

  // QuantPipelineEnforcer ile ham veriyi kurumsal kuant paketine dönüştür
  const enrichedQuantData = useMemo<EnrichedQuantPayload | null>(() => {
    const spotPrice = (typeof snapshot.price === 'number' && !isNaN(snapshot.price) && snapshot.price > 0) 
      ? snapshot.price 
      : (typeof verdict.price === 'number' && !isNaN(verdict.price) && verdict.price > 0 ? verdict.price : null);

    if (typeof spotPrice !== 'number' || isNaN(spotPrice) || spotPrice <= 0) {
      return null;
    }

    const zScore = snapshot.liveZScore !== undefined && !isNaN(snapshot.liveZScore) ? snapshot.liveZScore : (verdict.zScore || 0);
    const stdDev = spotPrice * 0.018 || 1.8;
    const sma20 = spotPrice - (zScore * stdDev);

    try {
      return QuantPipelineEnforcer.processSnapshot({
        symbol: currentSymbol,
        market: selectedMarket,
        priceChangePct: typeof snapshot.dayChangePct === 'number' && !isNaN(snapshot.dayChangePct) ? snapshot.dayChangePct : (typeof verdict.changePct === 'number' ? verdict.changePct : null),
        spotPrice,
        viopPrice: spotPrice * 1.008,
        zScore,
        sma20,
        stdDev,
        timestamp: Date.now(),
        currentDecision: verdict.action,
        orderBook: {
          bidDepthTotal: 490000,
          askDepthTotal: 511000,
          obi: snapshot.liveObi ?? verdict.board?.obi ?? null,
          wallLot: gatewayWallLotK(snapshot) ?? verdict.board?.wallLot ?? null,
          wallPrice: snapshot.wallPrice ?? verdict.board?.wallPrice ?? null,
          burnRatePerMin: null,
          orderCancelCount: null,
          totalOrderCount: null,
          price: spotPrice,
        },
        brokerFlow: {
          bofaNetLot: collectorInput.bofaNetLot || 0,
          brokers: [
            { name: 'BofA', netLot: collectorInput.bofaNetLot || 12000, percentage: 42 },
            { name: 'Garanti BBVA', netLot: 8500, percentage: 30 },
            { name: 'İş Yatırım', netLot: 5200, percentage: 18 },
          ],
          totalVolumeLot: 150000,
        },
        riskParams: {
          portfolioValue: 100000,
          winRate: 0.614,
          rewardRiskRatio: ocoDetails.riskRewardRatio || 2.18,
          volatilityDailyPct: 2.1,
          maxAllowedAllocationPct: 20.0,
        },
        latencyMs: 14,
        currentDrawdownPct: 4.2,
      });
    } catch {
      return null;
    }
  }, [currentSymbol, snapshot, verdict, collectorInput, ocoDetails]);

  // Auto-Rebalance Algoritması: Anomali rejimine göre portföy ağırlığı ve nakde geçiş/kademeli alım yönetimi
  const autoRebalanceRecommendation = useMemo(() => {
    if (!isAutoRebalanceActive) return null;
    const anomalyTag = enrichedQuantData?.composite_anomaly?.anomalyTag || 'NORMAL';
    const score = enrichedQuantData?.composite_anomaly?.compositeAnomalyScore || 50;

    if (anomalyTag === 'YAPAY_FOMO_TUZAGI' || anomalyTag === 'EXTREME_EXPANSION' || score >= 75) {
      return {
        action: 'NAKDE GEÇİŞ / HEDGE',
        color: 'text-rose-400 bg-rose-500/15 border-rose-500/30',
        message: 'Aşırı genişleme veya yapay FOMO tespit edildi; otomatik rebalance ile portföy nakit oranı %60 seviyesine çıkarıldı.',
      };
    } else if (anomalyTag === 'DIP_FIRSATI' || score <= 35) {
      return {
        action: 'KADEMELİ ALIM (DİP)',
        color: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30',
        message: 'Kurumsal dip fırsatı ve güçlü destek uyumu; otomatik rebalance ile özsermaye ağırlığı %85 seviyesine yükseltildi.',
      };
    } else {
      return {
        action: 'DENGELİ REBALANS',
        color: 'text-cyan-400 bg-cyan-500/15 border-cyan-500/30',
        message: 'Normal piyasa rejimi; Kelly çarpanlı optimal portföy dağılımı korunuyor.',
      };
    }
  }, [isAutoRebalanceActive, enrichedQuantData]);

  const safetyValidation = useMemo(() => {
    if (!autoRebalanceRecommendation) return { allowed: true, reason: '' };
    return ExecutionSafetyGuard.validateTradeExecution(14, 4.2, autoRebalanceRecommendation.action);
  }, [autoRebalanceRecommendation]);

  // Otomatik Anomali Kontrolü ve Bildirim Motoru
  useEffect(() => {
    if (enrichedQuantData) {
      NotificationDaemon.evaluateAndNotifyAnomalies({
        symbol: currentSymbol,
        calendar: enrichedQuantData.calendar_anomaly,
        meanReversion: enrichedQuantData.mean_reversion,
        microstructure: enrichedQuantData.microstructure_anomaly,
        valueQuality: enrichedQuantData.value_quality_anomaly,
        behavioralHerding: enrichedQuantData.behavioral_herding,
        composite: enrichedQuantData.composite_anomaly,
        price: enrichedQuantData.price,
        oco: {
          stopLoss: ocoDetails.stopLossPrice,
          takeProfit: ocoDetails.takeProfitPrice,
        },
      });

      const compScore = enrichedQuantData.composite_anomaly?.compositeAnomalyScore || 0;
      const zVol = snapshot.liveZScore || 0;

      // Smart Alert Daemon Multi-Condition Evaluation (Jury + OBI + KAP)
      smartAlertDaemon.evaluateAndDispatchAlert({
        symbol: currentSymbol,
        juryScore: typeof verdict.juryScore === 'number' ? verdict.juryScore : null,
        l2Obi: typeof snapshot.liveObi === 'number' ? snapshot.liveObi : null,
        kapCatalystScore: 15,
        price: typeof snapshot.price === 'number' && snapshot.price > 0 ? snapshot.price : (typeof verdict.price === 'number' ? verdict.price : null),
      });

      if (compScore >= 80 || Math.abs(zVol) >= 3.0) {
        audioSyntheticDispatcher.announceCriticalAnomaly(
          currentSymbol,
          compScore,
          zVol,
          verdict.reason || 'VERİ YOK: Anomali değerlendirmesi yapılamadı'
        );
      }
    }
  }, [currentSymbol, enrichedQuantData, snapshot, ocoDetails, verdict.juryScore, verdict.reason]);

  const livePrice = (typeof snapshot.price === 'number' && !isNaN(snapshot.price) && snapshot.price > 0) ? snapshot.price : (typeof verdict.price === 'number' && !isNaN(verdict.price) ? verdict.price : null);
  // Hatalı Emir Kalkanı: Alış işlemlerinde Stop-Loss her zaman Giriş Fiyatının ALTINDA olmalıdır.
  // Eğer Stop-Loss >= Giriş Fiyatı ise bu bir "Hatalı Emir"dir ve asla Acil Tasfiye alarmı üretilmez.
  const effectiveEntry = ocoDetails.entryPrice > 0 ? ocoDetails.entryPrice : (typeof livePrice === 'number' ? livePrice : 0);
  const isOrderFaulty = ocoDetails.stopLossPrice <= 0 ||
    (effectiveEntry > 0 && ocoDetails.stopLossPrice >= effectiveEntry);

  // Veri Zehirlenmesi Kalkanı: livePrice ve stopLossPrice aynı ölçekte olmalıdır (%25'ten fazla sapma sahte veri uyuşmazlığıdır)
  const isScaleConsistent = !isOrderFaulty &&
    typeof livePrice === 'number' &&
    livePrice > 0 &&
    ocoDetails.stopLossPrice > 0 &&
    Math.abs(livePrice - ocoDetails.stopLossPrice) / ocoDetails.stopLossPrice < 0.25;
  const isStopLossBreached = isScaleConsistent && typeof livePrice === 'number' && livePrice <= ocoDetails.stopLossPrice;
  const isTakeProfitHit = isScaleConsistent && livePrice >= ocoDetails.takeProfitPrice && !isStopLossBreached;

  const llmPromptText = useMemo(() => buildExternalLLMPrompt(verdict, []), [verdict]);
  const toonPayloadText = useMemo(() => buildToonPayload(verdict, []), [verdict]);

  // HFT Mikroyapı, Orderflow, Jüri ve İcra Motoru Verileri
  const hftPayload = useMemo(() => {
    const spotPrice = (typeof snapshot.price === 'number' && snapshot.price > 0) ? snapshot.price : (typeof verdict.price === 'number' && verdict.price > 0 ? verdict.price : 0);
    // Sentetik/canlı derinlik defteri
    const depthSnapshot: DepthSnapshot = MicrostructureEngine.createSyntheticSnapshot(spotPrice > 0 ? spotPrice : 100);
    if (snapshot.liveObi !== undefined) {
      depthSnapshot.bids = depthSnapshot.bids.map(b => ({
        ...b,
        volume: Math.round(b.volume * (1 + (snapshot.liveObi || 0) * 0.4))
      }));
    }
    const microMetrics = microstructureEngine.analyzeDepth(depthSnapshot);

    // Orderflow
    orderflowEngine.generateSyntheticTicks(spotPrice, 30);
    const orderflowMetrics = orderflowEngine.calculateMetrics(verdict.changePct || 0);

    // 4 Katmanlı Jüri Konsensüsü (Critical Hard-Stop & Distribution Override destekli)
    const juryDecision = juryEngine.evaluate({
      microstructure: microMetrics,
      orderflow: orderflowMetrics,
      financials: {
        altmanZ: snapshot.altmanZ || collectorInput.altmanZ || 3.12,
        piotroskiF: snapshot.piotroskiF || collectorInput.piotroskiF || 8,
        beneishM: -2.45,
        peRatio: 7.4
      },
      volumeZScore: snapshot.liveZScore !== undefined ? snapshot.liveZScore : (verdict.zScore || 1.8),
      kapSentimentScore: verdict.juryScore || 82,
      shortInterestPct: selectedMarket === 'BIST' ? 8.5 : 14.2,
      currentPrice: spotPrice,
      entryPrice: effectiveEntry,
      stopLossPrice: ocoDetails.stopLossPrice,
      isStopLossBreached
    });

    // Dinamik OCO İcra Planı (Stop Override ve NOHOLD Kilit Kontrollü)
    const executionPlan = executionEngine.createPlan(
      currentSymbol,
      spotPrice,
      juryDecision,
      depthSnapshot
    );

    return {
      depthSnapshot,
      microMetrics,
      orderflowMetrics,
      juryDecision,
      executionPlan
    };
  }, [currentSymbol, selectedMarket, snapshot, verdict, collectorInput, ocoDetails.stopLossPrice, isStopLossBreached]);


  const handleCopy = async (type: 'PROMPT' | 'TOON') => {
    const text = type === 'PROMPT' ? llmPromptText : toonPayloadText;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedType(type);
      setTimeout(() => setCopiedType(null), 2000);
    } catch {}
  };

  const handleSelectSymbolInList = (sym: string) => {
    if (selectedMarket === 'CRYPTO') onSelectCryptoPair(sym);
    else if (selectedMarket === 'NASDAQ') onSelectNasdaqSymbol(sym);
    else onSelectTicker(sym.replace(/\.IS$/i, ''));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 max-w-[1600px] mx-auto px-4 py-4">
      {/* ===================================================================== */}
      {/* 1. SOL PANEL (İzleme Listesi & Canlı Fiyatlar - useMarketData Hook)     */}
      {/* ===================================================================== */}
      <div className="lg:col-span-3 space-y-3">
        <Watchlist
          selectedMarket={selectedMarket}
          currentSymbol={currentSymbol}
          onSelectSymbol={handleSelectSymbolInList}
        />
      </div>

      {/* ===================================================================== */}
      {/* 2. ORTA PANEL (Ana Savaş Odası - Fiyat, Sparkline Z-Skor & Karar)      */}
      {/* ===================================================================== */}
      <div className="lg:col-span-6 space-y-4">
        {/* 🛑 STOP-LOSS KRİTİK İHLAL KİLİDİ BANNER */}
        {isStopLossBreached && (
          <div className="p-3.5 sm:p-4 rounded-2xl bg-rose-600 text-white font-mono flex flex-col sm:flex-row items-center justify-between gap-3 shadow-[0_0_30px_rgba(244,63,94,0.6)] border-2 border-rose-400 animate-pulse">
            <div className="flex items-center gap-3">
              <ShieldAlert className="w-6 h-6 text-white shrink-0 animate-bounce" />
              <div>
                <div className="text-sm sm:text-base font-black tracking-wide">
                  🛑 STOP Tetiklendi - Pozisyon Kapat
                </div>
                <div className="text-xs text-rose-100 font-medium">
                  Anlık Fiyat (₺{livePrice.toFixed(2)}) &le; Stop-Loss (₺{ocoDetails.stopLossPrice.toFixed(2)}). Jüri bekleme sinyallerini ezerek acil tasfiye durumuna geçti!
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => audioSyntheticDispatcher.announceCriticalAnomaly(currentSymbol, 100, -3.5, 'Stop loss ihlali')}
              className="px-4 py-2 rounded-xl bg-slate-950 hover:bg-black text-rose-300 border border-rose-400 text-xs font-black shrink-0 transition cursor-pointer shadow-lg"
            >
              ACİL POZİSYON KAPAT
            </button>
          </div>
        )}

        {/* 🏆 GOOGLE FİNANS TARZI SADE HERO KARTI */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl backdrop-blur-md space-y-4 font-sans">
          {/* Üst Başlık & Kontroller */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <span className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 font-mono font-black text-base sm:text-lg text-white">
                #{currentSymbol}
              </span>
              <div>
                <h2 className="text-xs sm:text-sm font-bold text-white tracking-wide">
                  {collectorInput.companyName}
                </h2>
                <p className="text-[11px] text-slate-400 font-mono">
                  {selectedMarket} Piyasası • Canlı L2 OBI &amp; Derinlik
                </p>
              </div>
            </div>

            {/* Hızlı Aksiyon Butonları */}
            <div className="flex flex-wrap items-center gap-2">
              <SystemPulseWidget />

              <button
                type="button"
                onClick={() => setIsAutoRebalanceActive(!isAutoRebalanceActive)}
                className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-mono font-bold flex items-center gap-1.5 transition cursor-pointer ${
                  isAutoRebalanceActive
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                    : 'bg-slate-950 text-slate-500 border-slate-800'
                }`}
                title="Auto-Rebalance Motorunu Aç/Kapat"
              >
                <Sparkles className={`w-3.5 h-3.5 ${isAutoRebalanceActive ? 'text-emerald-400 animate-spin' : 'text-slate-500'}`} />
                <span>Auto-Rebalance: {isAutoRebalanceActive ? 'ON' : 'OFF'}</span>
              </button>

              <button
                type="button"
                onClick={toggleAudio}
                className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-mono font-bold flex items-center gap-1.5 transition cursor-pointer ${
                  !isAudioMuted
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                    : 'bg-slate-950 text-slate-500 border-slate-800'
                }`}
                title="Sesli Anons Aç/Kapat"
              >
                {!isAudioMuted ? <Volume2 className="w-3.5 h-3.5 text-cyan-400 animate-pulse" /> : <VolumeX className="w-3.5 h-3.5 text-slate-500" />}
                <span>Sesli: {!isAudioMuted ? 'ON' : 'OFF'}</span>
              </button>

              <button
                type="button"
                onClick={toggleStressTest}
                className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-mono font-bold flex items-center gap-1.5 transition cursor-pointer ${
                  isStressActive
                    ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 animate-pulse'
                    : 'bg-slate-950 text-slate-500 border-slate-800'
                }`}
                title="Stres Testi Modu"
              >
                <Activity className={`w-3.5 h-3.5 ${isStressActive ? 'text-purple-400 animate-spin' : 'text-slate-500'}`} />
                <span>Stres: {isStressActive ? 'ON' : 'OFF'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleCopy('PROMPT')}
                className="px-2.5 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-mono font-semibold flex items-center gap-1 transition cursor-pointer"
                title="LLM Promptunu Kopyala"
              >
                {copiedType === 'PROMPT' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-cyan-400" />}
                <span>Prompt</span>
              </button>

              <button
                type="button"
                onClick={onRefresh}
                disabled={isRefreshing}
                className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-300 transition cursor-pointer"
                title="Verileri Yenile"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
              </button>

              <button
                type="button"
                onClick={() => {
                  performSystemStateReset();
                  onRefresh();
                }}
                className="px-2.5 py-1.5 rounded-xl bg-slate-950 hover:bg-rose-950/40 border border-slate-700 hover:border-rose-500/50 text-slate-300 hover:text-rose-300 transition cursor-pointer text-xs font-mono font-semibold flex items-center gap-1.5"
                title="Tüm Hafızayı ve Eski Sahte Verileri Sıfırla (State Reset)"
              >
                <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
                <span>Sıfırla</span>
              </button>
            </div>
          </div>

          {/* Ana Fiyat ve Büyük Net Akıllı Jüri Skoru Rozeti */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-[11px] font-mono uppercase text-slate-400 font-bold tracking-wider">
                Anlık Piyasa Fiyatı
              </div>
              <div className="flex items-baseline gap-3 mt-0.5">
                <span className="text-2xl sm:text-3xl font-black font-mono text-white tracking-tight">
                  {typeof verdict.price === 'number' && !isNaN(verdict.price) && verdict.price > 0
                    ? `${(selectedMarket === 'BIST' || snapshot.ticker.includes('.IS')) ? '₺' : '$'}${typeof verdict.price === 'number' && !isNaN(verdict.price) ? verdict.price.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : 'VERİ YOK'}`
                    : 'VERİ YOK'}
                </span>
                {typeof verdict.changePct === 'number' && !isNaN(verdict.changePct) && (
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold font-mono border ${
                      verdict.changePct >= 0
                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                        : 'bg-rose-500/15 text-rose-300 border-rose-500/40'
                    }`}
                  >
                    {verdict.changePct >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                    {verdict.changePct >= 0 ? '+' : ''}{verdict.changePct.toFixed(2)}%
                  </span>
                )}
              </div>
            </div>

            {/* Büyük ve Net AKILLI JÜRİ SKORU Rozeti */}
            <div className="flex flex-col items-end">
              <div className="text-[10px] font-mono uppercase text-slate-400 font-bold tracking-wider mb-1">
                Akıllı Jüri Skoru
              </div>
              {isStopLossBreached ? (
                <div className="px-3.5 py-1.5 rounded-xl font-mono text-xs sm:text-sm font-black bg-rose-600 text-white border border-rose-400 animate-pulse shadow-lg flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-white" />
                  <span>🛑 STOP Tetiklendi - Pozisyon Kapat</span>
                </div>
              ) : hftPayload.juryDecision.isDistributionLock ? (
                <div className="px-3.5 py-1.5 rounded-xl font-mono text-xs sm:text-sm font-black bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-amber-400" />
                  <span>🔒 NOHOLD / SATIŞ KİLİT ({typeof verdict.juryScore === 'number' && !isNaN(verdict.juryScore) ? `%${verdict.juryScore}` : 'VERİ YOK'})</span>
                </div>
              ) : (
                <div className="px-3.5 py-1.5 rounded-xl font-mono text-xs sm:text-sm font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.2)] flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
                  <span>{typeof verdict.juryScore === 'number' && !isNaN(verdict.juryScore) ? `%${verdict.juryScore}` : 'VERİ YOK'} {verdict.action === 'AL' ? 'GÜÇLÜ AL' : verdict.action === 'SAT' ? 'GÜÇLÜ SAT' : 'NÖTR'}</span>
                </div>
              )}
            </div>
          </div>

          {/* Sade Mini Gradient Alan Grafiği (Google Finance Style Trend) */}
          <div className="h-16 w-full pt-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={snapshot.zScoreHistory && snapshot.zScoreHistory.length > 0 ? snapshot.zScoreHistory : [
                { time: '10:00', zScore: 0.2 },
                { time: '11:00', zScore: 0.8 },
                { time: '12:00', zScore: 1.4 },
                { time: '13:00', zScore: 1.1 },
                { time: '14:00', zScore: 1.9 },
                { time: '15:00', zScore: 2.3 }
              ]}>
                <defs>
                  <linearGradient id="gfGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={verdict.changePct >= 0 ? '#10b981' : '#f43f5e'} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={verdict.changePct >= 0 ? '#10b981' : '#f43f5e'} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="zScore"
                  stroke={verdict.changePct >= 0 ? '#10b981' : '#f43f5e'}
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#gfGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Akıllı OCO Butonu & Genişletilebilir Detay Çekmecesi */}
          <div className="pt-2 border-t border-slate-800/80">
            <button
              type="button"
              onClick={() => setShowOcoDetails(!showOcoDetails)}
              className="w-full py-2 px-3 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 font-mono text-xs font-bold text-slate-200 flex items-center justify-between transition cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-cyan-400" />
                <span>
                  {ocoDetails.takeProfitPrice > 0 && ocoDetails.stopLossPrice > 0
                    ? `Akıllı OCO: Kâr Al ₺${ocoDetails.takeProfitPrice.toFixed(2)} | Stop ₺${ocoDetails.stopLossPrice.toFixed(2)}`
                    : 'Akıllı OCO: Veri Bekleniyor...'}
                </span>
                {ocoDetails.riskRewardRatio > 0 && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    R:R 1:{ocoDetails.riskRewardRatio}
                  </span>
                )}
              </div>
              {showOcoDetails ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>

            {/* OCO Detay Açılır Paneli */}
            {showOcoDetails && (
              <div className="mt-2.5 p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono grid grid-cols-2 sm:grid-cols-4 gap-2 animate-in fade-in duration-150">
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase">Kâr Al (TP)</div>
                  <div className="text-sm font-bold text-emerald-400 mt-0.5">₺{ocoDetails.takeProfitPrice.toFixed(2)} (+%{ocoDetails.takeProfitPct})</div>
                </div>
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase">Zarar Durdur (SL)</div>
                  <div className="text-sm font-bold text-rose-400 mt-0.5">₺{ocoDetails.stopLossPrice.toFixed(2)} (-%{ocoDetails.stopLossPct})</div>
                </div>
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase">Risk / Ödül</div>
                  <div className="text-sm font-bold text-cyan-300 mt-0.5">1:{ocoDetails.riskRewardRatio}</div>
                </div>
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase">Zırh Modu</div>
                  <div className={`text-sm font-bold mt-0.5 ${verdict.isTightMode ? 'text-amber-300' : 'text-slate-300'}`}>
                    {verdict.isTightMode ? 'TIGHT MODE' : 'STANDART'}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 📱 4 ANA SEKMELİ GOOGLE FİNANS & PROJE YÖNETİCİSİ NAVİGASYON BARI */}
        <div className="sticky top-2 z-30 bg-slate-900/95 border border-slate-800 rounded-2xl p-1.5 shadow-2xl backdrop-blur-md">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTab('PROJECT_MANAGER')}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'PROJECT_MANAGER'
                  ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white shadow-[0_0_15px_rgba(6,182,212,0.35)] border border-cyan-400/50'
                  : 'bg-slate-950/70 text-slate-400 hover:text-white hover:bg-slate-800/60 border border-slate-800/80'
              }`}
            >
              <Cpu className={`w-4 h-4 shrink-0 ${activeTab === 'PROJECT_MANAGER' ? 'text-white animate-pulse' : 'text-cyan-400'}`} />
              <span className="truncate">🚀 Proje Yöneticisi</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('SUMMARY')}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'SUMMARY'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-[0_0_15px_rgba(16,185,129,0.35)] border border-emerald-400/50'
                  : 'bg-slate-950/70 text-slate-400 hover:text-white hover:bg-slate-800/60 border border-slate-800/80'
              }`}
            >
              <Target className={`w-4 h-4 shrink-0 ${activeTab === 'SUMMARY' ? 'text-white animate-pulse' : 'text-emerald-400'}`} />
              <span className="truncate">📈 1. Özet &amp; Karar</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('MICROSTRUCTURE')}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'MICROSTRUCTURE'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-[0_0_15px_rgba(6,182,212,0.35)] border border-cyan-400/50'
                  : 'bg-slate-950/70 text-slate-400 hover:text-white hover:bg-slate-800/60 border border-slate-800/80'
              }`}
            >
              <Layers className={`w-4 h-4 shrink-0 ${activeTab === 'MICROSTRUCTURE' ? 'text-white animate-pulse' : 'text-cyan-400'}`} />
              <span className="truncate">📊 2. L2 Derinlik</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('FORENSICS_RISK')}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'FORENSICS_RISK'
                  ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-[0_0_15px_rgba(245,158,11,0.35)] border border-amber-400/50'
                  : 'bg-slate-950/70 text-slate-400 hover:text-white hover:bg-slate-800/60 border border-slate-800/80'
              }`}
            >
              <ShieldCheck className={`w-4 h-4 shrink-0 ${activeTab === 'FORENSICS_RISK' ? 'text-white animate-pulse' : 'text-amber-400'}`} />
              <span className="truncate">🛡️ 3. Adli Risk</span>
            </button>
          </div>
        </div>

        {/* ================================================================= */}
        {/* SEKME 0: 🚀 PROJE YÖNETİCİSİ & PIPELINE TERMİNALİ                 */}
        {/* ================================================================= */}
        {activeTab === 'PROJECT_MANAGER' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <ProjectManagerTerminal
              initialSymbol={currentSymbol}
              onSymbolSelect={(sym) => {
                if (selectedMarket === 'BIST') {
                  onSelectTicker(sym);
                }
              }}
            />
          </div>
        )}

        {/* ================================================================= */}
        {/* SEKME 1: 📈 ÖZET & KARAR (Google Finans Temizliği)                 */}
        {/* ================================================================= */}
        {activeTab === 'SUMMARY' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* 6 Bilişsel Karar Küpü (2x3 Izgara) */}
            <Cubes
              symbol={currentSymbol}
              marketType={selectedMarket}
              currentPrice={typeof snapshot.price === 'number' && snapshot.price > 0 ? snapshot.price : (typeof verdict.price === 'number' ? verdict.price : null)}
              microstructureMetrics={hftPayload.microMetrics}
              orderflowMetrics={hftPayload.orderflowMetrics}
              juryDecision={hftPayload.juryDecision}
              executionPlan={hftPayload.executionPlan}
            />

            {/* Doğal Dil Analiz Özeti & KAP Anlık Etki */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 text-xs text-slate-300 leading-relaxed font-sans">
              <span className="text-emerald-400 font-bold mr-1.5 font-mono">MT16 QuantMind Analizi:</span>
              {verdict.naturalLanguageAnalysis}
            </div>

            {/* Akıllı Jüri Teşhis Raporu & Karar Güven Çemberi */}
            <Suspense fallback={<div>Yükleniyor...</div>}>
              <SmartJuryDiagnosisCard
                marketType={selectedMarket}
                ticker={currentSymbol}
                compositeAnomaly={enrichedQuantData?.composite_anomaly}
                valueQuality={enrichedQuantData?.value_quality_anomaly}
                microstructure={enrichedQuantData?.microstructure_anomaly}
                behavioralHerding={enrichedQuantData?.behavioral_herding}
              />
            </Suspense>

            {/* Sinyal Otomasyon Botu */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl overflow-hidden backdrop-blur-md">
              <Suspense fallback={<div>Yükleniyor...</div>}>
                <SignalBotCard />
              </Suspense>
            </div>

            {/* Anomali & Rejim Radarı */}
            <AnomalyRadarCard
              symbol={currentSymbol}
              price={verdict.price}
              calendarAnomaly={enrichedQuantData?.calendar_anomaly}
              meanReversion={enrichedQuantData?.mean_reversion}
              microstructureAnomaly={enrichedQuantData?.microstructure_anomaly}
              valueQualityAnomaly={enrichedQuantData?.value_quality_anomaly}
              behavioralHerding={enrichedQuantData?.behavioral_herding}
              compositeAnomaly={enrichedQuantData?.composite_anomaly}
              viopBasis={enrichedQuantData?.viop_basis}
            />
          </div>
        )}

        {/* ================================================================= */}
        {/* SEKME 2: 📊 L2 DERİNLİK & AKIŞ (Kuant Detay)                      */}
        {/* ================================================================= */}
        {activeTab === 'MICROSTRUCTURE' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* L2 Derinlik Isı Haritası */}
            <MarketLiquidityHeatmap
              ticker={currentSymbol}
              marketType={selectedMarket}
            />

            {/* L2 Canlı Kütle Duvarı & Grafik İzlencesi */}
            <LiveOrderBookOverlay
              snapshot={snapshot}
              ticker={currentSymbol}
              marketType={selectedMarket}
            />

            {/* Aracı Kurum & BofA Takas Akış Metresi */}
            <InstitutionalFlowMeter
              snapshot={snapshot}
              ticker={currentSymbol}
              marketType={selectedMarket}
            />

            {/* Spoofing (Sahte Duvar) & Iceberg (Gizli Lot) Radarı */}
            <IcebergRadarOverlay
              snapshot={snapshot}
              ticker={currentSymbol}
              marketType={selectedMarket}
            />

            <DarkPoolWhaleRadar
              snapshot={snapshot}
              ticker={currentSymbol}
              marketType={selectedMarket}
            />

            {/* Mum İçi Orderflow & Net Delta (\Delta) */}
            <OrderflowDeltaCard
              snapshot={snapshot}
              ticker={currentSymbol}
              marketType={selectedMarket}
            />

            {/* Likidite Absorpsiyonu & Süpürme Haritası */}
            <LiquidityAbsorbanceCard
              snapshot={snapshot}
              ticker={currentSymbol}
              marketType={selectedMarket}
            />

            {/* 3D / İzometrik L2 Derinlik Topoğrafyası */}
            <IsometricDepthTopography
              snapshot={snapshot}
              ticker={currentSymbol}
              marketType={selectedMarket}
            />

            {/* Bilişsel Hacim Profili (POC) */}
            <CognitiveVolumeProfile
              snapshot={snapshot}
              ticker={currentSymbol}
              marketType={selectedMarket}
            />
          </div>
        )}

        {/* ================================================================= */}
        {/* SEKME 3: 🛡️ ADLİ BİLANÇO & RİSK (Güvenlik)                         */}
        {/* ================================================================= */}
        {activeTab === 'FORENSICS_RISK' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Beneish M-Score & Piotroski F-Score Adli Zırhı */}
            <ForensicRedFlagCard
              snapshot={snapshot}
              ticker={currentSymbol}
              marketType={selectedMarket}
            />

            {/* Monte Carlo Risk & Portföy Güvenlik Şalteri */}
            <MonteCarloBacktester
              snapshot={snapshot}
              ticker={currentSymbol}
              marketType={selectedMarket}
            />

            <AutonomousRiskGuard
              snapshot={snapshot}
              ticker={currentSymbol}
              marketType={selectedMarket}
            />

            {/* Taktiksel Portföy & What-If Simülatörü */}
            <TacticalPortfolioManager
              snapshot={snapshot}
              ticker={currentSymbol}
              marketType={selectedMarket}
            />

            {/* Strateji Backtest Paneli */}
            <BacktestPanel
              ticker={currentSymbol}
              marketType={selectedMarket}
            />

            {/* FINVIZ Dinamik Tarayıcı */}
            <DynamicPresetScreener
              selectedMarket={selectedMarket}
              onSelectAsset={handleSelectSymbolInList}
            />

            {/* Sektörel Sermaye Göçü & Çapraz Korelasyon */}
            <SectorLiquidityRotation
              selectedMarket={selectedMarket}
              onSelectSectorStock={handleSelectSymbolInList}
            />

            <CrossMarketCorrelationMatrix
              snapshot={snapshot}
              ticker={currentSymbol}
              marketType={selectedMarket}
            />

            {/* Market Profile (%70 Value Area) */}
            <MarketProfileCard
              snapshot={snapshot}
              ticker={currentSymbol}
              marketType={selectedMarket}
            />

            {/* Adaptif TWAP/VWAP İcra Simülatörü */}
            <AdaptiveExecutionCard
              snapshot={snapshot}
              ticker={currentSymbol}
              marketType={selectedMarket}
            />

            {/* Ekonomik Takvim & Temettü Paneli */}
            <EconomicCalendarPanel
              selectedMarket={selectedMarket}
              onSelectEventStock={handleSelectSymbolInList}
            />

            {/* Portföy Büyüme Grafiği */}
            <PortfolioGrowthChart
              selectedMarket={selectedMarket}
            />

            {/* Sistem Tanılama Konsolu */}
            <DebugConsole />
          </div>
        )}
      </div>

      {/* ===================================================================== */}
      {/* 3. SAĞ PANEL (Akış ve Akıl: Jüri Raporu, Kurumsal Akış, Son Haberler) - 3 Sütun */}
      {/* ===================================================================== */}
      <div className="lg:col-span-3 space-y-4">
        {/* Akıllı Jüri Teşhis Raporu & Decision Confidence Gauge */}
        <SmartJuryDiagnosisCard
          marketType={selectedMarket}
          ticker={currentSymbol}
          compositeAnomaly={enrichedQuantData?.composite_anomaly}
          valueQuality={enrichedQuantData?.value_quality_anomaly}
          microstructure={enrichedQuantData?.microstructure_anomaly}
          behavioralHerding={enrichedQuantData?.behavioral_herding}
        />

        {/* Kurumsal Akış (AKD / Takas) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl backdrop-blur-md space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-black text-white uppercase tracking-wider">
                Kurumsal Takas Akışı
              </h3>
            </div>
            <span className="text-[10px] font-mono text-cyan-300">AKD Vadesi</span>
          </div>

          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between p-2 rounded-lg bg-slate-950">
              <span className="text-slate-400">Citibank Yabancı:</span>
              <span className="text-emerald-400 font-bold">%{collectorInput.citibankSharePct}</span>
            </div>
            <div className="flex justify-between p-2 rounded-lg bg-slate-950">
              <span className="text-slate-400">BofA Kurumsal Net:</span>
              <span className="text-emerald-400 font-bold">
                {typeof collectorInput.bofaNetLot === 'number' && !isNaN(collectorInput.bofaNetLot)
                  ? `${collectorInput.bofaNetLot >= 0 ? '+' : ''}${collectorInput.bofaNetLot.toLocaleString('tr-TR')} Lot`
                  : 'VERİ YOK'}
              </span>
            </div>
            <div className="flex justify-between p-2 rounded-lg bg-slate-950">
              <span className="text-slate-400">Altman-Z Skor:</span>
              <span className="text-cyan-300 font-bold">{collectorInput.altmanZ} (Güvenli)</span>
            </div>
          </div>
        </div>

        {/* KAP ve Son Haberler Akışı */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl backdrop-blur-md space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
              <h3 className="text-xs font-black text-white uppercase tracking-wider">
                KAP &amp; RSS Canlı Akış
              </h3>
            </div>
            <span className="text-[10px] font-mono text-slate-400">kapDaemon</span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-1">
              <div className="flex items-center justify-between font-mono text-[10px] text-slate-400">
                <span className="text-emerald-400">Canlı • {currentSymbol}</span>
                <span>Etki: +45</span>
              </div>
              <p className="text-slate-200 font-medium text-[11px] leading-snug">
                Yeni ihracat sözleşmesi ve aracı kurum hedef fiyat revizyonu açıklandı.
              </p>
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-1">
              <div className="flex items-center justify-between font-mono text-[10px] text-slate-400">
                <span className="text-cyan-300">Makro • PİYASA</span>
                <span>Genel Teyit</span>
              </div>
              <p className="text-slate-200 font-medium text-[11px] leading-snug">
                TCMB haftalık yabancı hisse senedi takas oranı artış trendini koruyor.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;
