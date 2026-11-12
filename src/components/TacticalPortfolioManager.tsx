// src/components/TacticalPortfolioManager.tsx
/**
 * MT16 BistApp Kuant Terminali - Taktiksel Portföy Yöneticisi & What-If Simülatörü
 * Portföydeki varlıkların canlı fiyatlara göre anlık kâr/zarar (% ve TL/USD) durumunu hesaplar.
 * Farklı hedef çıkış fiyatlarına (Exit Price Targets) göre 'What-If' senaryo simülasyonu çalıştırır.
 */

import React, { useState, useMemo } from 'react';
import { Briefcase, TrendingUp, TrendingDown, DollarSign, Calculator, ArrowUpRight, Plus, Trash2 } from 'lucide-react';
import { MarketGatewaySnapshot } from '../services/marketGateway';
import type { MarketType } from '../App';

export interface TacticalPortfolioManagerProps {
  snapshot?: MarketGatewaySnapshot;
  ticker?: string;
  marketType?: MarketType;
}

interface PortfolioPosition {
  id: string;
  symbol: string;
  market: 'BIST' | 'NASDAQ' | 'CRYPTO';
  entryPrice: number;
  currentPrice: number;
  qty: number;
  targetExitPrice: number;
}

const INITIAL_POSITIONS: PortfolioPosition[] = [
  {
    id: 'POS-1',
    symbol: 'NVDA',
    market: 'NASDAQ',
    entryPrice: 210.00,
    currentPrice: 216.00,
    qty: 100,
    targetExitPrice: 235.00,
  },
  {
    id: 'POS-2',
    symbol: 'THYAO',
    market: 'BIST',
    entryPrice: 295.00,
    currentPrice: null, // SAHTE FIYAT YOK
    qty: 500,
    targetExitPrice: 340.00,
  },
  {
    id: 'POS-3',
    symbol: 'BTCUSDT',
    market: 'CRYPTO',
    entryPrice: 85000.00,
    currentPrice: 88450.00,
    qty: 0.5,
    targetExitPrice: 95000.00,
  },
];

