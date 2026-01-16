/**
 * TelemetryWriter Service
 * Phase 2: Epic 2.2 - Telemetry Writer Service (13 SP)
 *
 * Comprehensive telemetry service for writing workflow events to TimescaleDB.
 * Provides single and batch write methods with automatic metadata updates.
 */

import { pool, query } from '../database/client.js';
import { createLogger } from '../utils/logger.js';
import type pg from 'pg';

const logger = createLogger({ module: 'telemetry' });

/**
 * Telemetry event interface
 */
export interface TelemetryEvent {
  // Event classification
  eventType: string;
  eventCategory: 'workflow' | 'activity' | 'signal' | 'query' | 'exception' | 'hook';
  severity?: 'debug' | 'info' | 'warning' | 'error' | 'critical';

  // Workflow context
  workflowId: string;
  workflowType: string;
  runId?: string;

  // Issue/Epic context
  issueId?: string;
  epicId?: string;
  batchId?: string;

  // Agent context
  agentId?: string;
  agentType?: string;

  // Activity context
  activityName?: string;
  activityId?: string;
  retryAttempt?: number;

  // Event data
  payload?: Record<string, unknown>;

  // Performance metrics
  durationMs?: number;
  memoryMb?: number;
  cpuPercent?: number;

  // Error tracking
  errorMessage?: string;
  errorStack?: string;
  errorCode?: string;

  // Metadata
  tags?: string[];
  source: 'temporal' | 'hook' | 'dashboard' | 'ml' | 'system';
  traceId?: string;
  parentId?: number;

  // Optional timestamp (defaults to NOW())
  timestamp?: Date;
}

/**
 * Workflow telemetry metadata
 */
export interface WorkflowMetadata {
  workflowId: string;
  workflowType: string;
  issueId?: string;
  epicId?: string;
  batchId?: string;
  status?: 'running' | 'completed' | 'failed';
  durationMs?: number;
}

/**
 * Telemetry query filters
 */
export interface TelemetryQueryFilters {
  workflowId?: string;
  issueId?: string;
  epicId?: string;
  batchId?: string;
  agentId?: string;
  eventType?: string;
  eventCategory?: string;
  severity?: string;
  startTime?: Date;
  endTime?: Date;
  tags?: string[];
  limit?: number;
  offset?: number;
}

/**
 * TelemetryWriter service for writing and querying telemetry events
 */
export class TelemetryWriter {
  /**
   * Write a single telemetry event
   */
  async writeEvent(event: TelemetryEvent): Promise<number> {
    const start = Date.now();

    try {
      const result = await query<{ id: number }>(
        `
        INSERT INTO telemetry_events (
          timestamp,
          event_type,
          event_category,
          severity,
          workflow_id,
          workflow_type,
          run_id,
          issue_id,
          epic_id,
          batch_id,
          agent_id,
          agent_type,
          activity_name,
          activity_id,
          retry_attempt,
          payload,
          duration_ms,
          memory_mb,
          cpu_percent,
          error_message,
          error_stack,
          error_code,
          tags,
          source,
          trace_id,
          parent_id
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
          $21, $22, $23, $24, $25, $26
        )
        RETURNING id
        `,
        [
          event.timestamp || new Date(),
          event.eventType,
          event.eventCategory,
          event.severity || 'info',
          event.workflowId,
          event.workflowType,
          event.runId,
          event.issueId,
          event.epicId,
          event.batchId,
          event.agentId,
          event.agentType,
          event.activityName,
          event.activityId,
          event.retryAttempt ?? 0,
          event.payload ? JSON.stringify(event.payload) : '{}',
          event.durationMs,
          event.memoryMb,
          event.cpuPercent,
          event.errorMessage,
          event.errorStack,
          event.errorCode,
          event.tags,
          event.source,
          event.traceId,
          event.parentId,
        ]
      );

      const duration = Date.now() - start;
      const eventId = result.rows[0]?.id;

      logger.debug('Telemetry event written', {
        eventId,
        eventType: event.eventType,
        workflowId: event.workflowId,
        duration,
      });

      // Update metadata asynchronously (fire and forget)
      void this.updateMetadata({
        workflowId: event.workflowId,
        workflowType: event.workflowType,
        issueId: event.issueId,
        epicId: event.epicId,
        batchId: event.batchId,
        status: this.extractStatus(event.eventType),
        durationMs: event.durationMs,
      });

      return eventId;
    } catch (error) {
      logger.error('Failed to write telemetry event', {
        error: error instanceof Error ? error.message : 'Unknown error',
        event: {
          eventType: event.eventType,
          workflowId: event.workflowId,
        },
      });
      throw error;
    }
  }

