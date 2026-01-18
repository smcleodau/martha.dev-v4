#!/usr/bin/env tsx
/**
 * Test workflows across multiple worktrees
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { Connection, Client } from '@temporalio/client';

// Test issues from different worktrees
const testIssues = [
  { id: 'TASK-1', title: 'Calculator app task', worktree: 'calculator-app', complexity: 1, priority: 'low' },
  { id: 'TASK-3.3.4', title: 'Martha dev v4 task', worktree: 'martha-dev-v4', complexity: 3, priority: 'medium' },
  { id: 'MTH-119', title: 'Communications service task', worktree: 'communications-service', complexity: 5, priority: 'high' },
];

async function main() {
  console.log('\n=== Testing Workflows Across Multiple Worktrees ===\n');
  console.log('Address:', process.env.TEMPORAL_ADDRESS);
  console.log('Namespace:', process.env.TEMPORAL_NAMESPACE);
  console.log('API Key:', process.env.TEMPORAL_API_KEY?.substring(0, 30) + '...\n');

  const connection = await Connection.connect({
    address: process.env.TEMPORAL_ADDRESS!,
    tls: {},
    apiKey: process.env.TEMPORAL_API_KEY,
  });

  const client = new Client({
    connection,
    namespace: process.env.TEMPORAL_NAMESPACE!,
  });

  console.log('✅ Client created\n');

  const triggeredWorkflows = [];

  for (const issue of testIssues) {
    try {
      const workflowId = `${issue.id.toLowerCase()}-${Date.now()}`;

      console.log(`━━━ Triggering: ${issue.id} (${issue.worktree}) ━━━`);

      const handle = await client.workflow.start('IssueLifecycleWorkflow', {
        workflowId,
        taskQueue: 'martha-tasks',
        args: [{
          id: issue.id,
          title: issue.title,
          complexity: issue.complexity,
          priority: issue.priority,
        }],
      });

      console.log(`✅ Workflow started: ${workflowId}`);
      console.log(`   Run ID: ${handle.firstExecutionRunId}`);
      console.log(`   View: https://cloud.temporal.io/namespaces/${process.env.TEMPORAL_NAMESPACE}/workflows/${workflowId}\n`);

      triggeredWorkflows.push({
        issueId: issue.id,
        worktree: issue.worktree,
        workflowId,
        runId: handle.firstExecutionRunId,
      });

      // Small delay between triggers
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error: any) {
      console.error(`❌ Failed to trigger ${issue.id}:`, error.message);
    }
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log(`✅ Triggered ${triggeredWorkflows.length} workflows across ${testIssues.length} worktrees\n`);

  console.log('Summary:');
  triggeredWorkflows.forEach(wf => {
    console.log(`  - ${wf.issueId.padEnd(15)} [${wf.worktree}]`);
  });

  console.log('\nMonitor worker logs: tail -f /tmp/temporal-worker-fixed.log\n');

  await connection.close();
}

main().catch(console.error);
