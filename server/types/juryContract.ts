/**
 * BistApp MT16 Kuant Jüri Karar Veri Sözleşmesi (TypeScript Single Source of Truth)
 * schemas/jury_decision_schema.json ve python/schemas/jury_contract.py ile %100 uyumludur.
 */

export type JuryVerdict = 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL';

/**
 * Ana jüri karar veri yapısı (CamelCase Canonical Form)
 */
export interface JuryDecisionPayload {
  /** Varlık kodu (Örn: THYAO, BTCUSDT) */
  ticker: string;
  
  /** Nihai jüri kararı */
  verdict: JuryVerdict;
  
  /** Karar güven skoru (0-100) */
  confidenceScore: number;
  
  /** Önerilen giriş fiyat bölgesi */
  entryZone: string;
  
  /** Hedef fiyat seviyesi */
  targetPrice: string;
  
  /** Zarar kes (Stop-loss) seviyesi */
  stopLoss: string;
  
  /** İşlem sırasında tetiklenen veya aktif olan kalkanlar */
  activeShields: string[];
  
  /** Jürinin detaylı karar gerekçesi */
  reasoning: string;
  
  /** Karar üretim zaman damgası (ISO 8601) */
  timestamp?: string;
}

/**
 * Yayıncıya gelen ham istek yapısı
 */
export interface PublisherBroadcastRequest extends Partial<JuryDecisionPayload> {
  ticker: string;
  verdict: JuryVerdict;
  // Gelen verilerde snake_case alias desteği için (Opsiyonel)
  confidence_score?: number;
  entry_zone?: string;
  target_price?: string;
  stop_loss?: string;
  active_shields?: string[];
}

/**
 * Yayıncı yanıt yapısı
 */
export interface PublisherBroadcastResponse {
  success: boolean;
  message: string;
  status?: string;
  ticker?: string;
  timestamp?: string;
  error?: string;
}
