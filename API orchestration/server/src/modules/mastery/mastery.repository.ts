/**
 * Module 7: Mastery Repository
 * PostgreSQL persistence and query layer for student learning evidence and mastery metrics.
 */

import { pool } from '../../config/db';
import {
  ConceptMasteryRecord,
  RecentActivityItemDto,
  MasteryLevel,
  ActivityType,
} from './mastery.types';
import { ConceptEvidenceData } from './mastery.calculator';

export class MasteryRepository {
  /**
   * Fetch all active concepts alongside the student's current persisted mastery record.
   */
  async getConceptsWithMastery(studentId: string): Promise<ConceptMasteryRecord[]> {
    const query = `
      SELECT 
        COALESCE(m.id, gen_random_uuid()) AS id,
        $1::uuid AS student_id,
        c.id AS concept_id,
        c.slug AS concept_slug,
        c.title AS concept_title,
        COALESCE(m.mastery_score, 0)::numeric(5,2) AS mastery_score,
        COALESCE(m.mastery_level, 'NOT_STARTED') AS mastery_level,
        COALESCE(m.attempt_count, 0) AS attempt_count,
        COALESCE(m.correct_count, 0) AS correct_count,
        COALESCE(m.retry_success_count, 0) AS retry_success_count,
        COALESCE(m.transfer_success_count, 0) AS transfer_success_count,
        m.last_activity_at,
        COALESCE(m.updated_at, c.updated_at) AS updated_at
      FROM concepts c
      LEFT JOIN student_mastery m ON m.concept_id = c.id AND m.student_id = $1
      WHERE c.status = 'ACTIVE'
      ORDER BY c.display_order ASC, c.title ASC;
    `;

    const result = await pool.query(query, [studentId]);
    return result.rows.map((row) => ({
      id: row.id,
      studentId: row.student_id,
      conceptId: row.concept_id,
      conceptSlug: row.concept_slug,
      conceptTitle: row.concept_title,
      masteryScore: parseFloat(row.mastery_score),
      masteryLevel: row.mastery_level as MasteryLevel,
      attemptCount: parseInt(row.attempt_count, 10),
      correctCount: parseInt(row.correct_count, 10),
      retrySuccessCount: parseInt(row.retry_success_count, 10),
      transferSuccessCount: parseInt(row.transfer_success_count, 10),
      lastActivityAt: row.last_activity_at ? new Date(row.last_activity_at).toISOString() : null,
      updatedAt: new Date(row.updated_at).toISOString(),
    }));
  }

  /**
   * Aggregate learning evidence from the attempts table for a specific student and concept.
   */
  async getEvidenceForConcept(studentId: string, conceptId: string): Promise<{
    evidence: ConceptEvidenceData;
    lastActivityAt: string | null;
  }> {
    const query = `
      SELECT 
        COUNT(a.id) AS total_attempts,
        COUNT(CASE WHEN a.is_correct = TRUE THEN 1 END) AS total_correct,
        COUNT(CASE WHEN LOWER(COALESCE(a.phase, q.phase, 'practice')) = 'practice' THEN 1 END) AS practice_attempts,
        COUNT(CASE WHEN LOWER(COALESCE(a.phase, q.phase, 'practice')) = 'practice' AND a.is_correct = TRUE THEN 1 END) AS practice_correct,
        COUNT(CASE WHEN LOWER(COALESCE(a.phase, q.phase, '')) = 'retry' THEN 1 END) AS retry_attempts,
        COUNT(CASE WHEN LOWER(COALESCE(a.phase, q.phase, '')) = 'retry' AND a.is_correct = TRUE THEN 1 END) AS retry_success,
        COUNT(CASE WHEN LOWER(COALESCE(a.phase, q.phase, '')) = 'transfer' THEN 1 END) AS transfer_attempts,
        COUNT(CASE WHEN LOWER(COALESCE(a.phase, q.phase, '')) = 'transfer' AND a.is_correct = TRUE THEN 1 END) AS transfer_success,
        MAX(a.submitted_at) AS last_activity_at
      FROM attempts a
      JOIN questions q ON q.id = a.question_id
      WHERE a.student_id = $1 AND q.concept_id = $2;
    `;

    const result = await pool.query(query, [studentId, conceptId]);
    const row = result.rows[0];

    const evidence: ConceptEvidenceData = {
      attemptCount: parseInt(row?.total_attempts || '0', 10),
      correctCount: parseInt(row?.total_correct || '0', 10),
      practiceAttemptCount: parseInt(row?.practice_attempts || '0', 10),
      practiceCorrectCount: parseInt(row?.practice_correct || '0', 10),
      retryAttemptCount: parseInt(row?.retry_attempts || '0', 10),
      retrySuccessCount: parseInt(row?.retry_success || '0', 10),
      transferAttemptCount: parseInt(row?.transfer_attempts || '0', 10),
      transferSuccessCount: parseInt(row?.transfer_success || '0', 10),
    };

    return {
      evidence,
      lastActivityAt: row?.last_activity_at ? new Date(row.last_activity_at).toISOString() : null,
    };
  }

