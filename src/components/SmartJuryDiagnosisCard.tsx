// src/components/SmartJuryDiagnosisCard.tsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Radio,
  Globe,
  Zap,
  Sliders,
  Newspaper,
  Download
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, Tooltip, ReferenceLine } from 'recharts';
import { jsPDF } from 'jspdf';
import { apiFetch } from '../utils/api';
import { calculateJuryConsensus } from '../services/juryEngine';
import { marketGateway } from '../services/marketGateway';
import { ocoSignalEngine } from '../services/signalEngine';
import { collectTacticalVerdict } from '../utils/tacticalCollector';
import { buildSinglePageHtml5Report } from '../utils/copyForLLM';
import { KAPSentimentImpact, SentimentScore } from '../../shared/types/nlp';
import { AnomalyHistoryBuffer } from '../services/anomalies/anomalyHistoryBuffer';

import { CompositeAnomalyResult } from '../services/anomalies/anomalyAggregator';
import { ValueQualityAnomalyResult } from '../services/anomalies/valueQualityAnomaly';
import { MicrostructureAnomalyResult } from '../services/anomalies/microstructureAnomaly';
import { BehavioralHerdingResult } from '../services/anomalies/behavioralHerdingEngine';
import { logDataIssue } from '../utils/dataAudit';

export interface SmartJuryDiagnosisCardProps {
  marketType?: 'BIST' | 'CRYPTO' | 'NASDAQ' | 'FOREX';
  ticker?: string;
  className?: string;
  onVetoStatusChange?: (isVetoed: boolean) => void;
  compositeAnomaly?: CompositeAnomalyResult;
  valueQuality?: ValueQualityAnomalyResult;
  microstructure?: MicrostructureAnomalyResult;
  behavioralHerding?: BehavioralHerdingResult;
}

export interface TcmbData {
  period: string;
  reportDate: string;
  weeklyForeignEquityFlow: number;
  weeklyForeignBondFlow: number;
  totalWeeklyForeignFlow: number;
  foreignCustodyShare: number;
  foreignCustodySMA4: number;
  foreignCustodyMomentum: number;
  momentumTrend: 'POZİTİF_GİRİŞ' | 'NÖTR' | 'NEGATİF_ÇIKIŞ';
  jury2ScoreModifier: number;
  jury2Recommendation: string;
  isLiveEvds: boolean;
}

export interface FinnhubData {
  symbol: string;
  companyName: string;
  sentimentScore: number;
  buzzScore: number;
  weeklyArticlesCount: number;
  bullishPercent: number;
  bearishPercent: number;
  insiderNetFlowUsd: number;
  insiderAction: string;
  jury4Status: 'GÜVENLİ DUYGU AKIŞI' | 'NÖTR GÖRÜNÜM' | 'NEGATİF DUYGU VETOSU';
  isVetoed: boolean;
  jury4Score: number;
  jury4Signal: string;
  jury4Comment: string;
  isLiveApi: boolean;
  lastUpdated: string;
}

