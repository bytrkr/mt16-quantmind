// src/components/MarketProfileCard.tsx
/**
 * MT16 BistApp Kuant Terminali - Market Profile ve Değer Alanı (Value Area) Kartı
 * TPO ve Hacim Kütlesine dayalı VAH (Value Area High), VAL (Value Area Low) ve POC seviyelerini gösterir.
 * %70 değer alanı dışındaki sapmaları Sahte Kırılım (Trap) uyarısı ile fiyata yansıtır.
 */

import React, { useMemo } from 'react';
import { Target, ShieldAlert, Zap, TrendingUp, TrendingDown, Layers, CheckCircle } from 'lucide-react';
import { MarketGatewaySnapshot } from '../services/marketGateway';
import { marketProfileEngine, MarketProfileResult } from '../services/marketProfileEngine';
import type { MarketType } from '../App';

export interface MarketProfileCardProps {
  snapshot?: MarketGatewaySnapshot;
  ticker?: string;
  marketType?: MarketType;
}

export const MarketProfileCard: React.FC<MarketProfileCardProps> = ({
  snapshot,
  ticker = 'NVDA',
  marketType = 'NASDAQ',
}) => {
  const profile = useMemo<MarketProfileResult>(() => {
    if (!snapshot) {
      return {
        symbol: ticker,
        currentPrice: 100,
        poc: 100,
        vah: 101.5,
        val: 98.5,
        isInValueArea: true,
        trapWarning: 'NO_TRAP',
        trapDescription: 'Fiyat %70 Değer Alanı sınırları içerisinde dengeli seyrediyor.',
        valueAreaCoveragePct: 70,
      };
    }
    return marketProfileEngine.calculateMarketProfile(snapshot);
  }, [snapshot, ticker]);

  const currency = marketType === 'BIST' ? '₺' : '$';

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl backdrop-blur-md space-y-4 font-mono">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-emerald-400 animate-pulse" />
          <h3 className="text-xs font-black text-white uppercase tracking-wider">
            Market Profile &amp; %70 Değer Alanı (Value Area)
          </h3>
        </div>

        <span
          className={`px-2.5 py-0.5 rounded text-[10px] font-black border ${
            profile.isInValueArea
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              : 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
          }`}
        >
          {profile.isInValueArea ? '✅ VALUE AREA İÇİNDE' : '⚡ VALUE AREA DIŞINDA SAPMA'}
        </span>
      </div>

      {/* Trap Warning Banner */}
      {profile.trapWarning !== 'NO_TRAP' ? (
        <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500 text-rose-200 text-xs font-bold leading-relaxed flex items-center gap-2 shadow-[0_0_20px_rgba(244,63,94,0.3)] animate-pulse">
          <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{profile.trapDescription}</span>
        </div>
      ) : (
        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{profile.trapDescription}</span>
        </div>
      )}

      {/* VAH, POC, VAL Key Levels Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        {/* VAH */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-1">
          <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase">
            <span>VAH (Value Area High)</span>
            <span className="text-amber-400">+1.5% Sınır</span>
          </div>
          <div className="text-lg font-black text-white">
            {profile.vah !== null && profile.vah !== undefined ? `${currency}${profile.vah.toFixed(2)}` : 'VERİ YOK'}
          </div>
          <div className="text-[10px] text-slate-500">%70 TPO Üst Alan Sınırı</div>
        </div>

        {/* POC */}
        <div className="bg-slate-950 border border-emerald-500/40 rounded-xl p-3.5 space-y-1 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
          <div className="flex items-center justify-between text-[10px] text-emerald-400 font-bold uppercase">
            <span>POC (Point of Control)</span>
            <span className="text-emerald-400">MERKEZ</span>
          </div>
          <div className="text-lg font-black text-emerald-300">
            {profile.poc !== null && profile.poc !== undefined ? `${currency}${profile.poc.toFixed(2)}` : 'VERİ YOK'}
          </div>
          <div className="text-[10px] text-slate-500">En Yüksek Hacimli Kademe</div>
        </div>

        {/* VAL */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-1">
          <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase">
            <span>VAL (Value Area Low)</span>
            <span className="text-cyan-400">-1.5% Sınır</span>
          </div>
          <div className="text-lg font-black text-white">
            {profile.val !== null && profile.val !== undefined ? `${currency}${profile.val.toFixed(2)}` : 'VERİ YOK'}
          </div>
          <div className="text-[10px] text-slate-500">%70 TPO Alt Alan Sınırı</div>
        </div>
      </div>
    </div>
  );
};

export default MarketProfileCard;
