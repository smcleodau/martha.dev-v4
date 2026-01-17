# Tracker API Reference

Complete REST API documentation for the Martha Tracker system.

## Overview

The Tracker API provides programmatic access to manage worktrees, boards, and issues in the Martha development environment. It follows RESTful principles with JSON request/response bodies.

### Base URL

```
http://localhost:20000/api/tracker
```

Production:
```
https://api.martha.dev/api/tracker
```

### Authentication

Currently, the Tracker API uses cookie-based session authentication. Include credentials with requests:

```bash
curl -H "Content-Type: application/json" \
     --cookie-jar cookies.txt \
     --cookie cookies.txt \
     http://localhost:20000/api/tracker/worktrees
```

### Response Format

All responses are JSON:

```json
{
  "worktrees": [...],
  "count": 3
}
```

### Error Responses

Errors return appropriate HTTP status codes with error details:

```json
{
  "error": "NOT_FOUND",
  "message": "Issue not found"
}
```

**Common status codes:**
- `200 OK` - Success
- `201 Created` - Resource created
- `204 No Content` - Success with no response body
- `400 Bad Request` - Invalid request data
- `404 Not Found` - Resource doesn't exist
- `409 Conflict` - Resource already exists
- `500 Internal Server Error` - Server error

## Hierarchical Structure

The Tracker follows a three-level hierarchy:

```
Worktree (martha-dev-v4)
  └── Board (phase1-temporal-foundation)
      └── Issue (issue-001)
```

**Recommended approach:** Use hierarchical routes for new integrations.

**Legacy routes:** Flat routes (`/issues`) are supported for backward compatibility but deprecated.

## Worktrees API

Worktrees are top-level containers representing code repositories or projects.

### List Worktrees

Retrieve all available worktrees.

```http
GET /worktrees
```

**Response:**
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
  ],
  "count": 1
}
```

**curl example:**
```bash
curl http://localhost:20000/api/tracker/worktrees
```

### Get Worktree

Retrieve detailed information about a specific worktree.

```http
GET /worktrees/{worktreeId}
```

**Parameters:**
- `worktreeId` (path, required): Worktree identifier

**Response:**
```json
{
  "id": "martha-dev-v4",
  "name": "martha-dev-v4",
  "display_name": "Martha Development v4",
  "description": "Main development worktree",
  "path": "/mnt/data/martha.dev-v4",
  "github_repo": "https://github.com/user/martha",
  "boards": ["phase1-temporal-foundation"],
  "boards_detail": [
    {
      "id": "phase1-temporal-foundation",
      "name": "Phase 1 - Temporal Foundation",
      "description": "Core temporal workflow implementation",
      "version": 1,
      "columns": [...]
    }
  ],
  "created_at": "2026-01-15T10:00:00Z",
  "updated_at": "2026-01-16T14:30:00Z"
}
```

**curl example:**
```bash
curl http://localhost:20000/api/tracker/worktrees/martha-dev-v4
```

### Create Worktree

Create a new worktree.

```http
POST /worktrees
```

**Request body:**
```json
{
  "id": "new-project",
  "name": "new-project",
  "display_name": "New Project",
  "description": "A new project worktree",
  "path": "/mnt/data/new-project",
  "github_repo": "https://github.com/user/new-project"
}
```

**Response:** `201 Created`
```json
{
  "id": "new-project",
  "name": "new-project",
  "display_name": "New Project",
  "description": "A new project worktree",
  "path": "/mnt/data/new-project",
  "github_repo": "https://github.com/user/new-project",
  "boards": [],
  "created_at": "2026-01-16T15:00:00Z",
  "updated_at": "2026-01-16T15:00:00Z"
}
```

**curl example:**
```bash
curl -X POST http://localhost:20000/api/tracker/worktrees \
  -H "Content-Type: application/json" \
  -d '{
    "id": "new-project",
    "name": "new-project",
    "display_name": "New Project",
    "description": "A new project worktree",
    "path": "/mnt/data/new-project"
  }'
```

### Update Worktree

Update worktree configuration.

```http
PATCH /worktrees/{worktreeId}
```

**Request body:**
```json
{
  "display_name": "Martha Development v4 (Updated)",
  "description": "Updated description"
}
```

**Response:** `200 OK`
Returns updated worktree object.

**curl example:**
```bash
curl -X PATCH http://localhost:20000/api/tracker/worktrees/martha-dev-v4 \
  -H "Content-Type: application/json" \
  -d '{"display_name": "Martha Development v4 (Updated)"}'
