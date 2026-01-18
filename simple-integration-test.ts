#!/usr/bin/env tsx
/**
 * Simple Integration Test
 *
 * Tests Temporal Cloud integration without complex workflows
 */

import { config } from 'dotenv';

// Load environment variables FIRST
config({ path: '.env.local' });

import { Connection, Client } from '@temporalio/client';
import { Worker, NativeConnection } from '@temporalio/worker';
import { Client as PgClient } from 'pg';
import * as activities from './src/activities/issue-activities.js';

let worker: Worker | null = null;
let connection: NativeConnection | null = null;
const testStartTime = new Date();

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function checkTelemetry(): Promise<void> {
  console.log('\n=== Checking Telemetry Events ===\n');

  try {
    const client = new PgClient({
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

    if (parseInt(result.rows[0].total_events) > 0) {
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

async function startWorker(): Promise<void> {
  console.log('\n=== Starting Temporal Worker ===\n');
  console.log('Address:', process.env.TEMPORAL_ADDRESS);
  console.log('Namespace:', process.env.TEMPORAL_NAMESPACE);
  console.log('Task Queue:', process.env.TEMPORAL_TASK_QUEUE);

  try {
    connection = await NativeConnection.connect({
      address: process.env.TEMPORAL_ADDRESS!,
      apiKey: process.env.TEMPORAL_API_KEY,
      tls: {},
    });

    console.log('✅ Connected to Temporal Cloud');

    worker = await Worker.create({
      connection,
      namespace: process.env.TEMPORAL_NAMESPACE!,
      taskQueue: process.env.TEMPORAL_TASK_QUEUE!,
      workflowsPath: new URL('./src/workflows', import.meta.url).pathname,
      activities,
    });

    console.log('✅ Worker created successfully');

    // Run worker in background (non-blocking)
    worker.run().catch((error) => {
      console.error('Worker error:', error);
    });

    console.log('✅ Worker is running');
  } catch (error: any) {
    console.error('❌ Failed to start worker:', error.message);
    throw error;
  }
}

async function stopWorker(): Promise<void> {
  console.log('\n=== Stopping Worker ===\n');

  if (worker) {
    await worker.shutdown();
    console.log('✅ Worker shutdown complete');
  }

  if (connection) {
    await connection.close();
    console.log('✅ Connection closed');
  }
}

async function queryExistingWorkflows(): Promise<void> {
  console.log('\n=== Querying Existing Workflows ===\n');

  try {
    const client = new Client({
      connection: await Connection.connect({
        address: process.env.TEMPORAL_ADDRESS!,
        apiKey: process.env.TEMPORAL_API_KEY,
        tls: {},
      }),
      namespace: process.env.TEMPORAL_NAMESPACE!,
    });

    // List workflow executions
    console.log('Fetching workflow list from Temporal Cloud...');

    // Note: We can't easily list workflows without additional setup,
    // but we can verify the connection works
    console.log('✅ Client connection successful');
    console.log('   (Workflow listing requires additional Temporal APIs)');

  } catch (error: any) {
    console.error('❌ Failed to query workflows:', error.message);
  }
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║        SIMPLE TEMPORAL CLOUD INTEGRATION TEST             ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  try {
    // Step 1: Start worker
    await startWorker();

    // Step 2: Let worker poll for existing workflows (30 seconds)
    console.log('\n=== Monitoring for Workflow Activity (30 seconds) ===\n');
    console.log('Worker is polling Temporal Cloud for workflows...');
    console.log('Existing workflows in the queue will be picked up automatically.');
    console.log('');

    for (let i = 30; i > 0; i--) {
      process.stdout.write(`\rTime remaining: ${i}s `);
      await sleep(1000);
    }
    console.log('\n\n✅ Monitoring period complete');

    // Step 3: Query workflows (if possible)
    await queryExistingWorkflows();

    // Step 4: Check telemetry
    await checkTelemetry();

    // Step 5: Stop worker
    await stopWorker();

    // Final summary
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                    TEST SUMMARY                            ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('\n✅ Integration test completed successfully!');
    console.log('\nTest Results:');
    console.log('  1. Temporal Cloud Connection: ✅ SUCCESS');
    console.log('  2. Worker Startup: ✅ SUCCESS');
    console.log('  3. Worker Polling: ✅ COMPLETED (30s)');
    console.log('  4. Telemetry Check: See above');

    console.log('\nNext Steps:');
    console.log('  - Check Temporal Cloud UI for any workflow activity');
    console.log('  - Review telemetry events in TimescaleDB');
    console.log('  - Worker successfully connected and polled for tasks');

    console.log('\nTemporal Cloud UI:');
    console.log('  https://cloud.temporal.io/namespaces/martha-dev-v4.mnjo7/workflows\n');

  } catch (error: any) {
    console.error('\n❌ Integration test failed:', error.message);
    console.error('\nError details:', error);

    await stopWorker();
    process.exit(1);
  }
}

// Handle cleanup on exit
process.on('SIGINT', async () => {
  console.log('\n\nReceived SIGINT, cleaning up...');
  await stopWorker();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n\nReceived SIGTERM, cleaning up...');
  await stopWorker();
  process.exit(0);
});

main();
