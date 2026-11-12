/**
 * BistApp Social Publisher Engine - Formatter
 * Formats JuryDecisionPayload for Telegram (rich markdown with entity escaping) and Twitter (280 chars limit).
 */

import type { JuryDecisionPayload } from '../types/juryContract.js';

export class SocialFormatter {
  /**
   * Escapes Telegram Markdown special characters to prevent "Can't parse entities" parsing errors.
   */
  public static escapeMarkdown(text: string): string {
    if (!text) return '';
    // Escape characters: _ * [ ] ( ) ~ ` > # + - = | { } . !
    return String(text).replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
  }

  private static formatVerdict(verdict: JuryDecisionPayload['verdict']): { emoji: string; label: string } {
    switch (verdict) {
      case 'STRONG_BUY':
        return { emoji: '🚀', label: 'GÜÇLÜ AL' };
      case 'BUY':
        return { emoji: '🟢', label: 'AL' };
      case 'HOLD':
        return { emoji: '🟡', label: 'TUT / BEKLE' };
      case 'SELL':
        return { emoji: '🔴', label: 'SAT' };
      case 'STRONG_SELL':
        return { emoji: '⚠️', label: 'GÜÇLÜ SAT' };
      default:
        return { emoji: '⚪', label: 'NÖTR' };
    }
  }

  public static toTelegram(data: JuryDecisionPayload): string {
    const vInfo = this.formatVerdict(data.verdict);
    
    const confidence = data.confidenceScore;
    const entryZone = data.entryZone;
    const targetPrice = data.targetPrice;
    const stopLoss = data.stopLoss;
    const activeShields = data.activeShields || [];

    const safeTicker = this.escapeMarkdown((data.ticker || 'BIST').toUpperCase());
    const safeEntry = this.escapeMarkdown(entryZone);
    const safeTarget = this.escapeMarkdown(targetPrice);
    const safeStop = this.escapeMarkdown(stopLoss);
    const safeReasoning = this.escapeMarkdown(data.reasoning || 'Analiz tamamlandı.');

    const safeShields = activeShields && activeShields.length > 0
      ? activeShields.map(s => `🛡️ ${this.escapeMarkdown(s)}`).join('\n')
      : '🛡️ _Aktif kalkan uyarısı bulunmuyor._';

    const timestamp = data.timestamp || new Date().toISOString();

    return [
      `🤖 *BIST JÜRİ HEDGE FUND TERMINALI*`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `📊 *Hisse:* \`#${safeTicker}\``,
      `🎯 *Karar:* ${vInfo.emoji} *${vInfo.label}* (Güven: %${confidence})`,
      ``,
      `📌 *Kritik Seviyeler:*`,
      ` • *Giriş Bölgesi:* \`${safeEntry}\``,
      ` • *Hedef Fiyat:* \`${safeTarget}\``,
      ` • *Stop-Loss:* \`${safeStop}\``,
      ``,
      `🛡️ *Devredeki Kalkanlar:*`,
      safeShields,
      ``,
      `🧠 *Jüri Gerekçesi:*`,
      `_${safeReasoning}_`,
      ``,
      `⏱️ _Zaman: ${this.escapeMarkdown(timestamp)}_`,
      `#BIST100 #${safeTicker} #KuantTerminali #BistApp`
    ].join('\n');
  }

  public static toTwitter(payload: JuryDecisionPayload): string {
    const vInfo = this.formatVerdict(payload.verdict);
    const ticker = `#${(payload.ticker || 'BIST').toUpperCase()}`;
    const confidence = payload.confidenceScore;
    const entryZone = payload.entryZone;
    const targetPrice = payload.targetPrice;
    const stopLoss = payload.stopLoss;
    const activeShields = payload.activeShields || [];
    const reasoning = payload.reasoning || 'Analiz tamamlandı.';

    let text = `${ticker} ${vInfo.emoji} ${vInfo.label} (Güven: %${confidence})\n`;
    text += `Giriş: ${entryZone} | Hedef: ${targetPrice} | Stop: ${stopLoss}\n`;
    
    if (activeShields && activeShields.length > 0) {
      text += `Kalkanlar: ${activeShields.join(', ')}\n`;
    }
    
    const summary = reasoning.length > 100 
      ? reasoning.substring(0, 97) + '...' 
      : reasoning;
      
    text += `Analiz: ${summary}\n#BIST100 #BistApp`;

    if (text.length > 280) {
      text = text.substring(0, 277) + '...';
    }

    return text;
  }
}