```

### Delete Worktree

Delete a worktree and all its boards and issues.

```http
DELETE /worktrees/{worktreeId}
```

**Response:** `204 No Content`

**curl example:**
```bash
curl -X DELETE http://localhost:20000/api/tracker/worktrees/old-project
```

## Boards API

Boards are kanban boards within a worktree.

### List Boards

Retrieve all boards in a worktree.

```http
GET /worktrees/{worktreeId}/boards
```

**Response:**
```json
{
  "boards": [
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
  ],
  "count": 1
}
```

**curl example:**
```bash
curl http://localhost:20000/api/tracker/worktrees/martha-dev-v4/boards
```

### Get Board

Retrieve complete board state including all columns and issue IDs.

```http
GET /worktrees/{worktreeId}/boards/{boardId}
```

**Response:** `200 OK`
Returns board object with full column configuration.

**curl example:**
```bash
curl http://localhost:20000/api/tracker/worktrees/martha-dev-v4/boards/phase1-temporal-foundation
```

### Create Board

Create a new board in a worktree.

```http
POST /worktrees/{worktreeId}/boards
```

**Request body:**
```json
{
  "id": "new-board",
  "name": "New Board",
  "description": "A new kanban board",
  "columns": [
    {
      "id": "backlog",
      "name": "Backlog",
      "color": "#6B7280",
      "wip_limit": null,
      "issue_ids": []
    },
    {
      "id": "in-progress",
      "name": "In Progress",
      "color": "#3B82F6",
      "wip_limit": 5,
      "issue_ids": []
    },
    {
      "id": "done",
      "name": "Done",
      "color": "#10B981",
      "wip_limit": null,
      "issue_ids": []
    }
  ]
}
```

**Response:** `201 Created`
Returns created board object.

**curl example:**
```bash
curl -X POST http://localhost:20000/api/tracker/worktrees/martha-dev-v4/boards \
  -H "Content-Type: application/json" \
  -d '{
    "id": "new-board",
    "name": "New Board",
    "description": "A new kanban board",
    "columns": [
      {
        "id": "backlog",
        "name": "Backlog",
        "color": "#6B7280",
        "issue_ids": []
      }
    ]
  }'
```

### Update Board

Update board configuration.

```http
PATCH /worktrees/{worktreeId}/boards/{boardId}
```

**Request body:**
```json
{
  "name": "Updated Board Name",
  "description": "Updated description"
}
```

**Response:** `200 OK`
Returns updated board object.

**curl example:**
```bash
curl -X PATCH http://localhost:20000/api/tracker/worktrees/martha-dev-v4/boards/phase1-temporal-foundation \
  -H "Content-Type: application/json" \
  -d '{"name": "Phase 1 - Updated"}'
```

### Delete Board

Delete a board and all its issues.

```http
DELETE /worktrees/{worktreeId}/boards/{boardId}
```

**Response:** `204 No Content`

**curl example:**
```bash
curl -X DELETE http://localhost:20000/api/tracker/worktrees/martha-dev-v4/boards/old-board
```

## Issues API (Hierarchical)

Issues are work items within a board. Use these hierarchical routes for new integrations.

### List Issues

Retrieve all issues in a board with optional filtering.

```http
GET /worktrees/{worktreeId}/boards/{boardId}/issues
```

**Query parameters:**
- `status` (string, optional): Filter by status (column ID)
- `type` (string, optional): Filter by type (epic/story/task/bug)
- `parent_id` (string, optional): Filter by parent issue ID
- `assignee` (string, optional): Filter by assignee ID

**Response:**
```json
{
  "issues": [
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
  ],
  "count": 1
}
```

**curl examples:**
```bash
# List all issues
curl http://localhost:20000/api/tracker/worktrees/martha-dev-v4/boards/phase1-temporal-foundation/issues

# Filter by status
curl "http://localhost:20000/api/tracker/worktrees/martha-dev-v4/boards/phase1-temporal-foundation/issues?status=in-progress"

# Filter by type
curl "http://localhost:20000/api/tracker/worktrees/martha-dev-v4/boards/phase1-temporal-foundation/issues?type=bug"

