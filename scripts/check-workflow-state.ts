#!/usr/bin/env tsx

import { getTemporalClient } from '../src/temporal/client.js';
import { createLogger } from '../src/utils/logger.js';

const logger = createLogger({ module: 'check-workflow' });

async function main() {
  const workflowId = 'issue-MTH-002-test-1768824080606';
  
  try {
    const client = await getTemporalClient();
    const handle = await client.workflow.getHandle(workflowId);
    
    // Get workflow description
    const desc = await handle.describe();
    console.log('=== Workflow Status ===');
    console.log('Status:', desc.status.name);
    console.log('Run ID:', desc.runId);
    
    // Try different queries
    const queries = ['getStatus', 'getMetrics', 'getHistory'];
    
    for (const queryName of queries) {
      try {
        console.log(`\n=== Query: ${queryName} ===`);
        const result = await handle.query(queryName);
        if (typeof result === 'object') {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log(result);
        }
      } catch (e: any) {
        console.log(`Failed: ${e.message}`);
      }
    }
    
    await client.connection.close();
  } catch (error: any) {
    logger.error('Error:', error.message);
    process.exit(1);
  }
}

main();
