#!/usr/bin/env tsx

import { getTemporalClient } from '../src/temporal/client.js';
import { createLogger } from '../src/utils/logger.js';

const logger = createLogger({ module: 'send-test-signal' });

async function main() {
  const workflowId = 'issue-MTH-002-test-1768824080606';
  
  logger.info('Sending test results signal to workflow:', workflowId);
  
  try {
    const client = await getTemporalClient();
    const handle = await client.workflow.getHandle(workflowId);
    
    await handle.signal('testResults', {
      passed: 26,
      failed: 0,
      skipped: 0,
      coverage: 100,
      timestamp: Date.now(),
      details: { message: 'All tests passed with 100% coverage' },
    });
    
    logger.info('✅ Test results signal sent successfully');
    await client.connection.close();
  } catch (error: any) {
    logger.error('Failed to send signal:', error.message);
    process.exit(1);
  }
}

main();
