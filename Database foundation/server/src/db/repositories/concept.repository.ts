/**
 * src/db/repositories/concept.repository.ts
 *
 * Read-side queries for the `concepts` table.
 * Module 3 (Curriculum) will add write functions here.
 *
 * Every function accepts an optional `client` parameter so callers can
 * participate in a transaction.  When no client is provided, queries run
 * against the shared pool.
 */

import { Pool, PoolClient } from 'pg';
import { pool } from '../pool';
import { ConceptRow } from '../types';

type Queryable = Pool | PoolClient;

/** Returns all active concepts ordered by sort_order. */
export async function findAllActiveConcepts(
  client: Queryable = pool,
): Promise<ConceptRow[]> {
  const res = await client.query<ConceptRow>(
    `SELECT id, slug, title, summary, sort_order, is_active, created_at, updated_at
     FROM concepts
     WHERE is_active = TRUE
     ORDER BY sort_order ASC`,
  );
  return res.rows;
}

/** Returns a concept by its stable slug, or null if not found. */
export async function findConceptBySlug(
  slug: string,
  client: Queryable = pool,
): Promise<ConceptRow | null> {
  const res = await client.query<ConceptRow>(
    `SELECT id, slug, title, summary, sort_order, is_active, created_at, updated_at
     FROM concepts
     WHERE slug = $1`,
    [slug],
  );
  return res.rows[0] ?? null;
}

/** Returns a concept by its UUID, or null if not found. */
export async function findConceptById(
  id: string,
  client: Queryable = pool,
): Promise<ConceptRow | null> {
  const res = await client.query<ConceptRow>(
    `SELECT id, slug, title, summary, sort_order, is_active, created_at, updated_at
     FROM concepts
     WHERE id = $1`,
    [id],
  );
  return res.rows[0] ?? null;
}
