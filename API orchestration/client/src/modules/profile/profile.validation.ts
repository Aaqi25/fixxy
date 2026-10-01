import {
  LEARNING_LEVELS,
  LEARNING_STYLES,
  SUPPORTED_LANGUAGES,
  type LearningLevel,
  type LearningStyle,
  type ProfileFormData,
  type ProfileFormErrors,
  type SupportedLanguage,
} from './profile.types';


export function validateProfileForm(form: ProfileFormData): ProfileFormErrors {
  const errors: ProfileFormErrors = {};

  // Display Name
  const trimmedName = form.displayName.trim();
  if (!trimmedName) {
    errors.displayName = 'Display name is required';
  } else if (trimmedName.length > 100) {
    errors.displayName = 'Display name cannot exceed 100 characters';
  }

  // Bio
  if (form.bio && form.bio.length > 500) {
    errors.bio = 'Bio cannot exceed 500 characters';
  }

  // Learning Level
  if (!form.learningLevel) {
    errors.learningLevel = 'Learning level is required';
  } else if (!LEARNING_LEVELS.includes(form.learningLevel as LearningLevel)) {
    errors.learningLevel = 'Select a valid learning level';
  }

  // Learning Goal
  if (form.learningGoal && form.learningGoal.length > 500) {
    errors.learningGoal = 'Learning goal cannot exceed 500 characters';
  }

  // Preferred Learning Style
  if (!form.preferredLearningStyle) {
    errors.preferredLearningStyle = 'Preferred learning style is required';
  } else if (!LEARNING_STYLES.includes(form.preferredLearningStyle as LearningStyle)) {
    errors.preferredLearningStyle = 'Select a valid learning style';
  }

  // Preferred Language
  if (!form.preferredLanguage) {
    errors.preferredLanguage = 'Preferred language is required';
  } else if (!SUPPORTED_LANGUAGES.includes(form.preferredLanguage as SupportedLanguage)) {
    errors.preferredLanguage = 'Select a supported language';
  }

  // Avatar URL
  if (form.avatarUrl && form.avatarUrl.trim()) {
    const trimmedUrl = form.avatarUrl.trim();
    if (trimmedUrl.length > 2048) {
      errors.avatarUrl = 'Avatar URL cannot exceed 2048 characters';
    } else {
      try {
        const parsed = new URL(trimmedUrl);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
          errors.avatarUrl = 'Avatar URL must start with http:// or https://';
        }
      } catch {
        errors.avatarUrl = 'Please enter a valid web URL (e.g. https://example.com/avatar.jpg)';
      }
    }
  }

  return errors;
}
