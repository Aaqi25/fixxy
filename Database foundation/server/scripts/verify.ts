/**
 * scripts/verify.ts
 *
 * Integration verification script that exercises real database behavior.
 * Run AFTER db:migrate and db:seed.
 *
 * Tests:
 *   1. Duplicate email (case variant) is rejected.
 *   2. Invalid foreign key on question_options is rejected.
 *   3. Mastery score outside 0–100 is rejected.
 *   4. Two correct options on a question are rejected.
 *   5. Transaction rollback works — all related writes are reversed.
 *   6. Student DTO excludes is_correct and misconception_id.
 *   7. Overfitting concept and questions readable via repository.
 *
 * Each test prints PASS or FAIL. Exits with code 1 if any test fails.
 */

import { env } from '../src/config/env';
import { getPool, closePool } from '../src/db/pool';
import { withTransaction } from '../src/db/transaction';
import { findConceptBySlug } from '../src/db/repositories/concept.repository';
import {
  findQuestionDtosByConceptAndPhase,
  findQuestionsWithAnswerKey,
} from '../src/db/repositories/question.repository';

let passed = 0;
let failed = 0;

function pass(name: string): void {
  console.log(`  PASS  ${name}`);
  passed++;
}

function fail(name: string, detail?: string): void {
  console.error(`  FAIL  ${name}${detail ? `\n        ${detail}` : ''}`);
  failed++;
}

async function testDuplicateEmail(pool: ReturnType<typeof getPool>): Promise<void> {
  const name = 'Duplicate email (case variant) is rejected';
  const email = `verify_test_${Date.now()}@example.com`;
  try {
    await pool.query(
      `INSERT INTO students (email, password_hash) VALUES ($1, $2)`,
      [email, 'hash1'],
    );
    // Try inserting same email in uppercase — should fail
    await pool.query(
      `INSERT INTO students (email, password_hash) VALUES ($1, $2)`,
      [email.toUpperCase(), 'hash2'],
    );
    fail(name, 'Expected constraint error but INSERT succeeded');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('unique') || msg.includes('duplicate')) {
      pass(name);
    } else {
      fail(name, `Unexpected error: ${msg}`);
    }
  } finally {
    // Clean up test row
    await pool.query(`DELETE FROM students WHERE lower(email) = lower($1)`, [email]);
  }
}

async function testInvalidForeignKey(pool: ReturnType<typeof getPool>): Promise<void> {
  const name = 'Invalid foreign key on question_options is rejected';
  const fakeId = '00000000-0000-0000-0000-000000000001';
  try {
    await pool.query(
      `INSERT INTO question_options (question_id, position, option_text, is_correct)
       VALUES ($1, 1, 'ghost', FALSE)`,
      [fakeId],
    );
    fail(name, 'Expected FK violation but INSERT succeeded');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('foreign key') || msg.includes('violates')) {
      pass(name);
    } else {
      fail(name, `Unexpected error: ${msg}`);
    }
  }
}

async function testMasteryScoreRange(pool: ReturnType<typeof getPool>): Promise<void> {
  const name = 'Mastery score outside 0–100 is rejected';
  // We need a real student_id and concept_id for this.
  const studentRes = await pool.query<{ id: string }>(
    `INSERT INTO students (email, password_hash)
     VALUES ($1, 'verifytest')
     RETURNING id`,
    [`mastery_verify_${Date.now()}@example.com`],
  );
  const studentId = studentRes.rows[0].id;
  const conceptRes = await pool.query<{ id: string }>(
    `SELECT id FROM concepts WHERE slug = 'overfitting' LIMIT 1`,
  );
  const conceptId = conceptRes.rows[0]?.id;

  if (!conceptId) {
    fail(name, 'Overfitting concept not found — run db:seed first');
    await pool.query('DELETE FROM students WHERE id = $1', [studentId]);
    return;
  }

  try {
    await pool.query(
      `INSERT INTO student_mastery (student_id, concept_id, score, evidence_count)
       VALUES ($1, $2, 150, 1)`,
      [studentId, conceptId],
    );
    fail(name, 'Expected CHECK violation but INSERT succeeded');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('check') || msg.includes('violates') || msg.includes('student_mastery_score')) {
      pass(name);
    } else {
      fail(name, `Unexpected error: ${msg}`);
    }
  } finally {
    await pool.query('DELETE FROM students WHERE id = $1', [studentId]);
  }
}

