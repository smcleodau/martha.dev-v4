#!/usr/bin/env tsx

/**
 * Phase 1 Validation Script
 * Tests that all Phase 1 components are working correctly:
 * - Configuration loading
 * - Logger initialization
 * - PostgreSQL connection
 * - Redis connection
 *
 * Usage:
 *   npm run validate
 *   or
 *   tsx scripts/validate-phase1.ts
 */

import logger from '../src/utils/logger.js';
import { appConfig } from '../src/config/index.js';
import { checkDatabaseHealth, closePool } from '../src/database/client.js';
import { checkRedisHealth, closeRedis } from '../src/redis/client.js';

async function validatePhase1() {
  let exitCode = 0;

  try {
    logger.info('=== Phase 1 Validation ===');

    // 1. Configuration
    logger.info('✓ Configuration loaded successfully', {
      worktreeName: appConfig.worktreeName,
      worktreeIndex: appConfig.worktreeIndex,
      servicePort: appConfig.servicePort,
      databaseSchema: appConfig.databaseSchema,
      redisKeyPrefix: appConfig.redisKeyPrefix,
    });

    // 2. Database Connection
    logger.info('Testing PostgreSQL connection...');
    const dbHealthy = await checkDatabaseHealth();
    if (dbHealthy) {
      logger.info('✓ PostgreSQL connection successful');
    } else {
      logger.error('✗ PostgreSQL connection failed');
      exitCode = 1;
    }

    // 3. Redis Connection
    logger.info('Testing Redis connection...');
    const redisHealthy = await checkRedisHealth();
    if (redisHealthy) {
      logger.info('✓ Redis connection successful');
    } else {
      logger.error('✗ Redis connection failed');
      exitCode = 1;
    }

    // 4. Summary
    if (exitCode === 0) {
      logger.info('=== Phase 1 Validation PASSED ===');
      logger.info('All components initialized successfully');
    } else {
      logger.error('=== Phase 1 Validation FAILED ===');
      logger.error('Some components failed to initialize');
    }
  } catch (error) {
    logger.error('Phase 1 validation error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    exitCode = 1;
  } finally {
    // Cleanup
    try {
      await closePool();
      await closeRedis();
      logger.info('Connections closed');
    } catch (error) {
      logger.warn('Error closing connections', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    process.exit(exitCode);
  }
}

// Run validation
validatePhase1();
