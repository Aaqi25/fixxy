import * as dotenv from 'dotenv';
import path from 'path';

// Load .env from server directory or process cwd
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(
      `[fixxy] Missing required environment variable: ${name}\n` +
      `Copy server/.env.example to server/.env and fill in your credentials.`
    );
  }
  return value.trim();
}

function optional(name: string, defaultValue: string): string {
  return (process.env[name] ?? defaultValue).trim();
}

export const env = {
  port: parseInt(optional('PORT', '5000'), 10),
  databaseUrl: required('DATABASE_URL'),
  jwtSecret: required('JWT_SECRET'),
  clientUrl: optional('CLIENT_URL', 'http://localhost:5173'),
  nodeEnv: optional('NODE_ENV', 'development'),
  dbPoolMax: parseInt(optional('DB_POOL_MAX', '10'), 10),
  aiServiceUrl: optional('AI_SERVICE_URL', 'http://localhost:8000'),
  isProduction: optional('NODE_ENV', 'development') === 'production',
  cookieName: 'fixxy_token',
  jwtExpiresIn: '7d',
  cookieMaxAgeMs: 7 * 24 * 60 * 60 * 1000, // 7 days
} as const;
