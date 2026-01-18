import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { telemetryWriter, TelemetryQueryFilters } from '../../services/TelemetryWriter.js';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger({ module: 'telemetry-routes' });

export default async function telemetryRoutes(fastify: FastifyInstance) {
  // Get telemetry events with filtering
  fastify.get('/api/v1/telemetry/events', async (request: FastifyRequest<{
    Querystring: {
      limit?: string;
      offset?: string;
      workflowId?: string;
      issueId?: string;
      epicId?: string;
      category?: string;
      severity?: string;
      startTime?: string;
      endTime?: string;
    };
  }>, reply: FastifyReply) => {
    try {
      const {
        limit,
        offset,
        workflowId,
        issueId,
        epicId,
        category,
        severity,
        startTime,
        endTime,
      } = request.query;

      const filters: TelemetryQueryFilters = {
        limit: limit ? parseInt(limit) : 50,
        offset: offset ? parseInt(offset) : 0,
        workflowId,
        issueId,
        epicId,
        eventCategory: category,
        severity,
        startTime: startTime ? new Date(startTime) : undefined,
        endTime: endTime ? new Date(endTime) : undefined,
      };

      const events = await telemetryWriter.queryEvents(filters);

      return reply.send({
        success: true,
        events,
        count: events.length,
        filters,
      });
    } catch (error) {
      logger.error('Failed to fetch telemetry events', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return reply.status(500).send({
        success: false,
        error: 'Failed to fetch telemetry events',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Get agent performance metrics
  fastify.get('/api/v1/telemetry/agent-metrics', async (request: FastifyRequest<{
    Querystring: {
      limit?: string;
      timeRange?: string;
    };
  }>, reply: FastifyReply) => {
    try {
      const { limit, timeRange } = request.query;

      // Calculate time range
      const now = new Date();
      let startTime = new Date(now.getTime() - 3600000); // Default: 1 hour ago

      if (timeRange) {
        const match = timeRange.match(/^(\d+)(m|h|d)$/);
        if (match) {
          const value = parseInt(match[1]);
          const unit = match[2];
          const multiplier = unit === 'm' ? 60000 : unit === 'h' ? 3600000 : 86400000;
          startTime = new Date(now.getTime() - value * multiplier);
        }
      }

      // Query agent events
      const events = await telemetryWriter.queryEvents({
        startTime,
        endTime: now,
        limit: 10000, // Get all events in range
      });

      // Aggregate by agent
      const agentMap = new Map<string, {
        agentId: string;
        agentType: string;
        totalEvents: number;
        totalDuration: number;
        eventCount: number;
        errorCount: number;
        lastActive: Date;
      }>();

      events.forEach((event) => {
        if (!event.agentId) return;

        const existing = agentMap.get(event.agentId);
        const eventDate = new Date(event.timestamp);

        if (existing) {
          existing.totalEvents++;
          existing.eventCount++;
          if (event.durationMs) {
            existing.totalDuration += event.durationMs;
          }
          if (event.severity === 'error' || event.severity === 'critical') {
            existing.errorCount++;
          }
          if (eventDate > existing.lastActive) {
            existing.lastActive = eventDate;
          }
        } else {
          agentMap.set(event.agentId, {
            agentId: event.agentId,
            agentType: event.agentType || 'Unknown',
            totalEvents: 1,
            totalDuration: event.durationMs || 0,
            eventCount: 1,
            errorCount: (event.severity === 'error' || event.severity === 'critical') ? 1 : 0,
            lastActive: eventDate,
          });
        }
      });

      // Convert to metrics array
      const metrics = Array.from(agentMap.values())
        .map((agent) => ({
          agentId: agent.agentId,
          agentType: agent.agentType,
          totalEvents: agent.totalEvents,
          avgDurationMs: agent.eventCount > 0 ? Math.round(agent.totalDuration / agent.eventCount) : 0,
          errorCount: agent.errorCount,
          successRate: agent.totalEvents > 0 ? ((agent.totalEvents - agent.errorCount) / agent.totalEvents) * 100 : 100,
          lastActive: agent.lastActive.toISOString(),
        }))
        .sort((a, b) => b.totalEvents - a.totalEvents)
        .slice(0, limit ? parseInt(limit) : 20);

      return reply.send({
        success: true,
        metrics,
        count: metrics.length,
        timeRange: {
          start: startTime.toISOString(),
          end: now.toISOString(),
        },
      });
    } catch (error) {
      logger.error('Failed to fetch agent metrics', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return reply.status(500).send({
        success: false,
        error: 'Failed to fetch agent metrics',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Get exceptions
  fastify.get('/api/v1/telemetry/exceptions', async (request: FastifyRequest<{
    Querystring: {
      limit?: string;
      resolved?: string;
      severity?: string;
    };
  }>, reply: FastifyReply) => {
    try {
      const { limit, resolved, severity } = request.query;

      // Query error events
      const events = await telemetryWriter.queryEvents({
        eventCategory: 'exception',
        severity: severity || undefined,
        limit: limit ? parseInt(limit) : 50,
      });

      // Transform to exception format
      const exceptions = events.map((event, index) => ({
        id: index + 1,
        timestamp: event.timestamp,
        workflowId: event.workflowId,
        issueId: event.issueId,
        errorMessage: event.errorMessage || 'Unknown error',
        errorStack: event.errorStack,
        errorCode: event.errorCode,
        severity: event.severity,
        resolved: false, // TODO: Track resolved status in database
        occurrenceCount: 1, // TODO: Group similar errors
      }));

      return reply.send({
        success: true,
        exceptions,
        count: exceptions.length,
      });
    } catch (error) {
      logger.error('Failed to fetch exceptions', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return reply.status(500).send({
        success: false,
        error: 'Failed to fetch exceptions',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Get workflows
  fastify.get('/api/v1/telemetry/workflows', async (request: FastifyRequest<{
    Querystring: {
      limit?: string;
      status?: string;
      type?: string;
    };
  }>, reply: FastifyReply) => {
    try {
      const { limit, status, type } = request.query;

      // Query workflow metadata
      const query = `
        SELECT
          workflow_id,
          workflow_type,
          issue_id,
          epic_id,
          batch_id,
          status,
          first_event_at as started_at,
          last_event_at as last_activity,
          duration_ms,
          event_count,
          updated_at as completed_at
        FROM telemetry_metadata
        WHERE 1=1
        ${status ? `AND status = $1` : ''}
        ${type ? `AND workflow_type = $${status ? '2' : '1'}` : ''}
        ORDER BY first_event_at DESC
        LIMIT $${status && type ? '3' : status || type ? '2' : '1'}
      `;

      const params: any[] = [];
      if (status) params.push(status);
      if (type) params.push(type);
      params.push(limit ? parseInt(limit) : 20);

      const { query: dbQuery } = await import('../../database/client.js');
      const result = await dbQuery(query, params);

      const workflows = result.rows.map((row) => ({
        workflowId: row.workflow_id,
        workflowType: row.workflow_type,
        issueId: row.issue_id,
        epicId: row.epic_id,
        status: row.status || 'running',
        startedAt: row.started_at,
        completedAt: row.status === 'completed' || row.status === 'failed' ? row.completed_at : undefined,
        durationMs: row.duration_ms,
        eventCount: row.event_count,
      }));

      return reply.send({
        success: true,
        workflows,
        count: workflows.length,
      });
    } catch (error) {
      logger.error('Failed to fetch workflows', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return reply.status(500).send({
        success: false,
        error: 'Failed to fetch workflows',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Get learning patterns (mock for now - Phase 5 will implement real ML)
  fastify.get('/api/v1/telemetry/learning-patterns', async (request: FastifyRequest<{
    Querystring: {
      limit?: string;
    };
  }>, reply: FastifyReply) => {
    try {
      // TODO: Implement real learning pattern detection in Phase 5
      // For now, return mock data
      const patterns = [
        {
          id: 'pattern-001',
          patternType: 'Performance Optimization',
          description: 'Workflows with parallel activity execution complete 3.2x faster on average',
          confidence: 0.94,
          occurrences: 247,
          lastSeen: new Date(Date.now() - 5 * 60000).toISOString(),
          impact: 'high',
        },
      ];

      return reply.send({
        success: true,
        patterns,
        count: patterns.length,
      });
    } catch (error) {
      logger.error('Failed to fetch learning patterns', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return reply.status(500).send({
        success: false,
        error: 'Failed to fetch learning patterns',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Get aggregated metrics
  fastify.get('/api/v1/telemetry/metrics/:aggregateType', async (request: FastifyRequest<{
    Params: {
      aggregateType: '1min' | '1hour' | '1day';
    };
    Querystring: {
      workflowType?: string;
      category?: string;
      limit?: string;
    };
  }>, reply: FastifyReply) => {
    try {
      const { aggregateType } = request.params;
      const { workflowType, category, limit } = request.query;

      const metrics = await telemetryWriter.getAggregatedMetrics(aggregateType, {
        workflowType,
        eventCategory: category,
        limit: limit ? parseInt(limit) : 100,
      });

      return reply.send({
        success: true,
        metrics,
        count: metrics.length,
        aggregateType,
      });
    } catch (error) {
      logger.error('Failed to fetch aggregated metrics', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return reply.status(500).send({
        success: false,
        error: 'Failed to fetch aggregated metrics',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });
}
