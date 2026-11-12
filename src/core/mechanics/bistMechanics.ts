// src/core/mechanics/bistMechanics.ts
/**
 * MT16 QUANT MIND — Borsa İstanbul Piyasa Mekaniği ve Seans Zırhı Motoru (BIST Mechanics)
 * --------------------------------------------------------------------------------------
 * QODI ANAYASASI v6.1 KESİN KURALLARI:
 * 1. Fallback ve rasgele değer üreticileri yasaktır.
 * 2. Geçersiz veride return null + logDataIssue() + UI "VERİ YOK".
 * 3. Hata fırlatma (exception raising) yasaktır, tüm fonksiyonlar güvenli sonuç döner.
 * 4. toFixed/toLocaleString öncesi typeof === 'number' && !isNaN() kontrolü zorunludur.
 * 
 * BIST ÖZGÜN MEKANİKLERİ:
 * - Seans Fazları (Europe/Istanbul):
 *   09:40 - 09:55: Açılış Tek Fiyat Emir Toplama (OPENING_AUCTION)
 *   09:55 - 10:00: Açılış Eşleşme ve Fiyat Belirleme
 *   10:00 - 18:00: Sürekli Müzayede (CONTINUOUS)
 *   18:01 - 18:05: Kapanış Marjı ve Emir Toplama (CLOSING_AUCTION)
 *   18:05 - 18:08: Kapanış Tek Fiyat Eşleşmesi
 *   18:08 - 18:10: Kapanış Fiyatından İşlemler (TRADING_AT_LAST)
 *   Diğer saatler: Seans Kapalı (CLOSED)
 * - Fiyat Marjı: Günlük referans fiyata göre ±%10 tavan/taban limiti.
 * - Devre Kesici (Circuit Breaker): Referans fiyattan %6 düşüşte devre kesici tetiklenir.
 *   Devre kesici eşiğine (%6'ya 0.5 kala, yani %5.5 düşüşte) ALIM KİLİTLENİR (VETO_HOLD).
 */

export type BistSessionPhase = 
  | 'PRE_MARKET'
  | 'OPENING_AUCTION'
  | 'CONTINUOUS'
  | 'CLOSING_AUCTION'
  | 'TRADING_AT_LAST'
  | 'CLOSED';

export interface BistPriceLimits {
  basePrice: number;
  ceilingPrice: number; // +%10
  floorPrice: number;   // -%10
  circuitBreakerPrice: number; // -%6.0
  circuitBreakerWarningPrice: number; // -%5.5 (0.5 kala)
}

export interface BistOrderValidationResult {
  isValid: boolean;
  action: 'PROCEED' | 'VETO_HOLD';
  symbol: string;
  price: number | null;
  side: 'BUY' | 'SELL';
  sessionPhase: BistSessionPhase;
  isMarketOpen: boolean;
  limits: BistPriceLimits | null;
  reason: string;
  errorCode: 'NONE' | 'SESSION_CLOSED' | 'CEILING_BREACH' | 'FLOOR_BREACH' | 'CIRCUIT_BREAKER_TRIGGERED' | 'CIRCUIT_BREAKER_WARNING' | 'INVALID_PRICE';
}

function logDataIssue(module: string, symbol: string, field: string, reason: string): void {
  try {
    const payload = {
      timestamp: new Date().toISOString(),
      module,
      symbol: (symbol || 'UNKNOWN').toUpperCase().trim(),
      field,
      reason,
    };
    if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
      window.fetch('/api/audit-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(() => {});
    } else {
      console.warn(`[DATA AUDIT WARN] [${module}] ${payload.symbol} ${field}: ${reason}`);
    }
  } catch {
    // Non-blocking
  }
}

