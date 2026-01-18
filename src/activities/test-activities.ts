/**
 * Test Activities
 *
 * Temporal activities for test execution and evidence collection.
 * Integrates with test-parser.sh and test-executor.sh from martha-workflow.
 *
 * Features:
 * - Parse test plan from issue description
 * - Execute test scenarios with detailed result capture
 * - Validate Braintrust configuration for LLM tests
 * - Generate code quality reports
 * - Build comprehensive TestingEvidence
 * - Store evidence with validation
 */

import { v4 as uuidv4 } from 'uuid';
import { Context } from '@temporalio/activity';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import { createLogger } from '../utils/logger.js';
import { telemetryWriter } from '../services/TelemetryWriter.js';
import { evidenceStore } from '../evidence/evidence-store.js';
import { evidenceValidator } from '../validation/evidence-validator.js';
import type {
  TestingEvidence,
  TestResults,
  TestSuite,
  FailedTest,
  CoverageReport,
  QualityChecks,
  BraintrustTrace,
} from '../../tracker/types/evidence.js';

const execAsync = promisify(exec);
const logger = createLogger({ module: 'test-activities' });

// Constants
const MARTHA_WORKFLOW_ROOT = '/mnt/data/martha-workflow';
const TEST_PARSER_SCRIPT = path.join(
  MARTHA_WORKFLOW_ROOT,
  '.claude/commands/martha/lib/test-parser.sh'
);
const TEST_EXECUTOR_SCRIPT = path.join(
  MARTHA_WORKFLOW_ROOT,
  '.claude/commands/martha/lib/test-executor.sh'
);

/**
 * Run tests input
 */
export interface RunTestsInput {
  issueId: string;
  issueBody: string;
  worktreePath: string;
  branch: string;
  epicId?: string;
}

/**
 * Run tests result
 */
export interface RunTestsResult {
  success: boolean;
  testsPassed: number;
  testsFailed: number;
  testsSkipped: number;
  coverage?: number;
  qualityScore: number;
  evidenceStored: boolean;
  validationStatus: string;
}

/**
 * Run Tests Activity
 * Executes all tests and collects evidence
 */
export async function runTests(input: RunTestsInput): Promise<RunTestsResult> {
  const activityId = uuidv4();
  const startTime = Date.now();
  const info = Context.current().info;
  const workflowId = info.workflowExecution.workflowId;

  logger.info('Running tests', {
    activityId,
    issueId: input.issueId,
    worktreePath: input.worktreePath,
  });

  // Telemetry: Activity started
  await telemetryWriter.writeEvent({
    workflowId,
    workflowType: 'IssueLifecycleWorkflow',
    eventType: 'activity_started',
    eventCategory: 'activity',
    severity: 'info',
    activityName: 'runTests',
    activityId,
    issueId: input.issueId,
    epicId: input.epicId,
    source: 'temporal',
    retryAttempt: info.attempt,
  });

  try {
    // 1. Parse test plan from issue body
    logger.info('Parsing test plan', { issueId: input.issueId });
    const testPlan = await parseTestPlan(input.issueBody);

    logger.info('Test plan parsed', {
      issueId: input.issueId,
      scenarioCount: testPlan.scenarios?.length || 0,
    });

    // 2. Validate Braintrust config if LLM tests
    const hasLLMTests = testPlan.requiresBraintrust || false;
    if (hasLLMTests) {
      logger.info('Validating Braintrust configuration');
      await validateBraintrustConfig(input.worktreePath);
    }

    // 3. Execute test scenarios
    logger.info('Executing tests', { worktreePath: input.worktreePath });
    const testResults = await executeTests(input.worktreePath, input.branch);

    // 4. Run code quality checks
    logger.info('Running quality checks');
    const qualityChecks = await runQualityChecks(input.worktreePath);

    // 5. Generate coverage report (if available)
    const coverage = await generateCoverageReport(input.worktreePath);

    // 6. Collect Braintrust traces (if LLM tests)
    let braintrustTraces: BraintrustTrace[] = [];
    if (hasLLMTests) {
      braintrustTraces = await collectBraintrustTraces(input.issueId);
    }

    // 7. Build TestingEvidence
    const evidenceData: TestingEvidence = {
      eventId: uuidv4(),
      issueId: input.issueId,
      stage: 'TESTING',
      evidenceType: 'test_results',
      timestamp: new Date().toISOString(),
      workflowId,
      evidenceData: {
        testResults,
        coverage,
        qualityChecks,
        braintrustTraces: braintrustTraces.length > 0 ? braintrustTraces : undefined,
      },
    };

    // 8. Validate and calculate quality score
    const validation = await evidenceValidator.validateEvidence([evidenceData]);
    evidenceData.qualityScore = validation.qualityScore;
    evidenceData.validationStatus = validation.isValid ? 'valid' : 'invalid';
    evidenceData.validationErrors = validation.errors;

    // 9. Store evidence
    await evidenceStore.storeEvidence(evidenceData);

    const durationMs = Date.now() - startTime;

    const result: RunTestsResult = {
      success: testResults.failed === 0,
      testsPassed: testResults.passed,
      testsFailed: testResults.failed,
      testsSkipped: testResults.skipped,
      coverage: coverage?.lines.percentage,
      qualityScore: validation.qualityScore,
      evidenceStored: true,
      validationStatus: evidenceData.validationStatus || 'pending',
    };

    logger.info('Tests completed', {
      activityId,
      issueId: input.issueId,
      ...result,
    });

    // Telemetry: Activity completed
    await telemetryWriter.writeEvent({
      workflowId,
      workflowType: 'IssueLifecycleWorkflow',
      eventType: 'activity_completed',
      eventCategory: 'activity',
      severity: 'info',
      activityName: 'runTests',
      activityId,
      issueId: input.issueId,
      epicId: input.epicId,
      payload: result,
      durationMs,
      source: 'temporal',
    });

    return result;
  } catch (error: any) {
    const durationMs = Date.now() - startTime;

    logger.error('Test execution failed', {
      activityId,
      issueId: input.issueId,
      error: error.message,
    });

    // Telemetry: Activity failed
    await telemetryWriter.writeEvent({
      workflowId,
      workflowType: 'IssueLifecycleWorkflow',
      eventType: 'activity_failed',
      eventCategory: 'activity',
      severity: 'error',
      activityName: 'runTests',
      activityId,
      issueId: input.issueId,
      epicId: input.epicId,
      durationMs,
      errorMessage: error.message,
      errorStack: error.stack,
      source: 'temporal',
    });

    throw error;
  }
}

