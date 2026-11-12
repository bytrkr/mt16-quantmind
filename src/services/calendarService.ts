// src/services/calendarService.ts
/**
 * MT16 BistApp Kuant Terminali - Ekonomik Takvim & Temettü Veri Servisi
 * TCMB/FED faiz kararlarını, enflasyon verilerini ve şirket temettü/bedelsiz takvimini listeleyen adaptör.
 */

export interface CalendarEventItem {
  id: string;
  title: string;
  category: 'TCMB_FED' | 'MACRO' | 'DIVIDEND' | 'EARNINGS';
  date: string;
  time?: string;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  symbol?: string;
  expectedValue?: string;
  previousValue?: string;
  dividendAmountTL?: number;
  description: string;
}

const UPCOMING_CALENDAR_EVENTS: CalendarEventItem[] = [
  {
    id: 'EVT-101',
    title: 'TCMB Para Politikası Kurulu (PPK) Faiz Kararı',
    category: 'TCMB_FED',
    date: '2026-11-19',
    time: '14:00',
    impact: 'HIGH',
    expectedValue: '%45.00',
    previousValue: '%45.00',
    description: 'TCMB haftalık repo gösterge faiz oranı kararı ve politika metni açıklaması.',
  },
  {
    id: 'EVT-102',
    title: 'FED FOMC Faiz Oranı Kararı & Powell Basın Toplantısı',
    category: 'TCMB_FED',
    date: '2026-11-25',
    time: '22:00',
    impact: 'HIGH',
    expectedValue: '%4.75',
    previousValue: '%5.00',
    description: 'ABD Merkez Bankası faiz indirimi patikası ve küresel likidite projeksiyonu.',
  },
  {
    id: 'EVT-103',
    title: 'TÜİK Tüketici Fiyat Endeksi (TÜFE Enflasyon)',
    category: 'MACRO',
    date: '2026-11-03',
    time: '10:00',
    impact: 'HIGH',
    expectedValue: '%2.15 (Aylık)',
    previousValue: '%2.88 (Aylık)',
    description: 'Türkiye Ekim ayı resmi enflasyon oranı ve çekirdek göstergeler.',
  },
  {
    id: 'EVT-104',
    title: 'THYAO Nakit Temettü Dağıtımı (2. Taksit)',
    category: 'DIVIDEND',
    date: '2026-11-12',
    impact: 'MEDIUM',
    symbol: 'THYAO',
    dividendAmountTL: 6.20,
    description: 'Türk Hava Yolları hisse başı ₺6.20 brüt nakit temettü ödeme tarihi.',
  },
  {
    id: 'EVT-105',
    title: 'GARAN Temettü Ödemesi',
    category: 'DIVIDEND',
    date: '2026-11-20',
    impact: 'MEDIUM',
    symbol: 'GARAN',
    dividendAmountTL: 3.45,
    description: 'Garanti BBVA hisse başı ₺3.45 net nakit temettü ödeme günü.',
  },
  {
    id: 'EVT-106',
    title: 'NVDA 3. Çeyrek Bilanço & Yapay Zeka Gelir Raporu',
    category: 'EARNINGS',
    date: '2026-11-20',
    time: '23:30',
    impact: 'HIGH',
    symbol: 'NVDA',
    expectedValue: '$0.75 EPS',
    previousValue: '$0.68 EPS',
    description: 'NVIDIA kurumsal sunucu ve H100/Blackwell AI çip teslimat kârlılık açıklaması.',
  },
];

export async function fetchUpcomingEvents(): Promise<CalendarEventItem[]> {
  return UPCOMING_CALENDAR_EVENTS;
}

export default {
  fetchUpcomingEvents,
};
