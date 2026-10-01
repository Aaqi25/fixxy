/**
 * FIXXY Module 8 — Client Orchestration Types
 */

export type OrchestrationLearningState =
  | 'PRACTICE'
  | 'DIAGNOSING'
  | 'TEACHING'
  | 'RETRY'
  | 'TRANSFER'
  | 'RETEACHING'
  | 'COMPLETE'
  | 'COMPLETED';

export interface ConceptSummary {
  id: string;
  slug: string;
  title: string;
}

export interface QuestionOption {
  id: string;
  position: number;
  text: string;
  optionText?: string;
}

export interface SafeQuestion {
  id: string;
  conceptId: string;
  code: string;
  phase: 'practice' | 'retry' | 'transfer' | string;
  prompt: string;
  questionText?: string;
  difficulty: number;
  options: QuestionOption[];
}

export interface TeachingContent {
  misconceptionCode?: string;
  misconceptionId?: string;
  misconceptionTitle?: string;
  strategy: string;
  explanation: string;
  hint: string;
  confidence?: number;
  isReteach?: boolean;
}

export interface AttemptSummary {
  id: string;
  questionId: string;
  phase: string;
  isCorrect: boolean;
  attemptNumber: number;
  submittedAt: string;
}

export interface CreateSessionResponse {
  sessionId: string;
  state: OrchestrationLearningState;
  stage: OrchestrationLearningState;
  concept: ConceptSummary;
  question: SafeQuestion | null;
  history: AttemptSummary[];
  isCompleted: boolean;
}

export interface SessionRestorationResponse {
  sessionId: string;
  state: OrchestrationLearningState;
  stage: OrchestrationLearningState;
  concept: ConceptSummary;
  question?: SafeQuestion;
  originalQuestion?: SafeQuestion;
  teaching?: TeachingContent;
  history: AttemptSummary[];
  isCompleted: boolean;
  allowedActions: string[];
}

export interface SubmitAnswerPayload {
  sessionId: string;
  questionId: string;
  selectedOptionId: string;
}

export interface AnswerResponse {
  sessionId: string;
  state: OrchestrationLearningState;
  stage: OrchestrationLearningState;
  result: {
    isCorrect: boolean;
    correct?: boolean;
    attemptId: string;
  };
  teaching: TeachingContent | null;
  nextQuestion: SafeQuestion | null;
  isCompleted: boolean;
  masteryUpdated?: boolean;
}
