#!/usr/bin/env tsx
/**
 * Trigger a workflow with a real issue from the Martha system
 */

import { config } from 'dotenv';

// Load environment variables first
config({ path: '.env.local' });

import { startWorkflow } from './src/temporal/client.js';
import logger from './src/utils/logger.js';

async function main() {
  try {
    const workflowId = `mth-118-${Date.now()}`;
    const issueInput = {
      id: 'MTH-118',
      title: 'Issue 5.4: Approval Rule Management API',
      complexity: 8,
      priority: 'medium' as const,
    };

    console.log('\n=== Triggering Temporal Cloud Workflow ===\n');
    console.log('Workflow ID:', workflowId);
    console.log('Issue:', issueInput.id, '-', issueInput.title);
    console.log('Complexity:', issueInput.complexity, 'story points');
    console.log('\nConnecting to Temporal Cloud (ap-northeast-1)...');

    const handle = await startWorkflow(
      'IssueLifecycleWorkflow',
      workflowId,
      [issueInput],
      {
        taskQueue: 'martha-tasks',
        searchAttributes: {
          IssueId: [issueInput.id],
          IssuePriority: [issueInput.priority],
        }
      }
    );

    console.log('\n✅ Workflow started successfully on Temporal Cloud!\n');
    console.log('Run ID:', handle.firstExecutionRunId);
    console.log('\nView in Temporal Cloud UI:');
    console.log(`https://cloud.temporal.io/namespaces/martha-dev-v4.mnjo7/workflows/${workflowId}/${handle.firstExecutionRunId}\n`);
    console.log('Direct namespace link:');
    console.log('https://cloud.temporal.io/namespaces/martha-dev-v4.mnjo7/workflows\n');

    console.log('The worker is processing this workflow in the background.');
    console.log('Check the worker logs with: tail -f /tmp/temporal-worker.log');

  } catch (error: any) {
    console.error('\n❌ Error triggering workflow:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

main();
