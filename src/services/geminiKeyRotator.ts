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

  public getActiveKey(): string {
    if (this.keys.length === 0) {
      throw new Error('Tanımlı Gemini API anahtarı bulunamadı.');
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
