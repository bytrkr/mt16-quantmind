// src/components/DynamicPresetScreener.tsx
/**
 * MT16 BistApp Kuant Terminali - Rejim Odaklı Akıllı Tarayıcı Modları
 * 'Tavan Adayları', 'Kurumsal Dip Fırsatları', 'Yapay FOMO Riskleri' ve 'Dark Pool Kapanış'
 * modları arasında tek tıkla geçiş sağlayan dinamik screener kartı.
 */

import React, { useState, useMemo } from 'react';
import { Rocket, Diamond, ShieldAlert, Waves, Search, ExternalLink, ArrowUpDown, Filter } from 'lucide-react';
import type { MarketType } from '../App';

export interface DynamicPresetScreenerProps {
  selectedMarket?: MarketType;
  onSelectAsset?: (symbol: string) => void;
}

export type ScreenerPresetMode = 'UPPER_CIRCUIT' | 'INSTITUTIONAL_DIP' | 'FAKE_FOMO' | 'DARK_POOL_CLOSING';

interface ScreenerAssetItem {
  symbol: string;
  market: 'BIST' | 'NASDAQ' | 'CRYPTO';
  price: number;
  changePct: number;
  zScoreVol: number;
  zScorePrice: number;
  l2Obi: number;
  bofaNetBuyMln: number;
  compositeScore: number;
  presetMatch: ScreenerPresetMode;
  reasonTag: string;
  obvSlope?: number;
  cmf20?: number;
  bookImb5?: number;
  bookImb10?: number;
}

const PRESET_ASSET_DATA: ScreenerAssetItem[] = [
  // Tavan Adayları
  {
    symbol: 'THYAO',
    market: 'BIST',
    price: null, // SAHTE FIYAT YOK
    changePct: 3.10,
    zScoreVol: 2.35,
    zScorePrice: 1.80,
    l2Obi: 0.42,
    bofaNetBuyMln: 125.4,
    compositeScore: 88,
    presetMatch: 'UPPER_CIRCUIT',
    reasonTag: 'Güçlü L2 Alış Duvarı + BofA Net Giriş',
    obvSlope: 0.12,
    cmf20: 0.18,
    bookImb5: 0.32,
    bookImb10: 0.22,
  },
  {
    symbol: 'BTCUSDT',
    market: 'CRYPTO',
    price: 88450.00,
    changePct: 2.15,
    zScoreVol: 2.15,
    zScorePrice: 1.95,
    l2Obi: 0.38,
    bofaNetBuyMln: 340.0,
    compositeScore: 82,
    presetMatch: 'UPPER_CIRCUIT',
    reasonTag: 'Balina Kademe Süpürme + Hacim Z-Skoru +2.15σ',
    obvSlope: 0.15,
    cmf20: 0.22,
    bookImb5: 0.35,
    bookImb10: 0.25,
  },
  {
    symbol: 'NVDA',
    market: 'NASDAQ',
    price: 216.00,
    changePct: 2.39,
    zScoreVol: 1.93,
    zScorePrice: 1.45,
    l2Obi: 0.28,
    bofaNetBuyMln: 285.0,
    compositeScore: 84,
    presetMatch: 'UPPER_CIRCUIT',
    reasonTag: 'Semiconductor Liderlik + Net Kurumsal Alım',
    obvSlope: 0.08,
    cmf20: 0.14,
    bookImb5: 0.29,
    bookImb10: 0.19,
  },

  // Kurumsal Dip Fırsatları
  {
    symbol: 'ASELS',
    market: 'BIST',
    price: 358.50,
    changePct: 0.85,
    zScoreVol: 1.93,
    zScorePrice: -1.20,
    l2Obi: 0.15,
    bofaNetBuyMln: 45.2,
    compositeScore: 78,
    presetMatch: 'INSTITUTIONAL_DIP',
    reasonTag: 'Aşırı Satım RSI (34) + Kurumsal BofA Toplama',
    obvSlope: 0.05,
    cmf20: 0.09,
    bookImb5: 0.26,
    bookImb10: 0.16,
  },
  {
    symbol: 'CIMSA',
    market: 'BIST',
    price: 38.60,
    changePct: -1.10,
    zScoreVol: 1.45,
    zScorePrice: -1.85,
    l2Obi: 0.22,
    bofaNetBuyMln: 28.5,
    compositeScore: 74,
    presetMatch: 'INSTITUTIONAL_DIP',
    reasonTag: 'Destek Bölgesinden Tepki + Piotroski F-8',
    obvSlope: 0.04,
    cmf20: 0.06,
    bookImb5: 0.24,
    bookImb10: 0.14,
  },
  {
    symbol: 'AAPL',
    market: 'NASDAQ',
    price: 180.50,
    changePct: -1.10,
    zScoreVol: 1.10,
    zScorePrice: -1.40,
    l2Obi: 0.18,
    bofaNetBuyMln: 92.0,
    compositeScore: 72,
    presetMatch: 'INSTITUTIONAL_DIP',
    reasonTag: 'Kanal Alt Desteği + Yabancı Takas Artışı',
    obvSlope: 0.03,
    cmf20: 0.05,
    bookImb5: 0.21,
    bookImb10: 0.12,
  },

  // Yapay FOMO Riskleri
  {
    symbol: 'REEDR',
    market: 'BIST',
    price: 24.80,
    changePct: 4.80,
    zScoreVol: 3.10,
    zScorePrice: 2.80,
    l2Obi: -0.35,
    bofaNetBuyMln: -48.0,
    compositeScore: 32,
    presetMatch: 'FAKE_FOMO',
    reasonTag: '🔴 SPK RED-FLAG: Perakende Hype + BofA Net Satış',
    obvSlope: -0.12,
    cmf20: -0.18,
    bookImb5: -0.15,
    bookImb10: -0.10,
  },
  {
    symbol: 'TSLA',
    market: 'NASDAQ',
    price: 245.80,
    changePct: 5.20,
    zScoreVol: 2.85,
    zScorePrice: 2.40,
    l2Obi: -0.22,
    bofaNetBuyMln: -120.0,
    compositeScore: 41,
    presetMatch: 'FAKE_FOMO',
    reasonTag: 'Satış Kademesinde Kütle Duvarı + Negatif OBI',
    obvSlope: -0.08,
    cmf20: -0.12,
    bookImb5: -0.08,
    bookImb10: -0.05,
  },

  // Dark Pool Kapanış
  {
    symbol: 'GARAN',
    market: 'BIST',
    price: 112.40,
    changePct: 2.35,
    zScoreVol: 2.40,
    zScorePrice: 1.10,
    l2Obi: 0.35,
    bofaNetBuyMln: 148.5,
    compositeScore: 86,
    presetMatch: 'DARK_POOL_CLOSING',
    reasonTag: 'Kapanış Eşleşme Hacim Sıçraması (17:55)',
    obvSlope: 0.11,
    cmf20: 0.16,
    bookImb5: 0.30,
    bookImb10: 0.20,
  },
  {
    symbol: 'MSFT',
    market: 'NASDAQ',
    price: 420.10,
    changePct: 1.50,
    zScoreVol: 1.80,
    zScorePrice: 0.85,
    l2Obi: 0.25,
    bofaNetBuyMln: 215.5,
    compositeScore: 80,
    presetMatch: 'DARK_POOL_CLOSING',
    reasonTag: 'Blok Emir Geçişi ($12M Off-Exchange)',
    obvSlope: 0.09,
    cmf20: 0.12,
    bookImb5: 0.27,
    bookImb10: 0.17,
  },
];

