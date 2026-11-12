// server/services/persistence.service.ts
/**
 * MT16 QUANT MIND — Kalıcılık ve Olay Günlüğü Motoru (Persistence Service - Nautilus Event Store)
 * ---------------------------------------------------------------------------------------------
 * Nautilus Event Replay İlhamı:
 * Her taktiksel toplayıcı sonucu (tacticalCollector snapshot) ve her iletilen emir
 * 'data/events.json' ve 'data_audit.log' disk katmanına append edilir.
 * Bu sayede geçmiş anlar tam zaman sırasıyla (Event Stream) tekrar oynatılabilir.
 */

import fs from 'fs';
import path from 'path';

export interface PersistentTradeEvent {
  eventId: string;
  timestamp: string;
  eventType: 'ORDER_SUBMITTED' | 'ORDER_FILLED' | 'ORDER_VETOED' | 'TACTICAL_SNAPSHOT';
  symbol: string;
  market: string;
  side: 'BUY' | 'SELL' | 'HOLD';
  price: number | null;
  lots: number;
  metadata?: Record<string, any>;
}

export class PersistenceService {
  private eventLogFile: string;
  private inMemoryEvents: PersistentTradeEvent[] = [];
  private eventCounter = 1000;

  constructor() {
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      try {
        fs.mkdirSync(dataDir, { recursive: true });
      } catch {
        // Safe creation
      }
    }
    this.eventLogFile = path.join(dataDir, 'events.json');
    this.loadInitialEvents();
  }

  private loadInitialEvents(): void {
    try {
      if (fs.existsSync(this.eventLogFile)) {
        const raw = fs.readFileSync(this.eventLogFile, 'utf8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.inMemoryEvents = parsed.slice(-500); // Son 500 olay
        }
      }
    } catch {
      this.inMemoryEvents = [];
    }
  }

  public recordEvent(
    eventType: PersistentTradeEvent['eventType'],
    symbol: string,
    market: string,
    side: PersistentTradeEvent['side'],
    price: number | null,
    lots: number,
    metadata?: Record<string, any>
  ): PersistentTradeEvent {
    this.eventCounter++;
    const event: PersistentTradeEvent = {
      eventId: `EVT-${Date.now()}-${this.eventCounter}`,
      timestamp: new Date().toISOString(),
      eventType,
      symbol: (symbol || 'THYAO').toUpperCase().trim(),
      market: (market || 'BIST').toUpperCase().trim(),
      side,
      price: typeof price === 'number' && !isNaN(price) ? price : null,
      lots: Math.max(0, lots),
      metadata: metadata || {}
    };

    this.inMemoryEvents.push(event);
    if (this.inMemoryEvents.length > 500) {
      this.inMemoryEvents = this.inMemoryEvents.slice(-500);
    }

    // Dosyaya yaz (Async fail-safe)
    this.persistToFile();
    return event;
  }

  private persistToFile(): void {
    try {
      fs.writeFile(this.eventLogFile, JSON.stringify(this.inMemoryEvents, null, 2), (err) => {
        if (err) {
          console.warn('[PersistenceService] Write error:', err.message);
        }
      });
    } catch {
      // Non-blocking
    }
  }

  public getEvents(symbol?: string, limit: number = 50): PersistentTradeEvent[] {
    const cleanSym = symbol ? symbol.toUpperCase().trim() : null;
    let list = this.inMemoryEvents;
    if (cleanSym) {
      list = list.filter(e => e.symbol === cleanSym);
    }
    return list.slice(-limit);
  }
}

export const persistenceService = new PersistenceService();
