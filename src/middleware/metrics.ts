/**
 * Prometheus Metrics Middleware
 *
 * Tracks HTTP requests, database queries, workflow executions, and custom metrics
 */

import { Request, Response, NextFunction } from 'express';
import promClient from 'prom-client';
import logger from '../utils/logger.js';

// Create registry
export const register = new promClient.Registry();

// Add default metrics (CPU, memory, etc.)
promClient.collectDefaultMetrics({ register });

// HTTP request metrics
export const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  registers: [register],
});

export const httpRequestTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status'],
  registers: [register],
});

export const httpRequestErrors = new promClient.Counter({
  name: 'http_request_errors_total',
  help: 'Total number of HTTP request errors',
  labelNames: ['method', 'route', 'status'],
  registers: [register],
});

// Database metrics
export const dbQueryDuration = new promClient.Histogram({
  name: 'db_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation', 'table'],
  buckets: [0.001, 0.01, 0.05, 0.1, 0.5, 1],
  registers: [register],
});

export const dbQueryTotal = new promClient.Counter({
  name: 'db_queries_total',
  help: 'Total number of database queries',
  labelNames: ['operation', 'table', 'status'],
  registers: [register],
});

export const dbConnectionPoolSize = new promClient.Gauge({
  name: 'db_connection_pool_size',
  help: 'Current size of database connection pool',
  labelNames: ['state'],
  registers: [register],
});

// Workflow metrics
export const workflowStartedTotal = new promClient.Counter({
  name: 'workflow_started_total',
  help: 'Total number of workflows started',
  labelNames: ['workflow_type'],
  registers: [register],
});

export const workflowCompletedTotal = new promClient.Counter({
  name: 'workflow_completed_total',
  help: 'Total number of workflows completed',
  labelNames: ['workflow_type', 'status'],
  registers: [register],
});

export const workflowDuration = new promClient.Histogram({
  name: 'workflow_duration_seconds',
  help: 'Duration of workflow execution in seconds',
  labelNames: ['workflow_type'],
  buckets: [1, 5, 10, 30, 60, 300, 600, 1800, 3600],
  registers: [register],
});

export const activeWorkflows = new promClient.Gauge({
  name: 'active_workflows',
  help: 'Number of currently active workflows',
  labelNames: ['workflow_type'],
  registers: [register],
});

// Agent metrics
export const agentSpawnedTotal = new promClient.Counter({
  name: 'agent_spawned_total',
  help: 'Total number of agents spawned',
  labelNames: ['agent_type'],
  registers: [register],
});

export const agentSuccessRate = new promClient.Gauge({
  name: 'agent_success_rate',
  help: 'Agent success rate by type',
  labelNames: ['agent_type'],
  registers: [register],
});

export const agentAvgDuration = new promClient.Gauge({
  name: 'agent_avg_duration_seconds',
  help: 'Average agent execution duration in seconds',
  labelNames: ['agent_type'],
  registers: [register],
});

// Exception metrics
export const exceptionsDetectedTotal = new promClient.Counter({
  name: 'exceptions_detected_total',
  help: 'Total number of exceptions detected',
  labelNames: ['exception_type', 'severity'],
  registers: [register],
});

export const openExceptionsGauge = new promClient.Gauge({
  name: 'open_exceptions',
  help: 'Number of currently open exceptions',
  labelNames: ['exception_type', 'severity'],
  registers: [register],
});

// Documentation metrics
export const documentationSearches = new promClient.Counter({
  name: 'documentation_searches_total',
  help: 'Total number of documentation searches',
  labelNames: ['query_type'],
  registers: [register],
});

export const documentationPageViews = new promClient.Counter({
  name: 'documentation_page_views_total',
  help: 'Total number of documentation page views',
  labelNames: ['page_type', 'category'],
  registers: [register],
});

/**
 * HTTP metrics middleware
 */
export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  // Normalize route for metrics (replace IDs with placeholders)
  const route = normalizeRoute(req.path);

  // Track response
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const status = res.statusCode.toString();

    httpRequestDuration.labels(req.method, route, status).observe(duration);
    httpRequestTotal.labels(req.method, route, status).inc();

    if (res.statusCode >= 400) {
      httpRequestErrors.labels(req.method, route, status).inc();
    }
  });

  next();
}

/**
 * Normalize route for metrics (replace dynamic segments)
 */
