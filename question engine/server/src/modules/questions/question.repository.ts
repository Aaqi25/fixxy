import { pool } from '../../config/db';
import {
  QuestionEntity,
  QuestionOptionEntity,
  QuestionStage,
  QuestionDifficulty,
  StudentSafeQuestionDTO,
  StudentSafeOptionDTO,
  LearningSessionDTO,
} from './question.types';

export class QuestionRepository {
  /**
   * Find a concept by ID or Slug
   */
  async findConcept(idOrSlug: string): Promise<{ id: string; slug: string; title: string } | null> {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);
    const res = await pool.query(
      `
      SELECT id, slug, title 
      FROM concepts 
      WHERE (CASE WHEN $1 THEN id::text = $2 ELSE slug = $2 END)
        AND status = 'ACTIVE'
      LIMIT 1
      `,
      [isUuid, idOrSlug]
    );

    if (res.rows.length === 0) return null;
    return {
      id: res.rows[0].id,
      slug: res.rows[0].slug,
      title: res.rows[0].title,
    };
  }

  /**
   * Find a question by ID (Internal representation including correctness and misconceptions)
   */
  async findQuestionById(id: string): Promise<QuestionEntity | null> {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (!isUuid) return null;

    const qRes = await pool.query(
      `
      SELECT q.id, q.concept_id, q.slug, q.stage, q.question_text, q.difficulty,
             q.active, q.display_order, q.explanation, q.created_at, q.updated_at,
             c.slug as concept_slug, c.title as concept_title
      FROM questions q
      JOIN concepts c ON q.concept_id = c.id
      WHERE q.id = $1
      `,
      [id]
    );

    if (qRes.rows.length === 0) return null;
    const qRow = qRes.rows[0];

    const optRes = await pool.query(
      `
      SELECT qo.id, qo.question_id, qo.option_text, qo.misconception_id,
             qo.is_correct, qo.display_order, qo.created_at, qo.updated_at,
             m.code as misconception_code
      FROM question_options qo
      LEFT JOIN misconceptions m ON qo.misconception_id = m.id
      WHERE qo.question_id = $1
      ORDER BY qo.display_order ASC, qo.id ASC
      `,
      [id]
    );

    const options: QuestionOptionEntity[] = optRes.rows.map((row) => ({
      id: row.id,
      questionId: row.question_id,
      optionText: row.option_text,
      misconceptionId: row.misconception_id,
      misconceptionCode: row.misconception_code || null,
      isCorrect: row.is_correct,
      displayOrder: row.display_order,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return {
      id: qRow.id,
      conceptId: qRow.concept_id,
      conceptSlug: qRow.concept_slug,
      conceptTitle: qRow.concept_title,
      slug: qRow.slug,
      stage: qRow.stage as QuestionStage,
      questionText: qRow.question_text,
      difficulty: qRow.difficulty as QuestionDifficulty,
      active: qRow.active,
      displayOrder: qRow.display_order,
      explanation: qRow.explanation,
      options,
      createdAt: qRow.created_at,
      updatedAt: qRow.updated_at,
    };
  }

  /**
   * Find student-safe question by ID (strips all answer correctness, explanations, and misconception tags)
   */
  async findSafeQuestionById(id: string): Promise<StudentSafeQuestionDTO | null> {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (!isUuid) return null;

    const qRes = await pool.query(
      `
      SELECT q.id, q.concept_id, q.stage, q.question_text, q.difficulty,
             c.slug as concept_slug, c.title as concept_title
      FROM questions q
      JOIN concepts c ON q.concept_id = c.id
      WHERE q.id = $1 AND q.active = TRUE
      `,
      [id]
    );

    if (qRes.rows.length === 0) return null;
    const qRow = qRes.rows[0];

    const optRes = await pool.query(
      `
      SELECT id, option_text, display_order
      FROM question_options
      WHERE question_id = $1
      ORDER BY display_order ASC, id ASC
      `,
      [id]
    );

    const options: StudentSafeOptionDTO[] = optRes.rows.map((r) => ({
      id: r.id,
      text: r.option_text,
      displayOrder: r.display_order,
    }));

    return {
      id: qRow.id,
      conceptId: qRow.concept_id,
      conceptSlug: qRow.concept_slug,
      conceptTitle: qRow.concept_title,
      stage: qRow.stage as QuestionStage,
      difficulty: qRow.difficulty as QuestionDifficulty,
      text: qRow.question_text,
      options,
    };
  }

  /**
   * Find the next active, available question for a given concept and stage, excluding already used questions
   */
  async findAvailableQuestion(
    conceptId: string,
    stage: QuestionStage,
    excludeQuestionIds: string[] = []
  ): Promise<StudentSafeQuestionDTO | null> {
    let query = `
      SELECT q.id, q.concept_id, q.stage, q.question_text, q.difficulty,
             c.slug as concept_slug, c.title as concept_title
      FROM questions q
      JOIN concepts c ON q.concept_id = c.id
      WHERE q.concept_id = $1
        AND q.stage = $2
        AND q.active = TRUE
    `;

    const params: any[] = [conceptId, stage];

    if (excludeQuestionIds.length > 0) {
      query += ` AND q.id != ALL($3::uuid[])`;
      params.push(excludeQuestionIds);
    }

    query += ` ORDER BY q.display_order ASC, q.id ASC LIMIT 1`;

    const qRes = await pool.query(query, params);
    if (qRes.rows.length === 0) return null;

    const qRow = qRes.rows[0];
    const optRes = await pool.query(
      `
      SELECT id, option_text, display_order
      FROM question_options
      WHERE question_id = $1
      ORDER BY display_order ASC, id ASC
      `,
      [qRow.id]
    );

    const options: StudentSafeOptionDTO[] = optRes.rows.map((r) => ({
      id: r.id,
      text: r.option_text,
      displayOrder: r.display_order,
    }));

    return {
      id: qRow.id,
      conceptId: qRow.concept_id,
      conceptSlug: qRow.concept_slug,
      conceptTitle: qRow.concept_title,
      stage: qRow.stage as QuestionStage,
      difficulty: qRow.difficulty as QuestionDifficulty,
      text: qRow.question_text,
      options,
    };
  }

  /**
   * Get total count of active questions for a concept and stage
   */
  async countQuestions(conceptId: string, stage: QuestionStage): Promise<number> {
    const res = await pool.query(
      `
      SELECT COUNT(*)::int as count 
      FROM questions 
      WHERE concept_id = $1 AND stage = $2 AND active = TRUE
      `,
      [conceptId, stage]
    );
    return res.rows[0]?.count || 0;
  }

  /**
   * Create or fetch an active learning session for a student and concept
   */
  async createOrGetActiveSession(studentId: string, conceptId: string): Promise<LearningSessionDTO> {
    const existing = await pool.query(
      `
      SELECT s.id, s.student_id, s.concept_id, s.current_stage, s.status,
             s.current_question_id, s.created_at, s.updated_at,
             c.slug as concept_slug, c.title as concept_title
      FROM learning_sessions s
      JOIN concepts c ON s.concept_id = c.id
      WHERE s.student_id = $1 AND s.concept_id = $2 AND s.status = 'ACTIVE'
      ORDER BY s.created_at DESC
      LIMIT 1
      `,
      [studentId, conceptId]
    );

    if (existing.rows.length > 0) {
      const row = existing.rows[0];
      return {
        id: row.id,
        studentId: row.student_id,
        conceptId: row.concept_id,
        conceptSlug: row.concept_slug,
        conceptTitle: row.concept_title,
        currentStage: row.current_stage,
        status: row.status,
        currentQuestionId: row.current_question_id,
        createdAt: row.created_at.toISOString(),
        updatedAt: row.updated_at.toISOString(),
      };
    }

    // Create new session
    const insertRes = await pool.query(
      `
      INSERT INTO learning_sessions (student_id, concept_id, current_stage, stage, status, created_at, started_at, updated_at, metadata)
      VALUES ($1, $2, 'PRACTICE', 'PRACTICE', 'ACTIVE', NOW(), NOW(), NOW(), '{}'::jsonb)
      RETURNING id, student_id, concept_id, current_stage, status, current_question_id, created_at, updated_at
      `,
      [studentId, conceptId]
    );

    const row = insertRes.rows[0];
    const concept = await this.findConcept(conceptId);

    return {
      id: row.id,
      studentId: row.student_id,
      conceptId: row.concept_id,
      conceptSlug: concept?.slug || '',
      conceptTitle: concept?.title || '',
      currentStage: row.current_stage,
      status: row.status,
      currentQuestionId: row.current_question_id,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    };
  }

  /**
   * Find a session by its ID
   */
  async findSessionById(sessionId: string): Promise<LearningSessionDTO | null> {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sessionId);
    if (!isUuid) return null;

    const res = await pool.query(
      `
      SELECT s.id, s.student_id, s.concept_id, s.current_stage, s.status,
             s.current_question_id, s.created_at, s.updated_at,
             c.slug as concept_slug, c.title as concept_title
      FROM learning_sessions s
      JOIN concepts c ON s.concept_id = c.id
      WHERE s.id = $1
      `,
      [sessionId]
    );

    if (res.rows.length === 0) return null;
    const row = res.rows[0];

    return {
      id: row.id,
      studentId: row.student_id,
      conceptId: row.concept_id,
      conceptSlug: row.concept_slug,
      conceptTitle: row.concept_title,
      currentStage: row.current_stage,
      status: row.status,
      currentQuestionId: row.current_question_id,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    };
  }

  /**
   * Record question usage in session history
   */
  async recordQuestionUsage(sessionId: string, questionId: string, stage: QuestionStage): Promise<void> {
    await pool.query(
      `
      INSERT INTO session_question_history (session_id, question_id, stage, served_at)
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (session_id, question_id) DO NOTHING
      `,
      [sessionId, questionId, stage]
    );
  }

  /**
   * Get list of question IDs already served/used in a session
   */
  async getUsedQuestionIdsForSession(sessionId: string): Promise<string[]> {
    const res = await pool.query(
      `SELECT question_id FROM session_question_history WHERE session_id = $1`,
      [sessionId]
    );
    return res.rows.map((r) => r.question_id);
  }

  /**
   * Update session stage and current question
   */
  async updateSessionStageAndQuestion(
    sessionId: string,
    currentStage: string,
    questionId: string | null
  ): Promise<void> {
    await pool.query(
      `
      UPDATE learning_sessions
      SET current_stage = $2,
          current_question_id = $3,
          updated_at = NOW()
      WHERE id = $1
      `,
      [sessionId, currentStage, questionId]
    );
  }
}

export const questionRepository = new QuestionRepository();