  /**
   * Persist or update calculated mastery record in student_mastery table.
   */
  async upsertMastery(params: {
    studentId: string;
    conceptId: string;
    masteryScore: number;
    masteryLevel: MasteryLevel;
    attemptCount: number;
    correctCount: number;
    retrySuccessCount: number;
    transferSuccessCount: number;
    lastActivityAt: string | null;
  }): Promise<void> {
    const query = `
      INSERT INTO student_mastery (
        student_id,
        concept_id,
        mastery_score,
        mastery_level,
        attempt_count,
        correct_count,
        retry_success_count,
        transfer_success_count,
        last_activity_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      ON CONFLICT (student_id, concept_id) DO UPDATE
      SET 
        mastery_score = EXCLUDED.mastery_score,
        mastery_level = EXCLUDED.mastery_level,
        attempt_count = EXCLUDED.attempt_count,
        correct_count = EXCLUDED.correct_count,
        retry_success_count = EXCLUDED.retry_success_count,
        transfer_success_count = EXCLUDED.transfer_success_count,
        last_activity_at = EXCLUDED.last_activity_at,
        updated_at = NOW();
    `;

    await pool.query(query, [
      params.studentId,
      params.conceptId,
      params.masteryScore,
      params.masteryLevel,
      params.attemptCount,
      params.correctCount,
      params.retrySuccessCount,
      params.transferSuccessCount,
      params.lastActivityAt,
    ]);
  }

  /**
   * Fetch recent learning activity history for the authenticated student.
   */
  async getRecentActivity(studentId: string, limit = 10): Promise<RecentActivityItemDto[]> {
    const query = `
      SELECT 
        a.id,
        COALESCE(a.phase, q.phase, 'practice') AS phase,
        a.is_correct,
        a.submitted_at,
        c.title AS concept_title,
        c.slug AS concept_slug
      FROM attempts a
      JOIN questions q ON q.id = a.question_id
      JOIN concepts c ON c.id = q.concept_id
      WHERE a.student_id = $1
      ORDER BY a.submitted_at DESC
      LIMIT $2;
    `;

    const result = await pool.query(query, [studentId, limit]);

    return result.rows.map((row) => {
      const phase = (row.phase || 'practice').toLowerCase();
      const isCorrect = Boolean(row.is_correct);

      let type: ActivityType = 'PRACTICE_ATTEMPT';
      let description = '';

      if (phase === 'practice') {
        type = isCorrect ? 'PRACTICE_CORRECT' : 'PRACTICE_WRONG';
        description = isCorrect
          ? `Correct practice answer on ${row.concept_title}`
          : `Practice question attempted on ${row.concept_title}`;
      } else if (phase === 'retry') {
        type = isCorrect ? 'RETRY_SUCCESS' : 'RETRY_WRONG';
        description = isCorrect
          ? `Successfully mastered retry on ${row.concept_title}`
          : `Retry question attempted on ${row.concept_title}`;
      } else if (phase === 'transfer') {
        type = isCorrect ? 'TRANSFER_SUCCESS' : 'TRANSFER_WRONG';
        description = isCorrect
          ? `Successfully solved transfer challenge on ${row.concept_title}`
          : `Transfer challenge attempted on ${row.concept_title}`;
      }

      return {
        id: row.id,
        type,
        conceptTitle: row.concept_title,
        conceptSlug: row.concept_slug,
        phase,
        isCorrect,
        timestamp: new Date(row.submitted_at).toISOString(),
        description,
      };
    });
  }

  /**
   * Aggregate overall statistics across all attempts for a student.
   */
  async getOverallMetrics(studentId: string): Promise<{
    totalAttempts: number;
    correctAttempts: number;
    retrySuccesses: number;
    transferSuccesses: number;
  }> {
    const query = `
      SELECT 
        COUNT(a.id) AS total_attempts,
        COUNT(CASE WHEN a.is_correct = TRUE THEN 1 END) AS correct_attempts,
        COUNT(CASE WHEN LOWER(COALESCE(a.phase, q.phase, '')) = 'retry' AND a.is_correct = TRUE THEN 1 END) AS retry_successes,
        COUNT(CASE WHEN LOWER(COALESCE(a.phase, q.phase, '')) = 'transfer' AND a.is_correct = TRUE THEN 1 END) AS transfer_successes
      FROM attempts a
      LEFT JOIN questions q ON q.id = a.question_id
      WHERE a.student_id = $1;
    `;

    const result = await pool.query(query, [studentId]);
    const row = result.rows[0];

    return {
      totalAttempts: parseInt(row?.total_attempts || '0', 10),
      correctAttempts: parseInt(row?.correct_attempts || '0', 10),
      retrySuccesses: parseInt(row?.retry_successes || '0', 10),
      transferSuccesses: parseInt(row?.transfer_successes || '0', 10),
    };
  }

  /**
   * Find concept ID by question ID.
   */
  async getConceptIdByQuestionId(questionId: string): Promise<string | null> {
    const query = `SELECT concept_id FROM questions WHERE id = $1`;
    const result = await pool.query(query, [questionId]);
    return result.rows[0]?.concept_id || null;
  }
}

export const masteryRepository = new MasteryRepository();
