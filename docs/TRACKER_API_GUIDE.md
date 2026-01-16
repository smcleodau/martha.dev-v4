# Tracker API Guide for Communications Service

**Base URL:** `http://localhost:20000/api/tracker`

This guide shows how the communications-service can use Martha's tracker API to create epics, issues, and documentation with cross-linking.

## Authentication

Currently no authentication required for local development.

## Quick Start Example

```bash
# 1. Create a worktree for communications-service
curl -X POST http://localhost:20000/api/tracker/worktrees \
  -H "Content-Type: application/json" \
  -d '{
    "id": "communications-service",
    "name": "communications-service",
    "display_name": "Communications Service",
    "description": "AI-powered communications platform",
    "path": "/mnt/data/archie-platform-v2-worktrees/communications-service",
    "github_repo": "heyarchie-ai/archie-platform-v2"
  }'

# 2. Create a board
curl -X POST http://localhost:20000/api/tracker/worktrees/communications-service/boards \
  -H "Content-Type: application/json" \
  -d '{
    "id": "backend-api",
    "name": "Backend API",
    "description": "FastAPI backend development"
  }'

# 3. Create an epic
curl -X POST http://localhost:20000/api/tracker/worktrees/communications-service/boards/backend-api/issues \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Teams Integration Enhancement",
    "type": "epic",
    "description": "Add advanced Teams capabilities including media bot, reactions, and file handling",
    "priority": "high",
    "status": "backlog",
    "labels": ["teams", "integration"]
  }'

# Response: {"id": "MTH-001", ...}

# 4. Create documentation for the epic
curl -X POST http://localhost:20000/api/tracker/worktrees/communications-service/issues/MTH-001/documentation \
  -H "Content-Type: application/json" \
  -d '{
    "type": "technical_spec",
    "title": "Teams Integration Technical Specification",
    "content": "# Teams Integration\n\n## Overview\n...",
    "author": "comms-service-agent",
    "tags": ["teams", "integration", "spec"]
  }'

# 5. Create a task under the epic
curl -X POST http://localhost:20000/api/tracker/worktrees/communications-service/boards/backend-api/issues \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Implement media bot capabilities",
    "type": "task",
    "parent_id": "MTH-001",
    "description": "Add support for media bot in Teams conversations",
    "priority": "high",
    "status": "todo",
    "labels": ["teams", "media-bot"]
  }'
```

## API Reference

### Worktrees

#### Create Worktree
```http
POST /worktrees
Content-Type: application/json

{
  "id": "communications-service",
  "name": "communications-service",
  "display_name": "Communications Service",
  "description": "AI-powered communications platform",
  "path": "/mnt/data/archie-platform-v2-worktrees/communications-service",
  "github_repo": "heyarchie-ai/archie-platform-v2"
}
```

**Response:**
```json
{
  "id": "communications-service",
  "name": "communications-service",
  "display_name": "Communications Service",
  "description": "AI-powered communications platform",
  "path": "/mnt/data/archie-platform-v2-worktrees/communications-service",
  "github_repo": "heyarchie-ai/archie-platform-v2",
  "boards": [],
  "created_at": "2026-01-16T10:00:00.000Z",
  "updated_at": "2026-01-16T10:00:00.000Z"
}
```

#### List Worktrees
```http
GET /worktrees
```

#### Get Worktree
```http
GET /worktrees/:worktreeId
```

**Response includes board details:**
```json
{
  "id": "communications-service",
  "name": "communications-service",
  "boards": ["backend-api", "integrations", "infrastructure"],
  "boards_detail": [
    {
      "id": "backend-api",
      "name": "Backend API",
      "columns": [...],
      ...
    }
  ],
  ...
}
```

### Boards

#### Create Board
```http
POST /worktrees/:worktreeId/boards
Content-Type: application/json

{
  "id": "backend-api",
  "name": "Backend API",
  "description": "FastAPI backend development"
}
```