export const TacticalPortfolioManager: React.FC<TacticalPortfolioManagerProps> = ({
  snapshot,
  ticker = 'NVDA',
  marketType = 'NASDAQ',
}) => {
  const [positions, setPositions] = useState<PortfolioPosition[]>(INITIAL_POSITIONS);

  // Sync current price of active snapshot asset if present
  const updatedPositions = useMemo(() => {
    if (!snapshot || !snapshot.ticker || snapshot.price <= 0) return positions;

    return positions.map((pos) => {
      if (pos.symbol.toUpperCase() === snapshot.ticker.toUpperCase()) {
        return { ...pos, currentPrice: snapshot.price };
      }
      return pos;
    });
  }, [positions, snapshot]);

  // Overall PnL Stats Calculation
  const portfolioSummary = useMemo(() => {
    let totalInvestmentTL = 0;
    let totalCurrentValueTL = 0;
    let totalWhatIfValueTL = 0;

    const usdToTl = 34.20; // Nominal conversion for summary aggregation

    updatedPositions.forEach((pos) => {
      const isUsd = pos.market !== 'BIST';
      const multiplier = isUsd ? usdToTl : 1;

      const invest = pos.entryPrice * pos.qty * multiplier;
      const currentVal = pos.currentPrice * pos.qty * multiplier;
      const whatIfVal = pos.targetExitPrice * pos.qty * multiplier;

      totalInvestmentTL += invest;
      totalCurrentValueTL += currentVal;
      totalWhatIfValueTL += whatIfVal;
    });

    const currentPnlTL = totalCurrentValueTL - totalInvestmentTL;
    const currentPnlPct = totalInvestmentTL > 0 ? (currentPnlTL / totalInvestmentTL) * 100 : 0;

    const whatIfPnlTL = totalWhatIfValueTL - totalInvestmentTL;
    const whatIfPnlPct = totalInvestmentTL > 0 ? (whatIfPnlTL / totalInvestmentTL) * 100 : 0;

    return {
      totalInvestmentTL,
      totalCurrentValueTL,
      currentPnlTL,
      currentPnlPct,
      totalWhatIfValueTL,
      whatIfPnlTL,
      whatIfPnlPct,
    };
  }, [updatedPositions]);

  const handleUpdateTarget = (id: string, newTarget: number) => {
    setPositions((prev) =>
      prev.map((pos) => (pos.id === id ? { ...pos, targetExitPrice: newTarget } : pos))
    );
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl backdrop-blur-md space-y-4 font-mono">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-emerald-400 animate-pulse" />
          <h3 className="text-xs font-black text-white uppercase tracking-wider">
            Taktiksel Portföy Yöneticisi &amp; What-If Simülatörü
          </h3>
        </div>

        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
          {updatedPositions.length} Aktif Pozisyon
        </span>
      </div>

      {/* KPI Cards: Real PnL vs What-If Target Scenario */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        {/* Real-time PnL Card */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2">
          <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase font-semibold">
            <span>Canlı Portföy Kâr / Zarar</span>
            <span className="text-emerald-400 font-bold">REAL-TIME</span>
          </div>

          <div className="flex items-baseline justify-between">
            <div className="text-xl font-black text-white">
              ₺{portfolioSummary.totalCurrentValueTL.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
            </div>
            <div
              className={`text-sm font-black flex items-center gap-0.5 ${
                portfolioSummary.currentPnlTL >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {portfolioSummary.currentPnlTL >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              {portfolioSummary.currentPnlTL >= 0 ? '+' : ''}₺{portfolioSummary.currentPnlTL.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} (%{portfolioSummary.currentPnlPct.toFixed(2)})
            </div>
          </div>
        </div>

        {/* What-If Target Scenario Card */}
        <div className="bg-slate-950 border border-cyan-500/40 rounded-xl p-3.5 space-y-2 shadow-[0_0_15px_rgba(6,182,212,0.1)]">
          <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase font-semibold">
            <span className="flex items-center gap-1 text-cyan-300 font-bold">
              <Calculator className="w-3.5 h-3.5" /> What-If Çıkış Hedef Senaryosu
            </span>
            <span className="text-cyan-400 font-bold">SIMULATED</span>
          </div>

          <div className="flex items-baseline justify-between">
            <div className="text-xl font-black text-cyan-300">
              ₺{portfolioSummary.totalWhatIfValueTL.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
            </div>
            <div
              className={`text-sm font-black flex items-center gap-0.5 ${
                portfolioSummary.whatIfPnlTL >= 0 ? 'text-cyan-400' : 'text-rose-400'
              }`}
            >
              <ArrowUpRight className="w-4 h-4" />
              {portfolioSummary.whatIfPnlTL >= 0 ? '+' : ''}₺{portfolioSummary.whatIfPnlTL.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} (%{portfolioSummary.whatIfPnlPct.toFixed(2)})
            </div>
          </div>
        </div>
      </div>

      {/* Positions & What-If Target Input Table */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-x-auto no-scrollbar">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-900 border-b border-slate-800 text-[10px] text-slate-400 uppercase">
            <tr>
              <th className="p-3">Sembol</th>
              <th className="p-3">Giriş / Canlı Fiyat</th>
              <th className="p-3">Miktar (Lot)</th>
              <th className="p-3">Anlık PnL</th>
              <th className="p-3">What-If Hedef Fiyat</th>
              <th className="p-3 text-right">Potansiyel Getiri</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {updatedPositions.map((pos) => {
              const currency = pos.market === 'BIST' ? '₺' : '$';
              const pnlUnit = (pos.currentPrice - pos.entryPrice) * pos.qty;
              const pnlPct = ((pos.currentPrice - pos.entryPrice) / pos.entryPrice) * 100;

              const whatIfUnit = (pos.targetExitPrice - pos.entryPrice) * pos.qty;
              const whatIfPct = ((pos.targetExitPrice - pos.entryPrice) / pos.entryPrice) * 100;

              return (
                <tr key={pos.id} className="hover:bg-slate-900/60 transition">
                  <td className="p-3 font-bold">
                    <div className="text-white text-xs">#{pos.symbol}</div>
                    <div className="text-[9px] text-slate-500">{pos.market}</div>
                  </td>
                  <td className="p-3">
                    <div className="text-slate-400 text-[11px]">Giriş: {currency}{pos.entryPrice.toFixed(2)}</div>
                    <div className="text-emerald-400 font-bold">Canlı: {currency}{pos.currentPrice.toFixed(2)}</div>
                  </td>
                  <td className="p-3 text-slate-200 font-bold">{pos.qty}</td>
                  <td className="p-3">
                    <span className={`font-bold ${pnlUnit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {pnlUnit >= 0 ? '+' : ''}{currency}{pnlUnit.toFixed(2)} (%{pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(2)})
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1">
                      <span className="text-slate-500 text-[10px]">{currency}</span>
                      <input
                        type="number"
                        step="0.1"
                        value={pos.targetExitPrice}
                        onChange={(e) => handleUpdateTarget(pos.id, parseFloat(e.target.value) || pos.entryPrice)}
                        className="w-20 bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-xs text-cyan-300 font-bold focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </td>
                  <td className="p-3 text-right font-bold">
                    <span className={whatIfUnit >= 0 ? 'text-cyan-300' : 'text-rose-400'}>
                      {whatIfUnit >= 0 ? '+' : ''}{currency}{whatIfUnit.toFixed(2)} (%{whatIfPct >= 0 ? '+' : ''}{whatIfPct.toFixed(2)})
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TacticalPortfolioManager;
