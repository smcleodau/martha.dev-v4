/**
 * Issues Routes with Multi-Board Support
 * Handles CRUD operations for tracker issues with worktree/board scoping
 */

import { FastifyPluginAsync } from 'fastify';
import {
  loadIndex,
  saveIndex,
  addToIndex,
  updateIndex,
  removeFromIndex,
  getNextIssueId,
  getIssuesByBoard,
} from '../services/index-manager.js';
import {
  loadBoard,
  saveBoard,
  addToBoard,
  removeFromBoard,
  moveOnBoard,
} from '../services/board-manager.js';
import {
  readJsonSync,
  writeJsonSync,
  getIssuePath,
  deleteFile,
  fileExists,
} from '../services/file-storage.js';
import { listSessionsForIssue } from '../services/agent-manager.js';
import { logActivity } from '../services/activity-manager.js';
import { addDependency, removeDependency, getDependencies } from '../services/dependency-manager.js';
import { logTimeEntry, getTimeEntries, deleteTimeEntry, recalculateLoggedHours } from '../services/time-entry-manager.js';
import { recordView, getEngagement } from '../services/engagement-tracker.js';
import type { Issue, Assignee, Links, QualityInfo, DocumentationLinks, TimeTracking } from '../types.js';

// Request/Response schemas
interface IssueCreateRequest {
  title: string;
  type?: 'epic' | 'story' | 'task' | 'bug';
  status?: string;
  parent_id?: string | null;
  description?: string;
  labels?: string[];
  priority?: 'critical' | 'high' | 'medium' | 'low';
  assignee?: Assignee | null;
  // Phase 1.1: New fields
  initiative_id?: string | null;
  team_ids?: string[];
  story_points?: number | null;
  epic_id?: string | null;
  release_id?: string | null;
  start_date?: string | null;
  due_date?: string | null;
  estimated_duration?: number | null;
  dependencies?: {
    blocks?: string[];
    blocked_by?: string[];
    related?: string[];
  };
  watchers?: string[];
}

interface IssueUpdateRequest {
  title?: string;
  type?: 'epic' | 'story' | 'task' | 'bug';
  status?: string;
  description?: string;
  labels?: string[];
  priority?: 'critical' | 'high' | 'medium' | 'low';
  assignee?: Assignee | null;
  links?: Links;
  quality?: QualityInfo;
  documentation?: DocumentationLinks;
  time_tracking?: TimeTracking;
  // Phase 1.1: New fields
  initiative_id?: string | null;
  team_ids?: string[];
  story_points?: number | null;
  epic_id?: string | null;
  release_id?: string | null;
  start_date?: string | null;
  due_date?: string | null;
  estimated_duration?: number | null;
  dependencies?: {
    blocks?: string[];
    blocked_by?: string[];
    related?: string[];
  };
  watchers?: string[];
  policy_compliance?: any;
}

interface IssueMoveRequest {
  status: string;
}

/**
 * Create new issue
 */
function createIssue(
  worktreeId: string,
  boardId: string,
  data: IssueCreateRequest
): Issue {
  const index = loadIndex(worktreeId);
  const board = loadBoard(worktreeId, boardId);

  const issueId = getNextIssueId(index);
  const now = new Date().toISOString();

  const issue: Issue = {
    id: issueId,
    worktree_id: worktreeId,
    board_id: boardId,
    type: data.type || 'task',
    title: data.title,
    description: data.description || '',
    status: data.status || 'backlog',
    priority: data.priority || 'medium',
    parent_id: data.parent_id || null,
    assignee: data.assignee || null,
    labels: data.labels || [],
    quality: {
      coverage: 0,
      checklist: [],
    },
    time_tracking: {
      estimated_hours: data.estimated_duration || null,
      logged_hours: 0,
    },
    links: {
      pr: null,
      related_issues: [],
      external: [],
    },
    documentation: {
      overview: null,
      technical_spec: null,
      related_docs: [],
    },
    github_sync: {
      issue_number: null,
      last_synced: null,
      dirty: true,
    },
    metadata: {
      created_at: now,
      updated_at: now,
      version: 1,
    },
    // Phase 1.1: New fields
    initiative_id: data.initiative_id || null,
    team_ids: data.team_ids || [],
    story_points: data.story_points || null,
    epic_id: data.epic_id || null,
    release_id: data.release_id || null,
    start_date: data.start_date || null,
    due_date: data.due_date || null,
    estimated_duration: data.estimated_duration || null,
    dependencies: {
      blocks: data.dependencies?.blocks || [],
      blocked_by: data.dependencies?.blocked_by || [],
      related: data.dependencies?.related || [],
    },
    watchers: data.watchers || [],
    policy_compliance: null,
    engagement: {
      views: 0,
      total_read_time: 0,
      view_history: [],
    },
  };

  // Save issue file
  const issuePath = getIssuePath(worktreeId, boardId, issueId);
  writeJsonSync(issuePath, issue);

  // Update index
  addToIndex(index, issue);
  saveIndex(worktreeId, index);

  // Add to board
  addToBoard(board, issueId, issue.status);
  saveBoard(worktreeId, boardId, board);

  return issue;
}

