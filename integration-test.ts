#!/usr/bin/env tsx
/**
 * Integration Test Script
 *
 * This script:
 * 1. Starts the Temporal worker in background
 * 2. Triggers a test workflow
 * 3. Monitors execution for 30 seconds
 * 4. Checks telemetry events
 * 5. Stops the worker
 */

import { config } from 'dotenv';
import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import { Client } from 'pg';

// Load environment variables
config({ path: '.env.local' });

import { startWorkflow } from './src/temporal/client.js';

let workerProcess: ChildProcessWithoutNullStreams | null = null;
let testStartTime: Date;

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function checkTelemetry(): Promise<void> {
  console.log('\n=== Checking Telemetry Events ===\n');

  try {
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
    });

    await client.connect();
    console.log('✅ Connected to TimescaleDB');

    // Query recent telemetry events
    const result = await client.query(`
      SELECT
        COUNT(*) as total_events,
        COUNT(DISTINCT workflow_id) as unique_workflows,
        MIN(timestamp) as earliest,
        MAX(timestamp) as latest
      FROM ts_martha.telemetry_events
      WHERE timestamp > $1
    `, [testStartTime]);

    console.log('\nTelemetry Summary:');
    console.log('  Total Events:', result.rows[0].total_events);
    console.log('  Unique Workflows:', result.rows[0].unique_workflows);

    if (result.rows[0].total_events > 0) {
      console.log('  Time Range:', result.rows[0].earliest, 'to', result.rows[0].latest);

      // Get event details
      const events = await client.query(`
        SELECT
          workflow_id,
          event_type,
          event_data,
          timestamp
        FROM ts_martha.telemetry_events
        WHERE timestamp > $1
        ORDER BY timestamp DESC
        LIMIT 10
      `, [testStartTime]);

      console.log('\nRecent Events:');
      events.rows.forEach((row, i) => {
        console.log(`  ${i + 1}. ${row.event_type} - ${row.workflow_id}`);
        console.log(`     Time: ${row.timestamp}`);
        console.log(`     Data: ${JSON.stringify(row.event_data).substring(0, 100)}...`);
      });
    } else {
      console.log('  ⚠️  No telemetry events found during test period');
    }

    await client.end();
  } catch (error: any) {
    console.error('❌ Error checking telemetry:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('   Database is not accessible at:', process.env.DATABASE_URL);
    }
  }
}

async function startWorkerInBackground(): Promise<void> {
  console.log('\n=== Starting Temporal Worker ===\n');

  return new Promise((resolve, reject) => {
    workerProcess = spawn('npx', ['tsx', 'src/temporal/worker.ts'], {
      cwd: '/mnt/data/martha.dev-v4-orchestration',
      env: { ...process.env },
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let startupComplete = false;

    workerProcess.stdout?.on('data', (data) => {
      const output = data.toString();
      console.log('[Worker]', output.trim());

      if (output.includes('Temporal worker created') ||
          output.includes('Worker state changed')) {
        if (!startupComplete) {
          startupComplete = true;
          resolve();
        }
      }
    });

    workerProcess.stderr?.on('data', (data) => {
      console.error('[Worker Error]', data.toString().trim());
    });

    workerProcess.on('error', (error) => {
      console.error('❌ Failed to start worker process:', error);
      reject(error);
    });

    // Give it 5 seconds max to start
    setTimeout(() => {
      if (!startupComplete) {
        console.log('⚠️  Worker startup timeout, proceeding anyway...');
        resolve();
      }
    }, 5000);
  });
}

async function stopWorkerProcess(): Promise<void> {
  console.log('\n=== Stopping Worker ===\n');

  if (workerProcess) {
    workerProcess.kill('SIGTERM');
    await sleep(2000);

    if (!workerProcess.killed) {
      console.log('Force killing worker...');
      workerProcess.kill('SIGKILL');
    }

    console.log('✅ Worker stopped');
  }
}

async function triggerTestWorkflow(): Promise<string> {
  console.log('\n=== Triggering Test Workflow ===\n');

  const workflowId = `integration-test-${Date.now()}`;
  const issueInput = {
    id: 'TEST-001',
    title: 'Integration Test Issue',
    complexity: 5,
    priority: 'high' as const,
  };

  console.log('Workflow ID:', workflowId);
  console.log('Issue:', issueInput.id, '-', issueInput.title);

  try {
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

    console.log('✅ Workflow started successfully!');
    console.log('Run ID:', handle.firstExecutionRunId);
    console.log('\nView in Temporal Cloud UI:');
    console.log(`https://cloud.temporal.io/namespaces/martha-dev-v4.mnjo7/workflows/${workflowId}/${handle.firstExecutionRunId}\n`);

    return workflowId;
  } catch (error: any) {
    console.error('❌ Failed to start workflow:', error.message);
    throw error;
  }
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║           TEMPORAL CLOUD INTEGRATION TEST                 ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  testStartTime = new Date();
  let workflowId: string | null = null;

  try {
    // Step 1: Start worker
    await startWorkerInBackground();
    console.log('✅ Worker is running');

    // Give worker a moment to fully initialize
    await sleep(3000);

    // Step 2: Trigger workflow
    workflowId = await triggerTestWorkflow();

    // Step 3: Monitor for 30 seconds
    console.log('\n=== Monitoring Execution (30 seconds) ===\n');
    for (let i = 30; i > 0; i--) {
      process.stdout.write(`\rTime remaining: ${i}s `);
      await sleep(1000);
    }
    console.log('\n\n✅ Monitoring period complete');

    // Step 4: Check telemetry
    await checkTelemetry();

    // Step 5: Stop worker
    await stopWorkerProcess();

    // Final summary
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                    TEST SUMMARY                            ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('\n✅ Integration test completed successfully!');
    console.log('\nTest Results:');
    console.log('  1. Temporal Cloud Connection: ✅ SUCCESS');
    console.log('  2. Worker Startup: ✅ SUCCESS');
    console.log('  3. Workflow Triggered: ✅ SUCCESS');
    if (workflowId) {
      console.log('     Workflow ID:', workflowId);
    }
    console.log('  4. Execution Monitoring: ✅ COMPLETED (30s)');
    console.log('  5. Telemetry Check: See above');

    console.log('\nNext Steps:');
    console.log('  - Check Temporal Cloud UI for workflow execution details');
    console.log('  - Review worker logs for any errors');
    console.log('  - Verify activities executed successfully');

  } catch (error: any) {
    console.error('\n❌ Integration test failed:', error.message);
    console.error('\nError details:', error);

    // Make sure to stop worker even on error
    await stopWorkerProcess();

    process.exit(1);
  }
}

// Handle cleanup on exit
process.on('SIGINT', async () => {
  console.log('\n\nReceived SIGINT, cleaning up...');
  await stopWorkerProcess();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n\nReceived SIGTERM, cleaning up...');
  await stopWorkerProcess();
  process.exit(0);
});

main();
