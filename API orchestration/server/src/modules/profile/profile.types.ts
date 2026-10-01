export const LEARNING_LEVELS = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'] as const;
export type LearningLevel = (typeof LEARNING_LEVELS)[number];

export const LEARNING_STYLES = [
  'TEXT',
  'VISUAL',
  'EXAMPLE_BASED',
  'ANALOGY',
  'PRACTICE',
] as const;
export type LearningStyle = (typeof LEARNING_STYLES)[number];

export const SUPPORTED_LANGUAGES = [
  'English',
  'Spanish',
  'French',
  'German',
  'Hindi',
  'Mandarin',
  'Japanese',
  'Portuguese',
] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export interface StudentProfileRow {
  id: string;
  student_id: string;
  display_name: string;
  bio: string | null;
  learning_level: string;
  learning_goal: string | null;
  preferred_learning_style: string;
  preferred_language: string;
  avatar_url: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface StudentProfileDto {
  displayName: string;
  bio: string | null;
  learningLevel: LearningLevel;
  learningGoal: string | null;
  preferredLearningStyle: LearningStyle;
  preferredLanguage: string;
  avatarUrl: string | null;
}

export interface UpdateProfileInput {
  displayName?: unknown;
  bio?: unknown;
  learningLevel?: unknown;
  learningGoal?: unknown;
  preferredLearningStyle?: unknown;
  preferredLanguage?: unknown;
  avatarUrl?: unknown;
  studentId?: unknown; // Explicitly handled to prevent authorization tampering
}

export interface ProfileResponse {
  profile: StudentProfileDto;
}

export interface UpdateProfileResponse {
  message: string;
  profile: StudentProfileDto;
}
