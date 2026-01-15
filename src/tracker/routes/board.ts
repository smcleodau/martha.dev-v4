/**
 * Board Routes
 * Handles Kanban board state operations
 */

import { FastifyPluginAsync } from 'fastify';
import { loadBoard } from '../services/board-manager.js';

/**
 * Fastify plugin for board routes
 */
export const boardRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/tracker/board/default - Get default board state
  fastify.get('/default', async (request, reply) => {
    try {
      const board = loadBoard();
      return reply.send(board);
    } catch (error) {
      fastify.log.error('Failed to load board:', error);
      return reply.status(500).send({ error: 'Failed to load board' });
    }
  });

  // GET /api/tracker/board/:id - Get specific board (currently only default supported)
  fastify.get<{
    Params: { id: string };
  }>('/:id', async (request, reply) => {
    try {
      if (request.params.id !== 'default') {
        return reply.status(404).send({ error: 'Board not found' });
      }
      const board = loadBoard();
      return reply.send(board);
    } catch (error) {
      fastify.log.error('Failed to load board:', error);
      return reply.status(500).send({ error: 'Failed to load board' });
    }
  });
};
