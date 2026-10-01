/**
 * scripts/seed.ts
 *
 * Runs all SQL seed files in numeric filename order.
 *
 * Seeds are idempotent: they use ON CONFLICT … DO UPDATE or explicit
 * existence checks so running them a second time produces no duplicates.
 *
 * After seeding, verifies that every active question has exactly one
 * correct option (at-least-one check that the partial unique index
 * cannot enforce on its own).
 */

import * as fs from 'fs';
import * as path from 'path';
import { env } from '../src/config/env';
import { getPool, closePool } from '../src/db/pool';
import { verifyCorrectOptionCounts } from '../src/db/repositories/question.repository';

const SEEDS_DIR = path.join(__dirname, '..', 'db', 'seeds');

function readSeedFiles(): string[] {
  if (!fs.existsSync(SEEDS_DIR)) {
    throw new Error(`Seeds directory not found: ${SEEDS_DIR}`);
  }
  return fs
    .readdirSync(SEEDS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();
}

async function main(): Promise<void> {
  console.log('[db:seed] Starting …');
  console.log(`  DATABASE_URL host: ${new URL(env.databaseUrl).hostname}`);

  const pool = getPool();
  const files = readSeedFiles();

  if (files.length === 0) {
    console.log('  No seed files found.');
  } else {
    for (const filename of files) {
      const filePath = path.join(SEEDS_DIR, filename);
      const sql = fs.readFileSync(filePath, 'utf-8');
      console.log(`  Seeding: ${filename} …`);
      try {
        await pool.query(sql);
        console.log(`  ✓ Done: ${filename}`);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        throw new Error(`Seed failed: ${filename}\n  ${message}`);
      }
    }
  }

  // Verify correct-option invariant for all active questions.
  console.log('\n[db:seed] Verifying correct-option counts …');
  const violations = await verifyCorrectOptionCounts(pool);
  if (violations.length > 0) {
    console.error(
      '  ✗ The following active questions do NOT have exactly one correct option:',
    );
    for (const v of violations) {
      console.error(`    question code=${v.code}  correct_count=${v.correct_count}`);
    }
    throw new Error(
      'Seed integrity check failed: questions with wrong correct-option counts found above.',
    );
  }
  console.log('  ✓ All active questions have exactly one correct option.');

  console.log('\n[db:seed] Done.');
  await closePool();
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error('\n[db:seed] ERROR:', message);
  process.exit(1);
});
