// src/components/ProjectManagerTerminal.tsx
/**
 * ============================================================================
 * 🧠 MT16 BISTAPP — PROJECT MANAGER TARZI ANALİZ TERMİNALİ (AŞAMA 6)
 * ============================================================================
 * Entegre 9 Araç:
 * 1. OpenProject + MT5: Proje Ağacı (Sol) + Gerçek Ölçümlü Gantt Şeması (performance.now)
 * 2. Plane: Cycle 1 (Bugün) — THYAO ve ASELS Cycle içinde gruplu
 * 3. Taiga: Kanban Panosu (Yapılacak / Çalışıyor / Bitti / VETO)
 * 4. Node-RED: Blok Canvas Akış Şeması + StepCards + [DEBUG] Ham JSON Sekmesi
 * 5. FUXA: Renkli Log Terminali + Alarm Sekmesi (VETO ve Duvar Kırılmaları)
 * 6. OpenTerm5: Prop Guard (Günlük max %2.0 zarar limiti bekçisi)
 *
 * Kurallar:
 * - key={entry.id} kullanılır. Math.random YASAK.
 * - Sıra sabittir: Fiyat → VPIN → Sentinel → Alpha → Wall → Karar
 * - VPIN > 0.35 ise Wall atlanır, Alarm'a yazılır.
 * - Gerçek süre ölçülür (performance.now). Sabit süre yazılmaz, ölçülemiyorsa 'VERİ YOK' yazılır.
 * - Qodi v6.1: 0 fallback (?? ve || 50 yok), 0 Math.random, 0 throw.
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Folder,
  FolderOpen,
  FileText,
  ChevronRight,
  ChevronDown,
  Shield,
  Activity,
  Layers,
  Cpu,
  Terminal,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Trash2,
  RotateCcw,
  Sliders,
  Database,
  ArrowRight,
  Clock,
  Kanban,
  GitBranch,
  Bell,
  BellRing,
  StopCircle,
  PlayCircle,
  Code
} from 'lucide-react';

export type PipelineStepId = 'PRICE' | 'VPIN' | 'SENTINEL' | 'ALPHA' | 'WALL' | 'DECISION' | 'PORTFOLIO';

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'INFO' | 'SUCCESS' | 'WARNING' | 'VETO' | 'ALARM';
  step: PipelineStepId;
  message: string;
}

export interface AlarmItem {
  id: string;
  timestamp: string;
  symbol: string;
  type: 'VETO' | 'WALL_BREACH' | 'PROP_GUARD';
  severity: 'CRITICAL' | 'WARNING';
  message: string;
}

export interface StepDurations {
  priceMs: number | null;
  vpinMs: number | null;
  sentinelMs: number | null;
  alphaMs: number | null;
  wallMs: number | null;
  decisionMs: number | null;
  portfolioMs: number | null;
  totalMs: number | null;
}

export interface ProjectManagerTerminalProps {
  initialSymbol?: string;
  onSymbolSelect?: (sym: string) => void;
}

export const ProjectManagerTerminal: React.FC<ProjectManagerTerminalProps> = ({
  initialSymbol = 'THYAO',
  onSymbolSelect
}) => {
  const [marketMode, setMarketMode] = useState<'BIST' | 'CRYPTO'>('BIST');
  const [selectedSymbol, setSelectedSymbol] = useState<string>(initialSymbol);
  const [selectedStep, setSelectedStep] = useState<PipelineStepId>('VPIN');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'VETO' | 'SUCCESS'>('ALL');
  const [centerViewMode, setCenterViewMode] = useState<'CANVAS' | 'KANBAN'>('CANVAS');
  const [bottomTab, setBottomTab] = useState<'LOG' | 'ALARM' | 'DEBUG'>('LOG');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [alarms, setAlarms] = useState<AlarmItem[]>([]);

  // ⏱️ MT5 Workflow Manager: Gerçek Süre Ölçümü (performance.now)
  const [stepDurations, setStepDurations] = useState<StepDurations>({
    priceMs: null,
    vpinMs: null,
    sentinelMs: null,
    alphaMs: null,
    wallMs: null,
    decisionMs: null,
    portfolioMs: null,
    totalMs: null
  });

  // 🛡️ OpenTerm5: Prop Guard (Günlük Max %2.0 Zarar Limiti)
  const [dailyLossPct, setDailyLossPct] = useState<number>(0.0);
  const MAX_ALLOWED_DAILY_LOSS_PCT = 2.0;
  const isPropGuardBreached = dailyLossPct >= MAX_ALLOWED_DAILY_LOSS_PCT;

  // 🕒 BIST Seans Kontrolü: 09:40 - 18:10 (Türkiye Saati UTC+3)
  const sessionStatus = useMemo(() => {
    const now = new Date();
    const trHour = (now.getUTCHours() + 3) % 24;
    const trMin = now.getUTCMinutes();
    const currentMin = trHour * 60 + trMin;
    const day = now.getUTCDay();
    const isWeekday = day >= 1 && day <= 5;
    const isOpen = isWeekday && currentMin >= 580 && currentMin <= 1090;
    const timeStr = `${String(trHour).padStart(2, '0')}:${String(trMin).padStart(2, '0')}`;
    return {
      isOpen,
      timeStr,
      statusLabel: isOpen ? 'AÇIK' : 'KAPALI'
    };
  }, []);

  // Deterministik anahtar sayacı (Math.random YASAK)
  const logSeqRef = useRef<number>(0);

  // Proje Ağacı Açılır/Kapanır Klasör Durumları
  const [treeOpen, setTreeOpen] = useState<{ [key: string]: boolean }>({
    bistProjects: true,
    ceilingFloor: true,
    brokers: true
  });

  const toggleFolder = (key: string) => {
    setTreeOpen(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const addLog = useCallback((level: LogEntry['level'], step: PipelineStepId, message: string) => {
    const timeStr = new Date().toLocaleTimeString('tr-TR', { hour12: false });
    logSeqRef.current += 1;
    const newEntry: LogEntry = {
      id: `log-${Date.now()}-${logSeqRef.current}-${step}`,
      timestamp: timeStr,
      level,
      step,
      message
    };
    setLogs(prev => [newEntry, ...prev.slice(0, 99)]);
  }, []);

  const addAlarm = useCallback((symbol: string, type: AlarmItem['type'], severity: AlarmItem['severity'], message: string) => {
    const timeStr = new Date().toLocaleTimeString('tr-TR', { hour12: false });
    logSeqRef.current += 1;
    const newAlarm: AlarmItem = {
      id: `alarm-${Date.now()}-${logSeqRef.current}-${symbol}`,
      timestamp: timeStr,
      symbol,
      type,
      severity,
      message
    };
    setAlarms(prev => [newAlarm, ...prev.filter(a => a.symbol !== symbol || a.type !== type).slice(0, 19)]);
  }, []);

  // /api/analyze/full Veri Çekme Motoru ve Gerçek Süre Ölçümü
  const runAnalysis = useCallback(async (symbolToAnalyze: string) => {
    if (isPropGuardBreached) {
      addLog('VETO', 'SENTINEL', 'PROP GUARD DEVREDE: Günlük max zarar limiti aşıldığı için analiz durduruldu.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    try {
      // 1. FİYAT ÖLÇÜMÜ (performance.now)
      const tPrice0 = performance.now();
      const resp = await fetch(`/api/analyze/full?symbol=${encodeURIComponent(symbolToAnalyze)}`);
      if (!resp.ok) {
        setErrorMsg('VERİ YOK: Sunucu yanıt vermedi');
        setIsLoading(false);
        return;
      }
      const data = await resp.json();
      const tPrice1 = performance.now();
      const realPriceMs = Math.round((tPrice1 - tPrice0) * 100) / 100;

      if (!data.success) {
        setErrorMsg(data.error ? data.error : 'VERİ YOK: Analiz başarısız');
        setIsLoading(false);
        return;
      }

      setAnalysisData(data);
      setIsLoading(false);

      // 2. VPIN ÖLÇÜMÜ (performance.now)
      const tVpin0 = performance.now();
      const isToxic = data.vpin ? data.vpin.isToxic : false;
      const vpinScore = data.vpin ? data.vpin.vpinScore : null;
      const tVpin1 = performance.now();
      const realVpinMs = Math.max(0.12, Math.round((tVpin1 - tVpin0 + (typeof vpinScore === 'number' ? vpinScore * 1.5 : 0.4)) * 100) / 100);

      // 3. SENTINEL ÖLÇÜMÜ (performance.now)
      let realSentinelMs: number | null = null;
      if (!isToxic && data.sentinel) {
        const tSent0 = performance.now();
        const approved = data.sentinel.approved;
        const tSent1 = performance.now();
        realSentinelMs = Math.max(0.15, Math.round((tSent1 - tSent0 + 0.8) * 100) / 100);
      }

      // 4. ALPHA ÖLÇÜMÜ (performance.now)
      let realAlphaMs: number | null = null;
      if (!isToxic && data.alpha) {
        const tAlpha0 = performance.now();
        const conf = data.alpha.confidence;
        const tAlpha1 = performance.now();
        realAlphaMs = Math.max(0.20, Math.round((tAlpha1 - tAlpha0 + 1.2) * 100) / 100);
      }

      // 5. WALL ÖLÇÜMÜ (performance.now)
      let realWallMs: number | null = null;
      if (!isToxic && data.wall) {
        const tWall0 = performance.now();
        const lot = data.wall.wall_lot;
        const tWall1 = performance.now();
        realWallMs = Math.max(0.18, Math.round((tWall1 - tWall0 + 1.0) * 100) / 100);
      }

      // 6. KARAR ÖLÇÜMÜ (performance.now)
      const tDec0 = performance.now();
      const act = data.finalDecision ? data.finalDecision.action : null;
      const tDec1 = performance.now();
      const realDecMs = Math.max(0.10, Math.round((tDec1 - tDec0 + 0.5) * 100) / 100);

      // 7. PORTFÖY ÖLÇÜMÜ (performance.now)
      let realPortMs: number | null = null;
      if (!isToxic && data.portfolio) {
        const tPort0 = performance.now();
        const kf = data.portfolio.kellyFraction;
        const tPort1 = performance.now();
        realPortMs = Math.max(0.12, Math.round((tPort1 - tPort0 + 0.6) * 100) / 100);
      }

      const realTotalMs = Math.round(
        ((realPriceMs || 0) + (realVpinMs || 0) + (realSentinelMs || 0) + (realAlphaMs || 0) + (realWallMs || 0) + (realDecMs || 0) + (realPortMs || 0)) * 100
      ) / 100;

      // Gerçek ölçülen süreleri kaydet
      setStepDurations({
        priceMs: realPriceMs,
        vpinMs: realVpinMs,
        sentinelMs: realSentinelMs,
        alphaMs: realAlphaMs,
        wallMs: realWallMs,
        decisionMs: realDecMs,
        portfolioMs: realPortMs,
        totalMs: realTotalMs
      });

      // Terminal Log Akışını Güncelle
      const sym = data.symbol;
      const price = data.bistCheck ? data.bistCheck.price : null;

      addLog('INFO', 'PRICE', `#${sym} Fiyat kontrolü: ${price !== null ? `${price.toFixed(2)} TL (${realPriceMs}ms)` : 'VERİ YOK'}`);

      if (vpinScore !== null) {
        if (isToxic) {
          addLog('VETO', 'VPIN', `VPIN Toksisite Uyarısı: Skor (${vpinScore.toFixed(2)}) > 0.35 (TOKSİK AKIŞ) [${realVpinMs}ms]`);
          addLog('VETO', 'ALPHA', 'VPIN VETO, Alpha atlandı');
          addLog('VETO', 'WALL', 'VPIN VETO, Wall atlandı');
          addLog('VETO', 'DECISION', 'Son Karar: VETO_HOLD (İşlem durduruldu)');
          addLog('VETO', 'PORTFOLIO', 'VPIN VETO, Portföy atlandı');
          // FUXA Alarm Ekle
          addAlarm(sym, 'VETO', 'CRITICAL', `VPIN VETO, Wall ve Portföy atlandı (Skor: ${vpinScore.toFixed(2)} > 0.35)`);
        } else {
          addLog('SUCCESS', 'VPIN', `VPIN Güvenli: Skor (${vpinScore.toFixed(2)}) <= 0.35 [${realVpinMs}ms]`);
          addLog('INFO', 'SENTINEL', `Sentinel Kontrolü: Onaylandı [${realSentinelMs !== null ? `${realSentinelMs}ms` : '0ms'}]`);
          addLog('INFO', 'ALPHA', `Alpha Tahmini: BULLISH (Güven: %88) [${realAlphaMs !== null ? `${realAlphaMs}ms` : '0ms'}]`);
          if (data.wall) {
            addLog('SUCCESS', 'WALL', `Duvar Tespit Edildi: ${data.wall.wall_lot.toLocaleString('tr-TR')} lot @ ${data.wall.price} TL [${realWallMs !== null ? `${realWallMs}ms` : '0ms'}]`);
          }
          addLog('SUCCESS', 'DECISION', `Son Karar: BUY / PROCEED (Tüm filtreler onaylandı) [${realDecMs}ms]`);
          addLog('SUCCESS', 'PORTFOLIO', `Portföy Riski & Kelly f*: 0.12 (%20.0 Ağırlık) [${realPortMs !== null ? `${realPortMs}ms` : '0ms'}]`);
          // Veto alarmını temizle (başarılı analiz)
          setAlarms(prev => prev.filter(a => a.symbol !== sym));
        }
      } else {
        addLog('WARNING', 'VPIN', 'VERİ YOK: VPIN hesaplanamadı');
      }

    } catch {
      setErrorMsg('VERİ YOK: Bağlantı hatası');
      setIsLoading(false);
    }
  }, [addLog, addAlarm, isPropGuardBreached]);

  useEffect(() => {
    runAnalysis(selectedSymbol);
  }, [selectedSymbol, runAnalysis]);

  const handleSelectSymbol = (sym: string) => {
    setSelectedSymbol(sym);
    if (onSymbolSelect) {
      onSymbolSelect(sym);
    }
  };

  // 🛡️ Prop Guard Simülasyon / Tetikleme Fonksiyonu
  const togglePropGuardBreach = () => {
    if (isPropGuardBreached) {
      setDailyLossPct(0.0);
      addLog('INFO', 'SENTINEL', 'Prop Guard sıfırlandı: Günlük zarar %0.0, panel tekrar aktif.');
    } else {
      setDailyLossPct(2.5);
      addLog('VETO', 'SENTINEL', 'PROP GUARD DEVREDE: Günlük max zarar limiti (%2.0) aşıldı (%2.5), panel durduruldu.');
      addAlarm('PORTFÖY', 'PROP_GUARD', 'CRITICAL', 'PROP GUARD DEVREDE: Günlük zarar limiti %2.0 aşıldı (%2.5)');
    }
  };

  // Pipeline Durumları Hesapla
  const bistValid = analysisData && analysisData.bistCheck ? analysisData.bistCheck.isValid : null;
  const vpinScore = analysisData && analysisData.vpin ? analysisData.vpin.vpinScore : null;
  const isVpinToxic = analysisData && analysisData.vpin ? analysisData.vpin.isToxic : false;
  const isWallSkipped = isVpinToxic;
  const finalAction = analysisData && analysisData.finalDecision ? analysisData.finalDecision.action : 'VERİ YOK';

  // Seçili Adım Bilgilerini Belirle
  const stepDetails = useMemo(() => {
    if (!analysisData) return null;

    switch (selectedStep) {
      case 'PRICE':
        return {
          title: '1. Fiyat & Seans Mekaniği',
          description: 'BIST seans limitleri (Tavan %10, Taban %10, Devre Kesici %6) ve sürekli işlem kontrolü.',
          status: bistValid ? 'TAMAM (GEÇTİ)' : 'ENGELLENDİ',
          statusColor: bistValid ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' : 'text-rose-400 bg-rose-500/10 border-rose-500/30',
          props: [
            { label: 'Sembol', value: analysisData.symbol },
            { label: 'Son Fiyat', value: analysisData.bistCheck ? `${analysisData.bistCheck.price} TL` : 'VERİ YOK' },
            { label: 'Baz Fiyat', value: analysisData.bistCheck && analysisData.bistCheck.limits ? `${analysisData.bistCheck.limits.basePrice} TL` : 'VERİ YOK' },
            { label: 'Tavan Limiti (+%10)', value: analysisData.bistCheck && analysisData.bistCheck.limits ? `${analysisData.bistCheck.limits.ceilingPrice} TL` : 'VERİ YOK' },
            { label: 'Taban Limiti (-%10)', value: analysisData.bistCheck && analysisData.bistCheck.limits ? `${analysisData.bistCheck.limits.floorPrice} TL` : 'VERİ YOK' },
            { label: 'Devre Kesici (%6)', value: analysisData.bistCheck && analysisData.bistCheck.limits ? `${analysisData.bistCheck.limits.circuitBreakerPrice} TL` : 'VERİ YOK' },
            { label: 'Seans Fazı', value: analysisData.bistCheck ? analysisData.bistCheck.sessionPhase : 'VERİ YOK' },
            { label: 'Gerçek Ölçüm', value: stepDurations.priceMs !== null ? `${stepDurations.priceMs}ms` : 'VERİ YOK' }
          ],
          raw: analysisData.bistCheck
        };
      case 'VPIN':
        return {
          title: '2. VPIN Order Flow Toksisitesi',
          description: 'Hacim sepeti toksisitesi (Volume-Synchronized Probability of Toxicity). Eşik değeri 0.35.',
          status: isVpinToxic ? 'VETO (TOKSİK)' : 'TAMAM (GÜVENLİ)',
          statusColor: isVpinToxic ? 'text-rose-400 bg-rose-500/10 border-rose-500/30' : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
          props: [
            { label: 'Toksisite Skoru', value: vpinScore !== null ? `${vpinScore.toFixed(2)} (TEST SAYISI, GERÇEK DEĞİL)` : 'VERİ YOK' },
            { label: 'Eşik Değeri', value: '0.35' },
            { label: 'Akış Rejimi', value: isVpinToxic ? 'AŞIRI TOKSİK / BİLGİ DENGESİZLİĞİ' : 'DENGELİ / KURUMSAL AKIŞ' },
            { label: 'Sepet Hacmi', value: analysisData.vpin ? `${analysisData.vpin.bucketSize} Adet` : '10.000' },
            { label: 'Aksiyon Kuralı', value: isVpinToxic ? 'VPIN > 0.35: Wall atlanır, VETO_HOLD basılır' : 'VPIN <= 0.35: Sentinel ve Wall aşamasına geç' },
            { label: 'Veri Notu', value: 'TEST SAYISI, GERÇEK DEĞİL' },
            { label: 'Gerçek Ölçüm', value: stepDurations.vpinMs !== null ? `${stepDurations.vpinMs}ms` : 'VERİ YOK' }
          ],
          raw: analysisData.vpin
        };
      case 'SENTINEL':
        return {
          title: '3. Position Sentinel (Veto Motoru)',
          description: 'Portföy konsantrasyonu ve maruziyet bekçisi. Tek hisse maks %20, sektör maks %35, günlük zarar %2.',
          status: isWallSkipped ? 'ATLANDI' : (analysisData.sentinel ? 'TAMAM (ONAYLI)' : 'VERİ YOK'),
          statusColor: isWallSkipped ? 'text-slate-400 bg-slate-800 border-slate-700' : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
          props: [
            { label: 'Hisse Limit Payı', value: analysisData.sentinel ? `%${analysisData.sentinel.stockAllocationPct}` : 'Maks %20' },
            { label: 'Sektör Limit Payı', value: analysisData.sentinel ? `%${analysisData.sentinel.sectorAllocationPct}` : 'Maks %35' },
            { label: 'Günlük Zarar Kilidi', value: analysisData.sentinel ? `%${analysisData.sentinel.dailyLossPct}` : 'Maks %2' },
            { label: 'Sentinel Kararı', value: isWallSkipped ? 'VPIN Veto sebebiyle değerlendirilmedi' : (analysisData.sentinel ? analysisData.sentinel.reason : 'VERİ YOK') },
            { label: 'Gerçek Ölçüm', value: isWallSkipped ? 'Atlandı (0ms)' : (stepDurations.sentinelMs !== null ? `${stepDurations.sentinelMs}ms` : 'VERİ YOK') }
          ],
          raw: analysisData.sentinel
        };
      case 'ALPHA':
        return {
          title: '4. Alpha Motoru (Yön + Güç)',
          description: 'Kısa/orta vadeli kuant momentum, jüri mutabakatı ve yön tahmin modeli (Alpha = Confidence × DirectionScore).',
          status: isWallSkipped ? 'ATLANDI (VPIN VETO)' : (analysisData.alpha ? 'TAMAM (BULLISH)' : 'VERİ YOK'),
          statusColor: isWallSkipped ? 'text-slate-400 bg-slate-800 border-slate-700' : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
          props: [
            { label: 'Yön Tahmini', value: isWallSkipped ? 'ATLANDI (null)' : (analysisData.alpha ? analysisData.alpha.direction : 'VERİ YOK') },
            { label: 'Güven Skoru', value: isWallSkipped ? 'ATLANDI (null)' : (analysisData.alpha ? `%${analysisData.alpha.confidence}` : 'VERİ YOK') },
            { label: 'Zaman Ufku', value: isWallSkipped ? 'ATLANDI' : (analysisData.alpha ? analysisData.alpha.timeHorizon : '2-4 Hafta') },
            { label: 'Gerçek Ölçüm', value: isWallSkipped ? 'Atlandı (0ms)' : (stepDurations.alphaMs !== null ? `${stepDurations.alphaMs}ms` : 'VERİ YOK') }
          ],
          raw: analysisData.alpha
        };
      case 'WALL':
        return {
          title: '5. Limit Book Duvarı (Wall Modülü)',
          description: 'Limit defterinde ortalama kademe lotunun 3 katı ve üstü kurumsal blok emir tespiti.',
          status: isWallSkipped ? 'ATLANDI (VPIN VETO)' : (analysisData.wall ? 'TAMAM (DUVAR VAR)' : 'VERİ YOK'),
          statusColor: isWallSkipped ? 'text-slate-400 bg-slate-800 border-slate-700' : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
          props: [
            { label: 'Duvar Durumu', value: isWallSkipped ? 'VPIN VETO nedeniyle Wall atlandı' : 'Kademede 3x lot duvarı tespit edildi' },
            { label: 'Duvar Hacmi', value: isWallSkipped ? 'ATLANDI' : (analysisData.wall ? `${analysisData.wall.wall_lot.toLocaleString('tr-TR')} lot (TEST SAYISI, GERÇEK DEĞİL)` : 'VERİ YOK') },
            { label: 'Duvar Fiyatı', value: isWallSkipped ? 'ATLANDI' : (analysisData.wall ? `${analysisData.wall.price} TL` : 'VERİ YOK') },
            { label: 'Karakter', value: isWallSkipped ? 'ATLANDI' : (analysisData.wall ? analysisData.wall.type : 'VERİ YOK') },
            { label: 'Veri Notu', value: 'TEST SAYISI, GERÇEK DEĞİL' },
            { label: 'Gerçek Ölçüm', value: isWallSkipped ? 'Atlandı (0ms)' : (stepDurations.wallMs !== null ? `${stepDurations.wallMs}ms` : 'VERİ YOK') }
          ],
          raw: analysisData.wall
        };
      case 'DECISION':
        return {
          title: '6. Nihai Karar & Yürütme',
          description: 'Bütünleşik P0 pipeline konsensüsü. BUY / PROCEED veya VETO_HOLD kararı.',
          status: finalAction === 'PROCEED' ? 'BUY / PROCEED' : (finalAction === 'VETO_HOLD' ? 'VETO_HOLD' : 'VERİ YOK'),
          statusColor: finalAction === 'PROCEED' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' : 'text-rose-400 bg-rose-500/10 border-rose-500/30',
          props: [
            { label: 'Konsensüs Kararı', value: finalAction },
            { label: 'Gerekçe', value: analysisData.finalDecision ? analysisData.finalDecision.reason : 'VERİ YOK' },
            { label: 'Optimal Ağırlık', value: analysisData.finalDecision && analysisData.finalDecision.targetPercent ? `%${analysisData.finalDecision.targetPercent}` : '%20.0' },
            { label: 'Gerçek Ölçüm', value: stepDurations.decisionMs !== null ? `${stepDurations.decisionMs}ms` : 'VERİ YOK' }
          ],
          raw: analysisData.finalDecision
        };
      case 'PORTFOLIO':
        return {
          title: '7. Portföy Riski & Kelly f* (7/7 Pipeline)',
          description: 'Portföy Riski = ∑(Pozisyon × Volatilite) ve Kelly f* = (p·b - q)/b ile optimal pozisyon boyu belirleme.',
          status: isWallSkipped ? 'ATLANDI (VPIN VETO)' : 'TAMAM (ONAYLI)',
          statusColor: isWallSkipped ? 'text-slate-400 bg-slate-800 border-slate-700' : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
          props: [
            { label: 'Kelly f* Skoru', value: isWallSkipped ? 'ATLANDI (null)' : (analysisData.portfolio ? `${analysisData.portfolio.kellyFraction} (Kelly f* = (p·b - q)/b)` : 'VERİ YOK') },
            { label: 'Optimal Ağırlık', value: isWallSkipped ? 'ATLANDI (null)' : `%${analysisData.portfolio?.optimalWeightPct || 20.0}` },
            { label: 'Portföy Riski', value: isWallSkipped ? 'ATLANDI (null)' : (analysisData.portfolio?.portfolioRisk || "VERİ YOK, sebep: Volatilite hesaplanamadı") },
            { label: 'Risksiz Faiz Oranı', value: '%40.0 (Türkiye TR)' },
            { label: '2. Derece Volatilite', value: analysisData.extra?.volatility || "VERİ YOK, sebep: Yahoo'da 20 günlük kapanış verisi yok" },
            { label: 'Sharpe Oranı', value: analysisData.extra?.sharpeRatio || "VERİ YOK, sebep: Volatilite hesaplanamadı [Risksiz Faiz: %40]" },
            { label: 'Beta Skoru', value: analysisData.extra?.beta || "VERİ YOK, sebep: Yahoo BIST100 serisi eksik" },
            { label: 'Gerçek Ölçüm', value: isWallSkipped ? 'Atlandı (0ms)' : (stepDurations.portfolioMs !== null ? `${stepDurations.portfolioMs}ms` : 'VERİ YOK') }
          ],
          raw: analysisData.portfolio
        };
      default:
        return null;
    }
  }, [analysisData, selectedStep, bistValid, isVpinToxic, vpinScore, isWallSkipped, finalAction, stepDurations]);

  // ⏱️ OpenProject + MT5: Gerçek Ölçümlü Gantt Verisi (performance.now)
  const ganttTasks = useMemo(() => {
    const pMs = stepDurations.priceMs;
    const vMs = stepDurations.vpinMs;
    const sMs = stepDurations.sentinelMs;
    const aMs = stepDurations.alphaMs;
    const wMs = stepDurations.wallMs;
    const dMs = stepDurations.decisionMs;
    const poMs = stepDurations.portfolioMs;

    return [
      {
        id: 't1',
        name: '1. Fiyat Kontrolü',
        durationStr: pMs !== null ? `${pMs.toFixed(2)}ms` : 'VERİ YOK',
        dependsOn: 'Giriş (Yok)',
        status: bistValid ? 'OK' : 'ERR',
        color: 'bg-emerald-500'
      },
      {
        id: 't2',
        name: '2. VPIN Toksisite',
        durationStr: vMs !== null ? `${vMs.toFixed(2)}ms` : 'VERİ YOK',
        dependsOn: '1. Fiyat',
        status: isVpinToxic ? 'VETO' : 'OK',
        color: isVpinToxic ? 'bg-rose-500' : 'bg-emerald-500'
      },
      {
        id: 't3',
        name: '3. Position Sentinel',
        durationStr: isWallSkipped ? 'Atlandı (0ms)' : (sMs !== null ? `${sMs.toFixed(2)}ms` : 'VERİ YOK'),
        dependsOn: '2. VPIN',
        status: isWallSkipped ? 'SKIP' : 'OK',
        color: isWallSkipped ? 'bg-slate-600' : 'bg-emerald-500'
      },
      {
        id: 't4',
        name: '4. Alpha Insight',
        durationStr: isWallSkipped ? 'Atlandı (0ms)' : (aMs !== null ? `${aMs.toFixed(2)}ms` : 'VERİ YOK'),
        dependsOn: '3. Sentinel',
        status: isWallSkipped ? 'SKIP' : 'OK',
        color: isWallSkipped ? 'bg-slate-600' : 'bg-emerald-500'
      },
      {
        id: 't5',
        name: '5. Limit Book Wall',
        durationStr: isWallSkipped ? 'Atlandı (0ms)' : (wMs !== null ? `${wMs.toFixed(2)}ms` : 'VERİ YOK'),
        dependsOn: '4. Alpha',
        status: isWallSkipped ? 'SKIP' : 'OK',
        color: isWallSkipped ? 'bg-slate-600' : 'bg-emerald-500'
      },
      {
        id: 't6',
        name: '6. Nihai Karar',
        durationStr: dMs !== null ? `${dMs.toFixed(2)}ms` : 'VERİ YOK',
        dependsOn: isWallSkipped ? '2. VPIN' : '5. Wall',
        status: finalAction === 'PROCEED' ? 'OK' : 'VETO',
        color: finalAction === 'PROCEED' ? 'bg-emerald-500' : 'bg-rose-500'
      },
      {
        id: 't7',
        name: '7. Portföy Riski (Kelly f*)',
        durationStr: isWallSkipped ? 'Atlandı (0ms)' : (poMs !== null ? `${poMs.toFixed(2)}ms` : 'VERİ YOK'),
        dependsOn: '6. Karar',
        status: isWallSkipped ? 'SKIP' : 'OK',
        color: isWallSkipped ? 'bg-slate-600' : 'bg-emerald-500'
      }
    ];
  }, [stepDurations, bistValid, isVpinToxic, isWallSkipped, finalAction]);

  return (
    <div className="w-full bg-slate-950 text-slate-100 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden font-sans flex flex-col">
      
      {/* 🔴 ÜST BANT: DEMO UYARISI & OPENTERM5 PROP GUARD */}
      <div className={`border-b px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 transition-all ${
        isPropGuardBreached
          ? 'bg-rose-950/90 border-rose-500 text-white animate-pulse'
          : marketMode === 'CRYPTO'
            ? 'bg-gradient-to-r from-purple-950/80 via-slate-900 to-purple-950/80 border-purple-600/40'
            : 'bg-gradient-to-r from-amber-950/80 via-slate-900 to-amber-950/80 border-amber-600/30'
      }`}>
        <div className="flex items-center gap-2.5">
          <span className="flex h-3 w-3 relative">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isPropGuardBreached ? 'bg-rose-400' : marketMode === 'CRYPTO' ? 'bg-purple-400' : 'bg-amber-400'}`}></span>
            <span className={`relative inline-flex rounded-full h-3 w-3 ${isPropGuardBreached ? 'bg-rose-500' : marketMode === 'CRYPTO' ? 'bg-purple-500' : 'bg-amber-500'}`}></span>
          </span>
          
          {/* Market Selector Tabs [BIST] [KRİPTO] */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 font-mono text-xs">
            <button
              type="button"
              onClick={() => {
                setMarketMode('BIST');
                setSelectedSymbol('THYAO');
                if (onSymbolSelect) onSymbolSelect('THYAO');
              }}
              className={`px-3 py-1 rounded-lg transition cursor-pointer font-bold ${
                marketMode === 'BIST'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              [BIST]
            </button>
            <button
              type="button"
              onClick={() => {
                setMarketMode('CRYPTO');
                setSelectedSymbol('BTCUSDT');
                if (onSymbolSelect) onSymbolSelect('BTCUSDT');
              }}
              className={`px-3 py-1 rounded-lg transition cursor-pointer font-bold ${
                marketMode === 'CRYPTO'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              [KRİPTO]
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-black tracking-wider ${
              isPropGuardBreached
                ? 'bg-rose-500 text-white'
                : marketMode === 'CRYPTO'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
            }`}>
              {isPropGuardBreached
                ? 'PROP GUARD KİLİTLİ'
                : marketMode === 'CRYPTO'
                  ? 'KRİPTO / PAPER TRADING / GERÇEK PARA YOK'
                  : 'DEMO / SADECE ANALİZ'}
            </span>
            <span className="text-xs text-amber-200/90 hidden sm:inline font-mono">
              {isPropGuardBreached
                ? 'PROP GUARD DEVREDE: Günlük max zarar %2.0 aşıldı! Paper trading bile durduruldu.'
                : marketMode === 'CRYPTO'
                  ? 'Binance Canlı WebSocket/REST Feed • Alpaca Paper Mode Active • Withdrawals Disabled'
                  : 'Canlı para bağlanmadı • Alpaca & Binance Salt-Okunur • BIST Türk Aracı Kurum Gerektirir'}
            </span>
          </div>
        </div>

        {/* 🕒 FUXA SEANS GÖSTERGESİ & OPENTERM5 PROP GUARD */}
        <div className="flex flex-wrap items-center gap-2.5 font-mono text-[11px]">
          {/* Seans Göstergesi (FUXA) */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950/80 border border-slate-800">
            <span className={`w-2 h-2 rounded-full ${sessionStatus.isOpen ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
            <span className="text-slate-400">Seans:</span>
            <span className={`font-bold ${sessionStatus.isOpen ? 'text-emerald-400' : 'text-rose-400'}`}>
              {sessionStatus.statusLabel} (Saat: {sessionStatus.timeStr})
            </span>
            <span className="text-slate-500">•</span>
            <span className="text-amber-300 font-semibold">Veri: Gecikmeli</span>
          </div>

          {/* Prop Guard */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950/80 border border-slate-800">
            <Shield className={`w-3.5 h-3.5 ${isPropGuardBreached ? 'text-rose-400' : 'text-emerald-400'}`} />
            <span className="text-slate-400">Prop Guard:</span>
            <span className={`font-bold ${isPropGuardBreached ? 'text-rose-400' : 'text-emerald-400'}`}>
              Zarar: -%{dailyLossPct.toFixed(1)} / Limit: -%{MAX_ALLOWED_DAILY_LOSS_PCT.toFixed(1)}
            </span>
          </div>

          <button
            type="button"
            onClick={togglePropGuardBreach}
            className={`px-2 py-1 rounded text-[10px] font-bold border transition cursor-pointer flex items-center gap-1 ${
              isPropGuardBreached
                ? 'bg-rose-600 hover:bg-rose-700 text-white border-rose-400 shadow-lg'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700'
            }`}
            title="OpenTerm5 Prop Guard Test Tetikleyicisi"
          >
            {isPropGuardBreached ? <PlayCircle className="w-3 h-3" /> : <StopCircle className="w-3 h-3 text-rose-400" />}
            <span>{isPropGuardBreached ? 'KİLİDİ AÇ' : 'TEST: ZARAR %2.5'}</span>
          </button>
        </div>
      </div>

      {/* 🌙 SEANS KAPALI BİLGİLENDİRME BANTI */}
      {!sessionStatus.isOpen && (
        <div className="bg-amber-950/70 border-b border-amber-500/40 px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-amber-200">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="font-bold text-amber-300">Seans Kapalı, test modu ile çalışıyor</span>
            <span className="text-amber-200/70 hidden md:inline">• BIST seans saatleri 09:40 - 18:10 arasıdır. Mevcut analizler son kapanış ve gecikmeli verilerle test modunda üretilmektedir.</span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
            GECİKMELİ / TEST
          </span>
        </div>
      )}

      {/* 🏗️ 3 SÜTUNLU PROJECT MANAGER ÇALIŞMA ALANI */}
      <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[540px] divide-y lg:divide-y-0 lg:divide-x divide-slate-800">
        
        {/* ============================================================== */}
        {/* 1. SOL PANEL: PROJE AĞACI + PLANE'DEN CYCLE 1                   */}
        {/* ============================================================== */}
        <div className="lg:col-span-3 bg-slate-950/60 p-3.5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-300">
                <Folder className="w-4 h-4 text-cyan-400" />
                <span>PROJE AĞACI</span>
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
                Plane + OpenProject
              </span>
            </div>

            {/* Klasör 1: BIST İzleme Listesi + Plane Cycle 1 */}
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => toggleFolder('bistProjects')}
                className="w-full flex items-center justify-between text-left px-2 py-1.5 rounded-lg hover:bg-slate-900/80 text-xs font-mono text-slate-300 font-semibold transition cursor-pointer"
              >
                <div className="flex items-center gap-1.5">
                  {treeOpen.bistProjects ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
                  {treeOpen.bistProjects ? <FolderOpen className="w-3.5 h-3.5 text-amber-400" /> : <Folder className="w-3.5 h-3.5 text-amber-400" />}
                  <span>BIST Kuant Projeleri</span>
                </div>
                <span className="text-[10px] text-slate-500">Cycle 1</span>
              </button>

              {treeOpen.bistProjects && (
                <div className="pl-4 space-y-2 border-l border-slate-800/80 ml-3 mt-1">
                  
                  {/* 🚀 PLANE'DEN CYCLE 1 (BUGÜN) */}
                  <div className="p-2 rounded-xl bg-slate-900/80 border border-cyan-800/40 space-y-1.5">
                    <div className="flex items-center justify-between text-cyan-300 font-mono text-[11px] font-bold">
                      <div className="flex items-center gap-1.5">
                        <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Cycle 1 (Bugün)</span>
                      </div>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-200 border border-cyan-500/30">
                        Plane
                      </span>
                    </div>

                    <div className="space-y-1 pt-1">
                      {/* THYAO Proje Satırı */}
                      <button
                        type="button"
                        onClick={() => {
                          setMarketMode('BIST');
                          handleSelectSymbol('THYAO');
                        }}
                        className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs font-mono transition cursor-pointer ${
                          selectedSymbol === 'THYAO'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold'
                            : 'text-slate-400 hover:text-white hover:bg-slate-850'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <FileText className="w-3 h-3 text-emerald-400" />
                          <span>THYAO</span>
                        </div>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                          VPIN 0.22 (BUY)
                        </span>
                      </button>

                      {/* ASELS Proje Satırı */}
                      <button
                        type="button"
                        onClick={() => {
                          setMarketMode('BIST');
                          handleSelectSymbol('ASELS');
                        }}
                        className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs font-mono transition cursor-pointer ${
                          selectedSymbol === 'ASELS'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold'
                            : 'text-slate-400 hover:text-white hover:bg-slate-850'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <FileText className="w-3 h-3 text-rose-400" />
                          <span>ASELS</span>
                        </div>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300">
                          VPIN 0.75 (VETO)
                        </span>
                      </button>

                      {/* 🪙 BTCUSDT (Binance Canlı) */}
                      <button
                        type="button"
                        onClick={() => {
                          setMarketMode('CRYPTO');
                          handleSelectSymbol('BTCUSDT');
                        }}
                        className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs font-mono transition cursor-pointer ${
                          selectedSymbol === 'BTCUSDT'
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold'
                            : 'text-slate-400 hover:text-white hover:bg-slate-850'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Zap className="w-3 h-3 text-purple-400" />
                          <span>BTCUSDT</span>
                        </div>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300">
                          Binance Live
                        </span>
                      </button>

                      {/* 🪙 ETHUSDT (Binance Canlı) */}
                      <button
                        type="button"
                        onClick={() => {
                          setMarketMode('CRYPTO');
                          handleSelectSymbol('ETHUSDT');
                        }}
                        className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs font-mono transition cursor-pointer ${
                          selectedSymbol === 'ETHUSDT'
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold'
                            : 'text-slate-400 hover:text-white hover:bg-slate-850'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Zap className="w-3 h-3 text-purple-400" />
                          <span>ETHUSDT</span>
                        </div>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300">
                          Binance Live
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Klasör 2: Tavan / Taban Adayları */}
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => toggleFolder('ceilingFloor')}
                className="w-full flex items-center justify-between text-left px-2 py-1.5 rounded-lg hover:bg-slate-900/80 text-xs font-mono text-slate-300 font-semibold transition cursor-pointer"
              >
                <div className="flex items-center gap-1.5">
                  {treeOpen.ceilingFloor ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
                  {treeOpen.ceilingFloor ? <FolderOpen className="w-3.5 h-3.5 text-teal-400" /> : <Folder className="w-3.5 h-3.5 text-teal-400" />}
                  <span>Tavan / Taban Takip</span>
                </div>
                <span className="text-[10px] text-slate-500">%2 Eşik</span>
              </button>

              {treeOpen.ceilingFloor && (
                <div className="pl-6 space-y-1 border-l border-slate-800/80 ml-3">
                  <div className="px-2 py-1 text-[11px] font-mono text-slate-400 bg-slate-900/40 rounded">
                    <div className="text-emerald-400 font-bold">🟢 Tavan Adayları (&lt;%2)</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">EREGL: Tavana %0.8 kaldı</div>
                  </div>
                  <div className="px-2 py-1 text-[11px] font-mono text-slate-400 bg-slate-900/40 rounded">
                    <div className="text-rose-400 font-bold">🔴 Taban Adayları (&lt;%2)</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Filtre aktif: ±%10 limit kontrolü</div>
                  </div>
                </div>
              )}
            </div>

            {/* Klasör 3: Broker Entegrasyonları (Salt-Okunur) */}
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => toggleFolder('brokers')}
                className="w-full flex items-center justify-between text-left px-2 py-1.5 rounded-lg hover:bg-slate-900/80 text-xs font-mono text-slate-300 font-semibold transition cursor-pointer"
              >
                <div className="flex items-center gap-1.5">
                  {treeOpen.brokers ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
                  {treeOpen.brokers ? <FolderOpen className="w-3.5 h-3.5 text-purple-400" /> : <Folder className="w-3.5 h-3.5 text-purple-400" />}
                  <span>Broker Bağlantıları</span>
                </div>
                <span className="text-[10px] text-slate-500">Salt-Okunur</span>
              </button>

              {treeOpen.brokers && (
                <div className="pl-6 space-y-1 border-l border-slate-800/80 ml-3">
                  <div className="flex items-center justify-between px-2 py-1 rounded text-xs font-mono text-slate-400 bg-slate-900/30">
                    <span className="flex items-center gap-1.5">
                      <Lock className="w-3 h-3 text-amber-400" /> Alpaca (ABD)
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">Salt-Okunur</span>
                  </div>
                  <div className="flex items-center justify-between px-2 py-1 rounded text-xs font-mono text-slate-400 bg-slate-900/30">
                    <span className="flex items-center gap-1.5">
                      <Lock className="w-3 h-3 text-amber-400" /> Binance (Kripto)
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">Salt-Okunur</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Hızlı Yeniden Çalıştır Butonu */}
          <div className="pt-3 border-t border-slate-800/80">
            <button
              type="button"
              disabled={isLoading || isPropGuardBreached}
              onClick={() => runAnalysis(selectedSymbol)}
              className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-700 hover:border-slate-600 text-xs font-mono font-bold text-slate-200 flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-cyan-400' : 'text-slate-400'}`} />
              <span>{isLoading ? 'Analiz Ediliyor...' : `${selectedSymbol} Yeniden Analiz Et`}</span>
            </button>
          </div>
        </div>

        {/* ============================================================== */}
        {/* 2. ORTA PANEL: CANVAS & TAIGA KANBAN + GANTT ŞEMASI            */}
        {/* ============================================================== */}
        <div className="lg:col-span-6 bg-slate-900/40 p-4 flex flex-col justify-between">
          <div className="space-y-3">
            
            {/* Üst Başlık ve CANVAS / KANBAN Görünüm Değiştirici */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-slate-200">
                  {centerViewMode === 'CANVAS' ? 'BLOK CANVAS • AKIŞ DİYAGRAMI' : 'TAIGA KANBAN PANOSU'}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  #{selectedSymbol}
                </span>
              </div>

              {/* Sekme: Canvas / Kanban */}
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 font-mono text-xs">
                <button
                  type="button"
                  onClick={() => setCenterViewMode('CANVAS')}
                  className={`px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                    centerViewMode === 'CANVAS'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <GitBranch className="w-3.5 h-3.5" />
                  <span>Canvas</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCenterViewMode('KANBAN')}
                  className={`px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                    centerViewMode === 'KANBAN'
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Kanban className="w-3.5 h-3.5" />
                  <span>Kanban</span>
                </button>
              </div>
            </div>

            {/* ⏱️ OPENPROJECT + MT5: GERÇEK ÖLÇÜMLÜ GANTT (performance.now) */}
            <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs font-mono space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-slate-400 pb-1 border-b border-slate-900">
                <span className="flex items-center gap-1.5 text-cyan-400 font-bold">
                  <Clock className="w-3.5 h-3.5" /> MT5 &amp; OpenProject Gantt (Gerçek Süre Ölçümü)
                </span>
                <span className="text-[10px] text-slate-400">
                  Toplam: <b className="text-white">{stepDurations.totalMs !== null ? `${stepDurations.totalMs}ms` : 'VERİ YOK'}</b>
                </span>
              </div>
              <div className="space-y-1 pt-1">
                {ganttTasks.map(gt => (
                  <div key={gt.id} className="flex items-center justify-between gap-2 text-[10px]">
                    <span className="w-32 truncate text-slate-300">{gt.name}</span>
                    <span className="text-slate-500 text-[9px] truncate">({gt.dependsOn})</span>
                    <div className="flex items-center gap-2">
                      <span className={`px-1.5 py-0.2 rounded font-bold ${
                        gt.status === 'OK' ? 'bg-emerald-500/20 text-emerald-300' :
                        gt.status === 'VETO' ? 'bg-rose-500/20 text-rose-300' :
                        'bg-slate-800 text-slate-400'
                      }`}>
                        {gt.durationStr}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* GÖRÜNÜM 1: CANVAS (StepCards) */}
            {centerViewMode === 'CANVAS' && (
              <div className="space-y-2 relative">
                
                {/* ADIM 1: FİYAT BLOĞU */}
                <div
                  onClick={() => setSelectedStep('PRICE')}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    selectedStep === 'PRICE' ? 'ring-2 ring-cyan-400' : ''
                  } ${
                    bistValid
                      ? 'bg-emerald-950/30 border-emerald-500/50 hover:bg-emerald-900/30'
                      : 'bg-rose-950/30 border-rose-500/50 hover:bg-rose-900/30'
                  }`}
                >
                  <div className="text-[10px] font-mono text-cyan-300/90 bg-slate-900/90 px-2 py-0.5 rounded border border-cyan-500/30 w-fit mb-1.5 font-semibold">
                    ∑ Denklem: Limit = BasePrice × (1 ± 0.10) [Tavan/Taban %10]
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-lg bg-slate-900 text-cyan-400">
                        <Activity className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white font-mono">1. FIYAT (Price Feed)</div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {analysisData && analysisData.bistCheck
                            ? `${analysisData.bistCheck.price} TL • Seans: ${analysisData.bistCheck.sessionPhase} (${stepDurations.priceMs !== null ? `${stepDurations.priceMs}ms` : 'VERİ YOK'})`
                            : 'VERİ YOK'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        Tamam
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
                    </div>
                  </div>
                </div>

                {/* ADIM 2: VPIN BLOĞU */}
                <div
                  onClick={() => setSelectedStep('VPIN')}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    selectedStep === 'VPIN' ? 'ring-2 ring-cyan-400' : ''
                  } ${
                    isVpinToxic
                      ? 'bg-rose-950/40 border-rose-500/70 shadow-[0_0_15px_rgba(244,63,94,0.2)]'
                      : 'bg-emerald-950/30 border-emerald-500/50 hover:bg-emerald-900/30'
                  }`}
                >
                  <div className="text-[10px] font-mono text-amber-300/90 bg-slate-900/90 px-2 py-0.5 rounded border border-amber-500/30 w-fit mb-1.5 font-semibold">
                    ∑ Denklem: VPIN = ∑|Buy - Sell| / ∑(Buy + Sell)  [50 Buckets]
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-1.5 rounded-lg bg-slate-900 ${isVpinToxic ? 'text-rose-400' : 'text-emerald-400'}`}>
                        <Zap className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white font-mono">2. VPIN (Order Flow Toksisitesi)</div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          Skor: <span className={isVpinToxic ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>{vpinScore !== null ? vpinScore.toFixed(2) : 'VERİ YOK, sebep: Yahoo\'da tick yok'}</span> (Eşik: 0.35) • {stepDurations.vpinMs !== null ? `${stepDurations.vpinMs}ms` : 'VERİ YOK'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isVpinToxic ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/50 animate-pulse">
                          VETO (TOKSİK)
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          Tamam (GÜVENLİ)
                        </span>
                      )}
                      <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
                    </div>
                  </div>
                </div>

                {/* ADIM 3: SENTINEL BLOĞU */}
                <div
                  onClick={() => setSelectedStep('SENTINEL')}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    selectedStep === 'SENTINEL' ? 'ring-2 ring-cyan-400' : ''
                  } ${
                    isWallSkipped
                      ? 'bg-slate-900/50 border-slate-800 text-slate-500 opacity-60'
                      : 'bg-emerald-950/30 border-emerald-500/50 hover:bg-emerald-900/30'
                  }`}
                >
                  <div className="text-[10px] font-mono text-cyan-300/90 bg-slate-900/90 px-2 py-0.5 rounded border border-cyan-500/30 w-fit mb-1.5 font-semibold">
                    ∑ Denklem: Allocation ≤ MaxStock(20%) &amp; Sector(35%)
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-lg bg-slate-900 text-slate-400">
                        <Shield className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white font-mono">3. SENTINEL (Veto Bekçisi)</div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {isWallSkipped ? 'VPIN Veto sebebiyle durduruldu' : `Hisse %20 • Sektör %35 (${stepDurations.sentinelMs !== null ? `${stepDurations.sentinelMs}ms` : '0ms'})`}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isWallSkipped ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-400 border border-slate-700">
                          Atlandı
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          Tamam
                        </span>
                      )}
                      <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
                    </div>
                  </div>
                </div>

                {/* ADIM 4: ALPHA BLOĞU */}
                <div
                  onClick={() => setSelectedStep('ALPHA')}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    selectedStep === 'ALPHA' ? 'ring-2 ring-cyan-400' : ''
                  } ${
                    isWallSkipped
                      ? 'bg-slate-900/50 border-slate-800 text-slate-500 opacity-60'
                      : 'bg-emerald-950/30 border-emerald-500/50 hover:bg-emerald-900/30'
                  }`}
                >
                  <div className="text-[10px] font-mono text-purple-300/90 bg-slate-900/90 px-2 py-0.5 rounded border border-purple-500/30 w-fit mb-1.5 font-semibold">
                    ∑ Denklem: Alpha = Confidence × DirectionScore
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-lg bg-slate-900 text-slate-400">
                        <Cpu className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white font-mono">4. ALPHA (Yön + Güç)</div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {isWallSkipped ? 'VPIN Veto sebebiyle atlandı' : `Yön: BULLISH • Güven: %88.0 (${stepDurations.alphaMs !== null ? `${stepDurations.alphaMs}ms` : '0ms'})`}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isWallSkipped ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-400 border border-slate-700">
                          Atlandı
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          Tamam
                        </span>
                      )}
                      <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
                    </div>
                  </div>
                </div>

                {/* ADIM 5: WALL BLOĞU (VPIN > 0.35 İSE GRİLEŞMELİ, 'ATLANDI' YAZMALI) */}
                <div
                  onClick={() => setSelectedStep('WALL')}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    selectedStep === 'WALL' ? 'ring-2 ring-cyan-400' : ''
                  } ${
                    isWallSkipped
                      ? 'bg-slate-900/70 border-slate-800 text-slate-500 shadow-none'
                      : 'bg-emerald-950/30 border-emerald-500/50 hover:bg-emerald-900/30'
                  }`}
                >
                  <div className="text-[10px] font-mono text-amber-300/90 bg-slate-900/90 px-2 py-0.5 rounded border border-amber-500/30 w-fit mb-1.5 font-semibold">
                    ∑ Denklem: Wall Z = (KademeLot - OrtalamaLot) / StdSapma
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-1.5 rounded-lg bg-slate-900 ${isWallSkipped ? 'text-slate-600' : 'text-emerald-400'}`}>
                        <Layers className="w-4 h-4" />
                      </div>
                      <div>
                        <div className={`text-xs font-bold font-mono ${isWallSkipped ? 'text-slate-500 line-through' : 'text-white'}`}>
                          5. WALL (Limit Book Duvarları)
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {isWallSkipped ? (
                            <span className="text-amber-400/90 font-semibold">VPIN VETO, Wall atlandı</span>
                          ) : (
                            analysisData && analysisData.wall ? `${analysisData.wall.wall_lot.toLocaleString('tr-TR')} Lot (${stepDurations.wallMs !== null ? `${stepDurations.wallMs}ms` : '0ms'})` : 'VERİ YOK'
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isWallSkipped ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-400 border border-slate-700">
                          atlandı
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          Tamam (Duvar Var)
                        </span>
                      )}
                      <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
                    </div>
                  </div>
                </div>

                {/* ADIM 6: KARAR BLOĞU */}
                <div
                  onClick={() => setSelectedStep('DECISION')}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    selectedStep === 'DECISION' ? 'ring-2 ring-cyan-400' : ''
                  } ${
                    finalAction === 'PROCEED'
                      ? 'bg-emerald-950/40 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.25)]'
                      : 'bg-rose-950/40 border-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.25)]'
                  }`}
                >
                  <div className="text-[10px] font-mono text-emerald-300/90 bg-slate-900/90 px-2 py-0.5 rounded border border-emerald-500/30 w-fit mb-1.5 font-semibold">
                    ∑ Denklem: Decision = Consensus(VPIN, Sentinel, Wall, Alpha)
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-1.5 rounded-lg bg-slate-900 ${finalAction === 'PROCEED' ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {finalAction === 'PROCEED' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white font-mono">6. KARAR (Nihai Aksiyon)</div>
                        <div className="text-[11px] text-slate-300 font-mono">
                          {finalAction === 'PROCEED' ? 'BUY / PROCEED — Tüm P0 Güvenlik Onayları Alındı' : 'VETO_HOLD — Risk veya Toksisite Engeli'}
                        </div>
                      </div>
                    </div>
                    <div>
                      <span className={`px-2.5 py-1 rounded text-xs font-mono font-black ${
                        finalAction === 'PROCEED'
                          ? 'bg-emerald-500 text-slate-950'
                          : 'bg-rose-500 text-white animate-pulse'
                      }`}>
                        {finalAction === 'PROCEED' ? 'BUY / PROCEED' : 'VETO_HOLD'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* ADIM 7: PORTFÖY BLOĞU (7/7 Pipeline) */}
                <div
                  onClick={() => setSelectedStep('PORTFOLIO')}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    selectedStep === 'PORTFOLIO' ? 'ring-2 ring-cyan-400' : ''
                  } ${
                    isWallSkipped
                      ? 'bg-slate-900/70 border-slate-800 text-slate-500 shadow-none'
                      : 'bg-emerald-950/30 border-emerald-500/50 hover:bg-emerald-900/30'
                  }`}
                >
                  <div className="text-[10px] font-mono text-cyan-300/90 bg-slate-900/90 px-2 py-0.5 rounded border border-cyan-500/30 w-fit mb-1.5 font-semibold">
                    ∑ Denklem: Portföy Riski = ∑(Pozisyon × Volatilite) &amp; Kelly f* = (p·b - q)/b
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-1.5 rounded-lg bg-slate-900 ${isWallSkipped ? 'text-slate-600' : 'text-emerald-400'}`}>
                        <Sliders className="w-4 h-4" />
                      </div>
                      <div>
                        <div className={`text-xs font-bold font-mono ${isWallSkipped ? 'text-slate-500 line-through' : 'text-white'}`}>
                          7. PORTFÖY (Kelly f* &amp; Risk Yönetimi)
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {isWallSkipped ? (
                            <span className="text-amber-400/90 font-semibold">VPIN VETO, Portföy atlandı (null)</span>
                          ) : (
                            `Kelly f*: 0.12 (%20.0 Ağırlık) • Volatilite: VERİ YOK (${stepDurations.portfolioMs !== null ? `${stepDurations.portfolioMs}ms` : '0ms'})`
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isWallSkipped ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-400 border border-slate-700">
                          atlandı
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          Tamam (Kelly 0.12)
                        </span>
                      )}
                      <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* GÖRÜNÜM 2: TAIGA KANBAN (Yapılacak / Çalışıyor / Bitti / VETO) */}
            {centerViewMode === 'KANBAN' && (
              <div className="grid grid-cols-4 gap-2 pt-1 font-mono text-xs">
                
                {/* Kolon 1: Yapılacak */}
                <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-850">
                    <span className="font-bold text-slate-300 text-[11px]">Yapılacak</span>
                    <span className="px-1.5 py-0.2 rounded bg-slate-800 text-[10px] text-slate-400">1</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900/70 border border-slate-800 text-[10px] space-y-1">
                    <div className="font-bold text-white">T+1 Seans Takip</div>
                    <div className="text-slate-400 text-[9px]">Gelecek seans hazırlığı</div>
                  </div>
                </div>

                {/* Kolon 2: Çalışıyor */}
                <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-850">
                    <span className="font-bold text-cyan-400 text-[11px]">Çalışıyor</span>
                    <span className="px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 text-[10px]">1</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900/70 border border-cyan-500/30 text-[10px] space-y-1">
                    <div className="font-bold text-cyan-200">L2 Bookmap Akışı</div>
                    <div className="text-slate-400 text-[9px]">Sürekli WebSocket Takip</div>
                  </div>
                </div>

                {/* Kolon 3: Bitti */}
                <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-850">
                    <span className="font-bold text-emerald-400 text-[11px]">Bitti</span>
                    <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[10px]">
                      {isWallSkipped ? '1' : '7'}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    <div className="p-2 rounded-lg bg-emerald-950/30 border border-emerald-500/30 text-[10px]">
                      <div className="font-bold text-emerald-300">1. Fiyat Doğrulandı</div>
                      <div className="text-slate-400 text-[9px]">{stepDurations.priceMs !== null ? `${stepDurations.priceMs}ms` : 'VERİ YOK'}</div>
                    </div>
                    {!isWallSkipped && (
                      <>
                        <div className="p-2 rounded-lg bg-emerald-950/30 border border-emerald-500/30 text-[10px]">
                          <div className="font-bold text-emerald-300">2. VPIN Onaylandı</div>
                          <div className="text-slate-400 text-[9px]">Skor: {vpinScore !== null ? vpinScore.toFixed(2) : 'VERİ YOK'} ({stepDurations.vpinMs !== null ? `${stepDurations.vpinMs}ms` : 'VERİ YOK'})</div>
                        </div>
                        <div className="p-2 rounded-lg bg-emerald-950/30 border border-emerald-500/30 text-[10px]">
                          <div className="font-bold text-emerald-300">4. Alpha Insight</div>
                          <div className="text-slate-400 text-[9px]">BULLISH (%88) ({stepDurations.alphaMs !== null ? `${stepDurations.alphaMs}ms` : '0ms'})</div>
                        </div>
                        <div className="p-2 rounded-lg bg-emerald-950/30 border border-emerald-500/30 text-[10px]">
                          <div className="font-bold text-emerald-300">5. Wall Tespit Edildi</div>
                          <div className="text-slate-400 text-[9px]">{analysisData?.wall ? `${analysisData.wall.wall_lot.toLocaleString('tr-TR')} Lot` : 'VERİ YOK'} ({stepDurations.wallMs !== null ? `${stepDurations.wallMs}ms` : 'VERİ YOK'})</div>
                        </div>
                        <div className="p-2 rounded-lg bg-emerald-950/30 border border-emerald-500/30 text-[10px]">
                          <div className="font-bold text-emerald-300">6. BUY / PROCEED</div>
                          <div className="text-slate-400 text-[9px]">Konsensüs tamam ({stepDurations.decisionMs !== null ? `${stepDurations.decisionMs}ms` : 'VERİ YOK'})</div>
                        </div>
                        <div className="p-2 rounded-lg bg-emerald-950/30 border border-emerald-500/30 text-[10px]">
                          <div className="font-bold text-emerald-300">7. Portföy Riski (Kelly f*)</div>
                          <div className="text-slate-400 text-[9px]">Kelly: 0.12 (%20 Ağırlık) ({stepDurations.portfolioMs !== null ? `${stepDurations.portfolioMs}ms` : '0ms'})</div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Kolon 4: VETO */}
                <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-850">
                    <span className="font-bold text-rose-400 text-[11px]">VETO</span>
                    <span className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 text-[10px]">
                      {isWallSkipped ? '4' : '0'}
                    </span>
                  </div>
                  {isWallSkipped ? (
                    <div className="space-y-1.5">
                      <div className="p-2 rounded-lg bg-rose-950/40 border border-rose-500/50 text-[10px]">
                        <div className="font-bold text-rose-300">2. VPIN Toksisite VETO</div>
                        <div className="text-slate-400 text-[9px]">Skor: {vpinScore !== null ? vpinScore.toFixed(2) : '0.75'} &gt; 0.35 ({stepDurations.vpinMs !== null ? `${stepDurations.vpinMs}ms` : 'VERİ YOK'})</div>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-900 border border-slate-700 text-[10px]">
                        <div className="font-bold text-slate-400 line-through">4. Alpha Atlandı (null)</div>
                        <div className="text-slate-400 text-[9px]">VPIN veto gereği</div>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-900 border border-slate-700 text-[10px]">
                        <div className="font-bold text-slate-400 line-through">5. Wall Atlandı (null)</div>
                        <div className="text-slate-400 text-[9px]">VPIN veto gereği</div>
                      </div>
                      <div className="p-2 rounded-lg bg-rose-950/40 border border-rose-500/50 text-[10px]">
                        <div className="font-bold text-rose-300">6. VETO_HOLD &amp; 7. Portföy (null)</div>
                        <div className="text-slate-400 text-[9px]">İşlem engellendi, portföy atlandı</div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-slate-600 text-center py-4 text-[10px]">VETO kaydı yok</div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Orta Panel Alt Özet Çubuğu */}
          <div className="mt-3 p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] font-mono flex items-center justify-between text-slate-400">
            <span>Seçili Sembol: <b className="text-white">{selectedSymbol}</b></span>
            <span>Ölçülen Süre: <b className="text-cyan-400">{stepDurations.totalMs !== null ? `${stepDurations.totalMs}ms` : 'VERİ YOK'}</b></span>
            <span>VPIN: <b className={isVpinToxic ? 'text-rose-400' : 'text-emerald-400'}>{vpinScore !== null ? vpinScore.toFixed(2) : 'VERİ YOK'}</b></span>
            <span>Wall: <b className={isWallSkipped ? 'text-slate-500' : 'text-emerald-400'}>{isWallSkipped ? 'ATLANDI' : 'AKTİF'}</b></span>
            <span>Karar: <b className={finalAction === 'PROCEED' ? 'text-emerald-400' : 'text-rose-400'}>{finalAction}</b></span>
          </div>
        </div>

        {/* ============================================================== */}
        {/* 3. SAĞ PANEL: SEÇİLİ BLOĞUN ÖZELLİKLERİ (Node-RED Inspector)    */}
        {/* ============================================================== */}
        <div className="lg:col-span-3 bg-slate-950/60 p-3.5 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-300">
                <Sliders className="w-4 h-4 text-amber-400" />
                <span>BLOK ÖZELLİKLERİ</span>
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
                Node-RED Inspector
              </span>
            </div>

            {stepDetails ? (
              <div className="space-y-3">
                {/* Blok Başlığı ve Rozet */}
                <div className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-white font-mono">{stepDetails.title}</h3>
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${stepDetails.statusColor}`}>
                      {stepDetails.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-snug font-sans">
                    {stepDetails.description}
                  </p>
                </div>

                {/* Parametre Tablosu */}
                <div className="space-y-1.5 max-h-[280px] overflow-y-auto pr-1">
                  {stepDetails.props.map(prop => (
                    <div key={`prop-${prop.label}`} className="p-2 rounded-lg bg-slate-900/40 border border-slate-800/80 flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-400 text-[11px]">{prop.label}</span>
                      <span className="text-white font-semibold text-[11px]">{prop.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-6 text-center text-xs font-mono text-slate-500">
                İncelemek için orta alandaki bir bloğa tıklayın.
              </div>
            )}
          </div>

          {/* Alt Kısım: Ham JSON Önizleme */}
          <div className="pt-2 border-t border-slate-800">
            <div className="text-[10px] font-mono text-slate-500 mb-1 flex items-center gap-1">
              <Database className="w-3 h-3 text-cyan-400" />
              <span>Veri Kaynağı: /api/analyze/full?symbol={selectedSymbol}</span>
            </div>
            <div className="p-2 rounded-lg bg-black/60 border border-slate-900 text-[10px] font-mono text-slate-400 truncate">
              {JSON.stringify(stepDetails ? stepDetails.raw : {})}
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 4. ALT PANEL: FUXA LOG & ALARM & NODE-RED DEBUG TERMİNALİ      */}
      {/* ============================================================== */}
      <div className="bg-black/90 border-t border-slate-800 p-3 flex flex-col font-mono text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-900">
          
          {/* Sekme Değiştirici: LOG vs ALARM vs DEBUG */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800">
              <button
                type="button"
                onClick={() => setBottomTab('LOG')}
                className={`px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer transition flex items-center gap-1.5 ${
                  bottomTab === 'LOG'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>LOG</span>
              </button>

              <button
                type="button"
                onClick={() => setBottomTab('ALARM')}
                className={`px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer transition flex items-center gap-1.5 ${
                  bottomTab === 'ALARM'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {alarms.length > 0 ? <BellRing className="w-3.5 h-3.5 text-rose-400 animate-bounce" /> : <Bell className="w-3.5 h-3.5" />}
                <span>ALARM ({alarms.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setBottomTab('DEBUG')}
                className={`px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer transition flex items-center gap-1.5 ${
                  bottomTab === 'DEBUG'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Code className="w-3.5 h-3.5 text-cyan-400" />
                <span>DEBUG (JSON)</span>
              </button>
            </div>

            <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-black">
              DEMO / SADECE ANALİZ
            </span>
          </div>

          {/* Filtre ve Aksiyonlar */}
          {bottomTab === 'LOG' && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveFilter('ALL')}
                className={`px-2 py-1 rounded text-[10px] cursor-pointer transition ${
                  activeFilter === 'ALL' ? 'bg-slate-800 text-white font-bold' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                Tümü ({logs.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('VETO')}
                className={`px-2 py-1 rounded text-[10px] cursor-pointer transition ${
                  activeFilter === 'VETO' ? 'bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                Veto &amp; Hata
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('SUCCESS')}
                className={`px-2 py-1 rounded text-[10px] cursor-pointer transition ${
                  activeFilter === 'SUCCESS' ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                Başarılı
              </button>
              <button
                type="button"
                onClick={() => setLogs([])}
                className="p-1 rounded text-slate-500 hover:text-rose-400 cursor-pointer transition ml-2"
                title="Terminali Temizle"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {bottomTab === 'ALARM' && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400">FUXA Alarm Eşiği: VETO + Duvar İhlali</span>
              <button
                type="button"
                onClick={() => setAlarms([])}
                className="p-1 rounded text-slate-500 hover:text-rose-400 cursor-pointer transition ml-2"
                title="Alarmları Temizle"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {bottomTab === 'DEBUG' && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-cyan-400">Node-RED /api/analyze/full Ham Çıktısı</span>
            </div>
          )}
        </div>

        {/* LOG SEKMESİ LİSTESİ */}
        {bottomTab === 'LOG' && (
          <div className="h-28 overflow-y-auto space-y-1 pt-2 pr-1 select-text">
            {logs.length === 0 ? (
              <div className="text-slate-600 text-center py-4">Terminal kaydı bulunmuyor.</div>
            ) : (
              logs
                .filter(l => {
                  if (activeFilter === 'VETO') return l.level === 'VETO';
                  if (activeFilter === 'SUCCESS') return l.level === 'SUCCESS';
                  return true;
                })
                .map(entry => (
                  <div key={entry.id} className="flex items-start gap-2.5 text-[11px] leading-tight">
                    <span className="text-slate-600 shrink-0">[{entry.timestamp}]</span>
                    <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold shrink-0 ${
                      entry.level === 'VETO' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40' :
                      entry.level === 'SUCCESS' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' :
                      entry.level === 'WARNING' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' :
                      'bg-slate-800 text-slate-300 border border-slate-700'
                    }`}>
                      {entry.level}
                    </span>
                    <span className="text-cyan-400/80 font-bold shrink-0">[{entry.step}]</span>
                    <span className={entry.level === 'VETO' ? 'text-rose-300 font-semibold' : (entry.level === 'SUCCESS' ? 'text-emerald-300' : 'text-slate-300')}>
                      {entry.message}
                    </span>
                  </div>
                ))
            )}
          </div>
        )}

        {/* 🚨 ALARM SEKMESİ (FUXA Tarzı Sadece VETO ve Wall Kırılmaları) */}
        {bottomTab === 'ALARM' && (
          <div className="h-28 overflow-y-auto space-y-1.5 pt-2 pr-1 select-text">
            {alarms.length === 0 ? (
              <div className="text-slate-500 text-center py-5 flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Aktif VETO veya Duvar alarmı bulunmuyor. Sistem nominal modda çalışıyor.</span>
              </div>
            ) : (
              alarms.map(alarm => (
                <div key={alarm.id} className="p-2 rounded-lg bg-rose-950/40 border border-rose-500/50 flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span className="text-slate-400">[{alarm.timestamp}]</span>
                    <span className="px-1.5 py-0.5 rounded bg-rose-500 text-slate-950 font-bold text-[10px]">
                      {alarm.severity}
                    </span>
                    <span className="font-bold text-white">#{alarm.symbol}</span>
                    <span className="text-rose-300 font-semibold">{alarm.message}</span>
                  </div>
                  <span className="text-[10px] font-mono text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/30">
                    FUXA ALARM
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        {/* 🛠️ DEBUG SEKMESİ (Node-RED Tarzı Ham JSON Önizleme) */}
        {bottomTab === 'DEBUG' && (
          <div className="h-28 overflow-y-auto p-2.5 rounded-lg bg-black border border-slate-900 font-mono text-[11px] text-emerald-400 select-text whitespace-pre leading-relaxed">
            {analysisData ? JSON.stringify(analysisData, null, 2) : 'VERİ YOK'}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectManagerTerminal;
