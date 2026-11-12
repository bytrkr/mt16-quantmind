// src/components/watchlist.tsx
/**
 * MT16 Kuant Terminali - Google Finans Esintili Akıllı İzleme Listesi
 * - Varsayılan ilk 5 sıcak hisse özeti
 * - Filtre Kapsülleri: [🔥 Tavan Adayları], [⚡ Hacim Anomalileri], [🏛️ Kurumsal Alım]
 * - Hızlı arama ve açılır modal/drawer ile 50+ hisseye tek tıkla erişim
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Flame,
  Zap,
  Building2,
  Search,
  ChevronRight,
  X,
  TrendingUp,
  TrendingDown,
  Layers,
  Sparkles,
  SlidersHorizontal
} from 'lucide-react';
import { ALL_BIST_STOCKS } from '../data/bistAllStocks';
import { useMarketData } from '../hooks/useMarketData';
import { getYahooDirectPrice } from '../services/yahooDirect';
import type { MarketType } from '../App';

export interface WatchlistProps {
  selectedMarket: MarketType;
  currentSymbol: string;
  onSelectSymbol: (symbol: string) => void;
  className?: string;
}

export type WatchlistFilter = 'HOT' | 'CEILING' | 'VOLUME' | 'INSTITUTIONAL';

const HOT_PRESETS: Record<MarketType, string[]> = {
  BIST: ['THYAO', 'ASELS', 'EREGL', 'GARAN', 'TUPRS'],
  CRYPTO: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'AVAXUSDT'],
  NASDAQ: ['NVDA', 'AAPL', 'MSFT', 'TSLA', 'AMZN']
};

const CEILING_CANDIDATES = ['THYAO', 'BIMAS', 'TUPRS', 'KCHOL', 'GARAN', 'EREGL', 'ASELS', 'AKBNK', 'PETKM', 'SASA', 'CIMSA', 'KONTR'];
const VOLUME_ANOMALIES = ['THYAO', 'GARAN', 'AKBNK', 'KCHOL', 'ISCTR'];
const INSTITUTIONAL_BUY = ['BIMAS', 'TUPRS', 'SISE', 'SAHOL', 'FROTO'];

function safeFormat(value: number | null, opts?: Intl.NumberFormatOptions) {
  return typeof value === 'number' && !isNaN(value) ? value.toLocaleString('tr-TR', opts) : 'VERİ YOK';
}

/**
 * Kompakt Google Finans Tarzı Satır Bileşeni
 */
