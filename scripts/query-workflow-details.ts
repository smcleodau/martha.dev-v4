#!/usr/bin/env tsx

import { getTemporalClient } from '../src/temporal/client.js';

async function main() {
  const workflowId = process.argv[2] || 'issue-MTH-002-test-1768823721428';
  
  try {
    const client = await getTemporalClient();
    const handle = await client.workflow.getHandle(workflowId);
    
    // Get full status with details
    const status = await handle.query('getStatus');
    console.log('Current Stage:', status);
    
    // Try to get history count
    const history = await handle.query('getHistory');
    console.log('\n=== Workflow History ===');
    console.log(JSON.stringify(history, null, 2));
    
    await client.connection.close();
  } catch (error: any) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
