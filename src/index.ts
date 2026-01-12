#!/usr/bin/env node

/**
 * Martha.dev TypeScript Service - Main Entry Point
 *
 * Multi-Agent Parallel Development System
 * Version 3.0.0
 */

import logger from './utils/logger.js';
import { appConfig } from './config/index.js';
import { startServer } from './server/fastify.js';
import { closePool } from './database/client.js';
import { closeRedis } from './redis/client.js';

async function main() {
  try {
    logger.info('Starting Martha TypeScript Service', {
      version: '3.0.0',
      worktree: appConfig.worktreeName,
      worktreeIndex: appConfig.worktreeIndex,
      environment: appConfig.nodeEnv,
    });

    // Start Fastify server
    await startServer();

  } catch (error) {
    logger.error('Fatal error during startup', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    process.exit(1);
  }
}

// Graceful shutdown handler
async function shutdown() {
  logger.info('Received shutdown signal, cleaning up...');

  try {
    await closePool();
    await closeRedis();
    logger.info('Cleanup complete');
    process.exit(0);
  } catch (error) {
    logger.error('Error during cleanup', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    process.exit(1);
  }
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', {
    error: error.message,
    stack: error.stack,
  });
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', {
    reason: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined,
  });
  process.exit(1);
});

// Start the application
main();
