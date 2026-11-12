// src/services/quantPipelineEnforcer.ts
/**
 * MT16 Servisler Arası Füzyon ve Veri Toplayıcı Orkestrasyon Servisi (QuantPipelineEnforcer)
 * Tüm kuant servislerini (viopService, brokerFlowService, orderBookAnalytics, portfolioGuard, triggerEngine, executionSafetyGuard, anomalies)
 * bir araya getirerek ham veriyi kurumsal metriklerle zenginleştirilmiş tek bir veri paketine dönüştürür.
 */

import { ViopService } from './viopService';
import { BrokerFlowService, BrokerFlowData } from './brokerFlowService';
import { OrderBookAnalytics, OrderBookMetrics } from './orderBookAnalytics';
import { PortfolioGuard, RiskParameters } from './portfolioGuard';
import { TriggerEngine } from './triggerEngine';
import { ExecutionSafetyGuard, SafetyStatus } from './executionSafetyGuard';
import { 
  CalendarAnomalyService, 
  CalendarAnomalyResult 
} from './anomalies/calendarAnomalyService';
import { 
  MeanReversionEngine, 
  MeanReversionResult 
} from './anomalies/meanReversionEngine';
import {
  MicrostructureAnomalyService,
  MicrostructureAnomalyResult,
} from './anomalies/microstructureAnomaly';
import {
  ValueQualityAnomalyService,
  ValueQualityAnomalyResult,
} from './anomalies/valueQualityAnomaly';
import {
  BehavioralHerdingEngine,
  BehavioralHerdingResult,
} from './anomalies/behavioralHerdingEngine';
import {
  AnomalyAggregator,
  CompositeAnomalyResult,
} from './anomalies/anomalyAggregator';
import {
  QuantMarketType,
  MarketLimitDynamics,
  calculateMarketLimitDynamics,
} from '../types/market';

export interface RawMarketSnapshot {
  symbol: string;
  market?: QuantMarketType;
  spotPrice: number | null;
  viopPrice: number | null;
  zScore: number | null;
  sma20: number | null;
  stdDev: number | null;
  timestamp?: number;
  currentDecision: 'AL' | 'GÜÇLÜ AL' | 'SAT' | 'BEKLE' | string;
  orderBook: OrderBookMetrics;
  brokerFlow: BrokerFlowData;
  riskParams: RiskParameters;
  latencyMs: number | null;
  currentDrawdownPct: number | null;
  // Ek Opsiyonel Kurumsal Metrikler
  priceChangePct?: number | null;
  hasKapDisclosureLast24h?: boolean;
  piotroskiScore?: number | null;
  beneishMScore?: number | null;
  peRatio?: number | null;
  pbRatio?: number | null;
  roePct?: number | null;
  socialHypeScore?: number | null;
  retailOrderRatioPct?: number | null;
}

export interface EnrichedQuantPayload {
  symbol: string;
  market: QuantMarketType;
  price: number | null;
  market_dynamics: MarketLimitDynamics;
  viop_basis: string;
  order_cancel_rate: string;
  top3_broker_flow: string;
  trigger_condition: string;
  max_portfolio_allocation: string;
  stop_loss_pct: number | null;
  take_profit_pct: number | null;
  is_safe_to_trade: boolean;
  safety_reason?: string;
  calendar_anomaly: CalendarAnomalyResult;
  mean_reversion: MeanReversionResult;
  microstructure_anomaly: MicrostructureAnomalyResult;
  value_quality_anomaly: ValueQualityAnomalyResult;
  behavioral_herding: BehavioralHerdingResult;
  composite_anomaly: CompositeAnomalyResult;
  raw_metrics: {
    obi: number | null;
    wallMeltTimeMin: number | null;
    isSpoofingRisk: boolean;
  };
  safety?: SafetyStatus;
}

