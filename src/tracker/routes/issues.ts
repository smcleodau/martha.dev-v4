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
      estimated_hours: null,
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

  // Sort by updated_at descending
  return issues.sort((a, b) => {
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
      const issue = updateIssue(
        request.params.worktreeId,
        request.params.boardId,
        request.params.id,
        request.body
      );
      if (!issue) {
        return reply.status(404).send({ error: 'Issue not found' });
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
