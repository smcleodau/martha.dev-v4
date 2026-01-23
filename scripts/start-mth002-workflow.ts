#!/usr/bin/env tsx

/**
 * Start MTH-002 Workflow
 *
 * Initializes a proper IssueLifecycleWorkflow for MTH-002 calculator issue
 * with full Temporal Cloud integration.
 */

import { getTemporalClient } from '../src/temporal/client.js';
import { createLogger } from '../src/utils/logger.js';

const logger = createLogger({ module: 'start-mth002' });

async function main() {
  try {
    logger.info('Starting IssueLifecycleWorkflow for MTH-002...');
    logger.info('');

    const client = await getTemporalClient();

    // Start workflow
    const handle = await client.workflow.start('IssueLifecycleWorkflow', {
      taskQueue: 'martha-tasks',
      workflowId: 'issue-MTH-002-calculator',
      args: [
        {
          issueId: 'MTH-002',
          issueTitle: 'Implement basic arithmetic operations',
          worktree: 'calculator-app',
          board: 'calculator-development',
          complexity: 2, // Story points
          parentWorkflowId: null,
          batchId: 'manual-calculator-demo',
          config: {
            enableAutoTests: true,
            requireCodeReview: true,
            autoMerge: false,
          },
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
