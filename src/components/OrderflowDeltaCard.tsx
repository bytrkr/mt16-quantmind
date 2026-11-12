// src/components/OrderflowDeltaCard.tsx
/**
 * MT16 BistApp Kuant Terminali - Mum İçi Agresiflik ve Delta Uyumsuzluğu Kartı
 * Mum içi piyasa alıcı ve satıcı hacimlerini (Aggressive Ask vs Bid) analiz ederek Net Delta (\Delta)
 * değerini ve Fiyat-Delta uyumsuzluklarını (Absorption / Yorgun Trend) görselleştirir.
 */

import React, { useMemo } from 'react';
import { Activity, ShieldAlert, Zap, TrendingUp, TrendingDown, ArrowRightLeft, Layers } from 'lucide-react';
import { MarketGatewaySnapshot } from '../services/marketGateway';
import { orderflowEngine, CandleOrderflowData } from '../services/orderflowEngine';
import type { MarketType } from '../App';

export interface OrderflowDeltaCardProps {
  snapshot?: MarketGatewaySnapshot;
  ticker?: string;
  marketType?: MarketType;
}

export const OrderflowDeltaCard: React.FC<OrderflowDeltaCardProps> = ({
  snapshot,
  ticker = 'NVDA',
  marketType = 'NASDAQ',
}) => {
  const flowData = useMemo<CandleOrderflowData>(() => {
    if (!snapshot) {
      return {
        time: new Date().toLocaleTimeString('tr-TR'),
        price: 100,
        aggressiveAskVol: 85000,
        aggressiveBidVol: 65000,
        netDelta: 20000,
        cumulativeDelta: 65000,
        deltaDivergenceTag: 'NORMAL',
        divergenceDescription: 'Mum içi alıcı/satıcı akışı dengeli.',
      };
    }
    return orderflowEngine.processCandleOrderflow(snapshot);
  }, [snapshot]);

  const totalVol = flowData.aggressiveAskVol + flowData.aggressiveBidVol;
  const askPct = totalVol > 0 ? (flowData.aggressiveAskVol / totalVol) * 100 : 50;
  const bidPct = 100 - askPct;

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl backdrop-blur-md space-y-4 font-mono">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400 animate-pulse" />
          <h3 className="text-xs font-black text-white uppercase tracking-wider">
            Mum İçi Orderflow &amp; Net Delta (&Delta;) Uyumsuzluğu
          </h3>
        </div>

        <span
          className={`px-2.5 py-0.5 rounded text-[10px] font-black border ${
            flowData.netDelta >= 0
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
          }`}
        >
          Net Delta: {flowData.netDelta >= 0 ? '+' : ''}{(flowData.netDelta / 1000).toFixed(1)}k Lot
        </span>
      </div>

      {/* Divergence Warning Banner */}
      {flowData.deltaDivergenceTag !== 'NORMAL' && (
        <div
          className={`p-3 rounded-xl border text-xs font-bold leading-relaxed flex items-center gap-2 ${
            flowData.deltaDivergenceTag === 'BULLISH_ABSORPTION'
              ? 'bg-emerald-950/80 border-emerald-500 text-emerald-200'
              : flowData.deltaDivergenceTag === 'BEARISH_ABSORPTION'
              ? 'bg-rose-950/80 border-rose-500 text-rose-200'
              : 'bg-amber-950/80 border-amber-500 text-amber-200'
          }`}
        >
          <Zap className="w-4 h-4 shrink-0 animate-bounce" />
          <span>{flowData.divergenceDescription}</span>
        </div>
      )}

      {/* Taker Buy vs Sell Volume Meter */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-emerald-400 font-bold flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" />
            Agresif Alıcı (Ask): {(flowData.aggressiveAskVol / 1000).toFixed(1)}k (%{askPct.toFixed(1)})
          </span>
          <span className="text-rose-400 font-bold flex items-center gap-1">
            <TrendingDown className="w-3.5 h-3.5" />
            Agresif Satıcı (Bid): {(flowData.aggressiveBidVol / 1000).toFixed(1)}k (%{bidPct.toFixed(1)})
          </span>
        </div>

        {/* Dual Bar Progress Meter */}
        <div className="h-3 w-full bg-slate-950 rounded-full overflow-hidden flex border border-slate-800">
          <div
            className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-300"
            style={{ width: `${askPct}%` }}
          />
          <div
            className="h-full bg-gradient-to-r from-rose-600 to-rose-400 transition-all duration-300"
            style={{ width: `${bidPct}%` }}
          />
        </div>
      </div>

      {/* Delta Metrics Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
          <div className="text-[10px] text-slate-400 uppercase font-semibold">Anlık Net Delta (\Delta)</div>
          <div className={`text-base font-black mt-1 ${flowData.netDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {flowData.netDelta >= 0 ? '+' : ''}{(flowData.netDelta / 1000).toFixed(1)}k Lot
          </div>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
          <div className="text-[10px] text-slate-400 uppercase font-semibold">Kümilatif Delta (&sum; \Delta)</div>
          <div className="text-base font-black text-cyan-300 mt-1">
            +{(flowData.cumulativeDelta / 1000).toFixed(1)}k Lot
          </div>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 col-span-2 sm:col-span-1">
          <div className="text-[10px] text-slate-400 uppercase font-semibold">Akış Durumu</div>
          <div className="text-xs font-black text-purple-300 mt-1">
            {flowData.deltaDivergenceTag}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderflowDeltaCard;