**Optional: Custom columns**
```json
{
  "id": "backend-api",
  "name": "Backend API",
  "description": "FastAPI backend development",
  "columns": [
    {"id": "backlog", "name": "Backlog", "color": "#6B7280", "wip_limit": null, "issue_ids": []},
    {"id": "todo", "name": "To Do", "color": "#3B82F6", "wip_limit": null, "issue_ids": []},
    {"id": "in_progress", "name": "In Progress", "color": "#F59E0B", "wip_limit": 3, "issue_ids": []},
    {"id": "review", "name": "Review", "color": "#8B5CF6", "wip_limit": null, "issue_ids": []},
    {"id": "done", "name": "Done", "color": "#10B981", "wip_limit": null, "issue_ids": []}
  ]
}
```

#### List Boards
```http
GET /worktrees/:worktreeId/boards
```

#### Get Board
```http
GET /worktrees/:worktreeId/boards/:boardId
```

### Issues (Epics, Stories, Tasks, Bugs)

#### Create Issue
```http
POST /worktrees/:worktreeId/boards/:boardId/issues
Content-Type: application/json

{
  "title": "Implement email service",
  "type": "task",
  "description": "Add Gmail API integration for email sending",
  "status": "backlog",
  "priority": "high",
  "parent_id": null,
  "labels": ["email", "integration"],
  "assignee": {
    "id": "agent-1",
    "name": "Claude Agent",
    "avatar": ""
  }
}
```

**Types:** `epic`, `story`, `task`, `bug`
**Priorities:** `critical`, `high`, `medium`, `low`
**Default statuses:** `backlog`, `todo`, `in_progress`, `review`, `done`

**Response:**
```json
{
  "id": "MTH-001",
  "worktree_id": "communications-service",
  "board_id": "backend-api",
  "type": "task",
  "title": "Implement email service",
  "description": "Add Gmail API integration for email sending",
  "status": "backlog",
  "priority": "high",
  "parent_id": null,
  "assignee": {"id": "agent-1", "name": "Claude Agent", "avatar": ""},
  "labels": ["email", "integration"],
  "quality": {"coverage": 0, "checklist": []},
  "time_tracking": {"estimated_hours": null, "logged_hours": 0},
  "links": {"pr": null, "related_issues": [], "external": []},
  "documentation": {"overview": null, "technical_spec": null, "related_docs": []},
  "github_sync": {"issue_number": null, "last_synced": null, "dirty": true},
  "metadata": {
    "created_at": "2026-01-16T10:00:00.000Z",
    "updated_at": "2026-01-16T10:00:00.000Z",
    "version": 1
  }
}
```

#### List Issues
```http
GET /worktrees/:worktreeId/boards/:boardId/issues
GET /worktrees/:worktreeId/boards/:boardId/issues?status=todo
GET /worktrees/:worktreeId/boards/:boardId/issues?type=epic
GET /worktrees/:worktreeId/boards/:boardId/issues?parent_id=MTH-001
```

#### Get Issue
```http
GET /worktrees/:worktreeId/boards/:boardId/issues/:issueId
```

#### Update Issue
```http
PATCH /worktrees/:worktreeId/boards/:boardId/issues/:issueId
Content-Type: application/json

{
  "status": "in_progress",
  "description": "Updated description"
}
```

#### Move Issue (Change Status)
```http
POST /worktrees/:worktreeId/boards/:boardId/issues/:issueId/move
Content-Type: application/json

{
  "status": "in_progress"
}
```

#### Delete Issue
```http
DELETE /worktrees/:worktreeId/boards/:boardId/issues/:issueId
```

### Documentation

#### Create Documentation
```http
POST /worktrees/:worktreeId/documentation
Content-Type: application/json

{
  "type": "technical_spec",
  "title": "Teams Integration Architecture",
  "content": "# Teams Integration\n\n## Overview\n...",
  "author": "comms-service-agent",
  "tags": ["teams", "architecture", "integration"],
  "links": {
    "related_issues": ["MTH-001", "MTH-002"],
    "related_docs": [],
    "external_links": ["https://docs.microsoft.com/teams"]
  }
}
```

**Documentation Types:**
- `overview` - High-level overview
- `technical_spec` - Technical specifications
- `api_reference` - API documentation
- `guide` - How-to guides
- `troubleshooting` - Troubleshooting guides

