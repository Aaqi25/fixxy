import { pool } from '../../config/db';
import { QuestionDto, QuestionOptionDto, SessionDto } from './question.types';

export class QuestionRepository {
  /**
   * Find active questions for a concept slug, stripping answer key details.
   */
  async findQuestionsByConceptSlug(slug: string): Promise<QuestionDto[]> {
    const qRes = await pool.query(
      `SELECT q.id, q.concept_id, q.code, q.phase, q.prompt, q.difficulty,
              c.slug as concept_slug, c.title as concept_title
       FROM questions q
       JOIN concepts c ON q.concept_id = c.id
       WHERE c.slug = $1 AND q.is_active = TRUE
       ORDER BY q.difficulty ASC, q.created_at ASC`,
      [slug]
    );

    const questions: QuestionDto[] = [];

    for (const q of qRes.rows) {
      const optRes = await pool.query(
        `SELECT id, position, option_text
         FROM question_options
         WHERE question_id = $1
         ORDER BY position ASC`,
        [q.id]
      );

      questions.push({
        id: q.id,
        conceptId: q.concept_id,
        conceptSlug: q.concept_slug,
        conceptTitle: q.concept_title,
        code: q.code,
        phase: q.phase,
        prompt: q.prompt,
        difficulty: q.difficulty,
        options: optRes.rows.map((o: any): QuestionOptionDto => ({
          id: o.id,
          position: o.position,
          optionText: o.option_text,
        })),
      });
    }

    return questions;
  }

  /**
   * Find a single question by UUID as a safe DTO.
   */
  async findQuestionDtoById(questionId: string): Promise<QuestionDto | null> {
    const qRes = await pool.query(
      `SELECT q.id, q.concept_id, q.code, q.phase, q.prompt, q.difficulty,
              c.slug as concept_slug, c.title as concept_title
       FROM questions q
       JOIN concepts c ON q.concept_id = c.id
       WHERE q.id = $1 AND q.is_active = TRUE`,
      [questionId]
    );

    if (qRes.rows.length === 0) return null;
    const q = qRes.rows[0];

    const optRes = await pool.query(
      `SELECT id, position, option_text
       FROM question_options
       WHERE question_id = $1
       ORDER BY position ASC`,
      [q.id]
    );

    return {
      id: q.id,
      conceptId: q.concept_id,
      conceptSlug: q.concept_slug,
      conceptTitle: q.concept_title,
      code: q.code,
      phase: q.phase,
      prompt: q.prompt,
      difficulty: q.difficulty,
      options: optRes.rows.map((o: any): QuestionOptionDto => ({
        id: o.id,
        position: o.position,
        optionText: o.option_text,
      })),
    };
  }

  /**
   * Find or create active learning session for a student and concept.
   */
  async findOrCreateActiveSession(studentId: string, conceptId: string): Promise<SessionDto> {
    // Check for existing active session
    const existing = await pool.query(
      `SELECT id, student_id, concept_id, status, started_at
       FROM learning_sessions
       WHERE student_id = $1 AND concept_id = $2 AND status != 'complete'
       ORDER BY started_at DESC
       LIMIT 1`,
      [studentId, conceptId]
    );

    if (existing.rows.length > 0) {
      const row = existing.rows[0];
      return {
        id: row.id,
        studentId: row.student_id,
        conceptId: row.concept_id,
        status: row.status,
        startedAt: new Date(row.started_at).toISOString(),
      };
    }

    // Create new session
    const created = await pool.query(
      `INSERT INTO learning_sessions (student_id, concept_id, status, started_at, updated_at)
       VALUES ($1, $2, 'practice', NOW(), NOW())
       RETURNING id, student_id, concept_id, status, started_at`,
      [studentId, conceptId]
    );

    const row = created.rows[0];
    return {
      id: row.id,
      studentId: row.student_id,
      conceptId: row.concept_id,
      status: row.status,
      startedAt: new Date(row.started_at).toISOString(),
    };
  }
}

export const questionRepository = new QuestionRepository();
