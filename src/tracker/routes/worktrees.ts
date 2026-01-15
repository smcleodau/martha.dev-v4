/**
 * Worktrees Routes (Tracker-specific)
 * Handles worktree information for the tracker
 */

import { FastifyPluginAsync } from 'fastify';
import { getWorktreeRepository } from '../../database/repositories/worktree-repository.js';

const worktreeRepository = getWorktreeRepository();

/**
 * Fastify plugin for tracker worktrees routes
 */
export const worktreesRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/tracker/worktrees - List all worktrees
  fastify.get('/', async (request, reply) => {
    try {
      // Get worktrees from main Martha database
      const worktrees = await worktreeRepository.listAll();
      return reply.send({ worktrees, count: worktrees.length });
    } catch (error) {
      fastify.log.error('Failed to list worktrees:', error);
      return reply.status(500).send({ error: 'Failed to list worktrees' });
    }
  });

  // GET /api/tracker/worktrees/:name - Get worktree details
  fastify.get<{
    Params: { name: string };
  }>('/:name', async (request, reply) => {
    try {
      const worktree = await worktreeRepository.findByName(request.params.name);
      if (!worktree) {
        return reply.status(404).send({ error: 'Worktree not found' });
      }
      return reply.send(worktree);
    } catch (error) {
      fastify.log.error('Failed to get worktree:', error);
      return reply.status(500).send({ error: 'Failed to get worktree' });
    }
  });

  // POST /api/tracker/worktrees/:name/import - Import issues from GitHub
  fastify.post<{
    Params: { name: string };
  }>('/:name/import', async (request, reply) => {
    try {
      // TODO: Implement GitHub import functionality
      return reply.status(501).send({ error: 'GitHub import not implemented yet' });
    } catch (error) {
      fastify.log.error('Failed to import from GitHub:', error);
      return reply.status(500).send({ error: 'Failed to import from GitHub' });
    }
  });
};
