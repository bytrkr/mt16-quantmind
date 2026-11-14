// src/services/geminiKeyRotator.ts
/**
 * MT16 Gemini API Key Rotator Servisi (GeminiKeyRotator)
 * Google AI Studio kota ve rate-limit sorunlarını engellemek için çoklu API anahtarı döndüren istemci servisi.
 */

export class GeminiKeyRotator {
  private keys: string[];
  private currentIndex: number = 0;

  constructor(apiKeys: string[]) {
    this.keys = apiKeys.filter((k) => k && k.trim() !== '');
  }

  /**
   * Qodi v6.1: throw yerine null döner.
   * Anahtar yoksa çağıran taraf null kontrolü yapmalıdır.
   */
  public getActiveKey(): string | null {
    if (this.keys.length === 0) {
      console.warn('[GeminiKeyRotator] QODI v6.1: Tanımlı Gemini API anahtarı yok, null döndürüldü.');
      return null;
    }
    return this.keys[this.currentIndex];
  }

  public rotateKey(): string {
    if (this.keys.length <= 1) return this.getActiveKey();
    this.currentIndex = (this.currentIndex + 1) % this.keys.length;
    console.warn(`Gemini API anahtarı değiştirildi. Aktif Key İndeksi: ${this.currentIndex}`);
    return this.getActiveKey();
  }
}