/**
 * Get issue by ID
 */
function getIssue(worktreeId: string, boardId: string, issueId: string): Issue | null {
  const issuePath = getIssuePath(worktreeId, boardId, issueId);
  if (!fileExists(issuePath)) {
    return null;
  }
  return readJsonSync<Issue>(issuePath);
}

/**
 * Update issue
 */
function updateIssue(
  worktreeId: string,
  boardId: string,
  issueId: string,
  data: IssueUpdateRequest
): Issue | null {
  const issue = getIssue(worktreeId, boardId, issueId);
  if (!issue) return null;

  const oldIssue = { ...issue };
  const oldStatus = issue.status;

  // Apply updates
  if (data.title !== undefined) issue.title = data.title;
  if (data.type !== undefined) issue.type = data.type;
  if (data.status !== undefined) issue.status = data.status;
  if (data.description !== undefined) issue.description = data.description;
  if (data.labels !== undefined) issue.labels = data.labels;
  if (data.priority !== undefined) issue.priority = data.priority;
  if (data.assignee !== undefined) issue.assignee = data.assignee;
  if (data.links !== undefined) issue.links = data.links;
  if (data.quality !== undefined) issue.quality = data.quality;
  if (data.documentation !== undefined) issue.documentation = data.documentation;
  if (data.time_tracking !== undefined) issue.time_tracking = data.time_tracking;

  // Phase 1.1: Apply new field updates
  if (data.initiative_id !== undefined) issue.initiative_id = data.initiative_id;
  if (data.team_ids !== undefined) issue.team_ids = data.team_ids;
  if (data.story_points !== undefined) issue.story_points = data.story_points;
  if (data.epic_id !== undefined) issue.epic_id = data.epic_id;
  if (data.release_id !== undefined) issue.release_id = data.release_id;
  if (data.start_date !== undefined) issue.start_date = data.start_date;
  if (data.due_date !== undefined) issue.due_date = data.due_date;
  if (data.estimated_duration !== undefined) issue.estimated_duration = data.estimated_duration;
  if (data.dependencies !== undefined) {
    issue.dependencies = {
      blocks: data.dependencies.blocks || issue.dependencies.blocks,
      blocked_by: data.dependencies.blocked_by || issue.dependencies.blocked_by,
      related: data.dependencies.related || issue.dependencies.related,
    };
  }
  if (data.watchers !== undefined) issue.watchers = data.watchers;
  if (data.policy_compliance !== undefined) issue.policy_compliance = data.policy_compliance;

  // Update metadata
  issue.metadata.updated_at = new Date().toISOString();
  issue.metadata.version++;
  issue.github_sync.dirty = true;

  // Save issue file
  const issuePath = getIssuePath(worktreeId, boardId, issueId);
  writeJsonSync(issuePath, issue);

  // Update index
  const index = loadIndex(worktreeId);
  updateIndex(index, oldIssue, issue);
  saveIndex(worktreeId, index);

  // Update board if status changed
  if (data.status && oldStatus !== issue.status) {
    const board = loadBoard(worktreeId, boardId);
    moveOnBoard(board, issueId, oldStatus, issue.status);
    saveBoard(worktreeId, boardId, board);
  }

  return issue;
}

/**
 * Delete issue
 */
