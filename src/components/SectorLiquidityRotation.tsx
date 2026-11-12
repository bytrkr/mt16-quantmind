// src/components/SectorLiquidityRotation.tsx
/**
 * MT16 BistApp Kuant Terminali - Sektörel Sermaye Göçü Motoru (Sector Liquidity Rotation)
 * BIST/NASDAQ sektörleri arasındaki anlık kurumsal para akışını (AKD/BofA net hacmi) gösterir
 * ve sermaye çıkışı olan sektörlere 'Dağıtım Sezonu' uyarısı koyar.
 */

import React, { useState, useMemo } from 'react';
import { Layers, ArrowRightLeft, TrendingUp, TrendingDown, AlertTriangle, Flame, ShieldAlert, ChevronRight, RefreshCw } from 'lucide-react';
import { MarketGatewaySnapshot } from '../services/marketGateway';
import type { MarketType } from '../App';

export interface SectorLiquidityRotationProps {
  snapshot?: MarketGatewaySnapshot;
  selectedMarket?: MarketType;
  onSelectSectorStock?: (symbol: string) => void;
}

interface SectorFlowData {
  id: string;
  name: string;
  market: 'BIST' | 'NASDAQ';
  netFlowMln: number; // TL Milyon or USD Million
  flowTrendPct: number;
  topBuyer: string;
  topSeller: string;
  dominantStock: string;
  seasonTag: 'ACCUMULATION' | 'NEUTRAL' | 'DISTRIBUTION';
  keyStocks: { symbol: string; price: number; changePct: number }[];
}

const INITIAL_SECTOR_FLOWS: SectorFlowData[] = [
  // BIST Sektörleri
  {
    id: 'bist-banka',
    name: 'Bankacılık & Finans (XBANK)',
    market: 'BIST',
    netFlowMln: 148.5,
    flowTrendPct: 4.2,
    topBuyer: 'BofA Kurumsal',
    topSeller: 'Diğer Perakende',
    dominantStock: 'GARAN',
    seasonTag: 'ACCUMULATION',
    keyStocks: [
      { symbol: 'GARAN', price: 112.40, changePct: 2.35 },
      { symbol: 'AKBNK', price: 62.80, changePct: 1.85 },
      { symbol: 'YKBNK', price: 34.10, changePct: 1.20 },
    ],
  },
  {
    id: 'bist-havacilik',
    name: 'Havacılık & Ulaştırma (XUAST)',
    market: 'BIST',
    netFlowMln: 86.2,
    flowTrendPct: 2.8,
    topBuyer: 'Citibank Yabancı',
    topSeller: 'Yatırım Finansman',
    dominantStock: 'THYAO',
    seasonTag: 'ACCUMULATION',
    keyStocks: [
      { symbol: 'THYAO', price: null, changePct: null }, // SAHTE FIYAT YOK
      { symbol: 'PGSUS', price: null, changePct: null }, // SAHTE FIYAT YOK
    ],
  },
  {
    id: 'bist-savunma',
    name: 'Savunma Sanayi & Teknoloji (XTEK)',
    market: 'BIST',
    netFlowMln: 42.0,
    flowTrendPct: 1.1,
    topBuyer: 'İş Yatırım',
    topSeller: 'Garanti BBVA',
    dominantStock: 'ASELS',
    seasonTag: 'NEUTRAL',
    keyStocks: [
      { symbol: 'ASELS', price: 358.50, changePct: 0.85 },
      { symbol: 'REEDR', price: 24.80, changePct: -1.20 },
    ],
  },
  {
    id: 'bist-metal',
    name: 'Ana Metal & Demir Çelik (XMANA)',
    market: 'BIST',
    netFlowMln: -68.4,
    flowTrendPct: -3.5,
    topBuyer: 'Diğer Perakende',
    topSeller: 'BofA Kurumsal',
    dominantStock: 'EREGL',
    seasonTag: 'DISTRIBUTION',
    keyStocks: [
      { symbol: 'EREGL', price: 48.20, changePct: -2.15 },
      { symbol: 'KRDMD', price: 28.40, changePct: -1.90 },
    ],
  },
  {
    id: 'bist-enerji',
    name: 'Yenilenebilir Enerji (XENRG)',
    market: 'BIST',
    netFlowMln: -124.0,
    flowTrendPct: -5.8,
    topBuyer: 'Yerel Bireysel',
    topSeller: 'QNB Finans',
    dominantStock: 'ASTOR',
    seasonTag: 'DISTRIBUTION',
    keyStocks: [
      { symbol: 'ASTOR', price: 92.50, changePct: -3.40 },
      { symbol: 'EUPWR', price: 78.10, changePct: -2.80 },
    ],
  },

  // NASDAQ Sektörleri
  {
    id: 'nasdaq-semi',
    name: 'Semiconductor / Yapay Zeka',
    market: 'NASDAQ',
    netFlowMln: 412.0,
    flowTrendPct: 5.6,
    topBuyer: 'Goldman Sachs',
    topSeller: 'Retail Flow',
    dominantStock: 'NVDA',
    seasonTag: 'ACCUMULATION',
    keyStocks: [
      { symbol: 'NVDA', price: 216.00, changePct: 2.39 },
      { symbol: 'AMD', price: 156.20, changePct: 1.80 },
    ],
  },
  {
    id: 'nasdaq-bigtech',
    name: 'Mega Tech & Software',
    market: 'NASDAQ',
    netFlowMln: 215.5,
    flowTrendPct: 2.1,
    topBuyer: 'BlackRock',
    topSeller: 'Hedge Funds',
    dominantStock: 'MSFT',
    seasonTag: 'ACCUMULATION',
    keyStocks: [
      { symbol: 'MSFT', price: 420.10, changePct: 1.50 },
      { symbol: 'AAPL', price: 180.50, changePct: -1.10 },
      { symbol: 'GOOGL', price: 172.40, changePct: -1.10 },
    ],
  },
  {
    id: 'nasdaq-ev',
    name: 'EV & Otonom Mobilite',
    market: 'NASDAQ',
    netFlowMln: -185.0,
    flowTrendPct: -4.2,
    topBuyer: 'Retail FOMO',
    topSeller: 'Morgan Stanley',
    dominantStock: 'TSLA',
    seasonTag: 'DISTRIBUTION',
    keyStocks: [
      { symbol: 'TSLA', price: 245.80, changePct: 5.20 },
      { symbol: 'RIVN', price: 14.20, changePct: -3.10 },
    ],
  },
];

