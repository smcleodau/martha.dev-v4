# Tracker Architecture Overview

Technical overview of the Martha Tracker system architecture and design.

## System Overview

The Martha Tracker is a full-stack kanban board system designed for managing software development workflows. It provides hierarchical issue management across multiple worktrees and boards with real-time updates.

### Key Design Goals

1. **Hierarchical Organization** - Support multiple worktrees, each with multiple boards
2. **Flexibility** - Accommodate epics, stories, tasks, and bugs with parent-child relationships
3. **Performance** - Fast rendering and responsive drag-and-drop
4. **Maintainability** - Clean separation between frontend and backend
5. **Extensibility** - Easy to add new features without breaking existing functionality

### Technology Stack

**Frontend:**
- React 19.2 with TypeScript 5.7
- React Router 7 for routing
- Tailwind CSS for styling
- Native HTML5 Drag-and-Drop API
- ReactMarkdown for content rendering

**Backend:**
- Node.js with Fastify
- File-based JSON storage
- RESTful API architecture

**No External Dependencies For:**
- Drag-and-drop (native HTML5)
- State management (React hooks)
- UI components (custom implementations)

## Architectural Layers

### Three-Tier Architecture

```
┌─────────────────────────────────────────────┐
│         Frontend (React + TypeScript)       │
│  - TrackerPage (orchestration)              │
│  - KanbanBoard, IssueCard (UI)              │
│  - FilterBar (filtering)                    │
│  - IssueDetailPanel (details)               │
└─────────────────┬───────────────────────────┘
                  │ HTTPS/JSON
┌─────────────────▼───────────────────────────┐
│         Backend API (Fastify)               │
│  - Worktrees routes                         │
│  - Boards routes                            │
│  - Issues routes                            │
│  - Comments routes                          │
└─────────────────┬───────────────────────────┘
                  │ File I/O
┌─────────────────▼───────────────────────────┐
│         Data Layer (JSON Files)             │
│  - worktrees.json                           │
│  - boards/{worktree-id}/{board-id}.json     │
│  - issues/{worktree-id}/{issue-id}.json     │
└─────────────────────────────────────────────┘
```

## Hierarchical Data Model

### Three-Level Hierarchy

```
Worktree (Repository/Project)
  │
  ├── Board (Kanban Board)
  │     │
  │     ├── Column (Status)
  │     │     │
  │     │     └── Issues (ordered list of IDs)
  │     │
  │     └── Column
  │           └── Issues
  │
  └── Board
        └── ...
```

### Entity Relationships

**Worktree (1) ──< (N) Board**
- A worktree contains multiple boards
- Each board belongs to exactly one worktree
- Relationship tracked via `worktree_id` field in boards

**Board (1) ──< (N) Issue**
- A board contains multiple issues
- Each issue belongs to exactly one board
- Relationship tracked via `board_id` field in issues

**Board (1) ──< (N) Column**
- A board has multiple columns
- Columns are ordered and configured per board
- Each column contains an ordered list of issue IDs

**Issue (0..1) ──< (N) Issue (Parent-Child)**
- Issues can have parent-child relationships
- Epics contain stories/tasks
- Stories contain tasks
- Relationship tracked via `parent_id` field

### Data Flow

**Read Flow:**
```
User navigates to tracker
  → TrackerPage loads
    → Fetch worktrees from API
      → Load from worktrees.json
    → Fetch boards for selected worktree
      → Load from boards/{worktree-id}/
    → Fetch issues for selected board
      → Load from issues/{worktree-id}/{board-id}/
    → Render KanbanBoard with data
```

**Write Flow (Move Issue):**
```
User drags issue to new column
  → handleDrop() called
    → API: POST /worktrees/{id}/boards/{id}/issues/{id}/move
      → Update issue.status in JSON file
      → Update board.columns[].issue_ids arrays
      → Persist to disk
    → Response: Updated issue object
  → Update local state
  → Re-render board
```

## File Storage Structure

### Directory Layout

```
data/
  tracker/
    ├── worktrees.json                         # All worktrees
    ├── boards/
    │   ├── martha-dev-v4/
    │   │   ├── phase1-temporal-foundation.json
    │   │   ├── phase2-agent-swarms.json
    │   │   └── ...
    │   └── feature-auth/
    │       └── auth-board.json
    └── issues/
        ├── martha-dev-v4/
        │   ├── phase1-temporal-foundation/
        │   │   ├── issue-001.json
        │   │   ├── issue-002.json
        │   │   └── ...
        │   └── phase2-agent-swarms/
        │       └── ...
        └── feature-auth/
            └── ...
```

### File Formats

