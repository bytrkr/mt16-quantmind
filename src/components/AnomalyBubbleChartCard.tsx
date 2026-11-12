// src/components/AnomalyBubbleChartCard.tsx
import React, { useState, useMemo } from 'react';
import { Activity, Zap, ShieldAlert, Sparkles, AlertTriangle, Layers } from 'lucide-react';
import { ALL_BIST_STOCKS } from '../data/bistAllStocks';

export interface BubbleDataPoint {
  symbol: string;
  name: string;
  zVol: number;      // X ekseni: Hacim Z-Skoru (-3.0 .. +4.0)
  zPrice: number;    // Y ekseni: Fiyat/Momentum Z-Skoru (-3.0 .. +4.0)
  obi: number;       // Balon Boyutu: L2 OBI Baskısı (-1.0 .. +1.0)
  forensicRisk: number; // 0 - 100
  beneishMScore: number; // Beneish M-Skor
  anomalyTag: 'NORMAL' | 'KURUMSAL_DIP' | 'FOMO_TUZAGI' | 'SPOOFING_BASKI' | 'MANIPULASYON';
  changePct: number;
  price: number;
}

export interface AnomalyBubbleChartCardProps {
  marketType?: 'BIST' | 'CRYPTO' | 'NASDAQ' | 'FOREX';
  activeTicker?: string;
  onSelectTicker?: (ticker: string) => void;
  className?: string;
}