  /**
   * Write multiple telemetry events in a batch
   * More efficient for high-volume writes
   */
  async writeBatch(events: TelemetryEvent[]): Promise<number[]> {
    if (events.length === 0) {
      return [];
    }

    const start = Date.now();

    try {
      // Build parameterized query for bulk insert
      const values: unknown[] = [];
      const placeholders: string[] = [];

      events.forEach((event, idx) => {
        const offset = idx * 26;
        placeholders.push(
          `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11}, $${offset + 12}, $${offset + 13}, $${offset + 14}, $${offset + 15}, $${offset + 16}, $${offset + 17}, $${offset + 18}, $${offset + 19}, $${offset + 20}, $${offset + 21}, $${offset + 22}, $${offset + 23}, $${offset + 24}, $${offset + 25}, $${offset + 26})`
        );

        values.push(
          event.timestamp || new Date(),
          event.eventType,
          event.eventCategory,
          event.severity || 'info',
          event.workflowId,
          event.workflowType,
          event.runId,
          event.issueId,
          event.epicId,
          event.batchId,
          event.agentId,
          event.agentType,
          event.activityName,
          event.activityId,
          event.retryAttempt ?? 0,
          event.payload ? JSON.stringify(event.payload) : '{}',
          event.durationMs,
          event.memoryMb,
          event.cpuPercent,
          event.errorMessage,
          event.errorStack,
          event.errorCode,
          event.tags,
          event.source,
          event.traceId,
          event.parentId
        );
      });

      const result = await query<{ id: number }>(
        `
        INSERT INTO telemetry_events (
          timestamp, event_type, event_category, severity, workflow_id, workflow_type,
          run_id, issue_id, epic_id, batch_id, agent_id, agent_type,
          activity_name, activity_id, retry_attempt, payload,
          duration_ms, memory_mb, cpu_percent,
          error_message, error_stack, error_code,
          tags, source, trace_id, parent_id
        ) VALUES ${placeholders.join(', ')}
        RETURNING id
        `,
        values
      );

      const duration = Date.now() - start;
      const eventIds = result.rows.map((row) => row.id);

      logger.info('Telemetry batch written', {
        count: events.length,
        duration,
        eventsPerSecond: (events.length / (duration / 1000)).toFixed(2),
      });

      // Update metadata for unique workflows (fire and forget)
      const uniqueWorkflows = new Map<string, TelemetryEvent>();
      events.forEach((event) => {
        if (!uniqueWorkflows.has(event.workflowId)) {
          uniqueWorkflows.set(event.workflowId, event);
        }
      });

      uniqueWorkflows.forEach((event) => {
        void this.updateMetadata({
          workflowId: event.workflowId,
          workflowType: event.workflowType,
          issueId: event.issueId,
          epicId: event.epicId,
          batchId: event.batchId,
          status: this.extractStatus(event.eventType),
          durationMs: event.durationMs,
        });
      });

      return eventIds;
    } catch (error) {
      logger.error('Failed to write telemetry batch', {
        error: error instanceof Error ? error.message : 'Unknown error',
        count: events.length,
      });
      throw error;
    }
  }

