// src/services/notificationDaemon.ts
/**
 * MT16 Anlık Bildirim Servisi (NotificationDaemon)
 * CalendarAnomaly ve MeanReversion verilerini denetleyerek
 * 'EXTREME_EXPANSION', 'OpeningSpike', 'ClosingSpike' veya 'WeekendRisk'
 * durumlarında kritik Telegram/Discord bildirimleri fırlatır.
 */

import { CalendarAnomalyResult } from './anomalies/calendarAnomalyService';
import { MeanReversionResult } from './anomalies/meanReversionEngine';
import { MicrostructureAnomalyResult } from './anomalies/microstructureAnomaly';
import { ValueQualityAnomalyResult } from './anomalies/valueQualityAnomaly';
import { BehavioralHerdingResult } from './anomalies/behavioralHerdingEngine';
import { CompositeAnomalyResult } from './anomalies/anomalyAggregator';

export interface AlertMessage {
  id: string;
  title: string;
  symbol: string;
  message: string;
  level: 'INFO' | 'WARNING' | 'CRITICAL';
  channels: string[];
  timestamp: number;
  metadata?: {
    regime?: string;
    zScore?: number;
    reversionProbabilityPct?: number;
    calendarAnomaly?: string;
    price?: number;
    oco?: {
      stopLoss?: number;
      takeProfit?: number;
    };
  };
}

export type AlertListener = (alert: AlertMessage) => void;

export class NotificationDaemon {
  private static alertHistory: AlertMessage[] = [];

  private static listeners: Set<AlertListener> = new Set();
  private static lastTriggeredTimestamps: Map<string, number> = new Map();

