/**
 * Prometheus Metrics Export
 * TASK-7.4.3: Production observability with Prometheus
 */

import { Registry, Counter, Gauge, Histogram, collectDefaultMetrics } from 'prom-client';
import { createLogger } from '../utils/logger.js';

const logger = createLogger({ module: 'prometheus' });

// Create a Registry
export const register = new Registry();

// Add default metrics (CPU, memory, etc.)
collectDefaultMetrics({
  register,
  prefix: 'martha_',
  gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
});

// HTTP Metrics
export const httpRequestDuration = new Histogram({
  name: 'martha_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [register],
});

export const httpRequestTotal = new Counter({
  name: 'martha_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

export const httpRequestErrors = new Counter({
  name: 'martha_http_request_errors_total',
  help: 'Total number of HTTP request errors',
  labelNames: ['method', 'route', 'error_type'],
  registers: [register],
});

// Workflow Metrics
export const workflowsStarted = new Counter({
  name: 'martha_workflows_started_total',
  help: 'Total number of workflows started',
  labelNames: ['workflow_type'],
  registers: [register],
});

export const workflowsCompleted = new Counter({
  name: 'martha_workflows_completed_total',
  help: 'Total number of workflows completed',
  labelNames: ['workflow_type', 'status'],
  registers: [register],
});

export const workflowDuration = new Histogram({
  name: 'martha_workflow_duration_seconds',
  help: 'Duration of workflow execution in seconds',
  labelNames: ['workflow_type', 'status'],
  buckets: [1, 5, 10, 30, 60, 120, 300, 600, 1800, 3600],
  registers: [register],
});

export const workflowsActive = new Gauge({
  name: 'martha_workflows_active',
  help: 'Number of currently active workflows',
  labelNames: ['workflow_type'],
  registers: [register],
});

// Activity Metrics
export const activitiesStarted = new Counter({
  name: 'martha_activities_started_total',
  help: 'Total number of activities started',
  labelNames: ['activity_name'],
  registers: [register],
});

export const activitiesCompleted = new Counter({
  name: 'martha_activities_completed_total',
  help: 'Total number of activities completed',
  labelNames: ['activity_name', 'status'],
  registers: [register],
});

export const activityDuration = new Histogram({
  name: 'martha_activity_duration_seconds',
  help: 'Duration of activity execution in seconds',
  labelNames: ['activity_name', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10, 30],
  registers: [register],
});

export const activityRetries = new Counter({
  name: 'martha_activity_retries_total',
  help: 'Total number of activity retries',
  labelNames: ['activity_name', 'reason'],
  registers: [register],
});

// Database Metrics
export const databaseQueryDuration = new Histogram({
  name: 'martha_database_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['query_type'],
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1],
  registers: [register],
});

export const databaseConnections = new Gauge({
  name: 'martha_database_connections',
  help: 'Number of active database connections',
  labelNames: ['state'],
  registers: [register],
});

export const databaseErrors = new Counter({
  name: 'martha_database_errors_total',
  help: 'Total number of database errors',
  labelNames: ['error_type'],
  registers: [register],
});

// Error Metrics
export const exceptionsDetected = new Counter({
  name: 'martha_exceptions_detected_total',
  help: 'Total number of exceptions detected',
  labelNames: ['exception_type', 'severity'],
  registers: [register],
});

export const exceptionsResolved = new Counter({
  name: 'martha_exceptions_resolved_total',
  help: 'Total number of exceptions resolved',
  labelNames: ['exception_type'],
  registers: [register],
});

export const exceptionsOpen = new Gauge({
  name: 'martha_exceptions_open',
  help: 'Number of currently open exceptions',
  labelNames: ['severity'],
  registers: [register],
});

// Agent Metrics
export const agentsActive = new Gauge({
  name: 'martha_agents_active',
  help: 'Number of currently active agents',
  labelNames: ['agent_type'],
  registers: [register],
});

export const agentTasksCompleted = new Counter({
  name: 'martha_agent_tasks_completed_total',
  help: 'Total number of tasks completed by agents',
  labelNames: ['agent_type', 'status'],
  registers: [register],
});

export const agentCpuUsage = new Gauge({
  name: 'martha_agent_cpu_usage_percent',
  help: 'CPU usage of agents',
  labelNames: ['agent_id', 'agent_type'],
  registers: [register],
});

export const agentMemoryUsage = new Gauge({
  name: 'martha_agent_memory_usage_mb',
  help: 'Memory usage of agents in MB',
  labelNames: ['agent_id', 'agent_type'],
  registers: [register],
});

// Redis Metrics
export const redisOperations = new Counter({
  name: 'martha_redis_operations_total',
  help: 'Total number of Redis operations',
  labelNames: ['operation', 'status'],
  registers: [register],
});

export const redisConnectionPool = new Gauge({
  name: 'martha_redis_connection_pool_size',
  help: 'Size of Redis connection pool',
  registers: [register],
});

// System Metrics
export const systemUptime = new Gauge({
  name: 'martha_system_uptime_seconds',
  help: 'System uptime in seconds',
  registers: [register],
});

export const systemRestarts = new Counter({
  name: 'martha_system_restarts_total',
  help: 'Total number of system restarts',
  registers: [register],
});

// Business Metrics
export const issuesProcessed = new Counter({
  name: 'martha_issues_processed_total',
  help: 'Total number of issues processed',
  labelNames: ['status'],
  registers: [register],
});

export const testsExecuted = new Counter({
  name: 'martha_tests_executed_total',
  help: 'Total number of tests executed',
  labelNames: ['result'],
  registers: [register],
});

export const codeCommits = new Counter({
  name: 'martha_code_commits_total',
  help: 'Total number of code commits',
  labelNames: ['agent_type'],
  registers: [register],
});

/**
 * Update database connection metrics
 */
export async function updateDatabaseMetrics(
  pool: any
): Promise<void> {
  try {
    const totalConnections = pool.totalCount || 0;
    const idleConnections = pool.idleCount || 0;
    const activeConnections = totalConnections - idleConnections;

    databaseConnections.set({ state: 'total' }, totalConnections);
    databaseConnections.set({ state: 'active' }, activeConnections);
    databaseConnections.set({ state: 'idle' }, idleConnections);
  } catch (error) {
    logger.error('Failed to update database metrics', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Update system uptime metric
 */
export function updateSystemUptime(startTime: number): void {
  const uptimeSeconds = (Date.now() - startTime) / 1000;
  systemUptime.set(uptimeSeconds);
}

/**
 * Collect custom business metrics from database
 */
export async function collectBusinessMetrics(pool: any): Promise<void> {
  try {
    // Get open exceptions by severity
    const exceptionsResult = await pool.query(`
      SELECT severity, COUNT(*) as count
      FROM ts_martha.exceptions
      WHERE resolved = FALSE
      GROUP BY severity
    `);

    for (const row of exceptionsResult.rows) {
      exceptionsOpen.set({ severity: row.severity }, parseInt(row.count));
    }

    // Get active workflows by type
    const workflowsResult = await pool.query(`
      SELECT workflow_type, COUNT(*) as count
      FROM ts_martha.telemetry_metadata
      WHERE status = 'running'
      GROUP BY workflow_type
    `);

    for (const row of workflowsResult.rows) {
      workflowsActive.set({ workflow_type: row.workflow_type }, parseInt(row.count));
    }
  } catch (error) {
    logger.error('Failed to collect business metrics', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Start periodic metric collection
 */
export function startMetricCollection(
  pool: any,
  intervalMs: number = 30000
): NodeJS.Timeout {
  const startTime = Date.now();

  const interval = setInterval(async () => {
    updateSystemUptime(startTime);
    await updateDatabaseMetrics(pool);
    await collectBusinessMetrics(pool);
  }, intervalMs);

  // Initial collection
  updateSystemUptime(startTime);
  void updateDatabaseMetrics(pool);
  void collectBusinessMetrics(pool);

  logger.info('Metric collection started', { intervalMs });

  return interval;
}

/**
 * Get metrics in Prometheus format
 */
export async function getMetrics(): Promise<string> {
  return register.metrics();
}

/**
 * Get metrics as JSON
 */
export async function getMetricsJSON(): Promise<any> {
  const metrics = await register.getMetricsAsJSON();
  return metrics;
}
