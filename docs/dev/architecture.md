# Martha Tracker Architecture

## System Overview

Martha Tracker is a full-stack issue tracking system built with:

- **Backend:** Node.js + TypeScript + Fastify
- **Frontend:** React 18 + TypeScript + Vite
- **Storage:** File-based JSON with indexing
- **Real-time:** WebSocket for live updates
- **API:** RESTful JSON API

## Architecture Diagram

```
┌─────────────────────────────────────────────────────┐
│                   CLIENT LAYER                      │
├─────────────────────────────────────────────────────┤
│  React Dashboard (Port 20000)                       │
│  ├─ Pages (TrackerPage, Overview, etc.)            │
│  ├─ Components (Kanban, List, Timeline, Gantt)     │
│  ├─ API Client (axios)                             │
│  └─ State Management (React hooks + context)       │
└──────────────────┬──────────────────────────────────┘
                   │ HTTPS/WSS
┌──────────────────▼──────────────────────────────────┐
│                   SERVER LAYER                      │
├─────────────────────────────────────────────────────┤
│  Fastify Server (Port 20000)                        │
│  ├─ Routes                                          │
│  │  ├─ /api/tracker/worktrees                      │
│  │  ├─ /api/tracker/worktrees/:id/boards           │
│  │  ├─ /api/tracker/worktrees/:id/boards/:id/issues│
│  │  ├─ /api/tracker/worktrees/:id/initiatives      │
│  │  ├─ /api/tracker/worktrees/:id/teams            │
│  │  └─ /api/tracker/worktrees/:id/releases         │
│  ├─ Services                                        │
│  │  ├─ board-manager.ts                            │
│  │  ├─ index-manager.ts                            │
│  │  ├─ file-storage.ts                             │
│  │  ├─ activity-manager.ts                         │
│  │  ├─ comment-manager.ts                          │
│  │  ├─ dependency-manager.ts                       │
│  │  ├─ time-entry-manager.ts                       │
│  │  ├─ initiative-manager.ts                       │
│  │  ├─ team-manager.ts                             │
│  │  └─ release-manager.ts                          │
│  └─ Types (types.ts)                               │
└──────────────────┬──────────────────────────────────┘
                   │ File I/O
┌──────────────────▼──────────────────────────────────┐
│                 STORAGE LAYER                       │
├─────────────────────────────────────────────────────┤
│  File System (.tracker directory)                   │
│  ├─ worktrees/                                      │
│  │  └─ {worktree-id}/                              │
│  │     ├─ index.json        (Issue index)          │
│  │     ├─ boards/                                   │
│  │     │  └─ {board-id}.json  (Board state)        │
│  │     ├─ issues/                                   │
│  │     │  └─ {board-id}/                           │
│  │     │     └─ {issue-id}.json                    │
│  │     ├─ initiatives/                              │
│  │     │  └─ {initiative-id}.json                  │
│  │     ├─ teams/                                    │
│  │     │  └─ {team-id}.json                        │
│  │     ├─ releases/                                 │
│  │     │  └─ {release-id}.json                     │
│  │     ├─ activity/                                 │
│  │     │  └─ {issue-id}.json                       │
│  │     ├─ comments/                                 │
│  │     │  └─ {issue-id}.json                       │
│  │     ├─ time-entries/                             │
│  │     │  └─ {issue-id}.json                       │
│  │     └─ documentation/                            │
│  │        └─ {doc-id}.json                         │
│  └─ config.json           (Global config)          │
└─────────────────────────────────────────────────────┘
```

## Core Concepts

### 1. Hierarchical Routing

API routes follow a hierarchy:

```
/api/tracker/
  worktrees/:worktreeId/
    boards/:boardId/
      issues/:issueId
```

This ensures:
- Clear ownership (which worktree/board owns an issue)
- Easy filtering (get all issues for a board)
- Logical organization

### 2. Index-Based Queries

The `index.json` provides fast lookups:

```typescript
{
  "worktree_id": "martha-dev-v4",
  "count": 42,
  "next_id": 43,
  "issues": {
    "MTH-001": {
      "id": "MTH-001",
      "title": "...",
      "type": "epic",
      "status": "in_progress",
      "board_id": "phase1",
      ...
    }
  },
  "by_status": {
    "in_progress": ["MTH-001", "MTH-003"],
    "done": ["MTH-002", "MTH-004"]
  },
  "by_board": {
    "phase1": ["MTH-001", "MTH-002"],
    "phase2": ["MTH-003", "MTH-004"]
  }
}
```

Benefits:
- Fast filtered queries without loading all files
- Track issue counts
- Maintain relationships (by_parent, by_epic, etc.)

### 3. File-Per-Issue Storage

Each issue is a separate JSON file:

```
.tracker/worktrees/martha-dev-v4/issues/phase1/MTH-001.json
```

Benefits:
- Easy to version control
- No database overhead
- Simple backup/restore
- Human-readable
- Git-friendly (merge conflicts rare)

