/**
 * FIXXY Module 8 — API Orchestration Types & Contracts
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

export interface ConceptSummaryDto {
  id: string;
  slug: string;
  title: string;
}

export interface QuestionOptionDto {
  id: string;
  position: number;
  text: string;
  optionText?: string;
}

export interface QuestionSafeDto {
  id: string;
  conceptId: string;
  code: string;
  phase: 'practice' | 'retry' | 'transfer' | string;
  prompt: string;
  questionText?: string; // Aliased for client compatibility
  difficulty: number;
  options: QuestionOptionDto[];
}

export interface TeachingContentDto {
  misconceptionCode?: string;
  misconceptionId?: string;
  misconceptionTitle?: string;
  strategy: 'analogy' | 'counterexample' | 'first-principles' | 'step-by-step' | string;
  explanation: string;
  hint: string;
  confidence?: number;
  isReteach?: boolean;
}

export interface AttemptSummaryDto {
  id: string;
  questionId: string;
  phase: string;
  isCorrect: boolean;
  attemptNumber: number;
  submittedAt: string;
}

export interface CreateSessionRequest {
  conceptId?: string;
  conceptSlug?: string;
}

export interface CreateSessionResponse {
  sessionId: string;
  state: OrchestrationLearningState;
  stage: OrchestrationLearningState;
  concept: ConceptSummaryDto;
  question: QuestionSafeDto | null;
  history: AttemptSummaryDto[];
  isCompleted: boolean;
}

export interface SessionRestorationDto {
  sessionId: string;
  state: OrchestrationLearningState;
  stage: OrchestrationLearningState;
  concept: ConceptSummaryDto;
  question?: QuestionSafeDto;
  originalQuestion?: QuestionSafeDto;
  teaching?: TeachingContentDto;
  history: AttemptSummaryDto[];
  isCompleted: boolean;
  allowedActions: string[];
}

export interface AnswerRequest {
  sessionId: string;
  questionId: string;
  selectedOptionId: string;
}

export interface AnswerResultDto {
  isCorrect: boolean;
  correct?: boolean; // Aliased
  attemptId: string;
}

export interface AnswerResponse {
  sessionId: string;
  state: OrchestrationLearningState;
  stage: OrchestrationLearningState;
  result: AnswerResultDto;
  teaching: TeachingContentDto | null;
  nextQuestion: QuestionSafeDto | null;
  isCompleted: boolean;
  masteryUpdated?: boolean;
}

export interface AdvanceSessionRequest {
  targetStage?: 'RETRY' | 'TRANSFER';
}
