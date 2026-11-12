// shared/types/gateway.ts
/**
 * 6. SİSTEM, AĞ VE KULLANICI ARAYÜZÜ MODÜLLERİ - GATEWAY
 * Ağ geçidi istek yükleri ve evrensel yanıt şemalarını tanımlar.
 */

export interface GatewayRequestPayload {
  market_type: string;
  ticker: string;
  timeframe?: string;
  includeOrderbook?: boolean;
}

export interface GatewayResponseSchema<T = any> {
  success: boolean;
  status: string;
  data?: T;
  error?: string;
  latencyMs: number;
  timestamp: string;
}
