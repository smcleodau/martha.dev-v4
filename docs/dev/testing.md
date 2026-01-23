# Testing Guide

## Overview

Martha Tracker uses a comprehensive testing strategy:

- **Unit Tests:** Individual functions and components
- **Integration Tests:** API endpoints and services
- **E2E Tests:** Full user workflows
- **Visual Tests:** UI component snapshots

## Test Stack

- **Test Runner:** Jest (backend), Vitest (frontend)
- **Assertions:** Jest matchers
- **Mocking:** Jest mocks
- **React Testing:** React Testing Library
- **E2E:** Playwright
- **Coverage:** Istanbul

## Running Tests

```bash
# All tests
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage

# Specific file
npm test -- path/to/file.test.ts

# Frontend tests
cd dashboard
npm test
```

## Unit Tests

### Testing Services

```typescript
import { createIssue, getIssue } from '../services/issue-manager';
import { loadIndex } from '../services/index-manager';

describe('createIssue', () => {
  beforeEach(() => {
    // Setup test environment
    setupTestWorktree('test-worktree');
  });

  afterEach(() => {
    // Cleanup
    cleanupTestWorktree('test-worktree');
  });

  it('should create issue with unique ID', () => {
    const issue = createIssue('test-worktree', 'test-board', {
      title: 'Test Issue',
      type: 'task',
      status: 'backlog',
      priority: 'medium'
    });

    expect(issue.id).toMatch(/MTH-\d+/);
    expect(issue.title).toBe('Test Issue');
    expect(issue.type).toBe('task');
  });

  it('should add issue to index', () => {
    createIssue('test-worktree', 'test-board', {
      title: 'Test',
      type: 'task'
    });

    const index = loadIndex('test-worktree');
    const issueIds = Object.keys(index.issues);

    expect(issueIds).toHaveLength(1);
    expect(index.issues[issueIds[0]].title).toBe('Test');
  });

  it('should increment ID counter', () => {
    const issue1 = createIssue('test-worktree', 'test-board', {
      title: 'Issue 1',
      type: 'task'
    });

    const issue2 = createIssue('test-worktree', 'test-board', {
      title: 'Issue 2',
      type: 'task'
    });

    expect(issue2.id).not.toBe(issue1.id);
    expect(parseInt(issue2.id.split('-')[1])).toBeGreaterThan(
      parseInt(issue1.id.split('-')[1])
    );
  });

  it('should validate required fields', () => {
    expect(() => {
      createIssue('test-worktree', 'test-board', {
        // Missing title
        type: 'task'
      } as any);
    }).toThrow('Title is required');
  });
});
```

### Testing Components

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { IssueCard } from './IssueCard';

describe('IssueCard', () => {
  const mockIssue = {
    id: 'MTH-001',
    title: 'Test Issue',
    type: 'task',
    status: 'backlog',
    priority: 'high',
    assignee: null,
    labels: ['frontend'],
    ...
  };

  it('should render issue title', () => {
    render(<IssueCard issue={mockIssue} />);

    expect(screen.getByText('Test Issue')).toBeInTheDocument();
    expect(screen.getByText('MTH-001')).toBeInTheDocument();
  });

  it('should display priority indicator', () => {
    render(<IssueCard issue={mockIssue} />);

    const priorityBadge = screen.getByText(/high/i);
    expect(priorityBadge).toBeInTheDocument();
    expect(priorityBadge).toHaveClass('priority-high');
  });

  it('should call onClick when clicked', () => {
    const handleClick = jest.fn();

    render(
      <IssueCard issue={mockIssue} onClick={handleClick} />
    );

    fireEvent.click(screen.getByText('Test Issue'));

    expect(handleClick).toHaveBeenCalledWith('MTH-001');
  });

  it('should display labels', () => {
    render(<IssueCard issue={mockIssue} />);

    expect(screen.getByText('frontend')).toBeInTheDocument();
  });

  it('should show assignee if present', () => {
    const issueWithAssignee = {
      ...mockIssue,
      assignee: { id: 'user-1', name: 'Claude', avatar: '' }
    };

    render(<IssueCard issue={issueWithAssignee} />);

    expect(screen.getByText('Claude')).toBeInTheDocument();
  });
});
```

### Testing Hooks

```typescript
import { renderHook, act } from '@testing-library/react';
import { useIssueFilters } from './useIssueFilters';

describe('useIssueFilters', () => {
  it('should initialize with empty filters', () => {
    const { result } = renderHook(() => useIssueFilters());

    expect(result.current.filters).toEqual({
      searchText: '',
      types: [],
      priorities: [],
      statuses: []
    });
  });

  it('should update filters', () => {
    const { result } = renderHook(() => useIssueFilters());

    act(() => {
      result.current.setFilter('types', ['task']);
    });

    expect(result.current.filters.types).toEqual(['task']);
  });

  it('should filter issues', () => {
    const issues = [
      { id: 'MTH-001', type: 'task', status: 'backlog' },
      { id: 'MTH-002', type: 'bug', status: 'in_progress' },
      { id: 'MTH-003', type: 'task', status: 'done' }
    ];

    const { result } = renderHook(() => useIssueFilters());

    act(() => {
      result.current.setFilter('types', ['task']);
    });

    const filtered = result.current.filterIssues(issues);

    expect(filtered).toHaveLength(2);
    expect(filtered[0].id).toBe('MTH-001');
    expect(filtered[1].id).toBe('MTH-003');
  });
});
```

## Integration Tests

### Testing API Endpoints

```typescript
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../server/fastify';

