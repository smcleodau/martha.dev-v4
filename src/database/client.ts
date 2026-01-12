import pg from 'pg';

import { appConfig } from '../config/index.js';
import { createLogger } from '../utils/logger.js';

const { Pool } = pg;

const dbLogger = createLogger({ module: 'database' });

/**
 * PostgreSQL connection pool
 * Using node-postgres for direct SQL control (as per plan, not using Prisma/TypeORM)
 */
export const pool = new Pool({
  connectionString: appConfig.databaseUrl,
  // Connection pool settings
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 5000, // Fail if connection takes > 5 seconds
  // Application name for PostgreSQL logs
  application_name: `martha-ts-${appConfig.worktreeName}`,
});

/**
 * Set default schema for all queries
 */
pool.on('connect', (client) => {
  void (async () => {
    try {
      await client.query(`SET search_path TO ${appConfig.databaseSchema}, public`);
    } catch (error) {
      dbLogger.error('Failed to set search_path', { error });
    }
  })();
});

/**
 * Log pool errors
 */
pool.on('error', (error) => {
  dbLogger.error('Unexpected PostgreSQL pool error', {
    error: error.message,
    stack: error.stack,
  });
});

/**
 * Health check for database connection
 */
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    const client = await pool.connect();
    try {
      const result = await client.query<{ time: Date }>('SELECT NOW() as time');
      dbLogger.debug('Database health check successful', {
        time: result.rows[0]?.time?.toString()
      });
      return true;
    } finally {
      client.release();
    }
  } catch (error) {
    dbLogger.error('Database health check failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return false;
  }
}

/**
 * Execute a query with automatic connection handling
 */
export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<pg.QueryResult<T>> {
  const start = Date.now();
  try {
    const result = await pool.query<T>(text, params);
    const duration = Date.now() - start;

    dbLogger.debug('Query executed', {
      duration,
      rows: result.rowCount,
      query: text.substring(0, 100), // Log first 100 chars
    });

    return result;
  } catch (error) {
    const duration = Date.now() - start;
    dbLogger.error('Query failed', {
      duration,
      query: text.substring(0, 100),
      error: error instanceof Error ? error.message : 'Unknown error',
      params,
    });
    throw error;
  }
}

/**
 * Execute a query with a transaction
 */
export async function transaction<T>(
  callback: (client: pg.PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Gracefully close the pool
 */
export async function closePool(): Promise<void> {
  await pool.end();
  dbLogger.info('Database pool closed');
}

/**
 * Export pool for direct access if needed
 */
export default pool;