export const DynamicPresetScreener: React.FC<DynamicPresetScreenerProps> = ({
  selectedMarket = 'BIST',
  onSelectAsset,
}) => {
  const [activePresetMode, setActivePresetMode] = useState<ScreenerPresetMode>('UPPER_CIRCUIT');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [marketFilter, setMarketFilter] = useState<'ALL' | 'BIST' | 'NASDAQ' | 'CRYPTO'>('ALL');

  const filteredAssets = useMemo(() => {
    return PRESET_ASSET_DATA.filter((item) => {
      const matchMode = item.presetMatch === activePresetMode;
      const matchMarket = marketFilter === 'ALL' || item.market === marketFilter;
      const matchSearch = searchQuery.trim() === '' || item.symbol.toLowerCase().includes(searchQuery.toLowerCase());
      return matchMode && matchMarket && matchSearch;
    });
  }, [activePresetMode, marketFilter, searchQuery]);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl backdrop-blur-md space-y-4 font-mono">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-emerald-400 animate-pulse" />
          <h3 className="text-xs font-black text-white uppercase tracking-wider">
            Rejim Odaklı Akıllı Tarayıcı Modları (FINVIZ Screener)
          </h3>
        </div>

        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-[10px]">
          {(['ALL', 'BIST', 'NASDAQ', 'CRYPTO'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMarketFilter(m)}
              className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                marketFilter === m
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Preset Mode Selector Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <button
          type="button"
          onClick={() => setActivePresetMode('UPPER_CIRCUIT')}
          className={`p-3 rounded-xl border transition cursor-pointer text-left font-bold flex items-center justify-between ${
            activePresetMode === 'UPPER_CIRCUIT'
              ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
              : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <div className="flex items-center gap-2">
            <Rocket className="w-4 h-4 text-emerald-400" />
            <div>
              <div className="text-xs text-white">🚀 Tavan Adayları</div>
              <div className="text-[9px] text-slate-400 font-normal">Yüksek Z_Vol &amp; Pozitif OBI</div>
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActivePresetMode('INSTITUTIONAL_DIP')}
          className={`p-3 rounded-xl border transition cursor-pointer text-left font-bold flex items-center justify-between ${
            activePresetMode === 'INSTITUTIONAL_DIP'
              ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
              : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <div className="flex items-center gap-2">
            <Diamond className="w-4 h-4 text-cyan-400" />
            <div>
              <div className="text-xs text-white">💎 Kurumsal Dip Fırsatları</div>
              <div className="text-[9px] text-slate-400 font-normal">Aşırı Satım + BofA Alımı</div>
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActivePresetMode('FAKE_FOMO')}
          className={`p-3 rounded-xl border transition cursor-pointer text-left font-bold flex items-center justify-between ${
            activePresetMode === 'FAKE_FOMO'
              ? 'bg-rose-500/20 border-rose-500 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.2)]'
              : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            <div>
              <div className="text-xs text-white">⚠️ Yapay FOMO Riskleri</div>
              <div className="text-[9px] text-slate-400 font-normal">Perakende Hype + Kurumsal Satış</div>
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActivePresetMode('DARK_POOL_CLOSING')}
          className={`p-3 rounded-xl border transition cursor-pointer text-left font-bold flex items-center justify-between ${
            activePresetMode === 'DARK_POOL_CLOSING'
              ? 'bg-purple-500/20 border-purple-500 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.2)]'
              : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <div className="flex items-center gap-2">
            <Waves className="w-4 h-4 text-purple-400" />
            <div>
              <div className="text-xs text-white">🌊 Dark Pool Kapanış</div>
              <div className="text-[9px] text-slate-400 font-normal">Blok Emir &amp; Eşleşme Sıçraması</div>
            </div>
          </div>
        </button>
      </div>

      {/* Search Input Filter */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Screener sonuçlarında ara (örn: THYAO, NVDA)..."
          className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
        />
      </div>

      {/* Ranked Asset Table */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-x-auto no-scrollbar">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-900 border-b border-slate-800 text-[10px] text-slate-400 uppercase">
            <tr>
              <th className="p-3">Sembol / Pazar</th>
              <th className="p-3">Fiyat &amp; Değişim</th>
              <th className="p-3">Z-Vol / Z-Price</th>
              <th className="p-3">L2 OBI Baskısı</th>
              <th className="p-3">Kuant Skor</th>
              <th className="p-3">Katalizör / Nedeni</th>
              <th className="p-3 text-right">Aksiyon</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filteredAssets.length > 0 ? (
              filteredAssets.map((asset) => {
                const currency = asset.market === 'BIST' ? '₺' : '$';
                return (
                  <tr key={asset.symbol} className="hover:bg-slate-900/60 transition">
                    <td className="p-3 font-bold">
                      <div className="text-white text-xs">#{asset.symbol}</div>
                      <div className="text-[9px] text-slate-500">{asset.market}</div>
                    </td>
                    <td className="p-3">
                      <div className="font-bold text-slate-200">
                        {typeof asset.price === 'number' && !isNaN(asset.price)
                          ? `${currency}${asset.price.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`
                          : 'VERİ YOK'}
                      </div>
                      <div className={`text-[10px] font-bold ${typeof asset.changePct === 'number' && asset.changePct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {typeof asset.changePct === 'number' && !isNaN(asset.changePct)
                          ? `${asset.changePct >= 0 ? '+' : ''}${asset.changePct.toFixed(2)}%`
                          : 'VERİ YOK'}
                      </div>
                    </td>
                    <td className="p-3 text-slate-300">
                      <div>Z_Vol: <strong className="text-cyan-300">+{asset.zScoreVol}&sigma;</strong></div>
                      <div className="text-[10px] text-slate-400">Z_Price: {asset.zScorePrice >= 0 ? '+' : ''}{asset.zScorePrice}&sigma;</div>
                    </td>
                    <td className="p-3 font-bold">
                      <span className={typeof asset.l2Obi === 'number' && asset.l2Obi >= 0 ? 'text-purple-300' : 'text-rose-400'}>
                        {typeof asset.l2Obi === 'number' && !isNaN(asset.l2Obi) ? `${asset.l2Obi >= 0 ? '+' : ''}${asset.l2Obi.toFixed(2)}` : 'VERİ YOK'}
                      </span>
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded font-black text-xs ${
                          asset.compositeScore >= 75
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : asset.compositeScore <= 45
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        }`}
                      >
                        {asset.compositeScore}/100
                      </span>
                    </td>
                    <td className="p-3 text-[11px] text-slate-300 max-w-[240px] space-y-1">
                      <div>{asset.reasonTag}</div>
                      <div className="flex flex-wrap gap-1 pt-0.5">
                        {(asset.obvSlope ?? 0.05) > 0 && (asset.cmf20 ?? 0.1) > 0 && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-950/60 text-emerald-300 border border-emerald-800/60 font-mono">
                            OBV/CMF Onayı ✅
                          </span>
                        )}
                        {(asset.bookImb5 ?? 0.28) > 0.25 && (asset.bookImb10 ?? 0.18) > 0.15 && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-cyan-950/60 text-cyan-300 border border-cyan-800/60 font-mono">
                            Derinlik Onayı ✅
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        type="button"
                        onClick={() => onSelectAsset && onSelectAsset(asset.symbol)}
                        className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold transition cursor-pointer flex items-center gap-1 ml-auto"
                      >
                        <span>Seç</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7} className="p-6 text-center text-slate-500">
                  Seçili filtre ve tazeleme modunda uygun varlık bulunamadı.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DynamicPresetScreener;
