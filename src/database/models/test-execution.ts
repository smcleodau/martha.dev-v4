/**
 * Test Execution Models
 *
 * Types for tracking test executions and results
 */

export interface TestExecution {
  id: string; // UUID
  worktree_id: number;
  worktree_name?: string;
  issue_number?: number;
  suites: string[]; // Test suites to run (e.g., ['jest', 'playwright'])
  status: TestExecutionStatus;
  results?: TestResults;
  coverage_percent?: number;
  started_at: Date;
  completed_at?: Date;
}

export type TestExecutionStatus = 'running' | 'passed' | 'failed' | 'cancelled';

export interface TestResults {
  framework: string; // jest, playwright, pytest, etc.
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  duration_ms: number;
  tests: TestCase[];
  coverage?: CoverageData;
  logs?: string;
  error?: string;
}

export interface TestCase {
  name: string;
  file: string;
  status: 'passed' | 'failed' | 'skipped';
  duration_ms: number;
  error?: string;
  stack?: string;
}

export interface CoverageData {
  lines: CoverageMetric;
  statements: CoverageMetric;
  functions: CoverageMetric;
  branches: CoverageMetric;
}

export interface CoverageMetric {
  total: number;
  covered: number;
  pct: number;
}

/**
 * DTO for creating test execution
 */
export interface CreateTestExecutionDTO {
  worktreeId: number;
  worktreeName?: string;
  issueNumber?: number;
  suites: string[];
}

/**
 * DTO for updating test execution
 */
export interface UpdateTestExecutionDTO {
  status?: TestExecutionStatus;
  results?: TestResults;
  coveragePercent?: number;
  completedAt?: Date;
}

/**
 * Test configuration for different frameworks
 */
export interface TestConfig {
  framework: string;
  command: string;
  args: string[];
  workingDir: string;
  timeout: number; // milliseconds
  env?: Record<string, string>;
}
