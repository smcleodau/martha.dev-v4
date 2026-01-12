import { spawn } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import { createLogger } from '../utils/logger.js';
import { getTestRepository } from '../database/repositories/test-repository.js';
import type { TestConfig, TestResults } from '../database/models/test-execution.js';
import {
  parseJestOutput,
  parseJestCoverage,
  parsePlaywrightOutput,
  parsePytestOutput,
  parseGenericOutput,
} from './test-parsers.js';

const logger = createLogger({ module: 'test-runner' });

/**
 * Test Runner
 *
 * Executes tests in Docker containers and tracks results
 */
export class TestRunner {
  private testRepository = getTestRepository();

  /**
   * Run tests for a worktree
   */
  async runTests(options: {
    worktreeId: number;
    worktreeName: string;
    worktreePath: string;
    suites: string[]; // ['jest', 'playwright', 'pytest']
    issueNumber?: number;
  }): Promise<string> {
    const { worktreeId, worktreeName, worktreePath, suites, issueNumber } = options;

    logger.info('Starting test execution', {
      worktree_id: worktreeId,
      worktree_name: worktreeName,
      suites,
    });

    // Create test execution record
    const testExecution = await this.testRepository.create({
      worktreeId,
      worktreeName,
      suites,
      issueNumber,
    });

    // Run tests asynchronously
    this.executeTests(testExecution.id, worktreePath, suites).catch((error) => {
      logger.error('Test execution failed', {
        test_execution_id: testExecution.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    });

    return testExecution.id;
  }

  /**
   * Execute tests and update database
   */
  private async executeTests(
    testExecutionId: string,
    worktreePath: string,
    suites: string[]
  ): Promise<void> {
    try {
      const results: TestResults[] = [];

      for (const suite of suites) {
        logger.info('Running test suite', { suite, test_execution_id: testExecutionId });

        const config = this.getTestConfig(suite, worktreePath);
        const result = await this.runTestSuite(config);
        results.push(result);
      }

      // Aggregate results
      const aggregatedResult = this.aggregateResults(results);

      // Calculate overall coverage
      const coveragePercent = aggregatedResult.coverage
        ? aggregatedResult.coverage.lines.pct
        : undefined;

      // Determine overall status
      const status = aggregatedResult.failed > 0 ? 'failed' : 'passed';

      // Update database
      await this.testRepository.update(testExecutionId, {
        status,
        results: aggregatedResult,
        coveragePercent,
        completedAt: new Date(),
      });

      logger.info('Test execution completed', {
        test_execution_id: testExecutionId,
        status,
        total: aggregatedResult.total,
        passed: aggregatedResult.passed,
        failed: aggregatedResult.failed,
        coverage: coveragePercent,
      });
    } catch (error) {
      logger.error('Test execution error', {
        test_execution_id: testExecutionId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      await this.testRepository.update(testExecutionId, {
        status: 'failed',
        results: {
          framework: 'error',
          total: 0,
          passed: 0,
          failed: 0,
          skipped: 0,
          duration_ms: 0,
          tests: [],
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        completedAt: new Date(),
      });
    }
  }

  /**
   * Run a single test suite
   */
  private async runTestSuite(config: TestConfig): Promise<TestResults> {
    return new Promise((resolve) => {
      const startTime = Date.now();
      let stdout = '';
      let stderr = '';

      logger.debug('Executing test command', {
        framework: config.framework,
        command: config.command,
        args: config.args,
        workingDir: config.workingDir,
      });

      const child = spawn(config.command, config.args, {
        cwd: config.workingDir,
        env: { ...process.env, ...config.env },
        timeout: config.timeout,
      });

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', async (code) => {
        const duration = Date.now() - startTime;

        logger.debug('Test command completed', {
          framework: config.framework,
          exitCode: code,
          duration_ms: duration,
        });

        // Parse results based on framework
        let results: TestResults;

        try {
          switch (config.framework) {
            case 'jest':
              results = parseJestOutput(stdout, stderr);
              // Try to read coverage
              const coveragePath = path.join(config.workingDir, 'coverage/coverage-summary.json');
              try {
                const coverageData = await fs.readFile(coveragePath, 'utf-8');
                results.coverage = parseJestCoverage(coveragePath, coverageData);
              } catch {
                // Coverage not available
              }
              break;

            case 'playwright':
              results = parsePlaywrightOutput(stdout, stderr);
              break;

            case 'pytest':
              results = parsePytestOutput(stdout, stderr);
              break;

            default:
              results = parseGenericOutput(config.framework, stdout, stderr);
          }

          // Override duration with actual execution time
          results.duration_ms = duration;

          resolve(results);
        } catch (error) {
          logger.error('Failed to parse test results', {
            framework: config.framework,
            error: error instanceof Error ? error.message : 'Unknown error',
          });

          resolve({
            framework: config.framework,
            total: 0,
            passed: 0,
            failed: 1,
            skipped: 0,
            duration_ms: duration,
            tests: [],
            error: 'Failed to parse test results',
            logs: stdout + '\n' + stderr,
          });
        }
      });

      child.on('error', (error) => {
        logger.error('Test command error', {
          framework: config.framework,
          error: error.message,
        });

        resolve({
          framework: config.framework,
          total: 0,
          passed: 0,
          failed: 1,
          skipped: 0,
          duration_ms: Date.now() - startTime,
          tests: [],
          error: error.message,
          logs: stdout + '\n' + stderr,
        });
      });
    });
  }

  /**
   * Get test configuration for a framework
   */
  private getTestConfig(framework: string, worktreePath: string): TestConfig {
    const configs: Record<string, TestConfig> = {
      jest: {
        framework: 'jest',
        command: 'npm',
        args: ['run', 'test', '--', '--json', '--coverage'],
        workingDir: worktreePath,
        timeout: 300000, // 5 minutes
        env: {
          CI: 'true',
          NODE_ENV: 'test',
        },
      },
      playwright: {
        framework: 'playwright',
        command: 'npx',
        args: ['playwright', 'test', '--reporter=json'],
        workingDir: worktreePath,
        timeout: 600000, // 10 minutes
        env: {
          CI: 'true',
        },
      },
      pytest: {
        framework: 'pytest',
        command: 'pytest',
        args: ['-v', '--tb=short'],
        workingDir: worktreePath,
        timeout: 300000, // 5 minutes
        env: {
          PYTHONUNBUFFERED: '1',
        },
      },
      'npm test': {
        framework: 'npm test',
        command: 'npm',
        args: ['test'],
        workingDir: worktreePath,
        timeout: 300000, // 5 minutes
        env: {
          CI: 'true',
          NODE_ENV: 'test',
        },
      },
      'yarn test': {
        framework: 'yarn test',
        command: 'yarn',
        args: ['test'],
        workingDir: worktreePath,
        timeout: 300000, // 5 minutes
        env: {
          CI: 'true',
          NODE_ENV: 'test',
        },
      },
    };

    return (
      configs[framework] || {
        framework,
        command: framework,
        args: [],
        workingDir: worktreePath,
        timeout: 300000,
      }
    );
  }

  /**
   * Aggregate results from multiple test suites
   */
  private aggregateResults(results: TestResults[]): TestResults {
    if (results.length === 0) {
      return {
        framework: 'none',
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        duration_ms: 0,
        tests: [],
      };
    }

    if (results.length === 1) {
      return results[0];
    }

    // Aggregate multiple results
    const aggregated: TestResults = {
      framework: results.map((r) => r.framework).join(', '),
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      duration_ms: 0,
      tests: [],
    };

    for (const result of results) {
      aggregated.total += result.total;
      aggregated.passed += result.passed;
      aggregated.failed += result.failed;
      aggregated.skipped += result.skipped;
      aggregated.duration_ms += result.duration_ms;
      aggregated.tests.push(...result.tests);
    }

    // Use coverage from first result that has it
    aggregated.coverage = results.find((r) => r.coverage)?.coverage;

    return aggregated;
  }

  /**
   * Get test execution status
   */
  async getStatus(testExecutionId: string) {
    return await this.testRepository.findById(testExecutionId);
  }

  /**
   * Get test history for a worktree
   */
  async getHistory(worktreeId: number, limit: number = 50) {
    return await this.testRepository.findByWorktreeId(worktreeId, limit);
  }

  /**
   * Get test history for an issue
   */
  async getHistoryByIssue(issueNumber: number, limit: number = 50) {
    return await this.testRepository.findByIssueNumber(issueNumber, limit);
  }
}

// Singleton instance
let testRunner: TestRunner | null = null;

export function getTestRunner(): TestRunner {
  if (!testRunner) {
    testRunner = new TestRunner();
  }
  return testRunner;
}