# Filter by parent
curl "http://localhost:20000/api/tracker/worktrees/martha-dev-v4/boards/phase1-temporal-foundation/issues?parent_id=epic-001"
```

### Get Issue

Retrieve a specific issue.

```http
GET /worktrees/{worktreeId}/boards/{boardId}/issues/{issueId}
```

**Response:** `200 OK`
Returns issue object.

**curl example:**
```bash
curl http://localhost:20000/api/tracker/worktrees/martha-dev-v4/boards/phase1-temporal-foundation/issues/issue-001
```

### Create Issue

Create a new issue in a board.

```http
POST /worktrees/{worktreeId}/boards/{boardId}/issues
```

**Request body:**
```json
{
  "title": "Implement workflow execution engine",
  "type": "task",
  "status": "backlog",
  "parent_id": null,
  "description": "Build the core workflow execution logic",
  "labels": ["backend", "temporal"],
  "priority": "high"
}
```

**Field defaults:**
- `type`: "task"
- `status`: "backlog"
- `priority`: "medium"
- `description`: ""
- `labels`: []
- `parent_id`: null

**Response:** `201 Created`
Returns created issue object.

**curl example:**
```bash
curl -X POST http://localhost:20000/api/tracker/worktrees/martha-dev-v4/boards/phase1-temporal-foundation/issues \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Fix authentication bug",
    "type": "bug",
    "priority": "critical",
    "description": "Users cannot log in after password reset"
  }'
```

### Update Issue

Update issue fields.

```http
PATCH /worktrees/{worktreeId}/boards/{boardId}/issues/{issueId}
```

**Request body:**
```json
{
  "title": "Implement workflow execution engine (updated)",
  "priority": "critical",
  "assignee": {
    "id": "user-456",
    "name": "Jane Smith",
    "avatar": "https://avatar.example.com/user-456.png"
  },
  "labels": ["backend", "temporal", "high-priority"]
}
```

**Response:** `200 OK`
Returns updated issue object.

**curl example:**
```bash
curl -X PATCH http://localhost:20000/api/tracker/worktrees/martha-dev-v4/boards/phase1-temporal-foundation/issues/issue-001 \
  -H "Content-Type: application/json" \
  -d '{"priority": "critical"}'
```

### Delete Issue

Delete an issue.

```http
DELETE /worktrees/{worktreeId}/boards/{boardId}/issues/{issueId}
```

**Response:** `204 No Content`

**curl example:**
```bash
curl -X DELETE http://localhost:20000/api/tracker/worktrees/martha-dev-v4/boards/phase1-temporal-foundation/issues/issue-001
```

### Move Issue

Move an issue to a different status (column).

```http
POST /worktrees/{worktreeId}/boards/{boardId}/issues/{issueId}/move
```

**Request body:**
```json
{
  "status": "in-progress",
  "index": 2
}
```

**Fields:**
- `status` (required): New status (column ID)
- `index` (optional): Position in the new column (0-based)

**Response:** `200 OK`
Returns updated issue object with new status.

**curl example:**
```bash
curl -X POST http://localhost:20000/api/tracker/worktrees/martha-dev-v4/boards/phase1-temporal-foundation/issues/issue-001/move \
  -H "Content-Type: application/json" \
  -d '{"status": "done"}'
```

## Issues API (Legacy)

Legacy flat routes for backward compatibility. These are **deprecated** - use hierarchical routes for new integrations.

### List All Issues (Legacy)

```http
GET /issues
```

Query parameters same as hierarchical route.

**curl example:**
```bash
curl http://localhost:20000/api/tracker/issues
```

### Get Issue (Legacy)

```http
GET /issues/{issueId}
```

**curl example:**
```bash
curl http://localhost:20000/api/tracker/issues/issue-001
```

### Create Issue (Legacy)

```http
POST /issues
```

Creates issue in the default board.

**curl example:**
```bash
curl -X POST http://localhost:20000/api/tracker/issues \
  -H "Content-Type: application/json" \
  -d '{"title": "New issue"}'
```

### Update/Delete/Move Issue (Legacy)

```http
PATCH /issues/{issueId}
DELETE /issues/{issueId}
POST /issues/{issueId}/move
```

Same request/response format as hierarchical routes.

## Comments API

Manage comments on issues.

### List Comments

Retrieve all comments for an issue.

```http
GET /issues/{issueId}/comments
```

**Response:**
```json
{
  "comments": [
    {
      "id": "comment-001",
      "issue_id": "issue-001",
      "author": {
        "id": "user-123",
        "name": "John Doe",
        "avatar": "https://avatar.example.com/user-123.png"
      },
      "content": "This looks good to me!",
      "created_at": "2026-01-16T14:00:00Z",
      "updated_at": "2026-01-16T14:00:00Z"
    }
  ],
  "count": 1
}
```

**curl example:**
```bash
curl http://localhost:20000/api/tracker/issues/issue-001/comments
```

### Create Comment

Add a comment to an issue.

```http
POST /issues/{issueId}/comments
```

**Request body:**
```json
{
  "text": "Looks good to me!",
  "author": {
    "id": "user-123",
    "name": "John Doe",
    "avatar": "https://avatar.example.com/user-123.png"
  }
}
```

**Response:** `201 Created`

**curl example:**
```bash
curl -X POST http://localhost:20000/api/tracker/issues/issue-001/comments \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Looks good to me!",
    "author": {
      "id": "user-123",
      "name": "John Doe",
      "avatar": "https://avatar.example.com/user-123.png"
    }
  }'
