#!/usr/bin/env tsx

/**
 * Start MTH-SETUP Workflow
 *
 * Initializes a proper IssueLifecycleWorkflow for MTH-SETUP calculator-app2 setup issue
 * with full Temporal Cloud integration.
 */

import { config } from 'dotenv';

// Load environment variables first
config({ path: '.env' });
config({ path: '.env.local', override: true });

import { getTemporalClient } from '../src/temporal/client.js';
import { createLogger } from '../src/utils/logger.js';

const logger = createLogger({ module: 'start-mth-setup' });

async function main() {
  try {
    logger.info('Starting IssueLifecycleWorkflow for MTH-SETUP...');
    logger.info('');

    const client = await getTemporalClient();

    // Start workflow
    const handle = await client.workflow.start('IssueLifecycleWorkflow', {
      taskQueue: 'martha-tasks',
      workflowId: 'issue-MTH-SETUP-calculator-v2',
      args: [
        {
          id: 'MTH-SETUP',
          title: 'Repository Setup: calculator-app2',
          complexity: 1,
        },
      ],
    });

    logger.info('✅ IssueLifecycleWorkflow started successfully!');
    logger.info('');
    logger.info('Workflow Details:');
    logger.info(`  Workflow ID: ${handle.workflowId}`);
    logger.info(`  Run ID: ${handle.firstExecutionRunId}`);
    logger.info('');
    logger.info('View in Temporal Cloud:');
    logger.info(`  https://cloud.temporal.io/namespaces/martha-dev-v4.mnjo7/workflows/${handle.workflowId}`);
    logger.info('');

    await client.connection.close();
  } catch (error: any) {
    logger.error('Failed to start workflow:', error.message);
    if (error.stack) {
      logger.error(error.stack);
    }
    process.exit(1);
  }
}

main();
