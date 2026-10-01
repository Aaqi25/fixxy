export type LearningStage =
  | 'TEACHING'
  | 'RETRY_LOADING'
  | 'RETRY_READY'
  | 'RETRY_SUBMITTING'
  | 'RETRY_CORRECT'
  | 'RETRY_WRONG'
  | 'TRANSFER_LOADING'
  | 'TRANSFER_READY'
  | 'TRANSFER_SUBMITTING'
  | 'TRANSFER_PASS'
  | 'TRANSFER_FAIL'
  | 'RETEACHING'
  | 'COMPLETED'
  | 'ERROR';

export interface TeachingResponse {
  misconceptionId?: string;
  misconceptionCode?: string;
  misconceptionTitle?: string;
  strategy: 'analogy' | 'counterexample' | 'first-principles' | 'step-by-step';
  explanation: string;
  hint: string;
  confidence: number;
  isReteach: boolean;
}

export interface SafeQuestionOption {
  id: string;
  position: number;
  optionText: string;
}

export interface SafeQuestion {
  id: string;
  conceptId: string;
  conceptSlug?: string;
  conceptTitle?: string;
  code: string;
  phase: string;
  prompt: string;
  difficulty: number;
  options: SafeQuestionOption[];
}

export interface SessionAttemptRecord {
  id: string;
  questionId: string;
  questionCode?: string;
  phase: string;
  isCorrect: boolean;
  attemptNumber: number;
  submittedAt: string;
}

export interface RetryTransferSessionData {
  id: string;
  studentId: string;
  conceptId: string;
  conceptSlug: string;
  conceptTitle: string;
  status: string;
  stage: 'PRACTICE' | 'TEACHING' | 'RETRY' | 'TRANSFER' | 'RETEACHING' | 'COMPLETED';
  startedAt: string;
  completedAt?: string | null;
  teaching?: TeachingResponse;
  question?: SafeQuestion;
  originalQuestion?: SafeQuestion;
  history: SessionAttemptRecord[];
  isCompleted: boolean;
}

export interface SessionStateApiResponse {
  session: RetryTransferSessionData;
}

export interface SubmitRetryTransferPayload {
  questionId: string;
  selectedOptionId: string;
  sessionId: string;
}

export interface SubmitRetryTransferApiResponse {
  attempt: {
    id: string;
    questionId: string;
    selectedOptionId: string;
    sessionId?: string | null;
    isCorrect: boolean;
    attemptNumber: number;
    submittedAt: string;
  };
  result: {
    correct: boolean;
  };
  session?: {
    id: string;
    stage: string;
    status: string;
  };
}
