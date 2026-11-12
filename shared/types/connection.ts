// shared/types/connection.ts
/**
 * 6. SİSTEM, AĞ VE KULLANICI ARAYÜZÜ MODÜLLERİ - CONNECTION
 * Canlı bağlantı durumu (CONNECTED|RECONNECTING|DISCONNECTED) ve yeniden bağlanma ayarlarını tanımlar.
 */

export type ConnectionStatus = 'CONNECTED' | 'RECONNECTING' | 'DISCONNECTED';

export interface ReconnectionConfig {
  maxRetries: number;
  initialBackoffMs: number;
  maxBackoffMs: number;
  heartbeatIntervalMs: number;
}
