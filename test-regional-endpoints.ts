import { Connection } from '@temporalio/client';
import { config } from 'dotenv';

config({ path: '.env.local' });

// Common AWS regional endpoints for Temporal Cloud
const REGIONAL_ENDPOINTS = [
  'us-east-1.aws.api.temporal.io:7233',
  'us-west-2.aws.api.temporal.io:7233',
  'us-east-2.aws.api.temporal.io:7233',
  'eu-west-1.aws.api.temporal.io:7233',
  'eu-central-1.aws.api.temporal.io:7233',
  'ap-southeast-1.aws.api.temporal.io:7233',
  'ap-northeast-1.aws.api.temporal.io:7233',
];

async function testEndpoint(address: string): Promise<boolean> {
  try {
    console.log(`\nTesting: ${address}`);
    const connection = await Connection.connect({
      address,
      tls: {
        // Enable TLS but no client certificates (API key auth)
      },
      apiKey: process.env.TEMPORAL_API_KEY,
    });
    console.log('✅ Connection successful!');

    // Try to verify the connection works
    await connection.workflowService.getSystemInfo({});
    console.log('✅ System info retrieved successfully!');

    await connection.close();
    return true;
  } catch (error: any) {
    console.log(`❌ Failed: ${error.message}`);
    return false;
  }
}

async function findCorrectEndpoint() {
  console.log('\n=== Testing Temporal Cloud Regional Endpoints ===\n');
  console.log('API Key:', process.env.TEMPORAL_API_KEY?.substring(0, 30) + '...');
  console.log('Namespace:', process.env.TEMPORAL_NAMESPACE);
  console.log('\nNote: For API key authentication, you must use regional endpoints,');
  console.log('not the namespace endpoint (martha-dev-v4.mnjo7.tmprl.cloud:7233)\n');

  for (const endpoint of REGIONAL_ENDPOINTS) {
    const success = await testEndpoint(endpoint);
    if (success) {
      console.log(`\n🎉 SUCCESS! Use this endpoint: ${endpoint}`);
      console.log(`\nUpdate your .env.local:`);
      console.log(`TEMPORAL_ADDRESS=${endpoint}`);
      return;
    }
  }

  console.log('\n❌ None of the common endpoints worked.');
  console.log('You may need to check the Temporal Cloud UI to find your region.');
}

findCorrectEndpoint();
