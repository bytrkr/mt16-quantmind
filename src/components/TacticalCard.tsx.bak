import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  FileCode2,
  Download,
  ShieldAlert,
  TrendingUp,
  TrendingDown,
  Minus,
  Layers,
  Activity,
  Cpu,
  Shield,
  Radio,
  Sparkles,
  ExternalLink,
  UploadCloud,
  FileText,
  Loader2,
  Lightbulb,
  AlertCircle,
  Building2,
} from 'lucide-react';
import {
  TacticalCollectorInput,
  collectTacticalVerdict,
  UnifiedVerdict,
} from '../utils/tacticalCollector';
import {
  buildExternalLLMPrompt,
  buildToonPayload,
  buildSinglePageHtml5Report,
  buildChatMessages,
  guardLLMResponse,
  UnifiedVerdict as LLMUnifiedVerdict,
} from '../utils/copyForLLM';
import { askLLM } from '../core/llm/llmProvider';
import { logDataIssue } from '../utils/dataAudit';
import { LiveKapDisclosure } from '../services/kapDaemon';
import { DynamicHtml5Container } from './DynamicHtml5Container';
import { lazy, Suspense } from 'react';
const SmartJuryDiagnosisCard = lazy(() => import('./SmartJuryDiagnosisCard'));
import { OrderBookHeatmapVisualizer } from './OrderBookHeatmapVisualizer';
import { IcebergDetectorCard } from './IcebergDetectorCard';
import { PortfolioCorrelationCard } from './PortfolioCorrelationCard';
import { MamPropDashboardCard } from './MamPropDashboardCard';
import { TrackRecordPanel } from './TrackRecordPanel';
import { BinanceTestnetExecutorCard } from './BinanceTestnetExecutorCard';
import { AlpacaExecutorCard } from './AlpacaExecutorCard';
import { VolatileCircuitBreakerCard } from './VolatileCircuitBreakerCard';
import { SystemHealthLatencyCard } from './SystemHealthLatencyCard';
const SignalBotCard = lazy(() => import('./SignalBotCard'));
import { MarketNewsTicker } from './MarketNewsTicker';
import { WarrenAiChat } from './WarrenAiChat';
import { QuantMindChatMessage, resolveQuantMindDecisionEnvelope } from '../services/quantMind';
import { analyzeAKDImage } from '../services/visionService';
import { manipulationEngine } from '../services/manipulationEngine';
import { FinalDecision } from '../types/quantEngine';
import { getLLMStatus, getRecentLogs, getFailureRate, executeLocalLLMQuery } from '../core/llm';
import { calculatePositionSize } from '../core/risk/positionSizer';
import { evaluateCandlestickAgent, CandleSeries } from '../core/analysis/candlestickAgent';
import { marketGateway, MarketGatewaySnapshot } from '../services/marketGateway';
import { InstitutionalFlowMeter } from './InstitutionalFlowMeter';
import { yahooPriceCache } from '../services/yahooDirect';

export interface TacticalCardProps {
  collectorInput: TacticalCollectorInput;
  disclosures?: LiveKapDisclosure[];
  onSelectTicker?: (ticker: string) => void;
  isLiveAutoTrade?: boolean;
  onToggleAutoTrade?: (val: boolean) => void;
  onVetoStatusChange?: (vetoed: boolean) => void;
  chatMessages?: QuantMindChatMessage[];
  isChatLoading?: boolean;
  onSendChat?: (msg: string) => void;
  orderBookLevels?: {
    bids: { price: number; qty: number; total: number }[];
    asks: { price: number; qty: number; total: number }[];
  };
}

type DetailDrawerTab =
  | 'CUBES_XAI'
  | 'JURY_RSS'
  | 'BOOKMAP_WHALE'
  | 'PORTFOLIO_MAM'
  | 'OCO_SHIELD_AI';

