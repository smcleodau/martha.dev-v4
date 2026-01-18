#!/usr/bin/env tsx
/**
 * Test workflow trigger directly without describing namespace first
 */

import { Connection, Client } from '@temporalio/client';
import { config } from 'dotenv';

config({ path: '.env.local' });

async function main() {
  try {
    console.log('\n=== Testing Direct Workflow Start ===\n');
    console.log('Address:', process.env.TEMPORAL_ADDRESS);
    console.log('Namespace:', process.env.TEMPORAL_NAMESPACE);
    console.log('API Key:', process.env.TEMPORAL_API_KEY?.substring(0, 30) + '...');

    console.log('\nConnecting to Temporal Cloud...');
    const connection = await Connection.connect({
      address: process.env.TEMPORAL_ADDRESS!,
      tls: {},
      apiKey: process.env.TEMPORAL_API_KEY,
    });

    const client = new Client({
      connection,
      namespace: process.env.TEMPORAL_NAMESPACE!,
    });

    console.log('✅ Client created');

    // Try to start a workflow with a real issue
    const workflowId = `mth-118-${Date.now()}`;
    console.log('\nAttempting to start workflow:', workflowId);

    const handle = await client.workflow.start('IssueLifecycleWorkflow', {
      workflowId,
      taskQueue: 'martha-tasks',
      args: [{
        id: 'MTH-118',
        title: 'Issue 5.4: Approval Rule Management API',
        complexity: 8,
        priority: 'medium',
      }],
    });

    console.log('\n✅ Workflow started successfully!');
    console.log('Run ID:', handle.firstExecutionRunId);
    console.log('\nView in Temporal Cloud UI:');
    console.log(`https://cloud.temporal.io/namespaces/${process.env.TEMPORAL_NAMESPACE}/workflows/${workflowId}/${handle.firstExecutionRunId}\n`);

    await connection.close();

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    if (error.code) {
      console.error('Error code:', error.code);
    }
    if (error.details) {
      console.error('Details:', error.details);
    }
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

main();
