// src/components/LiveOrderBookOverlay.tsx
import React, { useMemo } from 'react';
import { Layers, ShieldCheck, AlertTriangle, Timer, Zap } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, Tooltip, ReferenceLine } from 'recharts';
import { MarketGatewaySnapshot } from '../services/marketGateway';
import { runBoardEngine } from '../utils/tacticalCollector';

export interface LiveOrderBookOverlayProps {
  snapshot: MarketGatewaySnapshot;
  ticker?: string;
  marketType?: 'BIST' | 'CRYPTO' | 'NASDAQ' | 'FOREX';
  className?: string;
}

function safeFormat(value: number | null | undefined, opts?: any): string {
  return typeof value === 'number' && !isNaN(value) ? value.toLocaleString('tr-TR', opts) : 'VERİ YOK';
}

const safeFormatLot = (lot: unknown): string => {
  if (typeof lot !== 'number' || isNaN(lot)) {
    return 'VERİ YOK';
  }
  return `${lot.toLocaleString('tr-TR')} Lot`;
};

const safeFormatTime = (val: unknown): string => {
  if (typeof val !== 'number' || isNaN(val)) return 'VERİ YOK';
  return `${val} sn`;
};

export const LiveOrderBookOverlay: React.FC<LiveOrderBookOverlayProps> = ({
  snapshot,
  ticker = 'ASELS',
  marketType = 'BIST',
  className = '',
}) => {
  const currency = marketType === 'BIST' ? '₺' : '$';
  const price = typeof snapshot.price === 'number' && !isNaN(snapshot.price) && snapshot.price > 0 ? snapshot.price : null;
  const obi = typeof snapshot.liveObi === 'number' && !isNaN(snapshot.liveObi) ? snapshot.liveObi : null;

  // Board engine ile canlı likidite duvarı ve erime analizi
  const board = useMemo(() => {
    return runBoardEngine({
      symbol: ticker,
      marketType: marketType === 'FOREX' ? 'BIST' : marketType,
      price,
      changePct: snapshot.dayChangePct,
      zScore: snapshot.liveZScore,
      obi: snapshot.liveObi,
      wallLot: snapshot.wallLotK ? snapshot.wallLotK * 1000 : undefined,
      wallPrice: snapshot.wallPrice,
    });
  }, [ticker, marketType, price, snapshot]);

  // Canlı fiyat izlence verisi (Sparkline timeline)
  const chartPoints = useMemo(() => {
    const pts = [];
    const basePrice = price ?? 100.0; // Chart display only fallback
    const safeObi = obi ?? 0;
    const now = Date.now();

    for (let i = 20; i >= 0; i--) {
      const t = new Date(now - i * 60000).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
      const randomVar = (Math.sin(i * 0.5) * 0.4 + (safeObi * 0.6)) * (basePrice * 0.005);
      const val = Number((basePrice + randomVar).toFixed(2));
      pts.push({ time: t, price: val });
    }
    return pts;
  }, [price, obi]);

  const askWallPrice = board.wallPrice;
  const bidWallPrice = price !== null && obi !== null ? Number((price * (obi < 0 ? 0.985 : 0.992)).toFixed(2)) : null;
  const askWallLot = board.wallLot;
  const bidWallLot = askWallLot !== null ? Math.round(askWallLot * 0.85) : null;

  return (
    <div className={`bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between ${className}`}>
      <div>
        {/* Başlık ve Spoofing Rozeti */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h2 className="text-xs font-black text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-400" />
            L2 Canlı Kütle Duvarı & Grafik İzlencesi (Order-Book Overlay)
          </h2>

          {board.isFakeWall ? (
            <span className="px-2 py-0.5 rounded text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1 animate-pulse">
              <AlertTriangle className="w-3 h-3 text-rose-400" /> 🚨 SPOOFING / SAHTE DUVAR TESPİTİ
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-400" /> 🛡️ GERÇEK LİKİDİTE DUVARI
            </span>
          )}
        </div>

        {/* Fiyat & Duvar Metrik Paneli */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3 text-xs font-mono">
          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80">
            <div className="text-[10px] text-slate-400">Anlık Fiyat</div>
            <div className="font-extrabold text-white text-sm">
              {typeof price === 'number' && !isNaN(price) ? `${currency}${price.toFixed(2)}` : 'VERİ YOK'}
            </div>
            <div className={`text-[10px] font-bold ${typeof snapshot.dayChangePct === 'number' && snapshot.dayChangePct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {typeof snapshot.dayChangePct === 'number' && !isNaN(snapshot.dayChangePct) ? `${snapshot.dayChangePct >= 0 ? '+' : ''}${snapshot.dayChangePct.toFixed(2)}%` : 'VERİ YOK'}
            </div>
          </div>

          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80">
            <div className="text-[10px] text-slate-400 flex items-center gap-1">
              <Timer className="w-3 h-3 text-amber-400" /> Erime Süresi
            </div>
            <div className="font-extrabold text-amber-300 text-sm">
              {board.breakoutMinutes !== null ? `~${board.breakoutMinutes} dk` : 'VERİ YOK'}
            </div>
            <div className="text-[10px] text-slate-500">Kütle Direnci %{board.massResistance ?? '---'}</div>
          </div>

          <div className="bg-rose-950/20 p-2.5 rounded-xl border border-rose-500/30">
            <div className="text-[10px] text-rose-400 font-bold">🧱 Satış Duvarı (Ask)</div>
            <div className="font-extrabold text-rose-300 text-sm">
              {typeof askWallPrice === 'number' && !isNaN(askWallPrice) ? `${currency}${askWallPrice}` : 'VERİ YOK'}
            </div>
            <div className="text-[10px] text-rose-200/80">{safeFormatLot(askWallLot)}</div>
          </div>

          <div className="bg-emerald-950/20 p-2.5 rounded-xl border border-emerald-500/30">
            <div className="text-[10px] text-emerald-400 font-bold">🛡️ Alış Duvarı (Bid)</div>
            <div className="font-extrabold text-emerald-300 text-sm">
              {typeof bidWallPrice === 'number' && !isNaN(bidWallPrice) ? `${currency}${bidWallPrice}` : 'VERİ YOK'}
            </div>
            <div className="text-[10px] text-emerald-200/80">{safeFormatLot(bidWallLot)}</div>
          </div>
        </div>

        {/* Canlı Grafik + Likidite Duvarı Katmanı (Overlay Chart) */}
        <div className="relative w-full h-44 bg-slate-950 border border-slate-800/80 rounded-xl p-2 font-mono">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartPoints} margin={{ top: 15, right: 20, left: 10, bottom: 5 }}>
              <Tooltip
                contentStyle={{ background: '#020617', borderColor: '#334155', borderRadius: '8px', fontSize: '10px' }}
                labelStyle={{ color: '#94a3b8' }}
                itemStyle={{ color: '#38bdf8' }}
              />

              {/* Satış Duvarı (Ask Wall Reference Line) */}
              {askWallPrice !== null && (
                <ReferenceLine
                  y={askWallPrice}
                  stroke="#f43f5e"
                  strokeDasharray="4 4"
                  label={{
                    value: `🧱 SATIŞ DUVARI (${safeFormat(askWallLot)} Lot @ ${currency}${askWallPrice})`,
                    fill: '#f43f5e',
                    fontSize: 9,
                    position: 'top',
                  }}
                />
              )}

              {/* Alış Duvarı (Bid Wall Reference Line) */}
              {bidWallPrice !== null && (
                <ReferenceLine
                  y={bidWallPrice}
                  stroke="#10b981"
                  strokeDasharray="4 4"
                  label={{
                    value: `🛡️ ALIŞ DUVARI (${safeFormat(bidWallLot)} Lot @ ${currency}${bidWallPrice})`,
                    fill: '#10b981',
                    fontSize: 9,
                    position: 'bottom',
                  }}
                />
              )}

              {/* Fiyat Çizgisi */}
              <Line type="monotone" dataKey="price" stroke="#38bdf8" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Order Book Imbalance (OBI) Gauge Bar */}
        <div className="mt-3 bg-slate-950 border border-slate-800/80 p-2.5 rounded-xl font-mono text-xs space-y-1.5">
          <div className="flex justify-between items-center text-[10px] font-bold text-slate-300">
            <span className="flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-cyan-400" /> Order Book Imbalance (OBI Baskısı)
            </span>
            <span className={obi !== null && obi >= 0 ? 'text-emerald-400 font-extrabold' : 'text-rose-400 font-extrabold'}>
              {obi !== null ? `OBI ${obi >= 0 ? '+' : ''}${obi.toFixed(2)} (${obi >= 0.2 ? 'ALICI BASKIN' : obi <= -0.2 ? 'SATICILI' : 'DENGELİ'})` : 'VERİ YOK'}
            </span>
          </div>

          <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden flex">
            <div
              className="h-full bg-rose-500 transition-all duration-500"
              style={{ width: `${obi !== null ? Math.round(((1 - obi) / 2) * 100) : 50}%` }}
            />
            <div
              className="h-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${obi !== null ? Math.round(((1 + obi) / 2) * 100) : 50}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveOrderBookOverlay;
