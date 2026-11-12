// src/components/CryptoDerivativesIntelligenceCard.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  Flame,
  Activity,
  ShieldAlert,
  Clock,
  TrendingUp,
  TrendingDown,
  Gauge,
  Percent,
  Layers,
  RefreshCw,
  Coins,
  ArrowRightLeft,
  AlertTriangle,
  Info
} from 'lucide-react';
import { logDataIssue } from '../utils/dataAudit';

export interface CryptoDerivativesData {
  pair: string;
  symbol: string;
  markPrice: number;
  indexPrice: number;
  lastFundingRate: number;
  fundingRatePct: number;
  annualizedFundingApy: number;
  nextFundingTime: number;
  fundingCountdownSeconds: number;
  fundingRegime: 'BULLISH_CROWDED' | 'BALANCED' | 'SHORT_SQUEEZE_RISK';
  openInterest: number;
  openInterestUsd: number;
  longAccountPct: number;
  shortAccountPct: number;
  longShortRatio: number;
  spotPrice: number;
  basisSpreadPct: number;
  annualizedBasisApy: number;
  shortLiquidationWall: number;
  longLiquidationCascade: number;
  cascadeRisk: 'LOW' | 'ELEVATED' | 'HIGH' | 'CRITICAL';
  timestamp: string;
}

export interface FearAndGreedData {
  score: number;
  classification: string;
  history: Array<{ value: number; classification: string; timestamp: number }>;
  updatedAt: string;
}

export interface CryptoDerivativesIntelligenceCardProps {
  pair: string;
  className?: string;
}

