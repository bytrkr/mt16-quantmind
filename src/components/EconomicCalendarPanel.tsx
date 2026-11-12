// src/components/EconomicCalendarPanel.tsx
/**
 * MT16 BistApp Kuant Terminali - Ekonomik Takvim & Temettü Paneli
 * Yaklaşan TCMB/FED faiz kararlarını, enflasyon verilerini ve şirket temettü/bedelsiz takvimini listeler.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, Clock, DollarSign, TrendingUp, AlertCircle, Building, Filter, CheckCircle2 } from 'lucide-react';
import { fetchUpcomingEvents, CalendarEventItem } from '../services/calendarService';
import type { MarketType } from '../App';

export interface EconomicCalendarPanelProps {
  selectedMarket?: MarketType;
  onSelectEventStock?: (symbol: string) => void;
}

export const EconomicCalendarPanel: React.FC<EconomicCalendarPanelProps> = ({
  selectedMarket = 'BIST',
  onSelectEventStock,
}) => {
  const [events, setEvents] = useState<CalendarEventItem[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'TCMB_FED' | 'MACRO' | 'DIVIDEND' | 'EARNINGS'>('ALL');

  useEffect(() => {
    fetchUpcomingEvents().then(setEvents);
  }, []);

  const filteredEvents = useMemo(() => {
    if (categoryFilter === 'ALL') return events;
    return events.filter((e) => e.category === categoryFilter);
  }, [events, categoryFilter]);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl backdrop-blur-md space-y-4 font-mono">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-cyan-400 animate-pulse" />
          <h3 className="text-xs font-black text-white uppercase tracking-wider">
            Ekonomik Takvim &amp; Temettü Paneli
          </h3>
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-[10px]">
          {(
            [
              { key: 'ALL', label: 'Tümü' },
              { key: 'TCMB_FED', label: 'TCMB / FED' },
              { key: 'MACRO', label: 'Makro / Enflasyon' },
              { key: 'DIVIDEND', label: 'Temettü' },
              { key: 'EARNINGS', label: 'Bilanço' },
            ] as const
          ).map((cat) => (
            <button
              key={cat.key}
              type="button"
              onClick={() => setCategoryFilter(cat.key)}
              className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                categoryFilter === cat.key
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Events Stream List */}
      <div className="space-y-2">
        {filteredEvents.length > 0 ? (
          filteredEvents.map((evt) => {
            const isHighImpact = evt.impact === 'HIGH';
            const isDividend = evt.category === 'DIVIDEND';

            return (
              <div
                key={evt.id}
                className={`p-3 rounded-xl border transition-all hover:border-slate-700 bg-slate-950/70 border-slate-800 space-y-2`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded font-black text-[9px] ${
                        isHighImpact
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      }`}
                    >
                      {evt.impact === 'HIGH' ? '🔴 KRİTİK ETKİ' : '🟡 ORTA ETKİ'}
                    </span>

                    <span className="text-xs font-bold text-white">{evt.title}</span>

                    {evt.symbol && (
                      <button
                        type="button"
                        onClick={() => onSelectEventStock && onSelectEventStock(evt.symbol!)}
                        className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black hover:bg-emerald-500/30 transition cursor-pointer"
                      >
                        #{evt.symbol}
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-[10px] text-slate-400">
                    <Clock className="w-3 h-3 text-cyan-400" />
                    <span>{evt.date} {evt.time ? `• ${evt.time}` : ''}</span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-300 leading-snug">
                  {evt.description}
                </div>

                {(evt.expectedValue || evt.previousValue || evt.dividendAmountTL) && (
                  <div className="flex flex-wrap items-center gap-3 text-[10px] pt-1 border-t border-slate-800/80">
                    {evt.expectedValue && (
                      <span className="text-slate-400">
                        Beklenen: <strong className="text-cyan-300">{evt.expectedValue}</strong>
                      </span>
                    )}
                    {evt.previousValue && (
                      <span className="text-slate-400">
                        Önceki: <strong className="text-slate-300">{evt.previousValue}</strong>
                      </span>
                    )}
                    {evt.dividendAmountTL && (
                      <span className="text-emerald-400 font-bold">
                        Hisse Başı Temettü: ₺{evt.dividendAmountTL.toFixed(2)} Net
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="text-center text-slate-500 py-6 text-xs">Seçili kategoride etkinlik bulunamadı.</div>
        )}
      </div>
    </div>
  );
};

export default EconomicCalendarPanel;
