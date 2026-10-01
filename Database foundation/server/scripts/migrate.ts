/**
 * scripts/migrate.ts
 *
 * Applies unapplied SQL migration files in numeric filename order.
 *
 * Safety guarantees:
 *   1. Each migration + its schema_migrations INSERT share one transaction
 *      and the same checked-out client.
 *   2. A PostgreSQL advisory lock (pg_try_advisory_lock) prevents two
 *      concurrent invocations from applying the same migration at the same
 *      time.  If the lock cannot be acquired the runner exits with an error.
 *   3. On failure the transaction rolls back; the migration is NOT recorded
 *      as applied.
 *   4. A second run with no pending migrations is a no-op.
 */

import * as fs from 'fs';
import * as path from 'path';
import { PoolClient } from 'pg';
import { env } from '../src/config/env';
import { getPool, closePool } from '../src/db/pool';

// The advisory lock key is an arbitrary stable integer unique to this runner.
// Any two-byte signed integer works; we spell it out for clarity.
const MIGRATION_LOCK_KEY = 7_654_321;

const MIGRATIONS_DIR = path.join(__dirname, '..', 'db', 'migrations');

interface AppliedRow {
  filename: string;
}

async function ensureMigrationsTable(client: PoolClient): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename   TEXT        NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT schema_migrations_pkey PRIMARY KEY (filename)
    )
  `);
}

async function getAppliedMigrations(client: PoolClient): Promise<Set<string>> {
  const res = await client.query<AppliedRow>('SELECT filename FROM schema_migrations');
  return new Set(res.rows.map((r) => r.filename));
}

function readMigrationFiles(): string[] {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    throw new Error(`Migrations directory not found: ${MIGRATIONS_DIR}`);
  }
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort(); // lexicographic == numeric order for zero-padded filenames
}

async function applyMigration(client: PoolClient, filePath: string, filename: string): Promise<void> {
  const sql = fs.readFileSync(filePath, 'utf-8');
  await client.query('BEGIN');
  try {
    await client.query(sql);
    await client.query(
      'INSERT INTO schema_migrations (filename) VALUES ($1)',
      [filename],
    );
    await client.query('COMMIT');
    console.log(`  ✓ Applied: ${filename}`);
  } catch (err: unknown) {
    await client.query('ROLLBACK');
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Migration failed (rolled back): ${filename}\n  ${message}`);
  }
}

async function main(): Promise<void> {
  console.log('[db:migrate] Starting …');
  console.log(`  DATABASE_URL host: ${new URL(env.databaseUrl).hostname}`);

  const pool = getPool();
  const client = await pool.connect();

  try {
    // Acquire advisory lock to prevent concurrent migration runs.
    const lockResult = await client.query<{ acquired: boolean }>(
      'SELECT pg_try_advisory_lock($1) AS acquired',
      [MIGRATION_LOCK_KEY],
    );
    if (!lockResult.rows[0].acquired) {
      throw new Error(
        'Another migration process is already running. ' +
          'If you believe this is wrong, run: SELECT pg_advisory_unlock(' +
          MIGRATION_LOCK_KEY +
          ') in your database.',
      );
    }

    await ensureMigrationsTable(client);
    const applied = await getAppliedMigrations(client);
    const files = readMigrationFiles();

    const pending = files.filter((f) => !applied.has(f));
    if (pending.length === 0) {
      console.log('  Nothing to do — all migrations already applied.');
    } else {
      console.log(`  ${pending.length} pending migration(s):`);
      for (const filename of pending) {
        const filePath = path.join(MIGRATIONS_DIR, filename);
        await applyMigration(client, filePath, filename);
      }
    }

    console.log('[db:migrate] Done.');
  } finally {
    // Release advisory lock (auto-released when connection closes, but
    // explicit release returns the connection to the pool cleanly).
    try {
      await client.query('SELECT pg_advisory_unlock($1)', [MIGRATION_LOCK_KEY]);
    } catch {
      // Ignore — the lock will be released when the connection ends.
    }
    client.release();
    await closePool();
  }
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error('\n[db:migrate] ERROR:', message);
  process.exit(1);
});
