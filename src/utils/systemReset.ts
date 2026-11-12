// src/utils/systemReset.ts
/**
 * MT16 Kuant Terminali - Sistem Bakım, Önbellek Temizleme ve Durum Sıfırlama Servisi
 * Veri Zehirlenmesi (Data Poisoning) koruması:
 * - LocalStorage ve SessionStorage'daki tüm eski kararları, alarmları ve sahte anomali kayıtlarını temizler.
 * - Tarayıcı önbelleğinde kalan eski Stop-Loss ihlallerini ve tetikleme kayıtlarını siler.
 * - İlk açılışta otomatik "State Reset" gerçekleştirir.
 */

import { AnomalyHistoryBuffer } from '../services/anomalies/anomalyHistoryBuffer';
import { smartAlertDaemon } from '../services/smartAlertDaemon';
import { NotificationDaemon } from '../services/notificationDaemon';
import { marketGateway } from '../services/marketGateway';

export const SYSTEM_CLEAN_VERSION = '2026_10_29_v2_clean_neutral';

export interface ResetReport {
  timestamp: string;
  clearedStorageKeys: string[];
  clearedDaemons: string[];
  status: 'CLEAN' | 'ERROR';
}

/**
 * Tarayıcı depolamasını ve servis belleklerini tamamen sıfırlar
 */
export function performSystemStateReset(): ResetReport {
  const clearedStorageKeys: string[] = [];
  const clearedDaemons: string[] = [];

  if (typeof window !== 'undefined') {
    try {
      // 1. LocalStorage Temizliği
      const keysToPurge: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;

        // Eski bistapp anahtarlarını temizle veya mt16'ya geçir
        if (
          key.startsWith('mt16_') ||
          key.startsWith('bistapp_') ||
          key.startsWith('bist-app_') ||
          key.startsWith('bist_') ||
          key === 'userWeights' ||
          key.includes('anomaly') ||
          key.includes('decision') ||
          key.includes('alert')
        ) {
          keysToPurge.push(key);
        }
      }

      for (const k of keysToPurge) {
        // Eğer bistapp token veya auth varsa mt16_user_token olarak kopyala
        if (k.includes('bistapp') && k.includes('token')) {
          const val = localStorage.getItem(k);
          if (val) localStorage.setItem('mt16_user_token', val);
        }
        localStorage.removeItem(k);
        clearedStorageKeys.push(k);
      }

      // 2. SessionStorage Temizliği
      sessionStorage.clear();

      // 3. Yeni temizlik sürüm damgasını yaz
      localStorage.setItem('mt16_clean_version', SYSTEM_CLEAN_VERSION);
    } catch (err) {
      console.warn('[SystemReset] Storage clean error:', err);
    }
  }

  // 4. Servis Hafızalarını Sıfırla
  try {
    AnomalyHistoryBuffer.clearAllHistory();
    clearedDaemons.push('AnomalyHistoryBuffer');
  } catch {}

  try {
    smartAlertDaemon.clearHistory();
    clearedDaemons.push('smartAlertDaemon');
  } catch {}

  try {
    NotificationDaemon.clearHistory();
    clearedDaemons.push('NotificationDaemon');
  } catch {}

  try {
    marketGateway.resetState();
    clearedDaemons.push('marketGateway');
  } catch {}

  console.info('[SystemReset] Sistem tüm eski sahte/mock kayıtlardan arındırıldı. Durum: NÖTR/BEKLE.');

  return {
    timestamp: new Date().toISOString(),
    clearedStorageKeys,
    clearedDaemons,
    status: 'CLEAN',
  };
}

/**
 * Uygulama başlangıcında sürüm kontrolü yaparak otomatik temizlik çalıştırır
 */
export function autoCheckAndRunSystemReset(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const currentVer = localStorage.getItem('mt16_clean_version');
    if (currentVer !== SYSTEM_CLEAN_VERSION) {
      performSystemStateReset();
      return true;
    }
  } catch {}
  return false;
}
