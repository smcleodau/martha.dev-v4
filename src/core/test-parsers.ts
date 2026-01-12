import { createLogger } from '../utils/logger.js';
import type { TestResults, TestCase, CoverageData } from '../database/models/test-execution.js';

const logger = createLogger({ module: 'test-parsers' });

/**
 * Parse Jest test output and coverage
 */
export function parseJestOutput(stdout: string, stderr: string): TestResults {
  try {
    // Try to parse JSON output first (if --json flag was used)
    const jsonMatch = stdout.match(/\{[\s\S]*"testResults"[\s\S]*\}/);
    if (jsonMatch) {
      const jestJson = JSON.parse(jsonMatch[0]);
      return parseJestJson(jestJson);
    }

    // Fallback to text parsing
    return parseJestText(stdout, stderr);
  } catch (error) {
    logger.error('Failed to parse Jest output', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return {
      framework: 'jest',
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      duration_ms: 0,
      tests: [],
      error: 'Failed to parse test output',
      logs: stdout + '\n' + stderr,
    };
  }
}

function parseJestJson(jestJson: any): TestResults {
  const tests: TestCase[] = [];
  let totalDuration = 0;

  for (const testResult of jestJson.testResults || []) {
    for (const assertionResult of testResult.assertionResults || []) {
      tests.push({
        name: assertionResult.fullName || assertionResult.title,
        file: testResult.name,
        status: assertionResult.status === 'passed' ? 'passed' : assertionResult.status === 'pending' ? 'skipped' : 'failed',
        duration_ms: assertionResult.duration || 0,
        error: assertionResult.failureMessages?.join('\n'),
      });
      totalDuration += assertionResult.duration || 0;
    }
  }

  const passed = tests.filter((t) => t.status === 'passed').length;
  const failed = tests.filter((t) => t.status === 'failed').length;
  const skipped = tests.filter((t) => t.status === 'skipped').length;

  return {
    framework: 'jest',
    total: tests.length,
    passed,
    failed,
    skipped,
    duration_ms: totalDuration,
    tests,
  };
}

function parseJestText(stdout: string, stderr: string): TestResults {
  const tests: TestCase[] = [];

  // Parse test summary line: "Tests: X passed, Y failed, Z total"
  const summaryMatch = stdout.match(/Tests:\s+(?:(\d+)\s+passed)?.*?(?:(\d+)\s+failed)?.*?(\d+)\s+total/);
  const passed = summaryMatch?.[1] ? parseInt(summaryMatch[1], 10) : 0;
  const failed = summaryMatch?.[2] ? parseInt(summaryMatch[2], 10) : 0;
  const total = summaryMatch?.[3] ? parseInt(summaryMatch[3], 10) : 0;

  // Parse duration: "Time: 1.234s"
  const timeMatch = stdout.match(/Time:\s+([\d.]+)\s*s/);
  const duration_ms = timeMatch ? parseFloat(timeMatch[1]) * 1000 : 0;

  return {
    framework: 'jest',
    total,
    passed,
    failed,
    skipped: total - passed - failed,
    duration_ms,
    tests,
    logs: stdout,
  };
}

/**
 * Parse Jest coverage output
 */
export function parseJestCoverage(coveragePath: string, coverageData: string): CoverageData | undefined {
  try {
    const coverage = JSON.parse(coverageData);
    const total = coverage.total;

    if (!total) {
      return undefined;
    }

    return {
      lines: {
        total: total.lines?.total || 0,
        covered: total.lines?.covered || 0,
        pct: total.lines?.pct || 0,
      },
      statements: {
        total: total.statements?.total || 0,
        covered: total.statements?.covered || 0,
        pct: total.statements?.pct || 0,
      },
      functions: {
        total: total.functions?.total || 0,
        covered: total.functions?.covered || 0,
        pct: total.functions?.pct || 0,
      },
      branches: {
        total: total.branches?.total || 0,
        covered: total.branches?.covered || 0,
        pct: total.branches?.pct || 0,
      },
    };
  } catch (error) {
    logger.error('Failed to parse Jest coverage', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return undefined;
  }
}

/**
 * Parse Playwright test output
 */
export function parsePlaywrightOutput(stdout: string, stderr: string): TestResults {
  try {
    // Try to parse JSON report if available
    const jsonMatch = stdout.match(/\{[\s\S]*"suites"[\s\S]*\}/);
    if (jsonMatch) {
      const playwrightJson = JSON.parse(jsonMatch[0]);
      return parsePlaywrightJson(playwrightJson);
    }

    // Fallback to text parsing
    return parsePlaywrightText(stdout, stderr);
  } catch (error) {
    logger.error('Failed to parse Playwright output', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return {
      framework: 'playwright',
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      duration_ms: 0,
      tests: [],
      error: 'Failed to parse test output',
      logs: stdout + '\n' + stderr,
    };
  }
}

function parsePlaywrightJson(playwrightJson: any): TestResults {
  const tests: TestCase[] = [];
  let totalDuration = 0;

  function extractTests(suites: any[]) {
    for (const suite of suites || []) {
      for (const spec of suite.specs || []) {
        const testCase: TestCase = {
          name: spec.title,
          file: spec.file,
          status: 'passed',
          duration_ms: 0,
        };

        for (const test of spec.tests || []) {
          const result = test.results?.[0];
          if (result) {
            testCase.duration_ms += result.duration || 0;
            totalDuration += result.duration || 0;

            if (result.status === 'failed') {
              testCase.status = 'failed';
              testCase.error = result.error?.message;
              testCase.stack = result.error?.stack;
            } else if (result.status === 'skipped') {
              testCase.status = 'skipped';
            }
          }
        }

        tests.push(testCase);
      }

      if (suite.suites) {
        extractTests(suite.suites);
      }
    }
  }

  extractTests(playwrightJson.suites || []);

  const passed = tests.filter((t) => t.status === 'passed').length;
  const failed = tests.filter((t) => t.status === 'failed').length;
  const skipped = tests.filter((t) => t.status === 'skipped').length;

  return {
    framework: 'playwright',
    total: tests.length,
    passed,
    failed,
    skipped,
    duration_ms: totalDuration,
    tests,
  };
}

function parsePlaywrightText(stdout: string, stderr: string): TestResults {
  // Parse summary line: "X passed (Ys)"
  const passedMatch = stdout.match(/(\d+)\s+passed/);
  const failedMatch = stdout.match(/(\d+)\s+failed/);
  const skippedMatch = stdout.match(/(\d+)\s+skipped/);

  const passed = passedMatch ? parseInt(passedMatch[1], 10) : 0;
  const failed = failedMatch ? parseInt(failedMatch[1], 10) : 0;
  const skipped = skippedMatch ? parseInt(skippedMatch[1], 10) : 0;
  const total = passed + failed + skipped;

  // Parse duration from summary
  const timeMatch = stdout.match(/\((\d+)ms\)/);
  const duration_ms = timeMatch ? parseInt(timeMatch[1], 10) : 0;

  return {
    framework: 'playwright',
    total,
    passed,
    failed,
    skipped,
    duration_ms,
    tests: [],
    logs: stdout,
  };
}

/**
 * Parse pytest output
 */
export function parsePytestOutput(stdout: string, stderr: string): TestResults {
  try {
    // Parse pytest summary line: "= X passed, Y failed in Z.ZZs ="
    const summaryMatch = stdout.match(/=+\s*(?:(\d+)\s+passed)?.*?(?:(\d+)\s+failed)?.*?(?:in\s+([\d.]+)s)?/);

    const passed = summaryMatch?.[1] ? parseInt(summaryMatch[1], 10) : 0;
    const failed = summaryMatch?.[2] ? parseInt(summaryMatch[2], 10) : 0;
    const duration_s = summaryMatch?.[3] ? parseFloat(summaryMatch[3]) : 0;
    const total = passed + failed;

    return {
      framework: 'pytest',
      total,
      passed,
      failed,
      skipped: 0,
      duration_ms: duration_s * 1000,
      tests: [],
      logs: stdout,
    };
  } catch (error) {
    logger.error('Failed to parse pytest output', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return {
      framework: 'pytest',
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      duration_ms: 0,
      tests: [],
      error: 'Failed to parse test output',
      logs: stdout + '\n' + stderr,
    };
  }
}

/**
 * Parse generic test output when framework is unknown
 */
export function parseGenericOutput(framework: string, stdout: string, stderr: string): TestResults {
  return {
    framework,
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    duration_ms: 0,
    tests: [],
    logs: stdout + '\n' + stderr,
  };
}
