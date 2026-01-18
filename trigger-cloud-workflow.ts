#!/usr/bin/env tsx
/**
 * Test Workflow Trigger for Temporal Cloud
 *
 * This script triggers a test workflow on Temporal Cloud and provides
 * the URL to view it in the cloud UI.
 */

import { startWorkflow } from './src/temporal/client.js';
import logger from './src/utils/logger.js';

async function main() {
  try {
    const workflowId = `cloud-test-${Date.now()}`;
    const issueInput = {
      id: 'TASK-1',
      title: 'Test Temporal Cloud workflow orchestration',
      complexity: 3,
      priority: 'medium',
    };

    console.log('\n=== Triggering Temporal Cloud Workflow ===\n');
    console.log('Workflow ID:', workflowId);
    console.log('Issue:', issueInput.id, '-', issueInput.title);
    console.log('\nConnecting to Temporal Cloud...');

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

    // Wait for workflow to complete (optional)
    console.log('Waiting for workflow to complete...');
    const result = await handle.result();
    console.log('\n✅ Workflow completed successfully!');
    console.log('Result:', JSON.stringify(result, null, 2));

  } catch (error: any) {
    console.error('\n❌ Error triggering workflow:', error.message);

    if (error.code === 'ENOENT') {
      console.error('\n⚠️  Certificate files not found!');
      console.error('Please ensure mTLS certificates are uploaded to:');
      console.error('  - ~/.credentials/temporal-client.pem');
      console.error('  - ~/.credentials/temporal-client.key');
      console.error('\nGenerate certificates at: https://cloud.temporal.io/settings/certificates');
    } else if (error.message.includes('Connection reset')) {
      console.error('\n⚠️  Connection failed - check certificate validity');
    } else {
      console.error('\nFull error:', error);
    }

    process.exit(1);
  }
}

main();