**Response:**
```json
{
  "id": "doc-1234567890-abc",
  "worktree_id": "communications-service",
  "type": "technical_spec",
  "title": "Teams Integration Architecture",
  "content": "# Teams Integration\n\n## Overview\n...",
  "tags": ["teams", "architecture", "integration"],
  "links": {
    "related_issues": ["MTH-001", "MTH-002"],
    "related_docs": [],
    "external_links": ["https://docs.microsoft.com/teams"]
  },
  "metadata": {
    "created_at": "2026-01-16T10:00:00.000Z",
    "updated_at": "2026-01-16T10:00:00.000Z",
    "author": "comms-service-agent",
    "version": 1
  }
}
```

#### Create Documentation for Issue
```http
POST /worktrees/:worktreeId/issues/:issueId/documentation
Content-Type: application/json

{
  "type": "technical_spec",
  "title": "Implementation Spec",
  "content": "## Implementation Details\n...",
  "author": "comms-service-agent",
  "tags": ["spec", "implementation"]
}
```

This auto-links the documentation to the issue.

#### Get Documentation for Issue
```http
GET /worktrees/:worktreeId/issues/:issueId/documentation
```

Returns all documentation associated with an issue.

#### List Documentation
```http
GET /worktrees/:worktreeId/documentation
GET /worktrees/:worktreeId/documentation?type=technical_spec
GET /worktrees/:worktreeId/documentation?issue_id=MTH-001
GET /worktrees/:worktreeId/documentation?tags=teams,integration
GET /worktrees/:worktreeId/documentation?search=media+bot
```

#### Get Documentation
```http
GET /worktrees/:worktreeId/documentation/:docId
```

#### Update Documentation
```http
PATCH /worktrees/:worktreeId/documentation/:docId
Content-Type: application/json

{
  "content": "Updated content...",
  "tags": ["teams", "integration", "updated"]
}
```

#### Link Documentation to Another Doc
```http
POST /worktrees/:worktreeId/documentation/:docId/link
Content-Type: application/json

{
  "target_doc_id": "doc-1234567890-xyz"
}
```

#### Link Documentation to Issue
```http
POST /worktrees/:worktreeId/documentation/:docId/link
Content-Type: application/json

{
  "issue_id": "MTH-001"
}
```

#### Delete Documentation
```http
DELETE /worktrees/:worktreeId/documentation/:docId
```

## Complete Workflow Example

### Scenario: Create an Epic with Sub-Tasks and Documentation

```bash
# 1. Create epic
EPIC=$(curl -X POST http://localhost:20000/api/tracker/worktrees/communications-service/boards/backend-api/issues \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Email Service Implementation",
    "type": "epic",
    "description": "Complete email service with Gmail, Outlook, and SMTP support",
    "priority": "high",
    "status": "backlog",
    "labels": ["email", "epic"]
  }' | jq -r '.id')

echo "Epic ID: $EPIC"

# 2. Create technical spec for the epic
SPEC=$(curl -X POST http://localhost:20000/api/tracker/worktrees/communications-service/issues/$EPIC/documentation \
  -H "Content-Type: application/json" \
  -d "{
    \"type\": \"technical_spec\",
    \"title\": \"Email Service Technical Specification\",
    \"content\": \"# Email Service\\n\\n## Architecture\\n\\n- Gmail API integration\\n- Outlook API integration\\n- SMTP fallback\\n\\n## Components\\n\\n1. Email Provider Interface\\n2. Gmail Provider\\n3. Outlook Provider\\n4. SMTP Provider\",
    \"author\": \"comms-service-agent\",
    \"tags\": [\"email\", \"spec\", \"architecture\"]
  }" | jq -r '.id')

echo "Spec ID: $SPEC"

# 3. Create overview document
OVERVIEW=$(curl -X POST http://localhost:20000/api/tracker/worktrees/communications-service/documentation \
  -H "Content-Type: application/json" \
  -d "{
    \"issue_id\": \"$EPIC\",
    \"type\": \"overview\",
    \"title\": \"Email Service Overview\",
    \"content\": \"# Email Service Overview\\n\\nThis epic implements a multi-provider email service.\",
    \"author\": \"comms-service-agent\",
    \"tags\": [\"email\", \"overview\"],
    \"links\": {
      \"related_issues\": [\"$EPIC\"]
    }
  }" | jq -r '.id')

# 4. Link overview to technical spec
curl -X POST http://localhost:20000/api/tracker/worktrees/communications-service/documentation/$OVERVIEW/link \
  -H "Content-Type: application/json" \
  -d "{\"target_doc_id\": \"$SPEC\"}"

# 5. Create sub-tasks
TASK1=$(curl -X POST http://localhost:20000/api/tracker/worktrees/communications-service/boards/backend-api/issues \
  -H "Content-Type: application/json" \
  -d "{
    \"title\": \"Implement Gmail provider\",
    \"type\": \"task\",
    \"parent_id\": \"$EPIC\",
    \"description\": \"Implement Gmail API integration\",
    \"priority\": \"high\",
    \"status\": \"todo\",
    \"labels\": [\"email\", \"gmail\"]
  }" | jq -r '.id')

TASK2=$(curl -X POST http://localhost:20000/api/tracker/worktrees/communications-service/boards/backend-api/issues \
  -H "Content-Type: application/json" \
  -d "{
    \"title\": \"Implement Outlook provider\",
    \"type\": \"task\",
    \"parent_id\": \"$EPIC\",
    \"description\": \"Implement Outlook API integration\",
    \"priority\": \"high\",
    \"status\": \"todo\",
    \"labels\": [\"email\", \"outlook\"]
  }" | jq -r '.id')

echo "Tasks created: $TASK1, $TASK2"

# 6. Get all issues for the epic
curl "http://localhost:20000/api/tracker/worktrees/communications-service/boards/backend-api/issues?parent_id=$EPIC" | jq

# 7. Get all documentation for the epic
curl "http://localhost:20000/api/tracker/worktrees/communications-service/issues/$EPIC/documentation" | jq
```

