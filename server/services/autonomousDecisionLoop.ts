// server/services/autonomousDecisionLoop.ts
import { runJuryDebate } from './juryDebateEngine.js';
import { simulatedExchange } from './simulator.js';

/**
 * BECERİ 3: Otonom Karar Döngüsü (Autonomous Decision Loop)
 * Bu servis, insan müdahalesi olmadan piyasayı tarar, risk yönetimi süzgecinden geçirir
 * ve uygun fırsatlarda simüle borsada emir oluşturur.
 */
class AutonomousDecisionLoop {
  private isRunning = false;
  private intervalMs = 5 * 60 * 1000; // 5 Dakika
  private watchlist = ['ASELS', 'THYAO', 'EREGL', 'GARAN', 'KCHOL', 'BTC', 'ETH', 'NVDA', 'TSLA'];

  private async detectMarketRegime(): Promise<'BULL' | 'BEAR' | 'SIDEWAYS'> {
    // Simüle edilmiş rejim tespiti (İleride MacroShockEngine'e bağlanacak)
    const hour = new Date().getHours();
    if (hour >= 9 && hour <= 12) return 'BULL';
    if (hour >= 13 && hour <= 16) return 'BEAR';
    return 'SIDEWAYS';
  }

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log('🚀 [AutonomousLoop] Otonom Karar Döngüsü Başlatıldı. Tarama Aralığı: 5 Dakika.');
    
    // İlk çalıştırma
    this.runCycle();

    // Periyodik döngü
    setInterval(() => this.runCycle(), this.intervalMs);
  }

  private isMarketOpen(): boolean {
    const now = new Date();
    // Türkiye saati UTC+3
    const trHour = (now.getUTCHours() + 3) % 24;
    const trMin = now.getUTCMinutes();
    const currentMin = trHour * 60 + trMin;
    const day = now.getUTCDay(); // 0: Pazar, 6: Cumartesi
    const isWeekday = day >= 1 && day <= 5;
    return isWeekday && currentMin >= 580 && currentMin <= 1090; // 09:40 - 18:10
  }

  private async runCycle() {
    if (!this.isMarketOpen()) {
      console.log('🛑 [AutonomousLoop] Seans Kapalı, tarama durduruldu.');
      return;
    }

    console.log(`🕒 [AutonomousLoop] Döngü Tetiklendi: ${new Date().toLocaleTimeString('tr-TR')} - ${this.watchlist.length} varlık taranıyor...`);
    
    // BECERİ 4: Rejim Tespiti ve Ağırlık Güncelleme
    const regime = await this.detectMarketRegime();
    const adjustments = {
      regime,
      weightMultipliers: regime === 'BULL' ? { bull: 1.5, bear: 0.5 } : (regime === 'BEAR' ? { bear: 1.5, bull: 0.5 } : { bull: 1.0, bear: 1.0 })
    };

    console.log(`🎭 [AutonomousLoop] Piyasa Rejimi: ${regime} | Ağırlıklar Güncellendi.`);

    for (const ticker of this.watchlist) {
      try {
        // 1. Jüri Münazarasını Başlat (Regime Adjustments ile)
        const debateResult = await runJuryDebate(ticker, undefined, undefined, 'STANDARD', adjustments);
        
        // 2. Kararı Değerlendir
        const { consensus, finalDecision, ticker: cleanTicker, assetClass } = debateResult;
        const action = consensus;
        
        console.log(`🔍 [AutonomousLoop] Analiz: #${cleanTicker} (${assetClass}) -> Karar: ${action} | Güven: %${debateResult.confidenceScore}`);

        // 3. Eğer 'BUY' (AL) sinyali varsa ve güven yüksekse emir oluştur
        if (action === 'BUY' && debateResult.confidenceScore >= 80) {
          const entryPrice = finalDecision.entryPrice;
          const stopLossPrice = entryPrice * (1 + finalDecision.stopLossPercent / 100);
          const takeProfitPrice = debateResult.structuredDecision.price_target;

          // Simüle Borsada Emir Oluştur
          const orderResult = simulatedExchange.executeOrder({
            symbol: cleanTicker,
            side: 'BUY',
            price: entryPrice,
            lots: 10, // Otonom sabit lot veya Kelly bazlı hesaplanabilir
            stopLoss: stopLossPrice,
            takeProfit: takeProfitPrice,
            exchange: assetClass === 'CRYPTO' ? 'BINANCE' : 'BIST_SPOT'
          });

          if (orderResult.success) {
            console.log(`✅ [AutonomousLoop] Otonom Emir İletildi: ${orderResult.message}`);
          } else {
            console.warn(`⚠️ [AutonomousLoop] Emir Reddedildi: ${orderResult.message}`);
          }
        }
      } catch (error: any) {
        console.error(`❌ [AutonomousLoop] #${ticker} analizinde hata:`, error.message);
      }
    }
    
    console.log('🏁 [AutonomousLoop] Tarama Döngüsü Tamamlandı.');
  }
}

export const autonomousDecisionLoop = new AutonomousDecisionLoop();
