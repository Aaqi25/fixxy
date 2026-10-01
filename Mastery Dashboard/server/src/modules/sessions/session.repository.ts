import { pool } from '../../config/db';
import { QuestionDto, QuestionOptionDto } from '../questions/question.types';
import { SessionStage, SessionAttemptSummary } from './session.types';

export interface DbSessionRow {
  id: string;
  student_id: string;
  concept_id: string;
  concept_slug: string;
  concept_title: string;
  status: string;
  stage: SessionStage;
  current_question_id: string | null;
  metadata: any;
  started_at: string;
  completed_at: string | null;
}

export class SessionRepository {
  /**
   * Find session by UUID with concept details.
   */
  async findSessionById(sessionId: string): Promise<DbSessionRow | null> {
    const res = await pool.query(
      `SELECT s.id, s.student_id, s.concept_id, s.status,
              COALESCE(s.stage, s.status)::text as stage,
              s.current_question_id, s.metadata, s.started_at, s.completed_at,
              c.slug as concept_slug, c.title as concept_title
       FROM learning_sessions s
       JOIN concepts c ON s.concept_id = c.id
       WHERE s.id = $1`,
      [sessionId]
    );

    if (res.rows.length === 0) return null;
    return res.rows[0];
  }

  /**
   * Find active session for a student and concept slug.
   */
  async findActiveSessionByConceptSlug(studentId: string, slug: string): Promise<DbSessionRow | null> {
    const res = await pool.query(
      `SELECT s.id, s.student_id, s.concept_id, s.status,
              COALESCE(s.stage, s.status)::text as stage,
              s.current_question_id, s.metadata, s.started_at, s.completed_at,
              c.slug as concept_slug, c.title as concept_title
       FROM learning_sessions s
       JOIN concepts c ON s.concept_id = c.id
       WHERE s.student_id = $1 AND c.slug = $2 AND s.status != 'complete'
       ORDER BY s.started_at DESC
       LIMIT 1`,
      [studentId, slug]
    );

    if (res.rows.length === 0) return null;
    return res.rows[0];
  }

  /**
   * Find latest completed session for a student and concept slug (for session review).
   */
  async findLatestSessionByConceptSlug(studentId: string, slug: string): Promise<DbSessionRow | null> {
    const res = await pool.query(
      `SELECT s.id, s.student_id, s.concept_id, s.status,
              COALESCE(s.stage, s.status)::text as stage,
              s.current_question_id, s.metadata, s.started_at, s.completed_at,
              c.slug as concept_slug, c.title as concept_title
       FROM learning_sessions s
       JOIN concepts c ON s.concept_id = c.id
       WHERE s.student_id = $1 AND c.slug = $2
       ORDER BY s.started_at DESC
       LIMIT 1`,
      [studentId, slug]
    );

    if (res.rows.length === 0) return null;
    return res.rows[0];
  }

  /**
   * Create new learning session for student and concept.
   */
  async createSession(
    studentId: string,
    conceptId: string,
    initialStage: SessionStage = 'PRACTICE'
  ): Promise<DbSessionRow> {
    const status = initialStage === 'COMPLETED' ? 'complete' : initialStage.toLowerCase();
    const res = await pool.query(
      `INSERT INTO learning_sessions (student_id, concept_id, status, stage, started_at, updated_at, metadata)
       VALUES ($1, $2, $3, $4, NOW(), NOW(), '{}'::jsonb)
       RETURNING id, student_id, concept_id, status, stage, current_question_id, metadata, started_at, completed_at`,
      [studentId, conceptId, status, initialStage]
    );

    const s = res.rows[0];
    const cRes = await pool.query('SELECT slug, title FROM concepts WHERE id = $1', [conceptId]);
    const c = cRes.rows[0] || { slug: '', title: '' };

    return {
      ...s,
      concept_slug: c.slug,
      concept_title: c.title,
    };
  }

  /**
   * Update session stage, status, active question, and metadata.
   */
  async updateSessionStage(
    sessionId: string,
    stage: SessionStage,
    status?: string,
    currentQuestionId?: string | null,
    metadata?: any
  ): Promise<void> {
    const finalStatus = status || (stage === 'COMPLETED' ? 'complete' : stage.toLowerCase());
    await pool.query(
      `UPDATE learning_sessions
       SET stage = $2,
           status = $3,
           current_question_id = COALESCE($4, current_question_id),
           metadata = COALESCE($5, metadata),
           updated_at = NOW()
       WHERE id = $1`,
      [sessionId, stage, finalStatus, currentQuestionId !== undefined ? currentQuestionId : null, metadata ? JSON.stringify(metadata) : null]
    );
  }

  /**
   * Mark session as complete.
   */
  async markSessionComplete(sessionId: string): Promise<void> {
    await pool.query(
      `UPDATE learning_sessions
       SET stage = 'COMPLETED',
           status = 'complete',
           completed_at = NOW(),
           updated_at = NOW()
       WHERE id = $1`,
      [sessionId]
    );
  }

  /**
   * Find safe question DTO (without correct answers) by concept ID and phase.
   */
  async findQuestionByConceptAndPhase(conceptId: string, phase: string): Promise<QuestionDto | null> {
    const qRes = await pool.query(
      `SELECT q.id, q.concept_id, q.code, q.phase, q.prompt, q.difficulty,
              c.slug as concept_slug, c.title as concept_title
       FROM questions q
       JOIN concepts c ON q.concept_id = c.id
       WHERE q.concept_id = $1 AND q.phase = $2 AND q.is_active = TRUE
       ORDER BY q.created_at ASC
       LIMIT 1`,
      [conceptId, phase]
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
   * Find safe question DTO by question ID.
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
   * Find attempts belonging to a session in chronological order.
   */
  async findAttemptsForSession(sessionId: string): Promise<SessionAttemptSummary[]> {
    const res = await pool.query(
      `SELECT a.id, a.question_id, a.is_correct, a.attempt_number, a.submitted_at,
              COALESCE(a.phase, q.phase) as phase, q.code as question_code
       FROM attempts a
       JOIN questions q ON a.question_id = q.id
       WHERE a.session_id = $1
       ORDER BY a.submitted_at ASC`,
      [sessionId]
    );

    return res.rows.map((r: any) => ({
      id: r.id,
      questionId: r.question_id,
      questionCode: r.question_code,
      phase: r.phase,
      isCorrect: r.is_correct,
      attemptNumber: r.attempt_number,
      submittedAt: new Date(r.submitted_at).toISOString(),
    }));
  }

  /**
   * Lookup misconception code for a selected option.
   */
  async findOptionMisconceptionCode(optionId: string): Promise<{ code: string; title: string } | null> {
    const res = await pool.query(
      `SELECT m.code, m.title
       FROM question_options qo
       JOIN misconceptions m ON qo.misconception_id = m.id
       WHERE qo.id = $1`,
      [optionId]
    );

    if (res.rows.length === 0) return null;
    return res.rows[0];
  }
}

export const sessionRepository = new SessionRepository();