  /**
   * Bildirim dinleyicisi ekler (UI güncellemeleri için)
   */
  public static subscribe(listener: AlertListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Doğrudan alarm mesajı iletir ve kanallara fırlatır
   */
  public static async sendAlert(alert: Partial<AlertMessage> & { title: string; symbol: string; message: string; level: 'INFO' | 'WARNING' | 'CRITICAL' }): Promise<boolean> {
    const fullAlert: AlertMessage = {
      id: alert.id || `ALT-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
      title: alert.title,
      symbol: alert.symbol,
      message: alert.message,
      level: alert.level,
      channels: alert.channels || ['Telegram VIP @BistAppKuant', 'Discord #signals-vip'],
      timestamp: alert.timestamp || Date.now(),
      metadata: alert.metadata,
    };

    console.log(`[MT16 BİLDİRİM - ${fullAlert.level}] ${fullAlert.title} (#${fullAlert.symbol}): ${fullAlert.message}`);
    
    // Geçmişe ekle (En son 50 kayıt tutulur)
    this.alertHistory = [fullAlert, ...this.alertHistory.slice(0, 49)];

    // Dinleyicileri bilgilendir
    this.listeners.forEach((listener) => {
      try {
        listener(fullAlert);
      } catch (err) {
        console.error('[NotificationDaemon] Dinleyici hatası:', err);
      }
    });

    // Webhook (Telegram / Discord) çağrısı simülasyonu / gerçek POST
    try {
      if (typeof window !== 'undefined' && (window as any).__MT16_WEBHOOK_URL__) {
        fetch((window as any).__MT16_WEBHOOK_URL__, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(fullAlert),
        }).catch(() => {});
      }
    } catch {
      // sessizce geç
    }

    return true;
  }

  /**
   * CalendarAnomaly ve MeanReversion verilerini denetleyerek
   * kritik anomali durumlarında otomatik alarm fırlatır.
   */
  public static async evaluateAndNotifyAnomalies(params: {
    symbol: string;
    calendar: CalendarAnomalyResult;
    meanReversion: MeanReversionResult;
    microstructure?: MicrostructureAnomalyResult;
    valueQuality?: ValueQualityAnomalyResult;
    behavioralHerding?: BehavioralHerdingResult;
    composite?: CompositeAnomalyResult;
    price?: number | null;
    oco?: { stopLoss?: number | null; takeProfit?: number | null };
    forceBroadcast?: boolean;
  }): Promise<AlertMessage | null> {
    const { symbol, calendar, meanReversion, price = null, oco, forceBroadcast = false } = params;

    const now = Date.now();

    // Qodi v6.1: Gercek fiyat verisi yoksa (price: null) alert FIRLATMA.
    // Mock verilerle 'surekli anomali' uyarisi YASAK.
    if (params.price === null || params.price === undefined) {
      return null;
    }

    // Qodi v6.1: Gercek fiyat verisi yoksa (price: null) alert FIRLATMA.
    // Mock verilerle 'surekli anomali' uyarisi YASAK.
    if (params.price === null || params.price === undefined) {
      return null;
    }
    const cooldownMs = 300000; // 5 dakikalık bildirim soğuma süresi (spam engelleme)
    const compositeScore = params.composite?.compositeScore ?? null;
    const isCriticalScore = (compositeScore !== null && compositeScore >= 80) || meanReversion.regime === 'EXTREME_EXPANSION';

    // 1. Durum: EXTREME_EXPANSION (Aşırı Genişleme Rejimi - Z >= 2.5σ)
    if (meanReversion.regime === 'EXTREME_EXPANSION') {
      const key = `${symbol}-EXTREME_EXPANSION`;
      const lastTrigger = this.lastTriggeredTimestamps.get(key) ? this.lastTriggeredTimestamps.get(key) : 0;

      if (forceBroadcast || (now - lastTrigger > cooldownMs)) {
        this.lastTriggeredTimestamps.set(key, now);

        const alert: AlertMessage = {
          id: `ALT-EXP-${Date.now()}`,
          title: '🚨 KRİTİK REJİM: AŞIRI GENİŞLEME (EXTREME EXPANSION)',
          symbol,
          level: 'CRITICAL',
          message: `[${symbol}] İstatistiksel fiyatta aşırı sapma teyit edildi! Z-Skor: ${meanReversion.zScore >= 0 ? '+' : ''}${meanReversion.zScore}σ | Ortalamaya Dönüş (Mean Reversion) Olasılığı: %${meanReversion.reversionProbabilityPct}. ${
            meanReversion.isOverbought
              ? 'AŞIRI ALIM BÖLGESİ - Sert kâr satışı ve düzeltme riski yüksek!'
              : meanReversion.isOversold
              ? 'AŞIRI SATIM BÖLGESİ - Güçlü tepki alımı ve taban oluşumu olası!'
              : 'Ekstrem volatilite kanalı aktif.'
          }${oco ? ` (OCO: TP: ${oco.takeProfit?.toFixed(2) || '---'} / SL: ${oco.stopLoss?.toFixed(2) || '---'})` : ''}`,
          channels: ['Telegram VIP @BistAppKuant', 'Discord #signals-vip'],
          timestamp: now,
          metadata: {
            regime: meanReversion.regime,
            zScore: meanReversion.zScore,
            reversionProbabilityPct: meanReversion.reversionProbabilityPct,
            calendarAnomaly: calendar.description,
            price: price ?? undefined,
            oco: oco ? { stopLoss: oco.stopLoss ?? undefined, takeProfit: oco.takeProfit ?? undefined } : undefined,
          },
        };

        await this.sendAlert(alert);
        return alert;
      }
    }

    // 2. Durum: Seans Açılış Hacim Şoku (Opening Spike: 10:00 - 10:30)
    if (calendar.isOpeningSpike) {
      const key = `${symbol}-OPENING_SPIKE`;
      const lastTrigger = this.lastTriggeredTimestamps.get(key) ? this.lastTriggeredTimestamps.get(key) : 0;

      if (forceBroadcast || (now - lastTrigger > cooldownMs)) {
        this.lastTriggeredTimestamps.set(key, now);

        const alert: AlertMessage = {
          id: `ALT-OPEN-${Date.now()}`,
          title: '⚡ SEANS AÇILIŞ HACİM ŞOKU (OPENING SPIKE)',
          symbol,
          level: 'CRITICAL',
          message: `[${symbol}] Seans açılış penceresinde (10:00 - 10:30) olağandışı hacim dalgalanması saptandı! Takvim Z-Skor katkısı: +${calendar.calendarZScore}σ. Likidite kademelerinde ani süpürme ve manipülasyon riski mevcut.`,
          channels: ['Telegram VIP @BistAppKuant', 'Discord #signals-vip'],
          timestamp: now,
          metadata: {
            calendarAnomaly: calendar.description,
            zScore: calendar.calendarZScore,
            price: price ?? undefined,
          },
        };

        await this.sendAlert(alert);
        return alert;
      }
    }

    // 3. Durum: Kapanış Karanlık Oda / Eşleşme Baskısı (Closing Spike: 17:40 - 18:10)
    if (calendar.isClosingSpike) {
      const key = `${symbol}-CLOSING_SPIKE`;
      const lastTrigger = this.lastTriggeredTimestamps.get(key) ? this.lastTriggeredTimestamps.get(key) : 0;

      if (forceBroadcast || (now - lastTrigger > cooldownMs)) {
        this.lastTriggeredTimestamps.set(key, now);

        const alert: AlertMessage = {
          id: `ALT-CLOSE-${Date.now()}`,
          title: '⏳ KARANLIK ODA & EŞLEŞME BASKISI (CLOSING SPIKE)',
          symbol,
          level: 'WARNING',
          message: `[${symbol}] Seans kapanış karanlık oda eşleşmesinde (17:40 - 18:10) kademe dengesizliği. OCO zırhınızı kontrol edin.`,
          channels: ['Telegram VIP @BistAppKuant', 'Discord #signals-vip'],
          timestamp: now,
          metadata: {
            calendarAnomaly: calendar.description,
            zScore: calendar.calendarZScore,
            price: price ?? undefined,
          },
        };

        await this.sendAlert(alert);
        return alert;
      }
    }

    // 4. Durum: Cuma Kapanış Hafta Sonu Riski (Weekend Risk: Cuma 17:00+)
    if (calendar.isWeekendRisk) {
      const key = `${symbol}-WEEKEND_RISK`;
      const lastTrigger = this.lastTriggeredTimestamps.get(key) ? this.lastTriggeredTimestamps.get(key) : 0;

      if (forceBroadcast || (now - lastTrigger > cooldownMs)) {
        this.lastTriggeredTimestamps.set(key, now);

        const alert: AlertMessage = {
          id: `ALT-WKND-${Date.now()}`,
          title: '🛡️ CUMA SEANS KAPANIŞI: HAFTA SONU GAP RİSKİ',
          symbol,
          level: 'WARNING',
          message: `[${symbol}] Hafta sonu takas ve haber akışı riski. Portföy koruma filtresi kaldıraçlı pozisyonları minimize etmeyi önerir.`,
          channels: ['Telegram VIP @BistAppKuant', 'Discord #signals-vip'],
          timestamp: now,
          metadata: {
            calendarAnomaly: calendar.description,
            price: price ?? undefined,
          },
        };

        await this.sendAlert(alert);
        return alert;
      }
    }

    // 5. Durum: Aşırı Alım / Aşırı Satım (Z >= 2.0 veya Z <= -2.0)
    if (meanReversion.isOverbought || meanReversion.isOversold) {
      const key = `${symbol}-OVERBOUGHT_OVERSOLD`;
      const lastTrigger = this.lastTriggeredTimestamps.get(key) ? this.lastTriggeredTimestamps.get(key) : 0;

      if (forceBroadcast || (now - lastTrigger > cooldownMs)) {
        this.lastTriggeredTimestamps.set(key, now);

        const alert: AlertMessage = {
          id: `ALT-MR-${Date.now()}`,
          title: `📊 ORTALAMAYA DÖNÜŞ SİNYALİ (${meanReversion.isOverbought ? 'AŞIRI ALIM' : 'AŞIRI SATIM'})`,
          symbol,
          level: 'WARNING',
          message: `[${symbol}] Fiyat ortalamasından ${meanReversion.zScore >= 0 ? '+' : ''}${meanReversion.zScore}σ saptı. Ortalamaya dönüş şansı: %${meanReversion.reversionProbabilityPct}.`,
          channels: ['Telegram VIP @BistAppKuant'],
          timestamp: now,
          metadata: {
            regime: meanReversion.regime,
            zScore: meanReversion.zScore,
            reversionProbabilityPct: meanReversion.reversionProbabilityPct,
            price: price ?? undefined,
          },
        };

        await this.sendAlert(alert);
        return alert;
      }
    }

    // 6. Durum: Spoofing & Manipülasyon Alarmı (Qodi v6.1: Gerçek veri kontrolü)
    // Sadece gerçek veri varsa alert fırlat. Mock verilerle 'sürekli anomali' YASAK.
    if (params.microstructure && 
        params.microstructure.isSpoofingDetected === true && 
        params.microstructure.spoofingRisk === 'CRITICAL' &&
        typeof params.microstructure.cancelRatePct === 'number' &&
        params.microstructure.cancelRatePct > 0) {
      const key = `${symbol}-SPOOFING_ALERT`;
      const lastTrigger = this.lastTriggeredTimestamps.get(key) ? this.lastTriggeredTimestamps.get(key) : 0;

      if (forceBroadcast || (now - lastTrigger > cooldownMs)) {
        this.lastTriggeredTimestamps.set(key, now);

        const alert: AlertMessage = {
          id: `ALT-SPOOF-${Date.now()}`,
          title: '🧱 TAHTA MANİPÜLASYONU & SPOOFING DUVALI TESPİTİ',
          symbol,
          level: 'CRITICAL',
          message: `[${symbol}] Sahte likidite ve kademe geri çekme (Spoofing) saptandı! İptal Oranı: %${params.microstructure.cancelRatePct}. Emir defterinde manipülatif kademe duvarı mevcut.`,
          channels: ['Telegram VIP @BistAppKuant', 'Discord #signals-vip'],
          timestamp: now,
          metadata: {
            price: price ?? undefined,
            regime: params.microstructure.anomalyLabel,
          },
        };

        await this.sendAlert(alert);
        return alert;
      }
    }

    // 7. Durum: Sürü Psikolojisi & Temelsiz FOMO Hacim Sıçraması
    if (params.behavioralHerding && params.behavioralHerding.fomoRiskScore >= 70) {
      const key = `${symbol}-HERDING_FOMO`;
      const lastTrigger = this.lastTriggeredTimestamps.get(key) ? this.lastTriggeredTimestamps.get(key) : 0;

      if (forceBroadcast || (now - lastTrigger > cooldownMs)) {
        this.lastTriggeredTimestamps.set(key, now);

        const alert: AlertMessage = {
          id: `ALT-FOMO-${Date.now()}`,
          title: '🐑 SÜRÜ PSİKOLOJİSİ & TEMELSİZ FOMO ALARMI',
          symbol,
          level: 'WARNING',
          message: `[${symbol}] KAP haberi olmaksızın gelişen olağandışı hacim şoku (+${params.behavioralHerding.volumeZScore}σ) ve %${params.behavioralHerding.fomoRiskScore} FOMO riski! Tuzak ihtimali gözetilmeli.`,
          channels: ['Telegram VIP @BistAppKuant', 'Discord #signals-vip'],
          timestamp: now,
          metadata: {
            price: price ?? undefined,
            zScore: params.behavioralHerding.volumeZScore,
          },
        };

        await this.sendAlert(alert);
        return alert;
      }
    }

    // 8. Durum: Yüksek Bileşik Anomali Skoru (Composite Score >= 75)
    if (params.composite && params.composite.compositeScore !== null && params.composite.compositeScore >= 75) {
      const key = `${symbol}-COMPOSITE_ANOMALY`;
        const lastTrigger = this.lastTriggeredTimestamps.get(key);
        const effectiveLastTrigger = lastTrigger ? lastTrigger : 0;

      if (forceBroadcast || (now - effectiveLastTrigger > cooldownMs)) {
        this.lastTriggeredTimestamps.set(key, now);

        const alert: AlertMessage = {
          id: `ALT-COMP-${Date.now()}`,
          title: `⚡ BİLEŞİK ANOMALİ ALARMI: ${params.composite.anomalyLabel}`,
          symbol,
          level: params.composite.urgency,
          message: `[${symbol}] Bileşik anomali skoru ${params.composite.compositeScore}/100 seviyesinde! ${params.composite.synthesizedInsight}`,
          channels: ['Telegram VIP @BistAppKuant', 'Discord #signals-vip'],
          timestamp: now,
          metadata: {
            price: price ?? undefined,
            regime: params.composite.anomalyLabel,
          },
        };

        await this.sendAlert(alert);
        return alert;
      }
    }

    return null;
  }

  /**
   * Geçmiş alarm listesini döner
   */
  public static getAlertHistory(): AlertMessage[] {
    return [...this.alertHistory];
  }

  /**
   * Geçmişi temizler
   */
  public static clearAlertHistory(): void {
    this.alertHistory = [];
    this.lastTriggeredTimestamps.clear();
  }

  public static clearHistory(): void {
    this.clearAlertHistory();
  }
}
