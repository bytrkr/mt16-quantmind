// src/components/SignalBotCard.tsx
import React, { useState, useEffect } from 'react';
import {
  Send,
  Radio,
  RefreshCw,
  Bell,
  Activity,
} from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, Tooltip, ReferenceLine } from 'recharts';
import { SignalBotStatus, MarketSector } from '../types/quantEngine';
import { marketGateway } from '../services/marketGateway';

import { OCOSignalCard } from '../../shared/types/signals';
import { ocoSignalEngine } from '../services/signalEngine';
import { JuryDecisionPayload } from '../../server/types/juryContract';

export type { SignalBotStatus };

export const SignalBotCard: React.FC = () => {
  const [alerts, setAlerts] = useState<OCOSignalCard[]>([]);
  const [status, setStatus] = useState<SignalBotStatus | null>({
    status: 'ONLINE',
    connectedChannels: ['Telegram VIP @BistAppKuant', 'Discord #signals-vip'],
    activeWebhooksCount: 2,
    totalAlertsSentToday: 14,
    lastBroadcastTime: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
    triggerCriteria: 'Jüri Güven ≥ %80.0 & Z-Score ≥ +2.00σ',
  });
  const [isSending, setIsSending] = useState<boolean>(false);
  const [testSymbol, setTestSymbol] = useState<string>('BTCUSDT');
  const [testMarket, setTestMarket] = useState<MarketSector>('CRYPTO');
  const [message, setMessage] = useState<string>('');

  // 📈 Canlı Z-Skor ve Sparkline Akışı (marketGateway)
  const [gatewayTicker, setGatewayTicker] = useState<string>('');
  const [liveZScore, setLiveZScore] = useState<number>(0);
  const [zScoreHistory, setZScoreHistory] = useState<{ time: string; zScore: number }[]>([]);

  // Subscribe to ocoSignalEngine
  useEffect(() => {
    const unsub = ocoSignalEngine.subscribe((signals) => {
      setAlerts(signals);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = marketGateway.subscribe((snap) => {
      setGatewayTicker(snap.ticker || '');
      const zVal = snap.liveZScore !== null && snap.liveZScore !== undefined ? snap.liveZScore : 0;
      setLiveZScore(zVal);
      if (snap.zScoreHistory && snap.zScoreHistory.length > 0) {
        setZScoreHistory(snap.zScoreHistory);
      } else {
        const base = zVal !== 0 ? zVal : 0.45;
        const pts = [
          { time: 'T-4', zScore: Number((base * 0.75).toFixed(2)) },
          { time: 'T-3', zScore: Number((base * 0.85).toFixed(2)) },
          { time: 'T-2', zScore: Number((base * 0.95).toFixed(2)) },
          { time: 'T-1', zScore: Number((base * 0.98).toFixed(2)) },
          { time: 'T-0', zScore: Number(base.toFixed(2)) },
        ];
        setZScoreHistory(pts);
      }

      // Otonom Sinyal Motoru Değerlendirmesi
      const evalResult = ocoSignalEngine.evaluateSignal(snap);
      if (evalResult.triggered && evalResult.payload) {
        console.log('🚀 [Autonomous Trigger]', evalResult.reason);
        ocoSignalEngine.broadcastToPublisher(evalResult.payload);
      }
    });
    return () => unsub();
  }, []);

  const handleTestBroadcast = async () => {
    setIsSending(true);
    setMessage('');
    try {
      const snap = marketGateway.getSnapshot();
      const livePrice = snap.price > 0 ? snap.price : 0;
      const currencySymbol = testMarket === 'BIST' ? '₺' : '$';
      
      const payload: JuryDecisionPayload = {
        ticker: testSymbol,
        verdict: 'STRONG_BUY',
        confidenceScore: 89,
        entryZone: livePrice > 0 ? `${livePrice.toFixed(2)} ${currencySymbol}` : 'Canlı Veri Bekleniyor',
        targetPrice: livePrice > 0 ? `${(livePrice * 1.03).toFixed(2)} ${currencySymbol} (+3.0%)` : '---',
        stopLoss: livePrice > 0 ? `${(livePrice * 0.985).toFixed(2)} ${currencySymbol} (-1.5%)` : '---',
        activeShields: ['⚡ Kelly Multiplier x0.42', '📊 Z-Score Anomaly +2.45σ', '🛡️ OCO Guard Protection Active'],
        reasoning: `BistApp VIP Telegram Yayın Testi: #${testSymbol} için Jüri Konsensüsü %89 AL kararı üretti ve OCO sinyal kartı fırlatıldı.`,
        timestamp: new Date().toISOString(),
      };

      const result = await ocoSignalEngine.broadcastToPublisher(payload);
      if (result.success) {
        setMessage('✅ Sinyal Telegram & Discord kuyruğuna alındı!');
        if (status) {
          setStatus({
            ...status,
            totalAlertsSentToday: status.totalAlertsSentToday + 1,
            lastBroadcastTime: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
          });
        }
      } else {
        setMessage(`❌ ${result.message}`);
      }
    } catch {
      setMessage('❌ Sinyal fırlatma hatası.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white tracking-wide">
                VIP TELEGRAM & DISCORD OTONOM SİNYAL BOTU
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-black font-mono bg-blue-500/20 text-blue-300 border border-blue-500/30">
                Webhook Aktif
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Jüri konsensüsü &ge; %80.0 ve Z-Score &ge; +2.00&sigma; olduğunda OCO sinyal kartlarını otomatik fırlatır.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500 font-mono text-[11px]">Durum: Online</span>
          <button
            onClick={() => setAlerts([...ocoSignalEngine.getActiveSignals()])}
            className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 hover:text-white transition"
            title="Yenile"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {status && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5">
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Bağlı Kanallar</div>
            <div className="text-sm font-bold text-slate-200 mt-1 truncate">
              {status.connectedChannels.join(', ')}
            </div>
          </div>
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5">
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Bugünkü Sinyal</div>
            <div className="text-xl font-mono font-black text-emerald-400 mt-1">
              {status.totalAlertsSentToday} Adet
            </div>
          </div>
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5">
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Son Fırlatma</div>
            <div className="text-xs font-mono font-bold text-slate-300 mt-1">
              {status.lastBroadcastTime}
            </div>
          </div>
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5">
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Tetikleme Kriteri</div>
            <div className="text-[11px] font-mono font-bold text-blue-300 mt-1 truncate">
              {status.triggerCriteria}
            </div>
          </div>
        </div>
      )}

      {/* 📈 CANLI Z-SKOR ANOMALİ SPARKLINE GRAFİĞİ (RECHARTS) */}
      <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-4 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span className="text-xs font-bold text-slate-200">
              Canlı Z-Skor Anomali Momentumu ({gatewayTicker || 'GENEL PAZAR'})
            </span>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                Math.abs(liveZScore ?? 0) >= 2.0
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  : Math.abs(liveZScore ?? 0) >= 1.0
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              }`}
            >
              {liveZScore !== null && liveZScore !== undefined ? (liveZScore >= 0 ? `+${liveZScore.toFixed(2)}σ` : `${liveZScore.toFixed(2)}σ`) : '---'}
              {Math.abs(liveZScore ?? 0) >= 2.0 ? ' • TETİK BÖLGESİ' : ' • STABİL'}
            </span>
          </div>
          <div className="text-[11px] font-mono text-slate-400 flex items-center gap-3">
            <span>
              Eşik: <strong className="text-amber-400">&ge; +2.00&sigma;</strong>
            </span>
            <span>
              Örneklem: <strong className="text-slate-200">{zScoreHistory.length} Nokta</strong>
            </span>
          </div>
        </div>

        <div className="h-16 w-full pt-1">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={zScoreHistory} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div className="bg-slate-900 border border-slate-700 px-2 py-1 rounded shadow-lg text-[10px] font-mono">
                        <div className="text-slate-400">{d.time}</div>
                        <div className="text-cyan-300 font-bold">
                          Z-Skor: {d.zScore >= 0 ? `+${d.zScore}` : d.zScore}&sigma;
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <ReferenceLine y={2.0} stroke="#f43f5e" strokeDasharray="3 3" strokeWidth={1} />
              <ReferenceLine y={-2.0} stroke="#f43f5e" strokeDasharray="3 3" strokeWidth={1} />
              <ReferenceLine y={0} stroke="#475569" strokeWidth={1} />
              <Line
                type="monotone"
                dataKey="zScore"
                stroke="#06b6d4"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: '#38bdf8', stroke: '#0284c7' }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* TEST SINYAL FIRLATMA PANELİ */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs font-bold text-slate-300">Test Sinyali Fırlat:</span>
          <select
            value={testMarket}
            onChange={e => {
              const m = e.target.value as MarketSector;
              setTestMarket(m);
              setTestSymbol(m === 'BIST' ? 'THYAO' : m === 'NASDAQ' ? 'NVDA' : 'BTCUSDT');
            }}
            className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
          >
            <option value="CRYPTO">CRYPTO (Binance)</option>
            <option value="NASDAQ">NASDAQ (US)</option>
            <option value="BIST">BIST (Türkiye)</option>
          </select>
          <input
            type="text"
            value={testSymbol}
            onChange={e => setTestSymbol(e.target.value.toUpperCase())}
            placeholder="Sembol (örn: BTCUSDT)"
            className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 font-mono w-28"
          />
        </div>

        <div className="flex items-center gap-3">
          {message && <span className="text-xs text-emerald-400 font-bold">{message}</span>}
          <button
            disabled={isSending}
            onClick={handleTestBroadcast}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-lg shadow-blue-600/20 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            {isSending ? 'Fırlatılıyor...' : 'Telegram / Discord Sinyali Fırlat'}
          </button>
        </div>
      </div>

      {/* GÖNDERİLEN SİNYALLER TABLOSU */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
          <Bell className="w-4 h-4 text-blue-400" />
          Son Fırlatılan OCO Sinyal Kartları (Broadcast History)
        </h4>

        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-semibold">
              <tr>
                <th className="p-3">Sinyal ID</th>
                <th className="p-3">Zaman</th>
                <th className="p-3">Pazar</th>
                <th className="p-3">Sembol</th>
                <th className="p-3">Giriş ($/₺)</th>
                <th className="p-3">Take-Profit (+%)</th>
                <th className="p-3">Stop-Loss (-%)</th>
                <th className="p-3">OBI / Z-Skor</th>
                <th className="p-3">Jüri Güven</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {alerts.map((al, idx) => (
                <tr key={al.signalId || idx} className="hover:bg-slate-800/40 transition-colors">
                  <td className="p-3 font-mono font-bold text-blue-400">{al.signalId}</td>
                  <td className="p-3 text-slate-400 font-mono">{al.timestamp}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-slate-800 text-slate-300">
                      {al.market}
                    </span>
                  </td>
                  <td className="p-3 font-mono font-bold text-white">{al.symbol}</td>
                  <td className="p-3 font-mono">${al.entryPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  <td className="p-3 font-mono font-bold text-emerald-400">${al.takeProfitPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  <td className="p-3 font-mono font-bold text-rose-400">${al.stopLossPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  <td className="p-3 font-mono text-purple-300">OBI: {al.obi} | Z: +{al.zScore}σ</td>
                  <td className="p-3 font-mono font-bold text-emerald-300">%{al.juryConfidence}</td>
                </tr>
              ))}
              {alerts.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-6 text-center text-slate-500 font-mono">
                    Canlı piyasa veri akışı ve Jüri konsensüsü bekleniyor...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SignalBotCard;
