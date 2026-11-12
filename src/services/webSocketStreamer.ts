// src/services/webSocketStreamer.ts
/**
 * MT16 Canlı Veri Akış Servisi (WebSocketStreamer)
 * Borsa İstanbul L2 derinlik verilerini ve anlık tick hareketlerini milisaniyelik gecikmeyle dinleyen servis.
 */

export interface TickData {
  symbol: string;
  price: number;
  volume: number;
  timestamp: number;
  bidPrice: number;
  askPrice: number;
}

export class WebSocketStreamer {
  private socket: WebSocket | null = null;
  private listeners: Map<string, (data: TickData) => void> = new Map();

  public connect(endpointUrl: string): void {
    try {
      this.socket = new WebSocket(endpointUrl);
      this.socket.onmessage = (event) => {
        try {
          const tick: TickData = JSON.parse(event.data);
          const callback = this.listeners.get(tick.symbol);
          if (callback) callback(tick);
        } catch {
          // Gelen paket ayrıştırma hatasını yut
        }
      };
      this.socket.onerror = (err) => {
        console.warn('WebSocket akış uyarısı:', err);
      };
    } catch (err) {
      console.error('WebSocket bağlantı hatası:', err);
    }
  }

  public subscribe(symbol: string, callback: (data: TickData) => void): void {
    this.listeners.set(symbol, callback);
  }

  public unsubscribe(symbol: string): void {
    this.listeners.delete(symbol);
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.listeners.clear();
  }
}
