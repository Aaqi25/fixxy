/**
 * src/db/repositories/question.repository.ts
 *
 * Read-side queries for `questions` and `question_options`.
 * Module 4 (Question Engine) will add write and publish functions here.
 *
 * IMPORTANT: Student-facing functions return `QuestionDto` which strips
 * `is_correct` and `misconception_id`.  Internal/admin functions return
 * full `QuestionRow` / `QuestionOptionRow` types.
 */

import { Pool, PoolClient } from 'pg';
import { pool } from '../pool';
import {
  QuestionRow,
  QuestionOptionRow,
  QuestionDto,
  QuestionOptionDto,
  QuestionPhase,
} from '../types';

type Queryable = Pool | PoolClient;

// ─── Internal helpers ─────────────────────────────────────────────────────────

function toQuestionDto(row: QuestionRow, options: QuestionOptionRow[]): QuestionDto {
  return {
    id: row.id,
    conceptId: row.concept_id,
    phase: row.phase,
    prompt: row.prompt,
    difficulty: row.difficulty,
    options: options
      .sort((a, b) => a.position - b.position)
      .map(
        (o): QuestionOptionDto => ({
          id: o.id,
          position: o.position,
          optionText: o.option_text,
          // is_correct and misconception_id are intentionally omitted here
        }),
      ),
  };
}

async function fetchOptions(
  questionId: string,
  client: Queryable,
): Promise<QuestionOptionRow[]> {
  const res = await client.query<QuestionOptionRow>(
    `SELECT id, question_id, position, option_text, is_correct, misconception_id
     FROM question_options
     WHERE question_id = $1
     ORDER BY position ASC`,
    [questionId],
  );
  return res.rows;
}

// ─── Internal (admin / server) queries ───────────────────────────────────────

/**
 * Returns all active questions for a concept/phase with full option data
 * including is_correct.  Used server-side to score answers.
 */
export async function findQuestionsWithAnswerKey(
  conceptId: string,
  phase: QuestionPhase,
  client: Queryable = pool,
): Promise<Array<{ question: QuestionRow; options: QuestionOptionRow[] }>> {
  const qRes = await client.query<QuestionRow>(
    `SELECT id, concept_id, code, phase, prompt, difficulty, is_active, created_at, updated_at
     FROM questions
     WHERE concept_id = $1 AND phase = $2 AND is_active = TRUE
     ORDER BY difficulty ASC`,
    [conceptId, phase],
  );

  const results = await Promise.all(
    qRes.rows.map(async (question) => ({
      question,
      options: await fetchOptions(question.id, client),
    })),
  );
  return results;
}

/**
 * Returns the full option row (including is_correct) for server-side
 * answer scoring.
 */
export async function findOptionById(
  optionId: string,
  client: Queryable = pool,
): Promise<QuestionOptionRow | null> {
  const res = await client.query<QuestionOptionRow>(
    `SELECT id, question_id, position, option_text, is_correct, misconception_id
     FROM question_options
     WHERE id = $1`,
    [optionId],
  );
  return res.rows[0] ?? null;
}

// ─── Student-facing (DTO) queries ─────────────────────────────────────────────

/**
 * Returns an active question by its stable code as a student-facing DTO.
 * Strips is_correct and misconception_id from options.
 */
export async function findQuestionDtoByCode(
  code: string,
  client: Queryable = pool,
): Promise<QuestionDto | null> {
  const qRes = await client.query<QuestionRow>(
    `SELECT id, concept_id, code, phase, prompt, difficulty, is_active, created_at, updated_at
     FROM questions
     WHERE code = $1 AND is_active = TRUE`,
    [code],
  );
  const question = qRes.rows[0];
  if (!question) return null;

  const options = await fetchOptions(question.id, client);
  return toQuestionDto(question, options);
}

/**
 * Returns all active questions for a concept/phase as student-facing DTOs.
 * The Question Engine module will pick one per session.
 */
export async function findQuestionDtosByConceptAndPhase(
  conceptId: string,
  phase: QuestionPhase,
  client: Queryable = pool,
): Promise<QuestionDto[]> {
  const qRes = await client.query<QuestionRow>(
    `SELECT id, concept_id, code, phase, prompt, difficulty, is_active, created_at, updated_at
     FROM questions
     WHERE concept_id = $1 AND phase = $2 AND is_active = TRUE
     ORDER BY difficulty ASC`,
    [conceptId, phase],
  );

  const dtos = await Promise.all(
    qRes.rows.map(async (question) => {
      const options = await fetchOptions(question.id, client);
      return toQuestionDto(question, options);
    }),
  );
  return dtos;
}

/**
 * Verifies that every active question in the database has exactly one
 * correct option.  Returns a list of violations (empty = all good).
 *
 * Called by the seed runner and db:check script.
 */
export async function verifyCorrectOptionCounts(
  client: Queryable = pool,
): Promise<Array<{ code: string; correct_count: number }>> {
  const res = await client.query<{ code: string; correct_count: number }>(
    `SELECT q.code, COUNT(o.id) FILTER (WHERE o.is_correct) AS correct_count
     FROM questions q
     LEFT JOIN question_options o ON o.question_id = q.id
     WHERE q.is_active = TRUE
     GROUP BY q.code
     HAVING COUNT(o.id) FILTER (WHERE o.is_correct) <> 1`,
  );
  return res.rows;
}
