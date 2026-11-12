// src/services/anomalies/behavioralHerdingEngine.ts
/**
 * MT16 Davranışsal Finans & Sürü Psikolojisi Motoru (BehavioralHerdingEngine)
 * Hacim şoku (Volume Z-Score) ve resmi KAP bildirimi olmaksızın gelişen fiyat hareketlerini
 * analiz ederek "Sürü Psikolojisi / FOMO Riski" (Retail Herd Frenzy) seviyesini ölçer.
 */

export interface BehavioralHerdingInput {
  volumeZScore?: number;
  priceChangePct?: number;
  hasKapDisclosureLast24h?: boolean;
  socialHypeScore?: number;
  retailOrderRatioPct?: number;
}

export type HerdingLevel = 'NORMAL' | 'ELEVATED' | 'HIGH_FOMO' | 'EXTREME_RETAIL_HERD';

export interface BehavioralHerdingResult {
  isHerdingDetected: boolean;
  herdingLevel: HerdingLevel;
  fomoRiskScore: number;
  volumeZScore: number;
  priceChangePct: number;
  isKapBacked: boolean;
  divergenceLevel: 'NONE' | 'MODERATE' | 'CRITICAL';
  description: string;
}

export class BehavioralHerdingEngine {
  public static analyze(input?: BehavioralHerdingInput): BehavioralHerdingResult {
    const vZScoreRaw = input?.volumeZScore;
    const pChangeRaw = input?.priceChangePct;
    const kapRaw = input?.hasKapDisclosureLast24h;
    const hypeRaw = input?.socialHypeScore;
    const retailRatioRaw = input?.retailOrderRatioPct;

    const volumeZScore = vZScoreRaw !== null && vZScoreRaw !== undefined ? vZScoreRaw : 0;
    const priceChangePct = pChangeRaw !== null && pChangeRaw !== undefined ? pChangeRaw : 0;
    const hasKapDisclosureLast24h = kapRaw !== null && kapRaw !== undefined ? kapRaw : false;
    const socialHypeScore = hypeRaw !== null && hypeRaw !== undefined ? hypeRaw : 40;
    const retailOrderRatioPct = retailRatioRaw !== null && retailRatioRaw !== undefined ? retailRatioRaw : 50;

    const isVolumeSurge = volumeZScore >= 1.8;
    const isExtremeVolumeSurge = volumeZScore >= 2.5;
    const isSharpMove = Math.abs(priceChangePct) >= 3.0;

    let divergenceLevel: 'NONE' | 'MODERATE' | 'CRITICAL' = 'NONE';
    if (!hasKapDisclosureLast24h && isExtremeVolumeSurge && isSharpMove) {
      divergenceLevel = 'CRITICAL';
    } else if (!hasKapDisclosureLast24h && isVolumeSurge && Math.abs(priceChangePct) >= 2.0) {
      divergenceLevel = 'MODERATE';
    }

    const volumeComponent = Math.min(40, Math.max(0, volumeZScore * 14));
    const kapLackPenalty = !hasKapDisclosureLast24h ? 25 : 0;
    const priceMomentumComponent = Math.min(20, (Math.abs(priceChangePct) / 6) * 20);
    const retailComponent = Math.min(15, (retailOrderRatioPct / 100) * 10 + (socialHypeScore / 100) * 5);

    let rawScore = Math.round(volumeComponent + kapLackPenalty + priceMomentumComponent + retailComponent);
    if (hasKapDisclosureLast24h) {
      rawScore = Math.max(10, rawScore - 25);
    }
    const fomoRiskScore = Math.max(0, Math.min(100, rawScore));

    let herdingLevel: HerdingLevel = 'NORMAL';
    let isHerdingDetected = false;

    if (fomoRiskScore >= 75 || divergenceLevel === 'CRITICAL') {
      herdingLevel = 'EXTREME_RETAIL_HERD';
      isHerdingDetected = true;
    } else if (fomoRiskScore >= 55 || divergenceLevel === 'MODERATE') {
      herdingLevel = 'HIGH_FOMO';
      isHerdingDetected = true;
    } else if (fomoRiskScore >= 40) {
      herdingLevel = 'ELEVATED';
    }

    let description = 'Hacim ve fiyat akışı temel veri ve haber akışıyla uyumlu; sürü riski düşük.';

    if (herdingLevel === 'EXTREME_RETAIL_HERD') {
      description = `Haber akışı olmaksızın Z-Skor (+${volumeZScore.toFixed(2)}σ) ve %${priceChangePct.toFixed(1)} fiyat sıçraması: Aşırı perakende sürü psikolojisi (FOMO) ve tuzak riski!`;
    } else if (herdingLevel === 'HIGH_FOMO') {
      description = `Desteksiz hacim artışı (+${volumeZScore.toFixed(2)}σ). Perakende alım iştahı yükseliyor, geri çekilme ihtimali gözetilmeli.`;
    } else if (hasKapDisclosureLast24h && isVolumeSurge) {
      description = `Hacim sıçraması (+${volumeZScore.toFixed(2)}σ) resmi duyuruyla destekleniyor; kurumsal katalizör teyitli.`;
    }

    return {
      isHerdingDetected,
      herdingLevel,
      fomoRiskScore,
      volumeZScore: Number(volumeZScore.toFixed(2)),
      priceChangePct: Number(priceChangePct.toFixed(2)),
      isKapBacked: hasKapDisclosureLast24h,
      divergenceLevel,
      description,
    };
  }
}