function normalizeRoute(path: string): string {
  return path
    .replace(/\/\d+/g, '/:id') // Replace numeric IDs
    .replace(/\/[a-f0-9-]{36}/g, '/:uuid') // Replace UUIDs
    .replace(/\/[A-Z]+-\d+(\.\d+)?/g, '/:issueId') // Replace issue IDs (EPIC-1.1, TASK-1.1.1)
    .replace(/\/schema:[a-z_]+/g, '/schema::table') // Replace schema references
    .replace(/\/api:[A-Za-z]+/g, '/api::name'); // Replace API references
}

/**
 * Database query wrapper with metrics
 */
export function instrumentQuery<T>(
  operation: string,
  table: string,
  queryFn: () => Promise<T>
): Promise<T> {
  const start = Date.now();

  return queryFn()
    .then(result => {
      const duration = (Date.now() - start) / 1000;
      dbQueryDuration.labels(operation, table).observe(duration);
      dbQueryTotal.labels(operation, table, 'success').inc();
      return result;
    })
    .catch(error => {
      const duration = (Date.now() - start) / 1000;
      dbQueryDuration.labels(operation, table).observe(duration);
      dbQueryTotal.labels(operation, table, 'error').inc();
      throw error;
    });
}

/**
 * Workflow execution wrapper with metrics
 */
export async function instrumentWorkflow<T>(
  workflowType: string,
  executionFn: () => Promise<T>
): Promise<T> {
  workflowStartedTotal.labels(workflowType).inc();
  activeWorkflows.labels(workflowType).inc();

  const start = Date.now();

  try {
    const result = await executionFn();
    const duration = (Date.now() - start) / 1000;

    workflowDuration.labels(workflowType).observe(duration);
    workflowCompletedTotal.labels(workflowType, 'success').inc();

    return result;
  } catch (error) {
    const duration = (Date.now() - start) / 1000;

    workflowDuration.labels(workflowType).observe(duration);
    workflowCompletedTotal.labels(workflowType, 'error').inc();

    throw error;
  } finally {
    activeWorkflows.labels(workflowType).dec();
  }
}

/**
 * Metrics endpoint handler
 */
export async function metricsHandler(req: Request, res: Response): Promise<void> {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (error) {
    logger.error('Failed to generate metrics', { error });
    res.status(500).end();
  }
}

/**
 * Update database connection pool metrics
 */
export function updateConnectionPoolMetrics(idle: number, total: number, waiting: number): void {
  dbConnectionPoolSize.labels('idle').set(idle);
  dbConnectionPoolSize.labels('total').set(total);
  dbConnectionPoolSize.labels('waiting').set(waiting);
}

/**
 * Update agent metrics from database
 */
export async function updateAgentMetrics(db: any): Promise<void> {
  try {
    const result = await db.query(`
      SELECT
        agent_type,
        AVG(CASE WHEN success THEN 1.0 ELSE 0.0 END) AS success_rate,
        AVG(duration_ms) / 1000.0 AS avg_duration
      FROM ts_martha.agent_performance
      WHERE completed_at > NOW() - INTERVAL '1 hour'
      GROUP BY agent_type
    `);

    for (const row of result.rows) {
      agentSuccessRate.labels(row.agent_type).set(parseFloat(row.success_rate));
      agentAvgDuration.labels(row.agent_type).set(parseFloat(row.avg_duration));
    }
  } catch (error) {
    logger.error('Failed to update agent metrics', { error });
  }
}

/**
 * Update exception metrics from database
 */
export async function updateExceptionMetrics(db: any): Promise<void> {
  try {
    const result = await db.query(`
      SELECT
        exception_type,
        severity,
        COUNT(*) AS count
      FROM ts_martha.exceptions
      WHERE resolved_at IS NULL
      GROUP BY exception_type, severity
    `);

    // Reset gauges
    openExceptionsGauge.reset();

    for (const row of result.rows) {
      openExceptionsGauge
        .labels(row.exception_type, row.severity)
        .set(parseInt(row.count));
    }
  } catch (error) {
    logger.error('Failed to update exception metrics', { error });
  }
}

/**
 * Start periodic metrics updates
 */
export function startMetricsUpdates(db: any, intervalMs: number = 30000): NodeJS.Timeout {
  const updateMetrics = async () => {
    await Promise.all([updateAgentMetrics(db), updateExceptionMetrics(db)]);
  };

  // Initial update
  updateMetrics().catch(error =>
    logger.error('Initial metrics update failed', { error })
  );

  // Periodic updates
  return setInterval(updateMetrics, intervalMs);
}
