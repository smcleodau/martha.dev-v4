/**
 * Trigger Multiple Test Workflows
 */

import { startWorkflow } from './src/temporal/client.js';

async function main() {
  console.log('🚀 Triggering batch of test workflows...\n');

  const workflows = [
    { id: 'TEST-2', title: 'Test workflow 2', complexity: 2 },
    { id: 'TEST-3', title: 'Test workflow 3', complexity: 3 },
    { id: 'TEST-4', title: 'Test workflow 4', complexity: 4 },
  ];

  for (const issue of workflows) {
    const workflowId = `test-workflow-${issue.id}-${Date.now()}`;

    try {
      const handle = await startWorkflow(
        'IssueLifecycleWorkflow',
        workflowId,
        [issue],
        { taskQueue: 'martha-tasks' }
      );

      console.log(`✅ Started ${issue.id}: ${workflowId}`);
      console.log(`   Run ID: ${handle.firstExecutionRunId}\n`);

      // Wait a bit between starts
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error: any) {
      console.error(`❌ Failed to start ${issue.id}:`, error.message);
    }
  }

  console.log('✅ All workflows triggered!');
  console.log('📊 Check Temporal UI: http://localhost:8888\n');
}

main().catch(console.error);
