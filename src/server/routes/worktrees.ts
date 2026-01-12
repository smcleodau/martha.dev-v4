import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { connectionManager } from '../../core/connection-manager.js';
import { getEventHistory, getEventCount } from '../../redis/event-store.js';
import { getWorktreeRepository } from '../../database/repositories/worktree-repository.js';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger({ module: 'worktrees' });

/**
 * Worktree management routes
 */
export async function worktreeRoutes(fastify: FastifyInstance) {
  /**
   * List all worktrees
   */
  fastify.get('/api/v1/worktrees', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Get all registered worktrees from database
      const worktreeRepo = getWorktreeRepository();
      const dbWorktrees = await worktreeRepo.findAll();

      // Get connection statuses from connection manager
      const connectionStatuses = connectionManager.getAllWorktreeStatuses();

      // Merge database worktrees with connection status
      const worktrees = dbWorktrees.map((wt) => {
        const connectionStatus = connectionStatuses.find((cs) => cs.name === wt.name);

        return {
          name: wt.name,
          branch: wt.branch_name,
          index: wt.index,
          ports: wt.ports,
          status: connectionStatus?.status || 'offline',
          baseBranch: wt.base_branch,
          repository: wt.repository_name || 'martha.dev-v4',
          isDailyBranch: wt.is_daily_branch,
          path: wt.path,
          lastSeen: connectionStatus?.lastSeen,
          agentVersion: connectionStatus?.agentVersion,
          agentInfo: connectionStatus?.agentInfo,
        };
      });

      return reply.send({
        worktrees,
        total: worktrees.length,
        online: worktrees.filter((w) => w.status === 'online').length,
        offline: worktrees.filter((w) => w.status === 'offline').length,
      });
    } catch (error) {
      logger.error('Failed to retrieve worktrees', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return reply.code(500).send({
        error: 'Failed to retrieve worktrees',
      });
    }
  });

  /**
   * Get specific worktree status
   */
  fastify.get(
    '/api/v1/worktrees/:worktree',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { worktree } = request.params as { worktree: string };

      const status = connectionManager.getWorktreeStatus(worktree);

      if (!status) {
        return reply.code(404).send({
          error: 'Worktree not found',
          worktree,
        });
      }

      return reply.send(status);
    }
  );

  /**
   * Get worktree events
   */
  fastify.get(
    '/api/v1/worktrees/:worktree/events',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { worktree } = request.params as { worktree: string };
      const { limit, offset } = request.query as {
        limit?: string;
        offset?: string;
      };

      const limitNum = limit ? parseInt(limit, 10) : 100;
      const offsetNum = offset ? parseInt(offset, 10) : 0;

      try {
        const events = await getEventHistory(worktree, limitNum, offsetNum);
        const totalCount = await getEventCount(worktree);

        return reply.send({
          worktree,
          events,
          total: totalCount,
          limit: limitNum,
          offset: offsetNum,
        });
      } catch (error) {
        logger.error('Failed to retrieve events', {
          error: error instanceof Error ? error.message : 'Unknown error',
          worktree,
        });

        return reply.code(500).send({
          error: 'Failed to retrieve events',
          worktree,
        });
      }
    }
  );

  /**
   * Get connected agents
   */
  fastify.get(
    '/api/v1/agents',
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const agents = connectionManager.getConnectedAgents();

      return reply.send({
        agents,
        count: agents.length,
      });
    }
  );

  /**
   * Get connected clients
   */
  fastify.get(
    '/api/v1/clients',
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const clients = connectionManager.getConnectedClients();

      return reply.send({
        clients,
        count: clients.length,
      });
    }
  );
}