const CompactWatchlistRow: React.FC<{
  symbol: string;
  selectedMarket: MarketType;
  isSelected: boolean;
  onSelect: (sym: string) => void;
  activeFilter?: WatchlistFilter;
}> = ({ symbol, selectedMarket, isSelected, onSelect, activeFilter }) => {
  const [quote, setQuote] = useState<{ price: number | null; prevClose: number | null; changePct: number | null } | null>(null);
  const [decision, setDecision] = useState<'BUY' | 'VETO' | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchDecision = async () => {
      try {
        const priceToUse = null; // SAHTE FIYAT YOK
        const vpinToUse = null; // SAHTE VPIN YOK
        const res = await fetch('/api/analyze/full', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            symbol,
            price: priceToUse,
            basePrice: priceToUse,
            vpinScoreInput: vpinToUse,
            isMarketOpenOverride: true
          })
        });
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data?.finalDecision) {
            setDecision(data.finalDecision.action === 'PROCEED' || data.finalDecision.action === 'BUY' ? 'BUY' : 'VETO');
          }
        }
      } catch {
        // Non-blocking
      }
    };
    fetchDecision();
    return () => { isMounted = false; };
  }, [symbol]);

  useEffect(() => {
    let isMounted = true;
    const fetchQuote = async () => {
      const q = await getYahooDirectPrice(symbol);
      if (isMounted) {
        if (q && typeof q.price === 'number' && typeof q.prevClose === 'number' && q.prevClose > 0) {
          const rawChg = ((q.price - q.prevClose) / q.prevClose) * 100;
          const validChg = Math.abs(rawChg) <= 10 ? rawChg : null;
          setQuote({ price: q.price, prevClose: q.prevClose, changePct: validChg });
        } else {
          try {
            const symFormatted = symbol.includes('.') ? symbol : `${symbol}.IS`;
            const res = await fetch(`/api/yahoo-proxy?symbol=${encodeURIComponent(symFormatted)}`);
            if (res.ok) {
              const data = await res.json();
              const p = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
              const prev = data?.chart?.result?.[0]?.meta?.chartPreviousClose;
              if (typeof p === 'number' && !isNaN(p) && typeof prev === 'number' && !isNaN(prev) && prev > 0) {
                const rawChg = ((p - prev) / prev) * 100;
                const validChg = Math.abs(rawChg) <= 10 ? rawChg : null;
                if (isMounted) setQuote({ price: p, prevClose: prev, changePct: validChg });
              } else {
                if (isMounted) setQuote({ price: null, prevClose: null, changePct: null });
              }
            } else {
              if (isMounted) setQuote({ price: null, prevClose: null, changePct: null });
            }
          } catch {
            if (isMounted) setQuote({ price: null, prevClose: null, changePct: null });
          }
        }
      }
    };
    fetchQuote();
    const interval = setInterval(fetchQuote, 8000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [symbol]);

  const price = quote?.price ?? null; // SAHTE FIYAT YOK, sadece backend fiyati
  const prevClose = quote?.prevClose ?? null;
  const rawChange = (price !== null && prevClose !== null && prevClose > 0) ? ((price - prevClose) / prevClose) * 100 : null;
  const changePct = (rawChange !== null && Math.abs(rawChange) <= 10) ? rawChange : null;

  const hasLivePrice = typeof price === 'number' && !isNaN(price) && prevClose !== null && prevClose > 0 && changePct !== null;
  const isPositive = changePct !== null && changePct >= 0;

  const tavan = prevClose !== null ? prevClose * 1.10 : null;
  const tavanaUzaklik = (tavan !== null && price !== null && tavan > 0) ? (tavan - price) / tavan : null;
  const isCeilingCandidate = tavanaUzaklik !== null && tavanaUzaklik >= 0 && tavanaUzaklik < 0.02;

  if (activeFilter === 'CEILING' && !isCeilingCandidate) {
    return null;
  }

  const currency = selectedMarket === 'BIST' ? '₺' : '$';
  const stockMeta = ALL_BIST_STOCKS.find(s => s.code === symbol);

  return (
    <button
      type="button"
      onClick={() => onSelect(symbol)}
      className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-all cursor-pointer border text-left font-mono ${
        isSelected
          ? 'bg-emerald-500/15 border-emerald-500/60 shadow-[0_0_12px_rgba(16,185,129,0.18)]'
          : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-800/60 hover:border-slate-700'
      }`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
          isSelected
            ? 'bg-emerald-500 text-slate-950'
            : 'bg-slate-800 text-slate-200'
        }`}>
          {symbol.slice(0, 2)}
        </div>
        <div className="truncate">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-xs text-white">#{symbol}</span>
            {activeFilter === 'CEILING' ? (
              isCeilingCandidate && tavanaUzaklik !== null ? (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  Tavana %{(tavanaUzaklik * 100).toFixed(1)} kaldı
                </span>
              ) : null
            ) : (
              decision && (
                decision === 'BUY' ? (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    BUY
                  </span>
                ) : (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/40">
                    VETO
                  </span>
                )
              )
            )}
          </div>
          <div className="text-[11px] text-slate-400 truncate max-w-[130px]">
            {stockMeta?.name || `${selectedMarket} Varlık`}
          </div>
        </div>
      </div>

      <div className="text-right shrink-0">
        <div className="text-xs font-black text-white font-mono">
          {hasLivePrice
            ? `${currency}${safeFormat(price, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            : 'VERİ YOK'}
        </div>
        {hasLivePrice && changePct !== null ? (
          <div className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-bold font-mono ${
            isPositive
              ? 'text-emerald-300 bg-emerald-500/10'
              : 'text-rose-300 bg-rose-500/10'
          }`}>
            {isPositive ? '+' : ''}{changePct.toFixed(2)}%
          </div>
        ) : (
          <div className="inline-block px-1.5 py-0.5 rounded text-[11px] font-bold font-mono text-slate-500 bg-slate-800/40">
            VERİ YOK
          </div>
        )}
      </div>
    </button>
  );
};