**worktrees.json:**
```json
{
  "worktrees": [
    {
      "id": "martha-dev-v4",
      "name": "martha-dev-v4",
      "display_name": "Martha Development v4",
      "description": "Main development worktree",
      "path": "/mnt/data/martha.dev-v4",
      "github_repo": "https://github.com/user/martha",
      "boards": ["phase1-temporal-foundation", "phase2-agent-swarms"],
      "created_at": "2026-01-15T10:00:00Z",
      "updated_at": "2026-01-16T14:30:00Z"
    }
  ]
}
```

**board.json:**
```json
{
  "id": "phase1-temporal-foundation",
  "worktree_id": "martha-dev-v4",
  "name": "Phase 1 - Temporal Foundation",
  "description": "Core temporal workflow implementation",
  "version": 1,
  "sprint": {
    "id": "sprint-2026-01",
    "name": "January 2026 Sprint",
    "start_date": "2026-01-01",
    "end_date": "2026-01-31"
  },
  "columns": [
    {
      "id": "backlog",
      "name": "Backlog",
      "color": "#6B7280",
      "wip_limit": null,
      "issue_ids": ["issue-001", "issue-002"]
    },
    {
      "id": "in-progress",
      "name": "In Progress",
      "color": "#3B82F6",
      "wip_limit": 5,
      "issue_ids": ["issue-003"]
    }
  ],
  "created_at": "2026-01-15T10:00:00Z",
  "updated_at": "2026-01-16T14:30:00Z"
}
```

**issue.json:**
```json
{
  "id": "issue-001",
  "worktree_id": "martha-dev-v4",
  "board_id": "phase1-temporal-foundation",
  "type": "task",
  "title": "Implement temporal workflow engine",
  "description": "Build the core workflow execution engine...",
  "status": "in-progress",
  "priority": "high",
  "parent_id": null,
  "assignee": {
    "id": "user-123",
    "name": "John Doe",
    "avatar": "https://avatar.example.com/user-123.png"
  },
  "labels": ["backend", "temporal"],
  "documentation": {
    "overview": null,
    "technical_spec": "doc-temporal-spec",
    "related_docs": []
  },
  "links": {
    "pr": "https://github.com/user/repo/pull/123",
    "related_issues": [],
    "external": []
  },
  "metadata": {
    "created_at": "2026-01-15T10:00:00Z",
    "updated_at": "2026-01-16T14:30:00Z",
    "version": 3
  }
}
```

### Data Consistency

**Referential Integrity:**
- Board's `columns[].issue_ids` must match actual issue files
- Issue's `status` must match a column ID in its board
- Issue's `parent_id` must reference a valid issue
- When moving issues, both issue status and board column lists are updated atomically

**Optimistic Locking:**
- Issues have a `version` field
- API can reject updates if version doesn't match (future enhancement)

## State Management

### Frontend State

**TrackerPage manages all state:**
```typescript
// Global state
worktrees: WorktreeConfig[]
selectedWorktreeId: string
boards: Board[]
selectedBoardId: string

// Current board state
board: Board | null
issues: Record<string, Issue>  // By ID for fast lookup
selectedIssue: string | null

// UI state
filters: FilterState
loading: boolean
error: string | null
```

**Why no Redux/Context?**
- Single page component owns all state
- No need for global state management
- Props drilling is minimal (2-3 levels max)
- React hooks provide sufficient functionality

### State Synchronization

**URL as Source of Truth:**
```
/tracker/:worktreeId/:boardId/:issueId?
```

- URL parameters drive data loading
- Navigation updates URL
- URL changes trigger data fetch
- Browser back/forward work naturally

**Synchronization Flow:**
```
URL change
  → useParams() updates
    → useEffect() detects change
      → Load new data from API
        → Update local state
          → Re-render components
```

## API Design

### RESTful Principles

**Resource-Oriented:**
- `/worktrees` - Collection
- `/worktrees/{id}` - Individual resource
- `/worktrees/{id}/boards` - Nested collection
- `/worktrees/{id}/boards/{id}/issues` - Nested collection

**HTTP Methods:**
- `GET` - Retrieve resources
- `POST` - Create resources
- `PATCH` - Partially update resources
- `DELETE` - Delete resources

**Status Codes:**
- `200 OK` - Success
- `201 Created` - Resource created
- `204 No Content` - Success, no response body
- `400 Bad Request` - Invalid input
- `404 Not Found` - Resource doesn't exist
- `409 Conflict` - Duplicate resource
- `500 Internal Server Error` - Server error

### Hierarchical vs Legacy Routes

**New (Hierarchical):**
```
GET /worktrees/{worktree}/boards/{board}/issues
```
- Explicit hierarchy
- Clear ownership
- Easier to reason about

**Old (Legacy):**
```
GET /issues
```
- Flat structure
- Requires filtering by board_id
- Kept for backward compatibility

