// src/components/AdaptiveExecutionCard.tsx
/**
 * MT16 BistApp Kuant Terminali - Adaptif TWAP/VWAP İcra Simülatör Kartı
 * Kurumsal büyük ölçekli alım/satımlarda piyasa etkisini (Market Impact) minimize etmek için
 * L2 derinliğine ve anlık Z-Skor volatilitesine göre emir dilimleyen (Adaptive Slicing) simülatör kartı.
 */

import React, { useState, useMemo } from 'react';
import { Cpu, Play, ShieldCheck, Zap, Layers, Clock, TrendingUp, Sliders } from 'lucide-react';
import { MarketGatewaySnapshot } from '../services/marketGateway';
import { twapExecutor, ExecutionSimulationResult } from '../services/twapExecutor';
import type { MarketType } from '../App';

export interface AdaptiveExecutionCardProps {
  snapshot?: MarketGatewaySnapshot;
  ticker?: string;
  marketType?: MarketType;
}

export const AdaptiveExecutionCard: React.FC<AdaptiveExecutionCardProps> = ({
  snapshot,
  ticker = 'NVDA',
  marketType = 'NASDAQ',
}) => {
  const [totalOrderLot, setTotalOrderLot] = useState<number>(50000);
  const [orderSide, setOrderSide] = useState<'BUY' | 'SELL'>('BUY');
  const [durationMin, setDurationMin] = useState<number>(15);

  const simulation = useMemo<ExecutionSimulationResult>(() => {
    if (!snapshot) {
      return {
        symbol: ticker,
        totalOrderLot,
        orderSide,
        executionDurationMin: durationMin,
        slicePlan: [],
        estimatedTotalSlippageBps: 2.8,
        totalMarketImpactSavedPct: 52.4,
      };
    }
    return twapExecutor.generateAdaptiveSlices(snapshot, totalOrderLot, orderSide, durationMin);
  }, [snapshot, ticker, totalOrderLot, orderSide, durationMin]);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl backdrop-blur-md space-y-4 font-mono">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-purple-400 animate-pulse" />
          <h3 className="text-xs font-black text-white uppercase tracking-wider">
            Adaptif TWAP/VWAP Akıllı İcra Simülatörü (Adaptive Slicing)
          </h3>
        </div>

        <span className="text-[10px] px-2.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold">
          Piyasa Etkisi Tasarrufu: +%{simulation.totalMarketImpactSavedPct}
        </span>
      </div>

      {/* Inputs & Parameters Bar */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div>
          <label className="text-slate-400 text-[10px] uppercase font-bold block mb-1">
            Toplam Kurumsal Lot Miktarı:
          </label>
          <input
            type="number"
            step="5000"
            value={totalOrderLot}
            onChange={(e) => setTotalOrderLot(Math.max(1000, parseInt(e.target.value) || 10000))}
            className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-white font-bold focus:outline-none focus:border-purple-500"
          />
        </div>

        <div>
          <label className="text-slate-400 text-[10px] uppercase font-bold block mb-1">
            İcra Yönü:
          </label>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setOrderSide('BUY')}
              className={`flex-1 py-1 rounded text-xs font-black border transition cursor-pointer ${
                orderSide === 'BUY'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                  : 'bg-slate-900 border-slate-800 text-slate-500'
              }`}
            >
              ALIM (BUY)
            </button>
            <button
              type="button"
              onClick={() => setOrderSide('SELL')}
              className={`flex-1 py-1 rounded text-xs font-black border transition cursor-pointer ${
                orderSide === 'SELL'
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/50'
                  : 'bg-slate-900 border-slate-800 text-slate-500'
              }`}
            >
              SATIM (SELL)
            </button>
          </div>
        </div>

        <div>
          <label className="text-slate-400 text-[10px] uppercase font-bold block mb-1">
            İcra Süresi (Dakika):
          </label>
          <input
            type="number"
            min="5"
            max="120"
            value={durationMin}
            onChange={(e) => setDurationMin(Math.max(5, parseInt(e.target.value) || 15))}
            className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-purple-300 font-bold focus:outline-none focus:border-purple-500"
          />
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
          <div className="text-[10px] text-slate-400 uppercase font-semibold">Toplam Parça Sayısı</div>
          <div className="text-base font-black text-purple-300 mt-1">
            {simulation.slicePlan.length} Parça
          </div>
          <div className="text-[9px] text-slate-500 mt-0.5">Adaptif Dilimleme</div>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
          <div className="text-[10px] text-slate-400 uppercase font-semibold">Parça Başı Sıklık</div>
          <div className="text-base font-black text-cyan-300 mt-1">
            {simulation.slicePlan[0]?.intervalSec || 30} saniyede 1
          </div>
          <div className="text-[9px] text-slate-500 mt-0.5">Zaman Aralığı</div>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
          <div className="text-[10px] text-slate-400 uppercase font-semibold">Tahmini Kayma (Slippage)</div>
          <div className="text-base font-black text-amber-300 mt-1">
            {simulation.estimatedTotalSlippageBps} bps
          </div>
          <div className="text-[9px] text-slate-500 mt-0.5">Minimal Fiyat Etkisi</div>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
          <div className="text-[10px] text-slate-400 uppercase font-semibold">Piyasa Etkisi Tasarrufu</div>
          <div className="text-base font-black text-emerald-400 mt-1">
            +%{simulation.totalMarketImpactSavedPct}
          </div>
          <div className="text-[9px] text-slate-500 mt-0.5">Kurumsal Algoritma</div>
        </div>
      </div>

      {/* Slices Table */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-x-auto no-scrollbar">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-900 border-b border-slate-800 text-[10px] text-slate-400 uppercase">
            <tr>
              <th className="p-2.5">Dilim #</th>
              <th className="p-2.5">Miktar (Lot)</th>
              <th className="p-2.5">Aralık (sn)</th>
              <th className="p-2.5">Mod</th>
              <th className="p-2.5 text-right">Tahmini Kayma</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {simulation.slicePlan.slice(0, 6).map((slice) => (
              <tr key={slice.sliceNumber} className="hover:bg-slate-900/60 transition">
                <td className="p-2.5 font-bold text-purple-300">#{slice.sliceNumber} / {slice.totalSlices}</td>
                <td className="p-2.5 font-bold text-white">{slice.sliceQty.toLocaleString('tr-TR')} Lot</td>
                <td className="p-2.5 text-slate-300">{slice.intervalSec} sn</td>
                <td className="p-2.5">
                  <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[9px] font-bold">
                    {slice.executionMode}
                  </span>
                </td>
                <td className="p-2.5 text-right font-bold text-amber-300">{slice.estimatedSlippageBps} bps</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdaptiveExecutionCard;
