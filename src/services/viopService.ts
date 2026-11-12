// src/services/viopService.ts
/**
 * MT16 VIOP & Piyasa Yapıcı Servisi (ViopService)
 * Spot fiyat ile yakın vadeli VİOP kontratı arasındaki makası (Contango / Backwardation) hesaplar.
 */

export interface ViopBasisResult {
  spotPrice: number;
  viopPrice: number;
  basisPct: number;
  regime: 'CONTANGO' | 'BACKWARDATION' | 'NEUTRAL';
  formattedBasis: string;
}

export class ViopService {
  /**
   * Spot fiyat ve VIOP vadeli kontrat fiyatı arasındaki makası (basis) hesaplar.
   * Contango: Vadeli > Spot (basis > +0.15%)
   * Backwardation: Spot > Vadeli (basis < -0.15%)
   * Neutral: Makas [-0.15%, +0.15%] aralığında
   */
  public static calculateBasis(spotPrice: number | null, viopPrice: number | null): ViopBasisResult | null {
    if (spotPrice === null || viopPrice === null || spotPrice <= 0) {
      return null;
    }

    const basisPct = ((viopPrice - spotPrice) / spotPrice) * 100;
    let regime: 'CONTANGO' | 'BACKWARDATION' | 'NEUTRAL' = 'NEUTRAL';

    if (basisPct > 0.15) {
      regime = 'CONTANGO';
    } else if (basisPct < -0.15) {
      regime = 'BACKWARDATION';
    }

    const sign = basisPct > 0 ? '+' : '';
    const formattedBasis = `%${sign}${basisPct.toFixed(2)} (${regime})`;

    return {
      spotPrice,
      viopPrice,
      basisPct: Number(basisPct.toFixed(2)),
      regime,
      formattedBasis,
    };
  }
}
