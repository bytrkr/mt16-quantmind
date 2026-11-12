// BIST KAP Public Disclosure Impact Engine
export interface KapImpactResult {
  sentimentScore: number | null;
  note: string;
}

export function evaluateKapDisclosure(symbol: string): KapImpactResult {
  return {
    sentimentScore: null,
    note: "VERİ YOK, sebep: Matriks KAP canlı bildirim akışı tanımlı değil"
  };
}