**Recommendation:** Use hierarchical routes for all new integrations.

## Drag-and-Drop Implementation

### Native HTML5 API

**Why native?**
- No external library dependencies
- Better performance
- Simpler implementation
- Built-in browser support

### Event Flow

```
1. dragstart
   - Set draggedIssueId in state
   - Store issue ID in dataTransfer
   - Make card semi-transparent

2. dragover (on column)
   - Prevent default to allow drop
   - Set dragOverColumnId in state
   - Highlight column with blue border

3. drop (on column)
   - Get issue ID from dataTransfer
   - Call API to move issue
   - Clear drag state
   - Update UI

4. dragend
   - Restore card opacity
   - Clear drag state
```

### Visual Feedback

**During Drag:**
- Source card: `opacity: 0.5`
- Target column: `border: 2px solid blue` + `background: light blue`

**After Drop:**
- Optimistic UI update (instant)
- API call in background
- Rollback on failure (future enhancement)

## Performance Considerations

### Frontend Optimizations

**Issue Lookup:**
```typescript
// Store issues by ID for O(1) lookup
issues: Record<string, Issue>
```

**Filtering:**
```typescript
// Memoize filtered results
const filteredIssues = useMemo(
  () => filterIssues(issues),
  [issues, filters]
);
```

**Lazy Loading:**
- Only load issues for current board
- Don't load all boards upfront
- Load detail panel data on-demand

### Backend Optimizations

**File Caching:**
- Cache parsed JSON in memory
- Invalidate on write
- Reduces disk I/O

**Batch Operations:**
- When moving issues, update board and issue in one transaction
- Atomic file writes

**Index Files:**
- Board files contain issue IDs for quick column rendering
- Avoid loading all issue files to display board

## Security Considerations

**Current State:**
- No authentication (local development)
- No authorization checks
- Cookie-based sessions (placeholder)

**Future Enhancements:**
- GitHub OAuth integration
- Role-based access control
- API key authentication for integrations
- Rate limiting

## Extensibility

### Adding New Issue Fields

1. Update TypeScript `Issue` interface in `tracker.ts`
2. Update file schema in backend
3. Add field to detail panel UI
4. Update API documentation

### Adding New Features

**Comments System:**
- Already has placeholder UI (Comments tab)
- API endpoints defined
- Just needs implementation

**Activity Timeline:**
- Placeholder tab exists
- Store audit log on each issue update
- Render timeline from logs

**Documentation Linking:**
- Schema supports documentation links
- UI has placeholder tab
- Integrate with documentation API

## Monitoring and Logging

**Backend Logging:**
```typescript
import { createLogger } from '../../utils/logger.js';
const logger = createLogger({ module: 'tracker' });

logger.info('Issue created', { issueId, boardId });
logger.error('Failed to move issue', { error, issueId });
```

**Frontend Error Handling:**
```typescript
try {
  await hierarchicalIssuesApi.move(worktreeId, boardId, issueId, newStatus);
} catch (err) {
  console.error('Failed to move issue:', err);
  alert('Failed to move issue');
  // Rollback UI change (future)
}
```

## Testing Strategy

### Unit Tests

- Component rendering
- Filter logic
- API client methods
- Drag-and-drop handlers

### Integration Tests

- Full user workflows (E2E)
- API endpoint testing
- File I/O operations

### Test Files

Located in `/home/archiedev/test-tracker/`:
- `test-drag-drop.js` - Drag-and-drop functionality
- `test-detail-panel.js` - Detail panel interactions
- `test-complete-system.js` - Full E2E test

## Future Architecture Improvements

### Database Migration

**Current:** File-based JSON storage
**Future:** PostgreSQL or MongoDB

**Benefits:**
- Better concurrency
- ACID transactions
- Query performance
- Referential integrity

### WebSocket Integration

**Real-time Updates:**
- Notify clients of issue moves
- Live collaboration
- Presence indicators

### Microservices

**Potential Split:**
- Tracker service (issues, boards)
- Authentication service
- Notification service
- Search service

### Search and Filtering

**Elasticsearch Integration:**
- Full-text search
- Advanced filtering
- Aggregations for metrics

## Conclusion

The Martha Tracker uses a straightforward three-tier architecture with clear separation of concerns. The file-based storage is suitable for development and small teams, with a clear migration path to databases for production use.

Key architectural decisions:
- **Hierarchical data model** - Clear organization
- **Native drag-and-drop** - No dependencies
- **File-based storage** - Simple and portable
- **RESTful API** - Standard and extensible
- **Component-based UI** - Maintainable and testable

The system is designed for extensibility, with placeholders for comments, activity tracking, and documentation linking ready for implementation.
