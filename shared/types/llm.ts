// shared/types/llm.ts
/**
 * 3. YAPAY ZEKA, AJANLAR VE KONSEY MODÜLLERİ - LLM
 * LLM prompt şablonları ve doğal dil analiz çıktılarını tanımlar.
 */

export interface LLMPromptTemplate {
  templateId: string;
  name: string;
  systemPrompt: string;
  userPromptFormat: string;
  modelAlias: string;
  temperature?: number;
}

export interface NaturalLanguageAnalysisOutput {
  summary: string;
  keyInsights: string[];
  riskFactors: string[];
  executionPlan?: string;
  generatedAt: string;
}
