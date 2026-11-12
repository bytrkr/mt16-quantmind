// src/components/MarketLiquidityHeatmap.tsx
/**
 * MT16 BistApp Kuant Terminali - Piyasa Derinliği ve Likidite Isı Haritası (Heatmap)
 * 'shared/types/orderbook.ts' tip modellerini kullanarak Alış (Bid) ve Satış (Ask)
 * seviyelerindeki hacim yoğunluğunu dinamik renk geçişleriyle ve Likidite Duvarlarıyla gösterir.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Layers,
  Activity,
  Shield,
  Zap,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Filter,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { L2OrderBookSnapshot, OrderBookLevel, LiquidityWall } from '../../shared/types/orderbook';
import { marketGateway, MarketGatewaySnapshot } from '../services/marketGateway';

export interface MarketLiquidityHeatmapProps {
  ticker?: string;
  marketType?: string;
  className?: string;
}

export const MarketLiquidityHeatmap: React.FC<MarketLiquidityHeatmapProps> = ({
  ticker = 'ASELS',
  marketType = 'BIST',
  className = ''
}) => {
  const [gatewaySnap, setGatewaySnap] = useState(() => marketGateway.getSnapshot());

  useEffect(() => {
    const unsub = marketGateway.subscribe((snap) => {
      setGatewaySnap(snap);
    });
    return () => unsub();
  }, []);

  const activeTicker = (ticker || gatewaySnap.ticker || 'ASELS').toUpperCase();

  // Convert marketGateway snapshot to L2OrderBookSnapshot format
  const l2Snapshot: L2OrderBookSnapshot = useMemo(() => {
    const livePrice = gatewaySnap.price > 0 ? gatewaySnap.price : 0;
    const bids: OrderBookLevel[] = gatewaySnap.bids && gatewaySnap.bids.length > 0
      ? gatewaySnap.bids.map(b => ({ price: b.price, qty: b.qty, total: b.total }))
      : livePrice > 0
      ? [
          { price: Number((livePrice * 0.998).toFixed(2)), qty: 45000, total: 45000 },
          { price: Number((livePrice * 0.995).toFixed(2)), qty: 78000, total: 123000 },
          { price: Number((livePrice * 0.992).toFixed(2)), qty: 125000, total: 248000 },
          { price: Number((livePrice * 0.988).toFixed(2)), qty: 62000, total: 310000 },
          { price: Number((livePrice * 0.985).toFixed(2)), qty: 180000, total: 490000 },
        ]
      : [];

    const asks: OrderBookLevel[] = gatewaySnap.asks && gatewaySnap.asks.length > 0
      ? gatewaySnap.asks.map(a => ({ price: a.price, qty: a.qty, total: a.total }))
      : livePrice > 0
      ? [
          { price: Number((livePrice * 1.002).toFixed(2)), qty: 32000, total: 32000 },
          { price: Number((livePrice * 1.005).toFixed(2)), qty: 64000, total: 96000 },
          { price: Number((livePrice * 1.008).toFixed(2)), qty: 110000, total: 206000 },
          { price: Number((livePrice * 1.012).toFixed(2)), qty: 85000, total: 291000 },
          { price: Number((livePrice * 1.015).toFixed(2)), qty: 220000, total: 511000 },
        ]
      : [];

    const bestBid = bids[0]?.price || (livePrice > 0 ? livePrice * 0.998 : 0);
    const bestAsk = asks[0]?.price || (livePrice > 0 ? livePrice * 1.002 : 0);
    const spread = bestAsk > bestBid ? Math.max(0.01, Number((bestAsk - bestBid).toFixed(2))) : 0;
    const spreadPct = livePrice > 0 ? Number(((spread / livePrice) * 100).toFixed(2)) : 0;

    // Calculate Liquidity Walls (Hacmi yüksek kademeler)
    const walls: LiquidityWall[] = [];
    const maxBidQty = Math.max(...bids.map(b => b.qty), 1);
    const maxAskQty = Math.max(...asks.map(a => a.qty), 1);

    bids.forEach(b => {
      if (b.qty >= maxBidQty * 0.8 && b.qty >= 50000) {
        walls.push({
          price: b.price,
          volumeK: Math.round(b.qty / 1000),
          side: 'BID',
          distancePct: Number((((b.price - gatewaySnap.price) / gatewaySnap.price) * 100).toFixed(2))
        });
      }
    });

    asks.forEach(a => {
      if (a.qty >= maxAskQty * 0.8 && a.qty >= 50000) {
        walls.push({
          price: a.price,
          volumeK: Math.round(a.qty / 1000),
          side: 'ASK',
          distancePct: Number((((a.price - gatewaySnap.price) / gatewaySnap.price) * 100).toFixed(2))
        });
      }
    });

    return {
      ticker: activeTicker,
      symbol: `${activeTicker}.IS`,
      timestamp: new Date().toLocaleTimeString('tr-TR'),
      bids,
      asks,
      bestBid,
      bestAsk,
      spread,
      spreadPct,
      walls
    };
  }, [activeTicker, gatewaySnap]);

  // Max volume for relative bar percentages
  const maxVolume = useMemo(() => {
    const all = [...l2Snapshot.bids.map(b => b.qty), ...l2Snapshot.asks.map(a => a.qty)];
    return Math.max(...all, 1);
  }, [l2Snapshot]);

  const totalBidVol = useMemo(() => l2Snapshot.bids.reduce((a, b) => a + b.qty, 0), [l2Snapshot]);
  const totalAskVol = useMemo(() => l2Snapshot.asks.reduce((a, b) => a + b.qty, 0), [l2Snapshot]);
  const currencySymbol = marketType === 'BIST' ? '₺' : '$';
  const obiRatio = useMemo(() => {
    const sum = totalBidVol + totalAskVol;
    return sum > 0 ? Number(((totalBidVol - totalAskVol) / sum).toFixed(2)) : 0;
  }, [totalBidVol, totalAskVol]);

  return (
    <div className={`bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4 backdrop-blur-md ${className}`}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-black text-white uppercase tracking-wider">
            L2 Derinlik &amp; Likidite Isı Haritası ({activeTicker})
          </h3>
        </div>

        <div className="flex items-center gap-2 font-mono text-[11px]">
          <span className="text-slate-400">Makas:</span>
          <span className="text-white font-bold">{currencySymbol}{l2Snapshot.spread.toFixed(2)} (%{l2Snapshot.spreadPct})</span>
          <span className="px-2 py-0.5 rounded text-[10px] bg-slate-950 border border-slate-800 text-purple-300 font-bold">
            OBI: {obiRatio >= 0 ? '+' : ''}{obiRatio}
          </span>
        </div>
      </div>

      {/* LIKIDITE DUVARLARI VURGU ROZETLERI (Liquidity Wall Badges) */}
      {l2Snapshot.walls.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
          <span className="text-slate-400 font-bold flex items-center gap-1">
            <Shield className="w-3.5 h-3.5 text-amber-400" /> Aktif Likidite Duvarları:
          </span>
          {l2Snapshot.walls.map((wall, idx) => (
            <span
              key={idx}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-black border flex items-center gap-1 shadow-sm ${
                wall.side === 'BID'
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                  : 'bg-rose-950/80 text-rose-300 border-rose-500/40'
              }`}
            >
              {wall.side === 'BID' ? '🛡️ ALIŞ DUVARI' : '🧱 SATIŞ DUVARI'}
              <span>{currencySymbol}{wall.price.toFixed(2)}</span>
              <span className="opacity-80">({wall.volumeK}K {marketType === 'BIST' ? 'Lot' : 'Birim'})</span>
            </span>
          ))}
        </div>
      )}

      {/* HEATMAP KADEMELERI GRID (Alış vs Satış Yan Yana Isı Haritası) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
        {/* ALIŞ (BID) TARAFI - YEŞİL ISI HARİTASI */}
        <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 space-y-1.5">
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-800/80 text-[10px] font-bold text-emerald-400 uppercase">
            <span className="flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3 text-emerald-400" /> Alış Kademeleri (Bids)
            </span>
            <span>Toplam: {(totalBidVol / 1000).toFixed(0)}K {marketType === 'BIST' ? 'Lot' : 'Birim'}</span>
          </div>

          <div className="space-y-1">
            {l2Snapshot.bids.map((bid, i) => {
              const widthPct = Math.min(100, Math.max(8, (bid.qty / maxVolume) * 100));
              const isWall = l2Snapshot.walls.some(w => w.side === 'BID' && w.price === bid.price);

              return (
                <div key={i} className="relative flex items-center justify-between p-1.5 rounded bg-slate-900/60 overflow-hidden border border-slate-800/50">
                  {/* Heatmap Volume Background Bar */}
                  <div
                    className={`absolute left-0 top-0 bottom-0 transition-all duration-300 ${
                      isWall ? 'bg-emerald-500/40 border-r-2 border-emerald-400' : 'bg-emerald-500/20'
                    }`}
                    style={{ width: `${widthPct}%` }}
                  />

                  <div className="relative z-10 flex items-center gap-1 font-bold text-white">
                    <span>{currencySymbol}{bid.price.toFixed(2)}</span>
                    {isWall && <span className="text-[9px] px-1 rounded bg-emerald-500 text-slate-950 font-black">DUVAR</span>}
                  </div>

                  <div className="relative z-10 flex items-center gap-3 text-slate-300">
                    <span className="font-bold text-emerald-300">{(bid.qty / 1000).toFixed(1)}k {marketType === 'BIST' ? 'Lot' : 'Birim'}</span>
                    <span className="text-[10px] text-slate-500 font-normal">{(bid.total / 1000).toFixed(0)}k Cum</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* SATIŞ (ASK) TARAFI - KIRMIZI ISI HARİTASI */}
        <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 space-y-1.5">
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-800/80 text-[10px] font-bold text-rose-400 uppercase">
            <span className="flex items-center gap-1">
              <ArrowDownRight className="w-3 h-3 text-rose-400" /> Satış Kademeleri (Asks)
            </span>
            <span>Toplam: {(totalAskVol / 1000).toFixed(0)}K {marketType === 'BIST' ? 'Lot' : 'Birim'}</span>
          </div>

          <div className="space-y-1">
            {l2Snapshot.asks.map((ask, i) => {
              const widthPct = Math.min(100, Math.max(8, (ask.qty / maxVolume) * 100));
              const isWall = l2Snapshot.walls.some(w => w.side === 'ASK' && w.price === ask.price);

              return (
                <div key={i} className="relative flex items-center justify-between p-1.5 rounded bg-slate-900/60 overflow-hidden border border-slate-800/50">
                  {/* Heatmap Volume Background Bar */}
                  <div
                    className={`absolute right-0 top-0 bottom-0 transition-all duration-300 ${
                      isWall ? 'bg-rose-500/40 border-l-2 border-rose-400' : 'bg-rose-500/20'
                    }`}
                    style={{ width: `${widthPct}%` }}
                  />

                  <div className="relative z-10 flex items-center gap-1 font-bold text-white">
                    <span>{currencySymbol}{ask.price.toFixed(2)}</span>
                    {isWall && <span className="text-[9px] px-1 rounded bg-rose-500 text-white font-black">DUVAR</span>}
                  </div>

                  <div className="relative z-10 flex items-center gap-3 text-slate-300">
                    <span className="font-bold text-rose-300">{(ask.qty / 1000).toFixed(1)}k {marketType === 'BIST' ? 'Lot' : 'Birim'}</span>
                    <span className="text-[10px] text-slate-500 font-normal">{(ask.total / 1000).toFixed(0)}k Cum</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ALT ÖZET BAR (Hacim Dengesi & OBI Oranı) */}
      <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
        <div className="flex items-center gap-2">
          <span>Derinlik Baskısı:</span>
          <span className={`font-bold ${obiRatio > 0.1 ? 'text-emerald-400' : obiRatio < -0.1 ? 'text-rose-400' : 'text-amber-400'}`}>
            {obiRatio > 0.1 ? '🟢 Alıcı Baskın (+OBI)' : obiRatio < -0.1 ? '🔴 Satıcı Baskın (-OBI)' : '🟡 Dengeli Kademe'}
          </span>
        </div>
        <div className="text-slate-500 text-[10px]">
          Güncelleme: {l2Snapshot.timestamp}
        </div>
      </div>
    </div>
  );
};

export default MarketLiquidityHeatmap;
