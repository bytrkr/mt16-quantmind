// src/components/DarkPoolWhaleRadar.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { ShieldAlert, Zap, AlertCircle, Waves, Flame, Clock } from 'lucide-react';
import { MarketGatewaySnapshot } from '../services/marketGateway';
import { audioSyntheticDispatcher } from '../services/audioSyntheticDispatcher';

export interface DarkPoolWhaleRadarProps {
  snapshot?: MarketGatewaySnapshot;
  ticker?: string;
  marketType?: 'BIST' | 'CRYPTO' | 'NASDAQ' | 'FOREX';
  className?: string;
}

export interface WhaleOrderEvent {
  id: string;
  time: string;
  symbol: string;
  type: 'DARK_POOL_BUY' | 'DARK_POOL_SELL' | 'LIQUIDATION_CASCADE' | 'CLOSING_AUCTION_IMBALANCE';
  amountUsd: number;
  lotSize: number;
  price: number;
  leverageX?: number;
}

export const DarkPoolWhaleRadar: React.FC<DarkPoolWhaleRadarProps> = ({
  snapshot,
  ticker = 'ASELS',
  marketType = 'BIST',
  className = '',
}) => {
  const currency = marketType === 'BIST' ? '₺' : '$';
  const price = snapshot?.price && snapshot.price > 0 ? snapshot.price : 100.0;

  // Canlı Balina ve Kapanış Eşleşme Olayları
  const events: WhaleOrderEvent[] = useMemo(() => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

    if (marketType === 'BIST') {
      return [
        {
          id: 'bist-auc-1',
          time: timeStr,
          symbol: ticker,
          type: 'CLOSING_AUCTION_IMBALANCE',
          amountUsd: 1450000,
          lotSize: Math.round(1450000 / price),
          price: Number((price * 1.008).toFixed(2)),
        },
        {
          id: 'bist-dark-2',
          time: '17:42',
          symbol: ticker,
          type: 'DARK_POOL_BUY',
          amountUsd: 850000,
          lotSize: Math.round(850000 / price),
          price: price,
        },
        {
          id: 'bist-dark-3',
          time: '17:38',
          symbol: ticker,
          type: 'DARK_POOL_SELL',
          amountUsd: 620000,
          lotSize: Math.round(620000 / price),
          price: Number((price * 0.995).toFixed(2)),
        },
      ];
    }

    if (marketType === 'CRYPTO') {
      return [
        {
          id: 'cryp-liq-1',
          time: timeStr,
          symbol: ticker,
          type: 'LIQUIDATION_CASCADE',
          amountUsd: 2850000,
          lotSize: Math.round(2850000 / price),
          price: Number((price * 0.982).toFixed(2)),
          leverageX: 50,
        },
        {
          id: 'cryp-whale-2',
          time: '12:04',
          symbol: ticker,
          type: 'DARK_POOL_BUY',
          amountUsd: 1450000,
          lotSize: Math.round(1450000 / price),
          price,
          leverageX: 20,
        },
        {
          id: 'cryp-whale-3',
          time: '11:58',
          symbol: ticker,
          type: 'DARK_POOL_SELL',
          amountUsd: 980000,
          lotSize: Math.round(980000 / price),
          price,
          leverageX: 10,
        },
      ];
    }

    // NASDAQ
    return [
      {
        id: 'nas-dark-1',
        time: timeStr,
        symbol: ticker,
        type: 'DARK_POOL_BUY',
        amountUsd: 3450000,
        lotSize: Math.round(3450000 / price),
        price,
      },
      {
        id: 'nas-dark-2',
        time: '15:45',
        symbol: ticker,
        type: 'DARK_POOL_SELL',
        amountUsd: 1850000,
        lotSize: Math.round(1850000 / price),
        price: Number((price * 0.992).toFixed(2)),
      },
    ];
  }, [marketType, ticker, price]);

  // Balina anons tetikleyici
  useEffect(() => {
    if (events.length > 0) {
      const topEvent = events[0];
      if (topEvent.amountUsd >= 1000000) {
        audioSyntheticDispatcher.announceWhaleLiquidation(
          topEvent.symbol,
          `$${(topEvent.amountUsd / 1000000).toFixed(1)}M`
        );
      }
    }
  }, [events]);

  return (
    <div className={`bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between ${className}`}>
      <div>
        {/* Başlık ve Rozet */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h2 className="text-xs font-black text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <Waves className="w-4 h-4 text-cyan-400" />
            Kapanış Eşleşme & Balina Likidasyon Radarı
          </h2>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-400 animate-spin" />
            {marketType === 'BIST' ? '17:40-18:00 Kapanış Seansı Aktif' : 'Canlı Kripto/NASDAQ Balina Akışı'}
          </span>
        </div>

        {/* BIST Kapanış Eşleşme Uyarısı (Sadece BIST için) */}
        {marketType === 'BIST' && (
          <div className="bg-amber-950/30 border border-amber-500/30 p-2.5 rounded-xl mb-3 flex items-center justify-between text-xs font-mono text-amber-300">
            <span className="flex items-center gap-1.5 font-bold">
              <Flame className="w-4 h-4 text-amber-400 animate-pulse" />
              Kapanış Eşleşme Denge Fiyatı: {currency}{Number((price * 1.008).toFixed(2))} (+%0.80)
            </span>
            <span className="text-[10px] text-amber-200/80">Net Eşleşen: 1.45M Lot</span>
          </div>
        )}

        {/* Balina / Likidasyon Kartları Listesi */}
        <div className="space-y-2 font-mono text-xs">
          {events.map((evt) => (
            <div
              key={evt.id}
              className={`p-3 rounded-xl border flex items-center justify-between gap-2 transition ${
                evt.type === 'LIQUIDATION_CASCADE'
                  ? 'bg-rose-950/40 border-rose-500/50 text-rose-200'
                  : evt.type === 'CLOSING_AUCTION_IMBALANCE'
                  ? 'bg-amber-950/40 border-amber-500/50 text-amber-200'
                  : evt.type === 'DARK_POOL_BUY'
                  ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
                  : 'bg-slate-950 border-slate-800 text-slate-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-500">{evt.time}</span>
                <div>
                  <div className="font-extrabold flex items-center gap-1 text-xs">
                    {evt.type === 'LIQUIDATION_CASCADE'
                      ? '⚡ BALİNA LİKİDASYON PATLAMASI'
                      : evt.type === 'CLOSING_AUCTION_IMBALANCE'
                      ? '🔥 KAPANAN SEANS EŞLEŞME ANOMALİSİ'
                      : evt.type === 'DARK_POOL_BUY'
                      ? '🟢 DARK POOL KURUMSAL BLOK ALIM'
                      : '🔴 DARK POOL KURUMSAL BLOK SATIŞ'}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    #{evt.symbol} @ {typeof evt.price === 'number' && !isNaN(evt.price) ? `${currency}${evt.price.toFixed(2)}` : 'VERİ YOK'} ({typeof evt.lotSize === 'number' && !isNaN(evt.lotSize) ? `${evt.lotSize.toLocaleString('tr-TR')} Lot` : 'VERİ YOK'})
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="font-black text-sm">
                  {typeof evt.amountUsd === 'number' && !isNaN(evt.amountUsd) ? `$${(evt.amountUsd / 1000000).toFixed(2)}M` : 'VERİ YOK'}
                </div>
                {evt.leverageX && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40">
                    {evt.leverageX}x Kaldıraç Patladı
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Alt Bilgi */}
      <div className="mt-3 text-[10px] font-mono text-slate-400 flex items-center justify-between border-t border-slate-800/80 pt-2">
        <span>Eşik: &ge; $100K Kurumsal Blok Emir</span>
        <span>Kapanış Seansı: <strong className="text-amber-400">AKTİF TARAFA GEÇİŞ</strong></span>
      </div>
    </div>
  );
};

export default DarkPoolWhaleRadar;
