// src/services/orderflow.ts
/**
 * MT16 Kuant Terminali - Orderflow & Kurumsal AKD Akış Motoru
 * Mum İçi Agresif Alış/Satış Delta ve Kurumsal AKD (Piggybacking) motoru.
 * Net Delta, Kümülatif Hacim Deltası (CVD) ve Fiyat-Delta Uyumsuzluğu (Divergence/Absorption).
 */

export interface TradeTick {
  price: number;
  volume: number;
  side: 'BUY' | 'SELL';
  broker?: string; // BofA, Citi, Yatırım Finansman, İş Yatırım, QNB, vb.
  timestamp: number;
}

export interface OrderflowMetrics {
  cumulativeDelta: number | null;
  deltaDivergence: boolean | null;
  divergenceType: 'BULLISH_ABSORPTION' | 'BEARISH_ABSORPTION' | 'EXHAUSTION' | 'NONE';
  institutionalDominance: number | null; // 0 - 100
  dominantBrokerFlow: { broker: string | null; netVolume: number | null };
  buyAggressiveVol: number | null;
  sellAggressiveVol: number | null;
  totalVolume: number | null;
  deltaRatio: number | null; // -1.0 ile +1.0
  piggybackSignal: 'FOLLOW_BUY' | 'FOLLOW_SELL' | 'NEUTRAL';
}

export class OrderflowEngine {
  private ticks: TradeTick[] = [];
  private readonly MAX_TICKS = 2000;

  // Kurumsal ağırlıklı aracı kurumlar listesi
  private readonly INSTITUTIONAL_BROKERS = [
    'BofA',
    'Bank of America',
    'Citibank',
    'Citi',
    'Yatırım Finansman',
    'QNB Finansinvest',
    'HSBC',
    'Morgan Stanley',
    'Goldman Sachs',
    'İş Yatırım',
    'Garanti BBVA'
  ];

  /**
   * Yeni bir işlem tikini kuyruğa ekler.
   */
  public processTick(tick: TradeTick): void {
    this.ticks.push(tick);
    if (this.ticks.length > this.MAX_TICKS) {
      this.ticks.shift();
    }
  }

  /**
   * Toplu tik yüklemesi
   */
  public loadTicks(ticks: TradeTick[]): void {
    this.ticks = ticks.slice(-this.MAX_TICKS);
  }

  /**
   * Verilen mum fiyat değişimiyle birlikte güncel orderflow metriklerini hesaplar.
   * @param candlePriceChange Mum içi fiyat değişimi yüzdesi veya mutlak farkı (örn: +1.2%)
   */
  public calculateMetrics(candlePriceChange: number | null): OrderflowMetrics {
    if (this.ticks.length === 0 || candlePriceChange === null) {
      return {
        cumulativeDelta: null,
        deltaDivergence: null,
        divergenceType: 'NONE',
        institutionalDominance: null,
        dominantBrokerFlow: { broker: null, netVolume: null },
        buyAggressiveVol: null,
        sellAggressiveVol: null,
        totalVolume: null,
        deltaRatio: null,
        piggybackSignal: 'NEUTRAL'
      };
    }

    let buyAggressiveVol = 0;
    let sellAggressiveVol = 0;
    let institutionalVol = 0;
    const brokerNetMap: Record<string, number> = {};

    for (const t of this.ticks) {
      const vol = t.volume;
      if (t.side === 'BUY') {
        buyAggressiveVol += vol;
      } else {
        sellAggressiveVol += vol;
      }

      const brokerName = t.broker ?? 'Piyasa';
      const isInst = this.INSTITUTIONAL_BROKERS.some(b => 
        brokerName.toLowerCase().includes(b.toLowerCase())
      );

      if (isInst) {
        institutionalVol += vol;
      }

      if (!brokerNetMap[brokerName]) {
        brokerNetMap[brokerName] = 0;
      }
      brokerNetMap[brokerName] += (t.side === 'BUY' ? vol : -vol);
    }

    const totalVolume = buyAggressiveVol + sellAggressiveVol;
    const cumulativeDelta = buyAggressiveVol - sellAggressiveVol;
    const deltaRatio = totalVolume > 0 ? cumulativeDelta / totalVolume : 0;

    // Kurumsal Hakimiyet Yüzdesi (0 - 100)
    const institutionalDominance = totalVolume > 0
      ? Math.min(100, Math.round((institutionalVol / totalVolume) * 100))
      : null;

    // En baskın aracı kurum tespiti
    let maxBroker: string | null = null;
    let maxAbsNet = 0;
    let actualNet = 0;

    for (const [broker, net] of Object.entries(brokerNetMap)) {
      if (Math.abs(net) > maxAbsNet) {
        maxAbsNet = Math.abs(net);
        maxBroker = broker;
        actualNet = net;
      }
    }

    // Fiyat - Delta Uyumsuzluğu (Divergence / Absorption Tespiti)
    let deltaDivergence = false;
    let divergenceType: 'BULLISH_ABSORPTION' | 'BEARISH_ABSORPTION' | 'EXHAUSTION' | 'NONE' = 'NONE';

    if (candlePriceChange > 0.05 && cumulativeDelta < -5000) {
      deltaDivergence = true;
      divergenceType = 'BEARISH_ABSORPTION';
    } else if (candlePriceChange < -0.05 && cumulativeDelta > 5000) {
      deltaDivergence = true;
      divergenceType = 'BULLISH_ABSORPTION';
    } else if (Math.abs(candlePriceChange) > 1.5 && Math.abs(deltaRatio) < 0.05) {
      deltaDivergence = true;
      divergenceType = 'EXHAUSTION';
    }

    // Piggybacking Sinyali
    let piggybackSignal: 'FOLLOW_BUY' | 'FOLLOW_SELL' | 'NEUTRAL' = 'NEUTRAL';
    const isDominantInstitutional = maxBroker ? this.INSTITUTIONAL_BROKERS.some(b => 
      maxBroker!.toLowerCase().includes(b.toLowerCase())
    ) : false;

    if (isDominantInstitutional && institutionalDominance !== null && institutionalDominance >= 55) {
      if (actualNet > 10000 && cumulativeDelta > 0) {
        piggybackSignal = 'FOLLOW_BUY';
      } else if (actualNet < -10000 && cumulativeDelta < 0) {
        piggybackSignal = 'FOLLOW_SELL';
      }
    }

    return {
      cumulativeDelta,
      deltaDivergence,
      divergenceType,
      institutionalDominance,
      dominantBrokerFlow: {
        broker: maxBroker,
        netVolume: maxBroker ? actualNet : null
      },
      buyAggressiveVol,
      sellAggressiveVol,
      totalVolume,
      deltaRatio: Number(deltaRatio.toFixed(3)),
      piggybackSignal
    };
  }

  /**
   * @deprecated QODI v6.1: Sentetik veri üretimi YASAK (0 Math.random).
   * Bu fonksiyon artık veri üretmez. Sadece uyarı loglar ve boş ticks döner.
   * Gerçek veri için marketGateway / binance / matriks kullanılmalıdır.
   */
  public generateSyntheticTicks(currentPrice: number | null, count: number = 30): void {
    // Qodi v6.1 Kural 2: Math.random yasak. Sentetik tick üretimi devre dışı.
    this.ticks = [];
    if (currentPrice === null) return;

    console.warn(
      '[QODI v6.1] generateSyntheticTicks çağrıldı ancak sentetik veri üretimi yasak. ' +
      'Gerçek veri kaynağı (Binance/Matriks/Alpaca) kullanın. Boş ticks döndürülüyor.'
    );
    return;
  }
}

export const orderflowEngine = new OrderflowEngine();
