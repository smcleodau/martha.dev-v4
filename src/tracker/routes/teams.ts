/**
 * Teams Routes
 * Handles CRUD operations for tracker teams with worktree scoping
 */

import { FastifyPluginAsync } from 'fastify';
import {
  createTeam,
  getTeam,
  listTeams,
  updateTeam,
  deleteTeam,
  addTeamMember,
  removeTeamMember,
  getTeamStats,
} from '../services/team-manager.js';
import { loadIndex, getIssuesByBoard } from '../services/index-manager.js';
import { readJsonSync, getIssuePath } from '../services/file-storage.js';
import type { Assignee } from '../types.js';

// Request/Response schemas
interface TeamCreateRequest {
  name: string;
  description: string;
  color?: string;
  members?: Assignee[];
}

interface TeamUpdateRequest {
  name?: string;
  description?: string;
  color?: string;
  members?: Assignee[];
}

interface AddMemberRequest {
  member: Assignee;
}

/**
 * Fastify plugin for teams routes
 * Mounted at /api/tracker/worktrees/:worktreeId/teams
 */
export const teamsRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/tracker/worktrees/:worktreeId/teams - List all teams
  fastify.get<{
    Params: { worktreeId: string };
  }>('/', async (request, reply) => {
    try {
      const teams = listTeams(request.params.worktreeId);
      return reply.send({ teams, count: teams.length });
    } catch (error) {
      fastify.log.error('Failed to list teams:', error);
      return reply.status(500).send({ error: 'Failed to list teams' });
    }
  });

  // POST /api/tracker/worktrees/:worktreeId/teams - Create team
  fastify.post<{
    Params: { worktreeId: string };
    Body: TeamCreateRequest;
  }>('/', async (request, reply) => {
    try {
      const team = createTeam(request.params.worktreeId, request.body);
      return reply.status(201).send(team);
    } catch (error) {
      fastify.log.error('Failed to create team:', error);
      return reply.status(500).send({ error: 'Failed to create team' });
    }
  });

  // GET /api/tracker/worktrees/:worktreeId/teams/:id - Get team
  fastify.get<{
    Params: { worktreeId: string; id: string };
  }>('/:id', async (request, reply) => {
    try {
      const team = getTeam(request.params.worktreeId, request.params.id);
      return reply.send(team);
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        return reply.status(404).send({ error: 'Team not found' });
      }
      fastify.log.error('Failed to get team:', error);
      return reply.status(500).send({ error: 'Failed to get team' });
    }
  });

  // PATCH /api/tracker/worktrees/:worktreeId/teams/:id - Update team
  fastify.patch<{
    Params: { worktreeId: string; id: string };
    Body: TeamUpdateRequest;
  }>('/:id', async (request, reply) => {
    try {
      const team = updateTeam(
        request.params.worktreeId,
        request.params.id,
        request.body
      );
      return reply.send(team);
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        return reply.status(404).send({ error: 'Team not found' });
      }
      fastify.log.error('Failed to update team:', error);
      return reply.status(500).send({ error: 'Failed to update team' });
    }
  });

  // DELETE /api/tracker/worktrees/:worktreeId/teams/:id - Delete team
  fastify.delete<{
    Params: { worktreeId: string; id: string };
  }>('/:id', async (request, reply) => {
    try {
      const deleted = deleteTeam(request.params.worktreeId, request.params.id);
      if (!deleted) {
        return reply.status(404).send({ error: 'Team not found' });
      }
      return reply.status(204).send();
    } catch (error) {
      fastify.log.error('Failed to delete team:', error);
      return reply.status(500).send({ error: 'Failed to delete team' });
    }
  });

  // POST /api/tracker/worktrees/:worktreeId/teams/:id/members - Add member
  fastify.post<{
    Params: { worktreeId: string; id: string };
    Body: AddMemberRequest;
  }>('/:id/members', async (request, reply) => {
    try {
      const team = addTeamMember(
        request.params.worktreeId,
        request.params.id,
        request.body.member
      );
      return reply.send(team);
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        return reply.status(404).send({ error: 'Team not found' });
      }
      fastify.log.error('Failed to add team member:', error);
      return reply.status(500).send({ error: 'Failed to add team member' });
    }
  });

  // DELETE /api/tracker/worktrees/:worktreeId/teams/:id/members/:userId - Remove member
  fastify.delete<{
    Params: { worktreeId: string; id: string; userId: string };
  }>('/:id/members/:userId', async (request, reply) => {
    try {
      const team = removeTeamMember(
        request.params.worktreeId,
        request.params.id,
        request.params.userId
      );
      return reply.send(team);
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        return reply.status(404).send({ error: 'Team not found' });
      }
      fastify.log.error('Failed to remove team member:', error);
      return reply.status(500).send({ error: 'Failed to remove team member' });
    }
  });

  // GET /api/tracker/worktrees/:worktreeId/teams/:id/stats - Get team stats
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
              assignee: Assignee | null;
              status: string;
            }>(issuePath);
            return issue;
          } catch {
            return null;
          }
        })
        .filter((issue): issue is { id: string; assignee: Assignee | null; status: string } =>
          issue !== null
        );

      const stats = getTeamStats(
        request.params.worktreeId,
        request.params.id,
        issues
      );

      return reply.send(stats);
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        return reply.status(404).send({ error: 'Team not found' });
      }
      fastify.log.error('Failed to get team stats:', error);
      return reply.status(500).send({ error: 'Failed to get team stats' });
    }
  });
};