/**
 * Parse test plan from issue body
 */
async function parseTestPlan(
  issueBody: string
): Promise<{ scenarios?: string[]; requiresBraintrust?: boolean }> {
  try {
    // Write issue body to temp file
    const tempFile = `/tmp/issue-body-${uuidv4()}.txt`;
    await fs.writeFile(tempFile, issueBody);

    // Run test-parser.sh
    const { stdout } = await execAsync(`bash "${TEST_PARSER_SCRIPT}" "${tempFile}"`);

    // Parse output (assumes JSON format)
    const testPlan = JSON.parse(stdout);

    // Cleanup
    await fs.unlink(tempFile);

    return testPlan;
  } catch (error: any) {
    logger.warn('Test plan parsing failed, using defaults', {
      error: error.message,
    });

    // Return default plan
    return {
      scenarios: ['Run all tests'],
      requiresBraintrust: false,
    };
  }
}

/**
 * Validate Braintrust configuration
 */
async function validateBraintrustConfig(worktreePath: string): Promise<void> {
  // Check for .env file with BRAINTRUST_API_KEY
  const envPath = path.join(worktreePath, '.env');

  try {
    const envContent = await fs.readFile(envPath, 'utf-8');
    if (!envContent.includes('BRAINTRUST_API_KEY')) {
      throw new Error('BRAINTRUST_API_KEY not found in .env file');
    }

    logger.info('Braintrust configuration valid');
  } catch (error: any) {
    logger.warn('Braintrust configuration validation failed', {
      error: error.message,
    });
  }
}

/**
 * Execute tests
 */
