#!/usr/bin/env tsx
/**
 * Test different namespace formats with regional endpoint
 */

import { Connection, Client } from '@temporalio/client';
import { config } from 'dotenv';

config({ path: '.env.local' });

const NAMESPACE_FORMATS = [
  'martha-dev-v4.mnjo7',     // Full format with account
  'martha-dev-v4',            // Just the name
  'mnjo7.martha-dev-v4',      // Account.namespace
];

async function testNamespaceFormat(namespace: string) {
  try {
    console.log(`\n━━━ Testing namespace: "${namespace}" ━━━`);

    const connection = await Connection.connect({
      address: process.env.TEMPORAL_ADDRESS!,
      tls: {},
      apiKey: process.env.TEMPORAL_API_KEY,
    });

    const client = new Client({
      connection,
      namespace,
    });

    const workflowId = `test-${Date.now()}`;

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

    console.log(`✅ SUCCESS with namespace: "${namespace}"`);
    console.log('Run ID:', handle.firstExecutionRunId);
    console.log(`View: https://cloud.temporal.io/namespaces/${namespace}/workflows/${workflowId}`);

    await connection.close();
    return true;

  } catch (error: any) {
    console.log(`❌ FAILED with namespace: "${namespace}"`);
    console.log('   Error:', error.message);
    return false;
  }
}

async function main() {
  console.log('\n=== Testing Namespace Formats with Regional Endpoint ===');
  console.log('Address:', process.env.TEMPORAL_ADDRESS);
  console.log('API Key:', process.env.TEMPORAL_API_KEY?.substring(0, 30) + '...\n');

  for (const namespace of NAMESPACE_FORMATS) {
    const success = await testNamespaceFormat(namespace);
    if (success) {
      console.log(`\n🎉 Found working namespace format: "${namespace}"`);
      console.log(`Update your .env.local:`);
      console.log(`TEMPORAL_NAMESPACE=${namespace}`);
      break;
    }
  }
}

main();
