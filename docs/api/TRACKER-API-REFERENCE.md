# Martha Tracker API Reference

**Base URL**: `http://localhost:20000/api/tracker`

This document provides comprehensive API documentation for the Martha Tracker system for integration with the orchestration repository.

## Table of Contents

- [Issues API](#issues-api)
- [Dependencies API](#dependencies-api)
- [Releases API](#releases-api)
- [Statistics API](#statistics-api)
- [Teams API](#teams-api)
- [Initiatives API](#initiatives-api)
- [Data Models](#data-models)

---

## Issues API

### List Issues

**Endpoint**: `GET /worktrees/:worktreeId/boards/:boardId/issues`

**Description**: Retrieve all issues for a specific board.

**Response**:
```json
{
  "issues": [
    {
      "id": "MTH-001",
      "worktree_id": "default",
      "board_id": "default",
      "type": "epic",
      "title": "Calculator Application",
      "description": "Build a web-based calculator...",
      "status": "backlog",
      "priority": "high",
      "parent_id": null,
      "epic_id": null,
      "release_id": null,
      "story_points": null,
      "dependencies": {
        "blocks": [],
        "blocked_by": [],
        "related": []
      },
      "metadata": {
        "created_at": "2026-01-18T21:55:18.623Z",
        "updated_at": "2026-01-18T21:55:18.623Z",
        "version": 1
      }
    }
  ],
  "count": 7
}
```

### Get Issue

**Endpoint**: `GET /worktrees/:worktreeId/boards/:boardId/issues/:issueId`

**Description**: Retrieve a specific issue by ID.

**Response**: Single issue object (see above)

### Create Issue

**Endpoint**: `POST /worktrees/:worktreeId/boards/:boardId/issues`

**Description**: Create a new issue.

**Request Body**:
```json
{
  "title": "Implement basic arithmetic operations",
  "type": "story",
  "status": "backlog",
  "priority": "high",
  "parent_id": "MTH-001",
  "epic_id": "MTH-001",
  "description": "Implement core arithmetic operations...",
  "story_points": 5,
  "assignee": null,
  "labels": [],
  "start_date": null,
  "due_date": null
}
```

**Valid Types**: `epic`, `story`, `task`, `bug`

**Valid Statuses**: `backlog`, `todo`, `in-progress`, `in-review`, `done`

**Valid Priorities**: `low`, `medium`, `high`, `critical`

**Response**: Created issue object with auto-generated ID

### Update Issue

**Endpoint**: `PATCH /worktrees/:worktreeId/boards/:boardId/issues/:issueId`

**Description**: Update an existing issue. Only include fields you want to change.

**Request Body**:
```json
{
  "status": "in-progress",
  "assignee": "agent-123",
  "release_id": "REL-IX9H6P"
}
```

**Response**: Updated issue object with incremented version number

### Delete Issue

**Endpoint**: `DELETE /worktrees/:worktreeId/boards/:boardId/issues/:issueId`

**Description**: Delete an issue.

**Response**: 204 No Content

---

## Dependencies API

### Add Dependency

**Endpoint**: `POST /worktrees/:worktreeId/boards/:boardId/issues/:issueId/dependencies`

**Description**: Create a dependency relationship between issues.

**Request Body**:
```json
{
  "type": "blocked_by",
  "target_issue_id": "MTH-002"
}
```

**Valid Dependency Types**:
- `blocks` - This issue blocks another issue
- `blocked_by` - This issue is blocked by another issue
- `related` - This issue is related to another issue

**Response**:
```json
{
  "issue_id": "MTH-005",
  "blocks": [],
  "blocked_by": ["MTH-002"],
  "related": []
}
```

### Remove Dependency

**Endpoint**: `DELETE /worktrees/:worktreeId/boards/:boardId/issues/:issueId/dependencies/:targetIssueId`

**Description**: Remove a dependency relationship.

**Query Parameters**:
- `type` (required): Dependency type to remove (`blocks`, `blocked_by`, or `related`)

**Example**: `DELETE /worktrees/default/boards/default/issues/MTH-005/dependencies/MTH-002?type=blocked_by`

**Response**:
```json
{
  "issue_id": "MTH-005",
  "blocks": [],
  "blocked_by": [],
  "related": []
}
```

---

## Releases API

### List Releases

**Endpoint**: `GET /worktrees/:worktreeId/releases`

**Description**: Get all releases for a worktree.

**Response**:
```json
{
  "releases": [
    {
      "id": "REL-IX9H6P",
      "worktree_id": "default",
      "name": "Calculator v1.0",
      "version": "1.0.0",
      "target_date": "2026-02-01",
      "description": "Initial release...",
      "status": "planning",
      "gates": [...],
      "created_at": "2026-01-18T21:56:30.109Z",
      "updated_at": "2026-01-18T21:56:59.783Z",
      "version_number": 2
    }
  ],
  "count": 1
}
```

### Get Release

**Endpoint**: `GET /worktrees/:worktreeId/releases/:releaseId`

**Description**: Get a specific release by ID.

**Response**: Single release object

### Create Release

**Endpoint**: `POST /worktrees/:worktreeId/releases`

**Description**: Create a new release with quality gates.

**Request Body**:
```json
{
  "name": "Calculator v1.0",
  "version": "1.0.0",
  "target_date": "2026-02-01",
  "description": "Initial release of the calculator application",
  "status": "planning"
}
```

**Valid Statuses**: `planning`, `in_progress`, `testing`, `released`, `cancelled`

**Response**: Created release with auto-generated quality gates:
- Security Review (required)
- Testing Complete (required)
- Documentation Updated (required)
- Code Review (required)

### Update Release

**Endpoint**: `PATCH /worktrees/:worktreeId/releases/:releaseId`

**Description**: Update release metadata.

**Request Body**:
```json
{
  "status": "in_progress",
  "target_date": "2026-02-15"
}
```

**Response**: Updated release object

### Delete Release

**Endpoint**: `DELETE /worktrees/:worktreeId/releases/:releaseId`

**Description**: Delete a release.

**Response**: 204 No Content

### Update Quality Gate

**Endpoint**: `PATCH /worktrees/:worktreeId/releases/:releaseId/gates/:gateId`

**Description**: Update the status of a quality gate.

**Gate IDs**: `security`, `testing`, `documentation`, `code-review`

**Request Body**:
```json
{
  "status": "passed",
  "metadata": {
    "notes": "Security scan completed, no vulnerabilities found",
    "completed_by": "agent-security-001",
    "completed_at": "2026-01-18T21:56:00.000Z"
  }
}
```

**Valid Gate Statuses**: `pending`, `passed`, `failed`, `skipped`

**Response**: Updated release object with modified gate

### Get Release Statistics

**Endpoint**: `GET /worktrees/:worktreeId/releases/:releaseId/stats`

**Description**: Get statistics about a release's readiness.

**Response**:
```json
{
  "total_issues": 2,
  "completed_issues": 0,
  "in_progress_issues": 1,
  "pending_issues": 1,
  "completion_percentage": 0,
  "gates_passed": 1,
  "gates_failed": 0,
  "gates_pending": 3,
  "gates_total": 4,
  "required_gates_passed": 1,
  "required_gates_total": 4,
  "ready_for_release": false
}
```

**Ready for Release Criteria**:
- All required quality gates must be `passed`
- All issues assigned to release must be `done`

---

## Statistics API

### Get Worktree Statistics

**Endpoint**: `GET /worktrees/:worktreeId/statistics`

**Description**: Get aggregated statistics for the entire worktree.

**Response**:
```json
{
  "total_issues": 7,
  "by_status": {
    "backlog": 5,
    "todo": 1,
    "in-progress": 0,
    "in-review": 0,
    "done": 1
  },
  "by_type": {
    "epic": 1,
    "story": 3,
    "task": 2,
    "bug": 1
  },
  "by_priority": {
    "low": 0,
    "medium": 2,
    "high": 4,
    "critical": 1
  }
}
```

---

## Teams API

### List Teams

**Endpoint**: `GET /worktrees/:worktreeId/teams`

**Description**: Get all teams.

### Create Team

**Endpoint**: `POST /worktrees/:worktreeId/teams`

**Request Body**:
```json
{
  "name": "Frontend Team",
  "description": "Responsible for UI/UX implementation",
  "members": ["agent-001", "agent-002"]
}
```

### Assign Team to Issue

**Endpoint**: `PATCH /worktrees/:worktreeId/boards/:boardId/issues/:issueId`

**Request Body**:
```json
{
  "team_ids": ["team-frontend"]
}
```

---

## Initiatives API

### List Initiatives

**Endpoint**: `GET /worktrees/:worktreeId/initiatives`

**Description**: Get all strategic initiatives.

### Create Initiative

**Endpoint**: `POST /worktrees/:worktreeId/initiatives`

**Request Body**:
```json
{
  "name": "Q1 2026 Product Launch",
  "description": "Launch calculator product in Q1",
  "start_date": "2026-01-01",
  "end_date": "2026-03-31",
  "status": "active"
}
```

### Assign Initiative to Issue

**Endpoint**: `PATCH /worktrees/:worktreeId/boards/:boardId/issues/:issueId`

**Request Body**:
```json
{
  "initiative_id": "INIT-001"
}
```

---

## Data Models

### Issue Object

```typescript
interface Issue {
  id: string;                    // Auto-generated (e.g., "MTH-001")
  worktree_id: string;           // Worktree identifier
  board_id: string;              // Board identifier
  type: 'epic' | 'story' | 'task' | 'bug';
  title: string;                 // Issue title
  description: string;           // Markdown description
  status: 'backlog' | 'todo' | 'in-progress' | 'in-review' | 'done';
  priority: 'low' | 'medium' | 'high' | 'critical';
  parent_id: string | null;      // Parent issue ID
  epic_id: string | null;        // Epic this issue belongs to
  release_id: string | null;     // Release this issue is part of
  initiative_id: string | null;  // Strategic initiative
  team_ids: string[];            // Assigned teams
  assignee: string | null;       // Assigned agent/user
  story_points: number | null;   // Estimation points
  labels: string[];              // Tags/labels
  start_date: string | null;     // ISO 8601 date
  due_date: string | null;       // ISO 8601 date
  estimated_duration: number | null; // Hours

  dependencies: {
    blocks: string[];            // Issues this blocks
    blocked_by: string[];        // Issues blocking this
    related: string[];           // Related issues
  };

  quality: {
    coverage: number;            // Test coverage %
    checklist: Array<{
      id: string;
      text: string;
      completed: boolean;
    }>;
  };

  time_tracking: {
    estimated_hours: number | null;
    logged_hours: number;
  };

  links: {
    pr: string | null;           // Pull request URL
    related_issues: string[];    // External issue IDs
    external: Array<{
      url: string;
      title: string;
    }>;
  };

  documentation: {
    overview: string | null;
    technical_spec: string | null;
    related_docs: string[];
  };

  github_sync: {
    issue_number: number | null;
    last_synced: string | null;
    dirty: boolean;              // Needs sync
  };

  metadata: {
    created_at: string;          // ISO 8601 timestamp
    updated_at: string;          // ISO 8601 timestamp
    version: number;             // Optimistic locking
  };

  watchers: string[];            // User IDs watching this issue
  policy_compliance: any | null;
  engagement: {
    views: number;
    total_read_time: number;
    view_history: Array<{
      user_id: string;
      timestamp: string;
      duration: number;
    }>;
  };
}
```

### Release Object

```typescript
interface Release {
  id: string;                    // Auto-generated (e.g., "REL-IX9H6P")
  worktree_id: string;
  name: string;                  // Release name
  version: string;               // Semantic version (e.g., "1.0.0")
  target_date: string;           // ISO 8601 date
  description: string;
  status: 'planning' | 'in_progress' | 'testing' | 'released' | 'cancelled';

  gates: Array<{
    id: string;                  // e.g., "security", "testing"
    name: string;                // Display name
    type: 'security' | 'testing' | 'documentation' | 'review' | 'deployment' | 'custom';
    status: 'pending' | 'passed' | 'failed' | 'skipped';
    required: boolean;           // Must pass for release
    description: string;
    metadata?: Record<string, any>; // Gate-specific data
  }>;

  created_at: string;
  updated_at: string;
  version_number: number;        // Optimistic locking
}
```

---

## Integration Patterns for Orchestration

### 1. Issue Lifecycle Management

```typescript
// Create issue
const issue = await createIssue(worktreeId, boardId, {
  title: "Implement feature X",
  type: "story",
  status: "backlog",
  epic_id: "MTH-001"
});

// Auto-transition to todo when agent starts
await updateIssue(worktreeId, boardId, issue.id, {
  status: "todo",
  assignee: "agent-dev-001"
});

// Move to in-progress when work begins
await updateIssue(worktreeId, boardId, issue.id, {
  status: "in-progress"
});

// Update with PR link when code pushed
await updateIssue(worktreeId, boardId, issue.id, {
  links: {
    pr: "https://github.com/user/repo/pull/123"
  }
});

// Move to in-review when PR created
await updateIssue(worktreeId, boardId, issue.id, {
  status: "in-review"
});

// Move to done when PR merged
await updateIssue(worktreeId, boardId, issue.id, {
  status: "done"
});
```

### 2. Release Quality Gates

```typescript
// Update gate after test run
await updateGateStatus(worktreeId, releaseId, "testing", {
  status: "passed",
  metadata: {
    test_suite: "jest",
    coverage: 95,
    passed: 150,
    failed: 0,
    report_url: "https://..."
  }
});

// Update gate after security scan
await updateGateStatus(worktreeId, releaseId, "security", {
  status: "passed",
  metadata: {
    scanner: "snyk",
    vulnerabilities: 0,
    report_url: "https://..."
  }
});

// Check readiness before deployment
const stats = await getReleaseStats(worktreeId, releaseId);
if (stats.ready_for_release) {
  await updateRelease(worktreeId, releaseId, {
    status: "released"
  });
}
```

### 3. Dependency Management

```typescript
// Block E2E tests until UI is complete
await addDependency(worktreeId, boardId, "MTH-006", {
  type: "blocked_by",
  target_issue_id: "MTH-003"
});

// Check if issue can proceed
const issue = await getIssue(worktreeId, boardId, "MTH-006");
if (issue.dependencies.blocked_by.length > 0) {
  // Check if blockers are resolved
  for (const blockerId of issue.dependencies.blocked_by) {
    const blocker = await getIssue(worktreeId, boardId, blockerId);
    if (blocker.status !== "done") {
      console.log(`Blocked by ${blockerId} - status: ${blocker.status}`);
      return; // Can't proceed yet
    }
  }
}
```

---

## Query Patterns

### Find Issues by Release

```typescript
// Get all issues
const { issues } = await listIssues(worktreeId, boardId);

// Filter by release
const releaseIssues = issues.filter(i => i.release_id === releaseId);
```

### Find Issues by Epic

```typescript
const { issues } = await listIssues(worktreeId, boardId);
const epicIssues = issues.filter(i => i.epic_id === epicId);
```

### Find Blocked Issues

```typescript
const { issues } = await listIssues(worktreeId, boardId);
const blockedIssues = issues.filter(i =>
  i.dependencies.blocked_by.length > 0 &&
  i.status !== 'done'
);
```

### Find Ready-to-Start Issues

```typescript
const { issues } = await listIssues(worktreeId, boardId);
const readyIssues = issues.filter(i =>
  i.status === 'todo' &&
  i.dependencies.blocked_by.length === 0 &&
  i.assignee === null
);
```

---

## Error Handling

All endpoints return standard HTTP status codes:

- `200 OK` - Successful GET/PATCH
- `201 Created` - Successful POST
- `204 No Content` - Successful DELETE
- `400 Bad Request` - Invalid request body
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

Error responses include a message:

```json
{
  "error": "Issue not found"
}
```

---

## Concurrency Control

Issues and releases use optimistic locking with version numbers:

```typescript
// When updating, version is automatically incremented
const issue = await getIssue(worktreeId, boardId, issueId);
// issue.metadata.version === 1

await updateIssue(worktreeId, boardId, issueId, { status: "todo" });
// Updated issue.metadata.version === 2
```

For high-concurrency scenarios, implement retry logic on version conflicts.

---

## Best Practices

1. **Always check dependencies** before moving issues to in-progress
2. **Update quality gates** immediately after test/scan completion
3. **Link PRs** to issues as soon as they're created
4. **Use story points** for capacity planning
5. **Assign to releases** early to track scope
6. **Check release readiness** before attempting deployment
7. **Use metadata fields** to store evidence links (Braintrust, Browserbase)

---

## Next Steps for Orchestration Repo

The orchestration repository should:

1. **Call these APIs** to update issue states during workflow execution
2. **Post evidence to metadata** when collecting Braintrust/Browserbase data
3. **Update quality gates** after test orchestration completes
4. **Auto-transition issues** based on git commits and PR events
5. **Query issue dependencies** before assigning work to agents
6. **Monitor release readiness** to trigger deployment workflows

See `ORCHESTRATION-REPO-PROMPT.md` for detailed implementation guidance.
