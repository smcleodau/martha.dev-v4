/**
 * Issues Routes
 * Handles CRUD operations for tracker issues
 * Ported from martha-workflow/tracker/api/routes/issues.py
 */

import { FastifyPluginAsync } from 'fastify';
import * as path from 'node:path';
import {
  loadIndex,
  saveIndex,
  addToIndex,
  updateIndex,
  removeFromIndex,
  getNextIssueId,
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
  getTrackerPath,
  deleteFile,
  fileExists,
} from '../services/file-storage.js';
import { listSessionsForIssue } from '../services/agent-manager.js';
import type { Issue, Assignee } from '../types.js';

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
}

interface IssueUpdateRequest {
  title?: string;
  type?: 'epic' | 'story' | 'task' | 'bug';
  status?: string;
  description?: string;
  labels?: string[];
  priority?: 'critical' | 'high' | 'medium' | 'low';
  assignee?: Assignee | null;
}

interface IssueMoveRequest {
  status: string;
}

/**
 * Get issue file path
 */
function getIssuePath(issueId: string): string {
  return getTrackerPath('issues', `${issueId}.json`);
}

/**
 * Create new issue
 */
function createIssue(data: IssueCreateRequest): Issue {
  const index = loadIndex();
  const board = loadBoard();

  const issueId = getNextIssueId(index);
  const now = new Date().toISOString();

  const issue: Issue = {
    id: issueId,
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
      estimated_hours: null,
      logged_hours: 0,
    },
    links: {
      pr: null,
      related_issues: [],
      external: [],
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
  };

  // Save issue file
  const issuePath = getIssuePath(issueId);
  writeJsonSync(issuePath, issue);

  // Update index
  addToIndex(index, issue);
  saveIndex(index);

  // Add to board
  addToBoard(board, issueId, issue.status);
  saveBoard(board);

  return issue;
}

/**
 * Get issue by ID
 */
function getIssue(issueId: string): Issue | null {
  const issuePath = getIssuePath(issueId);
  if (!fileExists(issuePath)) {
    return null;
  }
  return readJsonSync<Issue>(issuePath);
}

/**
 * Update issue
 */
function updateIssue(issueId: string, data: IssueUpdateRequest): Issue | null {
  const issue = getIssue(issueId);
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

  // Update metadata
  issue.metadata.updated_at = new Date().toISOString();
  issue.metadata.version++;
  issue.github_sync.dirty = true;

  // Save issue file
  const issuePath = getIssuePath(issueId);
  writeJsonSync(issuePath, issue);

  // Update index
  const index = loadIndex();
  updateIndex(index, oldIssue, issue);
  saveIndex(index);

  // Update board if status changed
  if (data.status && oldStatus !== issue.status) {
    const board = loadBoard();
    moveOnBoard(board, issueId, oldStatus, issue.status);
    saveBoard(board);
  }

  return issue;
}

/**
 * Delete issue
 */
function deleteIssue(issueId: string): boolean {
  const issue = getIssue(issueId);
  if (!issue) return false;

  // Delete issue file
  const issuePath = getIssuePath(issueId);
  deleteFile(issuePath);

  // Remove from index
  const index = loadIndex();
  removeFromIndex(index, issue);
  saveIndex(index);

  // Remove from board
  const board = loadBoard();
  removeFromBoard(board, issueId, issue.status);
  saveBoard(board);

  return true;
}

/**
 * List issues with optional filters
 */
function listIssues(filters?: {
  status?: string;
  type?: string;
  parent_id?: string;
  assignee?: string;
}): Issue[] {
  const index = loadIndex();
  let issueIds = Object.keys(index.issues);

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
    .map((id) => getIssue(id))
    .filter((issue): issue is Issue => issue !== null);

  // Filter by assignee if needed (requires full issue data)
  if (filters?.assignee) {
    return issues.filter((issue) => issue.assignee?.id === filters.assignee);
  }

  // Sort by updated_at descending
  // Handle both old Python format (updated_at at top level) and new TS format (metadata.updated_at)
  return issues.sort((a, b) => {
    const aUpdated = (a.metadata?.updated_at || (a as any).updated_at) as string;
    const bUpdated = (b.metadata?.updated_at || (b as any).updated_at) as string;
    return new Date(bUpdated).getTime() - new Date(aUpdated).getTime();
  });
}