```

### Update Comment

Update a comment's text.

```http
PATCH /comments/{commentId}?issue_id={issueId}
```

**Request body:**
```json
{
  "text": "Updated comment text"
}
```

**Response:** `200 OK`

**curl example:**
```bash
curl -X PATCH "http://localhost:20000/api/tracker/comments/comment-001?issue_id=issue-001" \
  -H "Content-Type: application/json" \
  -d '{"text": "Updated comment"}'
```

### Delete Comment

Delete a comment.

```http
DELETE /comments/{commentId}?issue_id={issueId}
```

**Response:** `204 No Content`

**curl example:**
```bash
curl -X DELETE "http://localhost:20000/api/tracker/comments/comment-001?issue_id=issue-001"
```

## Data Types

### WorktreeConfig

```typescript
{
  id: string;                 // Unique identifier (slug)
  name: string;               // Internal name
  display_name: string;       // Human-readable name
  description: string;        // Worktree description
  path: string;               // Filesystem path
  github_repo?: string;       // GitHub repository URL
  boards: string[];           // List of board IDs
  created_at: string;         // ISO 8601 timestamp
  updated_at: string;         // ISO 8601 timestamp
}
```

### Board

```typescript
{
  id: string;                 // Board identifier (slug)
  worktree_id: string;        // Parent worktree ID
  name: string;               // Board name
  description: string;        // Board description
  version: number;            // Board version
  sprint?: {                  // Optional sprint info
    id: string;
    name: string;
    start_date: string;       // YYYY-MM-DD
    end_date: string;         // YYYY-MM-DD
  };
  columns: BoardColumn[];     // Board columns
  created_at: string;         // ISO 8601 timestamp
  updated_at: string;         // ISO 8601 timestamp
}
```

### BoardColumn

```typescript
{
  id: string;                 // Column identifier
  name: string;               // Column display name
  color: string;              // Hex color code
  wip_limit: number | null;   // Work-in-progress limit
  issue_ids: string[];        // Ordered issue IDs
}
```

### Issue

```typescript
{
  id: string;                 // Issue identifier
  worktree_id: string;        // Parent worktree ID
  board_id: string;           // Parent board ID
  type: 'epic' | 'story' | 'task' | 'bug';
  title: string;              // Issue title
  description: string;        // Description (markdown)
  status: string;             // Current status (column ID)
  priority: 'critical' | 'high' | 'medium' | 'low';
  parent_id: string | null;   // Parent issue ID
  assignee: {                 // Assigned user
    id: string;
    name: string;
    avatar: string;
  } | null;
  labels: string[];           // Issue labels
  documentation: {            // Documentation links
    overview: string | null;
    technical_spec: string | null;
    related_docs: string[];
  };
  links: {                    // External links
    pr: string | null;
    related_issues: string[];
    external: string[];
  };
  metadata: {                 // Metadata
    created_at: string;
    updated_at: string;
    version: number;
  };
}
```

## Rate Limiting

Currently, there are no rate limits enforced. This may change in production environments.

## Webhooks

Webhook support is planned for future releases to enable real-time integrations.

## Best Practices

**Use hierarchical routes:**
- Prefer `/worktrees/{id}/boards/{id}/issues` over flat `/issues`
- More explicit and maintainable

**Handle errors gracefully:**
- Check HTTP status codes
- Parse error messages
- Implement retry logic for 5xx errors

**Optimize API calls:**
- Use query parameters to filter issues
- Cache worktree and board data
- Batch operations when possible

**Versioning:**
- Include version in Accept header (future)
- Monitor API changelog for breaking changes

## Migration from Legacy Routes

If you're using legacy `/issues` routes:

**Before:**
```bash
curl http://localhost:20000/api/tracker/issues
```

**After:**
```bash
curl http://localhost:20000/api/tracker/worktrees/martha-dev-v4/boards/phase1-temporal-foundation/issues
```

**Steps:**
1. Identify your worktree ID
2. Identify your board ID
3. Update all API calls to use hierarchical routes
4. Test thoroughly
5. Remove legacy route usage

## Support

For API questions or issues:

- Review this documentation
- Check the OpenAPI specification
- Review the tracker architecture documentation
- Contact your development team
