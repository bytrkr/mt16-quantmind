// src/components/ForensicRedFlagCard.tsx
import React, { useMemo } from 'react';
import { ShieldAlert, CheckCircle2, AlertTriangle, FileText, Activity } from 'lucide-react';
import { MarketGatewaySnapshot } from '../services/marketGateway';
import { runAnomalyEngine, runBoardEngine, runForensicEngine } from '../utils/tacticalCollector';

export interface ForensicRedFlagCardProps {
  snapshot?: MarketGatewaySnapshot;
  ticker?: string;
  marketType?: 'BIST' | 'CRYPTO' | 'NASDAQ' | 'FOREX';
  className?: string;
}

export const ForensicRedFlagCard: React.FC<ForensicRedFlagCardProps> = ({
  snapshot,
  ticker = 'ASELS',
  marketType = 'BIST',
  className = '',
}) => {
  const price = snapshot?.price && snapshot.price > 0 ? snapshot.price : 100.0;
  const zScore = snapshot?.liveZScore ?? 0.0;
  const obi = snapshot?.liveObi ?? 0.0;

  // Forensic Engine adli bilanço ve spoofing taraması
  const forensic = useMemo(() => {
    const collectorInput = {
      symbol: ticker,
      marketType: marketType === 'FOREX' ? 'BIST' : marketType,
      price,
      changePct: snapshot?.dayChangePct ?? 0,
      zScore,
      obi,
      piotroskiF: snapshot?.piotroskiF ?? 7,
      altmanZ: snapshot?.altmanZ ?? 2.65,
    };
    const anomaly = runAnomalyEngine(collectorInput, marketType === 'BIST' ? 1.8 : 2.0);
    const board = runBoardEngine(collectorInput);
    return runForensicEngine(collectorInput, anomaly, board);
  }, [ticker, marketType, price, zScore, obi, snapshot]);

  const piotroskiF = snapshot?.piotroskiF ?? 7;
  const isHighRisk = forensic.riskScore >= 50;

  return (
    <div
      className={`bg-slate-900 border rounded-2xl p-5 shadow-xl flex flex-col justify-between transition-all duration-300 ${
        isHighRisk
          ? 'border-rose-500 bg-rose-950/20 ring-2 ring-rose-500/30 shadow-[0_0_30px_rgba(244,63,94,0.2)]'
          : 'border-slate-800'
      } ${className}`}
    >
      <div>
        {/* Başlık ve Rozet */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h2 className="text-xs font-black text-slate-200 uppercase tracking-wider flex items-center gap-2">
            {isHighRisk ? (
              <ShieldAlert className="w-4 h-4 text-rose-400 animate-pulse" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            )}
            Adli Bilanço & Red-Flag Kalkanı
          </h2>

          {isHighRisk ? (
            <span className="px-2.5 py-1 rounded text-[10px] font-mono font-black bg-rose-500/20 text-rose-300 border border-rose-500/50 flex items-center gap-1 animate-pulse">
              <AlertTriangle className="w-3 h-3 text-rose-400" /> 🔴 SPK / ADLİ RİSK BAYRAĞI
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" /> 🟢 TEMİZ BİLANÇO & TAHTA
            </span>
          )}
        </div>

        {/* Adli Metrik Kartları Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3 font-mono text-xs">
          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80">
            <div className="text-[10px] text-slate-400">Beneish M-Skor</div>
            <div className={`font-extrabold text-sm ${forensic.beneishMScore > -1.78 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {forensic.beneishMScore}
            </div>
            <div className="text-[9px] text-slate-500">{forensic.beneishMScore > -1.78 ? 'Kazanç Manipülasyon Şüphesi' : 'Manipülasyon Yok'}</div>
          </div>

          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80">
            <div className="text-[10px] text-slate-400">Piotroski F-Skor</div>
            <div className={`font-extrabold text-sm ${piotroskiF >= 6 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {piotroskiF}/9
            </div>
            <div className="text-[9px] text-slate-500">{piotroskiF >= 6 ? 'Mali Bünye Güçlü' : 'Zayıf Bilanço'}</div>
          </div>

          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80">
            <div className="text-[10px] text-slate-400">Wash Trade Oranı</div>
            <div className={`font-extrabold text-sm ${forensic.washTradeRatio >= 30 ? 'text-rose-400' : 'text-cyan-400'}`}>
              %{forensic.washTradeRatio}
            </div>
            <div className="text-[9px] text-slate-500">Sahte Hacim Döndürme</div>
          </div>

          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80">
            <div className="text-[10px] text-slate-400">Adli Risk Skoru</div>
            <div className={`font-extrabold text-sm ${forensic.riskScore >= 50 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {forensic.riskScore}/100
            </div>
            <div className="text-[9px] text-slate-500">{forensic.riskScore >= 50 ? 'Yüksek Adli Risk' : 'Düşük Risk'}</div>
          </div>
        </div>

        {/* SPK ve Adli Bayrak Açıklamaları */}
        {forensic.spkFlags.length > 0 ? (
          <div className="bg-rose-950/40 border border-rose-500/40 p-3 rounded-xl space-y-1 font-mono text-xs">
            <div className="text-rose-300 font-bold flex items-center gap-1.5 text-[11px]">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" /> TESPİT EDİLEN ADLİ İNCELEME BAYRAKLARI:
            </div>
            <ul className="list-disc list-inside text-[10px] text-rose-200/90 space-y-0.5">
              {forensic.spkFlags.map((flag) => (
                <li key={flag}>{flag.replace(/_/g, ' ')}</li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="bg-slate-950/80 border border-slate-800/80 p-3 rounded-xl font-mono text-xs text-slate-300">
            <span className="text-emerald-400 font-bold">SPK Denetim Taraması:</span> Temiz tahta. HHI tek-el konsantrasyonu veya wash-trade sahte hacim manipülasyonu bulunmuyor.
          </div>
        )}
      </div>

      {/* Alt Bilgi */}
      <div className="mt-3 text-[10px] font-mono text-slate-400 flex items-center justify-between border-t border-slate-800/80 pt-2">
        <span>Beneish Eşiği: -1.78</span>
        <span>Adli Koruma Kalkanı: <strong className={isHighRisk ? 'text-rose-400' : 'text-emerald-400'}>{isHighRisk ? 'RİSK DONDURMASI AKTİF' : 'GÜVENLİ'}</strong></span>
      </div>
    </div>
  );
};

export default ForensicRedFlagCard;
