// src/components/IcebergRadarOverlay.tsx
/**
 * MT16 BistApp Kuant Terminali - Sentetik Likidite & Gizli Lot Avcısı Kartı
 * Milisaniyelik emir gerçekleşme/iptal oranlarını (Order Cancel Rate) analiz ederek
 * tahtadaki gizli Iceberg lotları ve sentetik likidite temizleme (Stop Hunting / Liquidation Sweeps)
 * hareketlerini L2 ve grafik görünümünde canlı rozetlerle gösterir.
 */

import React, { useMemo } from 'react';
import { Eye, ShieldAlert, Zap, Layers, RefreshCw, Flame, AlertOctagon } from 'lucide-react';
import { MarketGatewaySnapshot } from '../services/marketGateway';
import { icebergDetector, IcebergDetectionResult } from '../services/icebergDetector';
import type { MarketType } from '../App';

export interface IcebergRadarOverlayProps {
  snapshot?: MarketGatewaySnapshot;
  ticker?: string;
  marketType?: MarketType;
}

export const IcebergRadarOverlay: React.FC<IcebergRadarOverlayProps> = ({
  snapshot,
  ticker = 'NVDA',
  marketType = 'NASDAQ',
}) => {
  const icebergResults = useMemo<IcebergDetectionResult[]>(() => {
    if (!snapshot) return [];
    return icebergDetector.analyzeIcebergPatterns(snapshot);
  }, [snapshot]);

  const currency = marketType === 'BIST' ? '₺' : '$';

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl backdrop-blur-md space-y-4 font-mono">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-cyan-400 animate-pulse" />
          <h3 className="text-xs font-black text-white uppercase tracking-wider">
            Sentetik Likidite &amp; Gizli Lot Avcısı (Iceberg Radar)
          </h3>
        </div>

        <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold">
          {icebergResults.length} Iceberg Algoritması Aktif
        </span>
      </div>

      {/* Detected Iceberg Order Cards */}
      <div className="space-y-2">
        {icebergResults.length > 0 ? (
          icebergResults.map((item, idx) => {
            const isBid = item.side === 'BID';
            return (
              <div
                key={idx}
                className={`p-3 rounded-xl border transition-all ${
                  isBid
                    ? 'bg-emerald-950/40 border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
                    : 'bg-purple-950/40 border-purple-500/40 shadow-[0_0_15px_rgba(168,85,247,0.1)]'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded font-black text-[10px] ${
                        isBid ? 'bg-emerald-500 text-slate-950' : 'bg-purple-500 text-slate-950'
                      }`}
                    >
                      {isBid ? '🛡️ ALIŞ ICEBERG' : '🧱 SATIŞ ICEBERG'}
                    </span>

                    <span className="text-xs font-bold text-white">
                      Seviye: {currency}{item.priceLevel.toFixed(2)}
                    </span>
                  </div>

                  {item.isSweepDetected && (
                    <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[9px] font-black animate-pulse flex items-center gap-1">
                      <Zap className="w-3 h-3 text-rose-400" />
                      {item.sweepType === 'STOP_HUNTING' ? '🚨 STOP HUNTING TEMİZLİĞİ' : '⚡ LİKİDASYON SÜPÜRME'}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] bg-slate-950/70 p-2 rounded-lg border border-slate-800">
                  <div>
                    <span className="text-slate-400">Görünen Lot:</span>
                    <div className="text-white font-bold">{item.visibleQty.toLocaleString('tr-TR')}</div>
                  </div>
                  <div>
                    <span className="text-slate-400">Gizli Iceberg Lot:</span>
                    <div className="text-cyan-300 font-bold">~{item.estimatedHiddenQty.toLocaleString('tr-TR')}</div>
                  </div>
                  <div>
                    <span className="text-slate-400">Order Cancel Rate:</span>
                    <div className="text-amber-300 font-bold">%{item.cancelRatePct}</div>
                  </div>
                  <div>
                    <span className="text-slate-400">Güven Oranı:</span>
                    <div className="text-emerald-400 font-bold">%{item.confidenceScore}</div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center text-xs text-slate-400">
            Mevcut kademe taramasında tespit edilmiş aktif gizli Iceberg lotu bulunmuyor.
          </div>
        )}
      </div>
    </div>
  );
};

export default IcebergRadarOverlay;
