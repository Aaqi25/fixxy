export type DifficultyLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
export type ConceptStatus = 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
export type ContentType =
  | 'OVERVIEW'
  | 'KEY_IDEA'
  | 'EXAMPLE'
  | 'ANALOGY'
  | 'COMMON_MISTAKE'
  | 'SUMMARY';

export interface ConceptRow {
  id: string;
  slug: string;
  title: string;
  short_description: string;
  description: string;
  difficulty_level: DifficultyLevel;
  estimated_minutes: number;
  learning_objective: string;
  status: ConceptStatus;
  display_order: number;
  created_at: Date;
  updated_at: Date;
}

export interface ConceptPrerequisiteRow {
  concept_id: string;
  prerequisite_concept_id: string;
  created_at: Date;
}

export interface MisconceptionRow {
  id: string;
  concept_id: string;
  code: string;
  title: string;
  description: string;
  guidance: string;
  active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface ConceptContentRow {
  id: string;
  concept_id: string;
  content_type: ContentType;
  title: string;
  body: string;
  display_order: number;
  active: boolean;
  created_at: Date;
  updated_at: Date;
}

// DTOs for API responses
export interface ConceptSummaryDTO {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  difficultyLevel: DifficultyLevel;
  estimatedMinutes: number;
  displayOrder: number;
}

export interface PrerequisiteReferenceDTO {
  id: string;
  slug: string;
  title: string;
}

export interface ConceptContentDTO {
  id: string;
  contentType: ContentType;
  title: string;
  body: string;
  displayOrder: number;
}

export interface MisconceptionDTO {
  id: string;
  code: string;
  title: string;
  description: string;
  guidance: string;
}

export interface ConceptDetailDTO {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  description: string;
  difficultyLevel: DifficultyLevel;
  estimatedMinutes: number;
  learningObjective: string;
  displayOrder: number;
  prerequisites: PrerequisiteReferenceDTO[];
  content: ConceptContentDTO[];
  misconceptions: MisconceptionDTO[];
}

export interface LearningPathNodeDTO {
  id: string;
  slug: string;
  title: string;
  difficultyLevel: DifficultyLevel;
  estimatedMinutes: number;
  displayOrder: number;
  prerequisites: Array<{
    id: string;
    slug: string;
    title: string;
  }>;
}

export interface ConceptsResponse {
  concepts: ConceptSummaryDTO[];
}

export interface ConceptDetailResponse {
  concept: ConceptDetailDTO;
}

export interface LearningPathResponse {
  path: LearningPathNodeDTO[];
}
