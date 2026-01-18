import { Connection } from '@temporalio/client';
import { config } from 'dotenv';

config({ path: '.env.local' });

async function test() {
  console.log('\n=== Testing Temporal Cloud with serverName ===\n');
  
  try {
    const connection = await Connection.connect({
      address: 'martha-dev-v4.mnjo7.tmprl.cloud:7233',
      tls: {
        serverNameOverride: 'martha-dev-v4.mnjo7.tmprl.cloud',
      },
      apiKey: process.env.TEMPORAL_API_KEY,
    });
    console.log('✅ Connected successfully!');
    await connection.close();
  } catch (error: any) {
    console.error('❌ Failed:', error.message);
    
    // Try without serverName
    console.log('\nTrying without serverNameOverride...');
    try {
      const conn2 = await Connection.connect({
        address: 'martha-dev-v4.mnjo7.tmprl.cloud:7233',
        tls: true,
        apiKey: process.env.TEMPORAL_API_KEY,
      });
      console.log('✅ Connected with tls:true!');
      await conn2.close();
    } catch (error2: any) {
      console.error('❌ Also failed:', error2.message);
    }
  }
}

test();
