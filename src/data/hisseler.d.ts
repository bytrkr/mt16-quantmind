// src/data/hisseler.d.ts
export interface HisseRecord {
  kod: string;
  ad?: string;
  fiyat: number | null;
  degisim: number | null;
  status?: string;
  guncellemeZamani?: string;
}

export declare const HISSELER: Record<string, HisseRecord>;
export declare function updateHisselerFromAlpaca(priceMap: Record<string, any>): void;
export declare function getHisse(symbol: string): HisseRecord | null;
export default HISSELER;
