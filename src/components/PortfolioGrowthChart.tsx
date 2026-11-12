// src/components/PortfolioGrowthChart.tsx
/**
 * MT16 BistApp Kuant Terminali - Karşılaştırmalı Portföy Büyüme Grafiği
 * recharts kütüphanesini kullanarak portföydeki toplam varlık değişimini BIST100 ve BTCUSDT
 * benchmark endeksleriyle zaman serisinde kıyaslar.
 */

import React, { useState, useMemo } from 'react';
import { TrendingUp, Award, BarChart3, Layers, Calendar } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, Tooltip, ReferenceLine, XAxis, YAxis } from 'recharts';
import type { MarketType } from '../App';

export interface PortfolioGrowthChartProps {
  selectedMarket?: MarketType;
}

interface BenchmarkDataPoint {
  date: string;
  portfolioIndex: number; // Scaled to 100 baseline
  bist100Index: number;   // Scaled to 100 baseline
  btcIndex: number;       // Scaled to 100 baseline
}

const HISTORICAL_SERIES: BenchmarkDataPoint[] = [
  { date: 'Kas 25', portfolioIndex: 100.0, bist100Index: 100.0, btcIndex: 100.0 },
  { date: 'Aralık', portfolioIndex: 106.2, bist100Index: 102.5, btcIndex: 104.1 },
  { date: 'Ocak',   portfolioIndex: 114.8, bist100Index: 105.8, btcIndex: 112.3 },
  { date: 'Şubat',  portfolioIndex: 122.5, bist100Index: 108.4, btcIndex: 118.6 },
  { date: 'Mart',   portfolioIndex: 131.0, bist100Index: 112.1, btcIndex: 125.0 },
  { date: 'Nisan',  portfolioIndex: 139.4, bist100Index: 116.8, btcIndex: 132.4 },
  { date: 'Mayıs',  portfolioIndex: 148.0, bist100Index: 121.2, btcIndex: 140.2 },
  { date: 'Haziran', portfolioIndex: 156.5, bist100Index: 124.5, btcIndex: 148.5 },
  { date: 'Temmuz', portfolioIndex: 168.2, bist100Index: 128.9, btcIndex: 156.0 },
  { date: 'Ağustos', portfolioIndex: 177.4, bist100Index: 132.4, btcIndex: 165.2 },
  { date: 'Eylül',  portfolioIndex: 186.0, bist100Index: 135.8, btcIndex: 172.8 },
  { date: 'Ekim',   portfolioIndex: 194.2, bist100Index: 138.7, btcIndex: 181.5 },
];

