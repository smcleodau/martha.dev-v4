/**
 * Releases Routes
 * Handles CRUD operations for tracker releases with worktree scoping
 */

import { FastifyPluginAsync } from 'fastify';
import {
  createRelease,
  getRelease,
  listReleases,
  updateRelease,
  deleteRelease,
  updateGateStatus,
  getReleaseStats,
  type ReleaseGateStatus,
} from '../services/release-manager.js';
import { loadIndex } from '../services/index-manager.js';
import { readJsonSync, getIssuePath } from '../services/file-storage.js';

// Request/Response schemas
interface ReleaseCreateRequest {
  name: string;
  version: string;
  target_date: string;
  description: string;
  gates?: Array<{
    id: string;
    name: string;
    type: 'security' | 'testing' | 'documentation' | 'review' | 'deployment' | 'custom';
    status: ReleaseGateStatus;
    required: boolean;
    description: string;
    metadata?: Record<string, any>;
  }>;
  status?: 'planning' | 'in_progress' | 'testing' | 'released' | 'cancelled';
}

interface ReleaseUpdateRequest {
  name?: string;
  version?: string;
  target_date?: string;
  description?: string;
  status?: 'planning' | 'in_progress' | 'testing' | 'released' | 'cancelled';
  gates?: Array<{
    id: string;
    name: string;
    type: 'security' | 'testing' | 'documentation' | 'review' | 'deployment' | 'custom';
    status: ReleaseGateStatus;
    required: boolean;
    description: string;
    metadata?: Record<string, any>;
  }>;
}

interface UpdateGateRequest {
  status: ReleaseGateStatus;
  metadata?: Record<string, any>;
}

/**
 * Fastify plugin for releases routes
 * Mounted at /api/tracker/worktrees/:worktreeId/releases
 */
export const releasesRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/tracker/worktrees/:worktreeId/releases - List all releases
  fastify.get<{
    Params: { worktreeId: string };
  }>('/', async (request, reply) => {
    try {
      const releases = listReleases(request.params.worktreeId);
      return reply.send({ releases, count: releases.length });
    } catch (error) {
      fastify.log.error('Failed to list releases:', error);
      return reply.status(500).send({ error: 'Failed to list releases' });
    }
  });

  // POST /api/tracker/worktrees/:worktreeId/releases - Create release
  fastify.post<{
    Params: { worktreeId: string };
    Body: ReleaseCreateRequest;
  }>('/', async (request, reply) => {
    try {
      const release = createRelease(request.params.worktreeId, request.body);
      return reply.status(201).send(release);
    } catch (error) {
      fastify.log.error('Failed to create release:', error);
      return reply.status(500).send({ error: 'Failed to create release' });
    }
  });

  // GET /api/tracker/worktrees/:worktreeId/releases/:id - Get release
  fastify.get<{
    Params: { worktreeId: string; id: string };
  }>('/:id', async (request, reply) => {
    try {
      const release = getRelease(request.params.worktreeId, request.params.id);
      return reply.send(release);
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        return reply.status(404).send({ error: 'Release not found' });
      }
      fastify.log.error('Failed to get release:', error);
      return reply.status(500).send({ error: 'Failed to get release' });
    }
  });

  // PATCH /api/tracker/worktrees/:worktreeId/releases/:id - Update release
  fastify.patch<{
    Params: { worktreeId: string; id: string };
    Body: ReleaseUpdateRequest;
  }>('/:id', async (request, reply) => {
    try {
      const release = updateRelease(
        request.params.worktreeId,
        request.params.id,
        request.body
      );
      return reply.send(release);
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        return reply.status(404).send({ error: 'Release not found' });
      }
      fastify.log.error('Failed to update release:', error);
      return reply.status(500).send({ error: 'Failed to update release' });
    }
  });

  // DELETE /api/tracker/worktrees/:worktreeId/releases/:id - Delete release
  fastify.delete<{
    Params: { worktreeId: string; id: string };
  }>('/:id', async (request, reply) => {
    try {
      const deleted = deleteRelease(request.params.worktreeId, request.params.id);
      if (!deleted) {
        return reply.status(404).send({ error: 'Release not found' });
      }
      return reply.status(204).send();
    } catch (error) {
      fastify.log.error('Failed to delete release:', error);
      return reply.status(500).send({ error: 'Failed to delete release' });
    }
  });

  // PATCH /api/tracker/worktrees/:worktreeId/releases/:id/gates/:gateId - Update gate status
  fastify.patch<{
    Params: { worktreeId: string; id: string; gateId: string };
    Body: UpdateGateRequest;
  }>('/:id/gates/:gateId', async (request, reply) => {
    try {
      const release = updateGateStatus(
        request.params.worktreeId,
        request.params.id,
        request.params.gateId,
        request.body.status,
        request.body.metadata
      );
      return reply.send(release);
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        return reply.status(404).send({
          error:
            error.message.includes('Gate not found')
              ? 'Gate not found'
              : 'Release not found',
        });
      }
      fastify.log.error('Failed to update gate status:', error);
      return reply.status(500).send({ error: 'Failed to update gate status' });
    }
  });

  // GET /api/tracker/worktrees/:worktreeId/releases/:id/stats - Get release stats
  fastify.get<{
    Params: { worktreeId: string; id: string };
  }>('/:id/stats', async (request, reply) => {
    try {
      // Load all issues for this worktree
      const index = loadIndex(request.params.worktreeId);
      const issueIds = Object.keys(index.issues);

      // Load full issue data
      const issues = issueIds
        .map((id) => {
          const entry = index.issues[id];
          try {
            const issuePath = getIssuePath(
              request.params.worktreeId,
              entry.board_id,
              id
            );
            const issue = readJsonSync<{
              id: string;
              status: string;
              type: string;
            }>(issuePath);
            return issue;
          } catch {
            return null;
          }
        })
        .filter((issue): issue is { id: string; status: string; type: string } =>
          issue !== null
        );

      const stats = getReleaseStats(
        request.params.worktreeId,
        request.params.id,
        issues
      );

      return reply.send(stats);
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        return reply.status(404).send({ error: 'Release not found' });
      }
      fastify.log.error('Failed to get release stats:', error);
      return reply.status(500).send({ error: 'Failed to get release stats' });
    }
  });
};
