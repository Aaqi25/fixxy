// ============================================================
// FIXXY Module 4: Client Question Engine Types
// ============================================================

export type QuestionStage = 'PRACTICE' | 'RETRY' | 'TRANSFER';
export type QuestionDifficulty = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
export type SessionStatus = 'ACTIVE' | 'COMPLETED' | 'ABANDONED';

export interface QuestionOption {
  id: string;
  text: string;
  displayOrder: number;
}

export interface StudentQuestion {
  id: string;
  conceptId: string;
  conceptSlug?: string;
  conceptTitle?: string;
  stage: QuestionStage;
  difficulty: QuestionDifficulty;
  text: string;
  options: QuestionOption[];
}

export interface LearningSession {
  id: string;
  studentId: string;
  conceptId: string;
  conceptSlug?: string;
  conceptTitle?: string;
  currentStage: QuestionStage | string;
  status: SessionStatus;
  currentQuestionId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface QuestionResponse {
  question: StudentQuestion;
  session?: LearningSession;
}
