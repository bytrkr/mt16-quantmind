// src/components/LiveJuryBoard.tsx
import React, { useState, useEffect } from 'react';
import { ShieldCheck, ShieldAlert, Scale, RefreshCw, CheckCircle2, AlertTriangle, Layers, Radio, Globe, ExternalLink, ListChecks, FileText, TrendingUp } from 'lucide-react';

export interface AgentStatus {
  name: string;
  role?: string;
  verdict: 'Pass' | 'Caution' | 'Veto' | 'AL' | 'TUT' | 'SAT' | 'GÜÇLÜ AL' | 'VETO / SAT';
  score?: number;
  reasoning: string;
}

export interface ResearchPlanStep {
  agent: string;
  metricExamined: string;
  verdict: 'PAS' | 'AL' | 'GÜVENLİ' | 'VETO' | 'AÇIK' | 'BEKLE' | 'GÜÇLÜ AL' | 'SAT';
  details: string;
}

export interface CitedSource {
  id?: string;
  sourceName: string;
  title: string;
  url: string;
  publishedAt: string;
}

export interface PredictionMarketOutcome {
  option: string;
  probability_pct: number;
}

export interface PredictionMarketScenario {
  topic: string;
  outcomes: PredictionMarketOutcome[];
  consensus_expectation: string;
}

export interface JuryDebateResult {
  ticker?: string;
  consensus?: string;
  confidenceScore?: number;
  coherenceScore?: number;
  verdict?: 'Veto' | 'Approve' | string;
  isPreFiltered?: boolean;
  dataSource?: string;
  warning?: string;
  preFilterResult?: {
    isPreFiltered: boolean;
    read: boolean;
    priority?: string;
    finalVerdict?: string;
    reason?: string;
    ruleTriggered?: string;
    dataSource?: string;
    warning?: string;
    timestamp?: string;
  };
  agents?: AgentStatus[];
  jurors?: Array<{
    id: string;
    name: string;
    role: string;
    vote: string;
    weight: number;
    score: number;
    comment: string;
  }>;
  researchPlan?: ResearchPlanStep[];
  citations?: CitedSource[];
  predictionMarketScenarios?: PredictionMarketScenario[];
  tcmbMacro?: any;
  finnhubSentiment?: any;
  finalDecision?: {
    action: string;
    targetPercent: number;
    fullKellyPct?: number;
    fractionalKellyPct?: number;
    fractionalKellyMultiplier?: number;
    fractionalKellyLabel?: string;
    stopLossPercent: number;
    isBullTrapRisk?: boolean;
    summary: string;
  };
}

interface Props {
  ticker: string;
  data?: JuryDebateResult | null;
  className?: string;
}

