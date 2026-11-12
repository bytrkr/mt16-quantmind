// server/routes/execution.ts
/**
 * MT16 QuantMind - Güvenli Emir Yürütme ve İcra API Uç Noktaları
 * 
 * - BECERİ 1: RBAC (Role-Based Access Control)
 * - BECERİ 2: Endpoint Koruması - requireRole(['admin', 'developer'])
 * - BECERİ 3: DataRuleEngine & PermissionGuard Katmanlı Doğrulama
 *   Yetki onaylansa dahi, Kök Veri Kuralları veya Risk Yönetimi VETO derse emir iletilmez.
 */

import { Router, Request, Response } from 'express';
import { requireRole } from '../middleware/auth.middleware.js';
import { DataRuleEngine, type MarketData } from '../services/dataRuleEngine.js';
import { simulatedExchange, PermissionGuard, type ExchangeName } from '../services/simulator.js';

const router = Router();

/**
 * POST /api/execution/place_order
 * Sadece 'admin' ve 'developer' rollerine açık korumalı emir yürütme uç noktası.
 */
router.post('/place_order', requireRole(['admin', 'developer']), async (req: Request, res: Response) => {
  try {
    const {
      symbol = 'ASELS',
      side = 'BUY',
      price,
      lots = 100,
      stopLoss,
      takeProfit,
      leverage = 1,
      exchange = 'BINANCE',
      marketData = {},
      riskVerdict,
      managerConfidence,
      isPitViolated
    } = req.body || {};

    const cleanSymbol = String(symbol).toUpperCase().trim();
    const currentPrice = Number(price || marketData.currentPrice || 100.0);
    const stopLossPrice = Number(stopLoss || currentPrice * 0.975);
    const takeProfitPrice = Number(takeProfit || currentPrice * 1.05);

    // =========================================================================
    // BECERİ 3: 1. AŞAMA - DataRuleEngine Ön Filtre Kontrolü (Pre-Filter Gatekeeper)
    // =========================================================================
    const marketPayload: MarketData = {
      symbol: cleanSymbol,
      ticker: cleanSymbol,
      currentPrice,
      stopLossPrice,
      isStopLossBreached: currentPrice <= stopLossPrice || Boolean(marketData.isStopLossBreached),
      dayChangePct: Number(marketData.dayChangePct ?? 0),
      zScore: Number(marketData.zScore ?? 0),
      obi: Number(marketData.obi ?? 0.15),
      cmf20: Number(marketData.cmf20 ?? 0.12),
      obvSlope: Number(marketData.obvSlope ?? 0.08),
      spoofingRisk: Number(marketData.spoofingRisk ?? 0),
      orderCancelRatePct: Number(marketData.orderCancelRatePct ?? 0),
      fakeWallDetected: Boolean(marketData.fakeWallDetected),
      beneishMScore: Number(marketData.beneishMScore ?? -2.85),
      bofaNetLot: Number(marketData.bofaNetLot ?? 0),
      kapSentimentScore: Number(marketData.kapSentimentScore ?? 80),
      orderBook: marketData.orderBook || {
        wallLot: 35000,
        wallPrice: takeProfitPrice,
        meltTimeMin: 15,
        burnRatePerMin: 1200
      }
    };

    const preFilterResult = DataRuleEngine.applyRules(marketPayload);

    // Kök Veri Kuralları VETO kontrolü
    if (!preFilterResult.read || preFilterResult.priority === 'CRITICAL' || preFilterResult.finalVerdict === 'STOP_EXECUTED') {
      return res.status(422).json({
        success: false,
        preFiltered: true,
        priority: preFilterResult.priority,
        finalVerdict: preFilterResult.finalVerdict,
        ruleTriggered: preFilterResult.ruleTriggered,
        error: `[DataRuleEngine Ön Filtre Engeli]: ${preFilterResult.reason}`,
        reason: preFilterResult.reason,
        timestamp: preFilterResult.timestamp,
        operator: req.user?.email || req.user?.sub || 'AuthorizedUser'
      });
    }

    // =========================================================================
    // BECERİ 3: 2. AŞAMA - PermissionGuard ve Risk Yönetimi Güvenlik Zırhı
    // =========================================================================
    const executionResult = simulatedExchange.executeOrder({
      symbol: cleanSymbol,
      side: side === 'SELL' ? 'SELL' : 'BUY',
      price: currentPrice,
      lots: Number(lots) || 10,
      leverage: Number(leverage) || 1,
      stopLoss: stopLossPrice,
      takeProfit: preFilterResult.adjustedTakeProfit || takeProfitPrice,
      exchange: exchange as ExchangeName,
      isBullTrapRisk: preFilterResult.ruleTriggered === 'BULL_TRAP_GUARD',
      isPitViolated: Boolean(isPitViolated),
      riskVerdict: riskVerdict || (preFilterResult.read ? 'APPROVE' : 'VETO'),
      managerConfidence: managerConfidence !== undefined ? Number(managerConfidence) : 85.0
    });

    if (!executionResult.success) {
      return res.status(400).json({
        success: false,
        permissionDenied: executionResult.message.includes('Permission Denied'),
        error: executionResult.message,
        operator: req.user?.email || req.user?.sub || 'AuthorizedUser'
      });
    }

    // Başarılı Emir İcrası
    return res.status(200).json({
      success: true,
      message: executionResult.message,
      details: {
        symbol: cleanSymbol,
        side,
        price: currentPrice,
        lots,
        stopLoss: stopLossPrice,
        takeProfit: preFilterResult.adjustedTakeProfit || takeProfitPrice,
        exchange,
        wallTrapAdjusted: Boolean(preFilterResult.wallTrapDetected)
      },
      operator: {
        userId: req.user?.userId || req.user?.sub,
        email: req.user?.email,
        role: req.user?.role
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error?.message || 'Emir yürütme sırasında beklenmeyen bir hata oluştu.'
    });
  }
});

// Alias: /api/execution/order
router.post('/order', requireRole(['admin', 'developer']), (req: Request, res: Response) => {
  return (router as any).handle({ ...req, url: '/place_order' }, res);
});

// GET /api/execution/audit-trail
router.get('/audit-trail', requireRole(['admin', 'developer']), (_req: Request, res: Response) => {
  res.json({
    success: true,
    auditTrail: PermissionGuard.getAuditTrail()
  });
});

export default router;
