// src/components/VolatilityHeatmapCard.tsx
import React, { useState, useMemo, useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { Layers, Activity, TrendingUp, TrendingDown, Info } from 'lucide-react';
import type { MarketType } from '../App';

export interface VolatilityHeatmapCardProps {
  selectedMarket: MarketType;
  activeSymbol: string;
  onSelectAsset: (symbol: string) => void;
  className?: string;
}

const BIST_MAP_ITEMS = ['ASELS', 'THYAO', 'EREGL', 'GARAN', 'TUPRS', 'KCHOL', 'AKBNK', 'BIMAS', 'SISE', 'ASTOR', 'PETKM'];
const NASDAQ_MAP_ITEMS = ['NVDA', 'AAPL', 'MSFT', 'TSLA', 'AMZN', 'GOOGL', 'META', 'QQQ', 'SPY'];
const CRYPTO_MAP_ITEMS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'AVAXUSDT', 'ADAUSDT'];

export const VolatilityHeatmapCard: React.FC<VolatilityHeatmapCardProps> = ({
  selectedMarket,
  activeSymbol,
  onSelectAsset,
  className = '',
}) => {
  const [hoveredSymbol, setHoveredSymbol] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [cardWidth, setCardWidth] = useState<number>(600);

  useEffect(() => {
    if (!cardRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setCardWidth(entry.contentRect.width);
      }
    });
    observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, []);

  const isCompact = cardWidth < 420;

  const symbols = useMemo(() => {
    let raw = BIST_MAP_ITEMS;
    if (selectedMarket === 'CRYPTO') raw = CRYPTO_MAP_ITEMS;
    else if (selectedMarket === 'NASDAQ') raw = NASDAQ_MAP_ITEMS;
    return Array.from(new Set(raw));
  }, [selectedMarket]);

  // D3 color scale generator for volatility / change %
  const colorScale = useMemo(() => {
    return d3.scaleSequential()
      .domain([-5, 5])
      .interpolator(d3.interpolateRdYlGn);
  }, []);

  // Asset volatility and composite anomaly data
  const assetData = useMemo(() => {
    return symbols.map((sym, idx) => {
      const seed = sym.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
      const changePct = Number(((seed % 90) / 10 - 4.2).toFixed(2));
      const zScore = Number((((seed % 60) / 10) - 2.5).toFixed(2));
      const volumeLot = Math.round(15000 + (seed % 85000));
      const compositeAnomalyScore = Math.round(Math.min(99, Math.max(15, Math.abs(zScore) * 26 + (changePct < 0 ? 32 : 18))));
      const isAnomaly = Math.abs(zScore) >= 2.0 || compositeAnomalyScore >= 75;

      let bgColor = '#0f172a';
      if (isAnomaly) {
        bgColor = '#f59e0b25'; // Amber / FOMO / Anomaly
      } else if (changePct > 1.2) {
        bgColor = '#10b98125'; // Bullish Green
      } else if (changePct < -1.2) {
        bgColor = '#ef444425'; // Bearish Red
      } else {
        bgColor = '#1e293b';
      }

      return {
        symbol: sym,
        changePct,
        zScore,
        volumeLot,
        compositeAnomalyScore,
        isAnomaly,
        bgColor,
      };
    });
  }, [symbols]);

  const hoveredItem = useMemo(() => {
    if (!hoveredSymbol) return null;
    return assetData.find(a => a.symbol === hoveredSymbol) || null;
  }, [hoveredSymbol, assetData]);

  return (
    <div ref={cardRef} className={`bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col justify-between ${className}`}>
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-black text-white uppercase tracking-wider">
              {selectedMarket} D3 Volatilite &amp; Isı Haritası
            </h3>
          </div>
          <span className="text-[10px] font-mono text-cyan-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-800 flex items-center gap-1">
            <Info className="w-3 h-3 text-cyan-400" /> {isCompact ? 'Responsive' : 'ResizeObserver Active'}
          </span>
        </div>

        {/* Hover Tooltip Bilgi Barı */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 mb-3 font-mono text-[11px] flex items-center justify-between text-slate-300 min-h-[32px]">
          {hoveredItem ? (
            <div className="flex items-center justify-between w-full">
              <span className="font-bold text-cyan-300">#{hoveredItem.symbol}</span>
              <div className="flex items-center gap-2 sm:gap-3 text-[10px]">
                <span className="text-amber-300">Z:{hoveredItem.zScore >= 0 ? '+' : ''}{hoveredItem.zScore}σ</span>
                <span className="text-purple-300">A:{hoveredItem.compositeAnomalyScore}</span>
                <span className={hoveredItem.changePct >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                  {hoveredItem.changePct >= 0 ? '+' : ''}{hoveredItem.changePct}%
                </span>
              </div>
            </div>
          ) : (
            <span className="text-slate-500 italic text-[10px]">
              Varlık blokları üzerine gelerek Z-skor ve anomali skorunu inceleyin...
            </span>
          )}
        </div>

        {/* D3 Heatmap Responsive Grid */}
        <div className={`grid gap-2 font-mono ${isCompact ? 'grid-cols-2' : 'grid-cols-3 sm:grid-cols-4'}`}>
          {assetData.map((item) => {
            const isSelected = activeSymbol === item.symbol;
            return (
              <button
                key={item.symbol}
                type="button"
                onClick={() => onSelectAsset(item.symbol)}
                onMouseEnter={() => setHoveredSymbol(item.symbol)}
                onMouseLeave={() => setHoveredSymbol(null)}
                className={`p-2 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'ring-2 ring-emerald-400 border-emerald-500 bg-slate-800 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                    : 'border-slate-800 hover:border-slate-700 bg-slate-950/80'
                }`}
                style={{ backgroundColor: isSelected ? undefined : item.bgColor }}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-black text-xs text-white">#{item.symbol}</span>
                  {item.isAnomaly && (
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" title="Anomali / Z-Skor Spikes" />
                  )}
                </div>

                <div className="my-1 flex items-baseline justify-between text-[11px]">
                  <span className={`font-black ${item.changePct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {item.changePct >= 0 ? '+' : ''}{item.changePct}%
                  </span>
                  <span className="text-[10px] text-cyan-300 font-bold">
                    Z:{item.zScore >= 0 ? '+' : ''}{item.zScore}σ
                  </span>
                </div>

                <div className="text-[9px] text-slate-400 truncate flex items-center justify-between">
                  <span>Vol: {Math.round(item.volumeLot / 1000)}k</span>
                  <span className="text-purple-300 font-bold">A:{item.compositeAnomalyScore}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-400 font-mono">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400" /> Boğa
          <span className="w-2 h-2 rounded-full bg-rose-400 ml-1" /> Dump
          <span className="w-2 h-2 rounded-full bg-amber-400 ml-1" /> FOMO
        </span>
        <span className="text-slate-500">Responsive ResizeObserver</span>
      </div>
    </div>
  );
};

export default VolatilityHeatmapCard;