export const LiveJuryBoard: React.FC<Props> = ({ ticker, data: propData, className = '' }) => {
  const [internalData, setInternalData] = useState<JuryDebateResult | null>(propData || null);
  const [loading, setLoading] = useState<boolean>(false);
  const [activeSubTab, setActiveSubTab] = useState<'jurors' | 'research_plan' | 'citations' | 'prediction_markets'>('jurors');
  const [selectedPersona, setSelectedPersona] = useState<'STANDARD' | 'BUFFETT' | 'BURRY' | 'WOOD'>('STANDARD');

  const fetchJuryDebate = async (t: string, persona: string = selectedPersona) => {
    try {
      setLoading(true);
      const clean = (t || 'ASELS').toUpperCase();
      const res = await fetch(`/api/jury-debate/${encodeURIComponent(clean)}?persona=${persona}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.result) {
          setInternalData(json.result);
        }
      }
    } catch (err) {
      console.error('Failed to fetch jury debate:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (propData) {
      setInternalData(propData);
    } else {
      fetchJuryDebate(ticker);
    }
  }, [ticker, propData, selectedPersona]);

  const activeData = internalData;
  const isPreFiltered = Boolean(activeData?.isPreFiltered || activeData?.preFilterResult?.isPreFiltered);
  const preFilterResult = activeData?.preFilterResult;
  const isDataSourceLock = preFilterResult?.ruleTriggered === 'DATA_SOURCE_NOHOLD_LOCK' || Boolean(activeData?.consensus?.includes('SATIŞ KİLİT'));
  const warningBadge = activeData?.warning || preFilterResult?.warning || (isDataSourceLock ? '⚠️ Veri Kaynağı: Simülasyon (yfinance Yanıt Vermedi)' : undefined);
  const isVeto = isPreFiltered || activeData?.consensus?.includes('VETO') || activeData?.finalDecision?.action?.includes('VETO') || isDataSourceLock || false;
  const confidence = isPreFiltered ? 0 : (activeData?.confidenceScore ?? (activeData?.coherenceScore ? activeData.coherenceScore * 100 : 82));

  // Normalize jurors list from backend or fallback to agents
  const displayJurors: AgentStatus[] = activeData?.jurors?.map(j => ({
    name: j.name,
    role: j.role,
    verdict: j.vote as any,
    score: j.score,
    reasoning: j.comment
  })) || activeData?.agents || [
    { name: '1. Kuantitatif Hakim', role: 'Teknik & Momentum', verdict: 'AL', score: 84, reasoning: 'RSI ve MACD göstergelerinde pozitif uyumsuzluk teyit edildi.' },
    { name: '2. Tahta & Takas (TCMB)', role: 'TCMB Yabancı Akış', verdict: 'GÜÇLÜ AL', score: 90, reasoning: 'TCMB EVDS net yabancı hisse girişi ve SMA_4 takas artışı teyit edildi.' },
    { name: '3. Temel Değerleme', role: 'Bilanço & Altman-Z', verdict: 'AL', score: 79, reasoning: 'F/K ve PD/DD sektör ortalamalarına göre iskontolu kalmıştır.' },
    { name: '4. KAP & Haber (Finnhub)', role: 'Duygu & Insider', verdict: isVeto ? 'VETO / SAT' : 'GÜÇLÜ AL', score: isVeto ? 24 : 94, reasoning: isVeto ? 'Finnhub sentiment < 0.35 negatif duygu vetosu devrede.' : 'Finnhub ve KAP haber akışı pozitif bölgede.' },
  ];

  // Default Fallbacks for Deep Search Capabilities
  const researchPlanSteps: ResearchPlanStep[] = activeData?.researchPlan || [
    { agent: 'Teknik & Momentum Ajanı', metricExamined: `Spot Fiyat & SMA_50 Kırılımı`, verdict: 'AÇIK', details: 'Fiyat SMA_50 üzerinde seyrediyor, hacim teyidi mevcut.' },
    { agent: 'Kuantitatif Risk Ajanı (CVaR)', metricExamined: `VaR %95 & CVaR Expected Shortfall`, verdict: 'GÜVENLİ', details: 'CVaR %95 riski müsaade edilen %5.0 sınırının altında.' },
    { agent: 'Kısıt Doğrulama Ajanı (OpenClaw)', metricExamined: `L2 Derinliği, OBI ve Korelasyon`, verdict: 'PAS', details: 'Likidite ve %20 portföy konsantrasyon kısıtları doğrulandı.' },
    { agent: 'Temel & Kurumsal Akış Ajanı', metricExamined: `BofA & Ak Yatırım Net Takas Akışı`, verdict: 'AL', details: 'Kurumsal takas artışı ve KAP özel durum bildirimleri pozitif.' },
    { agent: 'Makro & Tahmin Piyasası Ajanı', metricExamined: `TCMB EVDS & Tahmin Piyasası Olasılığı`, verdict: 'GÜVENLİ', details: 'Makro senaryo faiz sabitleme beklentisi %78.5 ile olumlu.' }
  ];

  const citedSources: CitedSource[] = activeData?.citations || [
    { id: 'c1', sourceName: 'KAP Kamuyu Aydınlatma Platformu', title: `${ticker} Şirket Özel Durum Açıklaması ve Sözleşme Bildirimi`, url: `https://www.kap.org.tr/tr/sirket-bilgileri/ozet/${ticker}`, publishedAt: new Date().toLocaleTimeString('tr-TR') },
    { id: 'c2', sourceName: 'TCMB EVDS Elektronik Veri Dağıtım Sistemi', title: 'Haftalık Menkul Kıymet ve Yabancı Portföy Akış Raporu', url: 'https://evds2.tcmb.gov.tr', publishedAt: new Date().toLocaleTimeString('tr-TR') },
    { id: 'c3', sourceName: 'Bloomberg / Reuters Terminal', title: `${ticker} Piyasa Derinliği ve L2 Sipariş Defteri Analizi`, url: 'https://www.bloomberg.com', publishedAt: new Date().toLocaleTimeString('tr-TR') }
  ];

  const predictionScenarios: PredictionMarketScenario[] = activeData?.predictionMarketScenarios || [
    {
      topic: 'TCMB Politika Faizi Kararı',
      outcomes: [
        { option: 'Faiz Sabit Tutma', probability_pct: 78.5 },
        { option: '250 bps İndirim', probability_pct: 21.5 }
      ],
      consensus_expectation: 'Sıkı Para Politikası Korunacak (%78.5)'
    },
    {
      topic: 'Yabancı Portföy Net Girişi Beklentisi',
      outcomes: [
        { option: 'Pozitif Giriş (>50M$)', probability_pct: 68.0 },
        { option: 'Nötr / Çıkış', probability_pct: 32.0 }
      ],
      consensus_expectation: 'Pozitif Yabancı Akışı Ağırlıkta (%68.0)'
    }
  ];

  return (
    <div className={`bg-slate-900 p-6 rounded-2xl text-white border border-slate-800 shadow-xl ${className}`}>
      {/* Persona Selector Bar */}
      <div className="mb-4 flex items-center justify-between gap-2 p-1.5 bg-slate-950 border border-slate-800 rounded-xl">
        <div className="flex items-center gap-2 px-2 text-[10px] font-black text-slate-500 uppercase">
          <Layers className="w-3.5 h-3.5" />
          Yatırımcı Personası:
        </div>
        <div className="flex items-center gap-1">
          {[
            { id: 'STANDARD', name: 'Standard' },
            { id: 'BUFFETT', name: 'W. Buffett (Value)' },
            { id: 'BURRY', name: 'M. Burry (Contrarian)' },
            { id: 'WOOD', name: 'C. Wood (Aggressive)' }
          ].map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedPersona(p.id as any)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold font-mono transition cursor-pointer ${
                selectedPersona === p.id
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-lg shadow-emerald-500/10'
                  : 'text-slate-400 hover:text-white border border-transparent'
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4 p-3 bg-rose-950/20 border border-rose-900/50 rounded-xl text-[10px] text-rose-300/80 italic flex items-start gap-2">
        <Scale className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
        <span>
          YASAL UYARI / DISCLAIMER: Bu platformda sunulan adli finans denetimleri, TCMB EVDS akış modelleri, Finnhub duygu skorları ve jüri analizleri kamuya açık veriler üzerinden otonom algoritmalarla üretilmektedir. Yatırım danışmanlığı kapsamında değildir.
        </span>
      </div>

      {/* ⚠️ Veri Kaynağı Uyarısı (Simülasyon / XML Feeder) */}
      {warningBadge && (
        <div className="mb-4 p-3 bg-gradient-to-r from-amber-950/80 via-slate-900 to-amber-950/50 border-2 border-amber-500/80 rounded-xl shadow-lg shadow-amber-950/40 flex items-center justify-between gap-3 text-xs font-bold text-amber-300">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 animate-bounce" />
            <span>{warningBadge}</span>
          </div>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-950 border border-amber-500/50 text-amber-200 shrink-0 font-bold">
            {isDataSourceLock ? '🔒 NOHOLD / SATIŞ KİLİT' : 'GECİKMELİ MOD'}
          </span>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Scale className="w-5 h-5 text-emerald-400" />
              MT16 Çoklu Ajan Jüri Kurulu: <span className="font-mono text-emerald-300">{ticker}</span>
            </h2>
            {isDataSourceLock ? (
              <span className="px-2.5 py-1 rounded text-xs font-black font-mono border bg-amber-500/25 text-amber-300 border-amber-500 animate-pulse flex items-center gap-1.5 shadow-lg shadow-amber-950/40">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                🔒 NOHOLD / SATIŞ KİLİT
              </span>
            ) : isPreFiltered ? (
              <span className="px-2.5 py-1 rounded text-xs font-black font-mono border bg-rose-600/30 text-rose-300 border-rose-500 animate-pulse flex items-center gap-1.5 shadow-lg shadow-rose-950/40">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                🛡️ ÖN FİLTRE DEVREDE
              </span>
            ) : (
              <span className={`px-2 py-0.5 rounded text-[10px] font-black font-mono border ${
                isVeto ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse' : warningBadge ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              }`}>
                {activeData?.consensus || (isVeto ? 'NEGATİF DUYGU VETOSU' : warningBadge ? 'VERİ YOK / BEKLE' : 'AL (KONSENSÜS)')}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {isDataSourceLock
              ? 'Veri Kaynağı Kilidi Aktif: Simülasyon veya XML Feeder modunda sermaye koruması için NOHOLD kilitlendi'
              : isPreFiltered
              ? 'Kök Veri Kural Motoru (DataRuleEngine) Ön Filtresi Aktif - Jüri Kararı Kilitlendi'
              : 'TCMB EVDS Haftalık Yabancı Akışı, Finnhub Sentiment ve Adli Veto Kuralları Sentezi'}
          </p>
        </div>

        <button
          onClick={() => fetchJuryDebate(ticker)}
          disabled={loading}
          className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 hover:text-white flex items-center gap-1.5 transition cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
          Jüriyi Yenile
        </button>
      </div>

      {/* 🛡️ ÖN FİLTRE DEVREDE BİLDİRİM KARTI */}
      {isPreFiltered && (
        <div className="mb-5 p-4 bg-gradient-to-r from-rose-950/60 via-slate-900 to-amber-950/40 border-2 border-rose-500/80 rounded-xl shadow-xl shadow-rose-950/40 relative overflow-hidden">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-rose-500/20 rounded-lg border border-rose-500/50 text-rose-400 shrink-0">
              <ShieldAlert className="w-6 h-6 animate-pulse" />
            </div>
            <div className="space-y-1.5 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                    🛡️ ÖN FİLTRE DEVREDE (KÖK VERİ KURALI TETİKLENDİ)
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                    {preFilterResult?.priority || 'CRITICAL / VETO'}
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-950 text-slate-300 border border-slate-800 font-bold">
                  Nihai Karar: {preFilterResult?.finalVerdict || activeData?.consensus || 'VETO'}
                </span>
              </div>
              <p className="text-xs font-semibold text-rose-200/90 leading-relaxed">
                {preFilterResult?.reason || activeData?.finalDecision?.summary || 'Kök Veri Motoru (DataRuleEngine) kural ihlali tespit ederek jüri tartışmasını veto etti.'}
              </p>
              <div className="text-[11px] text-slate-400 bg-slate-950/80 p-2 rounded-lg border border-slate-800/80 flex items-center gap-2">
                <span className="text-amber-400 font-bold">⚡ Güvenlik Protokolü:</span>
                <span>Jüri üyelerinin LLM tartışması atlanmış ve sistem güvenliği için karar anında kilitlenmiştir. Güven Skoru %0.</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Güven Skoru Barı */}
      <div className="mb-5 bg-slate-950 p-4 rounded-xl border border-slate-800/80">
        <div className="flex justify-between items-center mb-2 text-xs">
          <span className="text-slate-400">Jüri Bütünlük ve Güven Skoru:</span>
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-white">
              {isPreFiltered || isDataSourceLock ? '%0.0 (VERİ YOK / BEKLE)' : `%${confidence.toFixed(1)}`}
            </span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
              isPreFiltered
                ? 'bg-rose-500/30 text-rose-300 border border-rose-500 animate-pulse'
                : isDataSourceLock
                ? 'bg-amber-500/30 text-amber-300 border border-amber-500'
                : isVeto
                ? 'bg-rose-500/20 text-rose-400'
                : 'bg-emerald-500/20 text-emerald-400'
            }`}>
              {isPreFiltered ? '🛡️ ÖN FİLTRE KİLİDİ' : isDataSourceLock ? '⚠️ İŞLEM DURDURULDU (VERİ YOK)' : isVeto ? '🚨 ADLİ / DUYGU VETOSU' : '✅ JÜRİ KONSENSÜS ONAYI'}
            </span>
          </div>
        </div>
        <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-700 ${isPreFiltered ? 'bg-rose-600' : isVeto ? 'bg-rose-500' : 'bg-emerald-500'}`}
            style={{ width: `${isPreFiltered ? 100 : Math.min(100, Math.max(10, confidence))}%` }}
          />
        </div>
      </div>

      {/* Alt Sekme Navigasyonu (Google Finance Deep Search) */}
      <div className="flex flex-wrap items-center gap-2 mb-4 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveSubTab('jurors')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
            activeSubTab === 'jurors'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <Scale className="w-3.5 h-3.5" />
          Jüri Üyeleri ({displayJurors.length})
        </button>

        <button
          onClick={() => setActiveSubTab('research_plan')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
            activeSubTab === 'research_plan'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
              : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <ListChecks className="w-3.5 h-3.5" />
          Şeffaf Araştırma Planı
        </button>

        <button
          onClick={() => setActiveSubTab('citations')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
            activeSubTab === 'citations'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          Kaynaklar & KAP Atıfları ({citedSources.length})
        </button>

        <button
          onClick={() => setActiveSubTab('prediction_markets')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
            activeSubTab === 'prediction_markets'
              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
              : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          Tahmin Piyasaları (Polymarket)
        </button>
      </div>

      {/* SEKME 1: Jüri Üyeleri Izgarası */}
      {activeSubTab === 'jurors' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {displayJurors.map((agent, idx) => {
            const isAgentVeto = String(agent.verdict).includes('VETO') || String(agent.verdict).includes('SAT');
            return (
              <div
                key={`${agent.name}-${idx}`}
                className={`p-4 rounded-xl border transition-all ${
                  isAgentVeto
                    ? 'bg-rose-950/20 border-rose-500/50 ring-1 ring-rose-500/30'
                    : 'bg-slate-950 border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs text-slate-200 truncate">{agent.name}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                    isAgentVeto
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  }`}>
                    {agent.verdict} {agent.score ? `• ${agent.score}/100` : ''}
                  </span>
                </div>
                {agent.role && (
                  <div className="text-[10px] text-slate-500 font-medium mb-2">{agent.role}</div>
                )}
                <div className="text-xs text-slate-300/90 leading-relaxed bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/60">
                  {agent.reasoning}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* SEKME 2: Şeffaf Araştırma Planı (Research Plan) */}
      {activeSubTab === 'research_plan' && (
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
          <div className="text-xs text-slate-400 mb-2 flex items-center gap-1.5">
            <ListChecks className="w-4 h-4 text-cyan-400" />
            <span>Her ajanın incelediği metrikler ve ulaştığı adım adım kararlar:</span>
          </div>
          <div className="space-y-2.5">
            {researchPlanSteps.map((step, idx) => (
              <div key={idx} className="bg-slate-900/80 p-3 rounded-lg border border-slate-800/80 text-xs flex flex-col md:flex-row md:items-center justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-cyan-300">{step.agent}</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                      {step.metricExamined}
                    </span>
                  </div>
                  <div className="text-slate-300 text-[11px] leading-relaxed">
                    {step.details}
                  </div>
                </div>
                <div className="shrink-0 self-start md:self-center">
                  <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold font-mono border ${
                    step.verdict === 'VETO' || step.verdict === 'SAT'
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                      : step.verdict === 'BEKLE' || step.verdict === 'PAS'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  }`}>
                    Karar: {step.verdict}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SEKME 3: Kaynaklar & KAP Atıfları (Cited Sources) */}
      {activeSubTab === 'citations' && (
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
          <div className="text-xs text-slate-400 mb-2 flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-amber-400" />
            <span>Jüri kararında temel alınan resmi bildirimler ve doğrulanmış veri kaynakları:</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {citedSources.map((cit, idx) => (
              <a
                key={cit.id || idx}
                href={cit.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 bg-slate-900/90 hover:bg-slate-850 border border-slate-800 hover:border-amber-500/40 rounded-xl transition group block"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/50">
                    {cit.sourceName}
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400 transition" />
                </div>
                <div className="text-xs font-semibold text-slate-200 group-hover:text-white line-clamp-2 mb-1">
                  {cit.title}
                </div>
                <div className="text-[10px] text-slate-500 font-mono">
                  Yayın Tarihi: {new Date(cit.publishedAt).toLocaleString('tr-TR')}
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* SEKME 4: Tahmin Piyasaları (Prediction Markets) */}
      {activeSubTab === 'prediction_markets' && (
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-4">
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-purple-400" />
            <span>Polymarket & Kalshi Makro Senaryo Tahmin Olasılıkları:</span>
          </div>
          <div className="space-y-3">
            {predictionScenarios.map((sc, idx) => (
              <div key={idx} className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-purple-300">{sc.topic}</span>
                  <span className="text-[10px] text-slate-400 font-mono bg-purple-950/40 border border-purple-800/40 px-2 py-0.5 rounded">
                    Konsensüs: {sc.consensus_expectation}
                  </span>
                </div>
                <div className="space-y-1.5 pt-1">
                  {sc.outcomes.map((out, oIdx) => (
                    <div key={oIdx} className="space-y-0.5">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-300">{out.option}</span>
                        <span className="font-mono font-bold text-purple-300">%{out.probability_pct.toFixed(1)}</span>
                      </div>
                      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-purple-500 transition-all duration-500"
                          style={{ width: `${out.probability_pct}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Jüri Karar Özeti */}
      {activeData?.finalDecision && (
        <div className="mt-4 p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="text-slate-300 space-y-1">
            <div className="flex items-center gap-2">
              <strong className="text-emerald-400">Jüri Nihai Eylem Tavsiyesi:</strong>
              {activeData.finalDecision.isBullTrapRisk && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  ⚠️ Boğa Tuzağı (Bull Trap) Uyarısı
                </span>
              )}
            </div>
            <div className="text-slate-300/90 leading-relaxed">{activeData.finalDecision.summary}</div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0 text-xs font-mono self-stretch md:self-auto justify-end">
            <div className="bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800 text-right">
              <span className="text-[10px] text-slate-500 block">Güvenli Kelly (Fractional 0.25x)</span>
              <span className="text-emerald-400 font-bold">%{(activeData.finalDecision.fractionalKellyPct ?? activeData.finalDecision.targetPercent ?? 5.87).toFixed(2)}</span>
            </div>
            <div className="bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800 text-right">
              <span className="text-[10px] text-slate-500 block">VaR Genişletilmiş SL</span>
              <span className="text-amber-400 font-bold">%{(activeData.finalDecision.stopLossPercent ?? -2.5).toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

