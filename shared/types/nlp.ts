// shared/types/nlp.ts
/**
 * 3. YAPAY ZEKA, AJANLAR VE KONSEY MODÜLLERİ - NLP
 * Duygu skorları (SentimentScore) ve KAP duygu etki analizini tanımlar.
 */

export type SentimentScore = number; // -1.0 ile +1.0 arası

export interface KAPSentimentImpact {
  eventId: string;
  ticker: string;
  headline: string;
  sentimentScore: SentimentScore;
  impactPoints: number;
  impactClassification: 'VERY_POSITIVE' | 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' | 'VERY_NEGATIVE';
  timestamp: string;
}
