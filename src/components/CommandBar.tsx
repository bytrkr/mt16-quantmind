// src/components/CommandBar.tsx
/**
 * ============================================================================
 * ⌨️ MT16 QUANTMIND — GLOOMBERG-STYLE COMMAND BAR (CommandBar.tsx)
 * ============================================================================
 *
 * QODI ANAYASA STANDARTLARI:
 * - Kural 1 (Sıfır Bağımlılık): Yalnızca UI katmanıdır.
 * - Kural 2 (Fallback Yasağı): Arama sonucu bulunamazsa sahte sembol üretilmez, "VERİ YOK" gösterilir.
 * - Kural 3 (Çökme Yasağı / Null Safety): Null/undefined parametre denetimleri tamdır.
 * - Klavye Desteği: Ctrl+K / Cmd+K ile açılır, Esc ile kapanır, Enter & Ok tuşları ile gezilir.
 * - 40 Komut Entegrasyonu: COMMAND_REGISTRY komutları ve semboller birlikte taranabilir.
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, Command, X, ArrowUp, ArrowDown, CornerDownLeft, Terminal, CheckCircle2 } from 'lucide-react';
import { ALL_BIST_STOCKS } from '../data/bistAllStocks';
import { COMMAND_REGISTRY, Command as CommandItem } from '../data/commandRegistry';

export interface CommandBarProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (ticker: string) => void;
  allTickers?: string[];
  activeTicker?: string;
}

const DEFAULT_HOT_TICKERS = [
  'ASELS', 'THYAO', 'EREGL', 'GARAN', 'TUPRS',
  'KCHOL', 'AKBNK', 'BIMAS', 'ISCTR', 'YKBNK'
];

export interface SearchResultItem {
  type: 'ticker' | 'command';
  id: string;
  title: string;
  subtitle: string;
  category?: string;
  tickerCode?: string;
  commandObj?: CommandItem;
}

export const CommandBar: React.FC<CommandBarProps> = ({
  isOpen,
  onClose,
  onSelect,
  allTickers,
  activeTicker = 'THYAO'
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [cmdResultToast, setCmdResultToast] = useState<string | null>(null);
  const [isExecLoading, setIsExecLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sembol listesi
  const safeTickers = useMemo(() => {
    if (Array.isArray(allTickers) && allTickers.length > 0) {
      return allTickers;
    }
    if (Array.isArray(ALL_BIST_STOCKS) && ALL_BIST_STOCKS.length > 0) {
      return ALL_BIST_STOCKS.map(s => s.code);
    }
    return DEFAULT_HOT_TICKERS;
  }, [allTickers]);

  // Hibrit Arama (Hisseler + 40 Kuant Komutu)
  const searchResults: SearchResultItem[] = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();
    const list: SearchResultItem[] = [];

    // 1. Komutlar
    COMMAND_REGISTRY.forEach(cmd => {
      if (
        !cleanQuery ||
        cmd.id.toLowerCase().includes(cleanQuery) ||
        cmd.title.toLowerCase().includes(cleanQuery) ||
        cmd.description.toLowerCase().includes(cleanQuery) ||
        cmd.category.toLowerCase().includes(cleanQuery)
      ) {
        list.push({
          type: 'command',
          id: `cmd-${cmd.id}`,
          title: cmd.title,
          subtitle: `${cmd.description} (${cmd.exampleQuery})`,
          category: cmd.category,
          commandObj: cmd
        });
      }
    });

    // 2. Semboller
    safeTickers.forEach(t => {
      const stockObj = ALL_BIST_STOCKS.find(s => s.code === t);
      if (!cleanQuery || t.toLowerCase().includes(cleanQuery) || (stockObj && stockObj.name.toLowerCase().includes(cleanQuery))) {
        list.push({
          type: 'ticker',
          id: `ticker-${t}`,
          title: `#${t}`,
          subtitle: stockObj ? `${stockObj.name} · ${stockObj.sector}` : 'BIST Sembolü',
          tickerCode: t
        });
      }
    });

    return list.slice(0, 15);
  }, [query, safeTickers]);

  // Açıldığında odağı girişe taşı
  useEffect(() => {
    if (isOpen) {
      setSelectedIndex(0);
      setCmdResultToast(null);
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  const handleSelectItem = async (item: SearchResultItem) => {
    if (item.type === 'ticker' && item.tickerCode) {
      onSelect(item.tickerCode);
      setQuery('');
      onClose();
    } else if (item.type === 'command' && item.commandObj) {
      setIsExecLoading(true);
      try {
        const res = await item.commandObj.handler(activeTicker);
        setCmdResultToast(res);
      } catch (e: any) {
        setCmdResultToast(`Hata: ${e?.message || 'VERİ YOK'}`);
      } finally {
        setIsExecLoading(false);
      }
    }
  };

  // Klavye yönlendirme ve seçim kontrolü
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      onClose();
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (searchResults.length > 0 ? (prev + 1) % searchResults.length : 0));
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (searchResults.length > 0 ? (prev - 1 + searchResults.length) % searchResults.length : 0));
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      if (searchResults.length > 0 && selectedIndex < searchResults.length) {
        const target = searchResults[selectedIndex];
        void handleSelectItem(target);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-md flex items-start justify-center pt-16 md:pt-20 px-4 animate-in fade-in duration-150 font-sans"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-slate-900 border border-emerald-500/30 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden font-mono"
        onClick={e => e.stopPropagation()}
      >
        {/* Arama Giriş Çubuğu */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-800 bg-slate-950/70">
          <Search className="w-5 h-5 text-emerald-400 mr-3 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Hisse veya 40 Kuant Komutu Ara (Örn: duvar-analizi, THYAO, rsi, merdiven)..."
            className="w-full bg-transparent text-slate-100 placeholder-slate-500 font-bold text-xs md:text-sm focus:outline-none"
          />
          {isExecLoading && (
            <span className="text-xs text-amber-400 font-bold animate-pulse mr-2">Çalıştırılıyor...</span>
          )}
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Komut Çalıştırma Sonuç Paneli (Toast / Console Output) */}
        {cmdResultToast && (
          <div className="p-3 bg-slate-950 border-b border-emerald-500/40 text-emerald-300 text-xs font-mono flex items-start justify-between gap-2 animate-fadeIn">
            <div className="flex items-start gap-2 flex-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="break-words leading-relaxed">{cmdResultToast}</div>
            </div>
            <button
              type="button"
              onClick={() => setCmdResultToast(null)}
              className="text-slate-500 hover:text-white text-xs cursor-pointer"
            >
              Kapat
            </button>
          </div>
        )}

        {/* Sonuç Listesi */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {searchResults.length > 0 ? (
            searchResults.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => void handleSelectItem(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl cursor-pointer transition ${
                    isSelected
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                      : 'text-slate-300 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    {item.type === 'command' ? (
                      <span className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                        <Terminal className="w-3.5 h-3.5" />
                      </span>
                    ) : (
                      <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs shrink-0 ${
                        isSelected ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-300'
                      }`}>
                        #{item.title.slice(1, 3)}
                      </span>
                    )}

                    <div className="overflow-hidden">
                      <div className="flex items-center gap-2">
                        <div className="font-bold text-xs md:text-sm text-white truncate">{item.title}</div>
                        {item.category && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-800 text-slate-400 uppercase tracking-wider shrink-0">
                            {item.category}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 font-sans truncate">{item.subtitle}</div>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-bold shrink-0 ml-2">
                      <span>{item.type === 'command' ? 'Çalıştır' : 'Seç'}</span>
                      <CornerDownLeft className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="p-6 text-center text-slate-500 text-xs font-bold uppercase tracking-wider">
              VERİ YOK — Komut veya Sembol Bulunamadı
            </div>
          )}
        </div>

        {/* Alt Kısayol Açıklamaları */}
        <div className="px-4 py-2.5 bg-slate-950/80 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-bold">↑</kbd>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-bold">↓</kbd> Gezin
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-bold">↵</kbd> Seç / Çalıştır
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-bold">Esc</kbd> Kapat
            </span>
          </div>
          <div className="flex items-center gap-1 text-emerald-400 font-bold">
            <Command className="w-3 h-3" />
            <span>Gloomberg 40-Quant Engine Bar</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommandBar;

