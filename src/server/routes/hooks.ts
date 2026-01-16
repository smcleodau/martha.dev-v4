import { FastifyInstance } from 'fastify';
import { createLogger } from '../../utils/logger.js';
import { getSwarmOrchestrator } from '../../core/swarm-orchestrator.js';
import { redis } from '../../redis/client.js';
import { getIssueTracker } from '../../integrations/github/issue-tracker.js';
import { getProjectBoard } from '../../integrations/github/project-board.js';
import { telemetryWriter } from '../../services/TelemetryWriter.js';
import { signalWorkflow } from '../../temporal/client.js';

const logger = createLogger({ module: 'hooks' });

export interface TaskCompletePayload {
  task_id: string;
  task_description: string;
  status: 'completed' | 'failed';
  worktree?: string;
  epic_number?: number;
  duration_ms?: number;
  error?: string;
}

export interface SessionEndPayload {
  session_id: string;
  worktree: string;
  duration_ms: number;
  tasks_completed: number;
  tasks_failed: number;
}

export interface AgentCompletePayload {
  agent_id: string;
  agent_role: string;
  worktree: string;
  tasks_completed: number;
  duration_ms: number;
}

export interface PhaseCompletePayload {
  phase: string;
  epic_number: number;
  worktree: string;
  tasks_completed: number;
  duration_ms: number;
}

export interface ErrorPayload {
  error: string;
  worktree: string;
  issue_number?: number;
  context?: any;
}

/**
 * Hook handlers for swarm callbacks
 *
 * These endpoints receive callbacks from claude-flow swarms
 * via the hook system configured in .claude/settings.json
 *
 * Phase 2 Update: Integrated telemetry tracking and Temporal workflow signaling
 * - All hooks now write to telemetry_events table
 * - Hooks forward events to Temporal workflows via signals
 * - Maintains existing Redis pub/sub for real-time updates
 */
