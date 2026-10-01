/**
 * src/db/pool.ts
 *
 * Single shared PostgreSQL connection pool for the entire server process.
 * Import `pool` wherever you need a one-off query.
 * Import `withClient` for managed client checkout (used in transactions).
 *
 * The pool is created lazily on first access so that importing this module
 * in tests does not immediately open connections.
 */

import { Pool, PoolClient } from 'pg';
import { env } from '../config/env';

let _pool: Pool | null = null;

/** Returns the singleton pool, creating it on first call. */
export function getPool(): Pool {
  if (!_pool) {
    _pool = new Pool({
      connectionString: env.databaseUrl,
      max: env.dbPoolMax,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    });

    _pool.on('error', (err) => {
      // Log pool-level errors without crashing the process.
      // Individual query errors are handled at the call site.
      console.error('[db-pool] Unexpected pool error:', err.message);
    });
  }
  return _pool;
}

/** Convenience shorthand for `getPool().query(...)`. */
export const pool = new Proxy({} as Pool, {
  get(_target, prop) {
    return (getPool() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

/**
 * Checks out a client from the pool, calls `fn`, then releases it.
 * Use this instead of `pool.connect()` directly to ensure the client
 * is always returned even if `fn` throws.
 */
export async function withClient<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}

/** Closes the pool. Call this in scripts after all work is done. */
export async function closePool(): Promise<void> {
  if (_pool) {
    await _pool.end();
    _pool = null;
  }
}
