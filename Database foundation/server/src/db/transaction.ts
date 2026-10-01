/**
 * src/db/transaction.ts
 *
 * Wraps a series of database operations in a single BEGIN / COMMIT / ROLLBACK
 * transaction.  All participating repository calls receive the same `client`
 * so that every write in the closure is atomic.
 *
 * Usage:
 *   const result = await withTransaction(async (client) => {
 *     const attempt = await attemptRepo.insert(client, ...);
 *     await interventionRepo.insert(client, ...);
 *     await sessionRepo.updateStatus(client, ...);
 *     return attempt;
 *   });
 */

import { PoolClient } from 'pg';
import { withClient } from './pool';

/**
 * Checks out a connection, starts a transaction, runs `fn`, and commits.
 * Rolls back and re-throws on any error.
 */
export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  return withClient(async (client) => {
    await client.query('BEGIN');
    try {
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }
  });
}
