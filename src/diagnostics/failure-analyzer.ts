/**
 * Failure Analyzer
 *
 * Analyzes test failures and provides diagnostic insights.
 * Categorizes failures and suggests remediation steps.
 *
 * Failure Categories:
 * - api_unavailable: Service not running or unreachable
 * - api_endpoint_missing: Endpoint not implemented
 * - braintrust_config_error: Braintrust API key or config issue
 * - assertion_mismatch: Test assertion failed (expected vs actual)
 * - test_logic_error: Test code has bugs
 * - timeout: Test exceeded time limit
 * - environment_error: Environment setup issue
 */

import { createLogger } from '../utils/logger.js';
import type { FailedTest, TestResults } from '../../tracker/types/evidence.js';

const logger = createLogger({ module: 'failure-analyzer' });

/**
 * Failure category
 */
export type FailureCategory =
  | 'api_unavailable'
  | 'api_endpoint_missing'
  | 'braintrust_config_error'
  | 'assertion_mismatch'
  | 'test_logic_error'
  | 'timeout'
  | 'environment_error'
  | 'unknown';

/**
 * Remediation step
 */
export interface RemediationStep {
  step: number;
  action: string;
  description: string;
  automated: boolean;
}

/**
 * Failure diagnostic
 */
export interface FailureDiagnostic {
  testName: string;
  category: FailureCategory;
  rootCause: string;
  confidence: number; // 0-100
  remediation: RemediationStep[];
  retryRecommended: boolean;
  blocksProgress: boolean;
}

/**
 * Failure Analyzer Service
 */
export class FailureAnalyzer {
  /**
   * Analyze a failed test
   */
  analyzeTestFailure(failedTest: FailedTest): FailureDiagnostic {
    logger.info('Analyzing test failure', {
      testName: failedTest.name,
      suite: failedTest.suite,
    });

    const category = this.categorizeFailure(failedTest);
    const rootCause = this.inferRootCause(failedTest, category);
    const remediation = this.suggestRemediation(failedTest, category);
    const retryRecommended = this.shouldRetry(category);
    const blocksProgress = this.isBlocking(category);
    const confidence = this.calculateConfidence(failedTest, category);

    const diagnostic: FailureDiagnostic = {
      testName: failedTest.name,
      category,
      rootCause,
      confidence,
      remediation,
      retryRecommended,
      blocksProgress,
    };

    logger.info('Failure analysis complete', {
      testName: failedTest.name,
      category,
      confidence,
      retryRecommended,
    });

    return diagnostic;
  }

  /**
   * Analyze all test failures
   */
  analyzeAllFailures(testResults: TestResults): FailureDiagnostic[] {
    if (!testResults.failedTests || testResults.failedTests.length === 0) {
      return [];
    }

    return testResults.failedTests.map((failedTest) =>
      this.analyzeTestFailure(failedTest)
    );
  }

  /**
   * Categorize failure based on error message
   */
  private categorizeFailure(failedTest: FailedTest): FailureCategory {
    const error = failedTest.error.toLowerCase();
    const stack = failedTest.stack?.toLowerCase() || '';

    // Check for API unavailability
    if (
      error.includes('econnrefused') ||
      error.includes('connection refused') ||
      error.includes('network error') ||
      error.includes('fetch failed')
    ) {
      return 'api_unavailable';
    }

    // Check for missing endpoints (404, route not found)
    if (
      error.includes('404') ||
      error.includes('not found') ||
      error.includes('cannot get') ||
      error.includes('cannot post')
    ) {
      return 'api_endpoint_missing';
    }

    // Check for Braintrust errors
    if (
      error.includes('braintrust') ||
      error.includes('api key') ||
      error.includes('unauthorized') && error.includes('braintrust')
    ) {
      return 'braintrust_config_error';
    }

    // Check for timeout
    if (
      error.includes('timeout') ||
      error.includes('exceeded') ||
      error.includes('timed out')
    ) {
      return 'timeout';
    }

    // Check for assertion failures
    if (
      error.includes('expected') ||
      error.includes('assertion') ||
      error.includes('toBe') ||
      error.includes('toEqual') ||
      error.includes('received')
    ) {
      return 'assertion_mismatch';
    }

    // Check for environment errors
    if (
      error.includes('env') ||
      error.includes('environment') ||
      error.includes('module not found') ||
      error.includes('cannot find module')
    ) {
      return 'environment_error';
    }

    // Check for test logic errors
    if (
      error.includes('typeerror') ||
      error.includes('referenceerror') ||
      error.includes('undefined is not')
    ) {
      return 'test_logic_error';
    }

    return 'unknown';
  }

  /**
   * Infer root cause from failure
   */
  private inferRootCause(failedTest: FailedTest, category: FailureCategory): string {
    switch (category) {
      case 'api_unavailable':
        return 'API server is not running or is unreachable. Check if the service is started and listening on the correct port.';

      case 'api_endpoint_missing':
        return 'API endpoint has not been implemented yet. The route may need to be added to the server.';

      case 'braintrust_config_error':
        return 'Braintrust configuration is missing or invalid. Check BRAINTRUST_API_KEY in .env file.';

      case 'assertion_mismatch':
        return 'Test assertion failed - actual value does not match expected. This could indicate a bug in the implementation or the test needs updating.';

      case 'test_logic_error':
        return 'Test code has a bug (TypeError, ReferenceError, etc). The test itself needs to be fixed.';

      case 'timeout':
        return 'Test exceeded time limit. Operation may be too slow, or there could be an infinite loop or deadlock.';

      case 'environment_error':
        return 'Environment setup issue. Missing dependencies, environment variables, or configuration.';

      case 'unknown':
      default:
        return `Unknown failure: ${failedTest.error}`;
    }
  }