export const SectorLiquidityRotation: React.FC<SectorLiquidityRotationProps> = ({
  selectedMarket = 'BIST',
  onSelectSectorStock,
}) => {
  const [marketFilter, setMarketFilter] = useState<'ALL' | 'BIST' | 'NASDAQ'>(
    selectedMarket === 'NASDAQ' ? 'NASDAQ' : 'BIST'
  );
  const [selectedSectorId, setSelectedSectorId] = useState<string>('bist-banka');

  const filteredSectors = useMemo(() => {
    if (marketFilter === 'ALL') return INITIAL_SECTOR_FLOWS;
    return INITIAL_SECTOR_FLOWS.filter((s) => s.market === marketFilter);
  }, [marketFilter]);

  const activeSector = useMemo(() => {
    return filteredSectors.find((s) => s.id === selectedSectorId) || filteredSectors[0];
  }, [filteredSectors, selectedSectorId]);

  const summaryStats = useMemo(() => {
    const accumCount = filteredSectors.filter((s) => s.seasonTag === 'ACCUMULATION').length;
    const distCount = filteredSectors.filter((s) => s.seasonTag === 'DISTRIBUTION').length;
    const totalInflow = filteredSectors
      .filter((s) => s.netFlowMln > 0)
      .reduce((sum, s) => sum + s.netFlowMln, 0);
    const totalOutflow = Math.abs(
      filteredSectors.filter((s) => s.netFlowMln < 0).reduce((sum, s) => sum + s.netFlowMln, 0)
    );

    return { accumCount, distCount, totalInflow, totalOutflow };
  }, [filteredSectors]);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl backdrop-blur-md space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400 animate-pulse" />
          <h3 className="text-xs font-black text-white uppercase tracking-wider">
            Sektörel Sermaye Göçü &amp; Likidite Rotasyonu
          </h3>
        </div>

        {/* Market Filter Tabs */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-[10px] font-mono">
          <button
            type="button"
            onClick={() => setMarketFilter('BIST')}
            className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
              marketFilter === 'BIST'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            BIST Sektörleri
          </button>
          <button
            type="button"
            onClick={() => setMarketFilter('NASDAQ')}
            className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
              marketFilter === 'NASDAQ'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            NASDAQ Sektörleri
          </button>
          <button
            type="button"
            onClick={() => setMarketFilter('ALL')}
            className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
              marketFilter === 'ALL'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Tümü
          </button>
        </div>
      </div>

      {/* Summary KPI Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-mono">
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between">
          <span className="text-slate-400">Toplama Sezonu:</span>
          <span className="text-emerald-400 font-black">{summaryStats.accumCount} Sektör</span>
        </div>
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between">
          <span className="text-slate-400">Dağıtım Sezonu:</span>
          <span className="text-rose-400 font-black">{summaryStats.distCount} Sektör</span>
        </div>
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between">
          <span className="text-slate-400">Net Para Girişi:</span>
          <span className="text-emerald-300 font-black">+{summaryStats.totalInflow.toFixed(1)}M</span>
        </div>
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between">
          <span className="text-slate-400">Net Para Çıkışı:</span>
          <span className="text-rose-400 font-black">-{summaryStats.totalOutflow.toFixed(1)}M</span>
        </div>
      </div>

      {/* Main Sector List & Flow Bars */}
      <div className="space-y-2">
        {filteredSectors.map((sector) => {
          const isSelected = activeSector?.id === sector.id;
          const currency = sector.market === 'BIST' ? '₺' : '$';
          const isDistribution = sector.seasonTag === 'DISTRIBUTION';
          const isAccumulation = sector.seasonTag === 'ACCUMULATION';

          return (
            <div
              key={sector.id}
              onClick={() => setSelectedSectorId(sector.id)}
              className={`p-3 rounded-xl border transition-all cursor-pointer font-mono ${
                isSelected
                  ? 'bg-slate-950 border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.15)]'
                  : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white">{sector.name}</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
                    {sector.market}
                  </span>
                </div>

                {/* Season Badge */}
                {isDistribution && (
                  <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-black flex items-center gap-1 animate-pulse">
                    <ShieldAlert className="w-3 h-3 text-rose-400" />
                    ⚠️ DAĞITIM SEZONU
                  </span>
                )}
                {isAccumulation && (
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black flex items-center gap-1">
                    <Flame className="w-3 h-3 text-emerald-400 animate-bounce" />
                    🔥 TOPLAMA SEZONU
                  </span>
                )}
                {!isDistribution && !isAccumulation && (
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-bold">
                    STABİL / DENGELİ
                  </span>
                )}
              </div>

              {/* Net Flow Progress Bar */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-400">
                    Kurumsal Net Akış: <strong className="text-slate-200">{sector.topBuyer}</strong>
                  </span>
                  <span className={`font-black ${sector.netFlowMln >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {sector.netFlowMln >= 0 ? '+' : ''}{currency}{sector.netFlowMln.toFixed(1)}M (%{sector.flowTrendPct >= 0 ? '+' : ''}{sector.flowTrendPct.toFixed(1)})
                  </span>
                </div>

                <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden flex">
                  <div
                    className={`h-full transition-all duration-500 ${
                      sector.netFlowMln >= 0 ? 'bg-gradient-to-r from-emerald-600 to-emerald-400' : 'bg-gradient-to-r from-rose-600 to-rose-400'
                    }`}
                    style={{ width: `${Math.min(100, Math.abs(sector.netFlowMln) / 4.5)}%` }}
                  />
                </div>
              </div>

              {/* Selected Sector Stock Highlights */}
              {isSelected && (
                <div className="mt-3 pt-2.5 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {sector.keyStocks.map((stk) => (
                    <button
                      key={stk.symbol}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onSelectSectorStock) onSelectSectorStock(stk.symbol);
                      }}
                      className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-left flex items-center justify-between text-[10px] transition cursor-pointer"
                    >
                      <div>
                        <span className="font-black text-white">#{stk.symbol}</span>
                        <div className="text-slate-400">{typeof stk.price === 'number' && !isNaN(stk.price) ? `${currency}${stk.price.toFixed(2)}` : 'VERİ YOK'}</div>
                      </div>
                      <span className={`font-bold ${typeof stk.changePct === 'number' && stk.changePct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {typeof stk.changePct === 'number' && !isNaN(stk.changePct) ? `${stk.changePct >= 0 ? '+' : ''}${stk.changePct.toFixed(2)}%` : 'VERİ YOK'}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SectorLiquidityRotation;
