// src/components/InstitutionalFlowMeter.tsx
import React, { useMemo } from 'react';
import { Building2, TrendingUp, TrendingDown, Layers, CheckCircle2, DollarSign, Activity } from 'lucide-react';
import { MarketGatewaySnapshot } from '../services/marketGateway';

export interface InstitutionalFlowMeterProps {
  snapshot?: MarketGatewaySnapshot;
  ticker?: string;
  marketType?: 'BIST' | 'CRYPTO' | 'NASDAQ' | 'FOREX';
  className?: string;
}

export interface InstitutionFlow {
  name: string;
  netLot: number;
  sharePct: number;
  type: 'BUYER' | 'SELLER';
}

export const InstitutionalFlowMeter: React.FC<InstitutionalFlowMeterProps> = ({
  snapshot,
  ticker = 'ASELS',
  marketType = 'BIST',
  className = '',
}) => {
  const currency = marketType === 'BIST' ? '₺' : '$';
  const bofaNetLot = snapshot?.bofaNetLot ?? 145000;
  const isBofABuyer = bofaNetLot >= 0;

  // Kurumsal Takas ve Aracı Kurum Dağılımı (AKD) Verisi
  const flows: InstitutionFlow[] = useMemo(() => {
    // 1. Öncelik: Görselden gelen gerçek AKD verisi (Override)
    if (snapshot?.akdData) {
      const { top_buyers = [], top_sellers = [] } = snapshot.akdData;
      const combined = [
        ...top_buyers.map((b: any) => ({ name: b.institution, netLot: b.net_lots, sharePct: 0, type: 'BUYER' as const })),
        ...top_sellers.map((s: any) => ({ name: s.institution, netLot: s.net_lots, sharePct: 0, type: 'SELLER' as const })),
      ];
      if (combined.length > 0) return combined;
    }

    if (marketType === 'NASDAQ') {
      return [
        { name: 'Bank of America', netLot: 185000, sharePct: 34.5, type: 'BUYER' },
        { name: 'Morgan Stanley', netLot: 124000, sharePct: 23.1, type: 'BUYER' },
        { name: 'Goldman Sachs', netLot: 95000, sharePct: 17.7, type: 'BUYER' },
        { name: 'JPMorgan Chase', netLot: -82000, sharePct: 15.3, type: 'SELLER' },
        { name: 'Citigroup', netLot: -61000, sharePct: 11.4, type: 'SELLER' },
      ];
    }

    if (marketType === 'CRYPTO') {
      return [
        { name: 'Binance MM Wall', netLot: 2400, sharePct: 42.0, type: 'BUYER' },
        { name: 'Cumberland OTC', netLot: 1850, sharePct: 32.3, type: 'BUYER' },
        { name: 'Wintermute Algo', netLot: 920, sharePct: 16.1, type: 'BUYER' },
        { name: 'Jump Trading', netLot: -1420, sharePct: 24.8, type: 'SELLER' },
        { name: 'Kraken Institutional', netLot: -890, sharePct: 15.5, type: 'SELLER' },
      ];
    }

    // BIST Mantığı (Simulation)
    return [
      { name: 'BofA (Bank of America)', netLot: bofaNetLot, sharePct: 38.2, type: isBofABuyer ? 'BUYER' : 'SELLER' },
      { name: 'İş Yatırım', netLot: 98000, sharePct: 24.5, type: 'BUYER' },
      { name: 'Garanti BBVA', netLot: 62000, sharePct: 15.5, type: 'BUYER' },
      { name: 'Citibank Yabancı', netLot: -110000, sharePct: 27.5, type: 'SELLER' },
      { name: 'HSBC Kurumsal', netLot: -85000, sharePct: 21.3, type: 'SELLER' },
    ];
  }, [marketType, bofaNetLot, isBofABuyer, snapshot?.akdData]);

  // Toplam Alış ve Satış Hacmi
  const totalBuyerLot = flows.filter((f) => f.type === 'BUYER').reduce((acc, f) => acc + Math.abs(f.netLot), 0);
  const totalSellerLot = flows.filter((f) => f.type === 'SELLER').reduce((acc, f) => acc + Math.abs(f.netLot), 0);
  const grandTotal = totalBuyerLot + totalSellerLot || 1;

  const buyerDominancePct = Math.round((totalBuyerLot / grandTotal) * 100);
  const sellerDominancePct = 100 - buyerDominancePct;

  // Herfindahl-Hirschman Index (HHI Yoğunlaşma)
  const hhiIndex = Number(((buyerDominancePct * buyerDominancePct + sellerDominancePct * sellerDominancePct) / 10000).toFixed(2));

  return (
    <div className={`bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between ${className}`}>
      <div>
        {/* Başlık ve Rozet */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h2 className="text-xs font-black text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <Building2 className="w-4 h-4 text-purple-400" />
            Aracı Kurum & Yabancı Takas Akış Metresi (Institutional Flow Meter)
          </h2>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
            HHI Yoğunlaşma: {hhiIndex} {hhiIndex >= 0.6 ? '(YÜKSEK BİRİKİM)' : '(DENGELİ AKIŞ)'}
          </span>
        </div>

        {/* Kurumsal Net Akış Vektör Çubuğu (Flow Meter Bar) */}
        <div className="bg-slate-950 border border-slate-800/80 p-3 rounded-xl mb-3 space-y-2 font-mono text-xs">
          <div className="flex justify-between items-center text-[11px] font-extrabold">
            <span className="text-emerald-400 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" /> Net Kurumsal Alım (%{buyerDominancePct})
            </span>
            <span className="text-rose-400 flex items-center gap-1">
              Net Kurumsal Satış (%{sellerDominancePct}) <TrendingDown className="w-3.5 h-3.5" />
            </span>
          </div>

          {/* Dinamik Vektörel Renk Degrade Akış Çubuğu */}
          <div className="h-3.5 w-full bg-slate-800 rounded-full overflow-hidden flex p-0.5 border border-slate-700">
            <div
              className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-l-full transition-all duration-700 shadow-[0_0_12px_rgba(16,185,129,0.4)]"
              style={{ width: `${buyerDominancePct}%` }}
            />
            <div
              className="h-full bg-gradient-to-r from-rose-400 to-rose-600 rounded-r-full transition-all duration-700 shadow-[0_0_12px_rgba(244,63,94,0.4)]"
              style={{ width: `${sellerDominancePct}%` }}
            />
          </div>

          <div className="flex justify-between items-center text-[10px] text-slate-400">
            <span>Alış Hacmi: <strong className="text-emerald-300">+{totalBuyerLot.toLocaleString('tr-TR')} Lot</strong></span>
            <span>Satış Hacmi: <strong className="text-rose-300">-{totalSellerLot.toLocaleString('tr-TR')} Lot</strong></span>
          </div>
        </div>

        {/* Aracı Kurum Bazlı Net Akış Kartları Tablosu */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
          {/* Top Alıcılar */}
          <div className="bg-emerald-950/20 border border-emerald-500/30 p-2.5 rounded-xl space-y-1.5">
            <div className="text-[10px] font-extrabold text-emerald-400 border-b border-emerald-500/30 pb-1 uppercase">
              🟢 En Çok Net Alıcı Kurumlar (Top 3 Buyers)
            </div>
            {flows.filter((f) => f.type === 'BUYER').map((inst) => (
              <div key={inst.name} className="flex items-center justify-between text-[11px] text-slate-200">
                <span className="truncate max-w-[120px]">{inst.name}</span>
                <span className="font-bold text-emerald-300">+{inst.netLot.toLocaleString('tr-TR')} Lot</span>
              </div>
            ))}
          </div>

          {/* Top Satıcılar */}
          <div className="bg-rose-950/20 border border-rose-500/30 p-2.5 rounded-xl space-y-1.5">
            <div className="text-[10px] font-extrabold text-rose-400 border-b border-rose-500/30 pb-1 uppercase">
              🔴 En Çok Net Satıcı Kurumlar (Top 3 Sellers)
            </div>
            {flows.filter((f) => f.type === 'SELLER').map((inst) => (
              <div key={inst.name} className="flex items-center justify-between text-[11px] text-slate-200">
                <span className="truncate max-w-[120px]">{inst.name}</span>
                <span className="font-bold text-rose-300">{inst.netLot.toLocaleString('tr-TR')} Lot</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Alt Bilgi */}
      <div className="mt-3 text-[10px] font-mono text-slate-400 flex items-center justify-between border-t border-slate-800/80 pt-2">
        <span>BofA Net Pozisyonu: <strong className={isBofABuyer ? 'text-emerald-400' : 'text-rose-400'}>{bofaNetLot >= 0 ? '+' : ''}{bofaNetLot.toLocaleString('tr-TR')} Lot</strong></span>
        <span>Yabancı Saklama Takas Payı: <strong className="text-cyan-400">%38.72 (SMA_4: %37.94)</strong></span>
      </div>
    </div>
  );
};

export default InstitutionalFlowMeter;
