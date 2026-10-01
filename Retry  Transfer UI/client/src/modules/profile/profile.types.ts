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

export interface StudentProfile {
  displayName: string;
  bio: string | null;
  learningLevel: LearningLevel;
  learningGoal: string | null;
  preferredLearningStyle: LearningStyle;
  preferredLanguage: string;
  avatarUrl: string | null;
}

export interface ProfileFormData {
  displayName: string;
  bio: string;
  learningLevel: LearningLevel;
  learningGoal: string;
  preferredLearningStyle: LearningStyle;
  preferredLanguage: string;
  avatarUrl: string;
}

export interface ProfileFormErrors {
  displayName?: string;
  bio?: string;
  learningLevel?: string;
  learningGoal?: string;
  preferredLearningStyle?: string;
  preferredLanguage?: string;
  avatarUrl?: string;
  general?: string;
}

export interface ApiProfileResponse {
  profile: StudentProfile;
}

export interface ApiUpdateProfileResponse {
  message: string;
  profile: StudentProfile;
}
