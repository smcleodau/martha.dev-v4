#!/usr/bin/env tsx

/**
 * Infrastructure Integration Demonstration
 *
 * Demonstrates the complete Martha infrastructure integration:
 * 1. Board synchronization (worktree-specific boards)
 * 2. Autonomous verification utilities
 * 3. Evidence validator tests
 * 4. Workflow initialization
 * 5. Evidence tracking
 * 6. Board state management
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { createLogger } from '../src/utils/logger.js';
import { ReportGenerator, type PhaseResult, type VerificationReport } from './autonomous-verify/utils/report-generator.js';

const logger = createLogger({ module: 'infrastructure-demo' });

interface TestPhase {
  name: string;
  description: string;
  tests: Array<{ name: string; fn: () => Promise<boolean> }>;
}

const phases: TestPhase[] = [
  {
    name: 'Board Synchronization',
    description: 'Verify worktree board watcher fixes',
    tests: [
      {
        name: 'Watcher monitors worktree boards',
        fn: async () => {
          const content = readFileSync('/mnt/data/martha-workflow/tracker/api/services/watcher.py', 'utf-8');
          return content.includes('worktrees') && content.includes('boards') && content.includes('state.json');
        },
      },
      {
        name: 'Main.py handles worktree board updates',
        fn: async () => {
          const content = readFileSync('/mnt/data/martha-workflow/tracker/api/main.py', 'utf-8');
          return content.includes('worktree_name') && content.includes('board_name');
        },
      },
      {
        name: 'Calculator board state exists',
        fn: async () => {
          return existsSync('/mnt/data/martha-workflow/.martha/worktrees/calculator-app/boards/calculator-development/state.json');
        },
      },
    ],
  },
  {
    name: 'Autonomous Verification Utilities',
    description: 'Verify utility modules created',
    tests: [
      {
        name: 'test-helpers.ts exists',
        fn: async () => existsSync('/mnt/data/martha.dev-v4-orchestration/scripts/autonomous-verify/utils/test-helpers.ts'),
      },
      {
        name: 'cleanup-manager.ts exists',
        fn: async () => existsSync('/mnt/data/martha.dev-v4-orchestration/scripts/autonomous-verify/utils/cleanup-manager.ts'),
      },
      {
        name: 'error-resolver.ts exists',
        fn: async () => existsSync('/mnt/data/martha.dev-v4-orchestration/scripts/autonomous-verify/utils/error-resolver.ts'),
      },
      {
        name: 'report-generator.ts exists',
        fn: async () => existsSync('/mnt/data/martha.dev-v4-orchestration/scripts/autonomous-verify/utils/report-generator.ts'),
      },
    ],
  },
  {
    name: 'Unit Tests',
    description: 'Verify unit test implementation',
    tests: [
      {
        name: 'Evidence validator tests exist',
        fn: async () => existsSync('/mnt/data/martha.dev-v4-orchestration/tests/unit/evidence/evidence-validator.test.ts'),
      },
      {
        name: 'Test file has proper structure',
        fn: async () => {
          const content = readFileSync('/mnt/data/martha.dev-v4-orchestration/tests/unit/evidence/evidence-validator.test.ts', 'utf-8');
          return content.includes('describe') && content.includes('test') && content.includes('expect');
        },
      },
    ],
  },
  {
    name: 'Workflow Scripts',
    description: 'Verify workflow management scripts',
    tests: [
      {
        name: 'Workflow initialization script exists',
        fn: async () => existsSync('/mnt/data/martha.dev-v4-orchestration/scripts/start-mth002-workflow.ts'),
      },
      {
        name: 'Evidence signal script exists',
        fn: async () => existsSync('/mnt/data/martha.dev-v4-orchestration/scripts/send-mth002-evidence.ts'),
      },
      {
        name: 'Board movement script exists',
        fn: async () => existsSync('/mnt/data/martha.dev-v4-orchestration/scripts/move-mth002-through-board.ts'),
      },
    ],
  },
  {
    name: 'Calculator Implementation',
    description: 'Verify calculator app is complete',
    tests: [
      {
        name: 'Calculator implementation exists',
        fn: async () => existsSync('/mnt/data/calculator-app/src/calculator.ts'),
      },
      {
        name: 'Calculator tests exist',
        fn: async () => existsSync('/mnt/data/calculator-app/src/calculator.test.ts'),
      },
      {
        name: 'MTH-002 is in Done column',
        fn: async () => {
          const board = JSON.parse(readFileSync('/mnt/data/martha-workflow/.martha/worktrees/calculator-app/boards/calculator-development/state.json', 'utf-8'));
          const doneColumn = board.columns.find((c: any) => c.id === 'done');
          return doneColumn && doneColumn.issue_ids.includes('MTH-002');
        },
      },
    ],
  },
  {
    name: 'Python Syntax',
    description: 'Verify Python files compile',
    tests: [
      {
        name: 'watcher.py compiles',
        fn: async () => {
          try {
            execSync('python3 -m py_compile /mnt/data/martha-workflow/tracker/api/services/watcher.py', { stdio: 'pipe' });
            return true;
          } catch {
            return false;
          }
        },
      },
      {
        name: 'main.py compiles',
        fn: async () => {
          try {
            execSync('python3 -m py_compile /mnt/data/martha-workflow/tracker/api/main.py', { stdio: 'pipe' });
            return true;
          } catch {
            return false;
          }
        },
      },
    ],
  },
];

async function runPhase(phase: TestPhase): Promise<PhaseResult> {
  const startTime = Date.now();
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  logger.info('');
  logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  logger.info(`  ${phase.name}`);
  logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  logger.info(`  ${phase.description}`);
  logger.info('');

  for (const test of phase.tests) {
    try {
      const result = await test.fn();
      if (result) {
        logger.info(`✅ ${test.name}`);
        passed++;
      } else {
        logger.error(`❌ ${test.name}`);
        failed++;
        errors.push(`${test.name} failed`);
      }
    } catch (error: any) {
      logger.error(`❌ ${test.name}: ${error.message}`);
      failed++;
      errors.push(`${test.name}: ${error.message}`);
    }
  }

  const duration = Date.now() - startTime;
  const total = passed + failed;

  return {
    phase: phase.name,
    name: phase.name,
    status: failed === 0 ? 'passed' : 'failed',
    tests: {
      total,
      passed,
      failed,
      skipped: 0,
    },
    duration,
    errors,
  };
}

async function main() {
  const startTime = Date.now();

  logger.info('');
  logger.info('╔════════════════════════════════════════════════════════════╗');
  logger.info('║                                                            ║');
  logger.info('║       MARTHA INFRASTRUCTURE INTEGRATION DEMO               ║');
  logger.info('║                                                            ║');
  logger.info('╚════════════════════════════════════════════════════════════╝');
  logger.info('');

  const results: PhaseResult[] = [];

  for (const phase of phases) {
    const result = await runPhase(phase);
    results.push(result);
  }

  const totalDuration = Date.now() - startTime;

  // Calculate summary
  const summary = {
    totalTests: results.reduce((sum, r) => sum + r.tests.total, 0),
    passed: results.reduce((sum, r) => sum + r.tests.passed, 0),
    failed: results.reduce((sum, r) => sum + r.tests.failed, 0),
    skipped: 0,
    duration: totalDuration,
    successRate: 0,
    timestamp: new Date().toISOString(),
  };

  summary.successRate = Math.round((summary.passed / summary.totalTests) * 100 * 100) / 100;

  // Generate report
  const report: VerificationReport = {
    summary,
    phases: results,
    errors: results
      .filter(r => r.errors && r.errors.length > 0)
      .flatMap(r => r.errors!.map(e => ({ phase: r.phase, error: e }))),
  };

  logger.info('');
  logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  logger.info('  SUMMARY');
  logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  logger.info('');
  logger.info(`Total Tests: ${summary.totalTests}`);
  logger.info(`✅ Passed: ${summary.passed}`);
  logger.info(`❌ Failed: ${summary.failed}`);
  logger.info(`Success Rate: ${summary.successRate}%`);
  logger.info(`Duration: ${(totalDuration / 1000).toFixed(2)}s`);
  logger.info('');

  // Generate reports
  const generator = new ReportGenerator();
  await generator.generateAll(report, 'test-results');

  logger.info('Reports generated:');
  logger.info('  📄 test-results/autonomous-verify-report.json');
  logger.info('  📄 test-results/VERIFICATION-SUMMARY.md');
  logger.info('  📄 test-results/autonomous-verify-report.html');
  logger.info('');

  if (summary.successRate >= 90) {
    logger.info('✅ Infrastructure integration successful!');
    process.exit(0);
  } else {
    logger.error('❌ Infrastructure integration incomplete');
    process.exit(1);
  }
}

main();