function deleteIssue(worktreeId: string, boardId: string, issueId: string): boolean {
  const issue = getIssue(worktreeId, boardId, issueId);
  if (!issue) return false;

  // Delete issue file
  const issuePath = getIssuePath(worktreeId, boardId, issueId);
  deleteFile(issuePath);

  // Remove from index
  const index = loadIndex(worktreeId);
  removeFromIndex(index, issue);
  saveIndex(worktreeId, index);

  // Remove from board
  const board = loadBoard(worktreeId, boardId);
  removeFromBoard(board, issueId, issue.status);
  saveBoard(worktreeId, boardId, board);

  return true;
}

/**
 * List issues with optional filters
 */
function listIssues(
  worktreeId: string,
  boardId?: string,
  filters?: {
    status?: string;
    type?: string;
    parent_id?: string;
    assignee?: string;
    initiative_id?: string;
    team_id?: string;
    epic_id?: string;
    release_id?: string;
    start_date_gte?: string;
    end_date_lte?: string;
  }
): Issue[] {
  const index = loadIndex(worktreeId);
  let issueIds = Object.keys(index.issues);

  // Filter by board if specified
  if (boardId) {
    issueIds = getIssuesByBoard(index, boardId);
  }

  // Apply filters
  if (filters?.status) {
    issueIds = issueIds.filter((id) => index.issues[id].status === filters.status);
  }
  if (filters?.type) {
    issueIds = issueIds.filter((id) => index.issues[id].type === filters.type);
  }
  if (filters?.parent_id) {
    issueIds = issueIds.filter((id) => index.issues[id].parent_id === filters.parent_id);
  }

  // Load full issues
  const issues = issueIds
    .map((id) => {
      const entry = index.issues[id];
      return getIssue(worktreeId, entry.board_id, id);
    })
    .filter((issue): issue is Issue => issue !== null);

  // Filter by assignee if needed (requires full issue data)
  if (filters?.assignee) {
    return issues.filter((issue) => issue.assignee?.id === filters.assignee);
  }

  // Phase 1.1: Apply additional filters (requires full issue data)
  let filteredIssues = issues;

  if (filters?.initiative_id) {
    filteredIssues = filteredIssues.filter((issue) => issue.initiative_id === filters.initiative_id);
  }

  if (filters?.team_id) {
    filteredIssues = filteredIssues.filter((issue) =>
      issue.team_ids && issue.team_ids.includes(filters.team_id!)
    );
  }

  if (filters?.epic_id) {
    filteredIssues = filteredIssues.filter((issue) => issue.epic_id === filters.epic_id);
  }

  if (filters?.release_id) {
    filteredIssues = filteredIssues.filter((issue) => issue.release_id === filters.release_id);
  }

  if (filters?.start_date_gte) {
    filteredIssues = filteredIssues.filter((issue) =>
      issue.start_date && issue.start_date >= filters.start_date_gte!
    );
  }

  if (filters?.end_date_lte) {
    filteredIssues = filteredIssues.filter((issue) =>
      issue.due_date && issue.due_date <= filters.end_date_lte!
    );
  }

  // Sort by updated_at descending
  return filteredIssues.sort((a, b) => {
    const aUpdated = a.metadata.updated_at;
    const bUpdated = b.metadata.updated_at;
    return new Date(bUpdated).getTime() - new Date(aUpdated).getTime();
  });
}

/**
 * Fastify plugin for hierarchical issues routes
 * Mounted at /api/tracker/worktrees/:worktreeId/boards/:boardId/issues
 */
