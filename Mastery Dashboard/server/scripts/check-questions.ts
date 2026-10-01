import { pool, closePool } from '../src/config/db';

async function checkQuestions() {
  try {
    const qs = await pool.query(`
      SELECT q.id, q.code, q.prompt, q.phase, c.slug as concept_slug, c.title as concept_title,
             json_agg(json_build_object('id', o.id, 'pos', o.position, 'text', o.option_text, 'correct', o.is_correct)) as options
      FROM questions q
      JOIN concepts c ON q.concept_id = c.id
      JOIN question_options o ON o.question_id = q.id
      GROUP BY q.id, q.code, q.prompt, q.phase, c.slug, c.title
      ORDER BY q.code
    `);
    console.log(`Found ${qs.rows.length} questions:`);
    qs.rows.forEach(q => {
      console.log(`\n[${q.code}] (${q.concept_title} - ${q.phase}): ${q.prompt.substring(0, 60)}...`);
      q.options.forEach((o: any) => console.log(`  ${o.pos}. [${o.correct ? 'CORRECT' : 'WRONG'}] ${o.text.substring(0, 50)}... (id: ${o.id})`));
    });
  } catch (err) {
    console.error(err);
  } finally {
    await closePool();
  }
}

checkQuestions();