Drawbacks:
- Not suitable for 100,000+ issues
- Need file system performance
- Index updates required

### 4. Service Layer Pattern

Services encapsulate business logic:

```typescript
// Service function
export function createIssue(
  worktreeId: string,
  boardId: string,
  data: IssueCreateRequest
): Issue {
  // Load index
  const index = loadIndex(worktreeId);

  // Create issue
  const issue: Issue = {
    id: getNextIssueId(index),
    ...
  };

  // Save issue file
  writeJsonSync(getIssuePath(...), issue);

  // Update index
  addToIndex(index, issue);
  saveIndex(worktreeId, index);

  // Update board
  const board = loadBoard(worktreeId, boardId);
  addToBoard(board, issue.id, issue.status);
  saveBoard(worktreeId, boardId, board);

  return issue;
}
```

Services handle:
- Data validation
- File I/O
- Index updates
- Board updates
- Activity logging

### 5. Type Safety

TypeScript types ensure correctness:

```typescript
export interface Issue {
  id: string;
  worktree_id: string;
  board_id: string;
  type: "epic" | "story" | "task" | "bug";
  status: string;
  priority: "critical" | "high" | "medium" | "low";
  ...
}
```

Compile-time checking prevents runtime errors.

## Data Flow

### Creating an Issue

```
1. Client: POST /api/tracker/worktrees/x/boards/y/issues
   ↓
2. Route Handler: Parse request, validate
   ↓
3. createIssue() Service:
   a. Load index
   b. Generate new ID (MTH-043)
   c. Create issue object
   d. Save issue file
   e. Update index (add to by_status, by_type, etc.)
   f. Update board (add to column)
   g. Log activity
   ↓
4. Return issue to client
   ↓
5. Client: Update UI, show new issue
```

### Moving an Issue

```
1. Client: Drag card from "Todo" to "In Progress"
   ↓
2. Client: POST /api/tracker/.../issues/MTH-001/move
           { status: "in_progress" }
   ↓
3. Route Handler: Call updateIssue()
   ↓
4. updateIssue() Service:
   a. Load issue file
   b. Change issue.status
   c. Update issue.metadata.updated_at
   d. Save issue file
   e. Update index (move between by_status buckets)
   f. Update board (move between columns)
   g. Log activity
   ↓
5. Return updated issue
   ↓
6. Client: Update UI
```

### Querying Issues

```
1. Client: GET /api/tracker/.../issues?status=in_progress&type=task
   ↓
2. Route Handler: Parse query params
   ↓
3. listIssues() Service:
   a. Load index
   b. Filter by board (if specified)
   c. Filter by status (use by_status index)
   d. Filter by type (use by_type index)
   e. Load full issue files for matches
   f. Apply additional filters (assignee, etc.)
   g. Sort by updated_at
   ↓
4. Return issue array
   ↓
5. Client: Render in current view
```

## Frontend Architecture

### Component Structure

```
src/
├─ pages/
│  ├─ TrackerPage.tsx         (Main page, routing)
│  ├─ OverviewPage.tsx
│  └─ ...
├─ components/
│  └─ tracker/
│     ├─ board/               (Kanban components)
│     │  ├─ KanbanBoard.tsx
│     │  ├─ KanbanColumn.tsx
│     │  ├─ IssueCard.tsx
│     │  ├─ ListView.tsx
│     │  ├─ TimelineView.tsx
│     │  └─ GanttView.tsx
│     ├─ list/                (List view components)
│     │  ├─ IssueTable.tsx
│     │  ├─ TableRow.tsx
│     │  └─ cells/
│     ├─ timeline/            (Timeline components)
│     │  ├─ TimelineEvent.tsx
│     │  └─ ...
│     ├─ gantt/               (Gantt components)
│     │  ├─ GanttChart.tsx
│     │  ├─ GanttTask.tsx
│     │  └─ DependencyLines.tsx
│     ├─ detail/              (Detail panel)
│     │  ├─ IssueDetailPanel.tsx
│     │  ├─ TimeTracking.tsx
│     │  ├─ DependenciesPanel.tsx
│     │  └─ ...
│     ├─ shared/              (Shared components)
│     │  ├─ FilterBar.tsx
│     │  ├─ StatisticsBar.tsx
│     │  └─ ...
│     └─ navigation/          (Navigation)
│        ├─ TrackerSidebar.tsx
│        └─ ViewSwitcher.tsx
├─ api/
│  └─ tracker.ts              (API client)
├─ contexts/
│  └─ PreferencesContext.tsx  (User preferences)
└─ utils/
   └─ preferences.ts          (Preference helpers)
```

### State Management

React hooks + context (no Redux):

```typescript
// Page-level state
const [issues, setIssues] = useState<Record<string, Issue>>({});
const [selectedIssue, setSelectedIssue] = useState<string | null>(null);
const [filters, setFilters] = useState<FilterState>({...});

// Context for cross-cutting concerns
const { getViewPreference, setViewPreference } = usePreferences();
```

