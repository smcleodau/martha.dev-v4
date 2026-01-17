/**
 * Board Routes
 * Handles Kanban board state operations with multi-board support
 */

import { FastifyPluginAsync } from 'fastify';
import {
  loadBoard,
  saveBoard,
  createBoard,
  listBoards,
  deleteBoard,
  updateBoard,
  boardExists,
} from '../services/board-manager.js';
import type { BoardColumn } from '../types.js';

/**
 * Fastify plugin for board routes (backward compatibility)
 * Mounted at /api/tracker/board
 */
export const boardRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/tracker/board/default - Get default board state (DEPRECATED)
  fastify.get('/default', async (request, reply) => {
    try {
      const board = loadBoard('default', 'default');
      return reply.send(board);
    } catch (error) {
      fastify.log.error('Failed to load board:', error);
      return reply.status(500).send({ error: 'Failed to load board' });
    }
  });

  // GET /api/tracker/board/:id - Get specific board (DEPRECATED)
  fastify.get<{
    Params: { id: string };
  }>('/:id', async (request, reply) => {
    try {
      // For backward compatibility, map to default worktree
      const board = loadBoard('default', request.params.id);
      return reply.send(board);
    } catch (error) {
      if ((error as Error).message.includes('not found')) {
        return reply.status(404).send({ error: 'Board not found' });
      }
      fastify.log.error('Failed to load board:', error);
      return reply.status(500).send({ error: 'Failed to load board' });
    }
  });
};

/**
 * Fastify plugin for hierarchical board routes
 * Mounted at /api/tracker/worktrees/:worktreeId/boards
 */
export const hierarchicalBoardRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/tracker/worktrees/:worktreeId/boards - List all boards in worktree
  fastify.get<{
    Params: { worktreeId: string };
  }>('/', async (request, reply) => {
    try {
      const boards = listBoards(request.params.worktreeId);
      return reply.send({ boards, count: boards.length });
    } catch (error) {
      fastify.log.error('Failed to list boards:', error);
      return reply.status(500).send({ error: 'Failed to list boards' });
    }
  });

  // GET /api/tracker/worktrees/:worktreeId/boards/:boardId - Get board state
  fastify.get<{
    Params: { worktreeId: string; boardId: string };
  }>('/:boardId', async (request, reply) => {
    try {
      const board = loadBoard(request.params.worktreeId, request.params.boardId);
      return reply.send(board);
    } catch (error) {
      if ((error as Error).message.includes('not found')) {
        return reply.status(404).send({ error: 'Board not found' });
      }
      fastify.log.error('Failed to load board:', error);
      return reply.status(500).send({ error: 'Failed to load board' });
    }
  });

  // POST /api/tracker/worktrees/:worktreeId/boards - Create new board
  fastify.post<{
    Params: { worktreeId: string };
    Body: {
      name: string;
      description: string;
      columns?: BoardColumn[];
    };
  }>('/', async (request, reply) => {
    try {
      const { name, description, columns } = request.body;

      // Validate required fields
      if (!name || !description) {
        return reply.status(400).send({
          error: 'Missing required fields: name, description',
        });
      }

      // ID is auto-generated - no need to check for conflicts
      const board = createBoard(request.params.worktreeId, {
        name,
        description,
        columns,
      });

      return reply.status(201).send(board);
    } catch (error) {
      fastify.log.error('Failed to create board:', error);
      return reply.status(500).send({ error: 'Failed to create board' });
    }
  });

  // PATCH /api/tracker/worktrees/:worktreeId/boards/:boardId - Update board
  fastify.patch<{
    Params: { worktreeId: string; boardId: string };
    Body: {
      name?: string;
      description?: string;
      sprint?: any;
      columns?: BoardColumn[];
    };
  }>('/:boardId', async (request, reply) => {
    try {
      const updates = request.body;
      const board = updateBoard(
        request.params.worktreeId,
        request.params.boardId,
        updates
      );
      return reply.send(board);
    } catch (error) {
      if ((error as Error).message.includes('not found')) {
        return reply.status(404).send({ error: 'Board not found' });
      }
      fastify.log.error('Failed to update board:', error);
      return reply.status(500).send({ error: 'Failed to update board' });
    }
  });

  // DELETE /api/tracker/worktrees/:worktreeId/boards/:boardId - Delete board
  fastify.delete<{
    Params: { worktreeId: string; boardId: string };
  }>('/:boardId', async (request, reply) => {
    try {
      const deleted = deleteBoard(request.params.worktreeId, request.params.boardId);

      if (!deleted) {
        return reply.status(404).send({ error: 'Board not found' });
      }

      return reply.status(204).send();
    } catch (error) {
      fastify.log.error('Failed to delete board:', error);
      return reply.status(500).send({ error: 'Failed to delete board' });
    }
  });
};
