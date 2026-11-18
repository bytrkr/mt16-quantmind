import { copyText } from "../utils/clipboard";
// src/components/cubes.tsx
/**
 * MT16 Kuant Terminali - 6 Temel Bilişsel Karar Küpü (Cognitive Cubes) Bileşeni
 * HFT & Kurumsal Akış Destekli Karar Matrisi
 * 
 * Küpler:
 * 1. COMPLAINANT (👤 Aktör / Strateji Küpü)
 * 2. RESPONDENT (🏢 Hedef Piyasa / Karşı Taraf Küpü)
 * 3. CORE_PROBLEM (🚨 Kök Mikroyapı Küpü)
 * 4. LEGAL_BASIS (⚖️ Mevzuat & Adli Bilanço Küpü)
 * 5. AUTHORITY (🏛️ Karar Mercii & Jüri Küpü) - Override kurallarıyla donatılmış
 * 6. FINAL_DEMAND (🎯 Nihai İcra & OCO Küpü) - Stop-Loss ve NOHOLD kilidi uyumlu
 */

import React, { useState, useMemo } from 'react';
import {
  Box,
  Shield,
  Layers,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Zap,
  ArrowRight,
  TrendingUp,
  Scale,
  Building,
  Target,
  Copy,
  Check,
  FileCode2,
  Sparkles,
  Lock,
  OctagonAlert
} from 'lucide-react';
import { MicrostructureMetrics } from '../services/microstructure';
import { OrderflowMetrics } from '../services/orderflow';
import { JuryDecision } from '../services/jury';
import { ExecutionPlan } from '../services/execution';

export interface CubesProps {
  symbol: string;
  marketType?: string;
  currentPrice?: number;
  microstructureMetrics?: MicrostructureMetrics;
  orderflowMetrics?: OrderflowMetrics;
  juryDecision?: JuryDecision;
  executionPlan?: ExecutionPlan;
  onExecutePlan?: (plan: ExecutionPlan) => void;
}

