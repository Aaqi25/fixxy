/**
 * src/config/env.ts
 *
 * Loads and validates environment settings at startup.
 * Fails loudly if DATABASE_URL is absent so misconfigured environments
 * are caught immediately rather than at the first query.
 */

import * as dotenv from 'dotenv';
dotenv.config();

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(
      `[fixxy] Missing required environment variable: ${name}\n` +
        `Copy server/.env.example to server/.env and fill in your credentials.`,
    );
  }
  return value.trim();
}

function optional(name: string, defaultValue: string): string {
  return (process.env[name] ?? defaultValue).trim();
}

export const env = {
  /**
   * Full PostgreSQL connection string, e.g.
   *   postgresql://fixxy_user:secret@localhost:5432/fixxy_dev
   */
  databaseUrl: required('DATABASE_URL'),

  /**
   * Maximum number of pool connections (default: 10).
   */
  dbPoolMax: parseInt(optional('DB_POOL_MAX', '10'), 10),

  nodeEnv: optional('NODE_ENV', 'development'),
} as const;
