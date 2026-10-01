export interface QuestionOption {
  id: string;
  position: number;
  optionText: string;
  // NOTE: is_correct and misconception_id are NEVER exposed on the client
}

export interface PracticeQuestion {
  id: string;
  conceptId: string;
  conceptSlug?: string;
  conceptTitle?: string;
  code: string;
  phase: string;
  prompt: string;
  difficulty: number;
  options: QuestionOption[];
}

export interface SubmitAttemptPayload {
  questionId: string;
  selectedOptionId: string;
  sessionId?: string;
}

export interface AttemptResult {
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
}

export type SubmissionStatus = 'unanswered' | 'selected' | 'submitting' | 'submitted' | 'error';
