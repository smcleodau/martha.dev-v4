/**
 * Trigger TASK-1 Workflow v2
 *
 * Starts fresh IssueLifecycleWorkflow with updated activity implementations
 */

import { startWorkflow } from './src/temporal/client.js';

async function main() {
  console.log('🚀 Triggering IssueLifecycleWorkflow v2 for TASK-1...\n');

  const workflowId = `issue-lifecycle-TASK-1-v2-${Date.now()}`;

  const issueInput = {
    id: 'TASK-1',
    title: 'Create basic calculator UI component',
    epicId: undefined,
    complexity: 3,
    dependencies: []
  };

  try {
    const handle = await startWorkflow(
      'IssueLifecycleWorkflow',
      workflowId,
      [issueInput],
      {
        taskQueue: 'martha-tasks'
      }
    );

    console.log('✅ Workflow started successfully!');
    console.log(`   Workflow ID: ${workflowId}`);
    console.log(`   Run ID: ${handle.firstExecutionRunId}`);
    console.log('\n📊 Monitor workflow at: http://localhost:8888');
    console.log(`   Direct link: http://localhost:8888/namespaces/default/workflows/${workflowId}/${handle.firstExecutionRunId}\n`);

    console.log('⏳ Waiting for workflow execution (will show progress for 60s)...\n');

    // Wait for result with timeout
    const result = await Promise.race([
      handle.result(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout waiting for workflow')), 60000)
      )
    ]);

    console.log('🎉 Workflow completed!');
    console.log('Result:', JSON.stringify(result, null, 2));

  } catch (error: any) {
    if (error.message === 'Timeout waiting for workflow') {
      console.log('⏰ Workflow is still running (timeout reached)');
      console.log('   This is expected for long-running workflows');
      console.log('   Check Temporal UI for progress: http://localhost:8888\n');
    } else {
      console.error('❌ Error starting workflow:', error);
      throw error;
    }
  }
}

main().catch(console.error);