### URL Routing

Deep linking for all states:

```
/tracker/:worktreeId/:boardId/:view/:issueId?

Examples:
/tracker/martha-dev-v4/phase1/kanban
/tracker/martha-dev-v4/phase1/list?status=in_progress
/tracker/martha-dev-v4/phase1/timeline/MTH-001
```

Benefits:
- Bookmarkable
- Shareable
- Browser back/forward works
- Preserves context

## Performance Optimizations

### 1. Virtual Scrolling (List View)

For large datasets:

```typescript
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={800}
  itemCount={issues.length}
  itemSize={48}
>
  {({ index, style }) => (
    <TableRow issue={issues[index]} style={style} />
  )}
</FixedSizeList>
```

Only renders visible rows.

### 2. Memoization

Prevent unnecessary re-renders:

```typescript
const filteredIssues = useMemo(
  () => filterIssues(issues, filters),
  [issues, filters]
);

const sortedIssues = useMemo(
  () => sortIssues(filteredIssues, sortKey),
  [filteredIssues, sortKey]
);
```

### 3. Debounced Search

Don't filter on every keystroke:

```typescript
const debouncedSearch = useDebouncedValue(searchText, 300);

useEffect(() => {
  // Filter with debounced value
}, [debouncedSearch]);
```

### 4. Lazy Loading

Load data as needed:

```typescript
// Load board on mount
useEffect(() => {
  loadBoardData(worktreeId, boardId);
}, [worktreeId, boardId]);

// Load detail panel data on open
useEffect(() => {
  if (selectedIssue) {
    loadComments(selectedIssue);
    loadActivity(selectedIssue);
    loadTimeEntries(selectedIssue);
  }
}, [selectedIssue]);
```

### 5. Index Queries

Use index for fast filtering:

```typescript
// Fast (uses index)
const inProgressIssues = index.by_status['in_progress'];

// Slow (loads all files)
const inProgressIssues = allIssues.filter(i => i.status === 'in_progress');
```

## Scalability Considerations

### Current Limits

Suitable for:
- Up to 10,000 issues per worktree
- Up to 50 concurrent users
- File system with SSD

### Future Improvements

For larger scale:

1. **Database backend** (PostgreSQL)
   - Faster queries
   - Better concurrency
   - ACID transactions
   - Full-text search

2. **Caching layer** (Redis)
   - Cache index in memory
   - Cache frequently accessed issues
   - Pub/sub for real-time updates

3. **Search engine** (Elasticsearch)
   - Full-text search
   - Faceted search
   - Aggregations

4. **CDN** (Cloudflare)
   - Cache static assets
   - Edge caching
   - DDoS protection

## Security

### Current Model

- No authentication (local development)
- File system permissions
- Input validation
- No SQL injection (file-based)

### Production Requirements

1. **Authentication**
   - OAuth2 + JWT
   - Session management
   - Password hashing (bcrypt)

2. **Authorization**
   - Role-based access control (RBAC)
   - Per-worktree permissions
   - Per-board permissions

3. **Input Validation**
   - Sanitize all inputs
   - Validate against schema
   - Escape output

4. **Rate Limiting**
   - Per-user limits
   - Per-IP limits
   - Exponential backoff

5. **HTTPS**
   - TLS 1.3
   - Strong ciphers
   - HSTS headers

## Testing Strategy

### Unit Tests

Test services in isolation:

```typescript
describe('createIssue', () => {
  it('should create issue with unique ID', () => {
    const issue = createIssue('worktree', 'board', {
      title: 'Test',
      type: 'task'
    });

    expect(issue.id).toMatch(/MTH-\d+/);
  });

  it('should add issue to index', () => {
    createIssue(...);
    const index = loadIndex('worktree');
    expect(index.issues).toHaveProperty('MTH-001');
  });
});
```

### Integration Tests

Test API endpoints:

```typescript
describe('POST /api/tracker/worktrees/:id/boards/:id/issues', () => {
  it('should create issue and return 201', async () => {
    const response = await request(app)
      .post('/api/tracker/worktrees/test/boards/main/issues')
      .send({ title: 'Test', type: 'task' })
      .expect(201);

    expect(response.body.id).toBeDefined();
  });
});
```

### E2E Tests

Test full workflows:

```typescript
describe('Issue Creation Flow', () => {
  it('should create issue via UI', async () => {
    await page.goto('/tracker/test/main/kanban');
    await page.click('[data-testid="new-issue-btn"]');
    await page.fill('[data-testid="issue-title"]', 'Test');
    await page.click('[data-testid="create-btn"]');

    await expect(page.locator('.issue-card')).toContainText('Test');
  });
});
```

## Next Steps

- **[Contributing Guide](./contributing.md)** - How to contribute
- **[Testing Guide](./testing.md)** - Testing best practices
- **[Performance Guide](./performance.md)** - Optimization tips

---

**Last Updated:** 2026-01-18
