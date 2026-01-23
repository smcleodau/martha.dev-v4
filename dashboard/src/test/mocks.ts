/**
 * Mock Data Generators for Tests
 * Provides factory functions to generate test data
 */

import { Issue, Board, WorktreeConfig, BoardColumn } from '../api/tracker';

/**
 * Generate a mock issue with default values
 */
export function createMockIssue(overrides: Partial<Issue> = {}): Issue {
  const defaults: Issue = {
    id: 'TEST-1',
    worktree_id: 'test-worktree',
    board_id: 'test-board',
    type: 'task',
    title: 'Test Issue',
    description: 'Test issue description',
    status: 'todo',
    priority: 'medium',
    parent_id: null,
    assignee: {
      id: 'user-1',
      name: 'Test User',
      avatar: '/avatars/test.png',
    },
    labels: ['test'],
    quality: {
      coverage: 0,
      checklist: [],
    },
    time_tracking: {
      estimated_hours: null,
      logged_hours: 0,
    },
    documentation: {
      overview: null,
      technical_spec: null,
      related_docs: [],
    },
    links: {
      pr: null,
      related_issues: [],
      external: [],
    },
    metadata: {
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      version: 1,
    },
    initiative_id: null,
    team_ids: [],
    story_points: null,
    epic_id: null,
    release_id: null,
    start_date: null,
    due_date: null,
    estimated_duration: null,
    dependencies: {
      blocks: [],
      blocked_by: [],
      related: [],
    },
    watchers: [],
  };

  return { ...defaults, ...overrides };
}

/**
 * Generate multiple mock issues
 */
export function createMockIssues(count: number, overrides: Partial<Issue> = {}): Issue[] {
  return Array.from({ length: count }, (_, i) =>
    createMockIssue({
      id: `TEST-${i + 1}`,
      title: `Test Issue ${i + 1}`,
      ...overrides,
    })
  );
}

/**
 * Generate a mock board column
 */
export function createMockColumn(overrides: Partial<BoardColumn> = {}): BoardColumn {
  const defaults: BoardColumn = {
    id: 'todo',
    name: 'To Do',
    color: '#E8E0D5',
    wip_limit: null,
    issue_ids: [],
  };

  return { ...defaults, ...overrides };
}

/**
 * Generate a mock board with columns
 */
export function createMockBoard(overrides: Partial<Board> = {}): Board {
  const defaults: Board = {
    id: 'test-board',
    worktree_id: 'test-worktree',
    name: 'Test Board',
    description: 'Test board description',
    version: 1,
    sprint: null,
    columns: [
      createMockColumn({ id: 'todo', name: 'To Do' }),
      createMockColumn({ id: 'in_progress', name: 'In Progress' }),
      createMockColumn({ id: 'done', name: 'Done' }),
    ],
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  return { ...defaults, ...overrides };
}

/**
 * Generate a mock worktree
 */
export function createMockWorktree(overrides: Partial<WorktreeConfig> = {}): WorktreeConfig {
  const defaults: WorktreeConfig = {
    id: 'test-worktree',
    name: 'test-worktree',
    display_name: 'Test Worktree',
    description: 'Test worktree description',
    path: '/path/to/worktree',
    github_repo: 'user/repo',
    boards: ['test-board'],
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  return { ...defaults, ...overrides };
}

/**
 * Create a mock epic with child issues
 */
export function createMockEpic(childCount: number = 3): Issue[] {
  const epic = createMockIssue({
    id: 'EPIC-1',
    type: 'epic',
    title: 'Epic: Test Epic',
  });

  const children = Array.from({ length: childCount }, (_, i) =>
    createMockIssue({
      id: `STORY-${i + 1}`,
      type: 'story',
      title: `Story ${i + 1}`,
      parent_id: epic.id,
    })
  );

  return [epic, ...children];
}

/**
 * Create issues grouped by status for Kanban board
 */
export function createKanbanIssues() {
  return {
    todo: createMockIssues(3, { status: 'todo' }),
    in_progress: createMockIssues(2, { status: 'in_progress' }),
    done: createMockIssues(5, { status: 'done' }),
  };
}
