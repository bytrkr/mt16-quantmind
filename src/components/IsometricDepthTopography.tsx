// src/components/IsometricDepthTopography.tsx
import React, { useState, useMemo } from 'react';
import { Layers, Activity, Zap, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import { MarketGatewaySnapshot } from '../services/marketGateway';

export interface IsometricDepthTopographyProps {
  snapshot?: MarketGatewaySnapshot;
  ticker?: string;
  marketType?: 'BIST' | 'CRYPTO' | 'NASDAQ' | 'FOREX';
  className?: string;
}

export interface DepthTier3D {
  level: number;       // 1 .. 10 kademe derinliği
  price: number;
  lots: number;
  side: 'BID' | 'ASK';
  meltMinutes: number; // Erime hızı
  insertCancelRatio: number; // Emir Ekleme / İptal Oranı
}

export const IsometricDepthTopography: React.FC<IsometricDepthTopographyProps> = ({
  snapshot,
  ticker = 'ASELS',
  marketType = 'BIST',
  className = '',
}) => {
  const currency = marketType === 'BIST' ? '₺' : '$';
  const currentPrice = snapshot?.price && snapshot.price > 0 ? snapshot.price : 100.0;
  const obi = snapshot?.liveObi ?? 0.12;

  const [hoveredTier, setHoveredTier] = useState<DepthTier3D | null>(null);

  // 10 Alış + 10 Satış 3D Kademe Verisi Üretimi
  const depthTiers: DepthTier3D[] = useMemo(() => {
    const list: DepthTier3D[] = [];
    const baseLots = snapshot?.wallLotK ? snapshot.wallLotK * 100 : 45000;

    // 5 Alış Kademesi (Bids)
    for (let i = 1; i <= 5; i++) {
      const price = Number((currentPrice * (1 - i * 0.003)).toFixed(2));
      const lots = Math.round(baseLots * (1 + (i === 5 ? 2.5 : i * 0.3) + Math.abs(obi)));
      list.push({
        level: i,
        price,
        lots,
        side: 'BID',
        meltMinutes: Math.max(3, Math.round(35 - i * 4 - obi * 10)),
        insertCancelRatio: Number((1.2 + i * 0.15 + obi).toFixed(2)),
      });
    }

    // 5 Satış Kademesi (Asks)
    for (let i = 1; i <= 5; i++) {
      const price = Number((currentPrice * (1 + i * 0.003)).toFixed(2));
      const lots = Math.round(baseLots * (0.9 + (i === 4 ? 3.0 : i * 0.25) - obi * 0.2));
      list.push({
        level: i,
        price,
        lots,
        side: 'ASK',
        meltMinutes: Math.max(3, Math.round(30 - i * 3 + obi * 8)),
        insertCancelRatio: Number((0.85 + i * 0.1 - obi * 0.2).toFixed(2)),
      });
    }

    return list;
  }, [currentPrice, obi, snapshot]);

  // İzometrik Çizim Parametreleri (SVG ViewBox 600x320)
  const width = 580;
  const height = 280;
  const maxLots = Math.max(...depthTiers.map((t) => t.lots), 1);

  // İzometrik Izgara Çizim Yardımcısı
  const renderIsometricBlock = (tier: DepthTier3D, idx: number) => {
    const isBid = tier.side === 'BID';
    const lotRatio = tier.lots / maxLots;
    const blockHeight = Math.max(12, Math.round(lotRatio * 75));

    // İzometrik 3D Blok Merkez Koordinatları
    const xBase = isBid ? 180 - idx * 28 : 380 + idx * 28;
    const yBase = 180 + idx * 12;
    const blockWidth = 32;

    // İzometrik Poligon Yüzeyleri (Top, Front, Side)
    const topPoly = `${xBase},${yBase - blockHeight} ${xBase + blockWidth},${yBase - blockHeight - 12} ${xBase + blockWidth * 2},${yBase - blockHeight} ${xBase + blockWidth},${yBase - blockHeight + 12}`;
    const frontPoly = `${xBase},${yBase - blockHeight} ${xBase + blockWidth},${yBase - blockHeight + 12} ${xBase + blockWidth},${yBase + 12} ${xBase},${yBase}`;
    const sidePoly = `${xBase + blockWidth},${yBase - blockHeight + 12} ${xBase + blockWidth * 2},${yBase - blockHeight} ${xBase + blockWidth * 2},${yBase} ${xBase + blockWidth},${yBase + 12}`;

    const mainColor = isBid ? '#10b981' : '#f43f5e';
    const topColor = isBid ? '#34d399' : '#fb7185';
    const sideColor = isBid ? '#059669' : '#e11d48';

    return (
      <g
        key={`${tier.side}-${tier.level}`}
        className="cursor-pointer transition-all duration-300 hover:opacity-100 opacity-90"
        onMouseEnter={() => setHoveredTier(tier)}
        onMouseLeave={() => setHoveredTier(null)}
      >
        {/* Top Face */}
        <polygon points={topPoly} fill={topColor} stroke="#020617" strokeWidth="0.8" />
        {/* Front Face */}
        <polygon points={frontPoly} fill={mainColor} stroke="#020617" strokeWidth="0.8" />
        {/* Side Face */}
        <polygon points={sidePoly} fill={sideColor} stroke="#020617" strokeWidth="0.8" />

        {/* Fiyat & Lot Metni */}
        <text
          x={xBase + blockWidth}
          y={yBase - blockHeight - 16}
          textAnchor="middle"
          fill="#f8fafc"
          fontSize="11"
          fontWeight="bold"
          fontFamily="monospace"
        >
          {currency}{tier.price.toFixed(2)}
        </text>
        <text
          x={xBase + blockWidth}
          y={yBase - blockHeight - 4}
          textAnchor="middle"
          fill={topColor}
          fontSize="10"
          fontWeight="600"
          fontFamily="monospace"
        >
          {(tier.lots / 1000).toFixed(0)}k Lot
        </text>
      </g>
    );
  };

  return (
    <div className={`bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between ${className}`}>
      <div>
        {/* Başlık */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h2 className="text-xs font-black text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            3D / İzometrik L2 Derinlik Topoğrafyası
          </h2>
          <div className="flex items-center gap-2 text-[10px] font-mono">
            <span className="flex items-center gap-1 text-emerald-400">
              <span className="w-2.5 h-2.5 bg-emerald-500 rounded-sm inline-block" /> Alış Kademeleri (Bid Depth)
            </span>
            <span className="flex items-center gap-1 text-rose-400">
              <span className="w-2.5 h-2.5 bg-rose-500 rounded-sm inline-block" /> Satış Kademeleri (Ask Depth)
            </span>
          </div>
        </div>

        {/* 3D Topoğrafya Canvas / SVG Konteyneri */}
        <div className="relative w-full bg-slate-950 border border-slate-800/80 rounded-xl overflow-hidden p-2">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto select-none">
            {/* İzometrik Taban Izgarası */}
            <line x1="50" y1="210" x2="290" y2="290" stroke="#1e293b" strokeWidth="1.5" strokeDasharray="3 3" />
            <line x1="530" y1="210" x2="290" y2="290" stroke="#1e293b" strokeWidth="1.5" strokeDasharray="3 3" />

            {/* Fiyat Ekseni Orta Çizgisi (Mid Price Base) */}
            <circle cx="290" cy="240" r="4" fill="#38bdf8" className="animate-ping" />
            <text x="290" y="260" textAnchor="middle" fill="#38bdf8" fontSize="10" fontWeight="bold" fontFamily="monospace">
              ANLIK ORTA FİYAT: {currency}{currentPrice.toFixed(2)}
            </text>

            {/* 5 Alış Kademesi 3D Çizimi */}
            {depthTiers.filter((t) => t.side === 'BID').map((tier, idx) => renderIsometricBlock(tier, idx))}

            {/* 5 Satış Kademesi 3D Çizimi */}
            {depthTiers.filter((t) => t.side === 'ASK').map((tier, idx) => renderIsometricBlock(tier, idx))}
          </svg>

          {/* Kademe Detay Hover Bilgi Kutusu */}
          {hoveredTier && (
            <div className="absolute top-3 left-3 bg-slate-950/95 border border-slate-700 p-2.5 rounded-xl shadow-2xl text-xs font-mono space-y-1 z-20">
              <div className="flex items-center justify-between gap-4 font-bold">
                <span className={hoveredTier.side === 'BID' ? 'text-emerald-400' : 'text-rose-400'}>
                  {hoveredTier.side === 'BID' ? '🛡️ ALIŞ KADEMESİ' : '🧱 SATIŞ KADEMESİ'} L{hoveredTier.level}
                </span>
                <span className="text-white">{currency}{hoveredTier.price.toFixed(2)}</span>
              </div>
              <div className="text-[10px] text-slate-300">Hacim: <strong className="text-white">{hoveredTier.lots.toLocaleString('tr-TR')} Lot</strong></div>
              <div className="text-[10px] text-amber-300">Tahmini Erime: <strong>~{hoveredTier.meltMinutes} dk</strong></div>
              <div className="text-[10px] text-cyan-300">Emir Ekle/İptal Oranı: <strong>{hoveredTier.insertCancelRatio}x</strong></div>
            </div>
          )}
        </div>
      </div>

      {/* Alt Bilgi */}
      <div className="mt-3 text-[10px] font-mono text-slate-400 flex items-center justify-between border-t border-slate-800/80 pt-2">
        <span>L2 Kademe Hızı: <strong className="text-emerald-400">1.240 Emir/dk</strong></span>
        <span>Derinlik Baskısı: <strong className={obi >= 0 ? 'text-emerald-400' : 'text-rose-400'}>OBI {obi >= 0 ? '+' : ''}{obi.toFixed(2)}</strong></span>
      </div>
    </div>
  );
};

export default IsometricDepthTopography;
