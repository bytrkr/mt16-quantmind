// shared/types/shortcuts.ts
/**
 * 6. SİSTEM, AĞ VE KULLANICI ARAYÜZÜ MODÜLLERİ - SHORTCUTS
 * Klavye kısayolları eylem haritası ve tuş bağlama tanımlarını içerir.
 */

export type ShortcutActionMap = Record<string, () => void>;

export interface ShortcutKeyBinding {
  keyCombination: string; // örn: 'Ctrl+B', 'Alt+C'
  actionId: string;
  description: string;
  targetMarket?: string;
}