export class QuantPipelineEnforcer {
  /**
   * Ham piyasa verilerini kuant servislerinden geçirerek zenginleştirilmiş veri paketine dönüştürür.
   * Acil durum güvenlik zırhını (Kill-Switch) ve 5'li anomali motorunu denetler.
   */
  public static processSnapshot(snapshot: RawMarketSnapshot): EnrichedQuantPayload | null {
    if (!snapshot) {
      return null;
    }

    try {
      const book = snapshot.orderBook ?? (snapshot as any);
      const spotPrice = snapshot.spotPrice ?? (book as any)?.price ?? (book as any)?.lastPrice;
      if (typeof spotPrice !== 'number' || isNaN(spotPrice) || spotPrice <= 0) {
        // Yahoo null ise burada dur, analiz yapma
        return null;
      }

      // 1. Kill-Switch & Güvenlik Denetimi
      const safety = ExecutionSafetyGuard.checkSafety(
        snapshot.latencyMs,
        snapshot.currentDrawdownPct
      );

      // 2. VİOP Makası Hesaplama
      const viopResult = ViopService.calculateBasis(spotPrice, snapshot.viopPrice);

      // 3. L2 Derinlik ve Emir İptal Analizi
      const bookWithPrice = book ? { ...book, price: (book as any)?.price ?? spotPrice } : { price: spotPrice };
      const bookResult = OrderBookAnalytics.analyzeBook(bookWithPrice);
      if (!bookResult) {
        return null;
      }

      // 4. Aracı Kurum Net Akış Analizi
      const flowResult = BrokerFlowService.analyzeFlow(snapshot.brokerFlow);

      // 5. Portföy Risk & Kelly Dağılımı
      const riskResult = PortfolioGuard.calculateAllocation(snapshot.riskParams, spotPrice);

      // 6. Tetikleyici Eşik Şartı
      const effectiveObi = snapshot.orderBook?.obi !== undefined && snapshot.orderBook?.obi !== null ? snapshot.orderBook.obi : bookResult.obi;
      const triggerResult = TriggerEngine.evaluateTrigger({
        zScore: snapshot.zScore,
        obi: effectiveObi,
        currentDecision: snapshot.currentDecision,
        currentPrice: spotPrice,
      });

      // 7. Anomali Motoru 1: Takvim / Zaman Anomalisi
      const calendarAnomaly = CalendarAnomalyService.analyze(snapshot.timestamp);

      // 8. Anomali Motoru 2: İstatistiksel Sapma & Ortalamaya Dönüş Analizi
      const meanReversion = MeanReversionEngine.calculate({
        currentPrice: spotPrice,
        sma20: snapshot.sma20,
        stdDev: snapshot.stdDev,
      });

      // 9. Anomali Motoru 3: L2 Mikroyapı, Spoofing & Iceberg Analizi
      const microstructureAnomaly = MicrostructureAnomalyService.analyze({
        bidDepthTotal: snapshot.orderBook?.bidDepthTotal ?? null,
        askDepthTotal: snapshot.orderBook?.askDepthTotal ?? null,
        obi: effectiveObi,
        orderCancelRatePct: bookResult.orderCancelRatePct,
        wallLot: snapshot.orderBook?.wallLot ?? null,
        wallPrice: snapshot.orderBook?.wallPrice || spotPrice,
        currentPrice: spotPrice,
      });

      // 10. Anomali Motoru 4: Değer & Finansal Kalite (Piotroski & Beneish) Analizi
      const valueQualityAnomaly = ValueQualityAnomalyService.analyze({
        piotroskiScore: snapshot.piotroskiScore ?? null,
        beneishMScore: snapshot.beneishMScore ?? null,
        peRatio: snapshot.peRatio ?? null,
        pbRatio: snapshot.pbRatio ?? null,
        roePct: snapshot.roePct ?? null,
      });

      // 11. Anomali Motoru 5: Davranışsal Finans, Hacim Şoku & Sürü/FOMO Analizi
      const behavioralHerding = BehavioralHerdingEngine.analyze({
        volumeZScore: snapshot.zScore,
        priceChangePct: snapshot.priceChangePct ?? null,
        hasKapDisclosureLast24h: snapshot.hasKapDisclosureLast24h ?? null,
        socialHypeScore: snapshot.socialHypeScore ?? null,
        retailOrderRatioPct: snapshot.retailOrderRatioPct ?? null,
      });

      // 12. Bileşik Anomali Toplayıcı (AnomalyAggregator) Füzyonu
      const compositeAnomaly = AnomalyAggregator.aggregate({
        calendar: calendarAnomaly,
        meanReversion,
        microstructure: microstructureAnomaly,
        valueQuality: valueQualityAnomaly,
        behavioralHerding,
      });

      // 13. Çoklu Piyasa & Limit Dinamikleri Adaptörü
      const market: QuantMarketType = snapshot.market || 'BIST';
      const marketDynamics = calculateMarketLimitDynamics(
        market,
        spotPrice,
        snapshot.priceChangePct ?? null
      );

      return {
        symbol: snapshot.symbol,
        market,
        price: spotPrice,
        market_dynamics: marketDynamics,
        viop_basis: viopResult.formattedBasis,
        order_cancel_rate: `%${bookResult.orderCancelRatePct}`,
        top3_broker_flow: flowResult.formattedFlow,
        trigger_condition: triggerResult.triggerConditionText,
        max_portfolio_allocation: `%${riskResult.maxPortfolioAllocationPct}`,
        stop_loss_pct: riskResult.stopLossPct,
        take_profit_pct: riskResult.takeProfitPct,
        is_safe_to_trade: safety.isSafeToTrade,
        safety_reason: safety.reason,
        calendar_anomaly: calendarAnomaly,
        mean_reversion: meanReversion,
        microstructure_anomaly: microstructureAnomaly,
        value_quality_anomaly: valueQualityAnomaly,
        behavioral_herding: behavioralHerding,
        composite_anomaly: compositeAnomaly,
        raw_metrics: {
          obi: bookResult.obi,
          wallMeltTimeMin: bookResult.wallMeltTimeMin,
          isSpoofingRisk: bookResult.isSpoofingRisk,
        },
        safety,
      };
    } catch (e: any) {
      console.warn('[QuantPipeline] VERİ YOK:', e?.message);
      return null;
    }
  }
}
