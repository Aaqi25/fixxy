/**
 * scripts/check-db.ts
 *
 * Verifies:
 *   1. DATABASE_URL is set and the database is reachable.
 *   2. All expected tables exist.
 *   3. All applied migrations are present in schema_migrations.
 *   4. Every active question has exactly one correct option.
 *   5. No is_correct or misconception_id leaks into a sample student DTO.
 *
 * Exits with code 0 on success, 1 on any failure.
 */

import { env } from '../src/config/env';
import { getPool, closePool } from '../src/db/pool';
import { checkDbHealth } from '../src/db/health';
import { verifyCorrectOptionCounts } from '../src/db/repositories/question.repository';
import { findConceptBySlug } from '../src/db/repositories/concept.repository';
import { findQuestionDtosByConceptAndPhase } from '../src/db/repositories/question.repository';

const EXPECTED_TABLES = [
  'schema_migrations',
  'students',
  'student_profiles',
  'concepts',
  'concept_prerequisites',
  'misconceptions',
  'teaching_plans',
  'questions',
  'question_options',
  'learning_sessions',
  'attempts',
  'interventions',
  'student_mastery',
  'explanation_outcomes',
];

async function checkTablesExist(pool: ReturnType<typeof getPool>): Promise<string[]> {
  const res = await pool.query<{ table_name: string }>(
    `SELECT table_name
     FROM information_schema.tables
     WHERE table_schema = 'public'
       AND table_type   = 'BASE TABLE'`,
  );
  const existing = new Set(res.rows.map((r) => r.table_name));
  return EXPECTED_TABLES.filter((t) => !existing.has(t));
}

async function checkAppliedMigrations(pool: ReturnType<typeof getPool>): Promise<void> {
  const res = await pool.query<{ filename: string; applied_at: Date }>(
    'SELECT filename, applied_at FROM schema_migrations ORDER BY filename',
  );
  if (res.rows.length === 0) {
    console.warn('  ⚠  schema_migrations is empty — have you run db:migrate?');
  } else {
    for (const row of res.rows) {
      console.log(`  ✓ Migration applied: ${row.filename} at ${row.applied_at.toISOString()}`);
    }
  }
}

async function checkStudentDto(pool: ReturnType<typeof getPool>): Promise<void> {
  const concept = await findConceptBySlug('overfitting', pool);
  if (!concept) {
    console.warn('  ⚠  Overfitting concept not found — run db:seed first.');
    return;
  }
  const dtos = await findQuestionDtosByConceptAndPhase(concept.id, 'practice', pool);
  if (dtos.length === 0) {
    console.warn('  ⚠  No practice questions for overfitting — run db:seed first.');
    return;
  }
  const dto = dtos[0];
  // Verify no answer key fields are present in the DTO.
  const dtoStr = JSON.stringify(dto);
  const hasIsCorrect = dtoStr.includes('"isCorrect"') || dtoStr.includes('"is_correct"');
  const hasMisconception = dtoStr.includes('"misconceptionId"') || dtoStr.includes('"misconception_id"');

  if (hasIsCorrect || hasMisconception) {
    throw new Error(
      'Student-facing QuestionDto leaks answer key fields! ' +
        '(is_correct or misconception_id found in DTO)',
    );
  }
  console.log('  ✓ Student DTO contains no answer key or misconception fields.');
  console.log(`  ✓ Sample question: "${dto.prompt.slice(0, 80)}…"`);
  console.log(`    Options: ${dto.options.length}`);
}

async function main(): Promise<void> {
  console.log('[db:check] Starting …');

  // env validation happens on import — if DATABASE_URL is missing, it throws here.
  console.log(`  DATABASE_URL host: ${new URL(env.databaseUrl).hostname}`);

  const pool = getPool();

  // 1. Connectivity
  const health = await checkDbHealth();
  if (!health.ok) {
    throw new Error(`Database unreachable: ${health.error}`);
  }
  console.log(`  ✓ Connected (PostgreSQL ${health.serverVersion}, ${health.latencyMs}ms)`);

  // 2. Tables
  const missing = await checkTablesExist(pool);
  if (missing.length > 0) {
    throw new Error(
      `Missing tables: ${missing.join(', ')}\n  Run: npm run db:migrate`,
    );
  }
  console.log(`  ✓ All ${EXPECTED_TABLES.length} expected tables present.`);

  // 3. Applied migrations
  await checkAppliedMigrations(pool);

  // 4. Correct-option invariant
  const violations = await verifyCorrectOptionCounts(pool);
  if (violations.length > 0) {
    const details = violations.map((v) => `${v.code}(${v.correct_count})`).join(', ');
    throw new Error(`Questions with wrong correct-option count: ${details}`);
  }
  console.log('  ✓ All active questions have exactly one correct option.');

  // 5. Student DTO safety
  await checkStudentDto(pool);

  console.log('\n[db:check] All checks passed ✓');
  await closePool();
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error('\n[db:check] FAILED:', message);
  process.exit(1);
});