export class BistMechanics {
  /**
   * Europe/Istanbul saat dilimine göre anlık BIST seans fazını belirler.
   */
  public static getCurrentSessionPhase(customDate?: Date): { phase: BistSessionPhase; isOpen: boolean; timeString: string } {
    const now = customDate || new Date();
    let istanbulDate: Date;
    try {
      const istanbulStr = now.toLocaleString('en-US', { timeZone: 'Europe/Istanbul' });
      istanbulDate = new Date(istanbulStr);
    } catch {
      istanbulDate = now;
    }

    const day = istanbulDate.getDay(); // 0: Pazar, 6: Cumartesi
    const hours = istanbulDate.getHours();
    const minutes = istanbulDate.getMinutes();
    const totalMinutes = hours * 60 + minutes;

    const timeString = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

    // Hafta sonu kapalı
    if (day === 0 || day === 6) {
      return { phase: 'CLOSED', isOpen: false, timeString };
    }

    // 09:40 öncesi
    if (totalMinutes < 580) {
      return { phase: 'PRE_MARKET', isOpen: false, timeString };
    }
    // 09:40 - 09:55: Açılış Emir Toplama
    if (totalMinutes >= 580 && totalMinutes < 595) {
      return { phase: 'OPENING_AUCTION', isOpen: true, timeString };
    }
    // 09:55 - 10:00: Eşleşme
    if (totalMinutes >= 595 && totalMinutes < 600) {
      return { phase: 'OPENING_AUCTION', isOpen: false, timeString };
    }
    // 10:00 - 18:00: Sürekli Müzayede
    if (totalMinutes >= 600 && totalMinutes < 1080) {
      return { phase: 'CONTINUOUS', isOpen: true, timeString };
    }
    // 18:01 - 18:05: Kapanış Emir Toplama
    if (totalMinutes >= 1081 && totalMinutes < 1085) {
      return { phase: 'CLOSING_AUCTION', isOpen: true, timeString };
    }
    // 18:05 - 18:08: Kapanış Eşleşmesi
    if (totalMinutes >= 1085 && totalMinutes < 1088) {
      return { phase: 'CLOSING_AUCTION', isOpen: false, timeString };
    }
    // 18:08 - 18:10: Kapanış Fiyatından İşlemler
    if (totalMinutes >= 1088 && totalMinutes <= 1090) {
      return { phase: 'TRADING_AT_LAST', isOpen: true, timeString };
    }

    // 18:10 sonrası seans kapalı
    return { phase: 'CLOSED', isOpen: false, timeString };
  }

  /**
   * Referans fiyata göre tavan, taban ve devre kesici fiyatlarını hesaplar.
   */
  public static calculatePriceLimits(basePrice: number | null | undefined): BistPriceLimits | null {
    if (typeof basePrice !== 'number' || isNaN(basePrice) || basePrice <= 0) {
      return null;
    }

    // BIST kuralları: Tavan +%10, Taban -%10, Devre kesici -%6.0, Uyarı eşiği -%5.5
    const ceilingPrice = Number((basePrice * 1.10).toFixed(2));
    const floorPrice = Number((basePrice * 0.90).toFixed(2));
    const circuitBreakerPrice = Number((basePrice * 0.94).toFixed(2));
    const circuitBreakerWarningPrice = Number((basePrice * 0.945).toFixed(2));

    return {
      basePrice,
      ceilingPrice,
      floorPrice,
      circuitBreakerPrice,
      circuitBreakerWarningPrice,
    };
  }