/**
 * Fastify plugin for issues routes
 */
export const issuesRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/tracker/issues - List issues
  fastify.get<{
    Querystring: {
      status?: string;
      type?: string;
      parent_id?: string;
      assignee?: string;
    };
  }>('/', async (request, reply) => {
    try {
      const issues = listIssues(request.query);
      return reply.send({ issues, count: issues.length });
    } catch (error) {
      fastify.log.error('Failed to list issues:', error);
      return reply.status(500).send({ error: 'Failed to list issues' });
    }
  });

  // GET /api/tracker/issues/:id - Get single issue
  fastify.get<{
    Params: { id: string };
  }>('/:id', async (request, reply) => {
    try {
      const issue = getIssue(request.params.id);
      if (!issue) {
        return reply.status(404).send({ error: 'Issue not found' });
      }
      return reply.send(issue);
    } catch (error) {
      fastify.log.error('Failed to get issue:', error);
      return reply.status(500).send({ error: 'Failed to get issue' });
    }
  });

  // POST /api/tracker/issues - Create issue
  fastify.post<{
    Body: IssueCreateRequest;
  }>('/', async (request, reply) => {
    try {
      const issue = createIssue(request.body);
      return reply.status(201).send(issue);
    } catch (error) {
      fastify.log.error('Failed to create issue:', error);
      return reply.status(500).send({ error: 'Failed to create issue' });
    }
  });

  // PATCH /api/tracker/issues/:id - Update issue
  fastify.patch<{
    Params: { id: string };
    Body: IssueUpdateRequest;
  }>('/:id', async (request, reply) => {
    try {
      const issue = updateIssue(request.params.id, request.body);
      if (!issue) {
        return reply.status(404).send({ error: 'Issue not found' });
      }
      return reply.send(issue);
    } catch (error) {
      fastify.log.error('Failed to update issue:', error);
      return reply.status(500).send({ error: 'Failed to update issue' });
    }
  });

  // PATCH /api/tracker/issues/:id/status - Move issue to different status
  fastify.patch<{
    Params: { id: string };
    Body: IssueMoveRequest;
  }>('/:id/status', async (request, reply) => {
    try {
      const issue = updateIssue(request.params.id, { status: request.body.status });
      if (!issue) {
        return reply.status(404).send({ error: 'Issue not found' });
      }
      return reply.send(issue);
    } catch (error) {
      fastify.log.error('Failed to move issue:', error);
      return reply.status(500).send({ error: 'Failed to move issue' });
    }
  });

  // DELETE /api/tracker/issues/:id - Delete issue
  fastify.delete<{
    Params: { id: string };
  }>('/:id', async (request, reply) => {
    try {
      const deleted = deleteIssue(request.params.id);
      if (!deleted) {
        return reply.status(404).send({ error: 'Issue not found' });
      }
      return reply.status(204).send();
    } catch (error) {
      fastify.log.error('Failed to delete issue:', error);
      return reply.status(500).send({ error: 'Failed to delete issue' });
    }
  });

  // POST /api/tracker/issues/:id/move - Move issue (for board drag-drop)
  fastify.post<{
    Params: { id: string };
    Body: { status: string; index?: number };
  }>('/:id/move', async (request, reply) => {
    try {
      const issue = updateIssue(request.params.id, { status: request.body.status });
      if (!issue) {
        return reply.status(404).send({ error: 'Issue not found' });
      }
      return reply.send(issue);
    } catch (error) {
      fastify.log.error('Failed to move issue:', error);
      return reply.status(500).send({ error: 'Failed to move issue' });
    }
  });

  // GET /api/tracker/issues/:id/agents - Get agents working on issue
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
