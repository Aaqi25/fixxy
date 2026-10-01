// ============================================================
// FIXXY Module 4: Question Engine Types
// ============================================================

export type QuestionStage = 'PRACTICE' | 'RETRY' | 'TRANSFER';
export type QuestionDifficulty = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
export type SessionStatus = 'ACTIVE' | 'COMPLETED' | 'ABANDONED';

// Student-Safe Option DTO — NEVER contains correctness or misconception mappings
export interface StudentSafeOptionDTO {
  id: string;
  text: string;
  displayOrder: number;
}

// Student-Safe Question DTO — Returned to the frontend
export interface StudentSafeQuestionDTO {
  id: string;
  conceptId: string;
  conceptSlug?: string;
  conceptTitle?: string;
  stage: QuestionStage;
  difficulty: QuestionDifficulty;
  text: string;
  options: StudentSafeOptionDTO[];
}

// Learning Session DTO
export interface LearningSessionDTO {
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

// Response structure for question retrieval
export interface QuestionResponse {
  question: StudentSafeQuestionDTO;
  session?: LearningSessionDTO;
}

// Internal Option Entity (Server-side ONLY)
export interface QuestionOptionEntity {
  id: string;
  questionId: string;
  optionText: string;
  misconceptionId: string | null;
  misconceptionCode?: string | null;
  isCorrect: boolean;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

// Internal Question Entity (Server-side ONLY)
export interface QuestionEntity {
  id: string;
  conceptId: string;
  conceptSlug?: string;
  conceptTitle?: string;
  slug: string;
  stage: QuestionStage;
  questionText: string;
  difficulty: QuestionDifficulty;
  active: boolean;
  displayOrder: number;
  explanation: string;
  options: QuestionOptionEntity[];
  createdAt: Date;
  updatedAt: Date;
}
