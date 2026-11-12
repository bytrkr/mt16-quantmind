// src/components/CognitiveBarReplay.tsx
/**
 * MT16 BistApp Kuant Terminali - Bilişsel Geçmiş Replay ve Karşılaştırmalı Simülatör
 * Seçili varlığın geçmiş mumlarını adım adım oynatarak, MT16 jürisinin o an ürettiği geçmiş sinyalleri,
 * Z-Skorlarını ve OCO simülasyon kâr/zarar durumunu adım adım görselleştiren Replay modudur.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Play, Pause, SkipForward, RotateCcw, Activity, ShieldCheck, TrendingUp, TrendingDown, Clock, Zap } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, Tooltip, ReferenceLine, XAxis, YAxis } from 'recharts';
import type { MarketType } from '../App';

export interface CognitiveBarReplayProps {
  selectedMarket?: MarketType;
  ticker?: string;
}

interface ReplayBarFrame {
  step: number;
  timeLabel: string;
  price: number;
  zScore: number;
  juryDecision: 'GÜÇLÜ AL' | 'AL' | 'BEKLE' | 'SAT';
  juryConfidence: number;
  simulatedPnlPct: number;
}

const HISTORICAL_REPLAY_FRAMES: ReplayBarFrame[] = [
  { step: 1, timeLabel: '10:00', price: 210.00, zScore: 0.20, juryDecision: 'BEKLE', juryConfidence: 55, simulatedPnlPct: 0.00 },
  { step: 2, timeLabel: '10:15', price: 211.20, zScore: 0.85, juryDecision: 'AL', juryConfidence: 68, simulatedPnlPct: 0.57 },
  { step: 3, timeLabel: '10:30', price: 212.80, zScore: 1.45, juryDecision: 'AL', juryConfidence: 74, simulatedPnlPct: 1.33 },
  { step: 4, timeLabel: '10:45', price: 214.50, zScore: 2.15, juryDecision: 'GÜÇLÜ AL', juryConfidence: 86, simulatedPnlPct: 2.14 },
  { step: 5, timeLabel: '11:00', price: 216.00, zScore: 1.93, juryDecision: 'GÜÇLÜ AL', juryConfidence: 82, simulatedPnlPct: 2.85 },
  { step: 6, timeLabel: '11:15', price: 215.40, zScore: 1.60, juryDecision: 'AL', juryConfidence: 72, simulatedPnlPct: 2.57 },
  { step: 7, timeLabel: '11:30', price: 217.20, zScore: 2.40, juryDecision: 'GÜÇLÜ AL', juryConfidence: 89, simulatedPnlPct: 3.42 },
  { step: 8, timeLabel: '11:45', price: 218.50, zScore: 2.80, juryDecision: 'GÜÇLÜ AL', juryConfidence: 92, simulatedPnlPct: 4.05 },
];

export const CognitiveBarReplay: React.FC<CognitiveBarReplayProps> = ({
  selectedMarket = 'NASDAQ',
  ticker = 'NVDA',
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [replaySpeed, setReplaySpeed] = useState<number>(1000); // 1s per step

  const currency = selectedMarket === 'BIST' ? '₺' : '$';

  // Step Auto-play Loop
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    if (isPlaying) {
      timer = setInterval(() => {
        setCurrentStepIndex((prev) => {
          if (prev >= HISTORICAL_REPLAY_FRAMES.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, replaySpeed);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isPlaying, replaySpeed]);

  const activeFrame = HISTORICAL_REPLAY_FRAMES[currentStepIndex];
  const chartDataHistory = useMemo(() => {
    return HISTORICAL_REPLAY_FRAMES.slice(0, currentStepIndex + 1);
  }, [currentStepIndex]);

  const handleStepForward = () => {
    if (currentStepIndex < HISTORICAL_REPLAY_FRAMES.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentStepIndex(0);
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl backdrop-blur-md space-y-4 font-mono">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-purple-400 animate-pulse" />
          <h3 className="text-xs font-black text-white uppercase tracking-wider">
            Bilişsel Geçmiş Replay &amp; Karşılaştırmalı Simülatör
          </h3>
        </div>

        {/* Play / Pause / Step Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            className={`px-3 py-1 rounded-xl text-xs font-black flex items-center gap-1.5 transition cursor-pointer shadow-lg ${
              isPlaying
                ? 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                : 'bg-emerald-600 text-white hover:bg-emerald-500'
            }`}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            <span>{isPlaying ? 'Durdur' : 'Oynat (Replay)'}</span>
          </button>

          <button
            type="button"
            onClick={handleStepForward}
            disabled={currentStepIndex >= HISTORICAL_REPLAY_FRAMES.length - 1}
            className="p-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-200 transition cursor-pointer"
            title="1 Adım İlerle"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={handleReset}
            className="p-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-200 transition cursor-pointer"
            title="Replay Başa Al"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Frame Active Stats Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
          <div className="text-[10px] text-slate-400 uppercase font-semibold">Zaman &amp; Adım</div>
          <div className="text-base font-black text-purple-300 mt-1">
            {activeFrame.timeLabel} (Adım #{activeFrame.step})
          </div>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
          <div className="text-[10px] text-slate-400 uppercase font-semibold">Geçmiş Fiyat</div>
          <div className="text-base font-black text-white mt-1">
            {currency}{activeFrame.price.toFixed(2)}
          </div>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
          <div className="text-[10px] text-slate-400 uppercase font-semibold">O Anki Jüri Kararı</div>
          <div
            className={`text-base font-black mt-1 ${
              activeFrame.juryDecision.includes('AL')
                ? 'text-emerald-400'
                : activeFrame.juryDecision === 'SAT'
                ? 'text-rose-400'
                : 'text-amber-400'
            }`}
          >
            {activeFrame.juryDecision} (%{activeFrame.juryConfidence})
          </div>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
          <div className="text-[10px] text-slate-400 uppercase font-semibold">OCO Simüle Getiri</div>
          <div className="text-base font-black text-cyan-300 mt-1">
            +%{activeFrame.simulatedPnlPct.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Replay Chart */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-300 font-bold">
          <span>📉 Geçmiş Fiyat &amp; Z-Skor Replay Eğrisi (#{ticker})</span>
          <span className="text-[10px] text-purple-400">Canlı Oynatma Modu</span>
        </div>

        <div className="h-40 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartDataHistory}>
              <XAxis dataKey="timeLabel" stroke="#475569" tick={{ fontSize: 9 }} />
              <YAxis stroke="#475569" tick={{ fontSize: 9 }} domain={['auto', 'auto']} />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload as ReplayBarFrame;
                    return (
                      <div className="bg-slate-900 border border-slate-700 p-2 rounded text-[10px] font-mono">
                        <div className="text-slate-400 font-bold">{d.timeLabel}</div>
                        <div className="text-white">Fiyat: {currency}{d.price}</div>
                        <div className="text-cyan-300">Z-Skor: +{d.zScore}&sigma;</div>
                        <div className="text-emerald-400">Jüri: {d.juryDecision}</div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Line type="monotone" dataKey="price" stroke="#a855f7" strokeWidth={2.5} dot={{ r: 3, fill: '#a855f7' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default CognitiveBarReplay;
