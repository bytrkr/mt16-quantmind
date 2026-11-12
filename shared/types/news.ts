// shared/types/news.ts
/**
 * 4. DERİNLİK, TAKAS VE KURUMSAL AKIŞ MODÜLLERİ - NEWS
 * KAP bildirimleri, RSS haber akışları ve haber kategorilerini tanımlar.
 */

export type NewsCategory = 'KAP' | 'MACRO' | 'EARNINGS' | 'GENERAL' | 'WORLD';

export interface KAPEvent {
  id: string;
  ticker: string;
  title: string;
  category: NewsCategory;
  publishDate: string;
  impactScore: number;
  summary: string;
  url?: string;
}

export interface RSSFeedItem {
  id: string;
  title: string;
  source: string;
  publishedAt: string;
  category: NewsCategory;
  link: string;
  sentiment: number;
}
