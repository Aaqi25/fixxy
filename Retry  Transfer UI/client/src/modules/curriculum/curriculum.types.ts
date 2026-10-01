export type DifficultyLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

export type ContentType =
  | 'OVERVIEW'
  | 'KEY_IDEA'
  | 'EXAMPLE'
  | 'ANALOGY'
  | 'COMMON_MISTAKE'
  | 'SUMMARY';

export interface ConceptSummary {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  difficultyLevel: DifficultyLevel;
  estimatedMinutes: number;
  displayOrder: number;
}

export interface PrerequisiteReference {
  id: string;
  slug: string;
  title: string;
}

export interface ConceptContentItem {
  id: string;
  contentType: ContentType;
  title: string;
  body: string;
  displayOrder: number;
}

export interface MisconceptionItem {
  id: string;
  code: string;
  title: string;
  description: string;
  guidance: string;
}

export interface ConceptDetail {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  description: string;
  difficultyLevel: DifficultyLevel;
  estimatedMinutes: number;
  learningObjective: string;
  displayOrder: number;
  prerequisites: PrerequisiteReference[];
  content: ConceptContentItem[];
  misconceptions: MisconceptionItem[];
}

export interface LearningPathNode {
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

export interface ApiConceptsResponse {
  concepts: ConceptSummary[];
}

export interface ApiConceptDetailResponse {
  concept: ConceptDetail;
}

export interface ApiLearningPathResponse {
  path: LearningPathNode[];
}
