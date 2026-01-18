#!/usr/bin/env tsx

/**
 * Database migration script
 * Runs all SQL migrations in the migrations/ directory
 *
 * Usage:
 *   npm run db:migrate
 *   or
 *   tsx scripts/migrate.ts
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

async function runMigrations() {
  let client: pg.Client | null = null;

  try {
    logger.info('Starting database migrations');

    // Connect to PostgreSQL
    client = new Client({
      connectionString: appConfig.databaseUrl,
    });

    await client.connect();
    logger.info('Connected to PostgreSQL', { url: appConfig.databaseUrl.replace(/:[^:@]+@/, ':***@') });

    // Ensure TimescaleDB extension is enabled
    await client.query('CREATE EXTENSION IF NOT EXISTS timescaledb;');
    logger.info('TimescaleDB extension verified');

    // Get all migration files
    const migrationsDir = path.join(__dirname, '..', 'migrations');
    const files = await fs.readdir(migrationsDir);
    const sqlFiles = files
      .filter(f => f.endsWith('.sql'))
      .sort(); // Sort to ensure correct order (001, 002, 003, etc.)

    logger.info('Found migration files', { count: sqlFiles.length, files: sqlFiles });

    // Run each migration
    for (const file of sqlFiles) {
      const filePath = path.join(migrationsDir, file);
      logger.info(`Running migration: ${file}`);

      const sql = await fs.readFile(filePath, 'utf-8');
      await client.query(sql);

      logger.info(`✓ ${file} completed`);
    }

    // Verify hypertables were created
    const hypertables = await client.query(`
      SELECT hypertable_name, hypertable_schema
      FROM timescaledb_information.hypertables;
    `);

    logger.info('Hypertables created', {
      count: hypertables.rows.length,
      tables: hypertables.rows.map(r => `${r.hypertable_schema}.${r.hypertable_name}`),
    });

    // Verify continuous aggregates
    const caggs = await client.query(`
      SELECT view_name, materialization_hypertable_schema, materialization_hypertable_name
      FROM timescaledb_information.continuous_aggregates;
    `);

    logger.info('Continuous aggregates created', {
      count: caggs.rows.length,
      views: caggs.rows.map(r => r.view_name),
    });

    // List all tables in schema
    const tables = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = $1
      ORDER BY table_name
    `, [appConfig.databaseSchema]);

    logger.info('All tables in schema', {
      schema: appConfig.databaseSchema,
      count: tables.rows.length,
      tables: tables.rows.map(r => r.table_name),
    });

    logger.info('✅ All migrations completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Migration failed', {
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
runMigrations();