  /**
   * Update workflow metadata
   * Called automatically by writeEvent and writeBatch
   */
  private async updateMetadata(metadata: WorkflowMetadata): Promise<void> {
    try {
      await query(
        `
        INSERT INTO telemetry_metadata (
          workflow_id,
          workflow_type,
          issue_id,
          epic_id,
          batch_id,
          event_count,
          first_event_at,
          last_event_at,
          duration_ms,
          status
        ) VALUES ($1, $2, $3, $4, $5, 1, NOW(), NOW(), $6, $7)
        ON CONFLICT (workflow_id) DO UPDATE SET
          event_count = telemetry_metadata.event_count + 1,
          last_event_at = NOW(),
          duration_ms = COALESCE(EXCLUDED.duration_ms, telemetry_metadata.duration_ms),
          status = COALESCE(EXCLUDED.status, telemetry_metadata.status),
          updated_at = NOW()
        `,
        [
          metadata.workflowId,
          metadata.workflowType,
          metadata.issueId,
          metadata.epicId,
          metadata.batchId,
          metadata.durationMs,
          metadata.status,
        ]
      );
    } catch (error) {
      logger.error('Failed to update telemetry metadata', {
        error: error instanceof Error ? error.message : 'Unknown error',
        workflowId: metadata.workflowId,
      });
      // Don't throw - metadata update is non-critical
    }
  }

  /**
   * Query telemetry events with filters
   */
  async queryEvents(filters: TelemetryQueryFilters): Promise<TelemetryEvent[]> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIdx = 1;

    // Build WHERE conditions dynamically
    if (filters.workflowId) {
      conditions.push(`workflow_id = $${paramIdx++}`);
      params.push(filters.workflowId);
    }
    if (filters.issueId) {
      conditions.push(`issue_id = $${paramIdx++}`);
      params.push(filters.issueId);
    }
    if (filters.epicId) {
      conditions.push(`epic_id = $${paramIdx++}`);
      params.push(filters.epicId);
    }
    if (filters.batchId) {
      conditions.push(`batch_id = $${paramIdx++}`);
      params.push(filters.batchId);
    }
    if (filters.agentId) {
      conditions.push(`agent_id = $${paramIdx++}`);
      params.push(filters.agentId);
    }
    if (filters.eventType) {
      conditions.push(`event_type = $${paramIdx++}`);
      params.push(filters.eventType);
    }
    if (filters.eventCategory) {
      conditions.push(`event_category = $${paramIdx++}`);
      params.push(filters.eventCategory);
    }
    if (filters.severity) {
      conditions.push(`severity = $${paramIdx++}`);
      params.push(filters.severity);
    }
    if (filters.startTime) {
      conditions.push(`timestamp >= $${paramIdx++}`);
      params.push(filters.startTime);
    }
    if (filters.endTime) {
      conditions.push(`timestamp <= $${paramIdx++}`);
      params.push(filters.endTime);
    }
    if (filters.tags && filters.tags.length > 0) {
      conditions.push(`tags && $${paramIdx++}`);
      params.push(filters.tags);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = filters.limit || 100;
    const offset = filters.offset || 0;

    const result = await query(
      `
      SELECT
        id, timestamp, event_type, event_category, severity,
        workflow_id, workflow_type, run_id,
        issue_id, epic_id, batch_id,
        agent_id, agent_type,
        activity_name, activity_id, retry_attempt,
        payload, duration_ms, memory_mb, cpu_percent,
        error_message, error_stack, error_code,
        tags, source, trace_id, parent_id
      FROM telemetry_events
      ${whereClause}
      ORDER BY timestamp DESC
      LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
      `,
      [...params, limit, offset]
    );

    return result.rows.map((row) => ({
      timestamp: row.timestamp,
      eventType: row.event_type,
      eventCategory: row.event_category,
      severity: row.severity,
      workflowId: row.workflow_id,
      workflowType: row.workflow_type,
      runId: row.run_id,
      issueId: row.issue_id,
      epicId: row.epic_id,
      batchId: row.batch_id,
      agentId: row.agent_id,
      agentType: row.agent_type,
      activityName: row.activity_name,
      activityId: row.activity_id,
      retryAttempt: row.retry_attempt,
      payload: row.payload,
      durationMs: row.duration_ms,
      memoryMb: row.memory_mb,
      cpuPercent: row.cpu_percent,
      errorMessage: row.error_message,
      errorStack: row.error_stack,
      errorCode: row.error_code,
      tags: row.tags,
      source: row.source,
      traceId: row.trace_id,
      parentId: row.parent_id,
    }));
  }

