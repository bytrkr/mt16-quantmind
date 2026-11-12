// shared/types/ui.ts
/**
 * 6. SİSTEM, AĞ VE KULLANICI ARAYÜZÜ MODÜLLERİ - UI
 * Düzen durumu (LayoutState), aktif sekme konfigürasyonu ve bileşen görünürlük haritalarını tanımlar.
 */

export interface LayoutState {
  isSidebarOpen: boolean;
  activeColumnLayout: '3-COLUMN' | '2-COLUMN' | 'FULL';
  themeMode: 'DARK' | 'LIGHT';
}

export interface ActiveTabConfig {
  activeTab: string;
  availableTabs: string[];
  defaultTab: string;
}

export type ComponentVisibilityMap = Record<string, boolean>;