export const hierarchicalIssuesRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/tracker/worktrees/:worktreeId/boards/:boardId/issues - List issues
  fastify.get<{
    Params: { worktreeId: string; boardId: string };
    Querystring: {
      status?: string;
      type?: string;
      parent_id?: string;
      assignee?: string;
      initiative_id?: string;
      team_id?: string;
      epic_id?: string;
      release_id?: string;
      start_date_gte?: string;
      end_date_lte?: string;
    };
  }>('/', async (request, reply) => {
    try {
      const issues = listIssues(
        request.params.worktreeId,
        request.params.boardId,
        request.query
      );
      return reply.send({ issues, count: issues.length });
    } catch (error) {
      fastify.log.error('Failed to list issues:', error);
      return reply.status(500).send({ error: 'Failed to list issues' });
    }
  });

  // GET /api/tracker/worktrees/:worktreeId/boards/:boardId/issues/:id - Get single issue
  fastify.get<{
    Params: { worktreeId: string; boardId: string; id: string };
  }>('/:id', async (request, reply) => {
    try {
      const issue = getIssue(
        request.params.worktreeId,
        request.params.boardId,
        request.params.id
      );
      if (!issue) {
        return reply.status(404).send({ error: 'Issue not found' });
      }
      return reply.send(issue);
    } catch (error) {
      fastify.log.error('Failed to get issue:', error);
      return reply.status(500).send({ error: 'Failed to get issue' });
    }
  });

  // POST /api/tracker/worktrees/:worktreeId/boards/:boardId/issues - Create issue
  fastify.post<{
    Params: { worktreeId: string; boardId: string };
    Body: IssueCreateRequest;
  }>('/', async (request, reply) => {
    try {
      const issue = createIssue(
        request.params.worktreeId,
        request.params.boardId,
        request.body
      );

      // Log activity
      try {
        logActivity(request.params.worktreeId, issue.id, {
          issue_id: issue.id,
          actor: { id: 'system', name: 'System' },
          action: 'created',
          metadata: {
            issue_type: issue.type,
            initial_status: issue.status,
            priority: issue.priority
          }
        });
      } catch (activityError) {
        // Log error but don't fail the request
        fastify.log.error('Failed to log activity:', activityError);
      }

      return reply.status(201).send(issue);
    } catch (error) {
      fastify.log.error('Failed to create issue:', error);
      return reply.status(500).send({ error: 'Failed to create issue' });
    }
  });

  // PATCH /api/tracker/worktrees/:worktreeId/boards/:boardId/issues/:id - Update issue
  fastify.patch<{
    Params: { worktreeId: string; boardId: string; id: string };
    Body: IssueUpdateRequest;
  }>('/:id', async (request, reply) => {
    try {
      // Get old issue first for change detection
      const oldIssue = getIssue(
        request.params.worktreeId,
        request.params.boardId,
        request.params.id
      );

      const issue = updateIssue(
        request.params.worktreeId,
        request.params.boardId,
        request.params.id,
        request.body
      );
      if (!issue) {
        return reply.status(404).send({ error: 'Issue not found' });
      }

      // Log activity for changes
      try {
        if (oldIssue) {
          // Log status change
          if (request.body.status && request.body.status !== oldIssue.status) {
            logActivity(request.params.worktreeId, issue.id, {
              issue_id: issue.id,
              actor: { id: 'system', name: 'System' },
              action: 'status_changed',
              changes: [{
                field: 'status',
                old_value: oldIssue.status,
                new_value: request.body.status
              }]
            });
          }

          // Log assignee change
          if (request.body.assignee !== undefined &&
              JSON.stringify(request.body.assignee) !== JSON.stringify(oldIssue.assignee)) {
            logActivity(request.params.worktreeId, issue.id, {
              issue_id: issue.id,
              actor: { id: 'system', name: 'System' },
              action: 'assigned',
              changes: [{
                field: 'assignee',
                old_value: oldIssue.assignee,
                new_value: request.body.assignee
              }]
            });
          }

          // Log other field changes
          const fieldsToTrack = ['priority', 'title', 'description'] as const;
          const changes = fieldsToTrack
            .filter(field => request.body[field] !== undefined && request.body[field] !== oldIssue[field])
            .map(field => ({
              field,
              old_value: oldIssue[field],
              new_value: request.body[field]
            }));

          if (changes.length > 0) {
            logActivity(request.params.worktreeId, issue.id, {
              issue_id: issue.id,
              actor: { id: 'system', name: 'System' },
              action: 'updated',
              changes
            });
          }
        }
      } catch (activityError) {
        // Log error but don't fail the request
        fastify.log.error('Failed to log activity:', activityError);
      }

      return reply.send(issue);
    } catch (error) {
      fastify.log.error('Failed to update issue:', error);
      return reply.status(500).send({ error: 'Failed to update issue' });
    }
  });

  // DELETE /api/tracker/worktrees/:worktreeId/boards/:boardId/issues/:id - Delete issue
  fastify.delete<{
    Params: { worktreeId: string; boardId: string; id: string };
  }>('/:id', async (request, reply) => {
    try {
      const deleted = deleteIssue(
        request.params.worktreeId,
        request.params.boardId,
        request.params.id
      );
      if (!deleted) {
        return reply.status(404).send({ error: 'Issue not found' });
      }
      return reply.status(204).send();
    } catch (error) {
      fastify.log.error('Failed to delete issue:', error);
      return reply.status(500).send({ error: 'Failed to delete issue' });
    }
  });

  // POST /api/tracker/worktrees/:worktreeId/boards/:boardId/issues/:id/move - Move issue
  fastify.post<{
    Params: { worktreeId: string; boardId: string; id: string };
    Body: { status: string; index?: number };
  }>('/:id/move', async (request, reply) => {
    try {
      const issue = updateIssue(
        request.params.worktreeId,
        request.params.boardId,
        request.params.id,
        { status: request.body.status }
      );
      if (!issue) {
        return reply.status(404).send({ error: 'Issue not found' });
      }
      return reply.send(issue);
    } catch (error) {
      fastify.log.error('Failed to move issue:', error);
      return reply.status(500).send({ error: 'Failed to move issue' });
    }
  });

  // POST /api/tracker/worktrees/:worktreeId/boards/:boardId/issues/:id/dependencies - Add dependency
  fastify.post<{
    Params: { worktreeId: string; boardId: string; id: string };
    Body: { target_issue_id: string; type: 'blocks' | 'blocked_by' | 'related' };
  }>('/:id/dependencies', async (request, reply) => {
    try {
      const { target_issue_id, type } = request.body;

      if (!target_issue_id || !type) {
        return reply.status(400).send({
          error: 'Missing required fields: target_issue_id, type'
        });
      }

      const result = addDependency(
        request.params.worktreeId,
        request.params.id,
        target_issue_id,
        type
      );

      if (!result.success) {
        return reply.status(400).send({ error: result.error });
      }

      // Return updated dependencies
      const dependencies = getDependencies(request.params.worktreeId, request.params.id);
      return reply.status(201).send(dependencies);
    } catch (error) {
      fastify.log.error('Failed to add dependency:', error);
      return reply.status(500).send({ error: 'Failed to add dependency' });
    }
  });

  // DELETE /api/tracker/worktrees/:worktreeId/boards/:boardId/issues/:id/dependencies/:dependencyId - Remove dependency
  fastify.delete<{
    Params: { worktreeId: string; boardId: string; id: string; dependencyId: string };
    Querystring: { type: 'blocks' | 'blocked_by' | 'related' };
  }>('/:id/dependencies/:dependencyId', async (request, reply) => {
    try {
      const { type } = request.query;

      if (!type) {
        return reply.status(400).send({
          error: 'Missing required query parameter: type'
        });
      }

      const removed = removeDependency(
        request.params.worktreeId,
        request.params.id,
        request.params.dependencyId,
        type
      );

      if (!removed) {
        return reply.status(404).send({ error: 'Dependency not found' });
      }

      return reply.status(204).send();
    } catch (error) {
      fastify.log.error('Failed to remove dependency:', error);
      return reply.status(500).send({ error: 'Failed to remove dependency' });
    }
  });

  // POST /api/tracker/worktrees/:worktreeId/boards/:boardId/issues/:id/watchers - Add watcher
  fastify.post<{
    Params: { worktreeId: string; boardId: string; id: string };
    Body: { user_id: string };
  }>('/:id/watchers', async (request, reply) => {
    try {
      const { user_id } = request.body;

      if (!user_id) {
        return reply.status(400).send({ error: 'Missing required field: user_id' });
      }

      const issue = getIssue(
        request.params.worktreeId,
        request.params.boardId,
        request.params.id
      );

      if (!issue) {
        return reply.status(404).send({ error: 'Issue not found' });
      }

      // Add watcher if not already present
      if (!issue.watchers.includes(user_id)) {
        issue.watchers.push(user_id);

        // Update issue
        const updated = updateIssue(
          request.params.worktreeId,
          request.params.boardId,
          request.params.id,
          { watchers: issue.watchers }
        );

        if (!updated) {
          return reply.status(500).send({ error: 'Failed to update issue' });
        }
      }

      return reply.status(201).send({ watchers: issue.watchers });
    } catch (error) {
      fastify.log.error('Failed to add watcher:', error);
      return reply.status(500).send({ error: 'Failed to add watcher' });
    }
  });

  // DELETE /api/tracker/worktrees/:worktreeId/boards/:boardId/issues/:id/watchers/:userId - Remove watcher
  fastify.delete<{
    Params: { worktreeId: string; boardId: string; id: string; userId: string };
  }>('/:id/watchers/:userId', async (request, reply) => {
    try {
      const issue = getIssue(
        request.params.worktreeId,
        request.params.boardId,
        request.params.id
      );

      if (!issue) {
        return reply.status(404).send({ error: 'Issue not found' });
      }

      // Remove watcher
      const watcherIndex = issue.watchers.indexOf(request.params.userId);
      if (watcherIndex === -1) {
        return reply.status(404).send({ error: 'Watcher not found' });
      }

      issue.watchers.splice(watcherIndex, 1);

      // Update issue
      const updated = updateIssue(
        request.params.worktreeId,
        request.params.boardId,
        request.params.id,
        { watchers: issue.watchers }
      );

      if (!updated) {
        return reply.status(500).send({ error: 'Failed to update issue' });
      }

      return reply.status(204).send();
    } catch (error) {
      fastify.log.error('Failed to remove watcher:', error);
      return reply.status(500).send({ error: 'Failed to remove watcher' });
    }
  });

  // POST /api/tracker/worktrees/:worktreeId/boards/:boardId/issues/:id/time-entries - Log time entry
  fastify.post<{
    Params: { worktreeId: string; boardId: string; id: string };
    Body: {
      user_id: string;
      user_name: string;
      hours: number;
      description: string;
      date?: string;
    };
  }>('/:id/time-entries', async (request, reply) => {
    try {
      const { user_id, user_name, hours, description, date } = request.body;

      if (!user_id || !user_name || hours === undefined || !description) {
        return reply.status(400).send({
          error: 'Missing required fields: user_id, user_name, hours, description'
        });
      }

      // Verify issue exists
      const issue = getIssue(
        request.params.worktreeId,
        request.params.boardId,
        request.params.id
      );

      if (!issue) {
        return reply.status(404).send({ error: 'Issue not found' });
      }

      // Log time entry
      const entry = logTimeEntry(
        request.params.worktreeId,
        request.params.id,
        user_id,
        user_name,
        hours,
        description,
        date
      );

      // Recalculate logged hours
      const totalHours = recalculateLoggedHours(request.params.worktreeId, request.params.id);

      // Update issue time tracking
      await updateIssue(
        request.params.worktreeId,
        request.params.boardId,
        request.params.id,
        {
          time_tracking: {
            estimated_hours: issue.time_tracking.estimated_hours,
            logged_hours: totalHours
          }
        }
      );

      return reply.status(201).send(entry);
    } catch (error) {
      fastify.log.error('Failed to log time entry:', error);
      return reply.status(500).send({ error: 'Failed to log time entry' });
    }
  });

  // GET /api/tracker/worktrees/:worktreeId/boards/:boardId/issues/:id/time-entries - Get time entries
  fastify.get<{
    Params: { worktreeId: string; boardId: string; id: string };
  }>('/:id/time-entries', async (request, reply) => {
    try {
      // Verify issue exists
      const issue = getIssue(
        request.params.worktreeId,
        request.params.boardId,
        request.params.id
      );

      if (!issue) {
        return reply.status(404).send({ error: 'Issue not found' });
      }

      const entries = getTimeEntries(request.params.worktreeId, request.params.id);
      return reply.send({ entries, count: entries.length });
    } catch (error) {
      fastify.log.error('Failed to get time entries:', error);
      return reply.status(500).send({ error: 'Failed to get time entries' });
    }
  });

  // DELETE /api/tracker/worktrees/:worktreeId/boards/:boardId/issues/:id/time-entries/:entryId - Delete time entry
  fastify.delete<{
    Params: { worktreeId: string; boardId: string; id: string; entryId: string };
  }>('/:id/time-entries/:entryId', async (request, reply) => {
    try {
      // Verify issue exists
      const issue = getIssue(
        request.params.worktreeId,
        request.params.boardId,
        request.params.id
      );

      if (!issue) {
        return reply.status(404).send({ error: 'Issue not found' });
      }

      const deleted = deleteTimeEntry(
        request.params.worktreeId,
        request.params.id,
        request.params.entryId
      );

      if (!deleted) {
        return reply.status(404).send({ error: 'Time entry not found' });
      }

      // Recalculate logged hours
      const totalHours = recalculateLoggedHours(request.params.worktreeId, request.params.id);

      // Update issue time tracking
      await updateIssue(
        request.params.worktreeId,
        request.params.boardId,
        request.params.id,
        {
          time_tracking: {
            estimated_hours: issue.time_tracking.estimated_hours,
            logged_hours: totalHours
          }
        }
      );

      return reply.status(204).send();
    } catch (error) {
      fastify.log.error('Failed to delete time entry:', error);
      return reply.status(500).send({ error: 'Failed to delete time entry' });
    }
  });

  // GET /api/tracker/worktrees/:worktreeId/boards/:boardId/issues/:id/engagement - Get engagement analytics
  fastify.get<{
    Params: { worktreeId: string; boardId: string; id: string };
  }>('/:id/engagement', async (request, reply) => {
    try {
      // Verify issue exists
      const issue = getIssue(
        request.params.worktreeId,
        request.params.boardId,
        request.params.id
      );

      if (!issue) {
        return reply.status(404).send({ error: 'Issue not found' });
      }

      // Get engagement data
      const engagement = getEngagement(request.params.worktreeId, request.params.id, 10);

      // Calculate average read time
      const average_read_time = engagement.views > 0
        ? Math.floor(engagement.total_read_time / engagement.views)
        : 0;

      // Transform view history to match frontend interface
      const recent_viewers = engagement.view_history.map(view => ({
        user_id: view.user_id,
        user_name: view.user_name,
        read_time: view.read_time,
        viewed_at: view.timestamp
      }));

      return reply.send({
        total_views: engagement.views,
        average_read_time,
        recent_viewers
      });
    } catch (error) {
      fastify.log.error('Failed to get engagement data:', error);
      return reply.status(500).send({ error: 'Failed to get engagement data' });
    }
  });

  // POST /api/tracker/worktrees/:worktreeId/boards/:boardId/issues/:id/engagement/record-view - Record view
  fastify.post<{
    Params: { worktreeId: string; boardId: string; id: string };
    Body: {
      user_id: string;
      user_name: string;
      read_time?: number;
      session_id?: string;
    };
  }>('/:id/engagement/record-view', async (request, reply) => {
    try {
      const { user_id, user_name, read_time, session_id } = request.body;

      if (!user_id || !user_name) {
        return reply.status(400).send({
          error: 'Missing required fields: user_id, user_name'
        });
      }

      // Verify issue exists
      const issue = getIssue(
        request.params.worktreeId,
        request.params.boardId,
        request.params.id
      );

      if (!issue) {
        return reply.status(404).send({ error: 'Issue not found' });
      }

      // Record view
      const viewEntry = recordView(
        request.params.worktreeId,
        request.params.id,
        user_id,
        user_name,
        read_time || 0,
        session_id
      );

      return reply.status(201).send(viewEntry);
    } catch (error) {
      fastify.log.error('Failed to record view:', error);
      return reply.status(500).send({ error: 'Failed to record view' });
    }
  });
};

