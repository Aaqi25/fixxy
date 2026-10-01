/**
 * src/db/health.ts
 *
 * Lightweight database connectivity check.
 * Used by the db:check script and can be exposed as a /healthz endpoint.
 */

import { pool } from './pool';

export interface DbHealthResult {
  ok: boolean;
  latencyMs: number;
  serverVersion?: string;
  error?: string;
}

/**
 * Runs a trivial query and returns connectivity status.
 * Never throws — callers receive a structured result instead.
 */
export async function checkDbHealth(): Promise<DbHealthResult> {
  const start = Date.now();
  try {
    const res = await pool.query<{ version: string }>(
      'SELECT current_setting($1) AS version',
      ['server_version'],
    );
    return {
      ok: true,
      latencyMs: Date.now() - start,
      serverVersion: res.rows[0]?.version,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      latencyMs: Date.now() - start,
      error: message,
    };
  }
}
