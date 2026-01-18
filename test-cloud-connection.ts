import { Connection } from '@temporalio/client';
import { config } from 'dotenv';

config({ path: '.env.local' });

async function test() {
  console.log('\n=== Testing Temporal Cloud Connection ===\n');
  console.log('API Key:', process.env.TEMPORAL_API_KEY?.substring(0, 30) + '...');
  console.log('Address:', process.env.TEMPORAL_ADDRESS);
  console.log('Namespace:', process.env.TEMPORAL_NAMESPACE);
  
  try {
    console.log('\nAttempting connection with API key...');
    const connection = await Connection.connect({
      address: process.env.TEMPORAL_ADDRESS!,
      tls: {},  // Empty TLS config for default TLS
      apiKey: process.env.TEMPORAL_API_KEY,
    });
    console.log('✅ Connected successfully!');
    await connection.close();
  } catch (error: any) {
    console.error('\n❌ Connection failed:', error.message);
    console.error('\nFull error:', error);
  }
}

test();
