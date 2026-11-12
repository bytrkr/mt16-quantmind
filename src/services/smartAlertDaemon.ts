// src/services/smartAlertDaemon.ts
/**
 * MT16 BistApp Kuant Terminali - Çoklu Motorlu Dinamik Akıllı Alarm Sistemi (Smart Alert Daemon)
 * Sadece fiyat seviyesine değil; Jüri Konsensüs Skoru (Score >= 80), L2 OBI Baskısı
 * ve KAP Katalizör puanı aynı anda sağlandığında otonom Telegram/Webhook ve Sistem İçi Sesli Alarm fırlatır.
 */

import { audioSyntheticDispatcher } from './audioSyntheticDispatcher';

export interface MultiEngineAlertCondition {
  symbol: string;
  juryScore: number | null;       // e.g. >= 80
  l2Obi: number | null;           // e.g. >= 0.25 or <= -0.25
  kapCatalystScore: number | null;// e.g. >= 20
  price: number | null;
  triggerWebhook?: boolean;
}

export interface AlertTriggerResult {
  triggered: boolean;
  alertId: string;
  time: string;
  reason: string;
}

class SmartAlertDaemonService {
  private alertHistory: AlertTriggerResult[] = [];
  private lastAlertTimeBySymbol: Record<string, number> = {};
  private cooldownMs: number = 30000; // 30 seconds cooldown per symbol

  public evaluateAndDispatchAlert(condition: MultiEngineAlertCondition): AlertTriggerResult {
    const { symbol, juryScore, l2Obi, kapCatalystScore, price } = condition;
    const now = Date.now();
    const lastTime = this.lastAlertTimeBySymbol[symbol] ? this.lastAlertTimeBySymbol[symbol] : 0;
    const juryScoreVal = juryScore ? juryScore : 0;

    const isJuryPassed = juryScore !== null && juryScore >= 80;
    const isObiPassed = l2Obi !== null && Math.abs(l2Obi) >= 0.25;
    const isKapPassed = kapCatalystScore !== null && kapCatalystScore >= 15;

    const allPassed = isJuryPassed && isObiPassed && isKapPassed;

    if (allPassed && now - lastTime > this.cooldownMs) {
      this.lastAlertTimeBySymbol[symbol] = now;

      const alertId = `ALT-${Date.now().toString().slice(-5)}`;
      const timeStr = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const reason = `#${symbol} Çoklu Motor Onayı: Jüri %${juryScore ?? '---'}, L2 OBI ${l2Obi !== null ? (l2Obi > 0 ? '+' : '') : ''}${l2Obi ?? '---'}, KAP Etki +${kapCatalystScore ?? '---'}`;

      // Trigger Web Speech API audio alert
      audioSyntheticDispatcher.announceCriticalAnomaly(
        symbol, 
        juryScore, 
        l2Obi, 
        reason
      );

      const result: AlertTriggerResult = {
        triggered: true,
        alertId,
        time: timeStr,
        reason,
      };

      this.alertHistory.unshift(result);
      if (this.alertHistory.length > 20) this.alertHistory.pop();

      return result;
    }

    return {
      triggered: false,
      alertId: '',
      time: new Date().toLocaleTimeString('tr-TR'),
      reason: 'Koşullar henüz tam sağlanmadı.',
    };
  }

  public getHistory(): AlertTriggerResult[] {
    return this.alertHistory;
  }

  public clearHistory(): void {
    this.alertHistory = [];
    this.lastAlertTimeBySymbol = {};
  }
}

export const smartAlertDaemon = new SmartAlertDaemonService();
export default smartAlertDaemon;
