import { app } from './app';
import { env } from './config/env';
import { checkDbHealth, closePool } from './config/db';

async function bootstrap() {
  console.log('='.repeat(50));
  console.log('FIXXY Adaptive AI/ML Tutor');
  console.log('Starting Module 1 — Authentication Server...');
  console.log('='.repeat(50));

  // Verify database connectivity
  const dbHealth = await checkDbHealth();
  if (!dbHealth.ok) {
    console.error(`[Fatal] Database connection failed: ${dbHealth.error}`);
    console.error(`Check your DATABASE_URL in server/.env`);
    process.exit(1);
  }

  console.log(`✓ PostgreSQL connected successfully (${dbHealth.latencyMs}ms latency)`);

  const server = app.listen(env.port, () => {
    console.log(`✓ FIXXY Auth Server listening on http://localhost:${env.port}`);
    console.log(`✓ Health endpoint: http://localhost:${env.port}/api/health`);
    console.log(`✓ Allowed client: ${env.clientUrl}`);
    console.log(`✓ Environment: ${env.nodeEnv}`);
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`\nReceived ${signal}. Shutting down gracefully...`);
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
