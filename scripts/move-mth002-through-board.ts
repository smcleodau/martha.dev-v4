#!/usr/bin/env tsx

/**
 * Move MTH-002 Through Board
 *
 * Moves MTH-002 issue through all board columns via API,
 * triggering WebSocket updates for real-time visualization.
 */

import { createLogger } from '../src/utils/logger.js';
import { sleep } from './autonomous-verify/utils/test-helpers.js';

const logger = createLogger({ module: 'board-moves' });

const API_BASE = 'http://localhost:20000';
const ISSUE_ID = 'MTH-002';

async function moveIssue(toStatus: string): Promise<void> {
  try {
    const response = await fetch(`${API_BASE}/api/issues/${ISSUE_ID}/move`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to_status: toStatus,
        position: 0, // Top of column
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to move issue: ${response.statusText}`);
    }

    const data = await response.json();
    logger.info(`✅ Moved ${ISSUE_ID} to: ${toStatus}`);
  } catch (error: any) {
    logger.error(`Failed to move issue to ${toStatus}:`, error.message);
    throw error;
  }
}

async function main() {
  try {
    logger.info('Moving MTH-002 through board columns...');
    logger.info('');

    // Check if API is running
    try {
      await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(5000) });
    } catch (error) {
      logger.error('API server is not running at http://localhost:20000');
      logger.error('Start it with: cd /mnt/data/martha-workflow/tracker/api && uvicorn main:app --port 20000');
      process.exit(1);
    }

    // Step 1: todo → in_progress
    logger.info('Step 1: Moving to "In Progress"...');
    await moveIssue('in_progress');
    await sleep(2000);

    // Step 2: in_progress → code_complete
    logger.info('Step 2: Moving to "Code Complete"...');
    await moveIssue('code_complete');
    await sleep(2000);

    // Step 3: code_complete → testing
    logger.info('Step 3: Moving to "Testing"...');
    await moveIssue('testing');
    await sleep(2000);

    // Step 4: testing → review
    logger.info('Step 4: Moving to "Review"...');
    await moveIssue('review');
    await sleep(2000);

    // Step 5: review → done
    logger.info('Step 5: Moving to "Done"...');
    await moveIssue('done');

    logger.info('');
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.info('✅ Issue moved through all stages!');
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.info('');
    logger.info('View board:');
    logger.info('https://martha.arch.ie/tracker/calculator-app/calculator-development/kanban');
    logger.info('');
  } catch (error: any) {
    logger.error('Failed to move issue through board:', error.message);
    process.exit(1);
  }
}

main();
