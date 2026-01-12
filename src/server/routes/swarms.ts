import { FastifyInstance } from 'fastify';
import { createLogger } from '../../utils/logger.js';
import { getSwarmOrchestrator } from '../../core/swarm-orchestrator.js';
import { getSwarmRepository } from '../../database/repositories/swarm-repository.js';

const logger = createLogger({ module: 'swarm-routes' });

/**
 * Swarm API routes
 *
 * Provides HTTP API for swarm management
 */
export async function registerSwarmRoutes(fastify: FastifyInstance) {
  const swarmOrchestrator = getSwarmOrchestrator();
  const swarmRepository = getSwarmRepository();

  /**
   * List all swarms
   */
  fastify.get('/api/v1/swarms', async (request, reply) => {
    try {
      const swarms = await swarmRepository.findAll(100);

      const summary = {
        total: swarms.length,
        active: swarms.filter(s => ['running', 'spawning', 'paused'].includes(s.status)).length,
        completed: swarms.filter(s => s.status === 'completed').length,
        crashed: swarms.filter(s => s.status === 'crashed').length
      };

      return {
        summary,
        swarms: swarms.map(s => ({
          id: s.id,
          epic_number: s.epic_number,
          worktree_path: s.worktree_path,
          status: s.status,
          agent_count: s.agent_count,
          task_count: s.task_count,
          resource_usage: s.resource_usage,
          created_at: s.created_at,
          last_heartbeat: s.last_heartbeat,
          uptime_ms: Date.now() - s.created_at.getTime()
        }))
      };
    } catch (error) {
      logger.error('Failed to list swarms', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return reply.code(500).send({
        error: 'Failed to list swarms',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * Get swarm by ID
   */
  fastify.get('/api/v1/swarms/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      const status = await swarmOrchestrator.getStatus(id);

      return {
        swarm: {
          id: status.swarm.id,
          epic_number: status.swarm.epic_number,
          worktree_path: status.swarm.worktree_path,
          pid: status.swarm.pid,
          status: status.swarm.status,
          config: status.swarm.config,
          resource_usage: status.swarm.resource_usage,
          agent_count: status.swarm.agent_count,
          task_count: status.swarm.task_count,
          created_at: status.swarm.created_at,
          last_heartbeat: status.swarm.last_heartbeat,
          uptime_ms: Date.now() - status.swarm.created_at.getTime()
        },
        state: status.state,
        is_running: status.is_running
      };
    } catch (error) {
      logger.error('Failed to get swarm', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      if (error instanceof Error && error.message === 'Swarm not found') {
        return reply.code(404).send({ error: 'Swarm not found' });
      }

      return reply.code(500).send({
        error: 'Failed to get swarm',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * Get swarms by epic number
   */
  fastify.get('/api/v1/epics/:epic_number/swarms', async (request, reply) => {
    try {
      const { epic_number } = request.params as { epic_number: string };

      const swarms = await swarmRepository.findByEpicNumber(parseInt(epic_number, 10));

      return {
        epic_number: parseInt(epic_number, 10),
        total: swarms.length,
        swarms: swarms.map(s => ({
          id: s.id,
          status: s.status,
          agent_count: s.agent_count,
          task_count: s.task_count,
          created_at: s.created_at,
          last_heartbeat: s.last_heartbeat
        }))
      };
    } catch (error) {
      logger.error('Failed to get swarms by epic', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return reply.code(500).send({
        error: 'Failed to get swarms',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * Terminate swarm
   */
  fastify.delete('/api/v1/swarms/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { reason } = request.body as { reason?: string };

      await swarmOrchestrator.terminate(id, reason);

      return {
        success: true,
        swarm_id: id,
        terminated_at: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Failed to terminate swarm', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      if (error instanceof Error && error.message === 'Swarm not found') {
        return reply.code(404).send({ error: 'Swarm not found' });
      }

      return reply.code(500).send({
        error: 'Failed to terminate swarm',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  logger.info('Swarm routes registered');
}
