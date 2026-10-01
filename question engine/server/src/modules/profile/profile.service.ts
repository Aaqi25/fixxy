import { BadRequestError, UnauthorizedError } from '../auth/auth.service';
import { profileRepository, ProfileRepository } from './profile.repository';
import {
  LEARNING_LEVELS,
  LEARNING_STYLES,
  LearningLevel,
  LearningStyle,
  StudentProfileDto,
  SUPPORTED_LANGUAGES,
  UpdateProfileInput,
} from './profile.types';

export class ProfileService {
  constructor(private readonly repo: ProfileRepository = profileRepository) {}

  /**
   * Validates and sanitizes update profile input.
   * Throws BadRequestError (400) if any validation constraint fails.
   */
  validateUpdateInput(input: UpdateProfileInput): {
    displayName: string;
    bio: string | null;
    learningLevel: LearningLevel;
    learningGoal: string | null;
    preferredLearningStyle: LearningStyle;
    preferredLanguage: string;
    avatarUrl: string | null;
  } {
    const errors: Record<string, string> = {};

    // 1. displayName: required, trimmed, 1-100 characters
    if (input.displayName === undefined || input.displayName === null) {
      errors.displayName = 'Display name is required';
    } else if (typeof input.displayName !== 'string') {
      errors.displayName = 'Display name must be a string';
    } else {
      const trimmed = input.displayName.trim();
      if (trimmed.length === 0) {
        errors.displayName = 'Display name cannot be blank';
      } else if (trimmed.length > 100) {
        errors.displayName = 'Display name cannot exceed 100 characters';
      }
    }

    // 2. bio: optional, string or null, max 500 characters
    let bio: string | null = null;
    if (input.bio !== undefined && input.bio !== null) {
      if (typeof input.bio !== 'string') {
        errors.bio = 'Bio must be a string';
      } else {
        const trimmed = input.bio.trim();
        if (trimmed.length > 500) {
          errors.bio = 'Bio cannot exceed 500 characters';
        } else {
          bio = trimmed.length > 0 ? trimmed : null;
        }
      }
    }

    // 3. learningLevel: required/provided, must match allowed enum
    let learningLevel: LearningLevel = 'BEGINNER';
    if (input.learningLevel === undefined || input.learningLevel === null) {
      errors.learningLevel = 'Learning level is required';
    } else if (
      typeof input.learningLevel !== 'string' ||
      !LEARNING_LEVELS.includes(input.learningLevel as LearningLevel)
    ) {
      errors.learningLevel = `Learning level must be one of: ${LEARNING_LEVELS.join(', ')}`;
    } else {
      learningLevel = input.learningLevel as LearningLevel;
    }

    // 4. learningGoal: optional, string or null, max 500 characters
    let learningGoal: string | null = null;
    if (input.learningGoal !== undefined && input.learningGoal !== null) {
      if (typeof input.learningGoal !== 'string') {
        errors.learningGoal = 'Learning goal must be a string';
      } else {
        const trimmed = input.learningGoal.trim();
        if (trimmed.length > 500) {
          errors.learningGoal = 'Learning goal cannot exceed 500 characters';
        } else {
          learningGoal = trimmed.length > 0 ? trimmed : null;
        }
      }
    }

    // 5. preferredLearningStyle: required/provided, must match allowed enum
    let preferredLearningStyle: LearningStyle = 'TEXT';
    if (
      input.preferredLearningStyle === undefined ||
      input.preferredLearningStyle === null
    ) {
      errors.preferredLearningStyle = 'Preferred learning style is required';
    } else if (
      typeof input.preferredLearningStyle !== 'string' ||
      !LEARNING_STYLES.includes(input.preferredLearningStyle as LearningStyle)
    ) {
      errors.preferredLearningStyle = `Preferred learning style must be one of: ${LEARNING_STYLES.join(', ')}`;
    } else {
      preferredLearningStyle = input.preferredLearningStyle as LearningStyle;
    }

    // 6. preferredLanguage: required/provided, must be supported language
    let preferredLanguage = 'English';
    if (
      input.preferredLanguage === undefined ||
      input.preferredLanguage === null
    ) {
      errors.preferredLanguage = 'Preferred language is required';
    } else if (typeof input.preferredLanguage !== 'string') {
      errors.preferredLanguage = 'Preferred language must be a string';
    } else {
      const trimmed = input.preferredLanguage.trim();
      const matched = SUPPORTED_LANGUAGES.find(
        (lang) => lang.toLowerCase() === trimmed.toLowerCase()
      );
      if (!matched) {
        errors.preferredLanguage = `Preferred language must be one of: ${SUPPORTED_LANGUAGES.join(', ')}`;
      } else {
        preferredLanguage = matched;
      }
    }

    // 7. avatarUrl: optional, string or null, valid URL format if provided
    let avatarUrl: string | null = null;
    if (input.avatarUrl !== undefined && input.avatarUrl !== null) {
      if (typeof input.avatarUrl !== 'string') {
        errors.avatarUrl = 'Avatar URL must be a string';
      } else {
        const trimmed = input.avatarUrl.trim();
        if (trimmed.length > 0) {
          if (trimmed.length > 2048) {
            errors.avatarUrl = 'Avatar URL cannot exceed 2048 characters';
          } else {
            try {
              const url = new URL(trimmed);
              if (url.protocol !== 'http:' && url.protocol !== 'https:') {
                errors.avatarUrl = 'Avatar URL must use http or https';
              } else {
                avatarUrl = trimmed;
              }
            } catch {
              errors.avatarUrl = 'Avatar URL must be a valid URL';
            }
          }
        }
      }
    }

    if (Object.keys(errors).length > 0) {
      throw new BadRequestError('Invalid profile data', errors);
    }

    return {
      displayName: (input.displayName as string).trim(),
      bio,
      learningLevel,
      learningGoal,
      preferredLearningStyle,
      preferredLanguage,
      avatarUrl,
    };
  }

