/**
 * MT16 QuantMind Social Publisher Engine - Main Orchestrator
 * Receives JuryDecisionPayload from Python AI Kernel, formats and publishes to channels.
 */

import { SocialFormatter } from './formatter.js';
import type { JuryDecisionPayload, PublisherBroadcastResponse } from '../types/juryContract.js';
import { TelegramDriver } from './drivers/telegram.js';
import { globalPublisherQueue } from './queue.js';

export class MT16QuantMindPublisherEngine {
  /**
   * Receives incoming decision from Python AI Kernel and dispatches to social channels
   */
  public static publishDecision(payload: JuryDecisionPayload): void {
    if (!payload || !payload.ticker || !payload.verdict) {
      console.warn('⚠️ [MT16 QuantMindPublisherEngine] Geçersiz veya eksik JuryDecisionPayload alındı.');
      return;
    }

    console.log(`📢 [MT16 QuantMindPublisherEngine] Karar alındı ve yayın kuyruğuna alınıyor: #${payload.ticker.toUpperCase()} (${payload.verdict})`);

    // 1. Telegram Yayını
    const telegramText = SocialFormatter.toTelegram(payload);
    globalPublisherQueue.enqueue('Telegram', async () => {
      return await TelegramDriver.sendMessage(telegramText, 'Markdown');
    });

    // 2. Twitter / X Yayını (Opsiyonel / İleride eklenecek driver için loglama/hazırlık)
    const twitterText = SocialFormatter.toTwitter(payload);
    console.log(`🐦 [MT16 QuantMindPublisherEngine] Twitter formatı hazır (${twitterText.length} karakter):\n${twitterText}`);
  }

  /**
   * Express API route handler for webhook / push from Python backend
   */
  public static handleWebhook(reqBody: any): PublisherBroadcastResponse {
    try {
      const payload: JuryDecisionPayload = {
        ticker: String(reqBody.ticker || 'BIST').toUpperCase(),
        verdict: reqBody.verdict || 'HOLD',
        confidenceScore: Number(reqBody.confidenceScore ?? reqBody.confidence_score ?? reqBody.confidence ?? 50),
        entryZone: reqBody.entryZone || reqBody.entry_zone || 'Belirtilmedi',
        targetPrice: reqBody.targetPrice || reqBody.target_price || 'Belirtilmedi',
        stopLoss: reqBody.stopLoss || reqBody.stop_loss || 'Belirtilmedi',
        activeShields: reqBody.activeShields || reqBody.active_shields || reqBody.shields || [],
        reasoning: reqBody.reasoning || reqBody.summary || 'Jüri değerlendirmesi tamamlandı.',
        timestamp: reqBody.timestamp || new Date().toISOString(),
      };

      MT16QuantMindPublisherEngine.publishDecision(payload);

      return {
        success: true,
        message: `Hisse #${payload.ticker.toUpperCase()} için sosyal medya yayın görevi kuyruğa eklendi.`,
      };
    } catch (error: any) {
      console.error('❌ [MT16QuantMindPublisherEngine] Webhook işleme hatası:', error);
      return {
        success: false,
        message: error.message || 'Bilinmeyen hata',
      };
    }
  }
}
