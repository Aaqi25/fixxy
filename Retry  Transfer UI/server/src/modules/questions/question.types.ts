export interface QuestionOptionDto {
  id: string;
  position: number;
  optionText: string;
  // NOTE: is_correct and misconception_id are NEVER exposed to the student
}

export interface QuestionDto {
  id: string;
  conceptId: string;
  conceptSlug?: string;
  conceptTitle?: string;
  code: string;
  phase: string;
  prompt: string;
  difficulty: number;
  options: QuestionOptionDto[];
}

export interface SessionDto {
  id: string;
  studentId: string;
  conceptId: string;
  status: string;
  startedAt: string;
}
