# Martha Tracker API Reference

**Version:** 2.0
**Base URL:** `http://localhost:20000/api/tracker`
**Last Updated:** 2026-01-18

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Common Patterns](#common-patterns)
4. [Endpoints](#endpoints)
   - [Worktrees](#worktrees)
   - [Boards](#boards)
   - [Issues](#issues)
   - [Initiatives](#initiatives)
   - [Teams](#teams)
   - [Releases](#releases)
   - [Comments](#comments)
   - [Activity](#activity)
   - [Documentation](#documentation)
   - [Statistics](#statistics)
5. [Error Handling](#error-handling)
6. [Rate Limiting](#rate-limiting)

## Overview

The Martha Tracker API provides a comprehensive issue tracking and project management system designed for development workflows. It supports hierarchical issue structures (epics > stories > tasks), multi-board kanban management, time tracking, dependencies, and deep integration with documentation and activity tracking.

### Key Features

- Multi-worktree support for managing multiple projects
- Multi-board kanban for organizing work streams
- Hierarchical issues (Epic → Story → Task → Bug)
- Initiatives and team management
- Release planning and tracking
- Time tracking and estimation
- Issue dependencies (blocks, blocked_by, related)
- Real-time activity logging
- Documentation linking
- Advanced filtering and search

### API Design Principles

- RESTful design with resource-based URLs
- Hierarchical routing: `/worktrees/:id/boards/:id/issues/:id`
- JSON request/response bodies
- Standard HTTP status codes
- Consistent error response format
- ISO 8601 date formats
- Idempotent operations where applicable

## Authentication

Currently, the API does not require authentication for local development. In production deployments, authentication will be enforced via:

- **API Keys:** Passed via `X-API-Key` header
- **JWT Tokens:** OAuth2-based authentication
- **Session Cookies:** For dashboard access

```http
X-API-Key: your-api-key-here
Authorization: Bearer your-jwt-token
```

## Common Patterns

### Request Format

All POST and PATCH requests require `Content-Type: application/json`:

```http
POST /api/tracker/worktrees/martha-dev-v4/boards/phase1/issues
Content-Type: application/json

{
  "title": "Implement feature",
  "type": "task",
  "status": "todo"
}
```

### Response Format

Successful responses return JSON:

```json
{
  "id": "MTH-001",
  "title": "Implement feature",
  "type": "task",
  "status": "todo",
  "metadata": {
    "created_at": "2026-01-18T10:00:00.000Z",
    "updated_at": "2026-01-18T10:00:00.000Z",
    "version": 1
  }
}
```

List responses include count:

```json
{
  "issues": [...],
  "count": 42
}
```

### Filtering and Pagination

Most list endpoints support query parameters for filtering:

```http
GET /api/tracker/worktrees/:id/boards/:id/issues?status=in_progress&type=task&priority=high
```

Common filters:
- `status` - Filter by status
- `type` - Filter by issue type (epic, story, task, bug)
- `priority` - Filter by priority (critical, high, medium, low)
- `assignee` - Filter by assignee ID
- `parent_id` - Filter by parent issue
- `initiative_id` - Filter by initiative
- `team_id` - Filter by team
- `epic_id` - Filter by epic
- `release_id` - Filter by release

### Date Formats

All dates use ISO 8601 format:

```json
{
  "created_at": "2026-01-18T10:00:00.000Z",
  "start_date": "2026-01-18",
  "due_date": "2026-01-25"
}
```

---

## Endpoints

## Worktrees

Worktrees represent individual projects or repositories. Each worktree contains multiple boards.

### List Worktrees

```http
GET /api/tracker/worktrees
```

**Response:**

```json
{
  "worktrees": [
    {
      "id": "martha-dev-v4",
      "name": "martha-dev-v4",
      "display_name": "Martha Development v4",
      "description": "Martha TypeScript service development",
      "path": "/mnt/data/martha.dev-v4",
      "github_repo": "heyarchie-ai/martha.dev-v4",
      "boards": ["phase1", "phase2", "infrastructure"],
      "created_at": "2026-01-18T10:00:00.000Z",
      "updated_at": "2026-01-18T10:00:00.000Z"
    }
  ],
  "count": 1
}
```

### Get Worktree

```http
GET /api/tracker/worktrees/:worktreeId
```

**Parameters:**
- `worktreeId` (path, required) - Worktree identifier

**Response:**

```json
{
  "id": "martha-dev-v4",
  "name": "martha-dev-v4",
  "display_name": "Martha Development v4",
  "description": "Martha TypeScript service development",
  "path": "/mnt/data/martha.dev-v4",
  "github_repo": "heyarchie-ai/martha.dev-v4",
  "boards": ["phase1", "phase2"],
  "boards_detail": [
    {
      "id": "phase1",
      "name": "Phase 1: Foundation",
      "description": "Core infrastructure",
      "columns": [...]
    }
  ],
  "created_at": "2026-01-18T10:00:00.000Z",
  "updated_at": "2026-01-18T10:00:00.000Z"
}
```

### Create Worktree

```http
POST /api/tracker/worktrees
Content-Type: application/json

{
  "id": "communications-service",
  "name": "communications-service",
  "display_name": "Communications Service",
  "description": "AI-powered communications platform",
  "path": "/mnt/data/archie-platform-v2/communications-service",
  "github_repo": "heyarchie-ai/archie-platform-v2"
}
```

**Request Body:**
- `id` (string, required) - Unique worktree identifier (kebab-case)
- `name` (string, required) - Short name
- `display_name` (string, required) - Human-readable name
- `description` (string, optional) - Description
- `path` (string, required) - File system path
- `github_repo` (string, optional) - GitHub repository (owner/repo)

**Response:** `201 Created`

### Update Worktree

```http
PATCH /api/tracker/worktrees/:worktreeId
Content-Type: application/json

{
  "display_name": "Updated Display Name",
  "description": "Updated description"
}
```

**Response:** `200 OK`

### Delete Worktree

```http
DELETE /api/tracker/worktrees/:worktreeId
```

**Response:** `204 No Content`

---

## Boards

Boards organize issues within a worktree using kanban columns.

### List Boards

```http
GET /api/tracker/worktrees/:worktreeId/boards
```

**Response:**

```json
{
  "boards": [
    {
      "id": "phase1",
      "worktree_id": "martha-dev-v4",
      "name": "Phase 1: Foundation",
      "description": "Core infrastructure and services",
      "columns": [
        {
          "id": "backlog",
          "name": "Backlog",
          "color": "#6B7280",
          "wip_limit": null,
          "issue_ids": ["MTH-001", "MTH-002"]
        },
        {
          "id": "todo",
          "name": "To Do",
          "color": "#3B82F6",
          "wip_limit": null,
          "issue_ids": []
        },
        {
          "id": "in_progress",
          "name": "In Progress",
          "color": "#F59E0B",
          "wip_limit": 3,
          "issue_ids": ["MTH-003"]
        },
        {
          "id": "review",
          "name": "Review",
          "color": "#8B5CF6",
          "wip_limit": null,
          "issue_ids": []
        },
        {
          "id": "done",
          "name": "Done",
          "color": "#10B981",
          "wip_limit": null,
          "issue_ids": ["MTH-004", "MTH-005"]
        }
      ],
      "sprint": {
        "id": "sprint-1",
        "name": "Sprint 1",
        "start_date": "2026-01-18",
        "end_date": "2026-01-31"
      },
      "created_at": "2026-01-18T10:00:00.000Z",
      "updated_at": "2026-01-18T10:00:00.000Z"
    }
  ],
  "count": 1
}
```

### Get Board

```http
GET /api/tracker/worktrees/:worktreeId/boards/:boardId
```

**Response:** Single board object

### Create Board

```http
POST /api/tracker/worktrees/:worktreeId/boards
Content-Type: application/json

{
  "id": "phase2",
  "name": "Phase 2: Advanced Features",
  "description": "Timeline, Gantt, and advanced views",
  "columns": [
    {
      "id": "backlog",
      "name": "Backlog",
      "color": "#6B7280",
      "wip_limit": null
    }
  ]
}
```

**Request Body:**
- `id` (string, required) - Board identifier
- `name` (string, required) - Board name
- `description` (string, optional) - Description
- `columns` (array, optional) - Custom columns (defaults to standard 5-column setup)

**Default Columns:**
If not specified, creates: Backlog, To Do, In Progress, Review, Done

**Response:** `201 Created`

### Update Board

```http
PATCH /api/tracker/worktrees/:worktreeId/boards/:boardId
Content-Type: application/json

{
  "name": "Updated Board Name",
  "description": "Updated description",
  "sprint": {
    "id": "sprint-2",
    "name": "Sprint 2",
    "start_date": "2026-02-01",
    "end_date": "2026-02-14"
  }
}
```

**Response:** `200 OK`

### Delete Board

```http
DELETE /api/tracker/worktrees/:worktreeId/boards/:boardId
```

**Response:** `204 No Content`

---

## Issues

Issues are the core entities representing work items. Supports hierarchical types: epic > story > task/bug.

### Issue Object Structure

```json
{
  "id": "MTH-001",
  "worktree_id": "martha-dev-v4",
  "board_id": "phase1",
  "type": "epic",
  "title": "Implement Timeline View",
  "description": "Add timeline visualization for issues with date ranges",
  "status": "in_progress",
  "priority": "high",
  "parent_id": null,
  "assignee": {
    "id": "user-123",
    "name": "Claude",
    "avatar": "https://..."
  },
  "labels": ["frontend", "visualization"],
  "quality": {
    "coverage": 85,
    "checklist": [
      "Unit tests written",
      "E2E tests added",
      "Documentation updated"
    ]
  },
  "time_tracking": {
    "estimated_hours": 16,
    "logged_hours": 8.5
  },
  "links": {
    "pr": "https://github.com/owner/repo/pull/123",
    "related_issues": ["MTH-002", "MTH-003"],
    "external": ["https://docs.example.com"]
  },
  "documentation": {
    "overview": "doc-abc123",
    "technical_spec": "doc-def456",
    "related_docs": ["doc-ghi789"]
  },
  "github_sync": {
    "issue_number": 42,
    "last_synced": "2026-01-18T10:00:00.000Z",
    "dirty": false
  },
  "initiative_id": "init-001",
  "team_ids": ["team-frontend", "team-design"],
  "story_points": 8,
  "epic_id": null,
  "release_id": "v2.0.0",
  "start_date": "2026-01-18",
  "due_date": "2026-01-25",
  "estimated_duration": 16,
  "dependencies": {
    "blocks": ["MTH-005"],
    "blocked_by": [],
    "related": ["MTH-002"]
  },
  "watchers": ["user-123", "user-456"],
  "policy_compliance": {
    "security_review": true,
    "testing_required": true,
    "documentation_required": true,
    "code_review_required": true
  },
  "engagement": {
    "views": 42,
    "total_read_time": 300,
    "view_history": [
      {
        "user_id": "user-123",
        "user_name": "Claude",
        "timestamp": "2026-01-18T10:00:00.000Z",
        "read_time": 60
      }
    ]
  },
  "metadata": {
    "created_at": "2026-01-18T10:00:00.000Z",
    "updated_at": "2026-01-18T10:30:00.000Z",
    "version": 3
  }
}
```

### List Issues

```http
GET /api/tracker/worktrees/:worktreeId/boards/:boardId/issues
```

**Query Parameters:**
- `status` - Filter by status (backlog, todo, in_progress, review, done)
- `type` - Filter by type (epic, story, task, bug)
- `priority` - Filter by priority (critical, high, medium, low)
- `parent_id` - Filter by parent issue ID
- `assignee` - Filter by assignee ID
- `initiative_id` - Filter by initiative
- `team_id` - Filter by team
- `epic_id` - Filter by epic
- `release_id` - Filter by release
- `start_date_gte` - Start date greater than or equal to (ISO 8601)
- `end_date_lte` - End date less than or equal to (ISO 8601)

**Examples:**

```http
# Get all tasks in progress
GET /api/tracker/worktrees/martha-dev-v4/boards/phase1/issues?type=task&status=in_progress

# Get all issues assigned to a user
GET /api/tracker/worktrees/martha-dev-v4/boards/phase1/issues?assignee=user-123

# Get all sub-tasks of an epic
GET /api/tracker/worktrees/martha-dev-v4/boards/phase1/issues?parent_id=MTH-001

# Get issues for a specific release
GET /api/tracker/worktrees/martha-dev-v4/boards/phase1/issues?release_id=v2.0.0
```

**Response:**

```json
{
  "issues": [...],
  "count": 42
}
```

### Get Issue

```http
GET /api/tracker/worktrees/:worktreeId/boards/:boardId/issues/:issueId
```

**Response:** Single issue object

### Create Issue

```http
POST /api/tracker/worktrees/:worktreeId/boards/:boardId/issues
Content-Type: application/json

{
  "title": "Implement drag and drop for timeline",
  "type": "task",
  "description": "Add drag and drop functionality to timeline view",
  "status": "backlog",
  "priority": "high",
  "parent_id": "MTH-001",
  "assignee": {
    "id": "user-123",
    "name": "Claude",
    "avatar": ""
  },
  "labels": ["frontend", "timeline"],
  "initiative_id": "init-001",
  "team_ids": ["team-frontend"],
  "story_points": 3,
  "epic_id": "MTH-001",
  "release_id": "v2.0.0",
  "start_date": "2026-01-20",
  "due_date": "2026-01-22",
  "estimated_duration": 8
}
```

**Request Body:**
- `title` (string, required) - Issue title
- `type` (enum, optional) - Type: epic, story, task, bug (default: task)
- `description` (string, optional) - Markdown description
- `status` (string, optional) - Status (default: backlog)
- `priority` (enum, optional) - Priority: critical, high, medium, low (default: medium)
- `parent_id` (string, optional) - Parent issue ID
- `assignee` (object, optional) - Assignee details
- `labels` (array, optional) - Label strings
- `initiative_id` (string, optional) - Initiative ID
- `team_ids` (array, optional) - Team IDs
- `story_points` (number, optional) - Story points estimate
- `epic_id` (string, optional) - Epic ID
- `release_id` (string, optional) - Release ID
- `start_date` (string, optional) - Start date (ISO 8601)
- `due_date` (string, optional) - Due date (ISO 8601)
- `estimated_duration` (number, optional) - Estimated hours
- `dependencies` (object, optional) - Dependency relationships
- `watchers` (array, optional) - User IDs watching this issue

**Response:** `201 Created` with full issue object

### Update Issue

```http
PATCH /api/tracker/worktrees/:worktreeId/boards/:boardId/issues/:issueId
Content-Type: application/json

{
  "status": "in_progress",
  "priority": "critical",
  "assignee": {
    "id": "user-456",
    "name": "Another User",
    "avatar": ""
  }
}
```

**Request Body:** Any subset of issue fields (partial update)

**Response:** `200 OK` with updated issue object

### Move Issue (Change Status)

```http
POST /api/tracker/worktrees/:worktreeId/boards/:boardId/issues/:issueId/move
Content-Type: application/json

{
  "status": "done",
  "index": 0
}
```

**Request Body:**
- `status` (string, required) - New status
- `index` (number, optional) - Position in new column

**Response:** `200 OK` with updated issue

### Delete Issue

```http
DELETE /api/tracker/worktrees/:worktreeId/boards/:boardId/issues/:issueId
```

**Response:** `204 No Content`

### Add Dependency

```http
POST /api/tracker/worktrees/:worktreeId/boards/:boardId/issues/:issueId/dependencies
Content-Type: application/json

{
  "target_issue_id": "MTH-005",
  "type": "blocks"
}
```

**Request Body:**
- `target_issue_id` (string, required) - Target issue ID
- `type` (enum, required) - Dependency type: blocks, blocked_by, related

**Response:** `201 Created`

```json
{
  "blocks": ["MTH-005"],
  "blocked_by": [],
  "related": ["MTH-002"]
}
```

### Remove Dependency

```http
DELETE /api/tracker/worktrees/:worktreeId/boards/:boardId/issues/:issueId/dependencies/:dependencyId?type=blocks
```

**Query Parameters:**
- `type` (enum, required) - Dependency type: blocks, blocked_by, related

**Response:** `204 No Content`

### Add Watcher

```http
POST /api/tracker/worktrees/:worktreeId/boards/:boardId/issues/:issueId/watchers
Content-Type: application/json

{
  "user_id": "user-789"
}
```

**Response:** `201 Created`

```json
{
  "watchers": ["user-123", "user-456", "user-789"]
}
```

### Remove Watcher

```http
DELETE /api/tracker/worktrees/:worktreeId/boards/:boardId/issues/:issueId/watchers/:userId
```

**Response:** `204 No Content`

### Log Time Entry

```http
POST /api/tracker/worktrees/:worktreeId/boards/:boardId/issues/:issueId/time-entries
Content-Type: application/json

{
  "user_id": "user-123",
  "user_name": "Claude",
  "hours": 2.5,
  "description": "Implemented drag and drop",
  "date": "2026-01-18"
}
```

**Request Body:**
- `user_id` (string, required) - User ID
- `user_name` (string, required) - User name
- `hours` (number, required) - Hours worked
- `description` (string, required) - Work description
- `date` (string, optional) - Date of work (ISO 8601, defaults to today)

**Response:** `201 Created`

```json
{
  "id": "time-abc123",
  "issue_id": "MTH-002",
  "user_id": "user-123",
  "user_name": "Claude",
  "hours": 2.5,
  "description": "Implemented drag and drop",
  "date": "2026-01-18",
  "created_at": "2026-01-18T14:30:00.000Z"
}
```

### Get Time Entries

```http
GET /api/tracker/worktrees/:worktreeId/boards/:boardId/issues/:issueId/time-entries
```

**Response:**

```json
{
  "entries": [...],
  "count": 5
}
```

### Delete Time Entry

```http
DELETE /api/tracker/worktrees/:worktreeId/boards/:boardId/issues/:issueId/time-entries/:entryId
```

**Response:** `204 No Content`

### Record View (Engagement Tracking)

```http
POST /api/tracker/worktrees/:worktreeId/boards/:boardId/issues/:issueId/engagement/record-view
Content-Type: application/json

{
  "user_id": "user-123",
  "user_name": "Claude",
  "read_time": 60,
  "session_id": "session-abc123"
}
```

**Request Body:**
- `user_id` (string, required) - User ID
- `user_name` (string, required) - User name
- `read_time` (number, optional) - Seconds spent reading (default: 0)
- `session_id` (string, optional) - Session identifier

**Response:** `201 Created`

---

## Initiatives

Initiatives group related work across multiple issues and boards.

### List Initiatives

```http
GET /api/tracker/worktrees/:worktreeId/initiatives
```

**Response:**

```json
{
  "initiatives": [
    {
      "id": "init-001",
      "worktree_id": "martha-dev-v4",
      "name": "Timeline & Gantt Views",
      "description": "Add advanced visualization views",
      "goal": "Enable better project planning",
      "status": "in_progress",
      "start_date": "2026-01-15",
      "end_date": "2026-02-15",
      "owner": {
        "id": "user-123",
        "name": "Claude",
        "avatar": ""
      },
      "team_ids": ["team-frontend", "team-design"],
      "created_at": "2026-01-15T10:00:00.000Z",
      "updated_at": "2026-01-18T10:00:00.000Z"
    }
  ],
  "count": 1
}
```

### Get Initiative

```http
GET /api/tracker/worktrees/:worktreeId/initiatives/:initiativeId
```

### Create Initiative

```http
POST /api/tracker/worktrees/:worktreeId/initiatives
Content-Type: application/json

{
  "id": "init-002",
  "name": "Mobile App",
  "description": "Native mobile applications",
  "goal": "Extend platform to mobile",
  "status": "planning",
  "start_date": "2026-03-01",
  "end_date": "2026-06-30",
  "owner": {
    "id": "user-123",
    "name": "Claude",
    "avatar": ""
  },
  "team_ids": ["team-mobile"]
}
```

### Update Initiative

```http
PATCH /api/tracker/worktrees/:worktreeId/initiatives/:initiativeId
```

### Delete Initiative

```http
DELETE /api/tracker/worktrees/:worktreeId/initiatives/:initiativeId
```

**Response:** `204 No Content`

---

## Teams

Teams organize people working on issues.

### List Teams

```http
GET /api/tracker/worktrees/:worktreeId/teams
```

**Response:**

```json
{
  "teams": [
    {
      "id": "team-frontend",
      "worktree_id": "martha-dev-v4",
      "name": "Frontend Team",
      "description": "React and UI development",
      "members": [
        {
          "id": "user-123",
          "name": "Claude",
          "role": "developer",
          "avatar": ""
        }
      ],
      "created_at": "2026-01-15T10:00:00.000Z",
      "updated_at": "2026-01-18T10:00:00.000Z"
    }
  ],
  "count": 1
}
```

### Get Team

```http
GET /api/tracker/worktrees/:worktreeId/teams/:teamId
```

### Create Team

```http
POST /api/tracker/worktrees/:worktreeId/teams
Content-Type: application/json

{
  "id": "team-backend",
  "name": "Backend Team",
  "description": "API and database development",
  "members": [
    {
      "id": "user-456",
      "name": "Developer",
      "role": "developer",
      "avatar": ""
    }
  ]
}
```

### Update Team

```http
PATCH /api/tracker/worktrees/:worktreeId/teams/:teamId
```

### Delete Team

```http
DELETE /api/tracker/worktrees/:worktreeId/teams/:teamId
```

**Response:** `204 No Content`

---

## Releases

Releases group issues for version management.

### List Releases

```http
GET /api/tracker/worktrees/:worktreeId/releases
```

**Response:**

```json
{
  "releases": [
    {
      "id": "v2.0.0",
      "worktree_id": "martha-dev-v4",
      "name": "Version 2.0",
      "description": "Major feature release",
      "version": "2.0.0",
      "status": "in_progress",
      "release_date": "2026-02-28",
      "created_at": "2026-01-15T10:00:00.000Z",
      "updated_at": "2026-01-18T10:00:00.000Z"
    }
  ],
  "count": 1
}
```

### Get Release

```http
GET /api/tracker/worktrees/:worktreeId/releases/:releaseId
```

### Create Release

```http
POST /api/tracker/worktrees/:worktreeId/releases
Content-Type: application/json

{
  "id": "v2.1.0",
  "name": "Version 2.1",
  "description": "Minor feature release",
  "version": "2.1.0",
  "status": "planned",
  "release_date": "2026-03-31"
}
```

### Update Release

```http
PATCH /api/tracker/worktrees/:worktreeId/releases/:releaseId
```

### Delete Release

```http
DELETE /api/tracker/worktrees/:worktreeId/releases/:releaseId
```

**Response:** `204 No Content`

---

## Comments

Comments allow collaboration on issues.

### List Comments

```http
GET /api/tracker/worktrees/:worktreeId/issues/:issueId/comments
```

**Response:**

```json
{
  "comments": [
    {
      "id": "comment-abc123",
      "issue_id": "MTH-001",
      "author": {
        "id": "user-123",
        "name": "Claude",
        "avatar": ""
      },
      "content": "This looks good! Let's proceed.",
      "created_at": "2026-01-18T10:00:00.000Z",
      "updated_at": "2026-01-18T10:00:00.000Z"
    }
  ],
  "count": 1
}
```

### Create Comment

```http
POST /api/tracker/worktrees/:worktreeId/issues/:issueId/comments
Content-Type: application/json

{
  "author": {
    "id": "user-123",
    "name": "Claude",
    "avatar": ""
  },
  "content": "Great work on this feature!"
}
```

### Update Comment

```http
PATCH /api/tracker/worktrees/:worktreeId/issues/:issueId/comments/:commentId
Content-Type: application/json

{
  "content": "Updated comment text"
}
```

### Delete Comment

```http
DELETE /api/tracker/worktrees/:worktreeId/issues/:issueId/comments/:commentId
```

**Response:** `204 No Content`

---

## Activity

Activity log tracks all changes to issues.

### List Activity

```http
GET /api/tracker/worktrees/:worktreeId/issues/:issueId/activity
```

**Response:**

```json
{
  "activities": [
    {
      "id": "activity-abc123",
      "issue_id": "MTH-001",
      "actor": {
        "id": "user-123",
        "name": "Claude"
      },
      "action": "status_changed",
      "changes": [
        {
          "field": "status",
          "old_value": "todo",
          "new_value": "in_progress"
        }
      ],
      "metadata": {
        "ip_address": "127.0.0.1"
      },
      "timestamp": "2026-01-18T10:00:00.000Z"
    }
  ],
  "count": 1
}
```

**Activity Types:**
- `created` - Issue created
- `updated` - General update
- `status_changed` - Status changed
- `assigned` - Assignee changed
- `priority_changed` - Priority changed
- `commented` - Comment added
- `dependency_added` - Dependency added
- `dependency_removed` - Dependency removed

---

## Documentation

Documentation can be linked to issues, epics, or boards.

### List Documentation

```http
GET /api/tracker/worktrees/:worktreeId/documentation
```

**Query Parameters:**
- `type` - Filter by type (overview, technical_spec, api_reference, guide, troubleshooting)
- `issue_id` - Filter by issue
- `tags` - Filter by tags (comma-separated)
- `search` - Search in title and content

**Response:**

```json
{
  "documentation": [
    {
      "id": "doc-abc123",
      "worktree_id": "martha-dev-v4",
      "issue_id": "MTH-001",
      "type": "technical_spec",
      "title": "Timeline View Technical Specification",
      "content": "# Timeline View\n\n## Architecture\n...",
      "tags": ["frontend", "timeline", "spec"],
      "links": {
        "related_issues": ["MTH-001", "MTH-002"],
        "related_docs": ["doc-def456"],
        "external_links": ["https://docs.example.com"]
      },
      "metadata": {
        "created_at": "2026-01-18T10:00:00.000Z",
        "updated_at": "2026-01-18T10:00:00.000Z",
        "author": "user-123",
        "version": 1
      }
    }
  ],
  "count": 1
}
```

### Get Documentation

```http
GET /api/tracker/worktrees/:worktreeId/documentation/:docId
```

### Create Documentation

```http
POST /api/tracker/worktrees/:worktreeId/documentation
Content-Type: application/json

{
  "issue_id": "MTH-001",
  "type": "technical_spec",
  "title": "Implementation Specification",
  "content": "# Implementation\n\n## Overview\n...",
  "author": "user-123",
  "tags": ["spec", "implementation"],
  "links": {
    "related_issues": ["MTH-001"],
    "external_links": ["https://docs.example.com"]
  }
}
```

### Update Documentation

```http
PATCH /api/tracker/worktrees/:worktreeId/documentation/:docId
Content-Type: application/json

{
  "content": "Updated content...",
  "tags": ["spec", "implementation", "updated"]
}
```

### Delete Documentation

```http
DELETE /api/tracker/worktrees/:worktreeId/documentation/:docId
```

**Response:** `204 No Content`

### Link Documentation

```http
POST /api/tracker/worktrees/:worktreeId/documentation/:docId/link
Content-Type: application/json

{
  "target_doc_id": "doc-xyz789"
}
```

Or link to an issue:

```json
{
  "issue_id": "MTH-002"
}
```

---

## Statistics

Get statistics for worktrees and boards.

### Get Worktree Statistics

```http
GET /api/tracker/worktrees/:worktreeId/statistics
```

**Response:**

```json
{
  "total_issues": 42,
  "by_type": {
    "epic": 5,
    "story": 12,
    "task": 20,
    "bug": 5
  },
  "by_status": {
    "backlog": 10,
    "todo": 8,
    "in_progress": 5,
    "review": 3,
    "done": 16
  },
  "by_priority": {
    "critical": 2,
    "high": 10,
    "medium": 20,
    "low": 10
  },
  "completion_rate": 38.1,
  "average_cycle_time": 72,
  "total_story_points": 150,
  "completed_story_points": 60
}
```

### Get Board Statistics

```http
GET /api/tracker/worktrees/:worktreeId/boards/:boardId/statistics
```

**Response:** Similar to worktree statistics, scoped to board

---

## Error Handling

All errors return a consistent JSON format:

```json
{
  "error": "Error message here",
  "code": "ERROR_CODE",
  "details": {
    "field": "Additional context"
  }
}
```

### HTTP Status Codes

- `200 OK` - Successful GET, PATCH
- `201 Created` - Successful POST
- `204 No Content` - Successful DELETE
- `400 Bad Request` - Invalid request body or parameters
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `409 Conflict` - Resource already exists or conflict
- `422 Unprocessable Entity` - Validation failed
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error
- `503 Service Unavailable` - Service temporarily unavailable

### Common Error Codes

- `INVALID_REQUEST` - Malformed request
- `RESOURCE_NOT_FOUND` - Resource doesn't exist
- `DUPLICATE_RESOURCE` - Resource already exists
- `VALIDATION_ERROR` - Validation failed
- `DEPENDENCY_CYCLE` - Circular dependency detected
- `RATE_LIMIT_EXCEEDED` - Too many requests

### Example Error Responses

**404 Not Found:**

```json
{
  "error": "Issue not found",
  "code": "RESOURCE_NOT_FOUND"
}
```

**400 Bad Request:**

```json
{
  "error": "Invalid request body",
  "code": "VALIDATION_ERROR",
  "details": {
    "title": "Title is required",
    "type": "Must be one of: epic, story, task, bug"
  }
}
```

**409 Conflict:**

```json
{
  "error": "Dependency would create a cycle",
  "code": "DEPENDENCY_CYCLE",
  "details": {
    "path": ["MTH-001", "MTH-002", "MTH-003", "MTH-001"]
  }
}
```

---

## Rate Limiting

API requests are rate-limited to prevent abuse:

- **Per User:** 1000 requests per hour
- **Per IP:** 5000 requests per hour
- **Per Endpoint:** Varies by resource intensity

Rate limit headers included in responses:

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 950
X-RateLimit-Reset: 1642522800
```

When rate limit is exceeded, returns `429 Too Many Requests`:

```json
{
  "error": "Rate limit exceeded",
  "code": "RATE_LIMIT_EXCEEDED",
  "retry_after": 3600
}
```

---

## Best Practices

### 1. Use Hierarchical Routes

Always use the full hierarchical path for clarity:

```http
✅ GET /api/tracker/worktrees/martha-dev-v4/boards/phase1/issues/MTH-001
❌ GET /api/tracker/issues/MTH-001
```

### 2. Batch Operations

For multiple updates, consider batching:

```http
POST /api/tracker/worktrees/:id/boards/:id/issues/batch-update
Content-Type: application/json

{
  "issue_ids": ["MTH-001", "MTH-002", "MTH-003"],
  "updates": {
    "status": "in_progress"
  }
}
```

### 3. Filtering

Use query parameters for filtering instead of client-side filtering:

```http
✅ GET /api/tracker/.../issues?status=in_progress&priority=high
❌ GET /api/tracker/.../issues (then filter client-side)
```

### 4. Pagination

For large datasets, use pagination:

```http
GET /api/tracker/.../issues?limit=50&offset=100
```

### 5. Partial Updates

Use PATCH for partial updates, not PUT:

```http
✅ PATCH /api/tracker/.../issues/MTH-001 {"status": "done"}
❌ PUT /api/tracker/.../issues/MTH-001 {entire issue object}
```

### 6. Idempotency

For critical operations, use idempotency keys:

```http
POST /api/tracker/.../issues
Content-Type: application/json
X-Idempotency-Key: unique-key-123

{...}
```

### 7. Webhooks

Subscribe to webhooks for real-time updates instead of polling:

```http
POST /api/tracker/webhooks
Content-Type: application/json

{
  "url": "https://your-server.com/webhook",
  "events": ["issue.created", "issue.updated", "issue.deleted"]
}
```

---

## Examples

### Complete Workflow Example

```bash
# 1. Create worktree
curl -X POST http://localhost:20000/api/tracker/worktrees \
  -H "Content-Type: application/json" \
  -d '{
    "id": "my-project",
    "name": "my-project",
    "display_name": "My Project",
    "description": "Project description",
    "path": "/path/to/project"
  }'

# 2. Create board
curl -X POST http://localhost:20000/api/tracker/worktrees/my-project/boards \
  -H "Content-Type: application/json" \
  -d '{
    "id": "main",
    "name": "Main Board",
    "description": "Primary development board"
  }'

# 3. Create epic
EPIC=$(curl -X POST http://localhost:20000/api/tracker/worktrees/my-project/boards/main/issues \
  -H "Content-Type: application/json" \
  -d '{
    "title": "User Authentication",
    "type": "epic",
    "description": "Complete authentication system",
    "priority": "high"
  }' | jq -r '.id')

# 4. Create sub-tasks
curl -X POST http://localhost:20000/api/tracker/worktrees/my-project/boards/main/issues \
  -H "Content-Type: application/json" \
  -d "{
    \"title\": \"Implement login API\",
    \"type\": \"task\",
    \"parent_id\": \"$EPIC\",
    \"priority\": \"high\"
  }"

# 5. Move task to in progress
curl -X POST http://localhost:20000/api/tracker/worktrees/my-project/boards/main/issues/MTH-002/move \
  -H "Content-Type: application/json" \
  -d '{"status": "in_progress"}'

# 6. Log time
curl -X POST http://localhost:20000/api/tracker/worktrees/my-project/boards/main/issues/MTH-002/time-entries \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user-123",
    "user_name": "Developer",
    "hours": 4,
    "description": "Implemented login endpoint"
  }'

# 7. Add comment
curl -X POST http://localhost:20000/api/tracker/worktrees/my-project/issues/MTH-002/comments \
  -H "Content-Type: application/json" \
  -d '{
    "author": {"id": "user-123", "name": "Developer", "avatar": ""},
    "content": "Login endpoint complete, ready for review"
  }'

# 8. Complete task
curl -X POST http://localhost:20000/api/tracker/worktrees/my-project/boards/main/issues/MTH-002/move \
  -H "Content-Type: application/json" \
  -d '{"status": "done"}'
```

---

## Changelog

### Version 2.0 (2026-01-18)

- Added multi-worktree support
- Added multi-board support
- Added initiatives, teams, releases
- Added dependencies (blocks, blocked_by, related)
- Added watchers
- Added engagement tracking
- Added time tracking
- Added policy compliance
- Enhanced filtering capabilities
- Added hierarchical routing

### Version 1.0 (2025-12-01)

- Initial release
- Basic issue tracking
- Single board kanban
- Comments and activity

---

## Support

For issues, questions, or feature requests:

- **GitHub Issues:** https://github.com/heyarchie-ai/martha.dev-v4/issues
- **Documentation:** https://docs.martha.dev
- **Email:** support@martha.dev

---

**Last Updated:** 2026-01-18
**API Version:** 2.0
**License:** MIT