  /**
   * Retrieves profile for the authenticated student.
   * If no profile exists yet, safely creates a default profile.
   */
  async getProfile(
    studentId: string,
    defaultName: string = 'Student'
  ): Promise<StudentProfileDto> {
    if (!studentId) {
      throw new UnauthorizedError('Authentication required');
    }

    let profile = await this.repo.findByStudentId(studentId);
    if (!profile) {
      // Safe default initialization on first access
      profile = await this.repo.createProfile({
        studentId,
        displayName: defaultName.trim() || 'Student',
        learningLevel: 'BEGINNER',
        preferredLearningStyle: 'TEXT',
        preferredLanguage: 'English',
      });
    }

    return this.repo.toDto(profile);
  }

  /**
   * Updates profile for the authenticated student.
   * Student identity is strictly derived from the authenticated session (studentId parameter),
   * preventing any browser manipulation or IDOR.
   */
  async updateProfile(
    studentId: string,
    input: UpdateProfileInput
  ): Promise<StudentProfileDto> {
    if (!studentId) {
      throw new UnauthorizedError('Authentication required');
    }

    const validated = this.validateUpdateInput(input);

    // Ensure profile row exists before updating
    let profile = await this.repo.findByStudentId(studentId);
    if (!profile) {
      profile = await this.repo.createProfile({
        studentId,
        displayName: validated.displayName,
        bio: validated.bio,
        learningLevel: validated.learningLevel,
        learningGoal: validated.learningGoal,
        preferredLearningStyle: validated.preferredLearningStyle,
        preferredLanguage: validated.preferredLanguage,
        avatarUrl: validated.avatarUrl,
      });
      return this.repo.toDto(profile);
    }

    const updated = await this.repo.updateProfile(studentId, validated);
    if (!updated) {
      throw new BadRequestError('Unable to update profile');
    }

    return this.repo.toDto(updated);
  }
}

export const profileService = new ProfileService();
