/**
 * Temporal Configuration
 *
 * Centralized configuration for Temporal client, worker, and workflows.
 * Uses environment variables with sensible defaults.
 */

export interface TemporalConfig {
  /** Temporal server address (default: localhost:7233) */
  address: string;

  /** Temporal namespace (default: default) */
  namespace: string;

  /** Task queue name for Martha workflows (default: martha-tasks) */
  taskQueue: string;

  /** Maximum concurrent workflow executions per worker (default: 100) */
  maxConcurrentWorkflowExecutions: number;

  /** Maximum concurrent activity executions per worker (default: 100) */
  maxConcurrentActivityExecutions: number;

  /** Workflow execution timeout in milliseconds (default: 24 hours) */
  workflowExecutionTimeout: number;

  /** Activity start-to-close timeout in milliseconds (default: 30 minutes) */
  activityStartToCloseTimeout: number;

  /** Maximum retry attempts for activities (default: 5) */
  maxRetryAttempts: number;

  /** Initial retry interval in milliseconds (default: 5 seconds) */
  initialRetryInterval: number;

  /** Backoff coefficient for exponential retry (default: 2.0) */
  backoffCoefficient: number;

  /** Maximum retry interval in milliseconds (default: 5 minutes) */
  maxRetryInterval: number;
}

/**
 * Load Temporal configuration from environment variables
 */
export function loadTemporalConfig(): TemporalConfig {
  return {
    address: process.env.TEMPORAL_ADDRESS || 'localhost:7233',
    namespace: process.env.TEMPORAL_NAMESPACE || 'default',
    taskQueue: process.env.TEMPORAL_TASK_QUEUE || 'martha-tasks',
    maxConcurrentWorkflowExecutions: parseInt(
      process.env.TEMPORAL_MAX_CONCURRENT_WORKFLOWS || '100',
      10
    ),
    maxConcurrentActivityExecutions: parseInt(
      process.env.TEMPORAL_MAX_CONCURRENT_ACTIVITIES || '100',
      10
    ),
    workflowExecutionTimeout: parseInt(
      process.env.TEMPORAL_WORKFLOW_TIMEOUT || String(24 * 60 * 60 * 1000), // 24 hours
      10
    ),
    activityStartToCloseTimeout: parseInt(
      process.env.TEMPORAL_ACTIVITY_TIMEOUT || String(30 * 60 * 1000), // 30 minutes
      10
    ),
    maxRetryAttempts: parseInt(
      process.env.TEMPORAL_MAX_RETRY_ATTEMPTS || '5',
      10
    ),
    initialRetryInterval: parseInt(
      process.env.TEMPORAL_INITIAL_RETRY_INTERVAL || '5000', // 5 seconds
      10
    ),
    backoffCoefficient: parseFloat(
      process.env.TEMPORAL_BACKOFF_COEFFICIENT || '2.0'
    ),
    maxRetryInterval: parseInt(
      process.env.TEMPORAL_MAX_RETRY_INTERVAL || String(5 * 60 * 1000), // 5 minutes
      10
    ),
  };
}

/**
 * Default Temporal configuration
 */
export const temporalConfig = loadTemporalConfig();
