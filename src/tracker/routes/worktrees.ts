/**
 * Worktrees Routes (Tracker-specific)
 * Manages tracker worktree configurations
 */

import { FastifyPluginAsync } from 'fastify';
import {
  listWorktrees,
  loadWorktree,
  createWorktree,
  updateWorktree,
  deleteWorktree,
  worktreeExists,
} from '../services/worktree-manager.js';
import { listBoards } from '../services/board-manager.js';

/**
 * Fastify plugin for tracker worktrees routes
 */
export const worktreesRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/tracker/worktrees - List all worktrees
  fastify.get('/', async (request, reply) => {
    try {
      const worktrees = listWorktrees();
      return reply.send({ worktrees, count: worktrees.length });
    } catch (error) {
      fastify.log.error('Failed to list worktrees:', error);
      return reply.status(500).send({ error: 'Failed to list worktrees' });
    }
  });

  // GET /api/tracker/worktrees/:worktreeId - Get worktree details
  fastify.get<{
    Params: { worktreeId: string };
  }>('/:worktreeId', async (request, reply) => {
    try {
      const worktree = loadWorktree(request.params.worktreeId);

      // Include boards in response
      const boards = listBoards(request.params.worktreeId);

      return reply.send({
        ...worktree,
        boards_detail: boards,
      });
    } catch (error) {
      if ((error as Error).message.includes('not found')) {
        return reply.status(404).send({ error: 'Worktree not found' });
      }
      fastify.log.error('Failed to get worktree:', error);
      return reply.status(500).send({ error: 'Failed to get worktree' });
    }
  });

  // POST /api/tracker/worktrees - Create new worktree
  fastify.post<{
    Body: {
      id: string;
      name: string;
      display_name: string;
      description: string;
      path: string;
      github_repo?: string;
    };
  }>('/', async (request, reply) => {
    try {
      const { id, name, display_name, description, path, github_repo } = request.body;

      // Validate required fields
      if (!id || !name || !display_name || !description || !path) {
        return reply.status(400).send({
          error: 'Missing required fields: id, name, display_name, description, path',
        });
      }

      // Check if worktree already exists
      if (worktreeExists(id)) {
        return reply.status(409).send({ error: 'Worktree already exists' });
      }

      const worktree = createWorktree({
        id,
        name,
        display_name,
        description,
        path,
        github_repo,
      });

      return reply.status(201).send(worktree);
    } catch (error) {
      fastify.log.error('Failed to create worktree:', error);
      return reply.status(500).send({ error: 'Failed to create worktree' });
    }
  });

  // PATCH /api/tracker/worktrees/:worktreeId - Update worktree
  fastify.patch<{
    Params: { worktreeId: string };
    Body: {
      name?: string;
      display_name?: string;
      description?: string;
      path?: string;
      github_repo?: string;
    };
  }>('/:worktreeId', async (request, reply) => {
    try {
      const updates = request.body;
      const worktree = updateWorktree(request.params.worktreeId, updates);
      return reply.send(worktree);
    } catch (error) {
      if ((error as Error).message.includes('not found')) {
        return reply.status(404).send({ error: 'Worktree not found' });
      }
      fastify.log.error('Failed to update worktree:', error);
      return reply.status(500).send({ error: 'Failed to update worktree' });
    }
  });

  // DELETE /api/tracker/worktrees/:worktreeId - Delete worktree
  fastify.delete<{
    Params: { worktreeId: string };
  }>('/:worktreeId', async (request, reply) => {
    try {
      const deleted = deleteWorktree(request.params.worktreeId);

      if (!deleted) {
        return reply.status(404).send({ error: 'Worktree not found' });
      }

      return reply.status(204).send();
    } catch (error) {
      fastify.log.error('Failed to delete worktree:', error);
      return reply.status(500).send({ error: 'Failed to delete worktree' });
    }
  });
};
