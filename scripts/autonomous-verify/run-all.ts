#!/usr/bin/env tsx

/**
 * Master Orchestrator for Autonomous Verification
 *
 * Executes all verification phases sequentially:
 * - Phase 1: Infrastructure Validation
 * - Phase 2: Unit Testing
 * - Phase 3: Integration Testing
 * - Phase 4: E2E Verification (Simple, Real Agent, Batch)
 * - Phase 5: Load & Stress Testing
 * - Phase 6: Error Scenarios
 * - Phase 7: Observability Validation
 * - Phase 8: Reporting & Cleanup
 *
 * Usage:
 *   npm run verify:all           # Run all phases
 *   npm run verify:all -- --skip-cleanup  # Skip Phase 8 cleanup
 *   npm run verify:all -- --phases=1,2,3  # Run specific phases
 */

import { execSync, spawn } from 'child_process';
import { createLogger } from '../../src/utils/logger.js';
import { errorResolver } from './utils/error-resolver.js';
import { mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const logger = createLogger({ module: 'autonomous-verify' });

interface PhaseConfig {
  number: number;
  name: string;
  script: string;
  critical: boolean;
  skipOnFailure: boolean;
}

const PHASES: PhaseConfig[] = [
  {
    number: 1,
    name: 'Infrastructure Validation',
    script: 'scripts/autonomous-verify/phase1-infrastructure.ts',
    critical: true,
    skipOnFailure: false,
  },
  {
    number: 2,
    name: 'Unit Testing',
    script: 'scripts/autonomous-verify/phase2-unit-tests.ts',
    critical: false,
    skipOnFailure: true,
  },
  {
    number: 3,
    name: 'Integration Testing',
    script: 'scripts/autonomous-verify/phase3-integration.ts',
    critical: false,
    skipOnFailure: true,
  },
  {
    number: 4,
    name: 'E2E Testing (Simple)',
    script: 'scripts/autonomous-verify/phase4-simple-e2e.ts',
    critical: false,
    skipOnFailure: true,
  },
  {
    number: 5,
    name: 'Load & Stress Testing',
    script: 'scripts/autonomous-verify/phase5-load-testing.ts',
    critical: false,
    skipOnFailure: true,
  },
  {
    number: 6,
    name: 'Error Scenarios',
    script: 'scripts/autonomous-verify/phase6-error-scenarios.ts',
    critical: false,
    skipOnFailure: true,
  },
  {
    number: 7,
    name: 'Observability Validation',
    script: 'scripts/autonomous-verify/phase7-observability.ts',
    critical: false,
    skipOnFailure: true,
  },
  {
    number: 8,
    name: 'Reporting & Cleanup',
    script: 'scripts/autonomous-verify/phase8-reporting.ts',
    critical: false,
    skipOnFailure: false,
  },
];

interface PhaseResult {
  phase: number;
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: string;
  autoFixed?: boolean;
}

const results: PhaseResult[] = [];

/**
 * Parse command line arguments
 */
function parseArgs(): { phasesToRun: number[]; skipCleanup: boolean } {
  const args = process.argv.slice(2);

  let phasesToRun: number[] = PHASES.map(p => p.number);
  let skipCleanup = false;

  for (const arg of args) {
    if (arg.startsWith('--phases=')) {
      const phases = arg.substring('--phases='.length);
      phasesToRun = phases.split(',').map(p => parseInt(p.trim()));
    } else if (arg === '--skip-cleanup') {
      skipCleanup = true;
    }
  }

  if (skipCleanup) {
    phasesToRun = phasesToRun.filter(p => p !== 8);
  }

  return { phasesToRun, skipCleanup };
}

/**
 * Run a single phase
 */
async function runPhase(phase: PhaseConfig): Promise<PhaseResult> {
  const startTime = Date.now();

  logger.info('');
  logger.info('═══════════════════════════════════════════════');
  logger.info(`  Phase ${phase.number}: ${phase.name}`);
  logger.info('═══════════════════════════════════════════════');
  logger.info('');

  try {
    // Check if script exists
    if (!existsSync(phase.script)) {
      throw new Error(`Phase script not found: ${phase.script}`);
    }

    // Run phase script
    execSync(`npx tsx ${phase.script}`, {
      encoding: 'utf-8',
      stdio: 'inherit',
      timeout: 600000, // 10 minute timeout per phase
    });

    const duration = Date.now() - startTime;

    logger.info('');
    logger.info(`✅ Phase ${phase.number} completed in ${(duration / 1000).toFixed(2)}s`);
    logger.info('');

    return {
      phase: phase.number,
      name: phase.name,
      status: 'passed',
      duration,
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;

    logger.error('');
    logger.error(`❌ Phase ${phase.number} failed after ${(duration / 1000).toFixed(2)}s`);
    logger.error(`Error: ${error.message}`);
    logger.error('');

    // Attempt diagnosis and auto-fix for critical phases
    if (phase.critical) {
      logger.info('Attempting error diagnosis and auto-fix...');
      const diagnosis = errorResolver.diagnose(error);

      logger.info('');
      logger.info(errorResolver.formatErrorReport(error, diagnosis));

      if (diagnosis.autoFixable) {
        const fixed = await errorResolver.attemptAutoFix(diagnosis);

        if (fixed) {
          logger.info('✅ Auto-fix successful! Retrying phase...');

          // Retry the phase
          try {
            execSync(`npx tsx ${phase.script}`, {
              encoding: 'utf-8',
              stdio: 'inherit',
              timeout: 600000,
            });

            const retryDuration = Date.now() - startTime;

            logger.info('');
            logger.info(`✅ Phase ${phase.number} completed after auto-fix in ${(retryDuration / 1000).toFixed(2)}s`);
            logger.info('');

            return {
              phase: phase.number,
              name: phase.name,
              status: 'passed',
              duration: retryDuration,
              autoFixed: true,
            };
          } catch (retryError: any) {
            logger.error('❌ Phase still failed after auto-fix');
          }
        }
      }
    }

    return {
      phase: phase.number,
      name: phase.name,
      status: 'failed',
      duration,
      error: error.message,
    };
  }
}

/**
 * Print final summary
 */
function printSummary(): void {
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
  const passed = results.filter(r => r.status === 'passed').length;
  const failed = results.filter(r => r.status === 'failed').length;
  const skipped = results.filter(r => r.status === 'skipped').length;

  logger.info('');
  logger.info('');
  logger.info('═══════════════════════════════════════════════');
  logger.info('  AUTONOMOUS VERIFICATION SUMMARY');
  logger.info('═══════════════════════════════════════════════');
  logger.info('');

  for (const result of results) {
    const icon = result.status === 'passed' ? '✅' : result.status === 'failed' ? '❌' : '⏭️ ';
    const autoFixNote = result.autoFixed ? ' (auto-fixed)' : '';
    logger.info(`${icon} Phase ${result.phase}: ${result.name} - ${(result.duration / 1000).toFixed(2)}s${autoFixNote}`);
  }

  logger.info('');
  logger.info(`Total Phases: ${results.length}`);
  logger.info(`✅ Passed: ${passed}`);
  logger.info(`❌ Failed: ${failed}`);
  logger.info(`⏭️  Skipped: ${skipped}`);
  logger.info(`Total Duration: ${(totalDuration / 1000 / 60).toFixed(2)} minutes`);
  logger.info('');

  const allCriticalPassed = results
    .filter(r => {
      const phaseConfig = PHASES.find(p => p.number === r.phase);
      return phaseConfig?.critical;
    })
    .every(r => r.status === 'passed');

  if (allCriticalPassed && failed === 0) {
    logger.info('🎉 ALL VERIFICATION PHASES PASSED!');
    logger.info('');
    logger.info('System is ready for production deployment.');
  } else if (allCriticalPassed) {
    logger.info('⚠️  CRITICAL PHASES PASSED, but some optional phases failed');
    logger.info('');
    logger.info('Core system is operational. Review failed optional phases.');
  } else {
    logger.info('❌ CRITICAL PHASES FAILED');
    logger.info('');
    logger.info('System is not ready. Review errors above and resolve issues.');
  }

  logger.info('');
  logger.info('═══════════════════════════════════════════════');
  logger.info('');
}

/**
 * Main execution
 */
async function main() {
  const overallStartTime = Date.now();

  // Ensure logs directory exists
  if (!existsSync('logs')) {
    mkdirSync('logs', { recursive: true });
  }

  logger.info('');
  logger.info('╔═══════════════════════════════════════════════╗');
  logger.info('║                                               ║');
  logger.info('║   AUTONOMOUS VERIFICATION SYSTEM              ║');
  logger.info('║   Martha.dev v3.0                             ║');
  logger.info('║                                               ║');
  logger.info('╚═══════════════════════════════════════════════╝');
  logger.info('');

  // Parse command line arguments
  const { phasesToRun, skipCleanup } = parseArgs();

  logger.info(`Phases to run: ${phasesToRun.join(', ')}`);
  if (skipCleanup) {
    logger.info('Cleanup will be skipped');
  }
  logger.info('');

  // Run selected phases
  for (const phase of PHASES) {
    if (!phasesToRun.includes(phase.number)) {
      logger.info(`⏭️  Skipping Phase ${phase.number}: ${phase.name}`);
      results.push({
        phase: phase.number,
        name: phase.name,
        status: 'skipped',
        duration: 0,
      });
      continue;
    }

    const result = await runPhase(phase);
    results.push(result);

    // Stop if critical phase failed
    if (phase.critical && result.status === 'failed') {
      logger.error('');
      logger.error(`❌ Critical phase ${phase.number} failed. Stopping verification.`);
      logger.error('');
      break;
    }

    // Skip remaining phases if configured
    if (result.status === 'failed' && phase.skipOnFailure) {
      logger.warn('');
      logger.warn(`⚠️  Phase ${phase.number} failed but is not critical. Continuing...`);
      logger.warn('');
    }
  }

  // Print final summary
  printSummary();

  const overallDuration = Date.now() - overallStartTime;
  logger.info(`Overall execution time: ${(overallDuration / 1000 / 60).toFixed(2)} minutes`);
  logger.info('');

  // Exit with appropriate code
  const hasCriticalFailures = results.some(r => {
    const phaseConfig = PHASES.find(p => p.number === r.phase);
    return phaseConfig?.critical && r.status === 'failed';
  });

  process.exit(hasCriticalFailures ? 1 : 0);
}

// Run main orchestrator
main().catch(error => {
  logger.error('Autonomous verification failed with unhandled error:', error);
  process.exit(1);
});
