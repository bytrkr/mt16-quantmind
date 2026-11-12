// src/services/signalEngine.ts
/**
 * MT16 BistApp Kuant Terminali - Otonom OCO Sinyal Üretim Motoru (Signal Engine)
 * shared/types/signals.ts, shared/types/risk.ts ve shared/types/oco.ts tiplerini entegre eder.
 * Jüri Güven Skoru >= %80 ve Z-Skor Anomali |Z| >= 2.0σ çakıştığında OCO Sinyal Kartı fırlatır.
 */

import { OCOSignalCard, SignalVerdict, ConfidenceScore } from '../../shared/types/signals';
import { PositionRiskConfig, KellyMultiplier } from '../../shared/types/risk';
import { OCOOrderRule, StopLossConfig, TakeProfitConfig } from '../../shared/types/oco';
import { JuryConsensusSummary } from '../../shared/types/jury';
import { JuryDecisionPayload } from '../../server/types/juryContract';
import { marketGateway, MarketGatewaySnapshot } from './marketGateway';
import { calculateJuryConsensus } from './juryEngine';

import { inferMarketType } from './universalApi';
import { MarketType } from '../../shared/types/market';
import { ALL_BIST_STOCKS } from '../data/bistAllStocks';

export interface SignalEvaluationResult {
  triggered: boolean;
  reason: string;
  signalCard?: OCOSignalCard;
  payload?: JuryDecisionPayload;
  orderRule?: OCOOrderRule;
  kellyFraction: number | null;
  riskRewardRatio: number | null;
}

export interface RiskRewardDetails {
  riskRewardRatio: number | null;
  stopLossPct: number | null;
  takeProfitPct: number | null;
  entryPrice: number | null;
  takeProfitPrice: number | null;
  stopLossPrice: number | null;
  kellyFraction: number | null;
}

class OCOSignalEngine {
  private activeSignals: OCOSignalCard[] = [];
  private listeners: ((signals: OCOSignalCard[]) => void)[] = [];
  private lastTriggerTimeBySymbol: Record<string, number> = {};
  private triggerCooldownMs: number = 10000; // 10 saniye cooldown per symbol

  // Varsayılan Risk Konfigürasyonu
  private riskConfig: PositionRiskConfig = {
    maxPositionSizePct: 10,
    maxPortfolioDrawdownPct: 5,
    kellyMultiplier: 0.25, // 0.25x Güvenli Kelly (Quarter Kelly)
    maxSlippageBps: 15,
    correlationLimit: 0.7,
  };

  constructor() {
    // Anayasa gereği başlangıçta sahte sinyal kartları bulunmamalıdır.
    this.activeSignals = [];
  }

  /**
   * Kelly Kriteri Hesabı: f* = (p * b - q) / b
   * p: Kazanma Olasılığı (Jüri Güvencesi % / 100)
   * b: Kar/Zarar Oranı (TakeProfit / StopLoss Oranı, varsayılan 2.0)
   */
  public calculateKellyFraction(winProbability: number | null, payoffRatio: number = 2.0): number | null {
    if (winProbability === null) return null;
    const p = Math.max(0.01, Math.min(0.99, winProbability));
    const q = 1 - p;
    const rawKelly = (p * payoffRatio - q) / payoffRatio;
    // Güvenlik için Kelly Çarpanı ile ölçeklendir ve 0.05..0.50 arasında sınırla
    const adjustedKelly = rawKelly * this.riskConfig.kellyMultiplier;
    return Number(Math.max(0.05, Math.min(0.50, adjustedKelly)).toFixed(3));
  }

  /**
   * Dinamik Risk / Ödül (Risk-to-Reward R:R) Oranı Hesabı
   */
  public calculateRiskRewardDetails(
    snapshot?: MarketGatewaySnapshot,
    jurySummary?: JuryConsensusSummary
  ): RiskRewardDetails {
    const snap = snapshot || marketGateway.getSnapshot();
    const jury = jurySummary || calculateJuryConsensus({ snapshot: snap });
    const confidence = jury.overallScore;
    const market = inferMarketType(snap.ticker) as MarketType;

    let stopLossPct = 1.0;
    let takeProfitPct = 2.0;
    if (market === 'NASDAQ') {
      stopLossPct = 1.5;
      takeProfitPct = 3.0;
    } else if (market === 'CRYPTO') {
      stopLossPct = 2.5;
      takeProfitPct = 5.0;
    }

    if (!snap.price || snap.price <= 0) {
      return {
        riskRewardRatio: null,
        stopLossPct,
        takeProfitPct,
        entryPrice: null,
        stopLossPrice: null,
        takeProfitPrice: null,
        kellyFraction: null,
      };
    }

    const entryPrice = snap.price;
    const winProb = confidence !== null ? Math.max(0.50, confidence / 100) : null;
    const kellyFraction = this.calculateKellyFraction(winProb, takeProfitPct / stopLossPct);

    // BIST ve Spot hisse işlemlerinde (Long):
    const stopLossPrice = entryPrice * (1 - Math.abs(stopLossPct) / 100);
    const takeProfitPrice = entryPrice * (1 + Math.abs(takeProfitPct) / 100);

    const riskRewardRatio = Number((takeProfitPct / stopLossPct).toFixed(2));

    return {
      riskRewardRatio,
      stopLossPct,
      takeProfitPct,
      entryPrice: Number(entryPrice.toFixed(2)),
      takeProfitPrice: Number(takeProfitPrice.toFixed(2)),
      stopLossPrice: Number(stopLossPrice.toFixed(2)),
      kellyFraction,
    };
  }

