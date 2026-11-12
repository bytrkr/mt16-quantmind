// src/services/audioSyntheticDispatcher.ts
/**
 * MT16 BistApp Kuant Terminali - Otonom Sesli Kuant Anons Servisi
 * Web Speech API kullanarak kritik anomali, tavan kilit ve balina hareketlerinde
 * Türkçe sentetik kuant anonsları üretir.
 */

class AudioSyntheticDispatcher {
  private muted: boolean = false;
  private lastSpokenTimeByTag: Record<string, number> = {};
  private cooldownMs: number = 15000; // Aynı anons için 15s cooldown

  constructor() {
    // LocalStorage veya varsayılan durum kontrolü
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = localStorage.getItem('mt16_audio_muted');
      if (saved !== null) {
        this.muted = saved === 'true';
      }
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('mt16_audio_muted', String(muted));
    }
    if (muted && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  public toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  public speak(text: string, tag: string = 'general', force: boolean = false): void {
    if (this.muted && !force) return;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const now = Date.now();
    const lastTime = this.lastSpokenTimeByTag[tag] ? this.lastSpokenTimeByTag[tag] : 0;
    if (now - lastTime < this.cooldownMs && !force) {
      return;
    }

    this.lastSpokenTimeByTag[tag] = now;

    try {
      // Önceki aktif konuşmayı kes
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'tr-TR';
      utterance.rate = 1.05; // Biraz daha dinamik hızlı kuant anlatımı
      utterance.pitch = 1.0;
      utterance.volume = 0.9;

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('⚠️ Web Speech API anons hatası:', e);
    }
  }

  public announceCriticalAnomaly(
    symbol: string,
    score: number | null,
    zScore: number | null,
    reason: string
  ): void {
    const safeScore = score ?? '---';
    const safeZ = zScore !== null ? `${zScore >= 0 ? 'artı' : 'eksi'} ${Math.abs(zScore).toFixed(1)}` : '---';
    const text = `#${symbol} tahtasında kritik anomali tespit edildi. Anomali skoru %${safeScore}, Z-Skoru ${safeZ} sigma. ${reason}`;
    this.speak(text, `anomaly-${symbol}`);
  }

  public announceCeilingLock(symbol: string, ratePct: number | null): void {
    const text = `#${symbol} hissesinde tavan potansiyeli %${ratePct !== null ? ratePct.toFixed(0) : '---'}. Alış kademeleri kilitlendi.`;
    this.speak(text, `ceiling-${symbol}`);
  }

  public announceWhaleLiquidation(symbol: string, usdAmount: string): void {
    const text = `#${symbol} tahtasında ${usdAmount} tutarında büyük balina emri ve likidasyon dalgası tetiklendi.`;
    this.speak(text, `whale-${symbol}`);
  }

  public announceIcebergDetection(symbol: string, hiddenLots: number | null, side: string, price: number | null): void {
    const text = `#${symbol} tahtasında ${side} tarafında ${price ?? '---'} seviyesinde yaklaşık ${hiddenLots !== null ? hiddenLots.toLocaleString('tr-TR') : '---'} lot gizli Iceberg siparişi tespit edildi.`;
    this.speak(text, `iceberg-${symbol}`);
  }

  public announceJuryConsensus(symbol: string, decision: string, confidence: number | null): void {
    const text = `#${symbol} için 4 ajanlı jürinin konsensüs kararı yüzde ${confidence ?? '---'} güven oranı ile ${decision} olarak belirlendi.`;
    this.speak(text, `jury-${symbol}`);
  }
}

export const audioSyntheticDispatcher = new AudioSyntheticDispatcher();
