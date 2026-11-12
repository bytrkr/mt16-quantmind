// src/components/CrossMarketCorrelationMatrix.tsx
import React, { useMemo } from 'react';
import { Activity, Globe, ArrowRightLeft, TrendingUp, TrendingDown, Zap } from 'lucide-react';
import { MarketGatewaySnapshot } from '../services/marketGateway';

export interface CrossMarketCorrelationMatrixProps {
  snapshot?: MarketGatewaySnapshot;
  ticker?: string;
  marketType?: 'BIST' | 'CRYPTO' | 'NASDAQ' | 'FOREX';
  className?: string;
}

export interface CorrelationItem {
  assetCode: string;
  assetName: string;
  market: string;
  corrValue: number; // -1.0 .. +1.0
  lagMinutes: number; // Gecikmeli İletim (Dakika)
  directionalSync: 'GÜÇLÜ POZİTİF' | 'POZİTİF' | 'NÖTR' | 'TERS KOLELE';
}

export const CrossMarketCorrelationMatrix: React.FC<CrossMarketCorrelationMatrixProps> = ({
  snapshot,
  ticker = 'ASELS',
  marketType = 'BIST',
  className = '',
}) => {
  const activeTicker = ticker;

  // Çapraz Korelasyon Matrisi Simulasyon Verisi
  const correlations: CorrelationItem[] = useMemo(() => {
    return [
      {
        assetCode: 'BTCUSDT',
        assetName: 'Bitcoin USD',
        market: 'CRYPTO',
        corrValue: marketType === 'CRYPTO' ? 0.92 : marketType === 'NASDAQ' ? 0.68 : 0.28,
        lagMinutes: marketType === 'CRYPTO' ? 0 : 12,
        directionalSync: marketType === 'CRYPTO' ? 'GÜÇLÜ POZİTİF' : 'POZİTİF',
      },
      {
        assetCode: 'S&P 500',
        assetName: 'S&P 500 ETF (SPY)',
        market: 'US_MACRO',
        corrValue: marketType === 'NASDAQ' ? 0.88 : marketType === 'BIST' ? 0.52 : 0.45,
        lagMinutes: marketType === 'NASDAQ' ? 0 : 18,
        directionalSync: 'GÜÇLÜ POZİTİF',
      },
      {
        assetCode: 'DXY',
        assetName: 'US Dollar Index',
        market: 'FOREX',
        corrValue: -0.64,
        lagMinutes: 5,
        directionalSync: 'TERS KOLELE',
      },
      {
        assetCode: 'VİOP30',
        assetName: 'BIST30 Vadeli Kontrat',
        market: 'BIST_FUTURES',
        corrValue: marketType === 'BIST' ? 0.86 : 0.38,
        lagMinutes: marketType === 'BIST' ? 0 : 8,
        directionalSync: 'GÜÇLÜ POZİTİF',
      },
    ];
  }, [marketType]);

  const getCorrColor = (val: number) => {
    if (val >= 0.7) return { text: 'text-emerald-400', bg: 'bg-emerald-500/15 border-emerald-500/30' };
    if (val >= 0.3) return { text: 'text-cyan-400', bg: 'bg-cyan-500/15 border-cyan-500/30' };
    if (val <= -0.3) return { text: 'text-rose-400', bg: 'bg-rose-500/15 border-rose-500/30' };
    return { text: 'text-slate-400', bg: 'bg-slate-800 border-slate-700' };
  };

  return (
    <div className={`bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between ${className}`}>
      <div>
        {/* Başlık */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h2 className="text-xs font-black text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <Globe className="w-4 h-4 text-cyan-400" />
            Piyasalar Arası Çapraz Korelasyon & Gecikme Matrisi
          </h2>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
            Aktif Varlık: #{activeTicker}
          </span>
        </div>

        {/* Korelasyon Kartları Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-xs">
          {correlations.map((c) => {
            const colors = getCorrColor(c.corrValue);
            return (
              <div key={c.assetCode} className={`p-3 rounded-xl border flex items-center justify-between gap-2 ${colors.bg}`}>
                <div>
                  <div className="font-extrabold text-white text-xs flex items-center gap-1.5">
                    <ArrowRightLeft className="w-3.5 h-3.5 text-cyan-400" />
                    {c.assetCode}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate max-w-[130px]">{c.assetName}</div>
                </div>

                <div className="text-right">
                  <div className={`font-black text-sm ${colors.text}`}>
                    {c.corrValue >= 0 ? '+' : ''}{c.corrValue.toFixed(2)}
                  </div>
                  <div className="text-[9px] text-slate-400">
                    {c.lagMinutes === 0 ? 'Anlık Eşzamanlı' : `+${c.lagMinutes}dk Gecikmeli`}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Alt Bilgi */}
      <div className="mt-3 text-[10px] font-mono text-slate-400 flex items-center justify-between border-t border-slate-800/80 pt-2">
        <span>Sınır: &rho; &ge; +0.70 Yüksek Çapraz Etki</span>
        <span>Makro Baskı: <strong className="text-emerald-400">KORELASYON UYUMLU</strong></span>
      </div>
    </div>
  );
};

export default CrossMarketCorrelationMatrix;
