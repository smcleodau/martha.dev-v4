/**
 * Activity Routes
 * Handles issue activity/history operations
 */

import { FastifyPluginAsync } from 'fastify';
import {
  getActivity,
  getActivitySince,
} from '../services/activity-manager.js';

/**
 * Fastify plugin for activity routes
 */
export const activityRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/tracker/worktrees/:worktreeId/issues/:issueId/activity - Get activity history
  fastify.get<{
    Params: { worktreeId: string; issueId: string };
    Querystring: { limit?: string; since?: string };
  }>('/worktrees/:worktreeId/issues/:issueId/activity', async (request, reply) => {
    try {
      const { worktreeId, issueId } = request.params;
      const { limit, since } = request.query;

      let activity;
      if (since) {
        activity = getActivitySince(worktreeId, issueId, since);
      } else {
        const limitNum = limit ? parseInt(limit, 10) : undefined;
        activity = getActivity(worktreeId, issueId, limitNum);
      }

      return reply.send(activity);
    } catch (error) {
      fastify.log.error('Failed to fetch activity:', error);
      return reply.status(500).send({ error: 'Failed to fetch activity' });
    }
  });
};
