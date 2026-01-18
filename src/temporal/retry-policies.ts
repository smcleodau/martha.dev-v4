/**
 * Temporal Retry Policies
 * TASK-7.4.1: Production-grade retry strategies with exponential backoff
 */

import { RetryPolicy } from '@temporalio/workflow';

/**
 * Default retry policy for most activities
 * - Initial interval: 1 second
 * - Backoff coefficient: 2 (exponential)
 * - Maximum attempts: 5
 * - Maximum interval: 60 seconds
 */
export const defaultRetryPolicy: RetryPolicy = {
  initialInterval: '1s',
  backoffCoefficient: 2,
  maximumAttempts: 5,
  maximumInterval: '60s',
  nonRetryableErrorTypes: [
    'ValidationError',
    'AuthenticationError',
    'AuthorizationError',
  ],
};

/**
 * Aggressive retry policy for critical operations
 * - More attempts with longer max interval
 */
export const aggressiveRetryPolicy: RetryPolicy = {
  initialInterval: '1s',
  backoffCoefficient: 2,
  maximumAttempts: 10,
  maximumInterval: '300s', // 5 minutes
  nonRetryableErrorTypes: [
    'ValidationError',
    'AuthenticationError',
    'AuthorizationError',
  ],
};

/**
 * Quick retry policy for fast-failing operations
 * - Fewer attempts with shorter intervals
 */
export const quickRetryPolicy: RetryPolicy = {
  initialInterval: '500ms',
  backoffCoefficient: 1.5,
  maximumAttempts: 3,
  maximumInterval: '10s',
  nonRetryableErrorTypes: [
    'ValidationError',
    'AuthenticationError',
    'AuthorizationError',
    'NotFoundError',
  ],
};

/**
 * Database operation retry policy
 * - Handles transient database errors
 * - Longer max interval for connection recovery
 */
export const databaseRetryPolicy: RetryPolicy = {
  initialInterval: '2s',
  backoffCoefficient: 2,
  maximumAttempts: 7,
  maximumInterval: '120s',
  nonRetryableErrorTypes: [
    'ValidationError',
    'UniqueConstraintViolation',
    'ForeignKeyViolation',
  ],
};

/**
 * External API retry policy
 * - Handles rate limits and network issues
 */
export const externalApiRetryPolicy: RetryPolicy = {
  initialInterval: '5s',
  backoffCoefficient: 2,
  maximumAttempts: 5,
  maximumInterval: '300s',
  nonRetryableErrorTypes: [
    'ValidationError',
    'AuthenticationError',
    'AuthorizationError',
    'NotFoundError',
    'BadRequestError',
  ],
};

/**
 * No retry policy
 * - For operations that should not be retried
 */
export const noRetryPolicy: RetryPolicy = {
  maximumAttempts: 1,
};

/**
 * Calculate exponential backoff delay
 */
export function calculateBackoff(
  attempt: number,
  initialDelayMs: number = 1000,
  backoffCoefficient: number = 2,
  maxDelayMs: number = 60000,
  jitter: boolean = true
): number {
  const delay = Math.min(
    initialDelayMs * Math.pow(backoffCoefficient, attempt - 1),
    maxDelayMs
  );

  // Add jitter to prevent thundering herd
  if (jitter) {
    return delay * (0.5 + Math.random() * 0.5);
  }

  return delay;
}

/**
 * Retry policy for specific activity types
 */
export const activityRetryPolicies = {
  // Git operations
  cloneRepository: aggressiveRetryPolicy,
  commitChanges: databaseRetryPolicy,
  pushChanges: externalApiRetryPolicy,

  // GitHub API operations
  createIssue: externalApiRetryPolicy,
  updateIssue: externalApiRetryPolicy,
  createComment: externalApiRetryPolicy,

  // Database operations
  insertTelemetry: databaseRetryPolicy,
  updateWorkflowStatus: databaseRetryPolicy,
  queryDatabase: databaseRetryPolicy,

  // Test execution
  runTests: aggressiveRetryPolicy,
  parseTestResults: quickRetryPolicy,

  // Agent operations
  spawnAgent: aggressiveRetryPolicy,
  monitorAgent: defaultRetryPolicy,
  killAgent: quickRetryPolicy,

  // Validation
  validateInput: noRetryPolicy,
  validateOutput: noRetryPolicy,
};

/**
 * Determine retry policy based on error type
 */
export function getRetryPolicyForError(error: Error): RetryPolicy {
  const errorName = error.constructor.name;
  const errorMessage = error.message.toLowerCase();

  // Network errors - aggressive retry
  if (
    errorMessage.includes('econnrefused') ||
    errorMessage.includes('etimedout') ||
    errorMessage.includes('enotfound') ||
    errorMessage.includes('network')
  ) {
    return aggressiveRetryPolicy;
  }

  // Rate limit errors - longer backoff
  if (
    errorMessage.includes('rate limit') ||
    errorMessage.includes('too many requests')
  ) {
    return externalApiRetryPolicy;
  }

  // Database errors
  if (
    errorMessage.includes('database') ||
    errorMessage.includes('postgres') ||
    errorMessage.includes('connection')
  ) {
    return databaseRetryPolicy;
  }

  // Validation errors - no retry
  if (
    errorName.includes('Validation') ||
    errorMessage.includes('invalid') ||
    errorMessage.includes('validation')
  ) {
    return noRetryPolicy;
  }

  // Default
  return defaultRetryPolicy;
}

/**
 * Create a custom retry policy
 */
export function createCustomRetryPolicy(options: {
  initialIntervalMs?: number;
  backoffCoefficient?: number;
  maximumAttempts?: number;
  maximumIntervalMs?: number;
  nonRetryableErrorTypes?: string[];
}): RetryPolicy {
  return {
    initialInterval: options.initialIntervalMs
      ? `${options.initialIntervalMs}ms`
      : '1s',
    backoffCoefficient: options.backoffCoefficient ?? 2,
    maximumAttempts: options.maximumAttempts ?? 5,
    maximumInterval: options.maximumIntervalMs
      ? `${options.maximumIntervalMs}ms`
      : '60s',
    nonRetryableErrorTypes: options.nonRetryableErrorTypes ?? [
      'ValidationError',
      'AuthenticationError',
    ],
  };
}
