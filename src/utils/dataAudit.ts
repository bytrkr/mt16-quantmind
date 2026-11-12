// src/utils/dataAudit.ts
/**
 * ============================================================================
 * 🧠 MT16 QUANTMIND — VERİ AUDIT VE HATA LOGLAMA SİSTEMİ (dataAudit.ts)
 * ============================================================================
 *
 * QODI ANAYASA STANDARTLARI:
 * - Kural 1 (Null/Sahte Veri İzleme): Null veri nedenlerini ve servis hatalarını izler.
 * - Kural 2 (LocalStorage & Server Sync): Son 100 kaydı localStorage üzerinde saklar.
 * - Kural 3 (Kritik Hata Senkronizasyonu): Sunucuya sadece kritik hataları göndersin
 *   (dakikada en fazla 1 kez ve çevrimiçiyse).
 * - Kural 4 (Sessiz Hata Yönetimi): UI çökmesini önler, console.warn ile loglar.
 */

export interface DataAuditLogEntry {
  timestamp: string;
  source: string;
  ticker: string;
  field: string;
  reason: string;
  isCritical?: boolean;
}

const LOCAL_STORAGE_KEY = 'mt16_data_audit_logs';
let lastSyncTime = 0;
const SYNC_INTERVAL_MS = 60000; // Dakikada 1 kez sunucu senkronizasyonu

/**
 * Veri veya servis aksamalarını günlüğe kaydeder.
 */
export function logDataIssue(
  source: string,
  ticker: string,
  field: string,
  reason: string,
  isCritical: boolean = false
): void {
  const entry: DataAuditLogEntry = {
    timestamp: new Date().toISOString(),
    source,
    ticker,
    field,
    reason,
    isCritical,
  };

  console.warn(`[DATA AUDIT WARN] [${source}] [${ticker}] ${field}: ${reason}`);

  if (typeof window === 'undefined') return;

  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    const logs: DataAuditLogEntry[] = raw ? JSON.parse(raw) : [];
    logs.push(entry);
    // Son 100 kaydı tut
    const trimmed = logs.slice(-100);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // LocalStorage yazma hatalarında sessizce devam et
  }

  // Sunucuya kritik log gönderme (Dakikada 1 kez throttle ve çevrimiçi kontrolü)
  if (isCritical && typeof navigator !== 'undefined' && navigator.onLine) {
    const now = Date.now();
    if (now - lastSyncTime > SYNC_INTERVAL_MS) {
      lastSyncTime = now;
      fetch('/api/audit-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      }).catch(() => {});
    }
  }
}

export function getAuditLogs(): DataAuditLogEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function clearAuditLogs(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  } catch {}
}

export default {
  logDataIssue,
  getAuditLogs,
  clearAuditLogs,
};
