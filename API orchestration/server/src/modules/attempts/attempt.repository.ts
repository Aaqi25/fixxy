import { pool } from '../../config/db';
import {
  AttemptRecord,
  CreateAttemptParams,
  QuestionEntity,
  QuestionOptionEntity,
  LearningSessionEntity,
} from './attempt.types';

export class AttemptRepository {
  /**
   * Find a question by its UUID.
   */
  async findQuestionById(questionId: string): Promise<QuestionEntity | null> {
    const res = await pool.query(
      `SELECT id, concept_id, code, phase, prompt, difficulty, is_active
       FROM questions
       WHERE id = $1`,
      [questionId]
    );

    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return {
      id: row.id,
      conceptId: row.concept_id,
      code: row.code,
      phase: row.phase,
      prompt: row.prompt,
      difficulty: row.difficulty,
      isActive: row.is_active,
    };
  }

  /**
   * Find an option by its UUID, including authoritative is_correct flag.
   */
  async findOptionById(optionId: string): Promise<QuestionOptionEntity | null> {
    const res = await pool.query(
      `SELECT id, question_id, position, option_text, is_correct, misconception_id
       FROM question_options
       WHERE id = $1`,
      [optionId]
    );

    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return {
      id: row.id,
      questionId: row.question_id,
      position: row.position,
      optionText: row.option_text,
      isCorrect: Boolean(row.is_correct),
      misconceptionId: row.misconception_id ?? null,
    };
  }

  /**
   * Find a learning session by UUID.
   */
  async findSessionById(sessionId: string): Promise<LearningSessionEntity | null> {
    const res = await pool.query(
      `SELECT id, student_id, concept_id, status, started_at, updated_at, completed_at
       FROM learning_sessions
       WHERE id = $1`,
      [sessionId]
    );

    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return {
      id: row.id,
      studentId: row.student_id,
      conceptId: row.concept_id,
      status: row.status,
      startedAt: row.started_at,
      updatedAt: row.updated_at,
      completedAt: row.completed_at,
    };
  }

  /**
   * Count previous attempts by this student for this question.
   */
  async countPreviousAttempts(
    studentId: string,
    questionId: string,
    sessionId?: string | null
  ): Promise<number> {
    if (sessionId) {
      const res = await pool.query(
        `SELECT COUNT(*) FROM attempts
         WHERE student_id = $1 AND question_id = $2 AND session_id = $3`,
        [studentId, questionId, sessionId]
      );
      return parseInt(res.rows[0].count, 10);
    }

    const res = await pool.query(
      `SELECT COUNT(*) FROM attempts
       WHERE student_id = $1 AND question_id = $2`,
      [studentId, questionId]
    );
    return parseInt(res.rows[0].count, 10);
  }

  /**
   * Check for a recent attempt with the same student, question, and option within a time window.
   * Used to prevent accidental double-click submissions.
   */
  async findRecentDuplicateAttempt(
    studentId: string,
    questionId: string,
    selectedOptionId: string,
    windowSeconds: number = 2
  ): Promise<AttemptRecord | null> {
    const res = await pool.query(
      `SELECT id, student_id, question_id, selected_option_id, session_id,
              phase, is_correct, attempt_number, submitted_at
       FROM attempts
       WHERE student_id = $1
         AND question_id = $2
         AND selected_option_id = $3
         AND submitted_at >= NOW() - ($4 || ' seconds')::INTERVAL
       ORDER BY submitted_at DESC
       LIMIT 1`,
      [studentId, questionId, selectedOptionId, windowSeconds]
    );

    if (res.rows.length === 0) return null;
    return this.mapRowToRecord(res.rows[0]);
  }

  /**
   * Insert a new attempt record into PostgreSQL.
   */
  async createAttempt(params: CreateAttemptParams): Promise<AttemptRecord> {
    const res = await pool.query(
      `INSERT INTO attempts (
         student_id, question_id, selected_option_id, session_id,
         is_correct, attempt_number, phase, submitted_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       RETURNING id, student_id, question_id, selected_option_id, session_id,
                 phase, is_correct, attempt_number, submitted_at`,
      [
        params.studentId,
        params.questionId,
        params.selectedOptionId,
        params.sessionId ?? null,
        params.isCorrect,
        params.attemptNumber,
        params.phase ?? 'practice',
      ]
    );

    return this.mapRowToRecord(res.rows[0]);
  }

  /**
   * Find attempts made by a student, ordered by most recent first.
   */
  async findAttemptsByStudent(studentId: string, limit: number = 50): Promise<AttemptRecord[]> {
    const res = await pool.query(
      `SELECT id, student_id, question_id, selected_option_id, session_id,
              phase, is_correct, attempt_number, submitted_at
       FROM attempts
       WHERE student_id = $1
       ORDER BY submitted_at DESC
       LIMIT $2`,
      [studentId, limit]
    );

    return res.rows.map((row) => this.mapRowToRecord(row));
  }

  /**
   * Find attempts within a specific session.
   */
  async findAttemptsBySession(sessionId: string): Promise<AttemptRecord[]> {
    const res = await pool.query(
      `SELECT id, student_id, question_id, selected_option_id, session_id,
              phase, is_correct, attempt_number, submitted_at
       FROM attempts
       WHERE session_id = $1
       ORDER BY submitted_at ASC`,
      [sessionId]
    );

    return res.rows.map((row) => this.mapRowToRecord(row));
  }

  private mapRowToRecord(row: any): AttemptRecord {
    return {
      id: row.id,
      studentId: row.student_id,
      questionId: row.question_id,
      selectedOptionId: row.selected_option_id,
      sessionId: row.session_id ?? null,
      phase: row.phase ?? null,
      isCorrect: Boolean(row.is_correct),
      attemptNumber: Number(row.attempt_number),
      submittedAt: new Date(row.submitted_at).toISOString(),
    };
  }
}

export const attemptRepository = new AttemptRepository();
