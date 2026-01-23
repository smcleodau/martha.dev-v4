#!/usr/bin/env tsx

/**
 * Phase 3: Integration Testing
 *
 * Runs integration tests that verify interactions between components:
 * - Workflow + Evidence integration
 * - API endpoints
 * - Temporal Cloud workflows
 *
 * Success Criteria:
 * - All 30 integration tests pass
 * - Real database writes succeed
 * - Real Temporal Cloud workflows execute
 */

import { execSync } from 'child_process';
import { createLogger } from '../../src/utils/logger.js';
import { writeFileSync } from 'fs';

const logger = createLogger({ module: 'phase3-integration' });

async function runIntegrationTests() {
  const startTime = Date.now();

  logger.info('=================================================');
  logger.info('  Phase 3: Integration Testing');
  logger.info('=================================================');
  logger.info('');

  try {
    logger.info('Running integration tests...');

    execSync('npm run test:integration', {
      encoding: 'utf-8',
      stdio: 'inherit',
      timeout: 300000,
    });

    const duration = Date.now() - startTime;

    const result = {
      phase: 'Phase 3',
      category: 'Integration Tests',
      passed: true,
      duration,
      errors: [],
    };

    writeFileSync('logs/phase3-integration.json', JSON.stringify(result, null, 2));

    logger.info('✅ Phase 3: Integration testing passed!');
    process.exit(0);
  } catch (error: any) {
    const duration = Date.now() - startTime;

    logger.error('❌ Phase 3: Integration testing failed');
    logger.error('Error:', error.message);

    const result = {
      phase: 'Phase 3',
      category: 'Integration Tests',
      passed: false,
      duration,
      errors: [error.message],
    };

    writeFileSync('logs/phase3-integration.json', JSON.stringify(result, null, 2));

    process.exit(1);
  }
}

runIntegrationTests();