export const CryptoDerivativesIntelligenceCard: React.FC<CryptoDerivativesIntelligenceCardProps> = ({
  pair,
  className = '',
}) => {
  const [derivatives, setDerivatives] = useState<CryptoDerivativesData | null>(null);
  const [fng, setFng] = useState<FearAndGreedData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [countdown, setCountdown] = useState<number>(0);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const fetchData = useCallback(async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    try {
      const [derivRes, fngRes] = await Promise.all([
        fetch(`/api/crypto/derivatives/${pair}`),
        fetch('/api/crypto/sentiment/fng'),
      ]);

      if (derivRes.ok) {
        const json = await derivRes.json();
        if (json.success && json.data) {
          setDerivatives(json.data);
          if (typeof json.data.fundingCountdownSeconds === 'number') {
            setCountdown(json.data.fundingCountdownSeconds);
          }
        }
      } else {
        logDataIssue('CryptoDerivatives', pair, 'derivatives', 'Non-200 response');
      }

      if (fngRes.ok) {
        const json = await fngRes.json();
        if (json.success && json.data) {
          setFng(json.data);
        }
      }
    } catch (err: any) {
      logDataIssue('CryptoDerivatives', pair, 'fetch', err?.message);
    } finally {
      setLoading(false);
      if (isManual) setIsRefreshing(false);
    }
  }, [pair]);

  useEffect(() => {
    setLoading(true);
    fetchData();
    const interval = setInterval(() => {
      fetchData();
    }, 10000);

    return () => clearInterval(interval);
  }, [fetchData]);

  // Canlı Geri Sayım Zamanlayıcısı (Her saniye 1 azalt)
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatCountdown = (secs: number): string => {
    if (typeof secs !== 'number' || isNaN(secs) || secs <= 0) return '00:00:00';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const safeNum = (v: unknown): number | null => {
    return typeof v === 'number' && !isNaN(v) ? v : null;
  };

  const fundingPct = safeNum(derivatives?.fundingRatePct);
  const apy = safeNum(derivatives?.annualizedFundingApy);
  const markPrice = safeNum(derivatives?.markPrice);
  const oiUsd = safeNum(derivatives?.openInterestUsd);
  const longPct = safeNum(derivatives?.longAccountPct);
  const shortPct = safeNum(derivatives?.shortAccountPct);
  const lsRatio = safeNum(derivatives?.longShortRatio);
  const basisSpread = safeNum(derivatives?.basisSpreadPct);
  const shortLiq = safeNum(derivatives?.shortLiquidationWall);
  const longLiq = safeNum(derivatives?.longLiquidationCascade);
  const fngScore = safeNum(fng?.score);

  return (
    <div className={`bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl backdrop-blur-md space-y-4 ${className}`}>
      {/* BAŞLIK & BİLGİ */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
            <Flame className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-white font-mono uppercase tracking-wider">
                Kripto Türev &amp; Fonlama İstihbaratı
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-950 border border-amber-500/30 text-amber-300">
                {pair}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
                Binance USDS-M
              </span>
            </div>
            <p className="text-[10px] text-slate-400">
              Coinglass &amp; Binance Vadeli: Fonlama Oranı, Long/Short Oranı, Açık Faiz (OI) &amp; Likidasyon Isı Kümesi
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {derivatives?.cascadeRisk === 'HIGH' || derivatives?.cascadeRisk === 'CRITICAL' ? (
            <span className="px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[11px] font-mono font-bold flex items-center gap-1.5 animate-pulse">
              <ShieldAlert className="w-3.5 h-3.5" />
              Kaskad / Squeeze Riski
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] font-mono font-bold flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5" />
              Dengeli Türev Akışı
            </span>
          )}
          <button
            type="button"
            onClick={() => fetchData(true)}
            className={`p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-white transition ${
              isRefreshing ? 'animate-spin' : ''
            }`}
            title="Yenile"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {loading && !derivatives ? (
        <div className="py-8 text-center text-xs font-mono text-slate-400 animate-pulse">
          Binance USDS-M türev verisi yükleniyor...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* PANEL 1: Fonlama Oranı (Funding Rate) & Carry Arbitrajı */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200 font-mono">
                <Percent className="w-3.5 h-3.5 text-amber-400" />
                <span>1. Fonlama Oranı (8s)</span>
              </div>
              <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3 text-cyan-400" />
                {formatCountdown(countdown)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-400">8 Saatlik Oran</div>
                <div
                  className={`text-sm font-black mt-0.5 ${
                    fundingPct !== null
                      ? fundingPct > 0.015
                        ? 'text-rose-400'
                        : fundingPct < -0.005
                        ? 'text-emerald-400'
                        : 'text-amber-300'
                      : 'text-slate-400'
                  }`}
                >
                  {fundingPct !== null ? `${fundingPct >= 0 ? '+' : ''}${fundingPct.toFixed(4)}%` : 'VERİ YOK'}
                </div>
              </div>

              <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-400">Yıllık Getiri (APY)</div>
                <div className="text-sm font-black text-purple-300 mt-0.5">
                  {apy !== null ? `%${apy.toFixed(2)}` : 'VERİ YOK'}
                </div>
              </div>
            </div>

            <div className="space-y-1 text-[10px] font-mono text-slate-400">
              <div className="flex items-center justify-between">
                <span>Piyasa Eğilimi:</span>
                <span
                  className={`font-bold ${
                    derivatives?.fundingRegime === 'BULLISH_CROWDED'
                      ? 'text-rose-400'
                      : derivatives?.fundingRegime === 'SHORT_SQUEEZE_RISK'
                      ? 'text-emerald-400'
                      : 'text-slate-300'
                  }`}
                >
                  {derivatives?.fundingRegime === 'BULLISH_CROWDED'
                    ? '🔥 Longlar Yoğun (Fonlama Ödüyor)'
                    : derivatives?.fundingRegime === 'SHORT_SQUEEZE_RISK'
                    ? '⚡ Short Sıkışma Riski (Shortlar Ödüyor)'
                    : '⚖️ Dengeli Fonlama'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Sonraki Uzlaşma:</span>
                <span className="text-slate-300 font-bold">
                  {derivatives?.nextFundingTime
                    ? new Date(derivatives.nextFundingTime).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
                    : 'VERİ YOK'}
                </span>
              </div>
            </div>
          </div>

          {/* PANEL 2: Global Long / Short Oranı (Trader Positioning) */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200 font-mono">
                <Coins className="w-3.5 h-3.5 text-cyan-400" />
                <span>2. Global Long / Short Oranı</span>
              </div>
              <span className="text-[10px] font-mono text-cyan-300 font-bold">
                {lsRatio !== null ? `${lsRatio.toFixed(2)}x` : 'VERİ YOK'}
              </span>
            </div>

            {/* Split Progress Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-mono font-bold">
                <span className="text-emerald-400 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> %{longPct !== null ? longPct.toFixed(1) : '50.0'} Long
                </span>
                <span className="text-rose-400 flex items-center gap-1">
                  %{shortPct !== null ? shortPct.toFixed(1) : '50.0'} Short <TrendingDown className="w-3 h-3" />
                </span>
              </div>
              <div className="h-2.5 w-full bg-slate-900 rounded-full overflow-hidden flex border border-slate-800">
                <div
                  className="bg-emerald-500 transition-all duration-500"
                  style={{ width: `${longPct !== null ? Math.min(100, Math.max(0, longPct)) : 50}%` }}
                />
                <div
                  className="bg-rose-500 transition-all duration-500"
                  style={{ width: `${shortPct !== null ? Math.min(100, Math.max(0, shortPct)) : 50}%` }}
                />
              </div>
            </div>

            <div className="space-y-1 text-[10px] font-mono text-slate-400 pt-1">
              <div className="flex items-center justify-between">
                <span>Açık Faiz (Notional OI):</span>
                <span className="text-slate-200 font-bold">
                  {oiUsd !== null ? `$${(oiUsd / 1_000_000).toFixed(1)}M` : 'VERİ YOK'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Kitle Pozisyonlanması:</span>
                <span
                  className={`font-bold ${
                    longPct !== null && longPct > 60
                      ? 'text-emerald-400'
                      : shortPct !== null && shortPct > 60
                      ? 'text-rose-400'
                      : 'text-slate-300'
                  }`}
                >
                  {longPct !== null && longPct > 60
                    ? 'Boğa Ağırlıklı'
                    : shortPct !== null && shortPct > 60
                    ? 'Ayı Ağırlıklı'
                    : 'Nötr / Dengeli'}
                </span>
              </div>
            </div>
          </div>

          {/* PANEL 3: Likidasyon Kümeleri & Basis Arbitrajı */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200 font-mono">
                <ArrowRightLeft className="w-3.5 h-3.5 text-purple-400" />
                <span>3. Likidasyon &amp; Basis Spread</span>
              </div>
              <span className="text-[10px] font-mono text-purple-300">
                Fark: {basisSpread !== null ? `${basisSpread >= 0 ? '+' : ''}${basisSpread.toFixed(3)}%` : 'VERİ YOK'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-400">Short Likidasyon Duvarı</div>
                <div className="text-xs font-black text-rose-300 mt-0.5">
                  {shortLiq !== null ? `$${shortLiq.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : 'VERİ YOK'}
                </div>
              </div>

              <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-400">Long Kaskad Seviyesi</div>
                <div className="text-xs font-black text-emerald-300 mt-0.5">
                  {longLiq !== null ? `$${longLiq.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : 'VERİ YOK'}
                </div>
              </div>
            </div>

            <div className="space-y-1 text-[10px] font-mono text-slate-400">
              <div className="flex items-center justify-between">
                <span>Mark / Gösterge Fiyat:</span>
                <span className="text-slate-200 font-bold">
                  {markPrice !== null ? `$${markPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : 'VERİ YOK'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Kaskad / Tasfiye Riski:</span>
                <span
                  className={`font-bold ${
                    derivatives?.cascadeRisk === 'HIGH' || derivatives?.cascadeRisk === 'CRITICAL'
                      ? 'text-rose-400'
                      : derivatives?.cascadeRisk === 'ELEVATED'
                      ? 'text-amber-400'
                      : 'text-emerald-400'
                  }`}
                >
                  {derivatives?.cascadeRisk || 'DÜŞÜK'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ALT BAR: Canlı Alternative.me Korku & Açgözlülük Göstergesi */}
      {fng && (
        <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400">
              <Gauge className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-200">Kripto Korku &amp; Açgözlülük Endeksi (Fear &amp; Greed):</span>
                <span
                  className={`font-black px-2 py-0.5 rounded text-[11px] ${
                    fngScore !== null
                      ? fngScore >= 75
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : fngScore >= 55
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                        : fngScore >= 45
                        ? 'bg-slate-800 text-slate-300'
                        : fngScore >= 25
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      : 'text-slate-400'
                  }`}
                >
                  {fngScore !== null ? `${fngScore}/100` : 'VERİ YOK'} ({fng.classification})
                </span>
              </div>
              <p className="text-[10px] text-slate-400">
                Canlı piyasa duygu endeksi • Son Güncelleme: {fng.updatedAt}
              </p>
            </div>
          </div>

          {/* Geçmiş 7 Günlük Haplar */}
          {Array.isArray(fng.history) && fng.history.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto">
              <span className="text-[10px] text-slate-500 mr-1">Geçmiş:</span>
              {fng.history.slice(0, 7).map((h, i) => (
                <div
                  key={i}
                  className="px-2 py-1 rounded bg-slate-900 border border-slate-800 text-[10px] text-center"
                  title={`${h.classification} (${new Date(h.timestamp).toLocaleDateString('tr-TR')})`}
                >
                  <div
                    className={`font-bold ${
                      h.value >= 75
                        ? 'text-emerald-400'
                        : h.value >= 55
                        ? 'text-cyan-400'
                        : h.value >= 45
                        ? 'text-slate-300'
                        : h.value >= 25
                        ? 'text-amber-400'
                        : 'text-rose-400'
                    }`}
                  >
                    {h.value}
                  </div>
                  <div className="text-[9px] text-slate-500">
                    {i === 0 ? 'Bugün' : `-${i}g`}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CryptoDerivativesIntelligenceCard;