  /**
   * Suggest remediation steps
   */
  private suggestRemediation(
    failedTest: FailedTest,
    category: FailureCategory
  ): RemediationStep[] {
    switch (category) {
      case 'api_unavailable':
        return [
          {
            step: 1,
            action: 'Check if API server is running',
            description: 'Run `npm run dev` or `npm start` to start the API server',
            automated: false,
          },
          {
            step: 2,
            action: 'Verify port configuration',
            description: 'Check that the server is listening on the expected port',
            automated: false,
          },
          {
            step: 3,
            action: 'Check firewall and network',
            description: 'Ensure no firewall is blocking the connection',
            automated: false,
          },
        ];

      case 'api_endpoint_missing':
        return [
          {
            step: 1,
            action: 'Implement missing API endpoint',
            description: 'Add the route handler in the appropriate router file',
            automated: false,
          },
          {
            step: 2,
            action: 'Register route in server',
            description: 'Ensure the route is registered in the Fastify/Express app',
            automated: false,
          },
          {
            step: 3,
            action: 'Restart server and retry test',
            description: 'Restart the API server after adding the endpoint',
            automated: false,
          },
        ];

      case 'braintrust_config_error':
        return [
          {
            step: 1,
            action: 'Add BRAINTRUST_API_KEY to .env',
            description: 'Create or update .env file with your Braintrust API key',
            automated: false,
          },
          {
            step: 2,
            action: 'Verify Braintrust project configuration',
            description: 'Check braintrust.config.ts for correct project name',
            automated: false,
          },
          {
            step: 3,
            action: 'Retry test',
            description: 'Run the test again after configuration is fixed',
            automated: true,
          },
        ];

      case 'assertion_mismatch':
        return [
          {
            step: 1,
            action: 'Review expected vs actual values',
            description: 'Compare the expected and received values in the error message',
            automated: false,
          },
          {
            step: 2,
            action: 'Debug the implementation',
            description: 'Add logging or use debugger to trace the issue',
            automated: false,
          },
          {
            step: 3,
            action: 'Fix implementation or update test',
            description: 'Either fix the bug in the code or update the test expectation',
            automated: false,
          },
        ];

      case 'test_logic_error':
        return [
          {
            step: 1,
            action: 'Fix test code bug',
            description: 'Review test code for TypeErrors, ReferenceErrors, etc',
            automated: false,
          },
          {
            step: 2,
            action: 'Add missing imports or variables',
            description: 'Ensure all required modules and variables are imported',
            automated: false,
          },
          {
            step: 3,
            action: 'Retry test',
            description: 'Run test again after fixing test code',
            automated: true,
          },
        ];

      case 'timeout':
        return [
          {
            step: 1,
            action: 'Increase timeout limit',
            description: 'Add jest.setTimeout(30000) or increase test timeout',
            automated: false,
          },
          {
            step: 2,
            action: 'Optimize slow operations',
            description: 'Check for unnecessary waits, slow database queries, etc',
            automated: false,
          },
          {
            step: 3,
            action: 'Check for infinite loops or deadlocks',
            description: 'Review code for blocking operations',
            automated: false,
          },
        ];

      case 'environment_error':
        return [
          {
            step: 1,
            action: 'Install missing dependencies',
            description: 'Run `npm install` to ensure all packages are installed',
            automated: true,
          },
          {
            step: 2,
            action: 'Check environment variables',
            description: 'Verify all required env vars are set in .env file',
            automated: false,
          },
          {
            step: 3,
            action: 'Rebuild project',
            description: 'Run `npm run build` to ensure TypeScript is compiled',
            automated: true,
          },
        ];

      case 'unknown':
      default:
        return [
          {
            step: 1,
            action: 'Review error message and stack trace',
            description: 'Analyze the error details for clues',
            automated: false,
          },
          {
            step: 2,
            action: 'Search for similar issues',
            description: 'Check GitHub issues, Stack Overflow, etc',
            automated: false,
          },
          {
            step: 3,
            action: 'Add debugging and retry',
            description: 'Add console.log or use debugger to investigate',
            automated: false,
          },
        ];
    }
  }

  /**
   * Determine if failure should trigger retry
   */
  private shouldRetry(category: FailureCategory): boolean {
    // Retryable failures (transient issues)
    const retryableCategories: FailureCategory[] = [
      'api_unavailable',
      'timeout',
      'environment_error',
    ];

    return retryableCategories.includes(category);
  }

  /**
   * Determine if failure blocks workflow progress
   */
  private isBlocking(category: FailureCategory): boolean {
    // Non-blocking failures (can proceed with warnings)
    const nonBlockingCategories: FailureCategory[] = [];

    return !nonBlockingCategories.includes(category);
  }

  /**
   * Calculate confidence in categorization (0-100)
   */
  private calculateConfidence(failedTest: FailedTest, category: FailureCategory): number {
    const error = failedTest.error.toLowerCase();

    // High confidence patterns
    const highConfidencePatterns: { [key in FailureCategory]?: string[] } = {
      api_unavailable: ['econnrefused', 'connection refused'],
      api_endpoint_missing: ['404', 'cannot get', 'cannot post'],
      braintrust_config_error: ['braintrust', 'api key'],
      timeout: ['timeout', 'timed out'],
    };

    // Check if error matches high confidence pattern
    const patterns = highConfidencePatterns[category] || [];
    for (const pattern of patterns) {
      if (error.includes(pattern)) {
        return 95;
      }
    }

    // Medium confidence if category is not unknown
    if (category !== 'unknown') {
      return 70;
    }

    // Low confidence for unknown
    return 30;
  }
}

/**
 * Singleton instance
 */
export const failureAnalyzer = new FailureAnalyzer();
