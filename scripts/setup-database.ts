#!/usr/bin/env tsx

/**
 * Database setup script
 * Applies the schema from src/database/schema.sql to PostgreSQL
 *
 * Usage:
 *   npm run db:setup
 *   or
 *   tsx scripts/setup-database.ts
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import { appConfig } from '../src/config/index.js';
import logger from '../src/utils/logger.js';

const { Client } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function setupDatabase() {
  let client: pg.Client | null = null;

  try {
    logger.info('Starting database setup');

    // Connect to PostgreSQL
    client = new Client({
      connectionString: appConfig.databaseUrl,
    });

    await client.connect();
    logger.info('Connected to PostgreSQL');

    // Read schema SQL file
    const schemaPath = path.join(__dirname, '..', 'src', 'database', 'schema.sql');
    const schemaSql = await fs.readFile(schemaPath, 'utf-8');
    logger.info('Loaded schema from file', { path: schemaPath });

    // Execute schema SQL
    await client.query(schemaSql);
    logger.info('Schema applied successfully');

    // Verify schema exists
    const result = await client.query(`
      SELECT schema_name
      FROM information_schema.schemata
      WHERE schema_name = $1
    `, [appConfig.databaseSchema]);

    if (result.rows.length === 0) {
      throw new Error(`Schema ${appConfig.databaseSchema} was not created`);
    }

    logger.info('Schema verified', { schema: appConfig.databaseSchema });

    // List created tables
    const tables = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = $1
      ORDER BY table_name
    `, [appConfig.databaseSchema]);

    logger.info('Tables created', {
      count: tables.rows.length,
      tables: tables.rows.map(r => r.table_name),
    });

    logger.info('Database setup completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Database setup failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    process.exit(1);
  } finally {
    if (client) {
      await client.end();
    }
  }
}

// Run if executed directly
setupDatabase();
