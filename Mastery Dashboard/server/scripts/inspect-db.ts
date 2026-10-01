import { pool, closePool } from '../src/config/db';

async function inspect() {
  try {
    const tablesRes = await pool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
    );
    console.log('Tables:', tablesRes.rows.map((r: any) => r.table_name));

    for (const row of tablesRes.rows) {
      const cols = await pool.query(
        "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 ORDER BY ordinal_position",
        [row.table_name]
      );
      console.log(`\nTable [${row.table_name}]:`);
      cols.rows.forEach((c: any) => console.log(`  - ${c.column_name} (${c.data_type}, nullable: ${c.is_nullable})`));
    }
  } catch (err) {
    console.error('Error inspecting db:', err);
  } finally {
    await closePool();
  }
}

inspect();