export const AnomalyBubbleChartCard: React.FC<AnomalyBubbleChartCardProps> = ({
  marketType = 'BIST',
  activeTicker = 'ASELS',
  onSelectTicker,
  className = '',
}) => {
  const [hoveredPoint, setHoveredPoint] = useState<BubbleDataPoint | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Piyasaya göre balon verisi üretimi
  const dataPoints: BubbleDataPoint[] = useMemo(() => {
    if (marketType === 'NASDAQ') {
      return [
        { symbol: 'NVDA', name: 'NVIDIA Corp', zVol: 2.85, zPrice: 2.39, obi: 0.45, forensicRisk: 18, beneishMScore: -2.45, anomalyTag: 'KURUMSAL_DIP', changePct: 2.39, price: 138.50 },
        { symbol: 'AAPL', name: 'Apple Inc', zVol: -0.85, zPrice: 0.85, obi: 0.12, forensicRisk: 12, beneishMScore: -2.60, anomalyTag: 'NORMAL', changePct: 0.85, price: 228.20 },
        { symbol: 'MSFT', name: 'Microsoft Corp', zVol: 1.25, zPrice: 1.10, obi: 0.28, forensicRisk: 15, beneishMScore: -2.55, anomalyTag: 'KURUMSAL_DIP', changePct: 1.10, price: 425.10 },
        { symbol: 'TSLA', name: 'Tesla Inc', zVol: 3.40, zPrice: -2.15, obi: -0.58, forensicRisk: 68, beneishMScore: -1.65, anomalyTag: 'SPOOFING_BASKI', changePct: -2.15, price: null // SAHTE FIYAT YOK },
        { symbol: 'AMZN', name: 'Amazon.com', zVol: 0.45, zPrice: 1.20, obi: 0.18, forensicRisk: 22, beneishMScore: -2.30, anomalyTag: 'NORMAL', changePct: 1.20, price: 186.30 },
        { symbol: 'GOOGL', name: 'Alphabet Inc', zVol: -1.15, zPrice: 0.65, obi: -0.05, forensicRisk: 14, beneishMScore: -2.50, anomalyTag: 'NORMAL', changePct: 0.65, price: 165.40 },
        { symbol: 'META', name: 'Meta Platforms', zVol: 2.10, zPrice: 2.30, obi: 0.38, forensicRisk: 25, beneishMScore: -2.20, anomalyTag: 'FOMO_TUZAGI', changePct: 2.30, price: 575.20 },
      ];
    }

    if (marketType === 'CRYPTO') {
      return [
        { symbol: 'BTCUSDT', name: 'Bitcoin / USDT', zVol: 2.45, zPrice: 2.15, obi: 0.42, forensicRisk: 22, beneishMScore: -2.40, anomalyTag: 'KURUMSAL_DIP', changePct: 2.15, price: 88450.00 },
        { symbol: 'ETHUSDT', name: 'Ethereum / USDT', zVol: 1.15, zPrice: 1.45, obi: 0.25, forensicRisk: 28, beneishMScore: -2.25, anomalyTag: 'NORMAL', changePct: 1.45, price: 3120.00 },
        { symbol: 'SOLUSDT', name: 'Solana / USDT', zVol: 3.80, zPrice: 4.20, obi: 0.65, forensicRisk: 42, beneishMScore: -1.95, anomalyTag: 'FOMO_TUZAGI', changePct: 4.20, price: 185.50 },
        { symbol: 'BNBUSDT', name: 'BNB / USDT', zVol: -0.45, zPrice: 0.85, obi: 0.10, forensicRisk: 20, beneishMScore: -2.45, anomalyTag: 'NORMAL', changePct: 0.85, price: 615.00 },
        { symbol: 'XRPUSDT', name: 'Ripple / USDT', zVol: 1.95, zPrice: -0.45, obi: -0.32, forensicRisk: 55, beneishMScore: -1.80, anomalyTag: 'MANIPULASYON', changePct: -0.45, price: 1.15 },
        { symbol: 'AVAXUSDT', name: 'Avalanche / USDT', zVol: 2.65, zPrice: 3.10, obi: 0.48, forensicRisk: 30, beneishMScore: -2.10, anomalyTag: 'KURUMSAL_DIP', changePct: 3.10, price: 34.20 },
      ];
    }

    // BIST hisse listesi haritalaması
    const mainList = ['ASELS', 'THYAO', 'EREGL', 'GARAN', 'TUPRS', 'KCHOL', 'AKBNK', 'BIMAS', 'SISE', 'ASTOR'];
    return mainList.map((sym, idx) => {
      const stock = ALL_BIST_STOCKS.find((s) => s.code === sym) || { name: sym, price: 100, rate: 0 };
      const seed = sym.charCodeAt(0) + idx;
      const zVol = Number((((seed % 7) - 3) * 0.95 + (idx % 2 === 0 ? 0.8 : -0.4)).toFixed(2));
      const zPrice = Number(((stock.rate / 1.5) + (seed % 3 === 0 ? 0.5 : -0.3)).toFixed(2));
      const obi = Number((((seed % 5) - 2) * 0.22).toFixed(2));
      const forensicRisk = Math.min(95, Math.max(10, Math.round(20 + Math.abs(zVol) * 12 + Math.abs(obi) * 25)));
      const beneishMScore = Number((-2.55 + (forensicRisk / 100) * 1.1).toFixed(2));

      let anomalyTag: BubbleDataPoint['anomalyTag'] = 'NORMAL';
      if (forensicRisk >= 75) anomalyTag = 'MANIPULASYON';
      else if (zVol >= 2.0 && zPrice < 0) anomalyTag = 'SPOOFING_BASKI';
      else if (zVol >= 2.0 && obi >= 0.3) anomalyTag = 'KURUMSAL_DIP';
      else if (zPrice >= 2.0 && obi < 0) anomalyTag = 'FOMO_TUZAGI';

      return {
        symbol: sym,
        name: stock.name,
        zVol,
        zPrice,
        obi,
        forensicRisk,
        beneishMScore,
        anomalyTag,
        changePct: stock.rate,
        price: stock.price,
      };
    });
  }, [marketType]);

  // SVG Çizim Alanı Boyutları
  const width = 580;
  const height = 280;
  const margin = { top: 30, right: 30, bottom: 40, left: 50 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  // Eksen Sınırları (-4.0σ .. +4.0σ)
  const xMin = -3.5;
  const xMax = 4.5;
  const yMin = -3.5;
  const yMax = 4.5;

  // Koordinat Dönüştürücüler
  const scaleX = (val: number) => margin.left + ((val - xMin) / (xMax - xMin)) * innerWidth;
  const scaleY = (val: number) => margin.top + innerHeight - ((val - yMin) / (yMax - yMin)) * innerHeight;

  // Balon Yarıçapı (OBI Baskısı ile)
  const getRadius = (obi: number) => {
    return Math.max(7, Math.min(24, 12 + Math.abs(obi) * 14));
  };

  // Balon Renk Seçici (Adli Risk & Beneish M-Skor Durumuna Göre)
  const getBubbleColor = (pt: BubbleDataPoint) => {
    if (pt.anomalyTag === 'MANIPULASYON' || pt.forensicRisk >= 70) {
      return { fill: '#f43f5e', stroke: '#fda4af', glow: 'rgba(244,63,94,0.4)' }; // Kırmızı / Risk
    }
    if (pt.anomalyTag === 'FOMO_TUZAGI') {
      return { fill: '#a855f7', stroke: '#d8b4fe', glow: 'rgba(168,85,247,0.4)' }; // Mor / FOMO
    }
    if (pt.anomalyTag === 'SPOOFING_BASKI') {
      return { fill: '#f59e0b', stroke: '#fde68a', glow: 'rgba(245,158,11,0.4)' }; // Sarı / Spoofing
    }
    if (pt.anomalyTag === 'KURUMSAL_DIP' || pt.zVol >= 1.8) {
      return { fill: '#06b6d4', stroke: '#67e8f9', glow: 'rgba(6,182,212,0.4)' }; // Cyan / Kurumsal Dip
    }
    return { fill: '#10b981', stroke: '#6ee7b7', glow: 'rgba(16,185,129,0.3)' }; // Yeşil / Normal
  };

  const handleMouseMove = (e: React.MouseEvent<SVGElement>, pt: BubbleDataPoint) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    setHoveredPoint(pt);
  };

  return (
    <div className={`bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between ${className}`}>
      {/* Kart Başlığı & Lejant */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h2 className="text-xs font-black text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            D3 Kuant Anomali Balon Grafiği (Z-Volume vs Z-Price)
          </h2>
          <div className="flex items-center gap-2 text-[10px] font-mono">
            <span className="flex items-center gap-1 text-cyan-400">
              <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block animate-ping" /> Kurumsal Dip
            </span>
            <span className="flex items-center gap-1 text-purple-400">
              <span className="w-2 h-2 rounded-full bg-purple-400 inline-block" /> FOMO Tuzağı
            </span>
            <span className="flex items-center gap-1 text-rose-400">
              <span className="w-2 h-2 rounded-full bg-rose-400 inline-block" /> Manipülasyon
            </span>
          </div>
        </div>

        {/* SVG Balon Grafiği Konteyneri */}
        <div className="relative w-full bg-slate-950 border border-slate-800/80 rounded-xl overflow-hidden p-2">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto select-none overflow-visible">
            {/* Arka Plan Izgara Çizgileri */}
            {[-3, -2, -1, 0, 1, 2, 3, 4].map((v) => (
              <g key={`grid-${v}`}>
                <line
                  x1={scaleX(v)}
                  y1={margin.top}
                  x2={scaleX(v)}
                  y2={height - margin.bottom}
                  stroke="#1e293b"
                  strokeWidth={v === 0 ? 1.5 : 0.8}
                  strokeDasharray={v === 0 ? 'none' : '3 3'}
                />
                <line
                  x1={margin.left}
                  y1={scaleY(v)}
                  x2={width - margin.right}
                  y2={scaleY(v)}
                  stroke="#1e293b"
                  strokeWidth={v === 0 ? 1.5 : 0.8}
                  strokeDasharray={v === 0 ? 'none' : '3 3'}
                />
              </g>
            ))}

            {/* Z-Skor Anomali Kritik Eşik Çizgileri (±2.0σ) */}
            <line
              x1={scaleX(2.0)}
              y1={margin.top}
              x2={scaleX(2.0)}
              y2={height - margin.bottom}
              stroke="#06b6d4"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
            <line
              x1={scaleX(-2.0)}
              y1={margin.top}
              x2={scaleX(-2.0)}
              y2={height - margin.bottom}
              stroke="#f43f5e"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
            <line
              x1={margin.left}
              y1={scaleY(2.0)}
              x2={width - margin.right}
              y2={scaleY(2.0)}
              stroke="#06b6d4"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
            <line
              x1={margin.left}
              y1={scaleY(-2.0)}
              x2={width - margin.right}
              y2={scaleY(-2.0)}
              stroke="#f43f5e"
              strokeWidth="1"
              strokeDasharray="4 4"
            />

            {/* Eksen Etiketleri */}
            <text x={width / 2} y={height - 8} textAnchor="middle" fill="#94a3b8" fontSize="11" fontWeight="bold" fontFamily="monospace">
              Hacim Sapması Z-Skor (Z_Vol) →
            </text>
            <text
              x={-height / 2}
              y={14}
              transform="rotate(-90)"
              textAnchor="middle"
              fill="#94a3b8"
              fontSize="11"
              fontWeight="bold"
              fontFamily="monospace"
            >
              Fiyat Değişim Z-Skor (Z_Price) →
            </text>

            {/* Balon Elemanları Çizimi */}
            {dataPoints.map((pt) => {
              const cx = scaleX(pt.zVol);
              const cy = scaleY(pt.zPrice);
              const r = Math.max(14, getRadius(pt.obi));
              const colors = getBubbleColor(pt);
              const isActive = pt.symbol === activeTicker;

              return (
                <g
                  key={pt.symbol}
                  className="cursor-pointer transition-transform duration-300 hover:scale-110"
                  onClick={() => onSelectTicker && onSelectTicker(pt.symbol)}
                  onMouseMove={(e) => handleMouseMove(e, pt)}
                  onMouseLeave={() => setHoveredPoint(null)}
                >
                  {/* Dış Glow / Halka (Aktif Varlık için) */}
                  {isActive && (
                    <circle cx={cx} cy={cy} r={r + 6} fill="none" stroke={colors.stroke} strokeWidth="2" className="animate-ping" />
                  )}

                  {/* Ana Balon Dağılım Noktası */}
                  <circle
                    cx={cx}
                    cy={cy}
                    r={r}
                    fill={colors.fill}
                    fillOpacity={isActive ? 0.9 : 0.7}
                    stroke={colors.stroke}
                    strokeWidth={isActive ? 2.5 : 1.5}
                    style={{ filter: `drop-shadow(0 0 8px ${colors.glow})` }}
                  />

                  {/* Sembol Kısaltma Metni */}
                  <text
                    x={cx}
                    y={cy + 3.5}
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize={r > 16 ? '11' : '10'}
                    fontWeight="bold"
                    fontFamily="monospace"
                    className="pointer-events-none"
                  >
                    {pt.symbol.length > 5 ? pt.symbol.slice(0, 4) : pt.symbol}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* İnteraktif Hover Tooltip */}
          {hoveredPoint && (
            <div
              className="absolute z-50 pointer-events-none bg-slate-950 border border-slate-700 p-3 rounded-xl shadow-2xl font-mono text-xs w-56 space-y-1 transform -translate-x-1/2 -translate-y-full mb-2"
              style={{ left: tooltipPos.x, top: tooltipPos.y }}
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-1">
                <span className="font-extrabold text-cyan-300">#{hoveredPoint.symbol}</span>
                <span className={`text-[10px] font-bold ${hoveredPoint.changePct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {hoveredPoint.changePct >= 0 ? '+' : ''}{hoveredPoint.changePct.toFixed(2)}%
                </span>
              </div>
              <div className="text-[10px] text-slate-400 truncate">{hoveredPoint.name}</div>

              <div className="grid grid-cols-2 gap-1 text-[10px] pt-1 border-t border-slate-900">
                <div>Z_Vol: <strong className="text-white">{hoveredPoint.zVol >= 0 ? '+' : ''}{hoveredPoint.zVol}σ</strong></div>
                <div>Z_Price: <strong className="text-white">{hoveredPoint.zPrice >= 0 ? '+' : ''}{hoveredPoint.zPrice}σ</strong></div>
                <div>OBI Baskısı: <strong className="text-cyan-400">{hoveredPoint.obi >= 0 ? '+' : ''}{hoveredPoint.obi}</strong></div>
                <div>Beneish M: <strong className="text-amber-400">{hoveredPoint.beneishMScore}</strong></div>
              </div>

              <div className="pt-1 flex items-center justify-between text-[9px]">
                <span className="text-slate-400">Adli Risk:</span>
                <span className={`font-bold ${hoveredPoint.forensicRisk >= 70 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {hoveredPoint.forensicRisk}/100
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Alt Bilgi Akışı */}
      <div className="mt-3 text-[10px] font-mono text-slate-400 flex items-center justify-between border-t border-slate-800/80 pt-2">
        <span>Seçili Varlık: <strong className="text-emerald-400">#{activeTicker}</strong></span>
        <span>Eşik: ±2.0σ Anomali Sınırı</span>
      </div>
    </div>
  );
};

export default AnomalyBubbleChartCard;
