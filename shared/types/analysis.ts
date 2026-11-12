// shared/types/analysis.ts

export interface TimeframeReturnItem {
  period: string;
  returnPct: number | null;
  direction: 'UP' | 'DOWN' | 'FLAT';
}

export interface TimeframeDecisionItem {
  period: string;
  decision: string;
  confidence: number | null;
  score: number | null;
}

export interface FormationConflictItem {
  name: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  description: string;
}

export interface FinalAnalysis {
  timeframesPositive: number | null;
  timeframeReturns: TimeframeReturnItem[];
  timeframeDecisions: TimeframeDecisionItem[];
  formation: {
    conflicts: FormationConflictItem[];
    activePattern?: string;
    cubeScore?: number | null;
  };
  composite: {
    score: number | null;
    verdict: string;
    confidence: number | null;
    nonLinearAmplifier: number | null;
  };
  executiveSummary?: string;
}