  /**
   * Get workflow telemetry summary using the helper function
   */
  async getWorkflowSummary(workflowId: string) {
    const result = await query(
      'SELECT * FROM get_workflow_telemetry_summary($1)',
      [workflowId]
    );

    return result.rows[0];
  }

  /**
   * Get recent errors using the helper function
   */
  async getRecentErrors(limit = 100) {
    const result = await query(
      'SELECT * FROM get_recent_errors($1)',
      [limit]
    );

    return result.rows;
  }

  /**
   * Extract status from event type
   */
  private extractStatus(eventType: string): 'running' | 'completed' | 'failed' | undefined {
    if (eventType.includes('started') || eventType.includes('progress')) {
      return 'running';
    }
    if (eventType.includes('completed') || eventType.includes('success')) {
      return 'completed';
    }
    if (eventType.includes('failed') || eventType.includes('error')) {
      return 'failed';
    }
    return undefined;
  }

  /**
   * Get aggregated metrics from continuous aggregates
   */
  async getAggregatedMetrics(
    aggregateType: '1min' | '1hour' | '1day',
    filters: {
      workflowType?: string;
      eventCategory?: string;
      startTime?: Date;
      endTime?: Date;
      limit?: number;
    }
  ) {
    const tableName = `telemetry_${aggregateType}`;
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIdx = 1;

    if (filters.workflowType) {
      conditions.push(`workflow_type = $${paramIdx++}`);
      params.push(filters.workflowType);
    }
    if (filters.eventCategory) {
      conditions.push(`event_category = $${paramIdx++}`);
      params.push(filters.eventCategory);
    }
    if (filters.startTime) {
      conditions.push(`bucket >= $${paramIdx++}`);
      params.push(filters.startTime);
    }
    if (filters.endTime) {
      conditions.push(`bucket <= $${paramIdx++}`);
      params.push(filters.endTime);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = filters.limit || 100;

    const result = await query(
      `
      SELECT * FROM ${tableName}
      ${whereClause}
      ORDER BY bucket DESC
      LIMIT $${paramIdx}
      `,
      [...params, limit]
    );

    return result.rows;
  }
}

/**
 * Singleton instance
 */
export const telemetryWriter = new TelemetryWriter();

/**
 * Helper function to write workflow lifecycle events
 */
export async function logWorkflowEvent(
  workflowId: string,
  workflowType: string,
  eventType: string,
  data?: Record<string, unknown>
): Promise<void> {
  await telemetryWriter.writeEvent({
    workflowId,
    workflowType,
    eventType,
    eventCategory: 'workflow',
    severity: 'info',
    payload: data,
    source: 'temporal',
  });
}

/**
 * Helper function to write activity events
 */
export async function logActivityEvent(
  workflowId: string,
  workflowType: string,
  activityName: string,
  eventType: string,
  data?: Record<string, unknown>
): Promise<void> {
  await telemetryWriter.writeEvent({
    workflowId,
    workflowType,
    activityName,
    eventType,
    eventCategory: 'activity',
    severity: 'info',
    payload: data,
    source: 'temporal',
  });
}

/**
 * Helper function to write error events
 */
export async function logErrorEvent(
  workflowId: string,
  workflowType: string,
  error: Error,
  context?: Record<string, unknown>
): Promise<void> {
  await telemetryWriter.writeEvent({
    workflowId,
    workflowType,
    eventType: 'error_occurred',
    eventCategory: 'exception',
    severity: 'error',
    errorMessage: error.message,
    errorStack: error.stack,
    errorCode: (error as any).code,
    payload: context,
    source: 'temporal',
  });
}