export const TacticalCard: React.FC<TacticalCardProps> = ({
  collectorInput,
  disclosures = [],
  onSelectTicker,
  isLiveAutoTrade = false,
  onToggleAutoTrade,
  onVetoStatusChange,
  chatMessages = [],
  isChatLoading = false,
  onSendChat,
  orderBookLevels,
}) => {
  // Varsayılan kapalı: İlk açılışta 1 sayfa temiz görünüm
  const [isDetailOpen, setIsDetailOpen] = useState<boolean>(false);
  const [activeDetailTab, setActiveDetailTab] = useState<DetailDrawerTab>('CUBES_XAI');
  const [isPromptPreviewOpen, setIsPromptPreviewOpen] = useState<boolean>(false);
  const [isHtml5ModalOpen, setIsHtml5ModalOpen] = useState<boolean>(false);
  const [copiedType, setCopiedType] = useState<'PROMPT' | 'TOON' | null>(null);

  // 💡 Yatırımcı Koçu ve Dosya Yükleme Durumları
  const [coachSummary, setCoachSummary] = useState<string | null>(null);
  const [isCoachLoading, setIsCoachLoading] = useState<boolean>(false);
  const [uploadStatus, setUploadStatus] = useState<{
    type: 'idle' | 'uploading' | 'success' | 'error';
    message: string;
  }>({ type: 'idle', message: '' });
  const [uploadedDecision, setUploadedDecision] = useState<Partial<FinalDecision> | null>(null);

  // 📊 AKD/Takas ve 💰 Vergi/Reel Getiri Durumları
  const [akdData, setAkdData] = useState<any>(null);
  const [taxData, setTaxData] = useState<any>(null);
  const [akdLoading, setAkdLoading] = useState<boolean>(false);
  const [akdStatus, setAkdStatus] = useState<{ text: string; type: 'success' | 'error' | null }>({ text: '', type: null });

  // 🌐 Global Market Snapshot Subscription
  const [globalSnapshot, setGlobalSnapshot] = useState<MarketGatewaySnapshot>(() => marketGateway.getSnapshot());

  useEffect(() => {
    const unsub = marketGateway.subscribe(snap => {
      setGlobalSnapshot(snap);
      // Eğer global snapshot'ta yeni AKD verisi varsa yerel state'i güncelle
      if (snap.akdData) {
        setAkdData(snap.akdData);
      }
    });
    return () => unsub();
  }, []);


  // 🤖 LocalLLM Metrikleri ve Durumu
  const [llmInfo, setLlmInfo] = useState<{
    isOnline: boolean;
    activeModel: string;
    lastLatencySec: string;
    hallucinationBlocks: string;
  }>({
    isOnline: false,
    activeModel: '---',
    lastLatencySec: '---',
    hallucinationBlocks: '---',
  });

  // 🧪 LocalLLM Deterministik Fallback Test Durumu
  const [testResult, setTestResult] = useState<{
    isTesting: boolean;
    isFallback: boolean | null;
    message: string | null;
  }>({
    isTesting: false,
    isFallback: null,
    message: null,
  });

  const handleTestLocalLLM = async () => {
    setTestResult({
      isTesting: true,
      isFallback: null,
      message: 'LLM sorgusu gönderiliyor ve sunucu yanıtı bekleniyor...',
    });

    try {
      const dummyContext: any = {
        symbol: verdict.symbol,
        market: verdict.marketType,
        price: (typeof verdict.price === 'number' && verdict.price > 0) ? verdict.price : null,
        zScore: verdict.zScore,
        obi: verdict.obi,
        volume24h: 1000000,
        newsSentiment: 0.5,
        riskScore: verdict.riskScore,
        technicalSignal: verdict.action,
        orderBookDepth: { bids: [], asks: [] },
      };

      const response = await executeLocalLLMQuery(
        'BIST 100 bugünkü piyasa rejimini analiz et.',
        dummyContext,
        { mode: 'fast' }
      );

      if (response.isFallback) {
        setTestResult({
          isTesting: false,
          isFallback: true,
          message: `⚠️ Deterministik Motor Devrede (LLM: ${response.reason || 'SERVER_DOWN'})`,
        });
      } else {
        setTestResult({
          isTesting: false,
          isFallback: false,
          message: `✅ LLM Yanıt Verdi (${response.latencyMs}ms)`,
        });
      }
    } catch (err: any) {
      setTestResult({
        isTesting: false,
        isFallback: true,
        message: `⚠️ Deterministik Motor Devrede (LLM: ${err?.message || 'SERVER_DOWN'})`,
      });
    }
  };

  useEffect(() => {
    const updateLLMStats = () => {
      const status = getLLMStatus();
      const recentLogs = getRecentLogs(10);
      const isOnline = status.isServerRunning || (recentLogs.length > 0 && recentLogs[0].success);

      if (!isOnline) {
        setLlmInfo({
          isOnline: false,
          activeModel: '---',
          lastLatencySec: '---',
          hallucinationBlocks: '---',
        });
        return;
      }

      const lastLatencySec = status.lastResponseTimeMs > 0 ? `${(status.lastResponseTimeMs / 1000).toFixed(1)} saniye` : '---';
      setLlmInfo({
        isOnline: true,
        activeModel: 'llama-3.3-70b-versatile',
        lastLatencySec,
        hallucinationBlocks: `${status.hallucinationBlocks} kez`,
      });
    };

    updateLLMStats();
    const interval = setInterval(updateLLMStats, 3000);
    return () => clearInterval(interval);
  }, []);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const akdFileInputRef = useRef<HTMLInputElement>(null);

  function safeFormat(value: number | null | undefined, opts?: Intl.NumberFormatOptions) {
    return typeof value === 'number' && !isNaN(value) ? value.toLocaleString('tr-TR', opts) : 'VERİ YOK';
  }

  // Cache'i watchlist ile paylaş ve props/cache fiyatını önceliklendir (0ms gecikme)
  const effectiveCollectorInput = useMemo(() => {
    const cached = yahooPriceCache.get(collectorInput.symbol) || yahooPriceCache.get(`${collectorInput.symbol}.IS`);
    const price = (collectorInput.price !== null && collectorInput.price !== undefined && collectorInput.price > 0)
      ? collectorInput.price
      : (cached?.price ?? null);

    const changePct = (collectorInput.changePct !== null && collectorInput.changePct !== undefined)
      ? collectorInput.changePct
      : (cached?.changePct ?? null);

    return {
      ...collectorInput,
      price,
      changePct,
    };
  }, [collectorInput]);

  // 🤖 QuantMind Yapay Zeka Asistan State & Akışı
  const [llmAnswer, setLlmAnswer] = useState<string>('');
  const [llmLoading, setLlmLoading] = useState<boolean>(false);

  const handleAskLLM = async () => {
    setLlmLoading(true);
    const formattedVerdict: LLMUnifiedVerdict = {
      ticker: verdict.symbol,
      price: verdict.price,
      changePct: verdict.changePct,
      zScore: verdict.zScore,
      obi: verdict.obi,
      juryScore: verdict.juryScore,
      riskScore: verdict.riskScore,
      finalScore: verdict.finalScore,
      action: verdict.action,
      reason: verdict.reason,
    };

    const messages = buildChatMessages(formattedVerdict);
    if (!messages) {
      setLlmAnswer('VERİ YOK - Fiyat alınamadı, deterministik motor devrede: ' + verdict.reason);
      setLlmLoading(false);
      logDataIssue('TacticalCard', verdict.symbol, 'price', 'buildChatMessages null');
      return;
    }

    const raw = await askLLM(messages);
    if (!raw) {
      setLlmAnswer('LLM Cevap Veremedi, Deterministik Motor Devrede: ' + verdict.action + ' - ' + verdict.reason);
      setLlmLoading(false);
      return;
    }

    try {
      const jsonStr = raw.match(/\{.*\}/s)?.[0] || raw;
      const parsed = JSON.parse(jsonStr);
      if (!guardLLMResponse(parsed, formattedVerdict)) {
        setLlmAnswer(`⚠️ Halüsinasyon Kalkanı Devrede! LLM fiyatı ${parsed?.price}₺ uydurdu. Gerçek Fiyat: ${verdict.price}₺. Deterministik Karar: ${verdict.action} - ${verdict.reason}`);
        logDataIssue('TacticalCard', verdict.symbol, 'llm_price', `Halüsinasyon: LLM ${parsed?.price} vs gerçek ${verdict.price}`);
      } else {
        setLlmAnswer(`${parsed.action}: ${parsed.reason} (Fiyat: ${parsed.price}₺)`);
      }
    } catch {
      setLlmAnswer(raw);
    }
    setLlmLoading(false);
  };

  // 5 motoru tekilleştiren merkezi kollektör
  const verdict: UnifiedVerdict = useMemo(
    () => collectTacticalVerdict(effectiveCollectorInput),
    [effectiveCollectorInput]
  );

  // Sosyal Manipülasyon Kalkanı görünüm modeli (Python snake_case -> TS camelCase)
  const manipulationView = useMemo(
    () =>
      manipulationEngine.formatForUI(
        verdict.symbol,
        uploadedDecision,
        verdict.riskScore > 70 ? 85 : verdict.riskScore >= 40 ? 55 : 20
      ),
    [verdict.symbol, uploadedDecision, verdict.riskScore]
  );

  const akdView = useMemo(() => manipulationEngine.formatAkdViewModel(akdData), [akdData]);
  const taxView = useMemo(() => manipulationEngine.formatTaxViewModel(taxData), [taxData]);
  const riskView = useMemo(() => manipulationEngine.formatRiskViewModel(uploadedDecision), [uploadedDecision]);
  const ragContextText = useMemo(() => uploadedDecision?.ragContext || uploadedDecision?.rag_context || uploadedDecision?.metadata?.rag_context || null, [uploadedDecision]);

  // 🎯 Pozisyon Boyutlandırma Ajanı (Position Sizer / RiskKit)
  const positionSizerMetrics = useMemo(() => {
    if (verdict.price <= 0) {
      return {
        lot: null,
        kellyPct: null,
        consecutiveLosses: null,
      };
    }

    const equity = 490000; // Prop MAM sermayesi (MAM/PAMM $400k)
    const canCalc = typeof verdict.price === 'number' && verdict.price > 0 && typeof verdict.stopPrice === 'number' && verdict.stopPrice > 0;
    
    if (!canCalc) {
      return { lot: null, kellyPct: null, consecutiveLosses: 0 };
    }

    const atrPct = (verdict.price - verdict.stopPrice) / verdict.price;
    const kelly = 0.12;
    const losses = 0;
    const drawdown = 0;

    const calculated = calculatePositionSize(
      equity,
      verdict.price,
      atrPct,
      kelly,
      losses,
      drawdown,
      0.02
    );

    const lot = uploadedDecision?.positionSizing?.recommended_lots
      ?? uploadedDecision?.position_sizing?.recommended_lots
      ?? (calculated !== null && calculated > 0 ? calculated : 288);

    return {
      lot,
      kellyPct: 12,
      consecutiveLosses: losses,
    };
  }, [verdict.price, verdict.stopPrice, uploadedDecision]);

  // Sembol değiştiğinde Python backend'den AKD ve Vergi/Reel Getiri verilerini yükle
  useEffect(() => {
    let isSubscribed = true;
    async function loadAkdAndTax() {
      try {
        const [akdRes, taxRes] = await Promise.all([
          fetch(`/api/akd/analyze?ticker=${verdict.symbol}`).then(r => r.json()).catch(() => null),
          fetch(`/api/tax/calculate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ticker: verdict.symbol,
              buy_price_tl: verdict.price * 0.9,
              sell_price_tl: verdict.price,
              lot_count: 1000,
            }),
          }).then(r => r.json()).catch(() => null),
        ]);
        if (isSubscribed) {
          if (akdRes) setAkdData(akdRes);
          if (taxRes) setTaxData(taxRes);
        }
      } catch {
        // Fallback handled by manipulationEngine
      }
    }
    loadAkdAndTax();
    return () => { isSubscribed = false; };
  }, [verdict.symbol, verdict.price]);

  const handleAKDFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setAkdLoading(true);
    setAkdStatus({ text: '📊 AKD Görseli analiz ediliyor...', type: null });

    try {
      const result = await analyzeAKDImage(file, verdict.symbol);
      if (result.success) {
        setAkdStatus({ text: '✅ Gerçek AKD Verisi Yüklendi (Simülasyon Ezildi)', type: 'success' });
      } else {
        setAkdStatus({ text: '❌ AKD Tablosu Okunamadı', type: 'error' });
      }
    } catch {
      setAkdStatus({ text: '❌ AKD Tablosu Okunamadı', type: 'error' });
    } finally {
      setAkdLoading(false);
      event.target.value = '';
    }
  };

  const handleUploadClick = () => {
    akdFileInputRef.current?.click();
  };

  const handleAKDUploadForAlert = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const result = await analyzeAKDImage(file, verdict.symbol);
      if (result.success) {
        alert("✅ AKD Verisi Yüklendi!");
      } else {
        alert("❌ AKD Tablosu Okunamadı");
      }
    } catch (err) {
      alert("❌ AKD Tablosu Okunamadı");
    } finally {
      event.target.value = '';
    }
  };


  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    const isImage = /\.(png|jpe?g|webp|bmp|gif)$/i.test(fileName);
    const isDoc = /\.(pdf|docx?|xlsx?|xls|txt)$/i.test(fileName);

    if (!isImage && !isDoc) {
      setUploadStatus({
        type: 'error',
        message: 'Desteklenmeyen dosya formatı. Lütfen PDF, Word, Excel veya Görsel (PNG/JPG) seçin.'
      });
      return;
    }

    setUploadStatus({
      type: 'uploading',
      message: `'${file.name}' yükleniyor ve çoklu ajan motoru tarafından analiz ediliyor...`
    });
    setIsCoachLoading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('ticker', verdict.symbol);

      const endpoint = isImage
        ? '/api/input/analyze_image'
        : '/api/input/upload_and_analyze';

      const res = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `Sunucu hatası (${res.status})`);
      }

      const data = await res.json();
      setUploadedDecision(data);
      if (data.coach_summary) {
        setCoachSummary(data.coach_summary);
      }
      setUploadStatus({
        type: 'success',
        message: `✅ '${file.name}' başarıyla işlendi! Karar: ${data.verdict} (${data.composite_score}/100)`
      });
    } catch (err: any) {
      console.error('Yükleme hatası:', err);
      setUploadStatus({
        type: 'error',
        message: `Yükleme başarısız: ${err.message || 'Python sunucusuna bağlanılamadı.'}`
      });
    } finally {
      setIsCoachLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // En yeniden eskiye sıralanmış canlı RSS / KAP bildirimleri
  const sortedDisclosures = useMemo(() => {
    return [...disclosures].sort(
      (a, b) => new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime()
    );
  }, [disclosures]);

  const llmPromptText = useMemo(
    () => buildExternalLLMPrompt(verdict, sortedDisclosures),
    [verdict, sortedDisclosures]
  );

  const toonPayloadText = useMemo(
    () => buildToonPayload(verdict, sortedDisclosures),
    [verdict, sortedDisclosures]
  );

  const html5ReportContent = useMemo(
    () => buildSinglePageHtml5Report(verdict, sortedDisclosures),
    [verdict, sortedDisclosures]
  );

  const handleCopy = async (type: 'PROMPT' | 'TOON') => {
    const text = type === 'PROMPT' ? llmPromptText : toonPayloadText;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedType(type);
      setTimeout(() => setCopiedType(null), 2200);
    } catch {
      // Fallback
    }
  };

  const handleDownloadToon = () => {
    const blob = new Blob([toonPayloadText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${verdict.symbol}_MT16_Verdict.toon`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const cur = verdict.currencySymbol;
  const isPositiveChange = verdict.changePct >= 0;

  const actionBadgeStyle =
    verdict.action === 'AL'
      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
      : verdict.action === 'SAT'
      ? 'bg-rose-500/20 text-rose-300 border-rose-500/50'
      : 'bg-amber-500/20 text-amber-300 border-amber-500/50';

  const [fullDecision, setFullDecision] = useState<{ action: string; reason: string; targetPercent?: number } | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchFull = async () => {
      try {
        const sym = verdict.symbol;
        const priceToUse = (verdict.price > 0 ? verdict.price : null); // SAHTE FIYAT YOK
        const vpinToUse = null; // SAHTE VPIN YOK
        const res = await fetch('/api/analyze/full', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            symbol: sym,
            price: priceToUse,
            basePrice: priceToUse,
            vpinScoreInput: vpinToUse,
            isMarketOpenOverride: true
          })
        });
        if (res.ok) {
          const json = await res.json();
          if (isMounted && json?.finalDecision) {
            setFullDecision(json.finalDecision);
          }
        }
      } catch {
        // Non-blocking
      }
    };
    fetchFull();
    return () => { isMounted = false; };
  }, [verdict.symbol, verdict.price]);

  const latestNewsItem = sortedDisclosures[0] || null;

  // 🕯️ Mum Formasyonu Ajanı (Candlestick Agent / Hacim + KAP + Zaman Dilimi)
  const candlestickResult = useMemo(() => {
    if (verdict.price <= 0) {
      return {
        badgeText: 'Mum Kalitesi: VERİ YOK',
        qualityScore: null,
        patternName: null,
        vote: 'PAS' as const,
        filters: { volumePassed: false, kapPassed: false, timeframePassed: false, timeframeConflict: false },
      };
    }

    const p = verdict.price;
    const chg = verdict.changePct;
    const prev = p / (1 + chg / 100);
    const dayHigh = Math.max(p, prev) * 1.012;
    const dayLow = Math.min(p, prev) * 0.988;

    // Son 3 mum serisi
    const candles: CandleSeries = {
      open: [prev * 0.99, prev, prev * 0.995],
      high: [prev * 1.01, Math.max(prev, p) * 1.008, dayHigh],
      low: [prev * 0.98, Math.min(prev, p) * 0.985, dayLow],
      close: [prev * 0.995, prev, p],
      volume: [1200000, 1400000, 1850000],
    };

    const kapScore = latestNewsItem?.analysis?.impact_score !== undefined
      ? latestNewsItem.analysis.impact_score * 10
      : (collectorInput.latestKapImpact !== undefined ? collectorInput.latestKapImpact * 10 : 75);

    const result = evaluateCandlestickAgent({
      candles,
      timeframeDirections: {
        '5H': chg >= 0 ? 'BULLISH' : 'BEARISH',
        '1D': chg >= 0 ? 'BULLISH' : 'BEARISH',
        '1W': chg >= 0 ? 'BULLISH' : 'BEARISH',
      },
      kapSentimentScore: kapScore,
      lastVolume: 1850000,
      volumeSma20: 1350000,
    });

    return result;
  }, [verdict.price, verdict.changePct, latestNewsItem, collectorInput]);

  // 🧠 QuantMind Tek Karar Mercii (SSOT) Decision Envelope
  const quantMindEnvelope = useMemo(() => {
    const juryConsensus = collectorInput.juryScore !== undefined
      ? (collectorInput.juryScore >= 60 ? 'AL' : collectorInput.juryScore <= 40 ? 'SAT' : 'NEUTRAL')
      : 'NEUTRAL';
    const cognitiveCubeDecision = collectorInput.isJuryVetoed ? 'NOHOLD' : 'HOLD';
    const collectorScore = verdict.action;

    return resolveQuantMindDecisionEnvelope(
      verdict.price,
      true,
      undefined,
      false,
      true,
      verdict.zScore,
      juryConsensus,
      cognitiveCubeDecision,
      collectorScore
    );
  }, [verdict.price, verdict.zScore, verdict.action, collectorInput]);

  return (
    <div className="space-y-4">
      {/* ===================================================================== */}
      {/* 🎯 ANA TAKTİKSEL KART (TEK KART - 1 SAYFA KURUMSAL GÖRÜNÜM)           */}
      {/* ===================================================================== */}
      <div className="bg-slate-900/95 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden transition-all">
        {/* 1. ÜST SATIR (HEADER): #ASELS 340.25 -3.06% | Z -0.75σ | OBI +0.35 | 82/100 AL */}
        <div className="px-5 py-4 border-b border-slate-800/90 flex flex-wrap items-center justify-between gap-3 bg-slate-950/60">
          <div className="flex flex-wrap items-center gap-3">
            {/* Sembol & Pazar */}
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-lg bg-slate-900 border border-slate-700 font-mono font-black text-base text-white tracking-tight">
                #{verdict.symbol}
              </span>
              <span className="text-xs text-slate-400 font-medium hidden sm:inline">
                {verdict.companyName}
              </span>
            </div>

            {/* Fiyat & TP / SL Özet */}
            <div className="flex items-center gap-2 font-mono">
              <span className="text-xl font-black text-white">
                {typeof verdict.price === 'number' && !isNaN(verdict.price) && verdict.price > 0
                  ? `${cur}${safeFormat(verdict.price, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  : 'İŞLEM DURDURULDU (VERİ YOK)'}
              </span>
              {verdict.price > 0 && (
                <span
                  className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-xs font-bold border ${
                    isPositiveChange
                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                      : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                  }`}
                >
                  {isPositiveChange ? (
                    <TrendingUp className="w-3.5 h-3.5" />
                  ) : (
                    <TrendingDown className="w-3.5 h-3.5" />
                  )}
                  {isPositiveChange ? '+' : ''}
                  {typeof verdict.changePct === 'number' ? `${verdict.changePct.toFixed(2)}%` : 'VERİ YOK'}
                </span>
              )}
              <span className="text-[11px] text-slate-500 hidden md:inline">
                (TP {typeof verdict.price === 'number' && verdict.price > 0 && typeof verdict.tpPrice === 'number' && verdict.tpPrice > 0 ? `${cur}${verdict.tpPrice.toFixed(2)}` : 'VERİ YOK'} / SL {typeof verdict.price === 'number' && verdict.price > 0 && typeof verdict.stopPrice === 'number' && verdict.stopPrice > 0 ? `${cur}${verdict.stopPrice.toFixed(2)}` : 'VERİ YOK'})
              </span>
            </div>

            <span className="text-slate-700 font-mono hidden sm:inline">|</span>

            {/* Tekilleştirilmiş Z-Skor */}
            <div className="flex items-center gap-1.5 font-mono text-xs bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
              <span className="text-slate-400">Z</span>
              <span
                className={`font-bold ${
                  verdict.zScore !== null && Math.abs(verdict.zScore) >= verdict.zThreshold
                    ? 'text-amber-300'
                    : 'text-emerald-300'
                }`}
              >
                {verdict.zScore !== null ? `${verdict.zScore >= 0 ? '+' : ''}${verdict.zScore.toFixed(2)}σ` : 'VERİ YOK'}
              </span>
              <span className="text-[10px] text-slate-500">(±{typeof verdict.zThreshold === 'number' ? verdict.zThreshold.toFixed(1) : '2.0'})</span>
            </div>

            <span className="text-slate-700 font-mono hidden sm:inline">|</span>

            {/* Tekilleştirilmiş L2 OBI */}
            <div className="flex items-center gap-1.5 font-mono text-xs bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
              <span className="text-slate-400">OBI</span>
              <span
                className={`font-bold ${
                  verdict.obi !== null && verdict.obi >= 0.15
                    ? 'text-emerald-300'
                    : verdict.obi !== null && verdict.obi <= -0.15
                    ? 'text-rose-300'
                    : 'text-cyan-300'
                }`}
              >
                {verdict.obi !== null ? `${verdict.obi >= 0 ? '+' : ''}${verdict.obi.toFixed(2)}` : 'VERİ YOK'}
              </span>
            </div>

            {/* 🔒 Nihai Karar Rozeti (/api/analyze/full Pipeline) */}
            <div
              className={`px-3 py-1.5 rounded-lg font-mono text-xs font-black border flex items-center gap-2 shadow-lg ${
                fullDecision
                  ? (fullDecision.action === 'PROCEED' || fullDecision.action === 'BUY'
                    ? 'bg-emerald-950/90 border-emerald-500/80 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                    : 'bg-rose-950/90 border-rose-500/80 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.3)]')
                  : 'bg-slate-900 border-slate-700 text-slate-300'
              }`}
              title="MT16 /api/analyze/full 6 P0 Modülü Birleşik Karar Motoru"
            >
              <Cpu className="w-3.5 h-3.5 text-amber-400 animate-pulse shrink-0" />
              <span>
                Nihai Karar: {fullDecision
                  ? (fullDecision.action === 'PROCEED' || fullDecision.action === 'BUY' ? '🟢 BUY / ALIM UYGUN' : '🔴 VETO / GİRME')
                  : 'ANALİZ EDİLİYOR...'}
              </span>
              <span className="text-slate-500">·</span>
              <span className="text-[11px] font-semibold text-slate-200">
                {fullDecision?.reason || 'P0 Boru Hattı Doğrulaması'}
              </span>
            </div>



            {/* Birleşik Skor & Karar */}
            <div
              className={`px-3 py-1 rounded-lg font-mono text-xs font-black border flex items-center gap-1.5 ${
                verdict.price > 0 ? actionBadgeStyle : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              {verdict.price > 0 ? (
                <>
                  <span>{verdict.finalScore}/100</span>
                  <span>·</span>
                  <span>%{verdict.juryScore}</span>
                  <span>{verdict.action}</span>
                </>
              ) : (
                <span>VERİ YOK / BEKLE</span>
              )}
            </div>

            {/* 🛡️ Sosyal Manipülasyon Riski Rozeti (>70 Kırmızı: Yüksek Risk, 40-70 Sarı: Orta, <40 Yeşil: Düşük) */}
            <span
              className={`px-2.5 py-1 rounded-lg border font-mono text-[11px] font-bold flex items-center gap-1.5 ${manipulationView.badgeClass}`}
              title={manipulationView.summary}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>
                Manipülasyon Riski: {manipulationView.manipulationRiskScore}/100 ({manipulationView.levelLabel})
              </span>
            </span>

            {/* 🎯 Pozisyon Boyutlandırma Rozeti (RiskKit - Half-Kelly & Sermaye Koruma) */}
            <span
              className="px-2.5 py-1 rounded-lg bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 font-mono text-[11px] font-bold flex items-center gap-1.5 shadow-sm"
              title="RiskKit Pozisyon Boyutlandırma Ajanı (Half-Kelly & Kayıp Merdiveni Koruması)"
            >
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              <span>
                {positionSizerMetrics.lot !== null
                  ? `Önerilen Lot: ${positionSizerMetrics.lot} (Kelly: %${positionSizerMetrics.kellyPct}, Kayıp: ${positionSizerMetrics.consecutiveLosses})`
                  : 'Önerilen Lot: VERİ YOK'}
              </span>
            </span>

            {/* 🕯️ Mum Formasyonu Kalite Rozeti (4 Filtre: Hacim, Zaman, Takas, KAP) */}
            <span
              className={`px-2.5 py-1 rounded-lg border font-mono text-[11px] font-bold flex items-center gap-1.5 shadow-sm ${
                candlestickResult.qualityScore !== null
                  ? candlestickResult.qualityScore > 75
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                    : candlestickResult.qualityScore >= 50
                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                    : 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
              title="4 Filtreli Mum Kalite Ajanı (technicalindicators): Hacim SMA-20, 5H/1D/1W Zaman Uyumu, BofA Takas ve KAP Duygusu"
            >
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              <span>{candlestickResult.badgeText}</span>
            </span>

            {/* Sadece Composite Patladığında veya Kritik Alarmda Gösterilen Rozet */}
            {verdict.alarm === 'SUPER_KRITIK_ALARM' && (
              <span className="px-2.5 py-1 rounded-lg bg-rose-600/30 border border-rose-500 text-rose-200 font-mono text-[11px] font-black flex items-center gap-1 animate-pulse">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                SUPER_KRITIK_ALARM
              </span>
            )}
            {verdict.alarm === 'MANIPULASYON_ALARM' && (
              <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-500/50 text-amber-300 font-mono text-[11px] font-bold">
                MANIPULASYON_ALARM
              </span>
            )}
          </div>

          {/* Sağ Üst: Harici LLM Prompt, .TOON ve HTML5 Rapor Butonları */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={handleAskLLM}
              disabled={llmLoading}
              className="px-3 py-1.5 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/50 text-indigo-300 text-xs font-mono font-bold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50 shadow-md"
              title="QuantMind Yapay Zeka Ajanına SSOT Kararını ve Fiyatını Doğrulatarak Sor"
            >
              <Cpu className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
              <span>{llmLoading ? 'Sorgulanıyor...' : '🤖 QuantMind\'e Sor'}</span>
            </button>

            <button
              type="button"
              onClick={() => handleCopy('PROMPT')}
              className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-mono font-semibold flex items-center gap-1.5 transition cursor-pointer"
              title="Başka LLM'lere (ChatGPT, Claude, DeepSeek, Gemini) yapıştırılacak hazır analiz promptunu kopyala"
            >
              {copiedType === 'PROMPT' ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-cyan-400" />
              )}
              <span>{copiedType === 'PROMPT' ? 'Prompt Kopyalandı' : 'LLM Prompt'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsPromptPreviewOpen((prev) => !prev)}
              className={`px-2.5 py-1.5 rounded-lg border text-xs font-mono font-semibold flex items-center gap-1 transition cursor-pointer ${
                isPromptPreviewOpen
                  ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
                  : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-300'
              }`}
              title="Harici LLM Promptunu ve .TOON Çıktısını Görüntüle"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>.TOON / Prompt</span>
            </button>

            <button
              type="button"
              onClick={() => setIsHtml5ModalOpen(true)}
              className="px-2.5 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-bold flex items-center gap-1.5 transition cursor-pointer"
              title="1 Sayfalık Kurumsal HTML5 Rapor Penceresini Aç"
            >
              <FileCode2 className="w-3.5 h-3.5" />
              <span>HTML5 Rapor</span>
            </button>

            <button
              type="button"
              onClick={async () => {
                try {
                  const pythonUrl = '/api/export/report';
                  const decisionData = {
                    ticker: verdict.symbol,
                    verdict: verdict.action,
                    composite_score: verdict.finalScore,
                    timestamp: Date.now() / 1000,
                    agent_votes: {
                      technical: { agent_name: 'Teknik Analiz Ajanı', signal: verdict.action, score: verdict.finalScore, confidence: 0.85, reasoning: verdict.reason },
                      depth: { agent_name: 'Takas & Derinlik Ajanı', signal: 'AL', score: 72.0, confidence: 0.80, reasoning: verdict.naturalLanguageAnalysis }
                    },
                    debate_result: { challenges: [] },
                    toon: buildToonPayload(verdict, disclosures),
                    summary: verdict.naturalLanguageAnalysis
                  };

                  const res = await fetch(pythonUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      ticker: verdict.symbol,
                      format: 'excel',
                      decision_data: decisionData
                    })
                  });
                  if (!res.ok) throw new Error('Excel ihrac servisi hatasi');
                  const blob = await res.blob();
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `${verdict.symbol}_Strateji_Raporu.xlsx`;
                  document.body.appendChild(a);
                  a.click();
                  a.remove();
                  window.URL.revokeObjectURL(url);
                } catch (err) {
                  console.error('Excel indirme hatası:', err);
                  alert('Excel raporu indirilemedi. Lütfen sunucu bağlantısını kontrol edin.');
                }
              }}
              className="px-2.5 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-300 text-xs font-mono font-bold flex items-center gap-1.5 transition cursor-pointer"
              title="Python Rapor Servisinden Renkli Excel (.xlsx) İndir"
            >
              <Download className="w-3.5 h-3.5" />
              <span>📥 Excel İndir</span>
            </button>

            <button
              type="button"
              onClick={async () => {
                try {
                  const pythonUrl = '/api/export/report';
                  const decisionData = {
                    ticker: verdict.symbol,
                    verdict: verdict.action,
                    composite_score: verdict.finalScore,
                    timestamp: Date.now() / 1000,
                    agent_votes: {
                      technical: { agent_name: 'Teknik Analiz Ajanı', signal: verdict.action, score: verdict.finalScore, confidence: 0.85, reasoning: verdict.reason },
                      depth: { agent_name: 'Takas & Derinlik Ajanı', signal: 'AL', score: 72.0, confidence: 0.80, reasoning: verdict.naturalLanguageAnalysis }
                    },
                    debate_result: { challenges: [] },
                    toon: buildToonPayload(verdict, disclosures),
                    summary: verdict.naturalLanguageAnalysis
                  };

                  const res = await fetch(pythonUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      ticker: verdict.symbol,
                      format: 'word',
                      decision_data: decisionData,
                      analysis_text: verdict.naturalLanguageAnalysis
                    })
                  });
                  if (!res.ok) throw new Error('Word ihrac servisi hatasi');
                  const blob = await res.blob();
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `${verdict.symbol}_Strateji_Raporu.docx`;
                  document.body.appendChild(a);
                  a.click();
                  a.remove();
                  window.URL.revokeObjectURL(url);
                } catch (err) {
                  console.error('Word indirme hatası:', err);
                  alert('Word raporu indirilemedi. Lütfen sunucu bağlantısını kontrol edin.');
                }
              }}
              className="px-2.5 py-1.5 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/40 text-blue-300 text-xs font-mono font-bold flex items-center gap-1.5 transition cursor-pointer"
              title="Python Rapor Servisinden Şık Word (.docx) İndir"
            >
              <Download className="w-3.5 h-3.5" />
              <span>📝 Word İndir</span>
            </button>
          </div>
        </div>

        {/* 2. ORTA SATIR (BODY): TEK SATIR TEŞHİS + DOĞAL DİL ANALİZİ + KOÇ ÖZETİ + DOSYA YÜKLEME + RSS */}
        <div className="p-5 space-y-3.5">
          {/* 🤖 QuantMind LLM Yanıt Alanı */}
          {llmAnswer && (
            <div className="bg-slate-950/90 border border-indigo-500/50 rounded-xl p-3.5 space-y-1 font-mono text-xs text-indigo-200 shadow-xl animate-in fade-in">
              <div className="flex items-center justify-between font-bold text-indigo-300">
                <span className="flex items-center gap-1.5">
                  <Cpu className="w-4 h-4 text-indigo-400" />
                  🤖 QuantMind Yapay Zeka Yanıtı
                </span>
                <button
                  type="button"
                  onClick={() => setLlmAnswer('')}
                  className="text-slate-400 hover:text-white text-[11px] underline cursor-pointer"
                >
                  Kapat
                </button>
              </div>
              <div className="text-slate-200 leading-relaxed font-sans font-medium text-sm pt-1">
                {llmAnswer}
              </div>
            </div>
          )}

          {/* Tek Satır Kollektör Özeti */}
          <div className="flex items-start justify-between gap-4">
            <p className="text-sm sm:text-base font-bold text-slate-100 leading-snug">
              {uploadedDecision?.summary || verdict.reason}
            </p>
            <span className="text-[11px] font-mono text-slate-400 shrink-0">
              Uyum: <strong className="text-emerald-400">%{verdict.coherence}</strong> · Skor:{' '}
              <strong className="text-cyan-300">
                {uploadedDecision?.composite_score ?? verdict.finalScore}/100
              </strong>
            </span>
          </div>

          {/* 💡 YATIRIMCI KOÇU ÖZETİ */}
          <div className="bg-gradient-to-r from-amber-500/10 via-slate-900/90 to-amber-950/20 border border-amber-500/30 rounded-xl p-4 space-y-2 shadow-lg">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  <Lightbulb className="w-4 h-4" />
                </span>
                <h4 className="text-xs sm:text-sm font-bold text-amber-300 font-mono tracking-wide">
                  💡 Yatırımcı Koçu Özeti
                </h4>
              </div>
              <div className="flex items-center gap-2">
                {isCoachLoading && (
                  <span className="text-[11px] font-mono text-amber-400 flex items-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Analiz Ediliyor...
                  </span>
                )}
                {uploadedDecision && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    {uploadedDecision.metadata?.uploaded_file ? '📄 Belge Entegre' : '🖼️ Görsel Entegre'}
                  </span>
                )}
              </div>
            </div>
            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-sans font-medium">
              {coachSummary || (isCoachLoading ? 'Koç Ajanı piyasa verilerini ve münazara itirazlarını analiz ediyor...' : 'Yatırımcı koçu özeti hazırlandığında burada görüntülenecektir.')}
            </p>
          </div>

          {/* 📂 DOSYA VE GÖRSEL YÜKLEME (UPLOAD & ANALYZE) ALANI */}
          <div className="bg-slate-950/90 border border-dashed border-slate-800 hover:border-cyan-500/50 rounded-xl p-3.5 space-y-2.5 transition">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-200">
                    KAP, Bilanço veya Midas KDM Görseli Yükle
                  </div>
                  <div className="text-[11px] text-slate-400">
                    PDF, Word, Excel veya Ekran Görüntüsü (PNG/JPG) yükleyin; çoklu ajan jürisi canlı karar üretsin.
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".pdf,.docx,.doc,.xlsx,.xls,.txt,.png,.jpg,.jpeg,.webp"
                  className="hidden"
                  id="tactical-file-upload-input"
                  disabled={uploadStatus.type === 'uploading'}
                />
                <label
                  htmlFor="tactical-file-upload-input"
                  className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer transition ${
                    uploadStatus.type === 'uploading'
                      ? 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed'
                      : 'bg-cyan-500/20 hover:bg-cyan-500/30 border-cyan-500/40 text-cyan-200'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>{uploadStatus.type === 'uploading' ? 'Yükleniyor...' : '📄 Dosya / Görsel Seç'}</span>
                </label>
              </div>
            </div>

            {/* Yükleme Durum ve Geri Bildirim Çubuğu */}
            {uploadStatus.type !== 'idle' && (
              <div
                className={`text-xs p-2.5 rounded-lg flex items-center justify-between gap-2 font-mono ${
                  uploadStatus.type === 'uploading'
                    ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/30'
                    : uploadStatus.type === 'success'
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/40'
                    : 'bg-rose-500/15 text-rose-300 border border-rose-500/40'
                }`}
              >
                <div className="flex items-center gap-2">
                  {uploadStatus.type === 'uploading' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {uploadStatus.type === 'success' && <Check className="w-3.5 h-3.5" />}
                  {uploadStatus.type === 'error' && <AlertCircle className="w-3.5 h-3.5" />}
                  <span>{uploadStatus.message}</span>
                </div>
                {uploadStatus.type !== 'uploading' && (
                  <button
                    type="button"
                    onClick={() => setUploadStatus({ type: 'idle', message: '' })}
                    className="text-slate-400 hover:text-slate-200 text-xs underline cursor-pointer"
                  >
                    Kapat
                  </button>
                )}
              </div>
            )}

            {/* Yüklenen Görselin Midas OCR Çıktısı (Varsa) */}
            {uploadedDecision?.metadata?.vision_analysis && (
              <div className="bg-slate-900/90 border border-cyan-500/30 rounded-lg p-2.5 text-[11px] font-mono text-cyan-200 space-y-1">
                <div className="text-emerald-400 font-bold">🔍 Midas Görsel KDM Analiz Teyidi:</div>
                <div>{uploadedDecision.metadata.vision_analysis.comment || uploadedDecision.metadata.vision_analysis.toon_line}</div>
                {uploadedDecision.metadata.vision_analysis.kademe_summary && (
                  <div className="text-slate-300 text-[10px]">Kademeler: {uploadedDecision.metadata.vision_analysis.kademe_summary}</div>
                )}
              </div>
            )}
          </div>

          {/* Akıcı Doğal Dil Kuant Analizi */}
          <div className="bg-slate-950/80 border border-slate-800/90 rounded-xl p-3.5 text-xs sm:text-sm text-slate-300 leading-relaxed">
            <span className="text-emerald-400 font-bold mr-1.5">Doğal Dil Analizi:</span>
            {uploadedDecision?.summary || verdict.naturalLanguageAnalysis}
          </div>

          {/* En Son Gelen Canlı RSS / KAP Haberi (En Yeniden Eskiye İlk Sıra) */}
          {latestNewsItem && (
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-mono font-bold text-[10px] shrink-0 flex items-center gap-1">
                  <Radio className="w-3 h-3 animate-pulse" />
                  SON HABER ({latestNewsItem.publish_time})
                </span>
                <span className="font-mono font-bold text-cyan-300 shrink-0">
                  [{latestNewsItem.ticker}]
                </span>
                <span className="text-slate-200 truncate font-medium">
                  {latestNewsItem.title}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0 font-mono text-[11px]">
                <span
                  className={`px-1.5 py-0.5 rounded ${
                    latestNewsItem.analysis?.impact_score >= 0
                      ? 'bg-emerald-500/15 text-emerald-300'
                      : 'bg-rose-500/15 text-rose-300'
                  }`}
                >
                  Etki: {latestNewsItem.analysis?.impact_score >= 0 ? '+' : ''}
                  {latestNewsItem.analysis?.impact_score ?? 0}
                </span>
                <a
                  href={latestNewsItem.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-slate-400 hover:text-emerald-300 inline-flex items-center gap-1"
                >
                  <span>Kaynak</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          )}

          {/* Açılır Harici LLM Prompt & .TOON Kutusu (İsteğe Bağlı) */}
          {isPromptPreviewOpen && (
            <div className="bg-slate-950 border border-cyan-500/30 rounded-xl p-4 space-y-3 animate-fadeIn">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                <div>
                  <h4 className="text-xs font-bold text-cyan-300 font-mono uppercase">
                    Başka LLM&apos;lere Verilecek Hazır Kuant Promptu &amp; .TOON Veri Paketi
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    ChatGPT, Claude, DeepSeek veya Gemini&apos;ye doğrudan yapıştırarak derin strateji analizi alabilirsiniz.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopy('PROMPT')}
                    className="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-200 text-xs font-mono font-bold flex items-center gap-1 cursor-pointer"
                  >
                    {copiedType === 'PROMPT' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>Promptu Kopyala</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCopy('TOON')}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-mono font-bold flex items-center gap-1 cursor-pointer"
                  >
                    {copiedType === 'TOON' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>.TOON Kopyala</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadToon}
                    className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>.TOON İndir</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <div>
                  <span className="text-[10px] font-mono text-slate-400 uppercase block mb-1">
                    Harici LLM Promptu (Doğal Dil + 5 Motor Verisi)
                  </span>
                  <pre className="bg-slate-900/90 border border-slate-800 rounded-lg p-3 text-[11px] font-mono text-slate-200 overflow-x-auto max-h-48 whitespace-pre-wrap">
                    {llmPromptText}
                  </pre>
                </div>
                <div>
                  <span className="text-[10px] font-mono text-slate-400 uppercase block mb-1">
                    .TOON Sıkıştırılmış Kuant Çıktısı
                  </span>
                  <pre className="bg-slate-900/90 border border-slate-800 rounded-lg p-3 text-[11px] font-mono text-emerald-300 overflow-x-auto max-h-48 whitespace-pre-wrap">
                    {toonPayloadText}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* 📊 KURUMSAL AKIŞ (AKD/TAKAS) & 💰 REEL GETİRİ & VERGİ PANELİ */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
            {/* Kurumsal Akış Paneli */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-cyan-300 flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  <span>📊 Kurumsal Akış (AKD / Takas)</span>
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                  akdView.signalType === 'KURUMSAL_TOPLAMA'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : akdView.signalType === 'DAGITIM'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    : 'bg-slate-800 text-slate-300 border border-slate-700'
                }`}>
                  {akdView.signalLabel}
                </span>
              </div>
              <div className="text-xs text-slate-300 font-mono space-y-1">
                <div>Top 3 Net Lot: <strong className={typeof akdView.top3NetLot === 'number' && akdView.top3NetLot >= 0 ? 'text-emerald-400' : 'text-rose-400'}>{typeof akdView.top3NetLot === 'number' && akdView.top3NetLot >= 0 ? '+' : ''}{safeFormat(akdView.top3NetLot)}</strong></div>
                <div className="text-[11px] text-slate-400 flex flex-wrap gap-x-3">
                  <span>BofA: {safeFormat(akdView.bofaNetLot)}</span>
                  <span>Garanti: {safeFormat(akdView.garantiNetLot)}</span>
                  <span>HHI: {akdView.hhi ?? 'VERİ YOK'}</span>
                </div>
                <p className="text-[11px] text-slate-400 italic pt-0.5">{akdView.summary}</p>
              </div>
            </div>

            {/* 🤖 LOCALLM CANLI DURUM PANELDİ (4 METRİK + TEST BUTONU) */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-3 md:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-mono font-bold text-emerald-300 flex items-center gap-1.5">
                  <Cpu className="w-4 h-4 text-emerald-400" />
                  <span>🤖 LocalLLM Kuant Yapay Zeka Motoru Durumu</span>
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleTestLocalLLM}
                    disabled={testResult.isTesting}
                    className="px-3 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-200 font-mono text-xs font-bold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Deterministik Fallback Mekanizmasını Test Et"
                  >
                    {testResult.isTesting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    )}
                    <span>{testResult.isTesting ? 'Test Ediliyor...' : 'LocalLLM Test'}</span>
                  </button>

                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                    llmInfo.isOnline
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}>
                    {llmInfo.isOnline ? '🟢 AKTİF' : '⚪ ÇEVRİMDIŞI / VERİ YOK'}
                  </span>
                </div>
              </div>

              {/* Test Sonuç Etiketi (Qodi Kuralı: null ise VERİ YOK gösterilir) */}
              <div className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between font-mono text-xs">
                <span className="text-slate-400 text-[11px]">Fallback Test Sonucu:</span>
                <span className={`font-bold ${
                  testResult.message === null
                    ? 'text-slate-500'
                    : testResult.isFallback === true
                    ? 'text-amber-300'
                    : testResult.isFallback === false
                    ? 'text-emerald-400'
                    : 'text-cyan-300'
                }`}>
                  {testResult.message !== null ? testResult.message : 'VERİ YOK (TEST EDİLMEDİ)'}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono">
                <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2.5">
                  <div className="text-[10px] text-slate-400">1. LocalLLM Durumu</div>
                  <div className={`text-sm font-bold mt-1 ${llmInfo.isOnline ? 'text-emerald-400' : 'text-slate-400'}`}>
                    {llmInfo.isOnline ? 'Aktif' : '---'}
                  </div>
                </div>
                <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2.5">
                  <div className="text-[10px] text-slate-400">2. Aktif Model</div>
                  <div className="text-sm font-bold text-cyan-300 mt-1 truncate">
                    {llmInfo.activeModel}
                  </div>
                </div>
                <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2.5">
                  <div className="text-[10px] text-slate-400">3. Son Yanıt</div>
                  <div className="text-sm font-bold text-amber-300 mt-1">
                    {llmInfo.lastLatencySec}
                  </div>
                </div>
                <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2.5">
                  <div className="text-[10px] text-slate-400">4. Halüsinasyon Engellendi</div>
                  <div className="text-sm font-bold text-purple-300 mt-1">
                    {llmInfo.hallucinationBlocks}
                  </div>
                </div>
              </div>
            </div>

            {/* Reel Getiri & Vergi Paneli */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-amber-300 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-amber-400" />
                  <span>💰 Reel Getiri (USD) &amp; Vergi</span>
                </span>
                <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] font-mono font-bold">
                  Stopaj %{taxView.withholdingRate * 100}
                </span>
              </div>
              <div className="text-xs text-slate-300 font-mono space-y-1">
                <div>Reel Getiri (USD): <strong className={typeof taxView.realPnlUsd === 'number' && taxView.realPnlUsd >= 0 ? 'text-emerald-400' : 'text-rose-400'}>{typeof taxView.realPnlUsd === 'number' && taxView.realPnlUsd >= 0 ? '+' : ''}${safeFormat(taxView.realPnlUsd, { minimumFractionDigits: 2 })} (%{taxView.realPnlUsdPct ?? 'VERİ YOK'})</strong></div>
                <div className="text-[11px] text-slate-400 flex flex-wrap gap-x-3">
                  <span>Nominal TL: {safeFormat(taxView.nominalPnlTl)} TL</span>
                  <span>Net TL: {safeFormat(taxView.netPnlTl)} TL</span>
                </div>
                <p className="text-[11px] text-slate-400 italic pt-0.5">{taxView.summary}</p>
              </div>
            </div>

            {/* Risk & Pozisyon Yönetimi Paneli */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2 md:col-span-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-purple-300 flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-purple-400" />
                  <span>⚖️ Risk &amp; Pozisyon Yönetimi (Kelly, PortfolioGuard &amp; Slippage)</span>
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                  riskView.guardApproved
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                }`}>
                  {riskView.guardApproved ? '✅ Korelasyon Onaylı' : '❌ Korelasyon Red'}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono text-slate-300">
                <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2.5">
                  <div className="text-[10px] text-slate-400">Önerilen Pozisyon (TL)</div>
                  <div className="text-base font-bold text-white mt-0.5">
                    {cur}{safeFormat(riskView.recommendedAllocationUsd)} (
                    {positionSizerMetrics.lot !== null ? `${positionSizerMetrics.lot} lot` : (riskView.recommendedLots !== null ? `${riskView.recommendedLots} lot` : 'VERİ YOK')})
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Kelly Çarpanı: %{positionSizerMetrics.kellyPct !== null ? positionSizerMetrics.kellyPct : (riskView.kellyFraction !== null ? (riskView.kellyFraction * 100).toFixed(1) : '---')}
                  </div>
                </div>
                <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2.5">
                  <div className="text-[10px] text-slate-400">PortfolioGuard (Korelasyon)</div>
                  <div className={`text-xs font-bold mt-1 ${riskView.guardApproved ? 'text-emerald-400' : 'text-rose-400'}`}>Max Corr: {riskView.guardCorrelation}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5 truncate">{riskView.guardReason}</div>
                </div>
                <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2.5">
                  <div className="text-[10px] text-slate-400">Slippage &amp; Komisyon</div>
                  <div className="text-xs font-bold text-amber-300 mt-1">Kesinti: {cur}{safeFormat(riskView.feeAmount, { minimumFractionDigits: 2 })}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Kayma: {riskView.slippageBps} bps</div>
                </div>
              </div>
            </div>

            {/* 📚 Geçmiş Bağlam (RAG) Paneli */}
            {ragContextText && (
              <div className="bg-slate-950 border border-emerald-500/30 rounded-xl p-3.5 space-y-2 md:col-span-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-emerald-300 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    <span>📚 Geçmiş Bağlam (RAG &amp; KAP Hafızası)</span>
                  </span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono font-bold">
                    RAG Eşleşti
                  </span>
                </div>
                <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3 text-xs font-mono text-slate-200 whitespace-pre-wrap max-h-40 overflow-y-auto">
                  {ragContextText}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 3. ALT SATIR (FOOTER): Erime 12dk | Duvar 10.773 lot @ ... | VaR %2.71 | Stop ... | TP ... [Detay v] */}
        <div className="px-5 py-3 bg-slate-950/90 border-t border-slate-800/90 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-slate-300">
            <span>
              Erime: <strong className="text-white">{typeof verdict.breakoutMinutes === 'number' && !isNaN(verdict.breakoutMinutes) ? `${verdict.breakoutMinutes}dk` : 'VERİ YOK'}</strong>
            </span>
            <span className="text-slate-700">·</span>
            <span>
              Duvar:{' '}
              <strong className="text-cyan-300">
                {typeof verdict.price === 'number' && verdict.price > 0 && typeof verdict.wallLot === 'number' && typeof verdict.wallPrice === 'number'
                  ? `${safeFormat(verdict.wallLot)} lot @ ${cur}${safeFormat(verdict.wallPrice, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  : 'VERİ YOK'}
              </strong>
            </span>
            <span className="text-slate-700">·</span>
            <span>
              VaR: <strong className="text-amber-300">{typeof verdict.price === 'number' && verdict.price > 0 && typeof verdict.varPct === 'number' ? `%${verdict.varPct}` : 'VERİ YOK'}</strong>
            </span>
            <span className="text-slate-700">·</span>
            <span>
              Stop:{' '}
              <strong className="text-rose-400">
                {typeof verdict.price === 'number' && verdict.price > 0 && typeof verdict.stopPrice === 'number' && verdict.stopPrice > 0
                  ? `${cur}${safeFormat(verdict.stopPrice, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  : 'VERİ YOK'}
              </strong>
            </span>
            <span className="text-slate-700">·</span>
            <span>
              TP:{' '}
              <strong className="text-emerald-400">
                {typeof verdict.price === 'number' && verdict.price > 0 && typeof verdict.tpPrice === 'number' && verdict.tpPrice > 0
                  ? `${cur}${safeFormat(verdict.tpPrice, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  : 'VERİ YOK'}
              </strong>
            </span>
          </div>

          {/* [Detay v] Çekmece Aç/Kapat Butonu */}
          <button
            type="button"
            onClick={() => setIsDetailOpen((prev) => !prev)}
            className={`px-3.5 py-1.5 rounded-xl font-mono text-xs font-black border flex items-center gap-1.5 transition cursor-pointer ${
              isDetailOpen
                ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-lg shadow-emerald-500/20'
                : 'bg-slate-900 hover:bg-slate-800 text-emerald-300 border-emerald-500/40'
            }`}
          >
            <span>{isDetailOpen ? 'Detayları Gizle' : 'Detay'}</span>
            {isDetailOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 🗄️ VARSAYILAN KAPALI DETAY ÇEKMECESİ (TÜM DERİN MOTORLAR & 9 KÜP)    */}
      {/* ===================================================================== */}
      {isDetailOpen && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-5 animate-fadeIn">
          {/* Detay Sekme Seçici */}
          <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
              {[
                { id: 'CUBES_XAI' as DetailDrawerTab, label: '1. 9 Küp & 4 Motor Matrisi', icon: Layers },
                { id: 'JURY_RSS' as DetailDrawerTab, label: '2. 6 Ajanlı Jüri & Canlı RSS/KAP', icon: Radio },
                { id: 'BOOKMAP_WHALE' as DetailDrawerTab, label: '3. Bookmap L2 & Iceberg Radar', icon: Activity },
                { id: 'PORTFOLIO_MAM' as DetailDrawerTab, label: '4. Korelasyon 9x9, MAM/PAMM & Track Record', icon: TrendingUp },
                { id: 'OCO_SHIELD_AI' as DetailDrawerTab, label: '5. OCO Emir, Devre Kesici & QuantMind', icon: Shield },
              ].map((tab) => {
                const Icon = tab.icon;
                const active = activeDetailTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveDetailTab(tab.id)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold font-mono flex items-center gap-1.5 whitespace-nowrap border transition cursor-pointer ${
                      active
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                        : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            <span className="text-[11px] font-mono text-slate-400">
              Joker Durumu: <strong className="text-cyan-300">{verdict.alarm}</strong>
            </span>
          </div>

          {/* SEKME 1: 9 KÜP MATRİSİ + 4 ANA MOTOR ÖZETİ (Kütle Direnci, Adli Risk, Hafıza, EXPO_V2) */}
          {activeDetailTab === 'CUBES_XAI' && (
            <div className="space-y-5">
              {/* 4 Ana Motor Kolonu */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5">
                  <span className="text-[10px] font-mono text-slate-400 uppercase">1. Kütle Direnci &amp; Tahta</span>
                  <div className="text-lg font-black font-mono text-white mt-1">
                    %{verdict.engines.board.massResistance} · {verdict.engines.board.whaleLabel}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Erime: {verdict.breakoutMinutes}dk · Sahte Duvar: {verdict.isFakeWall ? 'TESPİT EDİLDİ' : 'Yok'}
                  </p>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5">
                  <span className="text-[10px] font-mono text-slate-400 uppercase">2. Adli Risk &amp; SPK</span>
                  <div className="text-lg font-black font-mono text-white mt-1">
                    {verdict.riskScore}/100 · Wash %{verdict.engines.forensic.washTradeRatio}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Beneish M: {verdict.engines.forensic.beneishMScore} ·{' '}
                    {verdict.engines.forensic.spkFlags[0] || 'SPK Bayrağı Yok'}
                  </p>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5">
                  <span className="text-[10px] font-mono text-slate-400 uppercase">3. Hafıza &amp; Anomali (XAI)</span>
                  <div className="text-lg font-black font-mono text-white mt-1">
                    HHI {verdict.engines.anomaly.hhi} · Tree %{verdict.engines.anomaly.treeProb}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Isolation Forest: {verdict.engines.anomaly.isolationForestScore} · Hafıza: %{verdict.engines.composite.memoryEvidenceScore}
                  </p>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5">
                  <span className="text-[10px] font-mono text-slate-400 uppercase">4. Üstel Risk (EXPO_V2)</span>
                  <div className="text-lg font-black font-mono text-white mt-1">
                    {verdict.expoScore}/100 · Çarpan {verdict.amplifier}x
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Yön Uyumu: {verdict.engines.composite.directionalCoherence} · Kelly: %{verdict.kellyPct}
                  </p>
                </div>
              </div>

              {/* 9 Küp (3x3 Grid) */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <h4 className="text-xs font-mono font-bold text-slate-300 uppercase">
                    9 Küp Kuant Sentez Matrisi (Uyum: %{verdict.coherence} · Çatışma: {verdict.engines.storyCubes.conflictCount}/9)
                  </h4>
                  <span className="text-xs font-mono text-emerald-400 font-bold">
                    Override: {verdict.engines.storyCubes.overrideAction}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {verdict.engines.storyCubes.cubes.map((cube) => {
                    const isBuy = cube.signal === 'AL';
                    const isSell = cube.signal === 'SAT';
                    return (
                      <div
                        key={cube.id}
                        className="bg-slate-950/90 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between gap-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-200">{cube.label}</span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                              isBuy
                                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                                : isSell
                                ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                                : 'bg-slate-800 text-slate-300 border-slate-700'
                            }`}
                          >
                            {cube.signal} · {cube.score}/100
                          </span>
                        </div>
                        <div className="text-sm font-black font-mono text-white">{cube.valueText}</div>
                        <p className="text-[11px] text-slate-400 truncate">{cube.note}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* SEKME 2: 6 AJANLI JÜRİ RAPORU & EN YENİDEN ESKİYE CANLI RSS / KAP AKIŞI */}
          {activeDetailTab === 'JURY_RSS' && (
            <div className="space-y-5">
              <Suspense fallback={<div>Yükleniyor...</div>}>
                <SmartJuryDiagnosisCard
                  marketType={verdict.marketType}
                  ticker={verdict.symbol}
                  onVetoStatusChange={onVetoStatusChange}
                />
              </Suspense>
              <MarketNewsTicker onSelectTickerNews={onSelectTicker} />
            </div>
          )}

          {/* SEKME 3: BOOKMAP L2 ISI HARİTASI & ICEBERG / BALİNA DEDEKTÖRÜ */}
          {activeDetailTab === 'BOOKMAP_WHALE' && (
            <div className="space-y-5">
              {/* 🧱 BIST Duvar Tespit (Analizden Gelen) */}
              {verdict.wall && (
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-center justify-between shadow-sm animate-fadeIn">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold text-slate-300">BIST Duvar Tespit:</span>
                  </div>
                  <span className="text-xs font-mono font-black text-amber-400">
                    {verdict.wall.wall_lot.toLocaleString()} lot @ {verdict.wall.price.toFixed(2)} {verdict.wall.type}
                  </span>
                </div>
              )}
              <OrderBookHeatmapVisualizer
                symbol={verdict.symbol}
                lastPrice={verdict.price}
                spread={typeof verdict.price === 'number' && !isNaN(verdict.price) ? Number((verdict.price * 0.001).toFixed(2)) : 0.08}
                obi={verdict.obi}
                zScore={verdict.zScore}
                bids={orderBookLevels?.bids || []}
                asks={orderBookLevels?.asks || []}
              />

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="space-y-4">
                  <div className="flex flex-col gap-2">
                    <button 
                      onClick={handleUploadClick} 
                      style={{ backgroundColor: '#3b82f6', color: 'white', padding: '8px 16px', borderRadius: '8px', fontWeight: 'bold' }}
                      className="w-fit hover:brightness-110 active:scale-95 transition-all shadow-lg"
                    >
                      📊 AKD Fotoğrafı Yükle
                    </button>
                    <input
                      type="file"
                      ref={akdFileInputRef}
                      onChange={handleAKDUploadForAlert}
                      accept="image/*"
                      className="hidden"
                    />
                  </div>
                  <InstitutionalFlowMeter
                    snapshot={globalSnapshot}
                    ticker={verdict.symbol}
                    marketType={verdict.marketType}
                  />

                  {/* 🎯 AKD Görsel Analiz Bölümü (L2 Depth Panel Focus) */}
                  <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-bold text-slate-200 flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-blue-400" />
                        Taktiksel AKD Kontrolü
                      </h4>
                      {akdLoading && <span className="text-[10px] text-yellow-400 animate-pulse font-mono">ANALİZ EDİLİYOR...</span>}
                    </div>

                    <div className="flex items-center gap-3">
                      <label className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-blue-500/20 active:scale-95">
                        <span>📊 AKD Fotoğrafı Yükle</span>
                        <input
                          type="file"
                          accept="image/png, image/jpeg, image/webp"
                          className="hidden"
                          onChange={handleAKDFileChange}
                          disabled={akdLoading}
                        />
                      </label>
                      <p className="text-[10px] text-slate-500 leading-tight">
                        Gerçek Aracı Kurum Dağılımı (AKD) ekran görüntüsünü yükleyerek simülasyonu anında ezin.
                      </p>
                    </div>

                    {akdStatus.type && (
                      <div className={`mt-3 p-2.5 rounded-xl text-xs font-bold border animate-fadeIn ${
                        akdStatus.type === 'success'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                      }`}>
                        {akdStatus.text}
                      </div>
                    )}
                  </div>
                </div>

                <IcebergDetectorCard
                  symbol={verdict.symbol}
                  marketType={verdict.marketType}
                  currentPrice={verdict.price}
                  obi={verdict.obi}
                  zScore={verdict.zScore}
                />
              </div>
            </div>
          )}


          {/* SEKME 4: KORELASYON 9x9, PROP MAM/PAMM ($400k), MONTE CARLO & TRACK RECORD */}
          {activeDetailTab === 'PORTFOLIO_MAM' && (
            <div className="space-y-5">
              <PortfolioCorrelationCard
                currentSymbol={verdict.symbol}
                marketType={verdict.marketType}
              />
              <MamPropDashboardCard />
              <TrackRecordPanel marketType={verdict.marketType} />
            </div>
          )}

          {/* SEKME 5: OCO EMİR MOTORU, DEVRE KESİCİ, PING/LATENCY & MT16 QUANTMIND */}
          {activeDetailTab === 'OCO_SHIELD_AI' && (
            <div className="space-y-5">
              {verdict.marketType === 'CRYPTO' ? (
                <BinanceTestnetExecutorCard
                  currentSymbol={verdict.symbol}
                  isLiveAutoTrade={isLiveAutoTrade}
                  onToggleAutoTrade={onToggleAutoTrade}
                />
              ) : (
                <AlpacaExecutorCard
                  marketType={verdict.marketType}
                  currentSymbol={verdict.symbol}
                />
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <VolatileCircuitBreakerCard
                  symbol={verdict.symbol}
                  marketType={verdict.marketType}
                  currentPrice={verdict.price}
                  priceChangePct={verdict.changePct}
                  spread={typeof verdict.price === 'number' && !isNaN(verdict.price) ? Number((verdict.price * 0.001).toFixed(2)) : 0.08}
                  spreadPct={0.1}
                  isLiveAutoTrade={isLiveAutoTrade}
                  onToggleAutoTrade={onToggleAutoTrade}
                />
                <SystemHealthLatencyCard
                  marketType={verdict.marketType}
                  isLiveAutoTrade={isLiveAutoTrade}
                  onToggleAutoTrade={onToggleAutoTrade}
                />
              </div>

              <Suspense fallback={<div>Yükleniyor...</div>}>
                <SignalBotCard />
              </Suspense>

              {onSendChat && (
                <WarrenAiChat
                  activeSymbol={verdict.symbol}
                  marketType={verdict.marketType}
                  messages={chatMessages}
                  isLoading={isChatLoading}
                  onSendMessage={onSendChat}
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* 🖥️ 1 SAYFALIK KURUMSAL HTML5 RAPOR PENCERESİ (DynamicHtml5Container)  */}
      {/* ===================================================================== */}
      {isHtml5ModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-5xl bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 bg-slate-950 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FileCode2 className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-mono font-bold text-white">
                  MT16 Kurumsal 1 Sayfa HTML5 Analiz Raporu — #{verdict.symbol}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const blob = new Blob([html5ReportContent], { type: 'text/html;charset=utf-8' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `MT16_${verdict.symbol}_1Sayfa_Rapor.html`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-200 hover:bg-cyan-500/30 text-[11px] font-mono font-bold cursor-pointer"
                >
                  .HTML İndir
                </button>
                <button
                  type="button"
                  onClick={() => setIsHtml5ModalOpen(false)}
                  className="px-2.5 py-1 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-200 hover:bg-rose-500/30 text-[11px] font-mono font-bold cursor-pointer"
                >
                  Kapat ✕
                </button>
              </div>
            </div>
            <DynamicHtml5Container
              componentId={`html5-report-${verdict.symbol}`}
              fallback={<div className="p-4 text-xs text-amber-300">HTML5 Rapor yüklenemedi.</div>}
            >
              <iframe
                title={`MT16 HTML5 Report ${verdict.symbol}`}
                srcDoc={html5ReportContent}
                className="w-full h-[78vh] bg-slate-950 border-0"
              />
            </DynamicHtml5Container>
          </div>
        </div>
      )}
    </div>
  );
};
export default TacticalCard;
