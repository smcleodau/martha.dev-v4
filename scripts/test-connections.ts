#!/usr/bin/env tsx

/**
 * Connection test for Redis and PostgreSQL
 * Tests with the actual connections from .env.local
 */

import { checkRedisHealth, closeRedis } from '../src/redis/client.js';
import { checkDatabaseHealth, closePool } from '../src/database/client.js';
import logger from '../src/utils/logger.js';
import { appConfig } from '../src/config/index.js';

async function testConnections() {
  let exitCode = 0;

  try {
    logger.info('=== Testing Connections ===');

    // Test Redis
    logger.info('Testing Redis connection', {
      url: appConfig.redisUrl.replace(/:([^:@]+)@/, ':***@'), // Mask password
      keyPrefix: appConfig.redisKeyPrefix,
    });

    const redisHealthy = await checkRedisHealth();
    if (redisHealthy) {
      logger.info('✅ Redis connection SUCCESSFUL');
    } else {
      logger.error('❌ Redis connection FAILED');
      exitCode = 1;
    }

    // Test PostgreSQL
    logger.info('Testing PostgreSQL connection', {
      url: appConfig.databaseUrl.replace(/:([^:@]+)@/, ':***@'), // Mask password
      schema: appConfig.databaseSchema,
    });

    const dbHealthy = await checkDatabaseHealth();
    if (dbHealthy) {
      logger.info('✅ PostgreSQL connection SUCCESSFUL');
    } else {
      logger.error('❌ PostgreSQL connection FAILED');
      exitCode = 1;
    }

    // Summary
    if (exitCode === 0) {
      logger.info('=== All connections SUCCESSFUL ===');
    } else {
      logger.error('=== Some connections FAILED ===');
    }

  } catch (error) {
    logger.error('Connection test failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    exitCode = 1;
  } finally {
    await closeRedis();
    await closePool();
    process.exit(exitCode);
  }
}

testConnections();
