// src/components/LiquidityAbsorbanceCard.tsx
/**
 * MT16 BistApp Kuant Terminali - Likidite Absorpsiyonu ve Süpürme Haritası Kartı
 * Pasif L2 emir kademelerinin zaman içindeki değişimini ve agresif emirlerin pasif duvarlar
 * tarafından emilme (Absorption) veya süpürülme (Sweep) anlarını canlı görselleştirir.
 */

import React, { useMemo } from 'react';
import { Layers, ShieldCheck, Zap, Activity, Flame, ArrowUpRight } from 'lucide-react';
import { MarketGatewaySnapshot } from '../services/marketGateway';
import { absorbanceEngine, AbsorbanceEvent } from '../services/absorbanceEngine';
import type { MarketType } from '../App';

export interface LiquidityAbsorbanceCardProps {
  snapshot?: MarketGatewaySnapshot;
  ticker?: string;
  marketType?: MarketType;
}

export const LiquidityAbsorbanceCard: React.FC<LiquidityAbsorbanceCardProps> = ({
  snapshot,
  ticker = 'NVDA',
  marketType = 'NASDAQ',
}) => {
  const events = useMemo<AbsorbanceEvent[]>(() => {
    if (!snapshot) return [];
    return absorbanceEngine.detectAbsorbanceEvents(snapshot);
  }, [snapshot]);

  const currency = marketType === 'BIST' ? '₺' : '$';

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl backdrop-blur-md space-y-4 font-mono">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400 animate-pulse" />
          <h3 className="text-xs font-black text-white uppercase tracking-wider">
            Likidite Absorpsiyonu &amp; Süpürme Haritası (L2 Sweeps)
          </h3>
        </div>

        <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold">
          {events.length} Canlı Tespit
        </span>
      </div>

      {/* Events List */}
      <div className="space-y-2">
        {events.map((evt) => {
          const isSweep = evt.type === 'SWEEP';

          return (
            <div
              key={evt.id}
              className={`p-3 rounded-xl border transition-all ${
                isSweep
                  ? 'bg-purple-950/40 border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.15)]'
                  : 'bg-emerald-950/40 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded font-black text-[9px] ${
                      isSweep ? 'bg-purple-500 text-slate-950' : 'bg-emerald-500 text-slate-950'
                    }`}
                  >
                    {isSweep ? '⚡ SÜPÜRME (SWEEP)' : '🟢 EMİLİM (ABSORPTION)'}
                  </span>

                  <span className="text-xs font-bold text-white">
                    Fiyat: {evt.priceLevel !== null && evt.priceLevel !== undefined ? `${currency}${evt.priceLevel.toFixed(2)}` : 'VERİ YOK'}
                  </span>
                </div>

                <div className="text-[10px] text-slate-400">
                  <span>{evt.time}</span>
                </div>
              </div>

              <p className="text-[11px] text-slate-200 leading-snug mb-2 font-sans font-medium">
                {evt.description}
              </p>

              <div className="grid grid-cols-3 gap-2 text-[10px] bg-slate-950/70 p-2 rounded-lg border border-slate-800">
                <div>
                  <span className="text-slate-400">Emilen Hacim:</span>
                  <div className="text-cyan-300 font-bold">
                    {evt.absorbedQty !== null && evt.absorbedQty !== undefined ? `${evt.absorbedQty.toLocaleString('tr-TR')} Lot` : 'VERİ YOK'}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400">Piyasa Etkisi:</span>
                  <div className="text-amber-300 font-bold">
                    {evt.marketImpactBps !== null && evt.marketImpactBps !== undefined ? `${evt.marketImpactBps} bps` : 'VERİ YOK'}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400">Güven Skoru:</span>
                  <div className="text-emerald-400 font-bold">
                    {evt.confidenceScore !== null && evt.confidenceScore !== undefined ? `%${evt.confidenceScore}` : 'VERİ YOK'}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default LiquidityAbsorbanceCard;
