import { query } from '../../config/db';
import {
  LearningLevel,
  LearningStyle,
  StudentProfileDto,
  StudentProfileRow,
} from './profile.types';

export class ProfileRepository {
  /**
   * Retrieves a student profile by authenticated studentId.
   */
  async findByStudentId(studentId: string): Promise<StudentProfileRow | null> {
    const res = await query<StudentProfileRow>(
      `SELECT id, student_id, display_name, bio, learning_level, learning_goal,
              preferred_learning_style, preferred_language, avatar_url, created_at, updated_at
       FROM student_profiles
       WHERE student_id = $1`,
      [studentId]
    );
    return res.rows[0] ?? null;
  }

  /**
   * Creates a default or explicit student profile.
   */
  async createProfile(data: {
    studentId: string;
    displayName: string;
    bio?: string | null;
    learningLevel?: string;
    learningGoal?: string | null;
    preferredLearningStyle?: string;
    preferredLanguage?: string;
    avatarUrl?: string | null;
  }): Promise<StudentProfileRow> {
    const res = await query<StudentProfileRow>(
      `INSERT INTO student_profiles (
         student_id, display_name, bio, learning_level, learning_goal,
         preferred_learning_style, preferred_language, avatar_url, created_at, updated_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
       ON CONFLICT (student_id) DO UPDATE
       SET display_name = EXCLUDED.display_name,
           updated_at = NOW()
       RETURNING id, student_id, display_name, bio, learning_level, learning_goal,
                 preferred_learning_style, preferred_language, avatar_url, created_at, updated_at`,
      [
        data.studentId,
        data.displayName,
        data.bio ?? null,
        data.learningLevel ?? 'BEGINNER',
        data.learningGoal ?? null,
        data.preferredLearningStyle ?? 'TEXT',
        data.preferredLanguage ?? 'English',
        data.avatarUrl ?? null,
      ]
    );
    return res.rows[0];
  }

  /**
   * Updates an existing profile by studentId.
   * Parameterized query ensures safe execution and student-level isolation.
   */
  async updateProfile(
    studentId: string,
    data: {
      displayName: string;
      bio: string | null;
      learningLevel: string;
      learningGoal: string | null;
      preferredLearningStyle: string;
      preferredLanguage: string;
      avatarUrl: string | null;
    }
  ): Promise<StudentProfileRow | null> {
    const res = await query<StudentProfileRow>(
      `UPDATE student_profiles
       SET display_name = $2,
           bio = $3,
           learning_level = $4,
           learning_goal = $5,
           preferred_learning_style = $6,
           preferred_language = $7,
           avatar_url = $8,
           updated_at = NOW()
       WHERE student_id = $1
       RETURNING id, student_id, display_name, bio, learning_level, learning_goal,
                 preferred_learning_style, preferred_language, avatar_url, created_at, updated_at`,
      [
        studentId,
        data.displayName,
        data.bio,
        data.learningLevel,
        data.learningGoal,
        data.preferredLearningStyle,
        data.preferredLanguage,
        data.avatarUrl,
      ]
    );
    return res.rows[0] ?? null;
  }

  /**
   * Converts a database row to a clean StudentProfileDto, guaranteeing no internal secrets or sensitive columns leak.
   */
  toDto(row: StudentProfileRow): StudentProfileDto {
    return {
      displayName: row.display_name,
      bio: row.bio,
      learningLevel: row.learning_level as LearningLevel,
      learningGoal: row.learning_goal,
      preferredLearningStyle: row.preferred_learning_style as LearningStyle,
      preferredLanguage: row.preferred_language,
      avatarUrl: row.avatar_url,
    };
  }
}

export const profileRepository = new ProfileRepository();