export const Watchlist: React.FC<WatchlistProps> = ({
  selectedMarket,
  currentSymbol,
  onSelectSymbol,
  className = ''
}) => {
  const [activeFilter, setActiveFilter] = useState<WatchlistFilter>('HOT');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Filtreye göre hisse listesi
  const currentFilteredList = useMemo(() => {
    if (selectedMarket !== 'BIST') {
      return HOT_PRESETS[selectedMarket] || HOT_PRESETS.BIST;
    }

    switch (activeFilter) {
      case 'CEILING':
        return CEILING_CANDIDATES;
      case 'VOLUME':
        return VOLUME_ANOMALIES;
      case 'INSTITUTIONAL':
        return INSTITUTIONAL_BUY;
      case 'HOT':
      default:
        return HOT_PRESETS.BIST;
    }
  }, [selectedMarket, activeFilter]);

  // Arama filtresi
  const searchResults = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const q = searchTerm.trim().toUpperCase();

    if (selectedMarket === 'BIST') {
      return ALL_BIST_STOCKS
        .filter(s => s.code.includes(q) || s.name.toUpperCase().includes(q))
        .map(s => s.code);
    }

    return (HOT_PRESETS[selectedMarket] || []).filter(s => s.includes(q));
  }, [searchTerm, selectedMarket]);

  // İlk 5 gösterilecek liste (arama varsa arama sonucu, yoksa filtre listesi)
  const displaySymbols = useMemo(() => {
    if (searchTerm.trim()) {
      return searchResults.slice(0, 5);
    }
    return currentFilteredList.slice(0, 5);
  }, [searchTerm, searchResults, currentFilteredList]);

  return (
    <div className={`bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl backdrop-blur-md space-y-3 font-sans ${className}`}>
      {/* Üst Başlık & Pazar Rozeti */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <h3 className="text-xs font-black text-white uppercase tracking-wider font-mono">
            {selectedMarket} İzleme Listesi
          </h3>
        </div>
        <span className="text-[11px] font-mono font-bold text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
          İlk 5 Sıcak
        </span>
      </div>

      {/* Google Finans Tarzı Filtre Kapsülleri (Chips) */}
      {selectedMarket === 'BIST' && (
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          <button
            type="button"
            onClick={() => setActiveFilter('HOT')}
            className={`px-2.5 py-1 rounded-xl text-[11px] font-bold font-mono flex items-center gap-1 shrink-0 transition cursor-pointer border ${
              activeFilter === 'HOT'
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
            }`}
          >
            <Sparkles className="w-3 h-3 text-emerald-400" />
            <span>Sıcak</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('CEILING')}
            className={`px-2.5 py-1 rounded-xl text-[11px] font-bold font-mono flex items-center gap-1 shrink-0 transition cursor-pointer border ${
              activeFilter === 'CEILING'
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-sm'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
            }`}
          >
            <Flame className="w-3 h-3 text-rose-400" />
            <span>Tavan Adayı</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('VOLUME')}
            className={`px-2.5 py-1 rounded-xl text-[11px] font-bold font-mono flex items-center gap-1 shrink-0 transition cursor-pointer border ${
              activeFilter === 'VOLUME'
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-sm'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
            }`}
          >
            <Zap className="w-3 h-3 text-cyan-400" />
            <span>Hacim Anomali</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('INSTITUTIONAL')}
            className={`px-2.5 py-1 rounded-xl text-[11px] font-bold font-mono flex items-center gap-1 shrink-0 transition cursor-pointer border ${
              activeFilter === 'INSTITUTIONAL'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
            }`}
          >
            <Building2 className="w-3 h-3 text-amber-400" />
            <span>Kurumsal</span>
          </button>
        </div>
      )}

      {/* Kompakt Arama Çubuğu */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Sembol veya şirket ara..."
          className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
        />
        {searchTerm && (
          <button
            type="button"
            onClick={() => setSearchTerm('')}
            className="absolute right-2.5 top-2.5 text-slate-500 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* İlk 5 Sıcak Hisse Listesi */}
      <div className="space-y-1.5">
        {displaySymbols.map((sym) => (
          <CompactWatchlistRow
            key={sym}
            symbol={sym}
            selectedMarket={selectedMarket}
            isSelected={currentSymbol === sym}
            onSelect={onSelectSymbol}
            activeFilter={activeFilter}
          />
        ))}
      </div>

      {/* Genişletme / Tümünü Gör Butonu (Modal Tetikleyici) */}
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        className="w-full py-2.5 px-3 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 text-xs font-mono font-bold text-slate-300 hover:text-white flex items-center justify-between transition cursor-pointer shadow-sm"
      >
        <span className="flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-emerald-400" />
          <span>Tüm Varlıkları İncele (50+ Hisse)</span>
        </span>
        <ChevronRight className="w-4 h-4 text-slate-500" />
      </button>

      {/* 50+ Hisse Seçim Modalı / Drawer */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden font-sans">
            {/* Modal Başlık */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-emerald-400" />
                <h4 className="text-sm font-black text-white font-mono uppercase">
                  {selectedMarket} Tüm Kayıtlı Varlıklar
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal İçi Hızlı Filtre */}
            <div className="p-4 border-b border-slate-800 bg-slate-950/40">
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Koda veya şirket adına göre anında filtrele..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                  autoFocus
                />
              </div>
            </div>

            {/* Modal İçi Liste */}
            <div className="p-4 overflow-y-auto space-y-1.5 flex-1">
              {(searchTerm.trim() ? searchResults : ALL_BIST_STOCKS.map(s => s.code)).map((sym) => (
                <CompactWatchlistRow
                  key={sym}
                  symbol={sym}
                  selectedMarket={selectedMarket}
                  isSelected={currentSymbol === sym}
                  onSelect={(s) => {
                    onSelectSymbol(s);
                    setIsModalOpen(false);
                  }}
                />
              ))}
            </div>

            {/* Modal Alt Bilgi */}
            <div className="p-3 bg-slate-950 border-t border-slate-800 text-center text-[11px] font-mono text-slate-500">
              Listeden bir varlık seçildiğinde ana terminal ekranı anında güncellenir.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Watchlist;