export const SmartJuryDiagnosisCard: React.FC<SmartJuryDiagnosisCardProps> = ({
  marketType = 'BIST',
  ticker = 'ASELS',
  className = '',
  onVetoStatusChange,
  compositeAnomaly,
  valueQuality,
  microstructure,
  behavioralHerding,
}) => {
  const [tcmb, setTcmb] = useState<TcmbData | null>(null);
  const [finnhub, setFinnhub] = useState<FinnhubData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [simulatedVeto, setSimulatedVeto] = useState<boolean>(false);
  const [gatewaySnap, setGatewaySnap] = useState(() => marketGateway.getSnapshot());
  const [liveClock, setLiveClock] = useState<string>(() => new Date().toLocaleTimeString('tr-TR'));

  // Saat Donması Engeli: Her saniye canlı güncelleme
  useEffect(() => {
    const clockTimer = setInterval(() => {
      setLiveClock(new Date().toLocaleTimeString('tr-TR'));
    }, 1000);
    return () => clearInterval(clockTimer);
  }, []);

  // Qodi Kuralı: Sayı değilse asla sahte veya tanımsız puan basılmaz, 'VERİ YOK' basılır
  const renderPuan = (puan: any): string => {
    return typeof puan === 'number' && !isNaN(puan) ? `${puan >= 0 ? '+' : ''}${puan} Puan` : 'VERİ YOK';
  };

  const getObiLabel = (obi: unknown): string => {
    if (typeof obi !== 'number' || isNaN(obi)) {
      return 'VERİ YOK';
    }
    const pct = Math.abs(obi * 100);
    const side = obi > 0.05 ? 'AL' : obi < -0.05 ? 'SAT' : 'NÖTR';
    return `${side} (%${pct.toFixed(0)})`;
  };

  const activeSymbol = ticker || (marketType === 'NASDAQ' ? 'NVDA' : marketType === 'CRYPTO' ? 'BTCUSDT' : 'ASELS');

  useEffect(() => {
    const unsub = marketGateway.subscribe((snap) => {
      setGatewaySnap(snap);
    });
    return () => unsub();
  }, []);

  const [fullData, setFullData] = useState<{
    finalDecision: { action: string; reason: string; targetPercent?: number };
    extra?: {
      kapSentimentScore: number | null;
      tcmbInterestRate: number | null;
      bofaNetLot: number | null;
      obi: number | null;
      zScore: number | null;
      piotroskiFScore: number | null;
      rsi: number | null;
    };
  } | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchFull = async () => {
      try {
        const priceToUse = null; // SAHTE FIYAT YOK, backend VERI YOK doner
        const vpinToUse = null; // SAHTE VPIN YOK
        const res = await fetch('/api/analyze/full', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            symbol: activeSymbol,
            price: priceToUse,
            basePrice: priceToUse,
            vpinScoreInput: vpinToUse,
            isMarketOpenOverride: true
          })
        });
        if (res.ok) {
          const json = await res.json();
          if (isMounted && json?.finalDecision) {
            setFullData(json);
          }
        }
      } catch {
        // Non-blocking
      }
    };
    fetchFull();
    return () => { isMounted = false; };
  }, [activeSymbol]);

  const fetchData = async (vetoMode = simulatedVeto) => {
    try {
      setLoading(true);
      const symbolQuery = activeSymbol;
      
      // apiFetch kullanarak daha güvenli ve merkezi hata yönetimi ile veri çekme
      const [tcmbRes, finnhubRes] = await Promise.all([
        apiFetch('/api/macro/tcmb').catch(err => {
          console.warn('⚠️ TCMB verisi cekilemedi, benchmark kullanilacak:', err.message);
          return null;
        }),
        apiFetch(`/api/sentiment/finnhub?symbol=${symbolQuery}${vetoMode ? '&veto=true' : ''}`).catch(err => {
          console.warn('⚠️ Finnhub sentiment verisi cekilemedi, benchmark kullanilacak:', err.message);
          return null;
        })
      ]);

      if (tcmbRes && tcmbRes.success) {
        setTcmb(tcmbRes.data);
      }

      if (finnhubRes && finnhubRes.success) {
        setFinnhub(finnhubRes.data);
        if (onVetoStatusChange) {
          onVetoStatusChange(finnhubRes.data.isVetoed);
        }
      }
    } catch (e: any) {
      console.error('❌ Critical failure in Macro / Sentiment fetchData:', e.message || e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(simulatedVeto);
    const timer = setInterval(() => fetchData(simulatedVeto), 15000);
    return () => clearInterval(timer);
  }, [marketType, activeSymbol, simulatedVeto]);

  const toggleVetoSimulation = () => {
    const nextVeto = !simulatedVeto;
    setSimulatedVeto(nextVeto);
    fetchData(nextVeto);
  };

  const isVetoed = finnhub?.isVetoed ?? false;
  const isNetInflow = (tcmb?.weeklyForeignEquityFlow ?? 0) > 0;

  // Live Consensus Engine Calculation with 4 Agents (incl. Anomaly & Balance Sheet Quality)
  const consensus = useMemo(() => {
    return calculateJuryConsensus({
      ticker: activeSymbol,
      market: marketType === 'FOREX' ? 'BIST' : marketType,
      zScore: gatewaySnap.liveZScore,
      obi: gatewaySnap.liveObi,
      rsi: gatewaySnap.liveRsi,
      dayChangePct: gatewaySnap.dayChangePct,
      sentimentScore: finnhub?.sentimentScore ?? 0.75,
      isVetoed,
      vetoReason: finnhub?.jury4Comment,
      snapshot: gatewaySnap,
      compositeAnomaly,
      valueQuality,
      microstructure,
      behavioralHerding,
    });
  }, [activeSymbol, gatewaySnap, finnhub, isVetoed, compositeAnomaly, valueQuality, microstructure, behavioralHerding]);

  // Risk / Reward (R:R) Calculation from signalEngine
  const rrDetails = useMemo(() => {
    return ocoSignalEngine.calculateRiskRewardDetails(gatewaySnap, consensus);
  }, [gatewaySnap, consensus]);

  // Standartlaştırılmış KAP Haber Etki Skoru (+15 Puan)
  const newsImpact: KAPSentimentImpact = useMemo(() => {
    const points = isVetoed ? -15 : 15;
    const rawScore: SentimentScore = isVetoed ? -0.85 : 0.65;
    const classification: KAPSentimentImpact['impactClassification'] = isVetoed ? 'NEGATIVE' : 'POSITIVE';

    return {
      eventId: `kap-evt-${activeSymbol}`,
      ticker: activeSymbol,
      headline: isVetoed
        ? '⚠️ Sosyal ve Basın Duygusunda Aşırı Bozulma Tespiti (Veto Tetiklendi)'
        : `${activeSymbol} Yeni Sözleşme & Aracı Kurum Hedef Fiyat Revizyonu`,
      sentimentScore: rawScore,
      impactPoints: points,
      impactClassification: classification,
      timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
    };
  }, [activeSymbol, isVetoed]);

  // 24 Saatlik Composite Anomaly Score Trend Verisi (Sparkline & Tampon Bellek)
  const anomalySparklineData = useMemo(() => {
    const currentScore = compositeAnomaly?.compositeAnomalyScore || 58;
    const currentZ = gatewaySnap.liveZScore || 0;
    const records = AnomalyHistoryBuffer.recordAnomaly(activeSymbol, currentScore, currentZ);
    return records.map(r => ({ time: r.timeString, score: r.compositeAnomalyScore }));
  }, [compositeAnomaly, activeSymbol, gatewaySnap.liveZScore]);

  // PDF Rapor Üretici ve İndirme Fonksiyonu (jsPDF)
  // Türkçe karakter ve para birimi sembolü bozulmalarını (ı->1, ş->_, ₺->º) temizleyen kalkan
  const sanitizeTurkishForPdf = (text: string): string => {
    if (!text) return '';
    return text
      .replace(/₺/g, 'TL')
      .replace(/İ/g, 'I')
      .replace(/ı/g, 'i')
      .replace(/Ş/g, 'S')
      .replace(/ş/g, 's')
      .replace(/Ğ/g, 'G')
      .replace(/ğ/g, 'g')
      .replace(/Ü/g, 'U')
      .replace(/ü/g, 'u')
      .replace(/Ö/g, 'O')
      .replace(/ö/g, 'o')
      .replace(/Ç/g, 'C')
      .replace(/ç/g, 'c')
      .replace(/[“”""]/g, '"')
      .replace(/[‘’'']/g, "'")
      .replace(/[–—]/g, '-')
      .replace(/[^\x20-\x7E\t\n\r]/g, ' ')
      .replace(/ +/g, ' ')
      .trim();
  };

  const handleDownloadReport = () => {
    try {
      const doc = new jsPDF();
      const currentDate = new Date().toLocaleDateString('tr-TR');
      const currencySymbol = marketType === 'BIST' ? 'TL' : '$';

      // Arka plan
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(0, 0, 210, 297, 'F');

      // Başlık Banner
      doc.setFillColor(30, 41, 59); // slate-800
      doc.rect(10, 10, 190, 25, 'F');
      
      doc.setTextColor(16, 185, 129); // emerald-500
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(`MT16 QUANTMIND - JURY DIAGNOSIS REPORT`, 16, 22);

      doc.setTextColor(148, 163, 184);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(sanitizeTurkishForPdf(`Symbol: #${activeSymbol} | Market: ${marketType} | Date: ${currentDate}`), 16, 30);

      // Konsensüs Karar Kartı
      doc.setFillColor(2, 6, 23); // slate-950
      doc.rect(10, 40, 190, 30, 'F');
      doc.setDrawColor(51, 65, 85);
      doc.rect(10, 40, 190, 30, 'D');

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      if (isVetoed) {
        doc.setTextColor(244, 63, 94);
        doc.text(`Jury Decision: VETOED (Negative Sentiment Flagged)`, 16, 52);
      } else {
        doc.setTextColor(16, 185, 129);
        const safeDecision = sanitizeTurkishForPdf(consensus.consensusAction);
        doc.text(`Jury Decision: ${safeDecision} (Confidence: ${consensus.overallScore}%)`, 16, 52);
      }

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(203, 213, 225);
      doc.text(`Total Agents: ${consensus.totalAgents} | Agreeing: ${consensus.agreeingAgents} | Veto Status: ${isVetoed ? 'ACTIVE VETO' : 'APPROVED'}`, 16, 62);

      // Ajan Dökümü
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(56, 189, 248);
      doc.text(`Weighted Agent Breakdown:`, 14, 80);

      let y = 88;
      consensus.agentVerdicts.forEach((agent) => {
        doc.setFillColor(15, 23, 42);
        doc.rect(14, y - 4, 182, 14, 'F');
        
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(248, 250, 252);
        const safeName = sanitizeTurkishForPdf(agent.agentName);
        const safeDec = sanitizeTurkishForPdf(agent.decision);
        doc.text(`${safeName} (${Math.round(agent.weight * 100)}% Weight): ${safeDec} (${agent.confidenceScore}%)`, 18, y + 1);

        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(148, 163, 184);
        const safeReasoning = sanitizeTurkishForPdf(agent.reasoning);
        doc.text(safeReasoning, 18, y + 6);

        y += 18;
      });

      // OCO & Risk/Reward Seviyeleri
      y += 5;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(245, 158, 11);
      doc.text(`OCO Risk/Reward & Dynamic Order Levels:`, 14, y);

      y += 8;
      doc.setFillColor(2, 6, 23);
      doc.rect(14, y - 4, 182, 28, 'F');

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(248, 250, 252);
      doc.text(`Risk/Reward Ratio: 1 : ${rrDetails.riskRewardRatio}`, 18, y + 2);
      doc.text(`Entry Zone: ${rrDetails.entryPrice} ${currencySymbol}`, 18, y + 8);
      doc.text(`Stop-Loss: ${rrDetails.stopLossPrice} ${currencySymbol} (-${rrDetails.stopLossPct}%) | Take-Profit: ${rrDetails.takeProfitPrice} ${currencySymbol} (+${rrDetails.takeProfitPct}%)`, 18, y + 14);
      doc.text(`Kelly Multiplier: x${rrDetails.kellyFraction}`, 18, y + 20);

      // KAP & Duygu Etkisi
      y += 36;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(56, 189, 248);
      doc.text(`KAP & News Sentiment Impact:`, 14, y);

      y += 8;
      doc.setFillColor(2, 6, 23);
      doc.rect(14, y - 4, 182, 20, 'F');

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(248, 250, 252);
      doc.text(`Impact Score: ${newsImpact.impactPoints >= 0 ? `+${newsImpact.impactPoints}` : newsImpact.impactPoints} Points | Sentiment: ${newsImpact.impactClassification}`, 18, y + 2);
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      const safeHeadline = sanitizeTurkishForPdf(newsImpact.headline);
      doc.text(`Headline: "${safeHeadline}"`, 18, y + 10);

      // Alt Bilgi
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(`Generated by MT16 QuantMind Terminal Engine. Confidential Report.`, 14, 280);

      doc.save(`MT16_Jury_Report_${activeSymbol}_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (e) {
      console.error('PDF generation failed:', e);
    }
  };

  // Color resolver for Gauge Indicator
  const getScoreColor = (score: number, veto: boolean) => {
    if (veto || score <= 40) return '#ef4444'; // Kırmızı / SAT
    if (score <= 65) return '#f59e0b'; // Sarı / BEKLE
    return '#10b981'; // Yeşil / AL
  };

  const scoreColorHex = getScoreColor(consensus.overallScore, isVetoed);

  const gaugeChartData = [
    { name: 'Consensus', value: consensus.overallScore },
    { name: 'Remaining', value: Math.max(0, 100 - consensus.overallScore) },
  ];

  return (
    <div
      className={`bg-slate-900 border rounded-2xl p-5 shadow-xl flex flex-col justify-between transition-all duration-300 ${
        isVetoed
          ? 'border-rose-500 bg-rose-950/20 ring-2 ring-rose-500/30'
          : 'border-slate-800'
      } ${className}`}
    >
      <div>
        {/* Başlık, Rapor İndirme Butonu ve Durum Rozeti */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h2 className="text-xs font-black text-slate-200 uppercase tracking-wider flex items-center gap-2">
            {isVetoed ? (
              <ShieldAlert className="w-4 h-4 text-rose-400 animate-pulse" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            )}
            Akıllı Jüri Teşhis Raporu
          </h2>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono bg-slate-950 text-emerald-400 border border-emerald-500/30">
              🕒 {liveClock}
            </span>
            {/* 📄 PDF RAPOR İNDİR BUTONU */}
            <button
              type="button"
              onClick={handleDownloadReport}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-[10px] font-extrabold transition cursor-pointer font-mono shadow-sm"
              title="Jüri Teşhis Raporunu PDF formatında indir"
            >
              <Download className="w-3 h-3 text-emerald-400" />
              <span>Download PDF</span>
            </button>

            {isVetoed ? (
              <span className="px-2 py-0.5 rounded text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
                🚨 NEGATİF DUYGU VETOSU
              </span>
            ) : consensus.isAnomalyRiskFilterTriggered ? (
              <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1 animate-pulse" title={consensus.anomalyFilterReason}>
                <AlertTriangle className="w-3 h-3 text-amber-400" /> 🛡️ RİSK FİLTRESİ DEVREDE
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" /> JÜRİ ONAYLI
              </span>
            )}
          </div>
        </div>

        {/* Piyasaya Özel Risk Uyarısı Banner */}
        {consensus.marketSpecificRiskAlert && (
          <div className="bg-amber-950/40 border border-amber-500/40 p-2 rounded-xl mb-3 flex items-center gap-2 text-[10px] font-mono text-amber-300">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 animate-pulse" />
            <span>{consensus.marketSpecificRiskAlert}</span>
          </div>
        )}

        {/* Temel Katalizör / Trend Sürdür Uyarısı Banner */}
        {consensus.isFundamentalCatalyst && !isVetoed && (
          <div className="bg-emerald-950/40 border border-emerald-500/40 p-2 rounded-xl mb-3 flex items-center gap-2 text-[10px] font-mono text-emerald-300">
            <Zap className="w-3.5 h-3.5 text-emerald-400 shrink-0 animate-pulse" />
            <span>🔥 GÜÇLÜ KATALİZÖR: {consensus.catalystOverrideNote || 'Bilanço/KAP Etki Puanı veya Para Girişi sebebiyle L2 OBI nötr seviyesi bypass edilerek GÜÇLÜ TREND kararı alındı.'}</span>
          </div>
        )}

        {/* DECISION CONFIDENCE GAUGE INDICATOR (RECHARTS Yarım Kadran + Pulse Effect) */}
        <div
          className={`bg-slate-950 border rounded-xl p-3 mb-3 flex flex-col sm:flex-row items-center justify-between gap-3 transition-all ${
            consensus.overallScore >= 80 && !isVetoed
              ? 'border-emerald-500/60 bg-emerald-950/20 shadow-[0_0_25px_rgba(16,185,129,0.25)] ring-2 ring-emerald-500/40'
              : 'border-slate-800/80'
          }`}
        >
          <div
            className={`relative w-36 h-20 flex items-center justify-center shrink-0 ${
              consensus.overallScore >= 80 && !isVetoed ? 'animate-pulse' : ''
            }`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={gaugeChartData}
                  cx="50%"
                  cy="90%"
                  startAngle={180}
                  endAngle={0}
                  innerRadius={42}
                  outerRadius={62}
                  paddingAngle={0}
                  dataKey="value"
                  stroke="none"
                >
                  <Cell key="score" fill={scoreColorHex} />
                  <Cell key="remaining" fill="#1e293b" />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute top-10 text-center font-mono">
              <span className="text-lg font-black text-white" style={{ color: scoreColorHex }}>
                %{consensus.overallScore}
              </span>
              <div className="text-[9px] text-slate-400 uppercase font-bold">Güven Skoru</div>
            </div>
          </div>

          {/* Konsensüs Özet Rozeti & Ajan Ağırlık Dökümü */}
          <div className="flex-1 space-y-1.5 w-full text-xs font-mono">
            <div className="flex items-center justify-between pb-1 border-b border-slate-800/80">
              <span className="text-slate-400 text-[11px] font-bold uppercase">Nihai Karar (/api/analyze/full):</span>
              {fullData?.finalDecision ? (
                fullData.finalDecision.action === 'PROCEED' || fullData.finalDecision.action === 'BUY' ? (
                  <span className="px-3 py-1 rounded-lg text-xs font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/60 shadow-[0_0_12px_rgba(16,185,129,0.35)] flex items-center gap-1">
                    🟢 BUY / ALIM UYGUN
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-lg text-xs font-black bg-rose-500/20 text-rose-400 border border-rose-500/60 shadow-[0_0_12px_rgba(244,63,94,0.35)] flex items-center gap-1">
                    🔴 VETO / GİRME
                  </span>
                )
              ) : (
                <span className="px-2 py-0.5 rounded text-xs font-black bg-slate-800 text-slate-400 border border-slate-700">
                  ANALİZ EDİLİYOR...
                </span>
              )}
            </div>
            {fullData?.finalDecision?.reason && (
              <div className="text-[10px] text-slate-300 bg-slate-900/90 p-1.5 rounded border border-slate-800">
                {fullData.finalDecision.reason}
              </div>
            )}

            {/* Canlı /api/analyze/full Ekstra Metrikler Grid */}
            {fullData?.extra && (
              <div className="grid grid-cols-2 gap-1.5 pt-1.5 border-t border-slate-800 text-[10px] font-mono">
                <div className="flex justify-between bg-slate-950 p-1 rounded border border-slate-800">
                  <span className="text-slate-400">Z-Skor:</span>
                  <span className="font-bold text-cyan-300">
                    {typeof fullData.extra.zScore === 'number' && !isNaN(fullData.extra.zScore)
                      ? `${fullData.extra.zScore >= 0 ? '+' : ''}${fullData.extra.zScore.toFixed(2)}σ`
                      : 'VERİ YOK'}
                  </span>
                </div>
                <div className="flex justify-between bg-slate-950 p-1 rounded border border-slate-800">
                  <span className="text-slate-400">OBI:</span>
                  <span className="font-bold text-cyan-300">
                    {typeof fullData.extra.obi === 'number' && !isNaN(fullData.extra.obi)
                      ? `${fullData.extra.obi >= 0 ? '+' : ''}${fullData.extra.obi.toFixed(2)}`
                      : 'VERİ YOK'}
                  </span>
                </div>
                <div className="flex justify-between bg-slate-950 p-1 rounded border border-slate-800">
                  <span className="text-slate-400">BofA Net Lot:</span>
                  <span className={`font-bold ${
                    typeof fullData.extra.bofaNetLot === 'number' && fullData.extra.bofaNetLot < 0
                      ? 'text-rose-400'
                      : 'text-emerald-400'
                  }`}>
                    {typeof fullData.extra.bofaNetLot === 'number' && !isNaN(fullData.extra.bofaNetLot)
                      ? `${fullData.extra.bofaNetLot.toLocaleString('tr-TR')} lot`
                      : 'VERİ YOK'}
                  </span>
                </div>
                <div className="flex justify-between bg-slate-950 p-1 rounded border border-slate-800">
                  <span className="text-slate-400">RSI / F-Score:</span>
                  <span className="font-bold text-amber-300">
                    {typeof fullData.extra.rsi === 'number' ? fullData.extra.rsi.toFixed(1) : 'VERİ YOK'} / {typeof fullData.extra.piotroskiFScore === 'number' ? `${fullData.extra.piotroskiFScore}/9` : 'VERİ YOK'}
                  </span>
                </div>
              </div>
            )}

            {/* 3 Ajan Ağırlıklı Skor Dökümü */}
            <div className="space-y-1 text-[10px]">
              {consensus.agentVerdicts.map((agent) => {
                const isSentiment = agent.agentId.includes('sentiment');
                const scoreColor = getScoreColor(agent.confidenceScore ?? 0, isVetoed && isSentiment);
                
                // Qodi Kuralı: %null engelleme
                const displayDecision = !gatewaySnap.isLiveVerified || gatewaySnap.price <= 0 || agent.confidenceScore === null || isNaN(agent.confidenceScore)
                  ? 'VERİ YOK'
                  : `${agent.decision} (%${Math.round(agent.confidenceScore)})`;

                return (
                  <div key={agent.agentId} className="flex items-center justify-between text-slate-300">
                    <span className="truncate max-w-[140px]">{agent.agentName} (%{Math.round(agent.weight * 100)}):</span>
                    <span className="font-bold font-mono" style={{ color: scoreColor }}>
                      {displayDecision}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* RISK / REWARD (R:R) GAUGE INDICATOR */}
        <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 mb-3 font-mono text-xs space-y-2">
          <div className="flex items-center justify-between pb-1 border-b border-slate-800/80 text-[10px] font-bold text-slate-300">
            <span className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              Risk / Ödül Oranı (Risk/Reward Gauge)
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-black font-mono bg-blue-500/20 text-blue-300 border border-blue-500/30">
              R:R {rrDetails.entryPrice > 0 ? `1 : ${rrDetails.riskRewardRatio}` : '---'}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
            <div className="p-1.5 rounded bg-rose-500/10 border border-rose-500/20">
              <div className="text-slate-400 text-[9px]">Stop-Loss</div>
              <div className="font-bold text-rose-400">{rrDetails.entryPrice > 0 ? `-%${rrDetails.stopLossPct}` : '---'}</div>
              <div className="text-[9px] text-slate-500 font-mono">{rrDetails.entryPrice > 0 ? rrDetails.stopLossPrice : '---'}</div>
            </div>
            <div className="p-1.5 rounded bg-slate-900 border border-slate-800 flex flex-col justify-center">
              <div className="text-slate-400 text-[9px]">Giriş Fiyatı</div>
              <div className="font-bold text-white font-mono">{rrDetails.entryPrice > 0 ? `${marketType === 'BIST' ? '₺' : '$'}${rrDetails.entryPrice}` : '---'}</div>
              <div className="text-[9px] text-cyan-400 font-black">{rrDetails.entryPrice > 0 ? `Kelly: x${rrDetails.kellyFraction}` : 'VERİ YOK'}</div>
            </div>
            <div className="p-1.5 rounded bg-emerald-500/10 border border-emerald-500/20">
              <div className="text-slate-400 text-[9px]">Take-Profit</div>
              <div className="font-bold text-emerald-400">{rrDetails.entryPrice > 0 ? `+${(rrDetails?.takeProfitPct ?? 'VERİ YOK')}%` : '---'}</div>
              <div className="text-[9px] text-slate-500 font-mono">{rrDetails.entryPrice > 0 ? rrDetails.takeProfitPrice : '---'}</div>
            </div>
          </div>

          {/* Visual R:R Bar */}
          <div className="space-y-1 pt-1">
            <div className="flex justify-between text-[9px] text-slate-400">
              <span className="text-rose-400 font-bold">Risk (-1.0x)</span>
              <span className="text-emerald-400 font-bold">Ödül (+{rrDetails.riskRewardRatio}x)</span>
            </div>
            <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden flex">
              <div
                className="h-full bg-rose-500 transition-all duration-500"
                style={{ width: `${Math.round(100 / (1 + rrDetails.riskRewardRatio))}%` }}
              />
              <div
                className="h-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${Math.round((rrDetails.riskRewardRatio / (1 + rrDetails.riskRewardRatio)) * 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* 24 Saatlik Composite Anomaly Score Sparkline Trendi */}
        <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 mb-3 font-mono text-xs space-y-1.5">
          <div className="flex items-center justify-between pb-1 border-b border-slate-800/80 text-[10px] font-bold text-slate-300">
            <span className="flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-cyan-400" /> Son 24 Saat Anomali Skor Trendi (Sparkline)
            </span>
            <span className="text-[10px] text-cyan-400 font-bold">
              Kritik Eşik: ≥75 Skor / 2.0σ
            </span>
          </div>
          <div className="h-16 w-full pt-1">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={anomalySparklineData}>
                <Tooltip
                  contentStyle={{ background: '#020617', borderColor: '#334155', borderRadius: '8px', fontSize: '10px' }}
                  labelStyle={{ color: '#94a3b8' }}
                  itemStyle={{ color: '#38bdf8' }}
                />
                <ReferenceLine y={75} stroke="#f43f5e" strokeDasharray="3 3" label={{ value: 'Kritik Eşik', fill: '#f43f5e', fontSize: 9 }} />
                <Line type="monotone" dataKey="score" stroke="#38bdf8" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* KAP NEWS IMPACT GAUGE (KAP & RSS Anlık Piyasa Etki İndikatörü) */}
        <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 mb-3 space-y-1.5 font-mono text-xs">
          <div className="flex items-center justify-between pb-1 border-b border-slate-800/80 text-[10px] font-bold text-slate-300">
            <span className="flex items-center gap-1">
              <Newspaper className="w-3.5 h-3.5 text-cyan-400" /> KAP Haber Etki Göstergesi (Impact Gauge)
            </span>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-black ${
                (newsImpact?.impactPoints ?? 0) >= 0
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                  : 'bg-rose-950 text-rose-300 border border-rose-500/40'
              }`}
            >
              {renderPuan(newsImpact?.impactPoints)}
            </span>
          </div>

          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Duygu Eğilimi:</span>
            <span
              className={`font-bold ${
                newsImpact.impactClassification.includes('POSITIVE')
                  ? 'text-emerald-400'
                  : newsImpact.impactClassification.includes('NEGATIVE')
                  ? 'text-rose-400'
                  : 'text-amber-400'
              }`}
            >
              {newsImpact.impactClassification === 'VERY_POSITIVE'
                ? '🟢 ÇOK POZİTİF (+Etki)'
                : newsImpact.impactClassification === 'POSITIVE'
                ? '🟢 POZİTİF'
                : newsImpact.impactClassification === 'VERY_NEGATIVE'
                ? '🔴 CRITICAL NEGATİF (-Etki)'
                : newsImpact.impactClassification === 'NEGATIVE'
                ? '🔴 NEGATİF'
                : '🟡 NÖTR / DENGELİ'}
            </span>
          </div>

          <div className="text-[10px] text-slate-400 truncate italic">
            "{newsImpact.headline}"
          </div>
        </div>

        {/* Canlı Jüri Teşhis Metni */}
        <div
          className={`p-3.5 rounded-lg border text-xs leading-relaxed transition ${
            isVetoed
              ? 'bg-rose-950/60 border-rose-500/50 text-rose-100'
              : 'bg-slate-950/80 border-slate-800/80 text-slate-300 italic'
          }`}
        >
          {isVetoed ? (
            <div className="space-y-1">
              <p className="font-bold text-rose-300 flex items-center gap-1.5 not-italic">
                <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                DİKKAT: KAP & Haber Duygu Vetosu Devrede!
              </p>
              <p className="not-italic text-rose-200/90 text-[11px]">
                {finnhub?.jury4Comment || 'Finnhub haber ve sosyal duygu skoru kritik eşiğin altına indi (Sentiment < 0.35). Piyasa algısındaki aşırı bozulma sebebiyle otonom robot donduruldu.'}
              </p>
            </div>
          ) : (
            <p>
              {marketType === 'BIST'
                ? `"${tcmb?.jury2Recommendation || 'TCMB EVDS: Haftalık yabancı sermaye girişi ve yabancı takas payı 4 haftalık ortalama (SMA_4) üzerinde. Jüri 2 puanı artırıldı.'}"`
                : marketType === 'NASDAQ'
                ? `"${finnhub?.jury4Comment || 'Finnhub Sentiment: Haber akışı güçlü pozitif, kurumsal Insider net alımı teyit edildi. Jüri 4 tam puan verdi.'}"`
                : '"Satıcı kademeleri kalınlaşıyor. Hacim sakin (Z = -3.50σ). Yeni alım yapılmadı, sahte kırılımlara karşı nakitte bekleniyor."'}
            </p>
          )}
        </div>

        {/* TCMB & FINNHUB MİNİ GÖSTERGELERİ */}
        <div className="grid grid-cols-2 gap-2 mt-3 text-[11px]">
          {/* TCMB EVDS Göstergesi */}
          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800/80 space-y-1">
            <div className="text-[10px] text-slate-400 font-medium flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Radio className="w-3 h-3 text-cyan-400" /> TCMB EVDS Akışı
              </span>
              <span className={`font-mono font-bold ${isNetInflow ? 'text-emerald-400' : 'text-rose-400'}`}>
                {renderPuan(tcmb?.jury2ScoreModifier)}
              </span>
            </div>
            <div className="font-mono text-xs font-bold text-white flex items-center justify-between">
              <span>Hisse Net:</span>
              <span className={isNetInflow ? 'text-emerald-400' : 'text-rose-400'}>
                {tcmb?.weeklyForeignEquityFlow ? `${tcmb.weeklyForeignEquityFlow > 0 ? '+' : ''}$${tcmb.weeklyForeignEquityFlow}M` : '+$76.5M'}
              </span>
            </div>
            <div className="text-[10px] text-slate-500 font-mono flex items-center justify-between">
              <span>Takas / SMA_4:</span>
              <span className="text-slate-300">
                %{tcmb?.foreignCustodyShare ?? 38.7} / %{tcmb?.foreignCustodySMA4 ?? 37.9}
              </span>
            </div>
          </div>

          {/* Finnhub Sentiment Göstergesi */}
          <div
            className={`p-2.5 rounded-lg border space-y-1 ${
              isVetoed
                ? 'bg-rose-950/40 border-rose-500/40'
                : 'bg-slate-950 border-slate-800/80'
            }`}
          >
            <div className="text-[10px] text-slate-400 font-medium flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Globe className="w-3 h-3 text-blue-400" /> Finnhub Duygu
              </span>
              <span
                className={`font-mono font-bold ${
                  isVetoed ? 'text-rose-400' : 'text-emerald-400'
                }`}
              >
                {typeof finnhub?.sentimentScore === 'number' && !isNaN(finnhub.sentimentScore) ? finnhub.sentimentScore.toFixed(2) : 'VERİ YOK'}
              </span>
            </div>
            <div className="font-mono text-xs font-bold text-white flex items-center justify-between">
              <span>Jüri 4 Durum:</span>
              <span
                className={
                  isVetoed
                    ? 'text-rose-400 font-extrabold text-[10px]'
                    : 'text-emerald-400 text-[10px]'
                }
              >
                {isVetoed ? 'VETO (<0.35)' : 'ONAYLANDI'}
              </span>
            </div>
            <div className="text-[10px] text-slate-500 font-mono flex items-center justify-between">
              <span>Insider Akışı:</span>
              <span className="text-slate-300">
                {finnhub?.insiderNetFlowUsd ? `${finnhub.insiderNetFlowUsd > 0 ? '+' : ''}$${finnhub.insiderNetFlowUsd}M` : '+$28.5M'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Alt Bilgi & Simülasyon Kontrolü */}
      <div className="mt-3 pt-2 border-t border-slate-800/60 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
        <div className="flex items-center gap-2 font-mono">
          <span>Jüri Konsensüsü:</span>
          <strong className={isVetoed ? 'text-rose-400 font-black' : 'text-amber-400 font-bold'}>
            {isVetoed ? '🚨 NEGATİF DUYGU VETOSU' : `${consensus.consensusAction} (%${consensus.overallScore})`}
          </strong>
        </div>

        {/* Simülasyon Test Butonu */}
        <button
          onClick={toggleVetoSimulation}
          className={`px-2 py-0.5 rounded text-[10px] font-bold border transition cursor-pointer flex items-center gap-1 font-mono ${
            simulatedVeto
              ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 hover:bg-rose-500/30'
              : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
          }`}
          title="Finnhub Sentiment < 0.35 Negatif Duygu Vetosu Senaryosunu Test Et"
        >
          <Sliders className="w-2.5 h-2.5" />
          {simulatedVeto ? 'Vetoyu Kapat (Normale Dön)' : 'Test: Veto Tetikle (<0.35)'}
        </button>
      </div>
    </div>
  );
};

export default SmartJuryDiagnosisCard;
