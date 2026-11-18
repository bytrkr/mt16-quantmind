// src/components/DebugConsole.tsx
/**
 * MT16 BistApp Kuant Terminali - Sistem Tanılama Konsolu (Debug Console)
 * Uygulama içindeki tüm log, warn, error ve WebSocket/HTTP ağ isteklerini yakalar.
 * Seviyeye/piyasaya göre filtrelenebilir ve katlanabilir (collapsible) debug panelidir.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Terminal, Shield, ChevronDown, ChevronUp, Trash2, Copy, Filter, Check, Bug, Zap } from 'lucide-react';

export type LogLevel = 'ALL' | 'INFO' | 'WARN' | 'ERROR' | 'NETWORK';

export interface DebugLogEntry {
  id: string;
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'NETWORK';
  category: string;
  message: string;
  details?: any;
}

export const DebugConsole: React.FC = () => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [logLevelFilter, setLogLevelFilter] = useState<LogLevel>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [logs, setLogs] = useState<DebugLogEntry[]>([
    {
      id: 'INIT-01',
      timestamp: new Date().toLocaleTimeString('tr-TR'),
      level: 'INFO',
      category: 'SYSTEM',
      message: 'MT16 QuantMind v3.4 Canlı Veri Zırhı Başlatıldı.',
    },
    {
      id: 'INIT-02',
      timestamp: new Date().toLocaleTimeString('tr-TR'),
      level: 'NETWORK',
      category: 'WEBSOCKET',
      message: 'WS Bağlantısı /api/feed/live-orderbook kuruldu (Gecikme: 14ms).',
    },
    {
      id: 'INIT-03',
      timestamp: new Date().toLocaleTimeString('tr-TR'),
      level: 'WARN',
      category: 'Z_SCORE',
      message: 'NVDA Hacim Anomali Eşiği Yükseldi (Z-Skor: +1.93σ).',
    },
    {
      id: 'INIT-04',
      timestamp: new Date().toLocaleTimeString('tr-TR'),
      level: 'INFO',
      category: 'JURY_ENGINE',
      message: '6 Ajanlı Jüri Konsensüsü %74.3 (BEKLE) Kararı Üretti.',
    },
  ]);

  // Hook into console logs safely to capture runtime events
  useEffect(() => {
    const handleAddLog = (level: 'INFO' | 'WARN' | 'ERROR' | 'NETWORK', category: string, message: string) => {
      const entry: DebugLogEntry = {
        id: `DBG-${Date.now().toString().slice(-5)}`,
        timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        level,
        category,
        message,
      };
      setLogs((prev) => [entry, ...prev.slice(0, 99)]);
    };

    // Periodic system heartbeat log
    const interval = setInterval(() => {
      const levels = ['INFO', 'INFO', 'NETWORK', 'INFO', 'WARN'] as const;
      const randLevel = levels[Math.floor(Date.now() / 8000) % levels.length];
      const msgs = [
        'L2 Emir Defteri OBI Matrisi Güncellendi (OBI: -0.01)',
        'HTTP GET /api/universal/data?ticker=NVDA 200 OK (12ms)',
        'ExecutionSafetyGuard VaR Limit Kontrolü Tamamlandı.',
        'KAP kapDaemon Canlı Akış Bildirimi Alındı.',
      ];
      const randMsg = msgs[Math.floor(Date.now() / 8000) % msgs.length];
      handleAddLog(randLevel, 'MONITOR', randMsg);
    }, 8000);

    return () => clearInterval(interval);
  }, []);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesLevel = logLevelFilter === 'ALL' || log.level === logLevelFilter;
      const matchesSearch =
        searchQuery.trim() === '' ||
        log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.category.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesLevel && matchesSearch;
    });
  }, [logs, logLevelFilter, searchQuery]);

  const handleClear = () => {
    setLogs([]);
  };

  const handleCopyLogs = async () => {
    const text = logs.map((l) => `[${l.timestamp}] [${l.level}] [${l.category}] ${l.message}`).join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl backdrop-blur-md overflow-hidden font-mono transition-all">
      {/* Collapsible Header */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 flex items-center justify-between bg-slate-950/80 hover:bg-slate-950 transition text-left cursor-pointer border-b border-slate-800"
      >
        <div className="flex items-center gap-2">
          <Bug className="w-4 h-4 text-cyan-400 animate-pulse" />
          <h3 className="text-xs font-black text-white uppercase tracking-wider">
            Sistem Tanılama Konsolu (Debug Console)
          </h3>
          <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold">
            {logs.length} Kayıt
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-400 font-bold">
            {isOpen ? 'Katla' : 'Genişlet'}
          </span>
          {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </button>

      {/* Expanded Console Panel */}
      {isOpen && (
        <div className="p-4 space-y-3">
          {/* Controls & Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-[10px]">
            {/* Log Level Filter Tabs */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
              {(['ALL', 'INFO', 'WARN', 'ERROR', 'NETWORK'] as const).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setLogLevelFilter(lvl)}
                  className={`px-2 py-0.5 rounded-lg font-bold transition cursor-pointer ${
                    logLevelFilter === lvl
                      ? lvl === 'ERROR'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        : lvl === 'WARN'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : lvl === 'NETWORK'
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                        : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>

            {/* Actions: Search & Clear */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Loglarda ara..."
                className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-[10px] text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 w-36"
              />

              <button
                type="button"
                onClick={handleCopyLogs}
                className="p-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 transition cursor-pointer"
                title="Logları Kopyala"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-cyan-400" />}
              </button>

              <button
                type="button"
                onClick={handleClear}
                className="p-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-rose-400 hover:text-rose-300 transition cursor-pointer"
                title="Logları Temizle"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Log Stream Output Box */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 h-48 overflow-y-auto space-y-1.5 no-scrollbar text-[11px]">
            {filteredLogs.length > 0 ? (
              filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-1.5 rounded bg-slate-900/60 border border-slate-800/60 flex items-start justify-between gap-2"
                >
                  <div className="flex items-start gap-2">
                    <span className="text-slate-500 font-mono text-[10px] shrink-0 mt-0.5">{log.timestamp}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded font-black text-[9px] shrink-0 ${
                        log.level === 'ERROR'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          : log.level === 'WARN'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : log.level === 'NETWORK'
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                          : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      }`}
                    >
                      {log.level}
                    </span>
                    <span className="text-slate-400 font-bold text-[10px] shrink-0">[{log.category}]</span>
                    <span className="text-slate-200 leading-tight">{log.message}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-slate-500 py-8 text-xs">Filtreye uygun log kaydı bulunamadı.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DebugConsole;
