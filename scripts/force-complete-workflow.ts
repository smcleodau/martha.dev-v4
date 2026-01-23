#!/usr/bin/env tsx

/**
 * Force Complete Workflow
 *
 * Sends a forceCompletion signal to a running workflow
 */

import { config } from 'dotenv';

// Load environment variables first
config({ path: '.env' });
config({ path: '.env.local', override: true });

import { getWorkflowHandle } from '../src/temporal/client.js';
import { createLogger } from '../src/utils/logger.js';

const logger = createLogger({ module: 'force-complete' });

async function main() {
  const workflowId = process.argv[2];

  if (!workflowId) {
    logger.error('Usage: tsx scripts/force-complete-workflow.ts <workflowId>');
    process.exit(1);
  }

  try {
    logger.info(`Sending forceCompletion signal to workflow: ${workflowId}`);

    const handle = await getWorkflowHandle(workflowId);

    await handle.signal('forceCompletion');

    logger.info('✅ Force completion signal sent successfully!');
  } catch (error: any) {
    logger.error('Failed to send signal:', error.message);
    if (error.stack) {
      logger.error(error.stack);
    }
    process.exit(1);
  }
}

main();
