#!/usr/bin/env tsx
/**
 * Test both endpoint types with API key
 */

import { Connection, Client } from '@temporalio/client';
import { config } from 'dotenv';

config({ path: '.env.local' });

const ENDPOINTS = [
  {
    name: 'Regional Endpoint',
    address: 'us-east-1.aws.api.temporal.io:7233',
    namespace: 'martha-dev-v4.mnjo7',
  },
  {
    name: 'Namespace Endpoint',
    address: 'martha-dev-v4.mnjo7.tmprl.cloud:7233',
    namespace: 'martha-dev-v4.mnjo7',
  },
];

async function testEndpoint(config: { name: string; address: string; namespace: string }) {
  try {
    console.log(`\n━━━ Testing: ${config.name} ━━━`);
    console.log(`Address: ${config.address}`);
    console.log(`Namespace: ${config.namespace}`);

    const connection = await Connection.connect({
      address: config.address,
      tls: {},
      apiKey: process.env.TEMPORAL_API_KEY,
    });

    const client = new Client({
      connection,
      namespace: config.namespace,
    });

    const workflowId = `test-${Date.now()}`;

    console.log('Starting workflow...');
    const handle = await client.workflow.start('IssueLifecycleWorkflow', {
      workflowId,
      taskQueue: 'martha-tasks',
      args: [{
        id: 'TEST-1',
        title: 'Test workflow',
        complexity: 1,
        priority: 'low',
      }],
    });

    console.log(`✅ SUCCESS!`);
    console.log('Run ID:', handle.firstExecutionRunId);
    console.log(`\nUse this configuration:`);
    console.log(`TEMPORAL_ADDRESS=${config.address}`);
    console.log(`TEMPORAL_NAMESPACE=${config.namespace}`);

    await connection.close();
    return true;

  } catch (error: any) {
    console.log(`❌ FAILED`);
    console.log('Error:', error.message);
    if (error.cause?.details) {
      console.log('Details:', error.cause.details);
    }
    return false;
  }
}

async function main() {
  console.log('\n=== Testing Both Endpoint Types ===');
  console.log('API Key:', process.env.TEMPORAL_API_KEY?.substring(0, 30) + '...\n');

  for (const endpoint of ENDPOINTS) {
    const success = await testEndpoint(endpoint);
    if (success) {
      break;
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\nIf both failed, the API key likely needs permissions granted.');
  console.log('Check in Temporal Cloud UI:');
  console.log('1. Go to Settings > Service Accounts');
  console.log('2. Find the service account for this API key');
  console.log('3. Grant it namespace permissions for martha-dev-v4.mnjo7');
}

main();
