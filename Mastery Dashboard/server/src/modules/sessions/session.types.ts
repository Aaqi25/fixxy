import { QuestionDto } from '../questions/question.types';

export type SessionStage = 'PRACTICE' | 'TEACHING' | 'RETRY' | 'TRANSFER' | 'RETEACHING' | 'COMPLETED';

export interface TeachingContent {
  misconceptionId?: string;
  misconceptionCode?: string;
  misconceptionTitle?: string;
  strategy: 'analogy' | 'counterexample' | 'first-principles' | 'step-by-step';
  explanation: string;
  hint: string;
  confidence: number;
  isReteach: boolean;
}

export interface SessionAttemptSummary {
  id: string;
  questionId: string;
  questionCode?: string;
  phase: string;
  isCorrect: boolean;
  attemptNumber: number;
  submittedAt: string;
}

export interface LearningSessionDto {
  id: string;
  studentId: string;
  conceptId: string;
  conceptSlug: string;
  conceptTitle: string;
  status: string;
  stage: SessionStage;
  startedAt: string;
  completedAt?: string | null;
  teaching?: TeachingContent;
  question?: QuestionDto;
  originalQuestion?: QuestionDto;
  history: SessionAttemptSummary[];
  isCompleted: boolean;
}

export interface AdvanceSessionRequest {
  targetStage?: 'RETRY' | 'TRANSFER';
}
