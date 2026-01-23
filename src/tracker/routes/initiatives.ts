/**
 * Initiatives Routes
 * Handles CRUD operations for initiatives (collections of epics for strategic planning)
 */

import { FastifyPluginAsync } from 'fastify';
import {
  createInitiative,
  getInitiative,
  listInitiatives,
  updateInitiative,
  deleteInitiative,
  linkEpicToInitiative,
  unlinkEpicFromInitiative,
  getInitiativeStats,
  initiativeExists,
} from '../services/initiative-manager.js';
import { loadIndex } from '../services/index-manager.js';
import type { Initiative } from '../services/initiative-manager.js';
import type { Assignee } from '../types.js';

// Request/Response schemas
interface InitiativeCreateRequest {
  name: string;
  description: string;
  color?: string;
  status?: 'planning' | 'active' | 'completed' | 'archived';
  owner?: Assignee | null;
  start_date?: string | null;
  end_date?: string | null;
}

interface InitiativeUpdateRequest {
  name?: string;
  description?: string;
  color?: string;
  status?: 'planning' | 'active' | 'completed' | 'archived';
  owner?: Assignee | null;
  start_date?: string | null;
  end_date?: string | null;
}

/**
 * Fastify plugin for initiatives routes
 * Mounted at /api/tracker/worktrees/:worktreeId/initiatives
 */
export const initiativesRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/tracker/worktrees/:worktreeId/initiatives - List all initiatives
  fastify.get<{
    Params: { worktreeId: string };
  }>('/', async (request, reply) => {
    try {
      const initiatives = listInitiatives(request.params.worktreeId);
      return reply.send({ initiatives, count: initiatives.length });
    } catch (error) {
      fastify.log.error('Failed to list initiatives:', error);
      return reply.status(500).send({ error: 'Failed to list initiatives' });
    }
  });

  // POST /api/tracker/worktrees/:worktreeId/initiatives - Create new initiative
  fastify.post<{
    Params: { worktreeId: string };
    Body: InitiativeCreateRequest;
  }>('/', async (request, reply) => {
    try {
      const initiative = createInitiative(request.params.worktreeId, request.body);
      return reply.status(201).send(initiative);
    } catch (error) {
      fastify.log.error('Failed to create initiative:', error);
      return reply.status(500).send({ error: 'Failed to create initiative' });
    }
  });

  // GET /api/tracker/worktrees/:worktreeId/initiatives/:id - Get initiative by ID
  fastify.get<{
    Params: { worktreeId: string; id: string };
  }>('/:id', async (request, reply) => {
    try {
      if (!initiativeExists(request.params.worktreeId, request.params.id)) {
        return reply.status(404).send({ error: 'Initiative not found' });
      }

      const initiative = getInitiative(request.params.worktreeId, request.params.id);
      return reply.send(initiative);
    } catch (error) {
      fastify.log.error('Failed to get initiative:', error);
      if (error instanceof Error && error.message.includes('not found')) {
        return reply.status(404).send({ error: 'Initiative not found' });
      }
      return reply.status(500).send({ error: 'Failed to get initiative' });
    }
  });

  // PATCH /api/tracker/worktrees/:worktreeId/initiatives/:id - Update initiative
  fastify.patch<{
    Params: { worktreeId: string; id: string };
    Body: InitiativeUpdateRequest;
  }>('/:id', async (request, reply) => {
    try {
      if (!initiativeExists(request.params.worktreeId, request.params.id)) {
        return reply.status(404).send({ error: 'Initiative not found' });
      }

      const initiative = updateInitiative(
        request.params.worktreeId,
        request.params.id,
        request.body
      );
      return reply.send(initiative);
    } catch (error) {
      fastify.log.error('Failed to update initiative:', error);
      if (error instanceof Error && error.message.includes('not found')) {
        return reply.status(404).send({ error: 'Initiative not found' });
      }
      return reply.status(500).send({ error: 'Failed to update initiative' });
    }
  });

  // DELETE /api/tracker/worktrees/:worktreeId/initiatives/:id - Delete initiative
  fastify.delete<{
    Params: { worktreeId: string; id: string };
  }>('/:id', async (request, reply) => {
    try {
      const deleted = deleteInitiative(request.params.worktreeId, request.params.id);
      if (!deleted) {
        return reply.status(404).send({ error: 'Initiative not found' });
      }
      return reply.status(204).send();
    } catch (error) {
      fastify.log.error('Failed to delete initiative:', error);
      return reply.status(500).send({ error: 'Failed to delete initiative' });
    }
  });

  // POST /api/tracker/worktrees/:worktreeId/initiatives/:id/epics/:epicId - Link epic to initiative
  fastify.post<{
    Params: { worktreeId: string; id: string; epicId: string };
  }>('/:id/epics/:epicId', async (request, reply) => {
    try {
      if (!initiativeExists(request.params.worktreeId, request.params.id)) {
        return reply.status(404).send({ error: 'Initiative not found' });
      }

      const initiative = linkEpicToInitiative(
        request.params.worktreeId,
        request.params.id,
        request.params.epicId
      );
      return reply.send(initiative);
    } catch (error) {
      fastify.log.error('Failed to link epic to initiative:', error);
      if (error instanceof Error && error.message.includes('not found')) {
        return reply.status(404).send({ error: 'Initiative not found' });
      }
      return reply.status(500).send({ error: 'Failed to link epic to initiative' });
    }
  });

  // DELETE /api/tracker/worktrees/:worktreeId/initiatives/:id/epics/:epicId - Unlink epic from initiative
  fastify.delete<{
    Params: { worktreeId: string; id: string; epicId: string };
  }>('/:id/epics/:epicId', async (request, reply) => {
    try {
      if (!initiativeExists(request.params.worktreeId, request.params.id)) {
        return reply.status(404).send({ error: 'Initiative not found' });
      }

      const initiative = unlinkEpicFromInitiative(
        request.params.worktreeId,
        request.params.id,
        request.params.epicId
      );
      return reply.send(initiative);
    } catch (error) {
      fastify.log.error('Failed to unlink epic from initiative:', error);
      if (error instanceof Error && error.message.includes('not found')) {
        return reply.status(404).send({ error: 'Initiative not found' });
      }
      return reply.status(500).send({ error: 'Failed to unlink epic from initiative' });
    }
  });

  // GET /api/tracker/worktrees/:worktreeId/initiatives/:id/stats - Get initiative statistics
  fastify.get<{
    Params: { worktreeId: string; id: string };
  }>('/:id/stats', async (request, reply) => {
    try {
      if (!initiativeExists(request.params.worktreeId, request.params.id)) {
        return reply.status(404).send({ error: 'Initiative not found' });
      }

      // Load all issues from index for stats calculation
      const index = loadIndex(request.params.worktreeId);
      const issues = Object.values(index.issues).map((entry) => ({
        id: entry.issue_id,
        type: entry.type,
        status: entry.status,
        epic_id: entry.parent_id && entry.type !== 'epic' ? entry.parent_id : null,
      }));

      const stats = getInitiativeStats(request.params.worktreeId, request.params.id, issues);
      return reply.send(stats);
    } catch (error) {
      fastify.log.error('Failed to get initiative stats:', error);
      if (error instanceof Error && error.message.includes('not found')) {
        return reply.status(404).send({ error: 'Initiative not found' });
      }
      return reply.status(500).send({ error: 'Failed to get initiative stats' });
    }
  });
};