export const PortfolioGrowthChart: React.FC<PortfolioGrowthChartProps> = ({
  selectedMarket = 'BIST',
}) => {
  const [timeframe, setTimeframe] = useState<'1M' | '3M' | '6M' | '1Y'>('1Y');

  const chartData = useMemo(() => {
    if (timeframe === '1M') return HISTORICAL_SERIES.slice(-2);
    if (timeframe === '3M') return HISTORICAL_SERIES.slice(-4);
    if (timeframe === '6M') return HISTORICAL_SERIES.slice(-7);
    return HISTORICAL_SERIES;
  }, [timeframe]);

  const stats = useMemo(() => {
    const first = chartData[0];
    const last = chartData[chartData.length - 1];

    const portfolioReturnPct = Number((((last.portfolioIndex - first.portfolioIndex) / first.portfolioIndex) * 100).toFixed(1));
    const bistReturnPct = Number((((last.bist100Index - first.bist100Index) / first.bist100Index) * 100).toFixed(1));
    const btcReturnPct = Number((((last.btcIndex - first.btcIndex) / first.btcIndex) * 100).toFixed(1));
    const alphaVsBist = Number((portfolioReturnPct - bistReturnPct).toFixed(1));

    return { portfolioReturnPct, bistReturnPct, btcReturnPct, alphaVsBist };
  }, [chartData]);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl backdrop-blur-md space-y-4 font-mono">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-emerald-400 animate-pulse" />
          <h3 className="text-xs font-black text-white uppercase tracking-wider">
            Karşılaştırmalı Portföy Büyüme Grafiği (Benchmark Alpha)
          </h3>
        </div>

        {/* Timeframe selector */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-[10px]">
          {(['1M', '3M', '6M', '1Y'] as const).map((tf) => (
            <button
              key={tf}
              type="button"
              onClick={() => setTimeframe(tf)}
              className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                timeframe === tf
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
          <div className="text-[10px] text-slate-400 uppercase font-semibold">MT16 Portföy Getirisi</div>
          <div className="text-base font-black text-emerald-400 mt-1">
            +%{stats.portfolioReturnPct}
          </div>
          <div className="text-[9px] text-slate-500 mt-0.5">Strateji Getirisi</div>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
          <div className="text-[10px] text-slate-400 uppercase font-semibold">BIST 100 Endeks Benchmark</div>
          <div className="text-base font-black text-cyan-300 mt-1">
            +%{stats.bistReturnPct}
          </div>
          <div className="text-[9px] text-slate-500 mt-0.5">Piyasa Getirisi</div>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
          <div className="text-[10px] text-slate-400 uppercase font-semibold">BTCUSDT Kripto Benchmark</div>
          <div className="text-base font-black text-purple-300 mt-1">
            +%{stats.btcReturnPct}
          </div>
          <div className="text-[9px] text-slate-500 mt-0.5">Kripto Getirisi</div>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
          <div className="text-[10px] text-slate-400 uppercase font-semibold">Alpha Üstünlük Farkı</div>
          <div className="text-base font-black text-amber-300 mt-1 flex items-center gap-1">
            <Award className="w-4 h-4 text-amber-400" />
            +%{stats.alphaVsBist}
          </div>
          <div className="text-[9px] text-slate-500 mt-0.5">BIST Endeksine Karşı Alpha</div>
        </div>
      </div>

      {/* Benchmark Comparison Chart */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-slate-300 font-bold flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            Kümilatif Özsermaye Eğrisi (Baz 100)
          </span>

          <div className="flex items-center gap-3 text-[10px]">
            <span className="flex items-center gap-1 text-emerald-400 font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400" /> MT16 Portföy
            </span>
            <span className="flex items-center gap-1 text-cyan-300">
              <span className="w-2 h-2 rounded-full bg-cyan-300" /> BIST 100
            </span>
            <span className="flex items-center gap-1 text-purple-400">
              <span className="w-2 h-2 rounded-full bg-purple-400" /> BTCUSDT
            </span>
          </div>
        </div>

        <div className="h-48 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <XAxis dataKey="date" stroke="#475569" tick={{ fontSize: 9 }} />
              <YAxis stroke="#475569" tick={{ fontSize: 9 }} domain={['auto', 'auto']} />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload as BenchmarkDataPoint;
                    return (
                      <div className="bg-slate-900 border border-slate-700 p-2 rounded text-[10px] font-mono space-y-1">
                        <div className="text-slate-400 font-bold">{d.date}</div>
                        <div className="text-emerald-400">MT16 Portföy: {d.portfolioIndex}</div>
                        <div className="text-cyan-300">BIST 100: {d.bist100Index}</div>
                        <div className="text-purple-400">BTCUSDT: {d.btcIndex}</div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <ReferenceLine y={100} stroke="#475569" strokeDasharray="3 3" />
              <Line type="monotone" dataKey="portfolioIndex" stroke="#10b981" strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="bist100Index" stroke="#06b6d4" strokeWidth={1.5} dot={false} />
              <Line type="monotone" dataKey="btcIndex" stroke="#a855f7" strokeWidth={1.5} strokeDasharray="2 2" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default PortfolioGrowthChart;
