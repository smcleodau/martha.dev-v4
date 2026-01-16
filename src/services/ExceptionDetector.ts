/**
 * ExceptionDetector Service
 * Phase 4: Exception Detection (13 SP)
 *
 * Detects workflow exceptions and anomalies:
 * - Stage timeouts
 * - High retry counts
 * - Degraded performance
 * - Agent staleness
 * - Test failures
 */

import { query } from '../database/client.js';
import { createLogger } from '../utils/logger.js';
import { alertService } from './AlertService.js';

const logger = createLogger({ module: 'exception-detector' });

export interface DetectedException {
  exceptionType: 'stage_timeout' | 'high_retry' | 'degraded_performance' | 'agent_stale' | 'test_failures';
  severity: 'low' | 'medium' | 'high' | 'critical';
  workflowId: string;
  workflowType: string;
  issueId?: string;
  epicId?: string;
  agentId?: string;
  title: string;
  description: string;
  detectedValue?: number;
  thresholdValue?: number;
  context?: Record<string, unknown>;
}

/**
 * ExceptionDetector service
 * Runs periodically (via Temporal workflow) to detect exceptions
 */
export class ExceptionDetector {
  /**
   * Detect all exceptions
   * Called by ExceptionDetectionWorkflow every minute
   */
  async detectAll(): Promise<DetectedException[]> {
    const exceptions: DetectedException[] = [];

    try {
      // Run all detectors in parallel
      const [timeouts, retries, degraded, stale, failures] = await Promise.all([
        this.detectStageTimeouts(),
        this.detectHighRetryCount(),
        this.detectDegradedPerformance(),
        this.detectAgentStale(),
        this.detectTestFailures(),
      ]);

      exceptions.push(...timeouts, ...retries, ...degraded, ...stale, ...failures);

      logger.info('Exception detection completed', {
        totalExceptions: exceptions.length,
        byType: this.groupByType(exceptions),
      });

      // Record all exceptions
      for (const exception of exceptions) {
        await this.recordException(exception);
      }

      return exceptions;
    } catch (error) {
      logger.error('Exception detection failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Detector 1: Stage timeouts
   * Detect workflows stuck in a stage for too long
   */
  async detectStageTimeouts(): Promise<DetectedException[]> {
    const STAGE_TIMEOUT_MS = 2 * 60 * 60 * 1000; // 2 hours

    const result = await query<{
      workflow_id: string;
      workflow_type: string;
      issue_id: string;
      agent_id: string;
      event_type: string;
      duration_ms: number;
    }>(
      `
      SELECT DISTINCT ON (workflow_id)
        workflow_id,
        workflow_type,
        issue_id,
        agent_id,
        event_type,
        EXTRACT(EPOCH FROM (NOW() - MAX(timestamp))) * 1000 AS duration_ms
      FROM telemetry_events
      WHERE event_category = 'workflow'
        AND event_type LIKE '%_started'
        AND timestamp > NOW() - INTERVAL '6 hours'
      GROUP BY workflow_id, workflow_type, issue_id, agent_id, event_type
      HAVING EXTRACT(EPOCH FROM (NOW() - MAX(timestamp))) * 1000 > $1
      `,
      [STAGE_TIMEOUT_MS]
    );

    return result.rows.map((row) => ({
      exceptionType: 'stage_timeout',
      severity: row.duration_ms > 4 * 60 * 60 * 1000 ? 'critical' : 'high',
      workflowId: row.workflow_id,
      workflowType: row.workflow_type,
      issueId: row.issue_id,
      agentId: row.agent_id,
      title: `Workflow stuck in ${row.event_type.replace('_started', '')} stage`,
      description: `Workflow has been in ${row.event_type.replace('_started', '')} stage for ${Math.round(row.duration_ms / 1000 / 60)} minutes, exceeding the ${STAGE_TIMEOUT_MS / 1000 / 60} minute threshold.`,
      detectedValue: row.duration_ms,
      thresholdValue: STAGE_TIMEOUT_MS,
    }));
  }

  /**
   * Detector 2: High retry count
   * Detect activities with excessive retries
   */
  async detectHighRetryCount(): Promise<DetectedException[]> {
    const MAX_RETRIES = 3;

    const result = await query<{
      workflow_id: string;
      workflow_type: string;
      issue_id: string;
      activity_name: string;
      max_retry_attempt: number;
    }>(
      `
      SELECT
        workflow_id,
        workflow_type,
        issue_id,
        activity_name,
        MAX(retry_attempt) AS max_retry_attempt
      FROM telemetry_events
      WHERE event_category = 'activity'
        AND timestamp > NOW() - INTERVAL '1 hour'
      GROUP BY workflow_id, workflow_type, issue_id, activity_name
      HAVING MAX(retry_attempt) >= $1
      `,
      [MAX_RETRIES]
    );

    return result.rows.map((row) => ({
      exceptionType: 'high_retry',
      severity: row.max_retry_attempt >= 5 ? 'critical' : 'high',
      workflowId: row.workflow_id,
      workflowType: row.workflow_type,
      issueId: row.issue_id,
      title: `High retry count for ${row.activity_name}`,
      description: `Activity ${row.activity_name} has failed ${row.max_retry_attempt} times, indicating a persistent issue.`,
      detectedValue: row.max_retry_attempt,
      thresholdValue: MAX_RETRIES,
    }));
  }

  /**
   * Detector 3: Degraded performance
   * Detect agents performing significantly slower than average
   */
  async detectDegradedPerformance(): Promise<DetectedException[]> {
    const DEGRADATION_FACTOR = 2.0; // 2x slower than average

    const result = await query<{
      workflow_id: string;
      issue_id: string;
      agent_id: string;
      current_duration_ms: number;
      avg_duration_ms: number;
    }>(
      `
      WITH agent_avg AS (
        SELECT
          agent_id,
          AVG(duration_ms) AS avg_duration
        FROM agent_performance
        WHERE completed_at > NOW() - INTERVAL '7 days'
          AND success = TRUE
        GROUP BY agent_id
      ),
      current_workflows AS (
        SELECT
          workflow_id,
          issue_id,
          agent_id,
          EXTRACT(EPOCH FROM (NOW() - MIN(timestamp))) * 1000 AS current_duration_ms
        FROM telemetry_events
        WHERE event_category = 'workflow'
          AND event_type = 'workflow_started'
          AND timestamp > NOW() - INTERVAL '6 hours'
        GROUP BY workflow_id, issue_id, agent_id
      )
      SELECT
        cw.workflow_id,
        cw.issue_id,
        cw.agent_id,
        cw.current_duration_ms,
        aa.avg_duration AS avg_duration_ms
      FROM current_workflows cw
      JOIN agent_avg aa ON cw.agent_id = aa.agent_id
      WHERE cw.current_duration_ms > aa.avg_duration * $1
      `,
      [DEGRADATION_FACTOR]
    );

    return result.rows.map((row) => ({
      exceptionType: 'degraded_performance',
      severity: row.current_duration_ms > row.avg_duration_ms * 3 ? 'high' : 'medium',
      workflowId: row.workflow_id,
      workflowType: 'IssueLifecycleWorkflow',
      issueId: row.issue_id,
      agentId: row.agent_id,
      title: `Agent ${row.agent_id} performing slower than average`,
      description: `Current duration (${Math.round(row.current_duration_ms / 1000 / 60)} min) is ${DEGRADATION_FACTOR}x slower than average (${Math.round(row.avg_duration_ms / 1000 / 60)} min).`,
      detectedValue: row.current_duration_ms,
      thresholdValue: row.avg_duration_ms * DEGRADATION_FACTOR,
    }));
  }

  /**
   * Detector 4: Agent stale
   * Detect agents that haven't sent heartbeat recently
   */
  async detectAgentStale(): Promise<DetectedException[]> {
    const STALE_THRESHOLD_MS = 15 * 60 * 1000; // 15 minutes

    const result = await query<{
      workflow_id: string;
      issue_id: string;
      agent_id: string;
      last_heartbeat_ms: number;
    }>(
      `
      WITH agent_heartbeats AS (
        SELECT
          workflow_id,
          issue_id,
          agent_id,
          MAX(timestamp) AS last_heartbeat
        FROM telemetry_events
        WHERE agent_id IS NOT NULL
          AND timestamp > NOW() - INTERVAL '1 hour'
        GROUP BY workflow_id, issue_id, agent_id
      )
      SELECT
        workflow_id,
        issue_id,
        agent_id,
        EXTRACT(EPOCH FROM (NOW() - last_heartbeat)) * 1000 AS last_heartbeat_ms
      FROM agent_heartbeats
      WHERE EXTRACT(EPOCH FROM (NOW() - last_heartbeat)) * 1000 > $1
      `,
      [STALE_THRESHOLD_MS]
    );

    return result.rows.map((row) => ({
      exceptionType: 'agent_stale',
      severity: row.last_heartbeat_ms > 30 * 60 * 1000 ? 'critical' : 'high',
      workflowId: row.workflow_id,
      workflowType: 'IssueLifecycleWorkflow',
      issueId: row.issue_id,
      agentId: row.agent_id,
      title: `Agent ${row.agent_id} has gone stale`,
      description: `No activity from agent in ${Math.round(row.last_heartbeat_ms / 1000 / 60)} minutes. Agent may have crashed or stalled.`,
      detectedValue: row.last_heartbeat_ms,
      thresholdValue: STALE_THRESHOLD_MS,
    }));
  }

  /**
   * Detector 5: Test failures
   * Detect workflows with failing tests
   */
  async detectTestFailures(): Promise<DetectedException[]> {
    const result = await query<{
      workflow_id: string;
      issue_id: string;
      failed_tests: number;
      total_tests: number;
    }>(
      `
      SELECT
        workflow_id,
        issue_id,
        (payload->>'failed')::INTEGER AS failed_tests,
        (payload->>'passed')::INTEGER + (payload->>'failed')::INTEGER AS total_tests
      FROM telemetry_events
      WHERE event_type = 'test_results'
        AND (payload->>'failed')::INTEGER > 0
        AND timestamp > NOW() - INTERVAL '1 hour'
      `
    );

    return result.rows.map((row) => ({
      exceptionType: 'test_failures',
      severity: row.failed_tests > row.total_tests * 0.5 ? 'critical' : 'high',
      workflowId: row.workflow_id,
      workflowType: 'IssueLifecycleWorkflow',
      issueId: row.issue_id,
      title: `Test failures detected`,
      description: `${row.failed_tests} out of ${row.total_tests} tests failed.`,
      detectedValue: row.failed_tests,
      thresholdValue: 0,
    }));
  }

  /**
   * Record exception to database
   */
  private async recordException(exception: DetectedException): Promise<void> {
    try {
      const alertKey = `exception:${exception.exceptionType}:${exception.issueId || exception.workflowId}`;

      // Check if we should throttle the alert
      const shouldThrottle = await this.shouldThrottle(alertKey);

      const result = await query<{ id: number }>(
        `
        INSERT INTO exceptions (
          exception_type,
          severity,
          workflow_id,
          workflow_type,
          issue_id,
          epic_id,
          agent_id,
          title,
          description,
          detected_value,
          threshold_value,
          context
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id
        `,
        [
          exception.exceptionType,
          exception.severity,
          exception.workflowId,
          exception.workflowType,
          exception.issueId,
          exception.epicId,
          exception.agentId,
          exception.title,
          exception.description,
          exception.detectedValue,
          exception.thresholdValue,
          JSON.stringify(exception.context || {}),
        ]
      );

      const exceptionId = result.rows[0]?.id;

      // Send alert if not throttled and severity is high/critical
      if (!shouldThrottle && ['high', 'critical'].includes(exception.severity)) {
        await alertService.sendAlert({
          title: exception.title,
          message: exception.description,
          severity: exception.severity as 'high' | 'critical',
          context: {
            exceptionId,
            exceptionType: exception.exceptionType,
            workflowId: exception.workflowId,
            issueId: exception.issueId,
            ...exception.context,
          },
        });

        // Mark alert as sent
        await query(
          `
          UPDATE exceptions
          SET alert_sent = TRUE, alert_sent_at = NOW()
          WHERE id = $1
          `,
          [exceptionId]
        );
      }

      logger.debug('Exception recorded', {
        exceptionId,
        exceptionType: exception.exceptionType,
        severity: exception.severity,
        throttled: shouldThrottle,
      });
    } catch (error) {
      logger.error('Failed to record exception', {
        error: error instanceof Error ? error.message : 'Unknown error',
        exception: exception.exceptionType,
      });
    }
  }

  /**
   * Check if alert should be throttled
   */
  private async shouldThrottle(alertKey: string): Promise<boolean> {
    try {
      const result = await query<{ should_throttle: boolean }>(
        'SELECT should_throttle_alert($1, 5) AS should_throttle',
        [alertKey]
      );

      return result.rows[0]?.should_throttle ?? false;
    } catch (error) {
      logger.error('Failed to check alert throttle', {
        error: error instanceof Error ? error.message : 'Unknown error',
        alertKey,
      });
      return false; // Don't throttle on error
    }
  }

  /**
   * Group exceptions by type for logging
   */
  private groupByType(exceptions: DetectedException[]): Record<string, number> {
    return exceptions.reduce(
      (acc, e) => {
        acc[e.exceptionType] = (acc[e.exceptionType] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
  }
}

/**
 * Singleton instance
 */
export const exceptionDetector = new ExceptionDetector();
