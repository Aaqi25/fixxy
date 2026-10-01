import * as fs from 'fs';
import * as path from 'path';
import { pool, withClient, closePool } from '../src/config/db';

export async function runMigrations(): Promise<void> {
  const migrationsDir = path.resolve(__dirname, '../db/migrations');
  if (!fs.existsSync(migrationsDir)) {
    console.log('[db:migrate] No migrations directory found.');
    return;
  }

  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  await withClient(async (client) => {
    // Ensure migrations table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename TEXT NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT schema_migrations_pkey PRIMARY KEY (filename)
      );
    `);

    // Get already applied migrations
    const res = await client.query('SELECT filename FROM schema_migrations');
    const applied = new Set(res.rows.map((r: { filename: string }) => r.filename));

    const pending = files.filter((f) => !applied.has(f));
    if (pending.length === 0) {
      console.log('[db:migrate] Nothing to do — all migrations already applied.');
      return;
    }

    console.log(`[db:migrate] ${pending.length} pending migration(s) found:`);
    for (const file of pending) {
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(
          'INSERT INTO schema_migrations (filename) VALUES ($1)',
          [file]
        );
        await client.query('COMMIT');
        console.log(`  ✓ Applied: ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`  ✗ Failed: ${file}`);
        throw err;
      }
    }
  });

  console.log('[db:migrate] Done.');
}

if (require.main === module) {
  runMigrations()
    .then(async () => {
      await closePool();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('[db:migrate] Migration error:', err);
      await closePool();
      process.exit(1);
    });
}
