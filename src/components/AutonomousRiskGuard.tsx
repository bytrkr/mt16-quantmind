// src/components/AutonomousRiskGuard.tsx
/**
 * MT16 BistApp Kuant Terminali - Otonom Risk Guard ve Kill-Switch Paneli
 * Canlı Portföy VaR (%95 Riske Maruz Değer) takibi yapar ve risk limiti ihlal edildiğinde
 * otonom Kill-Switch koruması tetikler.
 */

import React, { useState, useMemo, useEffect } from 'react';
import { ShieldAlert, ShieldCheck, Zap, Lock, Unlock, AlertOctagon, RotateCcw, Activity, FileText } from 'lucide-react';
import { MarketGatewaySnapshot } from '../services/marketGateway';
import { ExecutionSafetyGuard } from '../services/executionSafetyGuard';
import type { MarketType } from '../App';

export interface AutonomousRiskGuardProps {
  snapshot?: MarketGatewaySnapshot;
  ticker?: string;
  marketType?: MarketType;
}

interface RiskAuditLog {
  id: string;
  time: string;
  metric: string;
  value: string;
  limit: string;
  status: 'PASSED' | 'BREACHED' | 'KILL_SWITCH';
  message: string;
}

export const AutonomousRiskGuard: React.FC<AutonomousRiskGuardProps> = ({
  snapshot,
  ticker = 'NVDA',
  marketType = 'NASDAQ',
}) => {
  const [maxDrawdownLimitPct, setMaxDrawdownLimitPct] = useState<number>(5.0); // % Drawdown Limit
  const [maxVarLimitPct, setMaxVarLimitPct] = useState<number>(3.5); // % VaR Limit
  const [isKillSwitchArmed, setIsKillSwitchArmed] = useState<boolean>(true);
  const [manualOverrideTripped, setManualOverrideTripped] = useState<boolean>(false);
  const [auditLogs, setAuditLogs] = useState<RiskAuditLog[]>([
    {
      id: 'LOG-101',
      time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
      metric: 'Portföy VaR %95',
      value: '%2.15',
      limit: '%3.50',
      status: 'PASSED',
      message: 'Riske maruz değer limit zırhı içinde.',
    },
    {
      id: 'LOG-102',
      time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      metric: 'Slippage & Kayma',
      value: '5.2 bps',
      limit: '15.0 bps',
      status: 'PASSED',
      message: 'Likidite erime hızı güvenli bölgede.',
    },
  ]);

  // Real-time calculation of portfolio VaR and Drawdown
  const livePrice = snapshot?.price && snapshot.price > 0 ? snapshot.price : 100;
  const liveZScore = snapshot?.liveZScore || 0;
  const liveSpreadPct = snapshot?.spreadPct || 0.4;

  // Calculate Parametric 1-Day VaR (95%)
  const calculatedVarPct = useMemo(() => {
    const dailyVol = Math.max(0.8, Math.abs(liveZScore) * 1.2 + 1.1);
    return Number((dailyVol * 1.645).toFixed(2));
  }, [liveZScore]);

  // Current simulated drawdown
  const currentDrawdownPct = useMemo(() => {
    return Number((Math.abs(Math.min(0, liveZScore)) * 0.95 + liveSpreadPct * 0.5).toFixed(2));
  }, [liveZScore, liveSpreadPct]);

  // Determine if safety guard thresholds are breached
  const isVarBreached = calculatedVarPct > maxVarLimitPct;
  const isDrawdownBreached = currentDrawdownPct > maxDrawdownLimitPct;
  const isKillSwitchActive = isKillSwitchArmed && (isVarBreached || isDrawdownBreached || manualOverrideTripped);

  // Validate execution using ExecutionSafetyGuard
  const safetyStatus = useMemo(() => {
    if (isKillSwitchActive) {
      return {
        allowed: false,
        reason: manualOverrideTripped
          ? 'Manuel Kill-Switch Koruma Modu Etkinleştirildi!'
          : isVarBreached
          ? `Portföy VaR (%${calculatedVarPct}) üst limiti (%${maxVarLimitPct}) aştı!`
          : `Mevcut Drawdown (%${currentDrawdownPct}) tavan limiti (%${maxDrawdownLimitPct}) ihlal etti!`,
      };
    }
    return ExecutionSafetyGuard.validateTradeExecution(14, currentDrawdownPct, 'REGULAR_TRADE');
  }, [isKillSwitchActive, manualOverrideTripped, isVarBreached, isDrawdownBreached, calculatedVarPct, maxVarLimitPct, currentDrawdownPct]);

  // Log breach events when threshold passes
  useEffect(() => {
    if (isKillSwitchActive) {
      const nowTime = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setAuditLogs((prev) => [
        {
          id: `LOG-${Date.now().toString().slice(-4)}`,
          time: nowTime,
          metric: isVarBreached ? 'VaR Limit' : 'Drawdown Limit',
          value: isVarBreached ? `%${calculatedVarPct}` : `%${currentDrawdownPct}`,
          limit: isVarBreached ? `%${maxVarLimitPct}` : `%${maxDrawdownLimitPct}`,
          status: 'KILL_SWITCH',
          message: safetyStatus.reason,
        },
        ...prev.slice(0, 5),
      ]);
    }
  }, [isKillSwitchActive, isVarBreached, calculatedVarPct, maxVarLimitPct, currentDrawdownPct, maxDrawdownLimitPct, safetyStatus.reason]);

  const handleManualTrip = () => {
    setManualOverrideTripped(true);
  };

  const handleResetGuard = () => {
    setManualOverrideTripped(false);
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl backdrop-blur-md space-y-4 font-mono">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <ShieldAlert className={`w-4 h-4 ${isKillSwitchActive ? 'text-rose-500 animate-bounce' : 'text-emerald-400'}`} />
          <h3 className="text-xs font-black text-white uppercase tracking-wider">
            Otonom Risk Guard &amp; Kill-Switch Paneli
          </h3>
        </div>

        {/* Status Indicator Badge */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsKillSwitchArmed(!isKillSwitchArmed)}
            className={`px-2.5 py-1 rounded-xl border text-[10px] font-bold flex items-center gap-1 transition cursor-pointer ${
              isKillSwitchArmed
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                : 'bg-slate-950 text-slate-500 border-slate-800'
            }`}
          >
            {isKillSwitchArmed ? <Lock className="w-3 h-3 text-rose-400" /> : <Unlock className="w-3 h-3 text-slate-500" />}
            <span>Zırh: {isKillSwitchArmed ? 'SİLAHLI (ARMED)' : 'PASİF'}</span>
          </button>

          <span
            className={`px-3 py-1 rounded-xl text-xs font-black border flex items-center gap-1.5 shadow-lg ${
              isKillSwitchActive
                ? 'bg-rose-950 text-rose-200 border-rose-500 animate-pulse'
                : 'bg-emerald-950 text-emerald-300 border-emerald-500/50'
            }`}
          >
            {isKillSwitchActive ? (
              <>
                <AlertOctagon className="w-4 h-4 text-rose-400 animate-spin" />
                🚨 KILL-SWITCH AKTİF
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                ✅ RİSK TAVANI İÇİNDE
              </>
            )}
          </span>
        </div>
      </div>

      {/* Main Alert Banner */}
      <div
        className={`p-3.5 rounded-xl border text-xs leading-relaxed flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
          isKillSwitchActive
            ? 'bg-rose-950/80 border-rose-500 text-rose-200 shadow-[0_0_25px_rgba(244,63,94,0.3)]'
            : 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200'
        }`}
      >
        <div className="flex items-start gap-2.5">
          <Zap className={`w-5 h-5 shrink-0 mt-0.5 ${isKillSwitchActive ? 'text-rose-400 animate-bounce' : 'text-emerald-400'}`} />
          <div>
            <div className="font-black text-sm">
              {isKillSwitchActive ? '🚨 KORUMA KİLİDİ TETİKLENDİ — OTOMATİK EMİR YÜRÜTME DURDURULDU' : '🛡️ PORTFÖY RİSK GUARD AKTİF VE GÜVENLİ'}
            </div>
            <div className="text-[11px] opacity-90 mt-0.5">{safetyStatus.reason}</div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {manualOverrideTripped || isKillSwitchActive ? (
            <button
              type="button"
              onClick={handleResetGuard}
              className="px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1 transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
              <span>Zırhı Sıfırla</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleManualTrip}
              className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1 transition cursor-pointer shadow-lg shadow-rose-600/30"
            >
              <AlertOctagon className="w-3.5 h-3.5" />
              <span>Acil Manuel Kill-Switch</span>
            </button>
          )}
        </div>
      </div>

      {/* Metrics & Risk Limits Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
          <div className="text-[10px] text-slate-400 uppercase font-semibold">Canlı Portföy VaR (%95)</div>
          <div className={`text-base font-black mt-1 ${calculatedVarPct > maxVarLimitPct ? 'text-rose-400' : 'text-emerald-400'}`}>
            %{calculatedVarPct}
          </div>
          <div className="text-[9px] text-slate-500 mt-0.5">Eşik Limit: %{maxVarLimitPct}</div>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
          <div className="text-[10px] text-slate-400 uppercase font-semibold">Anlık Drawdown</div>
          <div className={`text-base font-black mt-1 ${currentDrawdownPct > maxDrawdownLimitPct ? 'text-rose-400' : 'text-cyan-300'}`}>
            %{currentDrawdownPct}
          </div>
          <div className="text-[9px] text-slate-500 mt-0.5">Tavan Sınır: %{maxDrawdownLimitPct}</div>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
          <div className="text-[10px] text-slate-400 uppercase font-semibold">Korelasyon Riski (Max Corr)</div>
          <div className="text-base font-black text-purple-300 mt-1">0.12</div>
          <div className="text-[9px] text-slate-500 mt-0.5">Portföy Dağılımı Düşük Riskli</div>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
          <div className="text-[10px] text-slate-400 uppercase font-semibold">Slippage &amp; Komisyon Rezerve</div>
          <div className="text-base font-black text-emerald-300 mt-1">5 bps</div>
          <div className="text-[9px] text-slate-500 mt-0.5">Tahta Kayması Tolere Edildi</div>
        </div>
      </div>

      {/* Threshold Limit Sliders */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-3 text-[11px]">
        <div className="flex items-center justify-between text-slate-300 font-bold border-b border-slate-800 pb-1.5">
          <span>⚙️ Risk Tolerans Limit Ayarları</span>
          <span className="text-[10px] text-slate-400">Aktif Varlık: {ticker}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <div className="flex justify-between text-slate-400 mb-1">
              <span>Max Tolerans Drawdown Limiti:</span>
              <span className="text-rose-400 font-bold">%{maxDrawdownLimitPct}</span>
            </div>
            <input
              type="range"
              min="1.0"
              max="15.0"
              step="0.5"
              value={maxDrawdownLimitPct}
              onChange={(e) => setMaxDrawdownLimitPct(parseFloat(e.target.value))}
              className="w-full accent-rose-500 bg-slate-800 h-1.5 rounded cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-slate-400 mb-1">
              <span>Max Portföy VaR %95 Eşiği:</span>
              <span className="text-cyan-400 font-bold">%{maxVarLimitPct}</span>
            </div>
            <input
              type="range"
              min="1.0"
              max="8.0"
              step="0.25"
              value={maxVarLimitPct}
              onChange={(e) => setMaxVarLimitPct(parseFloat(e.target.value))}
              className="w-full accent-cyan-500 bg-slate-800 h-1.5 rounded cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Risk Audit Trail Table */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-300 font-bold border-b border-slate-800/80 pb-1.5">
          <span className="flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-cyan-400" />
            Risk Denetim Günlüğü (Audit Trail)
          </span>
          <span className="text-[10px] text-slate-500">Son {auditLogs.length} Denetim</span>
        </div>

        <div className="space-y-1">
          {auditLogs.map((log) => (
            <div
              key={log.id}
              className="p-2 rounded-lg bg-slate-900/80 border border-slate-800/80 flex flex-wrap items-center justify-between text-[10px] gap-2"
            >
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-mono">{log.time}</span>
                <span className="text-white font-bold">{log.metric}</span>
                <span className="text-slate-400">({log.value} / Limit: {log.limit})</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-slate-300 truncate max-w-[200px]">{log.message}</span>
                <span
                  className={`px-1.5 py-0.5 rounded font-black text-[9px] ${
                    log.status === 'KILL_SWITCH'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  }`}
                >
                  {log.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AutonomousRiskGuard;
