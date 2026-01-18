import { Connection } from '@temporalio/client';
import { config } from 'dotenv';

config({ path: '.env.local' });

async function testNamespace() {
  console.log('\n=== Testing Temporal Cloud Namespace ===\n');
  console.log('Address:', process.env.TEMPORAL_ADDRESS);
  console.log('Trying namespace:', process.env.TEMPORAL_NAMESPACE);
  console.log('API Key:', process.env.TEMPORAL_API_KEY?.substring(0, 30) + '...');

  try {
    const connection = await Connection.connect({
      address: process.env.TEMPORAL_ADDRESS!,
      tls: {},
      apiKey: process.env.TEMPORAL_API_KEY,
    });
    console.log('\n✅ Connection established');

    // Try to get system info
    console.log('\nGetting system info...');
    const systemInfo = await connection.workflowService.getSystemInfo({});
    console.log('System info:', systemInfo);

    // Try to describe the namespace
    console.log('\nDescribing namespace...');
    try {
      const namespaceInfo = await connection.workflowService.describeNamespace({
        namespace: process.env.TEMPORAL_NAMESPACE!,
      });
      console.log('✅ Namespace found:', namespaceInfo.namespaceInfo?.name);
    } catch (error: any) {
      console.error('❌ Namespace error:', error.message);

      // Try without the .mnjo7 suffix
      const simpleNamespace = 'martha-dev-v4';
      console.log(`\nTrying simplified namespace: ${simpleNamespace}`);
      try {
        const namespaceInfo = await connection.workflowService.describeNamespace({
          namespace: simpleNamespace,
        });
        console.log('✅ Namespace found with simplified name:', namespaceInfo.namespaceInfo?.name);
        console.log(`\nUpdate your .env.local:`);
        console.log(`TEMPORAL_NAMESPACE=${simpleNamespace}`);
      } catch (error2: any) {
        console.error('❌ Also failed with simplified namespace:', error2.message);
      }
    }

    await connection.close();
  } catch (error: any) {
    console.error('\n❌ Connection failed:', error.message);
  }
}

testNamespace();
