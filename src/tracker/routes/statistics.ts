/**
 * Statistics Routes
 * Provides aggregated statistics for boards and worktrees
 */

import { FastifyPluginAsync } from 'fastify';
import { loadIndex } from '../services/index-manager.js';
import { getActivity } from '../services/activity-manager.js';
import { loadBoard } from '../services/board-manager.js';
import type { Issue } from '../types.js';
import { readJsonSync, getIssuePath, fileExists } from '../services/file-storage.js';

/**
 * Get statistics for a board in a worktree
 * Returns: contributors count, active users (7-day activity), issue counts by type/initiative/team
 */
function getBoardStatistics(worktreeId: string, boardId: string) {
  const index = loadIndex(worktreeId);
  const board = loadBoard(worktreeId, boardId);

  // Get all issue IDs for this board
  const boardIssueIds = index.by_board[boardId] || [];

  // Load all issues for this board
  const issues: Issue[] = boardIssueIds
    .map((issueId) => {
      const entry = index.issues[issueId];
      if (!entry) return null;
      const issuePath = getIssuePath(worktreeId, entry.board_id, issueId);
      if (!fileExists(issuePath)) return null;
      try {
        return readJsonSync<Issue>(issuePath);
      } catch {
        return null;
      }
    })
    .filter((issue): issue is Issue => issue !== null);

  // Calculate contributors (unique assignees)
  const contributors = new Set<string>();
  issues.forEach((issue) => {
    if (issue.assignee?.id) {
      contributors.add(issue.assignee.id);
    }
  });

  // Calculate active users (7-day activity from activity logs)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoTimestamp = sevenDaysAgo.toISOString();

  const activeUsers = new Set<string>();
  boardIssueIds.forEach((issueId) => {
    try {
      const activities = getActivity(worktreeId, issueId);
      activities.forEach((activity) => {
        if (activity.timestamp >= sevenDaysAgoTimestamp) {
          activeUsers.add(activity.actor.id);
        }
      });
    } catch {
      // No activity file exists for this issue
    }
  });

  // Issue counts by type
  const issuesByType: Record<string, number> = {};
  issues.forEach((issue) => {
    issuesByType[issue.type] = (issuesByType[issue.type] || 0) + 1;
  });

  // Issue counts by status
  const issuesByStatus: Record<string, number> = {};
  issues.forEach((issue) => {
    issuesByStatus[issue.status] = (issuesByStatus[issue.status] || 0) + 1;
  });

  // Issue counts by priority
  const issuesByPriority: Record<string, number> = {};
  issues.forEach((issue) => {
    issuesByPriority[issue.priority] = (issuesByPriority[issue.priority] || 0) + 1;
  });

  // Issue counts by initiative (Phase 1.1)
  const issuesByInitiative: Record<string, number> = {};
  issues.forEach((issue) => {
    if (issue.initiative_id) {
      issuesByInitiative[issue.initiative_id] = (issuesByInitiative[issue.initiative_id] || 0) + 1;
    }
  });

  // Issue counts by team (Phase 1.1)
  const issuesByTeam: Record<string, number> = {};
  issues.forEach((issue) => {
    if (issue.team_ids && issue.team_ids.length > 0) {
      issue.team_ids.forEach((teamId) => {
        issuesByTeam[teamId] = (issuesByTeam[teamId] || 0) + 1;
      });
    }
  });

  // Issue counts by epic (Phase 1.1)
  const issuesByEpic: Record<string, number> = {};
  issues.forEach((issue) => {
    if (issue.epic_id) {
      issuesByEpic[issue.epic_id] = (issuesByEpic[issue.epic_id] || 0) + 1;
    }
  });

  // Issue counts by release (Phase 1.1)
  const issuesByRelease: Record<string, number> = {};
  issues.forEach((issue) => {
    if (issue.release_id) {
      issuesByRelease[issue.release_id] = (issuesByRelease[issue.release_id] || 0) + 1;
    }
  });

  // Calculate time tracking statistics
  let totalEstimatedHours = 0;
  let totalLoggedHours = 0;
  let issuesWithEstimates = 0;
  let issuesWithTimeLogged = 0;

  issues.forEach((issue) => {
    if (issue.time_tracking?.estimated_hours) {
      totalEstimatedHours += issue.time_tracking.estimated_hours;
      issuesWithEstimates++;
    }
    if (issue.time_tracking?.logged_hours) {
      totalLoggedHours += issue.time_tracking.logged_hours;
      if (issue.time_tracking.logged_hours > 0) {
        issuesWithTimeLogged++;
      }
    }
  });

  // Calculate story points (Phase 1.1)
  let totalStoryPoints = 0;
  let issuesWithStoryPoints = 0;
  issues.forEach((issue) => {
    if (issue.story_points) {
      totalStoryPoints += issue.story_points;
      issuesWithStoryPoints++;
    }
  });

  return {
    board: {
      id: board.id,
      name: board.name,
      description: board.description,
    },
    contributors: {
      total: contributors.size,
      list: Array.from(contributors),
    },
    active_users: {
      total: activeUsers.size,
      last_7_days: Array.from(activeUsers),
    },
    issues: {
      total: issues.length,
      by_type: issuesByType,
      by_status: issuesByStatus,
      by_priority: issuesByPriority,
      by_initiative: issuesByInitiative,
      by_team: issuesByTeam,
      by_epic: issuesByEpic,
      by_release: issuesByRelease,
    },
    time_tracking: {
      total_estimated_hours: totalEstimatedHours,
      total_logged_hours: totalLoggedHours,
      issues_with_estimates: issuesWithEstimates,
      issues_with_time_logged: issuesWithTimeLogged,
      completion_percentage: totalEstimatedHours > 0
        ? Math.round((totalLoggedHours / totalEstimatedHours) * 100)
        : 0,
    },
    story_points: {
      total: totalStoryPoints,
      issues_with_points: issuesWithStoryPoints,
      average: issuesWithStoryPoints > 0
        ? Math.round((totalStoryPoints / issuesWithStoryPoints) * 10) / 10
        : 0,
    },
  };
}

/**
 * Fastify plugin for statistics routes
 * Mounted at /api/tracker/worktrees/:worktreeId/boards/:boardId/stats
 */
export const statisticsRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/tracker/worktrees/:worktreeId/boards/:boardId/stats
  fastify.get<{
    Params: { worktreeId: string; boardId: string };
  }>('/', async (request, reply) => {
    try {
      const stats = getBoardStatistics(
        request.params.worktreeId,
        request.params.boardId
      );
      return reply.send(stats);
    } catch (error) {
      fastify.log.error('Failed to get board statistics:', error);
      if ((error as Error).message.includes('not found')) {
        return reply.status(404).send({
          error: 'Board or worktree not found'
        });
      }
      return reply.status(500).send({
        error: 'Failed to get board statistics'
      });
    }
  });
};