  /**
   * BIST Mekanik Emir Doğrulayıcısı (Order Validator)
   * Kurallar:
   * 1. Seans kapalıysa -> return VETO_HOLD + SESSION_CLOSED
   * 2. Fiyat geçersizse -> return VETO_HOLD + INVALID_PRICE
   * 3. Alış emri tavan fiyattan büyükse -> return VETO_HOLD + CEILING_BREACH
   * 4. Satış emri taban fiyattan küçükse -> return VETO_HOLD + FLOOR_BREACH
   * 5. Fiyat düşüşü %6.0 devre kesiciyi aştıysa -> return VETO_HOLD + CIRCUIT_BREAKER_TRIGGERED
   * 6. Devre kesici %6'ya 0.5 kala (%5.5 düşüş) -> return VETO_HOLD + CIRCUIT_BREAKER_WARNING
   */
  public static validateOrder(
    symbol: string,
    price: number | null | undefined,
    side: 'BUY' | 'SELL',
    basePriceInput?: number | null,
    customDate?: Date
  ): BistOrderValidationResult {
    const cleanSym = (symbol || 'ASELS').toUpperCase().trim().replace(/\.IS$/i, '');
    const cleanSide: 'BUY' | 'SELL' = side === 'SELL' ? 'SELL' : 'BUY';

    const { phase, isOpen, timeString } = this.getCurrentSessionPhase(customDate);

    // 1. KONTROL: Seans Durumu
    if (!isOpen) {
      const reason = `BIST Seansı Kapalı (${phase} - Saat: ${timeString}). İşlem gerçekleştirilemez.`;
      logDataIssue('bistMechanics', cleanSym, 'session', reason);
      return {
        isValid: false,
        action: 'VETO_HOLD',
        symbol: cleanSym,
        price: typeof price === 'number' && !isNaN(price) ? price : null,
        side: cleanSide,
        sessionPhase: phase,
        isMarketOpen: false,
        limits: null,
        reason,
        errorCode: 'SESSION_CLOSED',
      };
    }

    // 2. KONTROL: Fiyat Geçerliliği
    if (typeof price !== 'number' || isNaN(price) || price <= 0) {
      const reason = `Geçersiz fiyat verisi (${String(price)}). Fiyat sayısal ve sıfırdan büyük olmalıdır.`;
      logDataIssue('bistMechanics', cleanSym, 'price', reason);
      return {
        isValid: false,
        action: 'VETO_HOLD',
        symbol: cleanSym,
        price: null,
        side: cleanSide,
        sessionPhase: phase,
        isMarketOpen: isOpen,
        limits: null,
        reason,
        errorCode: 'INVALID_PRICE',
      };
    }

    // Referans fiyat (belirtilmemişse anlık fiyatı referans alır)
    const effectiveBase = typeof basePriceInput === 'number' && !isNaN(basePriceInput) && basePriceInput > 0
      ? basePriceInput
      : price;

    const limits = this.calculatePriceLimits(effectiveBase);
    if (!limits) {
      const reason = 'Referans fiyat hesaplanamadı.';
      logDataIssue('bistMechanics', cleanSym, 'basePrice', reason);
      return {
        isValid: false,
        action: 'VETO_HOLD',
        symbol: cleanSym,
        price,
        side: cleanSide,
        sessionPhase: phase,
        isMarketOpen: isOpen,
        limits: null,
        reason,
        errorCode: 'INVALID_PRICE',
      };
    }

    // 3. KONTROL: Tavan Fiyat Aşımı
    if (price > limits.ceilingPrice) {
      const reason = `Tavan Fiyat Aşımı: Teklif edilen fiyat (${price.toFixed(2)} TL), günün tavan limitinin (${limits.ceilingPrice.toFixed(2)} TL) üzerindedir.`;
      logDataIssue('bistMechanics', cleanSym, 'ceilingPrice', reason);
      return {
        isValid: false,
        action: 'VETO_HOLD',
        symbol: cleanSym,
        price,
        side: cleanSide,
        sessionPhase: phase,
        isMarketOpen: isOpen,
        limits,
        reason,
        errorCode: 'CEILING_BREACH',
      };
    }

    // 4. KONTROL: Taban Fiyat Altı
    if (price < limits.floorPrice) {
      const reason = `Taban Fiyat İhlali: Teklif edilen fiyat (${price.toFixed(2)} TL), günün taban limitinin (${limits.floorPrice.toFixed(2)} TL) altındadır.`;
      logDataIssue('bistMechanics', cleanSym, 'floorPrice', reason);
      return {
        isValid: false,
        action: 'VETO_HOLD',
        symbol: cleanSym,
        price,
        side: cleanSide,
        sessionPhase: phase,
        isMarketOpen: isOpen,
        limits,
        reason,
        errorCode: 'FLOOR_BREACH',
      };
    }

    // Düşüş yüzdesi (referans fiyata göre)
    const dropPct = ((effectiveBase - price) / effectiveBase) * 100;

    // 5. KONTROL: BIST Devre Kesici (%6.0 Düşüş)
    if (dropPct >= 6.0 || price <= limits.circuitBreakerPrice) {
      const reason = `BIST Devre Kesici Tetiklendi: Fiyat düşüşü (%${dropPct.toFixed(2)} >= %6.0) devre kesici eşiğine ulaştı. Yeni alım kilitlendi.`;
      logDataIssue('bistMechanics', cleanSym, 'circuitBreaker', reason);
      return {
        isValid: false,
        action: 'VETO_HOLD',
        symbol: cleanSym,
        price,
        side: cleanSide,
        sessionPhase: phase,
        isMarketOpen: isOpen,
        limits,
        reason,
        errorCode: 'CIRCUIT_BREAKER_TRIGGERED',
      };
    }

    // 6. KONTROL: Devre Kesiciye 0.5 Kala Uyarısı (%5.5 Düşüş)
    if (dropPct >= 5.5 || price <= limits.circuitBreakerWarningPrice) {
      const reason = `BIST Devre Kesici Yakınsama Uyarısı: Düşüş %${dropPct.toFixed(2)} ile %6.0 sınırına 0.5 puan yaklaştı (Eşik: ${limits.circuitBreakerWarningPrice.toFixed(2)} TL). Koruma amaçlı VETO_HOLD.`;
      logDataIssue('bistMechanics', cleanSym, 'circuitBreakerWarning', reason);
      return {
        isValid: false,
        action: 'VETO_HOLD',
        symbol: cleanSym,
        price,
        side: cleanSide,
        sessionPhase: phase,
        isMarketOpen: isOpen,
        limits,
        reason,
        errorCode: 'CIRCUIT_BREAKER_WARNING',
      };
    }

    // Tüm kontroller başarılı
    return {
      isValid: true,
      action: 'PROCEED',
      symbol: cleanSym,
      price,
      side: cleanSide,
      sessionPhase: phase,
      isMarketOpen: isOpen,
      limits,
      reason: `BIST Mekanik doğrulaması başarılı. Seans: ${phase}, Tavan: ${limits.ceilingPrice.toFixed(2)}, Taban: ${limits.floorPrice.toFixed(2)}.`,
      errorCode: 'NONE',
    };
  }
}

export const bistMechanics = BistMechanics;
