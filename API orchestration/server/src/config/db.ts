import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { env } from './env';

/**
 * Safely parse the DATABASE_URL and log connection diagnostics.
 * NEVER logs the password or the full connection string.
 */
function parseDatabaseUrl(url: string): {
  host: string;
  port: string;
  database: string;
  user: string;
  hasPassword: boolean;
  valid: boolean;
  error?: string;
} {
  try {
    // pg-connection-string and the `pg` lib both use the URL spec to parse URIs.
    // We use the Node built-in URL class here so there are zero extra dependencies.
    const parsed = new URL(url);
    return {
      host:        parsed.hostname || '(empty)',
      port:        parsed.port     || '(default)',
      database:    (parsed.pathname || '/').replace(/^\//, '') || '(empty)',
      user:        parsed.username  || '(empty)',
      hasPassword: parsed.password.length > 0,
      valid:       true,
    };
  } catch (err: any) {
    return {
      host:        '(parse-error)',
      port:        '(parse-error)',
      database:    '(parse-error)',
      user:        '(parse-error)',
      hasPassword: false,
      valid:       false,
      error:       err.message,
    };
  }
}

/**
 * Print safe connection diagnostics to stdout.
 * Safe to call before the pool is created or after a connection failure.
 */
export function logDbConnectionInfo(): void {
  const info = parseDatabaseUrl(env.databaseUrl);
  console.log('[db] ── Connection diagnostics ──────────────────');
  if (!info.valid) {
    console.error('[db]   DATABASE_URL is NOT a valid URL:', info.error);
    console.error('[db]   Check that it starts with postgresql:// or postgres://');
  } else {
    console.log(`[db]   host        : ${info.host}`);
    console.log(`[db]   port        : ${info.port}`);
    console.log(`[db]   database    : ${info.database}`);
    console.log(`[db]   user        : ${info.user}`);
    console.log(`[db]   has password: ${info.hasPassword}`);

    // Extra guard: if user does NOT start with 'postgres.' for Supabase pooler
    // it means the URI was malformed and the '@' in the password consumed the
    // real username portion.
    if (
      !env.databaseUrl.includes('localhost') &&
      !env.databaseUrl.includes('127.0.0.1') &&
      !info.user.startsWith('postgres.')
    ) {
      console.warn(
        '[db]   WARNING: user does not start with "postgres." — the URI may be ' +
        'malformed. Ensure the password uses percent-encoding for special characters ' +
        '(e.g. "@" → "%40", "#" → "%23").'
      );
    }
  }
  console.log('[db] ────────────────────────────────────────────');
}

let _pool: Pool | null = null;

export function getPool(): Pool {
  if (!_pool) {
    const isLocal = env.databaseUrl.includes('localhost') || env.databaseUrl.includes('127.0.0.1');

    // Log diagnostics the first time the pool is created so they appear in
    // Render logs regardless of whether the connection subsequently succeeds.
    logDbConnectionInfo();

    _pool = new Pool({
      connectionString: env.databaseUrl,
      max: env.dbPoolMax || 20,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 30_000,
      keepAlive: true,
      ssl: isLocal ? false : { rejectUnauthorized: false },
    });

    _pool.on('error', (err) => {
      console.error('[db-pool] Unexpected pool error:', err.message);
    });
  }
  return _pool;
}

export const pool = new Proxy({} as Pool, {
  get(_target, prop) {
    return (getPool() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

export async function query<T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  return getPool().query<T>(text, params);
}

export async function withClient<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}

export async function checkDbHealth(): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
  const start = Date.now();
  try {
    await query('SELECT 1');
    return { ok: true, latencyMs: Date.now() - start };
  } catch (err: any) {
    return { ok: false, latencyMs: Date.now() - start, error: err.message };
  }
}

export async function closePool(): Promise<void> {
  if (_pool) {
    await _pool.end();
    _pool = null;
  }
}
