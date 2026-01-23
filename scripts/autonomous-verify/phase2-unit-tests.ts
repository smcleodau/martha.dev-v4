#!/usr/bin/env tsx

/**
 * Phase 2: Unit Testing
 *
 * Runs all Jest unit test suites with coverage reporting.
 * Executes 100+ unit tests across evidence, gates, agents, and workflow modules.
 *
 * Success Criteria:
 * - All unit tests pass
 * - Code coverage >= 80% (functions, lines, branches, statements)
 * - Test execution < 5 minutes
 */

import { execSync } from 'child_process';
import { createLogger } from '../../src/utils/logger.js';
import { writeFileSync } from 'fs';
import { join } from 'path';

const logger = createLogger({ module: 'phase2-unit-tests' });

interface TestResult {
  phase: string;
  category: string;
  passed: boolean;
  tests: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
  };
  coverage?: {
    lines: number;
    functions: number;
    branches: number;
    statements: number;
  };
  duration: number;
  errors: string[];
}

/**
 * Run Jest unit tests
 */
async function runUnitTests(): Promise<TestResult> {
  const startTime = Date.now();
  const errors: string[] = [];

  logger.info('=================================================');
  logger.info('  Phase 2: Unit Testing');
  logger.info('=================================================');
  logger.info('');

  try {
    logger.info('Running Jest unit tests with coverage...');

    // Run Jest tests
    const output = execSync('npm run test:unit -- --coverage --json --outputFile=logs/jest-results.json', {
      encoding: 'utf-8',
      stdio: 'pipe',
      timeout: 300000, // 5 minute timeout
    });

    // Parse Jest output
    const jestResults = JSON.parse(output);

    const testStats = {
      total: jestResults.numTotalTests || 0,
      passed: jestResults.numPassedTests || 0,
      failed: jestResults.numFailedTests || 0,
      skipped: jestResults.numPendingTests || 0,
    };

    // Extract coverage
    const coverage = jestResults.coverageMap
      ? {
          lines: Math.round((jestResults.coverageMap.total?.lines?.pct || 0) * 100) / 100,
          functions: Math.round((jestResults.coverageMap.total?.functions?.pct || 0) * 100) / 100,
          branches: Math.round((jestResults.coverageMap.total?.branches?.pct || 0) * 100) / 100,
          statements:
            Math.round((jestResults.coverageMap.total?.statements?.pct || 0) * 100) / 100,
        }
      : undefined;

    const duration = Date.now() - startTime;
    const passed = testStats.failed === 0;

    // Log results
    logger.info('');
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.info('  Unit Test Results');
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.info('');
    logger.info(`Total Tests: ${testStats.total}`);
    logger.info(`✅ Passed: ${testStats.passed}`);
    logger.info(`❌ Failed: ${testStats.failed}`);
    logger.info(`⏭️  Skipped: ${testStats.skipped}`);
    logger.info(`Duration: ${duration}ms (${(duration / 1000).toFixed(2)}s)`);
    logger.info('');

    if (coverage) {
      logger.info('Code Coverage:');
      logger.info(`  Lines: ${coverage.lines}%`);
      logger.info(`  Functions: ${coverage.functions}%`);
      logger.info(`  Branches: ${coverage.branches}%`);
      logger.info(`  Statements: ${coverage.statements}%`);
      logger.info('');

      // Check coverage thresholds
      const threshold = 80;
      if (
        coverage.lines < threshold ||
        coverage.functions < threshold ||
        coverage.branches < threshold ||
        coverage.statements < threshold
      ) {
        errors.push(`Coverage below ${threshold}% threshold`);
        logger.warn(`⚠️  Coverage below ${threshold}% threshold`);
      } else {
        logger.info(`✅ Coverage meets ${threshold}% threshold`);
      }
    }

    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.info('');

    const result: TestResult = {
      phase: 'Phase 2',
      category: 'Unit Tests',
      passed: passed && errors.length === 0,
      tests: testStats,
      coverage,
      duration,
      errors,
    };

    // Write results to file
    writeFileSync('logs/phase2-unit-tests.json', JSON.stringify(result, null, 2));

    if (result.passed) {
      logger.info('✅ Phase 2: Unit testing passed!');
      return result;
    } else {
      logger.error('❌ Phase 2: Unit testing failed');
      logger.error('Errors:', errors);
      return result;
    }
  } catch (error: any) {
    const duration = Date.now() - startTime;

    // Try to parse partial results if available
    let testStats = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
    };

    try {
      const fs = await import('fs/promises');
      const resultsFile = await fs.readFile('logs/jest-results.json', 'utf-8');
      const jestResults = JSON.parse(resultsFile);
      testStats = {
        total: jestResults.numTotalTests || 0,
        passed: jestResults.numPassedTests || 0,
        failed: jestResults.numFailedTests || 0,
        skipped: jestResults.numPendingTests || 0,
      };
    } catch {
      // Couldn't load results
    }

    errors.push(error.message);

    logger.error('Unit tests failed with error:', error.message);

    if (error.stderr) {
      logger.error('Error output:', error.stderr);
      errors.push(error.stderr.substring(0, 500));
    }

    const result: TestResult = {
      phase: 'Phase 2',
      category: 'Unit Tests',
      passed: false,
      tests: testStats,
      duration,
      errors,
    };

    writeFileSync('logs/phase2-unit-tests.json', JSON.stringify(result, null, 2));

    return result;
  }
}

/**
 * Run specific test suites individually
 */
async function runTestSuitesByCategory(): Promise<void> {
  const categories = [
    { name: 'Evidence Store', pattern: 'tests/unit/evidence/evidence-store.test.ts' },
    { name: 'Evidence Validator', pattern: 'tests/unit/evidence/evidence-validator.test.ts' },
    { name: 'Stage Gates', pattern: 'tests/unit/gates/*.test.ts' },
    { name: 'Agent Spawner', pattern: 'tests/unit/agents/*.test.ts' },
    { name: 'Workflows', pattern: 'tests/unit/workflows/*.test.ts' },
  ];

  logger.info('Running test suites by category:');
  logger.info('');

  for (const category of categories) {
    try {
      logger.info(`Running: ${category.name}...`);
      execSync(`npm run test:unit -- ${category.pattern}`, {
        encoding: 'utf-8',
        stdio: 'inherit',
        timeout: 60000,
      });
      logger.info(`✅ ${category.name} passed`);
    } catch (error) {
      logger.error(`❌ ${category.name} failed`);
    }
    logger.info('');
  }
}

// Main execution
async function main() {
  try {
    const result = await runUnitTests();

    if (!result.passed) {
      logger.info('');
      logger.info('Running test suites individually for detailed results...');
      logger.info('');
      await runTestSuitesByCategory();

      process.exit(1);
    }

    process.exit(0);
  } catch (error: any) {
    logger.error('Phase 2 execution failed:', error.message);
    process.exit(1);
  }
}

main();