describe('Issues API', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    setupTestWorktree('test-worktree');
  });

  afterEach(() => {
    cleanupTestWorktree('test-worktree');
  });

  describe('POST /api/tracker/worktrees/:id/boards/:id/issues', () => {
    it('should create issue and return 201', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/tracker/worktrees/test-worktree/boards/test-board/issues',
        payload: {
          title: 'New Issue',
          type: 'task',
          status: 'backlog',
          priority: 'medium'
        }
      });

      expect(response.statusCode).toBe(201);

      const issue = JSON.parse(response.body);
      expect(issue.id).toBeDefined();
      expect(issue.title).toBe('New Issue');
    });

    it('should return 400 for missing title', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/tracker/worktrees/test-worktree/boards/test-board/issues',
        payload: {
          type: 'task'
          // Missing title
        }
      });

      expect(response.statusCode).toBe(400);
      const error = JSON.parse(response.body);
      expect(error.error).toContain('title');
    });
  });

  describe('GET /api/tracker/worktrees/:id/boards/:id/issues', () => {
    beforeEach(() => {
      // Create test issues
      createTestIssue('test-worktree', 'test-board', {
        title: 'Task 1',
        type: 'task',
        status: 'backlog'
      });
      createTestIssue('test-worktree', 'test-board', {
        title: 'Bug 1',
        type: 'bug',
        status: 'in_progress'
      });
    });

    it('should list all issues', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/tracker/worktrees/test-worktree/boards/test-board/issues'
      });

      expect(response.statusCode).toBe(200);

      const data = JSON.parse(response.body);
      expect(data.issues).toHaveLength(2);
      expect(data.count).toBe(2);
    });

    it('should filter by type', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/tracker/worktrees/test-worktree/boards/test-board/issues?type=task'
      });

      expect(response.statusCode).toBe(200);

      const data = JSON.parse(response.body);
      expect(data.issues).toHaveLength(1);
      expect(data.issues[0].type).toBe('task');
    });

    it('should filter by status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/tracker/worktrees/test-worktree/boards/test-board/issues?status=in_progress'
      });

      expect(response.statusCode).toBe(200);

      const data = JSON.parse(response.body);
      expect(data.issues).toHaveLength(1);
      expect(data.issues[0].status).toBe('in_progress');
    });
  });

  describe('PATCH /api/tracker/worktrees/:id/boards/:id/issues/:id', () => {
    let issueId: string;

    beforeEach(() => {
      const issue = createTestIssue('test-worktree', 'test-board', {
        title: 'Original Title',
        type: 'task',
        status: 'backlog'
      });
      issueId = issue.id;
    });

    it('should update issue', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/tracker/worktrees/test-worktree/boards/test-board/issues/${issueId}`,
        payload: {
          title: 'Updated Title',
          status: 'in_progress'
        }
      });

      expect(response.statusCode).toBe(200);

      const updated = JSON.parse(response.body);
      expect(updated.title).toBe('Updated Title');
      expect(updated.status).toBe('in_progress');
    });

    it('should return 404 for non-existent issue', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/tracker/worktrees/test-worktree/boards/test-board/issues/MTH-999',
        payload: { title: 'Updated' }
      });

      expect(response.statusCode).toBe(404);
    });
  });
});
```

## E2E Tests

### Testing User Workflows

```typescript
import { test, expect } from '@playwright/test';

test.describe('Issue Creation Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tracker/test-worktree/test-board/kanban');
  });

  test('should create issue via UI', async ({ page }) => {
    // Click new issue button
    await page.click('[data-testid="new-issue-btn"]');

    // Fill in form
    await page.fill('[data-testid="issue-title"]', 'Test Issue');
    await page.selectOption('[data-testid="issue-type"]', 'task');
    await page.selectOption('[data-testid="issue-priority"]', 'high');

    // Submit
    await page.click('[data-testid="create-issue-btn"]');

    // Verify issue appears
    await expect(page.locator('.issue-card')).toContainText('Test Issue');
    await expect(page.locator('.issue-card')).toContainText('high');
  });

  test('should move issue via drag and drop', async ({ page }) => {
    // Create issue
    await createTestIssueViaAPI('Test Issue');

    // Drag from Backlog to In Progress
    const card = page.locator('.issue-card:has-text("Test Issue")');
    const target = page.locator('[data-column="in_progress"]');

    await card.dragTo(target);

    // Verify moved
    const inProgressColumn = page.locator('[data-column="in_progress"]');
    await expect(inProgressColumn).toContainText('Test Issue');
  });

  test('should open detail panel', async ({ page }) => {
    await createTestIssueViaAPI('Test Issue');

    // Click issue card
    await page.click('.issue-card:has-text("Test Issue")');

    // Verify detail panel opens
    await expect(page.locator('[data-testid="detail-panel"]')).toBeVisible();
    await expect(page.locator('[data-testid="detail-panel"]')).toContainText('Test Issue');
  });

  test('should add comment', async ({ page }) => {
    await createTestIssueViaAPI('Test Issue');

    // Open detail panel
    await page.click('.issue-card:has-text("Test Issue")');

    // Switch to comments tab
    await page.click('[data-tab="comments"]');

    // Add comment
    await page.fill('[data-testid="comment-input"]', 'Test comment');
    await page.click('[data-testid="add-comment-btn"]');

    // Verify comment appears
    await expect(page.locator('.comment')).toContainText('Test comment');
  });
});

test.describe('View Switching', () => {
  test('should switch between views', async ({ page }) => {
    await page.goto('/tracker/test-worktree/test-board/kanban');

    // Switch to list view
    await page.click('[data-view="list"]');
    await expect(page).toHaveURL(/\/list$/);
    await expect(page.locator('.issue-table')).toBeVisible();

    // Switch to timeline view
    await page.click('[data-view="timeline"]');
    await expect(page).toHaveURL(/\/timeline$/);
    await expect(page.locator('.timeline-view')).toBeVisible();

    // Switch to gantt view
    await page.click('[data-view="gantt"]');
    await expect(page).toHaveURL(/\/gantt$/);
    await expect(page.locator('.gantt-chart')).toBeVisible();
  });
});

test.describe('Filtering', () => {
  test('should filter by type', async ({ page }) => {
    await page.goto('/tracker/test-worktree/test-board/kanban');

    // Create issues of different types
    await createTestIssueViaAPI('Task 1', 'task');
    await createTestIssueViaAPI('Bug 1', 'bug');

    await page.reload();

    // Filter by task
    await page.selectOption('[data-filter="type"]', 'task');

    // Verify only tasks shown
    await expect(page.locator('.issue-card')).toHaveCount(1);
    await expect(page.locator('.issue-card')).toContainText('Task 1');
  });
});
```

## Best Practices

### 1. Test Behavior, Not Implementation

```typescript
// ❌ Bad: Tests implementation details
it('should call setState with value', () => {
  const setState = jest.fn();
  // Testing internal implementation
});

// ✅ Good: Tests behavior
it('should display updated value', () => {
  render(<Component />);
  fireEvent.click(screen.getByText('Update'));
  expect(screen.getByText('Updated')).toBeInTheDocument();
});
```

### 2. Use Descriptive Test Names

```typescript
// ❌ Bad
it('works', () => {});
it('test 1', () => {});

// ✅ Good
it('should create issue with unique ID', () => {});
it('should return 404 for non-existent issue', () => {});
it('should display error message when title is empty', () => {});
```

### 3. AAA Pattern

```typescript
it('should update issue status', () => {
  // Arrange
  const issue = createTestIssue();

  // Act
  const updated = updateIssue(issue.id, { status: 'done' });

  // Assert
  expect(updated.status).toBe('done');
});
```

### 4. Test Edge Cases

```typescript
describe('createIssue', () => {
  it('should handle empty title', () => {});
  it('should handle very long title', () => {});
  it('should handle special characters', () => {});
  it('should handle invalid type', () => {});
  it('should handle missing worktree', () => {});
});
```

### 5. Use Test Helpers

```typescript
// test/helpers.ts
export function createTestIssue(overrides = {}) {
  return {
    id: 'MTH-001',
    title: 'Test',
    type: 'task',
    status: 'backlog',
    priority: 'medium',
    ...overrides
  };
}

export function setupTestWorktree(id: string) {
  // Setup test environment
}

export function cleanupTestWorktree(id: string) {
  // Cleanup
}

// In tests
const issue = createTestIssue({ title: 'Custom' });
```

### 6. Mock External Dependencies

```typescript
// Mock file system
jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
  writeFile: jest.fn(),
  mkdir: jest.fn()
}));

// Mock API calls
jest.mock('../api/tracker', () => ({
  createIssue: jest.fn().mockResolvedValue({ id: 'MTH-001' })
}));
```

### 7. Test Async Code Properly

```typescript
it('should load issues', async () => {
  const promise = loadIssues();

  await expect(promise).resolves.toHaveLength(3);
});

it('should handle errors', async () => {
  const promise = loadIssues();

  await expect(promise).rejects.toThrow('Not found');
});
```

## Coverage Goals

```
Overall:       80%+
Services:      90%+
Components:    80%+
Routes:        90%+
Critical Path: 100%
```

## Continuous Integration

Tests run automatically on:
- Every push
- Every pull request
- Before merge
- Nightly (full suite)

## Next Steps

- **[Architecture](./architecture.md)** - System design
- **[Contributing](./contributing.md)** - How to contribute
- **[Performance](./performance.md)** - Optimization

---

**Last Updated:** 2026-01-18
