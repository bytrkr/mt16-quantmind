// shared/types/jury.ts
/**
 * 3. YAPAY ZEKA, AJANLAR VE KONSEY MODÜLLERİ - JURY
 * Çoklu Ajan Jüri kararları, ağırlık haritaları ve konsensüs özetlerini tanımlar.
 */

export type { JuryDecisionPayload, JuryVerdict } from '../../server/types/juryContract.js';

export type AgentWeightMap = Record<string, number>;

export interface MultiAgentJuryVerdict {
  agentId: string;
  agentName: string;
  decision: 'AL' | 'SAT' | 'PAS' | 'NÖTR';
  confidenceScore: number;
  reasoning: string;
  weight: number;
}

export interface JuryConsensusSummary {
  consensusAction: 'AL' | 'SAT' | 'NÖTR';
  overallScore: number;
  totalAgents: number;
  agreeingAgents: number;
  agentVerdicts: MultiAgentJuryVerdict[];
  weightMap: AgentWeightMap;
  isVetoed: boolean;
  isAnomalyRiskFilterTriggered?: boolean;
  anomalyFilterReason?: string;
  marketSpecificRiskAlert?: string;
  isFundamentalCatalyst?: boolean;
  catalystOverrideNote?: string;
}