export async function registerHookRoutes(fastify: FastifyInstance) {
  const swarmOrchestrator = getSwarmOrchestrator();

  /**
   * Task completion hook
   */
  fastify.post('/api/v1/hooks/task-complete', async (request, reply) => {
    const payload = request.body as TaskCompletePayload;

    logger.info('Hook: task-complete', {
      task_id: payload.task_id,
      status: payload.status,
      worktree: payload.worktree
    });

    try {
      // Phase 2: Write to telemetry
      const workflowId = payload.task_id ? `issue-lifecycle-${payload.task_id}` : `task-${payload.task_id}`;
      await telemetryWriter.writeEvent({
        workflowId,
        workflowType: 'IssueLifecycleWorkflow',
        eventType: payload.status === 'completed' ? 'task_completed' : 'task_failed',
        eventCategory: 'hook',
        severity: payload.status === 'completed' ? 'info' : 'error',
        issueId: payload.task_id,
        payload: {
          task_description: payload.task_description,
          worktree: payload.worktree,
          epic_number: payload.epic_number,
          error: payload.error,
        },
        durationMs: payload.duration_ms,
        errorMessage: payload.error,
        source: 'hook',
      });

      // Phase 2: Signal Temporal workflow
      try {
        if (payload.status === 'completed') {
          await signalWorkflow(workflowId, 'agentCompleted', [{
            agentId: `agent-${payload.task_id}`,
            duration: payload.duration_ms || 0,
          }]);
        }
      } catch (signalError) {
        // Don't fail hook if signal fails - log and continue
        logger.warn('Failed to signal workflow', {
          workflowId,
          error: signalError instanceof Error ? signalError.message : 'Unknown error',
        });
      }

      // Forward to swarm orchestrator
      await swarmOrchestrator.handleHook('task-complete', payload);

      // Emit event to Redis
      await redis.publish('martha:hooks', JSON.stringify({
        type: 'hook.task-complete',
        payload,
        timestamp: new Date().toISOString()
      }));

      // Store in Redis event store if worktree provided
      if (payload.worktree) {
        await redis.lpush(
          `ts:events:${payload.worktree}`,
          JSON.stringify({
            type: 'swarm.task-complete',
            task_id: payload.task_id,
            status: payload.status,
            duration_ms: payload.duration_ms,
            timestamp: new Date().toISOString()
          })
        );
      }

      return { received: true, timestamp: new Date().toISOString() };
    } catch (error) {
      logger.error('Failed to handle task-complete hook', {
        error: error instanceof Error ? error.message : 'Unknown error',
        payload
      });

      return reply.code(500).send({
        error: 'Failed to process hook',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * Session end hook
   */
  fastify.post('/api/v1/hooks/session-end', async (request, reply) => {
    const payload = request.body as SessionEndPayload;

    logger.info('Hook: session-end', {
      session_id: payload.session_id,
      worktree: payload.worktree,
      tasks_completed: payload.tasks_completed
    });

    try {
      // Forward to swarm orchestrator
      await swarmOrchestrator.handleHook('session-end', payload);

      // Emit event
      await redis.publish('martha:hooks', JSON.stringify({
        type: 'hook.session-end',
        payload,
        timestamp: new Date().toISOString()
      }));

      // Store in event store
      await redis.lpush(
        `ts:events:${payload.worktree}`,
        JSON.stringify({
          type: 'swarm.session-end',
          session_id: payload.session_id,
          tasks_completed: payload.tasks_completed,
          duration_ms: payload.duration_ms,
          timestamp: new Date().toISOString()
        })
      );

      return { received: true, timestamp: new Date().toISOString() };
    } catch (error) {
      logger.error('Failed to handle session-end hook', {
        error: error instanceof Error ? error.message : 'Unknown error',
        payload
      });

      return reply.code(500).send({ error: 'Failed to process hook' });
    }
  });

  /**
   * Agent completion hook
   */
  fastify.post('/api/v1/hooks/agent-complete', async (request, reply) => {
    const payload = request.body as AgentCompletePayload;

    logger.info('Hook: agent-complete', {
      agent_id: payload.agent_id,
      agent_role: payload.agent_role,
      worktree: payload.worktree,
      tasks_completed: payload.tasks_completed
    });

    try {
      // Forward to swarm orchestrator
      await swarmOrchestrator.handleHook('agent-complete', payload);

      // Emit event
      await redis.publish('martha:hooks', JSON.stringify({
        type: 'hook.agent-complete',
        payload,
        timestamp: new Date().toISOString()
      }));

      // Store in event store
      await redis.lpush(
        `ts:events:${payload.worktree}`,
        JSON.stringify({
          type: 'swarm.agent-complete',
          agent_id: payload.agent_id,
          agent_role: payload.agent_role,
          tasks_completed: payload.tasks_completed,
          timestamp: new Date().toISOString()
        })
      );

      return { received: true, timestamp: new Date().toISOString() };
    } catch (error) {
      logger.error('Failed to handle agent-complete hook', {
        error: error instanceof Error ? error.message : 'Unknown error',
        payload
      });

      return reply.code(500).send({ error: 'Failed to process hook' });
    }
  });

  /**
   * Phase completion hook (for epic tracking)
   */
  fastify.post('/api/v1/hooks/phase-complete', async (request, reply) => {
    const payload = request.body as PhaseCompletePayload;

    logger.info('Hook: phase-complete', {
      phase: payload.phase,
      epic_number: payload.epic_number,
      worktree: payload.worktree
    });

    try {
      // Update epic progress if GitHub integration is enabled
      if (process.env.GITHUB_TOKEN) {
        try {
          const issueTracker = getIssueTracker();
          const projectBoard = getProjectBoard();

          // Post phase completion comment to GitHub
          await projectBoard.commentWorkStarted(
            payload.epic_number,
            `Phase ${payload.phase} completed: ${payload.tasks_completed} tasks in ${payload.duration_ms}ms`
          );

          logger.info('Posted phase completion to GitHub', {
            epic_number: payload.epic_number,
            phase: payload.phase
          });
        } catch (githubError) {
          logger.warn('Failed to post to GitHub', {
            error: githubError instanceof Error ? githubError.message : 'Unknown error'
          });
        }
      }

      // Emit event
      await redis.publish('martha:hooks', JSON.stringify({
        type: 'hook.phase-complete',
        payload,
        timestamp: new Date().toISOString()
      }));

      // Store in event store
      await redis.lpush(
        `ts:events:${payload.worktree}`,
        JSON.stringify({
          type: 'swarm.phase-complete',
          phase: payload.phase,
          epic_number: payload.epic_number,
          tasks_completed: payload.tasks_completed,
          timestamp: new Date().toISOString()
        })
      );

      return { received: true, timestamp: new Date().toISOString() };
    } catch (error) {
      logger.error('Failed to handle phase-complete hook', {
        error: error instanceof Error ? error.message : 'Unknown error',
        payload
      });

      return reply.code(500).send({ error: 'Failed to process hook' });
    }
  });

  /**
   * Error hook (swarm encountered an error)
   */
  fastify.post('/api/v1/hooks/error', async (request, reply) => {
    const payload = request.body as ErrorPayload;

    logger.error('Hook: error from swarm', {
      error: payload.error,
      worktree: payload.worktree,
      issue_number: payload.issue_number
    });

    try {
      // Post to GitHub if issue number provided
      if (payload.issue_number && process.env.GITHUB_TOKEN) {
        try {
          const projectBoard = getProjectBoard();
          await projectBoard.commentWorkBlocked(
            payload.issue_number,
            payload.error
          );

          logger.info('Posted error to GitHub issue', {
            issue_number: payload.issue_number
          });
        } catch (githubError) {
          logger.warn('Failed to post error to GitHub', {
            error: githubError instanceof Error ? githubError.message : 'Unknown error'
          });
        }
      }

      // Emit event
      await redis.publish('martha:hooks', JSON.stringify({
        type: 'hook.error',
        payload,
        timestamp: new Date().toISOString()
      }));

      // Store in event store
      await redis.lpush(
        `ts:events:${payload.worktree}`,
        JSON.stringify({
          type: 'swarm.error',
          error: payload.error,
          issue_number: payload.issue_number,
          timestamp: new Date().toISOString()
        })
      );

      return { received: true, timestamp: new Date().toISOString() };
    } catch (error) {
      logger.error('Failed to handle error hook', {
        error: error instanceof Error ? error.message : 'Unknown error',
        payload
      });

      return reply.code(500).send({ error: 'Failed to process hook' });
    }
  });

  logger.info('Hook routes registered');
}
