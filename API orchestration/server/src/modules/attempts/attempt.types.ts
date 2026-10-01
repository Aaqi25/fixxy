export interface SubmitAttemptRequest {
  questionId: string;
  selectedOptionId: string;
  sessionId?: string;
  // Security note: Any studentId or isCorrect properties in payload MUST be ignored/rejected
  studentId?: unknown;
  isCorrect?: unknown;
  correct?: unknown;
}

export interface AttemptRecord {
  id: string;
  studentId: string;
  questionId: string;
  selectedOptionId: string;
  sessionId: string | null;
  phase: string | null;
  isCorrect: boolean;
  attemptNumber: number;
  submittedAt: string;
}

export interface AttemptDto {
  id: string;
  questionId: string;
  selectedOptionId: string;
  sessionId?: string | null;
  isCorrect: boolean;
  attemptNumber: number;
  submittedAt: string;
}

export interface SubmitAttemptResponse {
  attempt: AttemptDto;
  result: {
    correct: boolean;
  };
  session?: {
    id: string;
    stage: string;
    status: string;
  };
}

export interface QuestionEntity {
  id: string;
  conceptId: string;
  code: string;
  phase: string;
  prompt: string;
  difficulty: number;
  isActive: boolean;
}

export interface QuestionOptionEntity {
  id: string;
  questionId: string;
  position: number;
  optionText: string;
  isCorrect: boolean;
  misconceptionId: string | null;
}

export interface LearningSessionEntity {
  id: string;
  studentId: string;
  conceptId: string;
  status: string;
  startedAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface CreateAttemptParams {
  studentId: string;
  questionId: string;
  selectedOptionId: string;
  sessionId?: string | null;
  isCorrect: boolean;
  attemptNumber: number;
  phase?: string | null;
}