async function testTwoCorrectOptions(pool: ReturnType<typeof getPool>): Promise<void> {
  const name = 'Two correct options on a question are rejected';
  // Find the practice question
  const qRes = await pool.query<{ id: string }>(
    `SELECT id FROM questions WHERE code = 'OVERFIT_Q1' LIMIT 1`,
  );
  const questionId = qRes.rows[0]?.id;
  if (!questionId) {
    fail(name, 'OVERFIT_Q1 not found — run db:seed first');
    return;
  }
  try {
    // Position 99 doesn't exist yet; is_correct = TRUE should violate partial unique index
    await pool.query(
      `INSERT INTO question_options (question_id, position, option_text, is_correct)
       VALUES ($1, 99, 'second correct', TRUE)`,
      [questionId],
    );
    fail(name, 'Expected unique index violation but INSERT succeeded');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('unique') || msg.includes('duplicate') || msg.includes('already exists')) {
      pass(name);
    } else {
      fail(name, `Unexpected error: ${msg}`);
    }
  } finally {
    // Clean up if it somehow inserted
    await pool.query(
      `DELETE FROM question_options WHERE question_id = $1 AND position = 99`,
      [questionId],
    );
  }
}

async function testTransactionRollback(pool: ReturnType<typeof getPool>): Promise<void> {
  const name = 'Transaction rollback reverses all related writes';
  const email = `rollback_test_${Date.now()}@example.com`;
  let studentId: string | null = null;
  try {
    await withTransaction(async (client) => {
      const res = await client.query<{ id: string }>(
        `INSERT INTO students (email, password_hash) VALUES ($1, 'rollbacktest') RETURNING id`,
        [email],
      );
      studentId = res.rows[0].id;
      // Deliberately cause a failure
      throw new Error('Deliberate rollback trigger');
    });
    fail(name, 'Transaction did not throw');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === 'Deliberate rollback trigger') {
      // Verify the student row was rolled back
      const check = await pool.query(
        `SELECT id FROM students WHERE lower(email) = lower($1)`,
        [email],
      );
      if (check.rows.length === 0) {
        pass(name);
      } else {
        fail(name, 'Row persisted after rollback');
        await pool.query('DELETE FROM students WHERE id = $1', [studentId]);
      }
    } else {
      fail(name, `Unexpected error: ${msg}`);
    }
  }
}

async function testStudentDto(pool: ReturnType<typeof getPool>): Promise<void> {
  const name = 'Student-facing DTO excludes is_correct and misconception_id';
  const concept = await findConceptBySlug('overfitting', pool);
  if (!concept) {
    fail(name, 'Overfitting concept not found');
    return;
  }
  const dtos = await findQuestionDtosByConceptAndPhase(concept.id, 'practice', pool);
  if (dtos.length === 0) {
    fail(name, 'No practice questions found');
    return;
  }
  const dto = dtos[0];
  const dtoStr = JSON.stringify(dto);
  const hasIsCorrect = /is_correct|isCorrect/.test(dtoStr);
  const hasMisconception = /misconception_id|misconceptionId/.test(dtoStr);
  if (hasIsCorrect || hasMisconception) {
    fail(name, `DTO contains sensitive fields: is_correct=${hasIsCorrect}, misconception_id=${hasMisconception}`);
  } else {
    pass(name);
  }
}

async function testRepositoryRead(pool: ReturnType<typeof getPool>): Promise<void> {
  const name = 'Repository reads Overfitting concept and all three question phases';
  const concept = await findConceptBySlug('overfitting', pool);
  if (!concept) {
    fail(name, 'Overfitting concept not found');
    return;
  }

  const practiceQ = await findQuestionsWithAnswerKey(concept.id, 'practice', pool);
  const retryQ = await findQuestionsWithAnswerKey(concept.id, 'retry', pool);
  const transferQ = await findQuestionsWithAnswerKey(concept.id, 'transfer', pool);

  if (practiceQ.length === 0) { fail(name, 'No practice question'); return; }
  if (retryQ.length === 0)    { fail(name, 'No retry question'); return; }
  if (transferQ.length === 0) { fail(name, 'No transfer question'); return; }

  // Verify each has a correct option
  for (const phase of [practiceQ[0], retryQ[0], transferQ[0]]) {
    const correct = phase.options.filter((o) => o.is_correct);
    if (correct.length !== 1) {
      fail(name, `Phase ${phase.question.phase} has ${correct.length} correct options`);
      return;
    }
  }

  console.log(`    Concept: "${concept.title}"`);
  console.log(`    Practice: "${practiceQ[0].question.prompt.slice(0, 60)}…"`);
  console.log(`    Retry:    "${retryQ[0].question.prompt.slice(0, 60)}…"`);
  console.log(`    Transfer: "${transferQ[0].question.prompt.slice(0, 60)}…"`);
  pass(name);
}

async function main(): Promise<void> {
  console.log('[verify] Running integration checks …');
  console.log(`  DATABASE_URL host: ${new URL(env.databaseUrl).hostname}\n`);

  const pool = getPool();

  await testDuplicateEmail(pool);
  await testInvalidForeignKey(pool);
  await testMasteryScoreRange(pool);
  await testTwoCorrectOptions(pool);
  await testTransactionRollback(pool);
  await testStudentDto(pool);
  await testRepositoryRead(pool);

  console.log(`\n[verify] Results: ${passed} passed, ${failed} failed`);
  await closePool();

  if (failed > 0) process.exit(1);
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error('\n[verify] ERROR:', message);
  process.exit(1);
});