/**
 * Fastify plugin for backward-compatible issues routes
 * Mounted at /api/tracker/issues
 * Maps to default worktree and attempts to find issue across all boards
 */
export const issuesRoutes: FastifyPluginAsync = async (fastify) => {
  const DEFAULT_WORKTREE = 'default';
  const DEFAULT_BOARD = 'default';

  // GET /api/tracker/issues - List issues (DEPRECATED)
  fastify.get<{
    Querystring: {
      status?: string;
      type?: string;
      parent_id?: string;
      assignee?: string;
    };
  }>('/', async (request, reply) => {
    try {
      const issues = listIssues(DEFAULT_WORKTREE, undefined, request.query);
      return reply.send({ issues, count: issues.length });
    } catch (error) {
      fastify.log.error('Failed to list issues:', error);
      return reply.status(500).send({ error: 'Failed to list issues' });
    }
  });

  // GET /api/tracker/issues/:id - Get single issue (DEPRECATED)
  fastify.get<{
    Params: { id: string };
  }>('/:id', async (request, reply) => {
    try {
      // Try default board first
      let issue = getIssue(DEFAULT_WORKTREE, DEFAULT_BOARD, request.params.id);

      // If not found, search across all boards in default worktree
      if (!issue) {
        const index = loadIndex(DEFAULT_WORKTREE);
        const entry = index.issues[request.params.id];
        if (entry) {
          issue = getIssue(DEFAULT_WORKTREE, entry.board_id, request.params.id);
        }
      }

      if (!issue) {
        return reply.status(404).send({ error: 'Issue not found' });
      }
      return reply.send(issue);
    } catch (error) {
      fastify.log.error('Failed to get issue:', error);
      return reply.status(500).send({ error: 'Failed to get issue' });
    }
  });

  // POST /api/tracker/issues - Create issue (DEPRECATED)
  fastify.post<{
    Body: IssueCreateRequest;
  }>('/', async (request, reply) => {
    try {
      const issue = createIssue(DEFAULT_WORKTREE, DEFAULT_BOARD, request.body);
      return reply.status(201).send(issue);
    } catch (error) {
      fastify.log.error('Failed to create issue:', error);
      return reply.status(500).send({ error: 'Failed to create issue' });
    }
  });

  // PATCH /api/tracker/issues/:id - Update issue (DEPRECATED)
  fastify.patch<{
    Params: { id: string };
    Body: IssueUpdateRequest;
  }>('/:id', async (request, reply) => {
    try {
      // Find the issue's board first
      const index = loadIndex(DEFAULT_WORKTREE);
      const entry = index.issues[request.params.id];
      const boardId = entry?.board_id || DEFAULT_BOARD;

      const issue = updateIssue(DEFAULT_WORKTREE, boardId, request.params.id, request.body);
      if (!issue) {
        return reply.status(404).send({ error: 'Issue not found' });
      }
      return reply.send(issue);
    } catch (error) {
      fastify.log.error('Failed to update issue:', error);
      return reply.status(500).send({ error: 'Failed to update issue' });
    }
  });

  // DELETE /api/tracker/issues/:id - Delete issue (DEPRECATED)
  fastify.delete<{
    Params: { id: string };
  }>('/:id', async (request, reply) => {
    try {
      // Find the issue's board first
      const index = loadIndex(DEFAULT_WORKTREE);
      const entry = index.issues[request.params.id];
      const boardId = entry?.board_id || DEFAULT_BOARD;

      const deleted = deleteIssue(DEFAULT_WORKTREE, boardId, request.params.id);
      if (!deleted) {
        return reply.status(404).send({ error: 'Issue not found' });
      }
      return reply.status(204).send();
    } catch (error) {
      fastify.log.error('Failed to delete issue:', error);
      return reply.status(500).send({ error: 'Failed to delete issue' });
    }
  });

  // POST /api/tracker/issues/:id/move - Move issue (DEPRECATED)
  fastify.post<{
    Params: { id: string };
    Body: { status: string; index?: number };
  }>('/:id/move', async (request, reply) => {
    try {
      // Find the issue's board first
      const index = loadIndex(DEFAULT_WORKTREE);
      const entry = index.issues[request.params.id];
      const boardId = entry?.board_id || DEFAULT_BOARD;

      const issue = updateIssue(DEFAULT_WORKTREE, boardId, request.params.id, {
        status: request.body.status,
      });
      if (!issue) {
        return reply.status(404).send({ error: 'Issue not found' });
      }
      return reply.send(issue);
    } catch (error) {
      fastify.log.error('Failed to move issue:', error);
      return reply.status(500).send({ error: 'Failed to move issue' });
    }
  });

  // GET /api/tracker/issues/:id/agents - Get agents working on issue (DEPRECATED)
  fastify.get<{
    Params: { id: string };
  }>('/:id/agents', async (request, reply) => {
    try {
      const sessions = listSessionsForIssue(request.params.id);
      return reply.send({ sessions, count: sessions.length });
    } catch (error) {
      fastify.log.error('Failed to get issue agents:', error);
      return reply.status(500).send({ error: 'Failed to get issue agents' });
    }
  });
};
