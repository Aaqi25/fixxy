import { app } from './app';
import { env } from './config/env';
import { checkDbHealth, closePool, logDbConnectionInfo } from './config/db';

// ---------------------------------------------------------------------------
// Startup helper: bounded retry with exponential backoff.
// This is a resilience improvement only — it gives time for Supabase TLS
// handshakes on cold starts. It does NOT mask a misconfigured DATABASE_URL;
// authentication failures are logged immediately on every attempt.
// ---------------------------------------------------------------------------
const DB_STARTUP_ATTEMPTS = 3;
const DB_STARTUP_BACKOFF_MS = [2000, 4000]; // wait between attempt 1→2, 2→3

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function verifyDbWithRetry(): Promise<void> {
  for (let attempt = 1; attempt <= DB_STARTUP_ATTEMPTS; attempt++) {
    const dbHealth = await checkDbHealth();
    if (dbHealth.ok) {
      console.log(`✓ PostgreSQL connected successfully (attempt ${attempt}, ${dbHealth.latencyMs}ms latency)`);
      return;
    }

    console.error(
      `[db] Attempt ${attempt}/${DB_STARTUP_ATTEMPTS} failed: ${dbHealth.error}`
    );

    if (attempt < DB_STARTUP_ATTEMPTS) {
      const delay = DB_STARTUP_BACKOFF_MS[attempt - 1];
      console.log(`[db] Retrying in ${delay}ms…`);
      await wait(delay);
    }
  }

  // All attempts exhausted — crash so Render marks the deployment failed.
  console.error('[Fatal] Database connection failed after all startup attempts.');
  console.error('[Fatal] Check your DATABASE_URL in Render Environment Variables.');
  process.exit(1);
}

async function bootstrap() {
  console.log('='.repeat(50));
  console.log('FIXXY Adaptive AI/ML Tutor');
  console.log('Starting API Orchestration Server…');
  console.log('='.repeat(50));

  // Log parsed connection diagnostics BEFORE the first connection attempt so
  // they are always visible in Render logs — even on a deploy that crashes.
  // This will reveal host, port, database, username, and whether a password
  // is present, which makes URI encoding problems immediately obvious.
  logDbConnectionInfo();

  await verifyDbWithRetry();

  const server = app.listen(env.port, () => {
    console.log(`✓ FIXXY Server listening on http://localhost:${env.port}`);
    console.log(`✓ Health endpoint: http://localhost:${env.port}/api/health`);
    console.log(`✓ Allowed client: ${env.clientUrl}`);
    console.log(`✓ Environment: ${env.nodeEnv}`);
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`\nReceived ${signal}. Shutting down gracefully…`);
    server.close(async () => {
      await closePool();
      console.log('Database pool closed. Server terminated.');
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

bootstrap().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
