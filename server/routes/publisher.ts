/**
 * MT16 QuantMind Social Publisher Engine - Express Gateway Route (/api/v1/publisher/broadcast)
 * Receives jury decisions from Python AI Kernel and dispatches to social publishing queue.
 */

import { Router, Request, Response } from 'express';
import { MT16QuantMindPublisherEngine } from '../publisher/index.js';
import type { PublisherBroadcastRequest, PublisherBroadcastResponse } from '../types/juryContract.js';

const router = Router();

router.post('/broadcast', async (req: Request<{}, {}, PublisherBroadcastRequest>, res: Response<PublisherBroadcastResponse>) => {
  try {
    const { ticker, verdict } = req.body || {};

    // 1. Validate payload requirements
    if (!ticker || !verdict) {
      return res.status(400).json({
        success: false,
        message: 'Eksik parametre: "ticker" ve "verdict" alanları zorunludur.',
        error: 'Eksik parametre: "ticker" ve "verdict" alanları zorunludur.',
      });
    }

    // 2. Pass to MT16QuantMindPublisherEngine webhook handler
    const result = MT16QuantMindPublisherEngine.handleWebhook(req.body);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: result.message,
        error: result.message,
      });
    }

    // 3. Return success response
    return res.status(200).json({
      success: true,
      status: 'queued',
      ticker: String(ticker).toUpperCase(),
      message: result.message,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('❌ [PublisherRoute] /broadcast hata:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Sunucu içi hata oluştu.',
      error: error.message || 'Sunucu içi hata oluştu.',
    });
  }
});

export default router;
