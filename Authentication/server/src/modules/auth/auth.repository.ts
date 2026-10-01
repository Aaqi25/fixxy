import { query, withClient } from '../../config/db';
import { SafeStudentDto, Student, StudentWithPassword } from './auth.types';

export class AuthRepository {
  /**
   * Finds a student by email (case-insensitive) including password_hash for authentication.
   */
  async findByEmail(email: string): Promise<StudentWithPassword | null> {
    const res = await query<StudentWithPassword>(
      `SELECT id, name, email, password_hash, created_at, updated_at
       FROM students
       WHERE lower(email) = lower($1)
       LIMIT 1`,
      [email]
    );
    return res.rows[0] ?? null;
  }

  /**
   * Finds a student by ID without returning password_hash.
   */
  async findById(id: string): Promise<Student | null> {
    const res = await query<Student>(
      `SELECT id, name, email, created_at, updated_at
       FROM students
       WHERE id = $1
       LIMIT 1`,
      [id]
    );
    return res.rows[0] ?? null;
  }

  /**
   * Creates a new student record and optionally initializes student_profiles if table exists.
   * Uses parameterized queries to prevent SQL injection.
   */
  async createStudent(name: string, email: string, passwordHash: string): Promise<Student> {
    return await withClient(async (client) => {
      const res = await client.query<Student>(
        `INSERT INTO students (name, email, password_hash)
         VALUES ($1, lower($2), $3)
         RETURNING id, name, email, created_at, updated_at`,
        [name, email, passwordHash]
      );
      const student = res.rows[0];

      // If student_profiles table exists from database foundation, create profile record
      try {
        await client.query(
          `INSERT INTO student_profiles (student_id, display_name)
           VALUES ($1, $2)
           ON CONFLICT (student_id) DO NOTHING`,
          [student.id, student.name]
        );
      } catch {
        // student_profiles might not exist yet if running standalone
      }

      return student;
    });
  }

  /**
   * Converts a student to a safe public DTO, guaranteeing password_hash is never included.
   */
  toSafeDto(student: Student): SafeStudentDto {
    return {
      id: student.id,
      name: student.name,
      email: student.email,
    };
  }
}

export const authRepository = new AuthRepository();
