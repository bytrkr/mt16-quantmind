// src/utils/mathGuards.ts
/**
 * ============================================================================
 * 🧠 MT16 QUANTMIND — MATEMATİKSEL KORUMA VE MATEMATİK DUVARI (mathGuards.ts)
 * ============================================================================
 *
 * QODI ANAYASA STANDARTLARI:
 * - Çökme Yasağı: SIFIRA BÖLME, NaN, undefined, Negative SQRT, Infinity durumlarında çökme YASAK.
 * - Saf Fonksiyonlar: Her işlem öncesi typeof === 'number' && !isNaN() kontrol edilir.
 * - Hata Günlüğü: Anormal matematiksel işlemler logDataIssue() ile kaydedilir.
 */

import { logDataIssue } from './dataAudit';

/**
 * Güvenli Bölme İşlemi (a / b)
 * Payda 0, NaN veya sayı dışı ise null veya belirtilen varsayılanı döner, log tutar.
 */
export function safeDivide(
  a: unknown,
  b: unknown,
  fallback: number | null = null,
  source: string = 'mathGuards',
  ticker: string = 'GLOBAL'
): number | null {
  if (typeof a !== 'number' || isNaN(a) || !isFinite(a)) {
    logDataIssue(source, ticker, 'safeDivide_a', 'Invalid numerator input');
    return fallback;
  }
  if (typeof b !== 'number' || isNaN(b) || !isFinite(b) || b === 0) {
    logDataIssue(source, ticker, 'safeDivide_b', 'Division by zero or invalid denominator');
    return fallback;
  }
  const res = a / b;
  if (!isFinite(res) || isNaN(res)) {
    logDataIssue(source, ticker, 'safeDivide_res', 'Result is non-finite');
    return fallback;
  }
  return res;
}

/**
 * Güvenli Karekök İşlemi (sqrt(x))
 * Negatif, NaN veya sayı dışı girdilerde null döner.
 */
export function safeSqrt(
  x: unknown,
  source: string = 'mathGuards',
  ticker: string = 'GLOBAL'
): number | null {
  if (typeof x !== 'number' || isNaN(x) || !isFinite(x) || x < 0) {
    logDataIssue(source, ticker, 'safeSqrt', `Negative or invalid sqrt input: ${x}`);
    return null;
  }
  return Math.sqrt(x);
}

/**
 * Güvenli Üs Alma İşlemi (base^exp)
 */
export function safePow(
  base: unknown,
  exp: unknown,
  source: string = 'mathGuards',
  ticker: string = 'GLOBAL'
): number | null {
  if (
    typeof base !== 'number' ||
    isNaN(base) ||
    !isFinite(base) ||
    typeof exp !== 'number' ||
    isNaN(exp) ||
    !isFinite(exp)
  ) {
    logDataIssue(source, ticker, 'safePow', 'Invalid base or exponent');
    return null;
  }
  const res = Math.pow(base, exp);
  if (!isFinite(res) || isNaN(res)) {
    logDataIssue(source, ticker, 'safePow_res', 'Result is non-finite');
    return null;
  }
  return res;
}

/**
 * Güvenli Ondalık Biçimlendirme (num.toFixed(decimals))
 * Sayı geçerli değilse 'VERİ YOK' veya verilen fallback metni döner.
 */
export function safeToFixed(
  num: unknown,
  decimals: number = 2,
  fallbackText: string = 'VERİ YOK'
): string {
  if (typeof num !== 'number' || isNaN(num) || !isFinite(num)) {
    return fallbackText;
  }
  try {
    return num.toFixed(decimals);
  } catch {
    return fallbackText;
  }
}

/**
 * Güvenli Yerel Sayı Biçimlendirme (num.toLocaleString())
 */
export function safeToLocaleString(
  num: unknown,
  locales: string = 'tr-TR',
  options?: Intl.NumberFormatOptions,
  fallbackText: string = 'VERİ YOK'
): string {
  if (typeof num !== 'number' || isNaN(num) || !isFinite(num)) {
    return fallbackText;
  }
  try {
    return num.toLocaleString(locales, options);
  } catch {
    return fallbackText;
  }
}

/**
 * Güvenli Olasılık Sınırlayıcı [0, 1] veya [0, 100]
 */
export function safeProbability(p: unknown, isPercentage: boolean = false): number | null {
  if (typeof p !== 'number' || isNaN(p) || !isFinite(p)) {
    return null;
  }
  const maxVal = isPercentage ? 100 : 1.0;
  return Math.max(0, Math.min(maxVal, p));
}

/**
 * Güvenli Eğim/Trend Hesabı ((y2 - y1) / (x2 - x1))
 */
export function safeSlope(
  y2: unknown,
  y1: unknown,
  x2: unknown,
  x1: unknown,
  source: string = 'mathGuards',
  ticker: string = 'GLOBAL'
): number | null {
  if (
    typeof y2 !== 'number' ||
    typeof y1 !== 'number' ||
    typeof x2 !== 'number' ||
    typeof x1 !== 'number' ||
    isNaN(y2) ||
    isNaN(y1) ||
    isNaN(x2) ||
    isNaN(x1)
  ) {
    logDataIssue(source, ticker, 'safeSlope', 'Invalid coordinates');
    return null;
  }
  const dx = x2 - x1;
  const dy = y2 - y1;
  return safeDivide(dy, dx, null, source, ticker);
}

export default {
  safeDivide,
  safeSqrt,
  safePow,
  safeToFixed,
  safeToLocaleString,
  safeProbability,
  safeSlope,
};