  /**
   * Canlı Piyasa ve Jüri Kararını Değerlendirir
   */
  public evaluateSignal(
    snapshot: MarketGatewaySnapshot,
    jurySummary?: JuryConsensusSummary
  ): SignalEvaluationResult {
    const jury = jurySummary || calculateJuryConsensus({ snapshot });
    const zScore = snapshot.liveZScore;
    const absZ = zScore !== null ? Math.abs(zScore) : null;
    const confidence = jury.overallScore;

    const rrDetails = this.calculateRiskRewardDetails(snapshot, jury);

    // Tetikleme Kriteri: Jüri Güven Skoru >= %80.0 VE |Z-Skor| >= 2.0σ
    const isConfidenceMet = confidence !== null && confidence >= 80;
    const isZScoreMet = absZ !== null && absZ >= 2.0;

    if (!isConfidenceMet || !isZScoreMet) {
      return {
        triggered: false,
        reason: `Kriter karşılanmadı. Jüri: %${confidence ?? '---'} (Eşik %80), Z-Skor: ${zScore !== null ? `${zScore.toFixed(2)}σ` : '---'} (Eşik |Z| >= 2.0σ)`,
        kellyFraction: rrDetails.kellyFraction,
        riskRewardRatio: rrDetails.riskRewardRatio,
      };
    }

    // Cooldown Kontrolü
    const now = Date.now();
    const lastTrigger = this.lastTriggerTimeBySymbol[snapshot.ticker] ? this.lastTriggerTimeBySymbol[snapshot.ticker] : 0;
    if (now - lastTrigger < this.triggerCooldownMs) {
      return {
        triggered: false,
        reason: `${snapshot.ticker} için cooldown aktif (${Math.ceil((this.triggerCooldownMs - (now - lastTrigger)) / 1000)}s kaldı)`,
        kellyFraction: rrDetails.kellyFraction,
        riskRewardRatio: rrDetails.riskRewardRatio,
      };
    }

    this.lastTriggerTimeBySymbol[snapshot.ticker] = now;

    // Yön ve Fiyat Hesaplamaları
    const side: 'BUY' | 'SELL' = (zScore !== null && zScore >= 0) ? 'BUY' : 'SELL';
    const verdict: SignalVerdict = (confidence !== null && confidence >= 88) ? (side === 'BUY' ? 'STRONG_BUY' : 'STRONG_SELL') : (side === 'BUY' ? 'BUY' : 'SELL');
    const entryPrice = rrDetails.entryPrice;
    const takeProfitPrice = rrDetails.takeProfitPrice;
    const stopLossPrice = rrDetails.stopLossPrice;

    const signalId = `SIG-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const timestamp = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    const market = inferMarketType(snapshot.ticker) as MarketType;

    const signalCard: OCOSignalCard = {
      signalId,
      timestamp,
      market,
      symbol: snapshot.ticker,
      side,
      verdict,
      entryPrice,
      takeProfitPrice,
      stopLossPrice,
      obi: snapshot.liveObi !== null ? Number(snapshot.liveObi.toFixed(2)) : null,
      zScore: zScore !== null ? Number(zScore.toFixed(2)) : null,
      juryConfidence: confidence,
      status: 'ACTIVE',
    };

    // Telegram / Discord Publisher Payload (JuryContract)
    const payload: JuryDecisionPayload = {
      ticker: snapshot.ticker,
      verdict: verdict === 'STRONG_BUY' ? 'STRONG_BUY' : verdict === 'BUY' ? 'BUY' : verdict === 'STRONG_SELL' ? 'STRONG_SELL' : 'SELL',
      confidenceScore: confidence,
      entryZone: `${entryPrice !== null ? entryPrice.toFixed(2) : '---'} ${market === 'BIST' ? '₺' : '$'}`,
      targetPrice: `${takeProfitPrice !== null ? takeProfitPrice.toFixed(2) : '---'} ${market === 'BIST' ? '₺' : '$'} (+${rrDetails.takeProfitPct !== null ? rrDetails.takeProfitPct.toFixed(1) : '---'}%)`,
      stopLoss: `${stopLossPrice !== null ? stopLossPrice.toFixed(2) : '---'} ${market === 'BIST' ? '₺' : '$'} (-${rrDetails.stopLossPct !== null ? rrDetails.stopLossPct.toFixed(1) : '---'}%)`,
      activeShields: [
        `⚡ Kelly Criterion Mult: x${rrDetails.kellyFraction ?? '---'}`,
        `🎯 Risk/Reward Ratio: 1:${rrDetails.riskRewardRatio ?? '---'}`,
        `📊 Z-Score Anomaly: ${zScore !== null ? (zScore >= 0 ? '+' : '') : ''}${zScore !== null ? zScore.toFixed(2) : '---'}σ`,
        `🛡️ OCO Guard Protection Active`,
      ],
      reasoning: `Otonom Jüri Sinyal Tetikleyici: %${confidence ?? '---'} Jüri Güveni, 1:${rrDetails.riskRewardRatio ?? '---'} Risk/Ödül oranı ve ${zScore !== null ? (zScore >= 0 ? '+' : '') : ''}${zScore !== null ? zScore.toFixed(2) : '---'}σ Z-Skor Anomali çakışması tespit edildi. Dynamic OCO fırlatıldı.`,
      timestamp: new Date().toISOString(),
    };

    // OCO Order Rule Tip Tanımı
    const stopLossConfig: StopLossConfig = {
      price: stopLossPrice,
      distancePct: rrDetails.stopLossPct,
      trailingStop: true,
      trailingDistancePct: 0.5,
    };

    const takeProfitConfig: TakeProfitConfig = {
      price: takeProfitPrice,
      distancePct: rrDetails.takeProfitPct,
      partialExitPct: 50,
    };

    const orderRule: OCOOrderRule = {
      orderId: `OCO-${signalId}`,
      symbol: snapshot.ticker,
      market,
      side,
      quantity: rrDetails.kellyFraction !== null ? Math.floor(1000 * rrDetails.kellyFraction) : null,
      triggerPrice: entryPrice,
      stopLoss: stopLossConfig,
      takeProfit: takeProfitConfig,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    };

    // Aktif Listeye Ekle ve Yayınla
    this.activeSignals = [signalCard, ...this.activeSignals.slice(0, 19)];
    this.notifyListeners();

    return {
      triggered: true,
      reason: `🚀 OTONOM SİNYAL TETİKLENDİ: ${snapshot.ticker} (${side}) - Jüri: %${confidence ?? '---'}, R:R 1:${rrDetails.riskRewardRatio ?? '---'}, Z: ${zScore !== null ? zScore.toFixed(2) : '---'}σ`,
      signalCard,
      payload,
      orderRule,
      kellyFraction: rrDetails.kellyFraction,
      riskRewardRatio: rrDetails.riskRewardRatio,
    };
  }


  /**
   * Üretilen Sinyali Sunucu Telegram/Discord Publisher Webhook'una Gönderir
   */
  public async broadcastToPublisher(payload: JuryDecisionPayload): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch('/api/v1/publisher/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        return {
          success: false,
          message: errJson.error || errJson.message || `HTTP ${response.status} Yayın hatası`,
        };
      }

      const resData = await response.json();
      return {
        success: true,
        message: resData.message || 'Sinyal başarıyla yayın kuyruğuna alındı.',
      };
    } catch (error: any) {
      console.error('❌ [SignalEngine] Broadcast hatası:', error);
      return {
        success: false,
        message: error.message || 'Ağ bağlantı hatası oluştu.',
      };
    }
  }

  public getActiveSignals(): OCOSignalCard[] {
    return this.activeSignals;
  }

  public clearHistory(): void {
    this.activeSignals = [];
    this.lastTriggerTimeBySymbol = {};
    this.notifyListeners();
  }

  public subscribe(fn: (signals: OCOSignalCard[]) => void): () => void {
    this.listeners.push(fn);
    fn(this.activeSignals);
    return () => {
      this.listeners = this.listeners.filter(l => l !== fn);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(fn => fn(this.activeSignals));
  }
}

export const ocoSignalEngine = new OCOSignalEngine();
