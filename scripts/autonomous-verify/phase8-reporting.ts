#!/usr/bin/env tsx

/**
 * Phase 8: Reporting & Cleanup
 *
 * Generates comprehensive reports and cleans up test data:
 * - HTML report (visual dashboard)
 * - JSON report (machine-readable)
 * - Markdown summary (documentation)
 * - Cleanup database test data
 * - Cleanup filesystem test artifacts
 * - Archive results
 */

import { createLogger } from '../../src/utils/logger.js';
import { reportGenerator, type VerificationReport } from './utils/report-generator.js';
import { CleanupManager } from './utils/cleanup-manager.js';
import { Pool } from 'pg';
import { readdirSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const logger = createLogger({ module: 'phase8-reporting' });

/**
 * Aggregate results from all phases
 */
function aggregateResults(): VerificationReport {
  const phaseFiles = [
    'logs/phase1-infrastructure.json',
    'logs/phase2-unit-tests.json',
    'logs/phase3-integration.json',
    'logs/phase5-load-testing.json',
    'logs/phase6-error-scenarios.json',
    'logs/phase7-observability.json',
  ];

  const phases: any[] = [];
  let totalTests = 0;
  let passed = 0;
  let failed = 0;
  let skipped = 0;
  let totalDuration = 0;
  const errors: any[] = [];

  for (const file of phaseFiles) {
    if (!existsSync(file)) {
      logger.warn(`Phase result file not found: ${file}`);
      continue;
    }

    try {
      const content = readFileSync(file, 'utf-8');
      const result = JSON.parse(content);

      if (result.tests) {
        totalTests += result.tests.total || 0;
        passed += result.tests.passed || 0;
        failed += result.tests.failed || 0;
        skipped += result.tests.skipped || 0;
      }

      totalDuration += result.duration || 0;

      phases.push({
        phase: result.phase === 'Phase 1' ? 1 : result.phase === 'Phase 2' ? 2 : result.phase === 'Phase 3' ? 3 : result.phase === 'Phase 5' ? 5 : result.phase === 'Phase 6' ? 6 : 7,
        name: result.category,
        status: result.passed ? 'passed' : result.skipped ? 'skipped' : 'failed',
        tests: [],
        passed: result.tests?.passed || 0,
        failed: result.tests?.failed || 0,
        skipped: result.tests?.skipped || 0,
        duration: result.duration,
      });

      if (result.errors && result.errors.length > 0) {
        for (const error of result.errors) {
          errors.push({
            phase: result.phase,
            test: result.category,
            error: error,
          });
        }
      }
    } catch (error: any) {
      logger.error(`Error reading phase result file ${file}:`, error.message);
    }
  }

  const successRate = totalTests > 0 ? Math.round((passed / totalTests) * 1000) / 10 : 0;

  return {
    summary: {
      totalTests,
      passed,
      failed,
      skipped,
      duration: totalDuration,
      successRate,
      timestamp: new Date().toISOString(),
    },
    phases,
    errors,
  };
}

/**
 * Generate reports
 */
async function generateReports(report: VerificationReport): Promise<void> {
  logger.info('Generating reports...');

  // Ensure reports directory exists
  if (!existsSync('reports')) {
    mkdirSync('reports', { recursive: true });
  }

  await reportGenerator.generateAll(report, 'reports');

  logger.info('✅ Reports generated successfully');
}

/**
 * Cleanup test data
 */
async function cleanupTestData(): Promise<void> {
  logger.info('Cleaning up test data...');

  try {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      logger.warn('DATABASE_URL not set, skipping cleanup');
      return;
    }

    const dbPool = new Pool({ connectionString: dbUrl });
    const cleanupManager = new CleanupManager(dbPool);

    await cleanupManager.cleanupByPattern(['TEST-%', 'LOAD-%', 'PERF-%']);

    const isClean = await cleanupManager.verifyCleanup();

    if (isClean) {
      logger.info('✅ Cleanup verification passed');
    } else {
      logger.warn('⚠️  Some test data may remain');
    }

    await dbPool.end();
  } catch (error: any) {
    logger.error('Error during cleanup:', error.message);
  }
}

/**
 * Create archive of results
 */
function createArchive(): void {
  logger.info('Creating results archive...');

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const archiveName = `autonomous-verify-artifacts-${timestamp}.tar.gz`;

  try {
    execSync(
      `tar -czf ${archiveName} reports/ logs/ coverage/ 2>/dev/null || echo "Some files not found"`,
      {
        encoding: 'utf-8',
        stdio: 'pipe',
      },
    );

    logger.info(`✅ Archive created: ${archiveName}`);
  } catch (error: any) {
    logger.warn('Could not create archive:', error.message);
  }
}

/**
 * Main execution
 */
async function main() {
  const startTime = Date.now();

  logger.info('=================================================');
  logger.info('  Phase 8: Reporting & Cleanup');
  logger.info('=================================================');
  logger.info('');

  try {
    // Aggregate results
    logger.info('Aggregating results from all phases...');
    const report = aggregateResults();

    logger.info('');
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.info('  Verification Summary');
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.info('');
    logger.info(`Total Tests: ${report.summary.totalTests}`);
    logger.info(`✅ Passed: ${report.summary.passed}`);
    logger.info(`❌ Failed: ${report.summary.failed}`);
    logger.info(`⏭️  Skipped: ${report.summary.skipped}`);
    logger.info(`Success Rate: ${report.summary.successRate}%`);
    logger.info(`Total Duration: ${(report.summary.duration / 1000).toFixed(2)}s`);
    logger.info('');
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.info('');

    // Generate reports
    await generateReports(report);

    // Cleanup test data
    await cleanupTestData();

    // Create archive
    createArchive();

    const duration = Date.now() - startTime;

    logger.info('');
    logger.info(`✅ Phase 8 completed in ${(duration / 1000).toFixed(2)}s`);
    logger.info('');
    logger.info('📊 Reports available:');
    logger.info('  - reports/autonomous-verify-report.html');
    logger.info('  - reports/autonomous-verify-report.json');
    logger.info('  - reports/VERIFICATION-SUMMARY.md');
    logger.info('');

    process.exit(0);
  } catch (error: any) {
    logger.error('❌ Phase 8 failed:', error.message);
    logger.error(error.stack);
    process.exit(1);
  }
}

main();
