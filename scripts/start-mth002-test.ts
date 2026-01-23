#!/usr/bin/env tsx

/**
 * Start MTH-002 Test Workflow
 */

import { config } from 'dotenv';

// Load environment variables
config({ path: '.env' });
config({ path: '.env.local', override: true });

import { getTemporalClient } from '../src/temporal/client.js';
import { createLogger } from '../src/utils/logger.js';

const logger = createLogger({ module: 'start-mth002-test' });

async function main() {
  try {
    logger.info('Starting IssueLifecycleWorkflow for MTH-002...');

    const client = await getTemporalClient();

    const workflowId = 'issue-MTH-002-test-' + Date.now();

    const handle = await client.workflow.start('IssueLifecycleWorkflow', {
      taskQueue: 'martha-tasks',
      workflowId,
      args: [
        {
          id: 'MTH-002',
          title: 'Implement basic arithmetic operations',
          complexity: 2,
        },
      ],
    });

    logger.info('✅ Workflow started successfully!');
    logger.info('Workflow ID:', workflowId);
    logger.info('Run ID:', handle.firstExecutionRunId);
    logger.info('View in Temporal Cloud:');
    logger.info(`  https://cloud.temporal.io/namespaces/martha-dev-v4.mnjo7/workflows/${workflowId}`);

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
