// shared/types/matrix.ts
/**
 * 2. KUANT, SİNYAL VE ANOMALİ MODÜLLERİ - MATRIX
 * 9-Küp Matris durumu, Küp Uyum Oranı ve Matris kararlarını tanımlar.
 */

export type MatrixVerdict = 'AL' | 'SAT' | 'NÖTR' | 'KUVVETLİ AL' | 'KUVVETLİ SAT';

export type CubeUyumRatio = number; // 0.0 - 1.0 (veya yüzdelik oran)

export interface Matrix9CubeStatus {
  activeCubeCount: number;
  totalCubes: number;
  uyumRatio: CubeUyumRatio;
  verdict: MatrixVerdict;
  description: string;
  score: number;
}
