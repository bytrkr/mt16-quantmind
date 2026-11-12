// src/services/providers/index.ts
/**
 * OPENBB PLATFORM PROVIDERS INDEX (index.ts)
 * -------------------------------------------
 * Tek dosya ile yeni provider ekleme mimarisi (Single-file provider extension pattern).
 * Her yeni provider kendi dosyasını oluşturur ve providerRegistry'ye otomatik kaydeder.
 */

import { providerRegistry } from './providerRegistry';
import './yahooProvider';
import './tradingViewScreenerProvider';

export * from './providerRegistry';
export * from './yahooProvider';
export * from './tradingViewScreenerProvider';

export { providerRegistry };
