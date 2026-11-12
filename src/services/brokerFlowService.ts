// src/services/brokerFlowService.ts
/**
 * MT16 Kurumsal Akış Servisi (BrokerFlowService)
 * Kurumsal aracı kurum net lot akışını (AKD) ve BofA harici HHI yoğunlaşma indeksini analiz eder.
 * top3_broker_flow metriğini kurumsal kuant standartlarında yönetir.
 */

export interface BrokerItem {
  name: string;
  netLot: number;
  percentage?: number;
}

export interface BrokerFlowData {
  bofaNetLot: number | null;
  brokers: BrokerItem[];
  totalVolumeLot?: number | null;
}

export interface BrokerFlowAnalysis {
  top3NetLot: number | null;
  top3Brokers: BrokerItem[];
  hhi: number | null;
  flowRegime: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  dominantBroker: string;
  concentrationRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  formattedSummary: string;
  formattedFlow: string;
}

export class BrokerFlowService {
  /**
   * Aracı kurum net lot dağılımını analiz eder.
   * - Top 3 kurumun net alım/satım baskısını belirler.
   * - Herfindahl-Hirschman Index (HHI) ile piyasa yapıcı yoğunlaşmasını ölçer.
   */
  public static analyzeFlow(data: BrokerFlowData): BrokerFlowAnalysis {
    const brokers = [...(data.brokers || [])];

    // Eğer BofA ayrı verilmiş ve listede yoksa ekleyelim
    if (data.bofaNetLot !== undefined && data.bofaNetLot !== null && data.bofaNetLot !== 0) {
      const existingBofa = brokers.find((b) => b.name.toLowerCase().includes('bofa'));
      if (!existingBofa) {
        brokers.push({ name: 'Bank of America', netLot: data.bofaNetLot });
      }
    }

    if (brokers.length === 0) {
      const emptySummary = 'Kurumsal aracı kurum akışı nötr. Veri mevcut değil.';
      return {
        top3NetLot: null,
        top3Brokers: [],
        hhi: null,
        flowRegime: 'NEUTRAL',
        dominantBroker: 'Yok',
        concentrationRisk: 'LOW',
        formattedSummary: emptySummary,
        formattedFlow: emptySummary,
      };
    }

    // Mutlak net hacme göre sırala (en etkin kurumlar)
    const sortedByMagnitude = [...brokers].sort((a, b) => Math.abs(b.netLot) - Math.abs(a.netLot));
    const top3Brokers = sortedByMagnitude.slice(0, 3);
    const top3NetLot = top3Brokers.length > 0 ? top3Brokers.reduce((acc, curr) => acc + curr.netLot, 0) : null;

    // HHI (Herfindahl-Hirschman Index) Hesabı
    const totalAbsVolume = brokers.reduce((sum, b) => sum + Math.abs(b.netLot), 0);
    let hhi: number | null = null;
    
    if (totalAbsVolume > 0) {
      let hhiRaw = 0;
      for (const b of brokers) {
        const share = Math.abs(b.netLot) / totalAbsVolume;
        hhiRaw += share * share;
      }
      hhi = Number(hhiRaw.toFixed(4));
    }

    // Yoğunlaşma Riski Seviyesi
    let concentrationRisk: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
    if (hhi !== null) {
      if (hhi > 0.25) {
        concentrationRisk = 'HIGH';
      } else if (hhi >= 0.15) {
        concentrationRisk = 'MEDIUM';
      }
    }

    // Akış Rejimi
    let flowRegime: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
    if (top3NetLot !== null) {
      if (top3NetLot > 5000) {
        flowRegime = 'BULLISH';
      } else if (top3NetLot < -5000) {
        flowRegime = 'BEARISH';
      }
    }

    const dominantBroker = top3Brokers[0]?.name || 'Belirsiz';
    const top3Sign = (top3NetLot !== null && top3NetLot > 0) ? '+' : '';
    const formattedSummary = `Top 3 Net Lot: ${top3NetLot !== null ? `${top3Sign}${top3NetLot.toLocaleString('tr-TR')}` : '---'} | Lider: ${dominantBroker} | HHI: ${hhi !== null ? hhi : '---'} (${concentrationRisk} Yoğunlaşma)`;

    return {
      top3NetLot,
      top3Brokers,
      hhi,
      flowRegime,
      dominantBroker,
      concentrationRisk,
      formattedSummary,
      formattedFlow: formattedSummary,
    };
  }
}
