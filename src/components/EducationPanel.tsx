// src/components/EducationPanel.tsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  BookOpen,
  X,
  Search,
  ChevronLeft,
  ChevronRight,
  Calculator,
  TrendingUp,
  Activity,
  ShieldAlert,
  DollarSign,
  FileText,
  Globe,
  Compass,
  Brain,
  Cpu,
  Server,
  Code2,
  Sparkles,
  Zap,
  CheckCircle2
} from 'lucide-react';
import financeCardsData from '../data/financeCards.json';

export interface EduItem {
  id: number;
  text: string;
  command?: string;
}

export interface EduCard {
  id: string;
  title: string;
  category: string;
  icon: string;
  description: string;
  command?: string;
  items: EduItem[];
}

export interface EducationPanelProps {
  isOpen?: boolean;
  onClose?: () => void;
  onExecuteCommand?: (commandText: string) => void;
}

const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  Calculator,
  TrendingUp,
  Activity,
  ShieldAlert,
  DollarSign,
  FileText,
  Globe,
  BookOpen,
  Compass,
  Brain,
  Cpu,
  Server,
  Code2,
  Sparkles,
  Zap,
};

export const EducationPanel: React.FC<EducationPanelProps> = ({
  isOpen = false,
  onClose,
  onExecuteCommand,
}) => {
  const [activeCardIndex, setActiveCardIndex] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [executedToast, setExecutedToast] = useState<string | null>(null);

  const cards: EduCard[] = useMemo(() => financeCardsData as EduCard[], []);

  // Card navigation
  const currentCard = cards[activeCardIndex] || cards[0];

  const handlePrevCard = () => {
    setActiveCardIndex((prev) => (prev > 0 ? prev - 1 : cards.length - 1));
  };

  const handleNextCard = () => {
    setActiveCardIndex((prev) => (prev < cards.length - 1 ? prev + 1 : 0));
  };

  // Filter items by search query
  const filteredSearchResults = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const q = searchQuery.toLowerCase();
    const results: Array<{ cardTitle: string; category: string; item: EduItem }> = [];
    cards.forEach((card) => {
      card.items.forEach((item) => {
        if (item.text.toLowerCase().includes(q) || card.title.toLowerCase().includes(q)) {
          results.push({ cardTitle: card.title, category: card.category, item });
        }
      });
    });
    return results;
  }, [cards, searchQuery]);

  const handleItemClick = (item: EduItem) => {
    const cmdText = item.command || `duvar-analizi THYAO`;
    if (onExecuteCommand) {
      onExecuteCommand(cmdText);
    }
    setExecutedToast(`Komut Çalıştırıldı: ${cmdText}`);
    setTimeout(() => setExecutedToast(null), 3000);
  };

  if (!isOpen) return null;

  const IconComp = ICON_MAP[currentCard?.icon] || BookOpen;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-950/80 backdrop-blur-md animate-fadeIn font-sans">
      <div className="relative w-full max-w-5xl max-h-[92vh] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* ÜST BİLGİ VE KAPATMA BAR */}
        <div className="flex flex-wrap items-center justify-between p-4 bg-slate-950 border-b border-slate-800 gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <BookOpen className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-white uppercase tracking-wider font-mono">
                  MT16 QuantMind Akademi &amp; 350 Bilgi Kartı
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  14 Kart x 25 Madde
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                Matematik, Finans, Kuant Risk, Muhasebe ve Yapay Zeka Bilgi Seti
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Arama Kutusu */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="350 maddede ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/60 w-44 md:w-60 transition"
              />
            </div>

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
                title="Kapat"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* BİLDİRİM TOAST */}
        {executedToast && (
          <div className="bg-emerald-950/90 border-b border-emerald-500/40 text-emerald-300 px-4 py-2 text-xs font-mono flex items-center justify-between animate-fadeIn">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              {executedToast}
            </span>
            <span className="text-[10px] text-emerald-400/80">CommandBar / Terminal Tetiklendi</span>
          </div>
        )}

        {/* 14 KATEGORİ SEKME ŞERİDİ */}
        <div className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-950/60 border-b border-slate-800 overflow-x-auto scrollbar-none shrink-0">
          {cards.map((card, idx) => {
            const CardIcon = ICON_MAP[card.icon] || BookOpen;
            const isActive = idx === activeCardIndex && !searchQuery.trim();
            return (
              <button
                key={card.id}
                type="button"
                onClick={() => {
                  setActiveCardIndex(idx);
                  setSearchQuery('');
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 border ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
                    : 'bg-slate-900/80 text-slate-300 hover:text-white hover:bg-slate-800 border-slate-800'
                }`}
              >
                <CardIcon className="w-3.5 h-3.5" />
                <span>{card.category}</span>
              </button>
            );
          })}
        </div>

        {/* İÇERİK ALANI */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
          {searchQuery.trim() ? (
            /* ARAMA SONUÇLARI GÖRÜNÜMÜ */
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400 border-b border-slate-800 pb-2">
                <span>"{searchQuery}" için {filteredSearchResults?.length || 0} sonuç bulundu:</span>
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-amber-400 hover:underline cursor-pointer"
                >
                  Aramayı Temizle
                </button>
              </div>

              {filteredSearchResults && filteredSearchResults.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {filteredSearchResults.map((res, i) => (
                    <div
                      key={i}
                      onClick={() => handleItemClick(res.item)}
                      className="bg-slate-950/80 hover:bg-slate-900 border border-slate-800 hover:border-amber-500/50 p-3 rounded-xl transition cursor-pointer flex items-start gap-3 group"
                    >
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                        #{res.item.id}
                      </span>
                      <div className="flex-1">
                        <div className="text-[10px] font-mono text-slate-400 mb-0.5">{res.category}</div>
                        <p className="text-xs text-slate-200 font-medium group-hover:text-amber-300 transition">
                          {res.item.text}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-xs font-mono text-slate-500">
                  Arama kriterlerinize uygun madde bulunamadı.
                </div>
              )}
            </div>
          ) : (
            /* KART DETAY GÖRÜNÜMÜ */
            <div className="space-y-4">
              {/* KART BAŞLIĞI VE GEZİNTİ */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400">
                    <IconComp className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider">
                        Kart {activeCardIndex + 1} / {cards.length}
                      </span>
                      <span className="text-xs font-mono text-slate-500">•</span>
                      <span className="text-xs font-mono text-slate-300">{currentCard.category}</span>
                    </div>
                    <h3 className="text-base md:text-lg font-black text-white font-mono mt-0.5">
                      {currentCard.title}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                      {currentCard.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePrevCard}
                    className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition cursor-pointer flex items-center gap-1 text-xs font-mono"
                    title="Önceki Kart"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span className="hidden sm:inline">Önceki</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleNextCard}
                    className="p-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition cursor-pointer flex items-center gap-1 text-xs font-mono shadow-md shadow-amber-500/20"
                    title="Sonraki Kart"
                  >
                    <span className="hidden sm:inline">Sonraki</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* 25 MADDE BİLGİ IZGARASI */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {currentCard.items.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleItemClick(item)}
                    className="bg-slate-950/70 hover:bg-slate-900 border border-slate-800/80 hover:border-amber-500/50 p-3 rounded-xl transition cursor-pointer flex items-start gap-2.5 group"
                  >
                    <span className="w-6 h-6 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 font-mono font-bold text-[11px] flex items-center justify-center shrink-0 group-hover:bg-amber-500 group-hover:text-slate-950 transition">
                      {item.id}
                    </span>
                    <p className="text-xs text-slate-200 font-sans leading-snug group-hover:text-amber-300 transition pt-0.5">
                      {item.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ALT BİLGİ BAR */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 text-[11px] font-mono text-slate-400 flex flex-wrap items-center justify-between gap-2">
          <span>💡 İpucu: Maddeye tıklayarak terminal komutunu doğrudan tetikleyebilirsiniz.</span>
          <span className="text-amber-400/90">MT16 Kuant Akademi • 350 İlke Rehberi</span>
        </div>
      </div>
    </div>
  );
};

export default EducationPanel;