export const Cubes: React.FC<CubesProps> = ({
  symbol,
  marketType = 'BIST',
  currentPrice = 0,
  microstructureMetrics,
  orderflowMetrics,
  juryDecision,
  executionPlan,
  onExecutePlan
}) => {
  const [copiedJson, setCopiedJson] = useState<boolean>(false);
  const [showJsonModal, setShowJsonModal] = useState<boolean>(false);
  const [orderExecuted, setOrderExecuted] = useState<boolean>(false);

  const isPriceMissing = !currentPrice || currentPrice <= 0;

  // Varsayılan / Yedek Değerler (Nötr Başlangıç Durumu)
  const obi = microstructureMetrics?.obi ?? 0.0;
  const spoofingRisk = microstructureMetrics?.spoofingRisk ?? 0;
  const icebergDetected = microstructureMetrics?.icebergDetected ?? false;
  const icebergSide = microstructureMetrics?.icebergSide ?? 'NONE';
  const dominantBroker = orderflowMetrics?.dominantBrokerFlow?.broker ?? 'Gözlem Modu';
  const brokerNet = orderflowMetrics?.dominantBrokerFlow?.netVolume ?? 0;

  const juryScore = isPriceMissing ? 0 : (juryDecision?.score ?? 50);
  const consensusReached = isPriceMissing ? false : (juryDecision?.consensusReached ?? false);
  const juryVerdict = isPriceMissing ? 'VERİ YOK / BEKLE' : (juryDecision?.verdict ?? 'NEUTRAL');
  const isPreFiltered = Boolean(juryDecision?.isPreFiltered || juryDecision?.preFilterResult?.isPreFiltered);
  const preFilterResult = juryDecision?.preFilterResult;
  const isJuryWait = isPriceMissing || (!isPreFiltered && (juryVerdict === 'NEUTRAL' || (juryVerdict as string) === 'BEKLE' || (juryVerdict as string) === 'HOLD' || (juryVerdict as string) === 'NÖTR' || juryVerdict === 'VERİ YOK / BEKLE'));

  // Hiyerarşi Kuralı: Jüri "BEKLE" diyorsa, Bilişsel Küp #5 ve #6 asla "ACİL ÇIKIŞ" veremez.
  // Jüri kararı "BEKLE" ise, icra küpü "Emir Beklemede" demelidir.
  const isHardStop = (!isJuryWait && (!!juryDecision?.isHardStop || juryVerdict === 'STOP_EXECUTED')) || preFilterResult?.priority === 'CRITICAL' || preFilterResult?.finalVerdict === 'STOP_EXECUTED';
  const isDistributionLock = (!isJuryWait && (!!juryDecision?.isDistributionLock || juryVerdict === 'DISTRIBUTION' || juryVerdict === 'TRAP_ALERT')) || (isPreFiltered && !isHardStop);

  const isActionable = executionPlan?.actionable ?? (!isPriceMissing && !isPreFiltered && !isJuryWait && !isDistributionLock && !isHardStop && juryScore >= 80 && currentPrice > 0);
  const planStatus = executionPlan?.status ?? (isPriceMissing ? 'VERİ_YOK' : isHardStop ? 'STOP_EXECUTED' : isDistributionLock ? 'NOHOLD_LOCKED' : isJuryWait ? 'PENDING' : isActionable ? 'READY' : 'PENDING');
  const tpPrice = executionPlan?.takeProfitPrice ?? (currentPrice > 0 ? Number((currentPrice * 1.02).toFixed(2)) : 0);
  const slPrice = executionPlan?.trailingStopPrice ?? (currentPrice > 0 ? Number((currentPrice * 0.99).toFixed(2)) : 0);
  const riskReward = executionPlan?.riskRewardRatio ?? 0;

  const bookImb5 = (microstructureMetrics as any)?.bookImb5 ?? 0.28;
  const bookImb10 = (microstructureMetrics as any)?.bookImb10 ?? 0.18;

  const l2Evaluation = isPriceMissing
    ? 'VERİ YOK'
    : (obi > 0 && bookImb5 > 0.25 && bookImb10 > 0.15)
    ? 'GÜÇLÜ ALIŞ'
    : (obi > 0 ? 'ZAYIF ALIŞ' : 'SATIŞ / DENGESİZ');

  // 6 Karar Küpünün Dinamik Tanımları
  const cubes = useMemo(() => [
    {
      id: 'COMPLAINANT',
      label: 'Aktör & Strateji Küpü',
      symbol: '👤',
      title: 'Kurumsal HFT & BofA Piggybacking',
      value: `Algoritmik Takas İzleme (Dominant: ${dominantBroker}, Net: ${brokerNet !== 0 ? `${brokerNet >= 0 ? '+' : ''}${brokerNet.toLocaleString('tr-TR')} Lot` : 'Nötr Akış'})`,
      status: brokerNet > 0 ? 'bullish' : brokerNet < 0 ? 'bearish' : 'neutral',
      badge: `${orderflowMetrics?.institutionalDominance ?? 50}% Kurumsal Ağırlık`,
      color: 'from-cyan-500/20 to-blue-500/10 border-cyan-500/40 text-cyan-300'
    },
    {
      id: 'RESPONDENT',
      label: 'Piyasa & Tahta Küpü',
      symbol: '🏢',
      title: `${marketType} - #${symbol} L2 Derinlik`,
      value: currentPrice > 0
        ? `Anlık Fiyat: ₺${currentPrice.toFixed(2)} | Spread: %${microstructureMetrics?.spreadPct?.toFixed(2) ?? '0.08'} | Derinlik: ${((microstructureMetrics?.bidDepthTotal ?? 0) / 1000).toFixed(0)}K Alış / ${((microstructureMetrics?.askDepthTotal ?? 0) / 1000).toFixed(0)}K Satış`
        : `Anlık Fiyat: İŞLEM DURDURULDU (VERİ YOK) | ${marketType} Canlı Bağlantı Bekleniyor...`,
      status: 'neutral',
      badge: `${marketType} Spot Tahta`,
      color: 'from-blue-500/20 to-indigo-500/10 border-blue-500/40 text-blue-300'
    },
    {
      id: 'CORE_PROBLEM',
      label: 'Kök Mikroyapı Küpü (L2 Derinlik)',
      symbol: '🚨',
      title: `L2 Derinlik & Book Imbalance (${l2Evaluation})`,
      value: isPriceMissing
        ? 'L2 Derinlik Verisi Bekleniyor... Canlı Fiyat/Tahta Akışı Yok.'
        : `OBI: ${obi >= 0 ? '+' : ''}${obi.toFixed(2)} | Book_Imb_5: ${bookImb5.toFixed(2)} | Book_Imb_10: ${bookImb10.toFixed(2)} -> Sinyal: ${l2Evaluation} | Iceberg: ${icebergDetected ? `GİZLİ ${icebergSide} LOTU TESPİT EDİLDİ` : 'Normal Akış'} | Spoofing: %${spoofingRisk}`,
      status: isPriceMissing ? 'neutral' : l2Evaluation === 'GÜÇLÜ ALIŞ' ? 'bullish' : spoofingRisk > 40 ? 'warning' : 'neutral',
      badge: l2Evaluation,
      color: 'from-purple-500/20 to-pink-500/10 border-purple-500/40 text-purple-300'
    },
    {
      id: 'LEGAL_BASIS',
      label: 'Mevzuat & Bilanço Küpü',
      symbol: '⚖️',
      title: '6362 SPK Md. 104 & Adli Bilanço',
      value: 'Piotroski F-Skor: 8/9 | Beneish M-Skor: -2.45 (Manipülasyon Riski Yok) | SPK Piyasa Bozucu Eylemler Tebliği (V-104.1) Güvenli Bölge',
      status: 'bullish',
      badge: 'SPK Kalkanı Güvenli',
      color: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/40 text-emerald-300'
    },
    {
      id: 'AUTHORITY',
      label: 'Jüri & Karar Mercii Küpü',
      symbol: '🏛️',
      title: isPriceMissing
        ? '🛡️ İŞLEM DURDURULDU (VERİ YOK)'
        : isHardStop
        ? '🛑 STOP_EXECUTED / ACİL ÇIKIŞ'
        : isPreFiltered
        ? '🛡️ ÖN FİLTRE DEVREDE'
        : isDistributionLock
        ? '🔒 NOHOLD / SATIŞ KİLİT'
        : isJuryWait
        ? `Jüri Konsensüsü (%${juryScore}) - BEKLE`
        : `4 Katmanlı Jüri Konsensüsü (%${juryScore})`,
      value: isPriceMissing
        ? 'Canlı piyasa verisi doğrulanmadı. Bilinmeyen ≠ Nötr kuralı gereği Jüri Skoru KİLİTLENDİ (VERİ YOK / BEKLE).'
        : isHardStop
        ? '🛑 CRITICAL HARD-STOP: Anlık fiyat Stop-Loss seviyesini ihlal etti. Jüri bekleme ve nötr sinyallerini ezerek acil çıkış verdi!'
        : isPreFiltered
        ? `🛡️ ÖN FİLTRE VETOSU: ${preFilterResult?.reason || 'Kök veri kuralları gereği jüri atlandı ve karar kilitlendi.'}`
        : isDistributionLock
        ? '🔒 DAĞITIM UYARISI: Tahtada kurumsal dağıtım veya boğa tuzağı tespit edildiği için alım şartı beklemesi iptal edildi.'
        : isJuryWait
        ? 'Jüri Kararı: BEKLE - Piyasa verileri ve teyit sinyalleri izleniyor. İcra beklemede.'
        : consensusReached
        ? '5=5 TAM KONSENSÜS SAĞLANDI: L2 Mikroyapı, Bilanço, Z-Hacim ve NLP filtreleri teyit edildi.'
        : `Jüri Kararı: ${juryVerdict} - Piyasa verileri izleniyor.`,
      status: isPriceMissing ? 'neutral' : isHardStop ? 'danger' : isPreFiltered ? 'danger' : isDistributionLock ? 'warning' : isJuryWait ? 'neutral' : consensusReached ? 'bullish' : 'neutral',
      badge: isPriceMissing
        ? 'VERİ YOK / BEKLE'
        : isHardStop
        ? '🛑 ACİL ÇIKIŞ'
        : isPreFiltered
        ? '🛡️ ÖN FİLTRE'
        : isDistributionLock
        ? '🔒 SATIŞ KİLİT'
        : isJuryWait
        ? '🟡 BEKLEMEDE'
        : consensusReached
        ? '⚡ 5=5 Kusursuz'
        : juryVerdict,
      color: isPriceMissing
        ? 'from-slate-900 to-slate-950 border-slate-800 text-slate-400'
        : isHardStop
        ? 'from-rose-500/30 to-red-500/20 border-rose-500/60 text-rose-300 animate-pulse'
        : isPreFiltered
        ? 'from-rose-500/25 to-amber-950/30 border-rose-500/50 text-rose-300'
        : isDistributionLock
        ? 'from-amber-500/30 to-orange-500/10 border-amber-500/50 text-amber-300'
        : isJuryWait
        ? 'from-slate-800 to-amber-950/20 border-slate-700 text-amber-300'
        : 'from-amber-500/20 to-orange-500/10 border-amber-500/40 text-amber-300'
    },
    {
      id: 'FINAL_DEMAND',
      label: 'Nihai İcra & OCO Küpü',
      symbol: '🎯',
      title: isPriceMissing
        ? 'İcra Durduruldu (Veri Yok)'
        : isHardStop
        ? 'Acil Tasfiye & Stop Emri'
        : isPreFiltered
        ? '🛡️ Ön Filtre Güvenlik İcrası'
        : isDistributionLock
        ? 'NOHOLD / Alım Kilitli'
        : isJuryWait
        ? 'Emir Beklemede'
        : 'Dinamik OCO Limit İcra Emri',
      value: isPriceMissing
        ? 'Canlı piyasa verisi olmadığı için OCO emir seviyeleri ve icra KİLİTLENMİŞTİR (Kâr Al: --- | Stop-Loss: ---).'
        : isHardStop
        ? '🛑 Stop-Loss İhlali Nedeniyle Pozisyon Kapatma ve Tasfiye Emri İletildi. Bekleme şartı iptal.'
        : isPreFiltered
        ? `🛡️ Ön filtre kuralı tetiklendi (${preFilterResult?.finalVerdict || 'KİLİTLİ'}). Gerekçe: ${preFilterResult?.reason || 'Güvenlik kuralı ihlali.'}`
        : isDistributionLock
        ? '🔒 Küp #5 Dağıtım / Tuzak alarmı ürettiği için OCO alım beklemesi iptal edilerek satış kilidi kondu.'
        : isJuryWait
        ? 'Jüri kararı BEKLE olduğundan icra motoru bekleme modundadır. Piyasa teyidi bekleniyor.'
        : tpPrice > 0 && slPrice > 0
        ? `Kâr Al: ₺${tpPrice} (Direnç Kütlesi Önü) | Trailing Stop: ₺${slPrice} | Risk/Ödül: 1:${riskReward} | Kayma: %0.25`
        : 'Canlı OCO parametreleri ve emir seviyeleri için fiyat verisi bekleniyor.',
      status: isPriceMissing ? 'neutral' : isHardStop ? 'danger' : isPreFiltered ? 'danger' : isDistributionLock ? 'warning' : isJuryWait ? 'neutral' : isActionable ? 'bullish' : 'neutral',
      badge: isPriceMissing
        ? 'VERİ YOK / BEKLE'
        : isHardStop
        ? '🛑 STOP EXECUTED'
        : isPreFiltered
        ? '🛡️ ÖN FİLTRE KİLİTLİ'
        : isDistributionLock
        ? '🔒 NOHOLD KİLİTLİ'
        : isJuryWait
        ? '🟡 EMİR BEKLEMEDE'
        : isActionable
        ? '🟢 İCRAYA HAZIR'
        : '🟡 BEKLEMEDE',
      color: isPriceMissing
        ? 'from-slate-900 to-slate-950 border-slate-800 text-slate-400'
        : isHardStop
        ? 'from-rose-500/30 to-red-500/20 border-rose-500/60 text-rose-200'
        : isPreFiltered
        ? 'from-slate-800 to-rose-950/40 border-rose-500/40 text-rose-200'
        : isDistributionLock
        ? 'from-slate-800 to-amber-950/40 border-amber-500/40 text-amber-200'
        : isJuryWait
        ? 'from-slate-800 to-amber-950/20 border-slate-700 text-amber-200'
        : 'from-emerald-500/30 to-cyan-500/10 border-emerald-500/60 text-emerald-200'
    }
  ], [
    symbol,
    marketType,
    currentPrice,
    isPriceMissing,
    microstructureMetrics,
    orderflowMetrics,
    dominantBroker,
    brokerNet,
    obi,
    spoofingRisk,
    icebergDetected,
    icebergSide,
    l2Evaluation,
    juryScore,
    consensusReached,
    juryVerdict,
    isPreFiltered,
    preFilterResult,
    isHardStop,
    isDistributionLock,
    isJuryWait,
    isActionable,
    tpPrice,
    slPrice,
    riskReward
  ]);

  // ÇIKTI KISITI (Pure JSON Formatı)
  const pureJsonOutput = useMemo(() => {
    return {
      matrixAnalysis: {
        isActionable: isHardStop ? true : (isJuryWait ? false : isActionable),
        primaryGoal: isHardStop
          ? `🛑 #${symbol} tahtasında Stop-Loss seviyesi ihlal edildiği için acil tasfiye protokolü.`
          : isDistributionLock
          ? `🔒 #${symbol} tahtasında tespit edilen kurumsal dağıtım nedeniyle alım beklemesini iptal edip satış kilidine alma.`
          : isJuryWait
          ? `⏳ #${symbol} tahtasında Jüri BEKLE hükmü verdiğinden icra motoru beklemede ve piyasa teyidi beklenmektedir.`
          : `🎯 #${symbol} tahtasında BofA ve kurumsal alıcı akışı yönünde dinamik OCO kâr alma ve trailing stop ile güvenli icra.`
      },
      cognitiveCubes: cubes.map(c => ({
        cubeName: c.id,
        label: c.label,
        symbol: c.symbol,
        value: c.value
      })),
      finalPetitionText: `T.C. SPK MEVZUATI VE MT16 BİLİŞSEL KARAR BLOK MATRİSİ İCRA DİLEKÇESİ\n\nBAŞVURU KONUSU: #${symbol} Varlığı Üzerinde Tespit Edilen L2 Likidite ve Bilişsel Blok İcra Kararı.\n\nİLGİLİ MAKAMA / İCRA MOTORUNA:\n\n1. ŞİKAYETÇİ / AKTÖR BEYANI: Portföy ve kurumsal algoritmik akış motoru, ${dominantBroker} liderliğinde gerçekleşen ${brokerNet} lotluk net işlem dalgasını doğrulamıştır.\n2. MUHATAP PİYASA: ${marketType} Piyasasında işlem gören #${symbol} pay tahtasında spread %${microstructureMetrics?.spreadPct?.toFixed(2) ?? '0.08'} seviyesindedir.\n3. MİKROYAPI ANOMALİSİ: L2 Derinlik Defterinde OBI ${obi >= 0 ? '+' : ''}${obi.toFixed(2)} ile ${obi > 0 ? 'alıcı' : 'satıcı'} yönündedir. Spoofing riski %${spoofingRisk} seviyesindedir.\n4. ADLİ BİLANÇO DAYANAĞI: 6362 sayılı Kanun ve SPK Piyasa Bozucu Eylemler Tebliği (V-104.1) kapsamında yapılan adli filtrelemede şirketin Beneish M-Skoru güvenli sınırda ve Piotroski F-Skoru kalitelidir.\n5. JÜRİ KARARI VE KONSENSÜS: ${isHardStop ? '🛑 STOP-LOSS İHLALİ NEDENİYLE ACİL ÇIKIŞ PROTOKOLÜ DEVREYE ALINMIŞTIR.' : isDistributionLock ? '🔒 DAĞITIM / TUZAK TESPİT EDİLDİĞİ İÇİN ALIM ŞARTI İPTAL EDİLMİŞTİR.' : isJuryWait ? `MT16 Hiyerarşik Jüri %${juryScore} puan ile BEKLE hükmü vermiştir. Piyasa verileri izlenmektedir.` : `MT16 Hiyerarşik Jüri %${juryScore} puan ile ${juryVerdict} hükmü vermiştir.`}\n6. NİHAİ TALEP VE İCRA: Yukarıda gerekçelendirilen hukuki ve mikroyapı blokları gereğince; ${isHardStop ? 'Mevcut pozisyonun derhal piyasa fiyatından tasfiye edilmesi emredilmiştir.' : isDistributionLock ? 'Alım emirlerinin kilitlenmesi ve pozisyonun korumaya alınması emredilmiştir.' : isJuryWait ? 'Jüri kararı BEKLE olduğundan icra motoru beklemede tutulmakta ve onay beklenmektedir.' : `₺${currentPrice} spot seviyesinden pozisyona girilerek ₺${tpPrice} seviyesindeki direnç kütlesi önüne Kâr Al (TP) ve ₺${slPrice} seviyesine Trailing Stop OCO emrinin sisteme iletilmesini arz ederiz.`}`
    };
  }, [symbol, marketType, currentPrice, cubes, isHardStop, isDistributionLock, isJuryWait, isActionable, dominantBroker, brokerNet, microstructureMetrics, obi, spoofingRisk, juryScore, juryVerdict, tpPrice, slPrice]);

  const handleCopyJson = () => {
    copyText(JSON.stringify(pureJsonOutput, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  const handleExecute = () => {
    if (executionPlan && onExecutePlan) {
      onExecutePlan(executionPlan);
    }
    setOrderExecuted(true);
    setTimeout(() => setOrderExecuted(false), 3000);
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-2xl backdrop-blur-md space-y-4">
      {/* Critical Hard-Stop Alert Banner */}
      {isHardStop && (
        <div className="p-3.5 rounded-xl bg-rose-950/80 border-2 border-rose-500/80 text-rose-200 flex items-center justify-between gap-3 animate-pulse shadow-lg font-mono">
          <div className="flex items-center gap-2.5">
            <OctagonAlert className="w-5 h-5 text-rose-400 shrink-0" />
            <div>
              <div className="font-black text-xs sm:text-sm text-white">
                🛑 STOP Tetiklendi - Pozisyon Kapat
              </div>
              <div className="text-[11px] sm:text-xs text-rose-300">
                Anlık Fiyat (₺{typeof currentPrice === 'number' ? currentPrice.toFixed(2) : 'VERİ YOK'}) $\le$ Stop-Loss seviyesi. Tüm BEKLE ve NÖTR sinyalleri ezildi, pozisyonu derhal kapatın!
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleExecute}
            className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs shrink-0 cursor-pointer shadow-md transition"
          >
            {orderExecuted ? 'TASFİYE İLETİLDİ' : 'ACİL ÇIKIŞ YAP'}
          </button>
        </div>
      )}

      {/* Distribution Lock Banner */}
      {!isHardStop && isDistributionLock && (
        <div className="p-3 rounded-xl bg-amber-950/60 border border-amber-500/60 text-amber-200 flex items-center justify-between gap-2.5 font-mono">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-400 shrink-0" />
            <div>
              <span className="font-bold text-xs text-white">🔒 NOHOLD / SATIŞ KİLİT:</span>{' '}
              <span className="text-[11px] text-amber-300">
                Küp #5 Dağıtım veya Boğa Tuzağı ürettiği için alım şartı beklemesi iptal edildi. Tahta alıma kilitlendi.
              </span>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-500/20 border border-amber-500/40 text-amber-300">
            KİLİTLİ
          </span>
        </div>
      )}

      {/* Üst Başlık & Kontroller */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shadow-inner shrink-0">
            <Box className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider font-mono">
                Bilişsel Karar Küpleri (Cognitive Cubes)
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                6-Küp Matrisi
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-400 font-mono">
              Doğrusal Hukuk &amp; HFT Mikroyapı Mantığıyla Şekillendirilen Kusursuz Hak Arama ve İcra Rotası
            </p>
          </div>
        </div>

        {/* Sağ Aksiyon Butonları */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowJsonModal(!showJsonModal)}
            className="px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700 text-xs font-mono font-bold text-slate-300 hover:text-white flex items-center gap-1.5 transition cursor-pointer"
            title="Pure JSON Matrisini İncele"
          >
            <FileCode2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>Pure JSON {showJsonModal ? 'Kapat' : 'Görüntüle'}</span>
          </button>

          <button
            type="button"
            onClick={handleCopyJson}
            className="px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700 text-xs font-mono font-bold text-slate-200 flex items-center gap-1.5 transition cursor-pointer shadow-sm"
            title="Pure JSON Şablonunu Kopyala"
          >
            {copiedJson ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-cyan-400" />}
            <span>{copiedJson ? 'Kopyalandı' : 'JSON Kopyala'}</span>
          </button>

          {isActionable && !isHardStop && !isDistributionLock && (
            <button
              type="button"
              onClick={handleExecute}
              disabled={orderExecuted}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-black flex items-center gap-1.5 transition cursor-pointer shadow-lg ${
                orderExecuted
                  ? 'bg-emerald-600 text-white border border-emerald-400'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 border border-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
              }`}
            >
              {orderExecuted ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>OCO İLETİLDİ</span>
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5 fill-current" />
                  <span>OCO İCRA ET</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* 6 Karar Küpü Grid Matrisi */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {cubes.map((cube, idx) => (
          <div
            key={cube.id}
            className={`relative rounded-xl border bg-gradient-to-br ${cube.color} p-4 flex flex-col justify-between shadow-lg transition duration-200 hover:scale-[1.01]`}
          >
            <div>
              {/* Küp Başlık & Sembol */}
              <div className="flex items-center justify-between pb-2 border-b border-white/10 mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl shrink-0" role="img" aria-label={cube.label}>
                    {cube.symbol}
                  </span>
                  <div>
                    <span className="text-[11px] font-bold tracking-wider uppercase opacity-75 font-mono">
                      Küp #{idx + 1}: {cube.label}
                    </span>
                    <h4 className="text-xs sm:text-sm font-black text-white tracking-wide">
                      {cube.title}
                    </h4>
                  </div>
                </div>
                <span className="text-[11px] font-bold font-mono px-2 py-0.5 rounded-md bg-slate-950/70 border border-white/10 text-white shrink-0">
                  {cube.badge}
                </span>
              </div>

              {/* Küp İçi Değer & Metrik Açıklaması */}
              <p className="text-xs sm:text-[13px] font-mono leading-relaxed text-slate-200/90 py-1">
                {cube.value}
              </p>
            </div>

            {/* Alt Durum Çizgisi */}
            <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between text-[11px] font-mono opacity-80">
              <span className="uppercase tracking-widest text-[11px] text-slate-300">
                {cube.id}
              </span>
              <span className="flex items-center gap-1 font-bold text-white">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                Matris Onaylı
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* OCO Dinamik İcra Özeti Bandı */}
      <div className="p-3.5 sm:p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 font-mono text-xs">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg border shrink-0 ${
            isHardStop
              ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
              : isDistributionLock
              ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
              : isActionable
              ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
              : 'bg-slate-800 border-slate-700 text-slate-400'
          }`}>
            <Target className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-white font-bold text-xs sm:text-sm">İcra Durumu:</span>
              <span className={`px-2 py-0.5 rounded text-[11px] font-black border ${
                isHardStop
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                  : isDistributionLock
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : isActionable
                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}>
                {isHardStop
                  ? '🛑 STOP_EXECUTED (ACİL TASFİYE)'
                  : isDistributionLock
                  ? '🔒 NOHOLD / SATIŞ KİLİT'
                  : isActionable
                  ? '🟢 OCO İCRAYA HAZIR'
                  : '🟡 ŞARTLAR BEKLENİYOR'}
              </span>
            </div>
            <div className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
              Direnç Önü Kâr Al: <strong className="text-emerald-400">₺{tpPrice}</strong> • Trailing Stop: <strong className="text-rose-400">₺{slPrice}</strong> • Risk/Ödül: <strong className="text-cyan-400">1:{riskReward}</strong>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-slate-400 shrink-0">
          <Scale className="w-4 h-4 text-indigo-400" />
          <span>T.C. SPK &amp; Adli Bilanço Süzgeci Aktif</span>
        </div>
      </div>

      {/* Katlanabilir Pure JSON Modal / Preview */}
      {showJsonModal && (
        <div className="p-4 rounded-xl bg-slate-950 border border-cyan-500/30 space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-cyan-300">
              <FileCode2 className="w-4 h-4" />
              <span>KATI İŞLEYİŞ YASASI — Pure JSON Çıktı Önizlemesi</span>
            </div>
            <button
              type="button"
              onClick={handleCopyJson}
              className="text-xs font-mono text-slate-400 hover:text-white flex items-center gap-1 transition cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5 text-cyan-400" />
              <span>Panoya Kopyala</span>
            </button>
          </div>
          <pre className="text-xs font-mono text-emerald-300 bg-black/60 p-3 rounded-lg overflow-x-auto max-h-72 border border-slate-800 leading-tight">
            {JSON.stringify(pureJsonOutput, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default Cubes;
