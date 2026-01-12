#!/usr/bin/env node

import { WorktreeAgent } from './worktree-agent.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger({ module: 'agent-cli' });

/**
 * Agent CLI entry point
 */
async function main() {
  // Parse command line arguments
  const worktreeName = process.env.WORKTREE_NAME || process.argv[2];
  const worktreePath = process.env.WORKTREE_PATH || process.argv[3] || process.cwd();
  const serviceUrl =
    process.env.SERVICE_URL || process.argv[4] || 'ws://localhost:21000';

  if (!worktreeName) {
    logger.error('Missing required argument: worktree name');
    console.error('Usage: npm run agent <worktree-name> [worktree-path] [service-url]');
    console.error('   or: WORKTREE_NAME=<name> npm run agent');
    process.exit(1);
  }

  logger.info('Starting worktree agent', {
    worktreeName,
    worktreePath,
    serviceUrl,
  });

  // Create and run agent
  const agent = new WorktreeAgent(worktreeName, worktreePath, serviceUrl);

  // Graceful shutdown handlers
  const shutdown = () => {
    logger.info('Shutting down agent...');
    agent.stop();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  process.on('SIGHUP', shutdown);

  // Handle uncaught errors
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception', { error: error.message, stack: error.stack });
    agent.stop();
    process.exit(1);
  });

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled rejection', {
      reason: reason instanceof Error ? reason.message : String(reason),
    });
  });

  // Run agent
  try {
    await agent.run();
  } catch (error) {
    logger.error('Agent failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    process.exit(1);
  }
}

main().catch((error) => {
  logger.error('Fatal error', {
    error: error instanceof Error ? error.message : 'Unknown error',
  });
  process.exit(1);
});
