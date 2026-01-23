#!/usr/bin/env tsx

import { getTemporalClient } from '../src/temporal/client.js';
import { createLogger } from '../src/utils/logger.js';

const logger = createLogger({ module: 'query-workflow' });

async function main() {
  const workflowId = process.argv[2] || 'issue-MTH-002-test-1768823721428';
  
  logger.info('Querying workflow:', workflowId);
  
  try {
    const client = await getTemporalClient();
    const handle = await client.workflow.getHandle(workflowId);
    
    try {
      const status = await handle.query('getStatus');
      console.log('\n=== Workflow Status ===');
      console.log(JSON.stringify(status, null, 2));
    } catch (error: any) {
      logger.warn('Could not query getStatus:', error.message);
    }
    
    // Get workflow description
    const desc = await handle.describe();
    console.log('\n=== Workflow Description ===');
    console.log('Status:', desc.status.name);
    console.log('Run ID:', desc.runId);
    console.log('Start Time:', desc.startTime);
    if (desc.closeTime) {
      console.log('Close Time:', desc.closeTime);
    }
    
    await client.connection.close();
  } catch (error: any) {
    logger.error('Failed to query workflow:', error.message);
    process.exit(1);
  }
}

main();