## Use Cases for Communications Service

### 1. Create Epic from GitHub Issue
```javascript
// Comms-service agent receives GitHub issue
const githubIssue = {...};

// Create epic in tracker
const epic = await fetch('http://localhost:20000/api/tracker/worktrees/communications-service/boards/backend-api/issues', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    title: githubIssue.title,
    type: 'epic',
    description: githubIssue.body,
    priority: 'high',
    labels: githubIssue.labels.map(l => l.name)
  })
}).then(r => r.json());

// Create technical spec
await fetch(`http://localhost:20000/api/tracker/worktrees/communications-service/issues/${epic.id}/documentation`, {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    type: 'technical_spec',
    title: `Technical Spec: ${epic.title}`,
    content: generateSpec(githubIssue),
    author: 'comms-service-agent',
    tags: ['spec', 'auto-generated']
  })
});
```

### 2. Link Related Documentation
```javascript
// Create multiple related docs and link them
const overview = await createDoc({type: 'overview', ...});
const techSpec = await createDoc({type: 'technical_spec', ...});
const apiRef = await createDoc({type: 'api_reference', ...});

// Link overview to tech spec
await fetch(`http://localhost:20000/api/tracker/worktrees/communications-service/documentation/${overview.id}/link`, {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({target_doc_id: techSpec.id})
});

// Link tech spec to API reference
await fetch(`http://localhost:20000/api/tracker/worktrees/communications-service/documentation/${techSpec.id}/link`, {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({target_doc_id: apiRef.id})
});
```

### 3. Search and Update Documentation
```javascript
// Search for documentation
const results = await fetch('http://localhost:20000/api/tracker/worktrees/communications-service/documentation?search=teams+integration')
  .then(r => r.json());

// Update documentation
await fetch(`http://localhost:20000/api/tracker/worktrees/communications-service/documentation/${results.documentation[0].id}`, {
  method: 'PATCH',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    content: updatedContent
  })
});
```

## Error Responses

All endpoints return standard error responses:

```json
{
  "error": "Error message here"
}
```

**Status codes:**
- `200 OK` - Success
- `201 Created` - Resource created
- `204 No Content` - Resource deleted
- `400 Bad Request` - Invalid request body
- `404 Not Found` - Resource not found
- `409 Conflict` - Resource already exists
- `500 Internal Server Error` - Server error

## Next Steps

1. The communications-service can now:
   - Create worktrees for projects
   - Create boards for different aspects (backend, integrations, etc.)
   - Create epics, stories, and tasks
   - Add documentation with cross-linking
   - Search and filter documentation
   - Link documentation to issues and other docs

2. Recommended workflow:
   - Create worktree on first use
   - Create boards as needed
   - When GitHub issues come in, create epics
   - Generate technical specs and link to epics
   - Create sub-tasks under epics
   - Link all related documentation together