async function executeTests(worktreePath: string, branch: string): Promise<TestResults> {
  try {
    // Run test command (adjust based on project type)
    const { stdout, stderr } = await execAsync('npm test -- --json --coverage', {
      cwd: worktreePath,
      env: { ...process.env, NODE_ENV: 'test' },
      timeout: 300000, // 5 minutes
    });

    // Parse Jest JSON output
    const testOutput = JSON.parse(stdout);

    const results: TestResults = {
      totalTests: testOutput.numTotalTests || 0,
      passed: testOutput.numPassedTests || 0,
      failed: testOutput.numFailedTests || 0,
      skipped: testOutput.numPendingTests || 0,
      duration: testOutput.testResults?.reduce(
        (sum: number, r: any) => sum + (r.perfStats?.end || 0),
        0
      ) || 0,
      timestamp: new Date().toISOString(),
      suites: parseTestSuites(testOutput.testResults || []),
      failedTests: parseFailedTests(testOutput.testResults || []),
    };

    return results;
  } catch (error: any) {
    logger.error('Test execution failed', { error: error.message });

    // Return failed result
    return {
      totalTests: 0,
      passed: 0,
      failed: 1,
      skipped: 0,
      duration: 0,
      timestamp: new Date().toISOString(),
      suites: [],
      failedTests: [
        {
          name: 'Test execution',
          suite: 'unknown',
          error: error.message,
          duration: 0,
        },
      ],
    };
  }
}

/**
 * Parse test suites from Jest output
 */
function parseTestSuites(testResults: any[]): TestSuite[] {
  return testResults.map((result) => ({
    name: result.name || 'unknown',
    tests: result.numPassingTests + result.numFailingTests + result.numPendingTests,
    passed: result.numPassingTests || 0,
    failed: result.numFailingTests || 0,
    skipped: result.numPendingTests || 0,
    duration: result.perfStats?.end || 0,
  }));
}

/**
 * Parse failed tests from Jest output
 */
function parseFailedTests(testResults: any[]): FailedTest[] {
  const failedTests: FailedTest[] = [];

  for (const result of testResults) {
    if (result.testResults) {
      for (const test of result.testResults) {
        if (test.status === 'failed') {
          failedTests.push({
            name: test.title || 'unknown',
            suite: result.name || 'unknown',
            error: test.failureMessages?.join('\n') || 'Unknown error',
            stack: test.failureMessages?.[0],
            duration: test.duration || 0,
          });
        }
      }
    }
  }

  return failedTests;
}

/**
 * Run code quality checks
 */
async function runQualityChecks(worktreePath: string): Promise<QualityChecks> {
  const checks: QualityChecks = {};

  // Run ESLint
  try {
    const { stdout } = await execAsync('npm run lint -- --format json', {
      cwd: worktreePath,
    });

    const lintResults = JSON.parse(stdout);
    checks.linting = {
      passed: lintResults.every((r: any) => r.errorCount === 0),
      errors: lintResults.reduce((sum: number, r: any) => sum + r.errorCount, 0),
      warnings: lintResults.reduce((sum: number, r: any) => sum + r.warningCount, 0),
    };
  } catch {
    // Linting failed or not configured
  }

  // Run TypeScript type checking
  try {
    await execAsync('npm run type-check', { cwd: worktreePath });
    checks.typeChecking = {
      passed: true,
      errors: 0,
    };
  } catch (error: any) {
    checks.typeChecking = {
      passed: false,
      errors: 1,
      details: [error.message],
    };
  }

  return checks;
}

/**
 * Generate coverage report
 */
async function generateCoverageReport(worktreePath: string): Promise<CoverageReport | undefined> {
  try {
    // Read coverage summary (generated by Jest)
    const coveragePath = path.join(worktreePath, 'coverage/coverage-summary.json');
    const coverageContent = await fs.readFile(coveragePath, 'utf-8');
    const coverage = JSON.parse(coverageContent);

    const total = coverage.total;

    return {
      lines: {
        total: total.lines.total,
        covered: total.lines.covered,
        skipped: total.lines.skipped || 0,
        percentage: total.lines.pct,
      },
      statements: {
        total: total.statements.total,
        covered: total.statements.covered,
        skipped: total.statements.skipped || 0,
        percentage: total.statements.pct,
      },
      functions: {
        total: total.functions.total,
        covered: total.functions.covered,
        skipped: total.functions.skipped || 0,
        percentage: total.functions.pct,
      },
      branches: {
        total: total.branches.total,
        covered: total.branches.covered,
        skipped: total.branches.skipped || 0,
        percentage: total.branches.pct,
      },
      files: [],
    };
  } catch (error) {
    logger.warn('Coverage report not available');
    return undefined;
  }
}

/**
 * Collect Braintrust traces
 */
async function collectBraintrustTraces(issueId: string): Promise<BraintrustTrace[]> {
  // This would integrate with Braintrust API to fetch traces
  // For now, return empty array
  logger.info('Collecting Braintrust traces', { issueId });
  return [];
}
