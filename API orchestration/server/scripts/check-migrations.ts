import { pool, closePool } from '../src/config/db';

async function checkMigrations() {
  try {
    const res = await pool.query("SELECT * FROM schema_migrations ORDER BY applied_at");
    console.log('Applied migrations:');
    res.rows.forEach(r => console.log(`  - ${r.filename} at ${r.applied_at}`));

    const qCount = await pool.query("SELECT COUNT(*) FROM questions");
    console.log('Questions count:', qCount.rows[0].count);

    const qoCount = await pool.query("SELECT COUNT(*) FROM question_options");
    console.log('Question options count:', qoCount.rows[0].count);

    const qs = await pool.query("SELECT id, concept_id, code, prompt FROM questions LIMIT 5");
    console.log('Sample questions:', qs.rows);

    const aCount = await pool.query("SELECT COUNT(*) FROM attempts");
    console.log('Attempts count:', aCount.rows[0].count);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await closePool();
  }
}

checkMigrations();
