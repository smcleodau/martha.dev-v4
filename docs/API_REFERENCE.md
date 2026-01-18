# Martha.dev v4 Platform - API Reference

**Version:** 4.0.0
**Last Updated:** January 2026
**Base URL:** `http://localhost:21009` (development) | `https://martha.arch.ie` (production)

## Table of Contents

1. [Authentication](#authentication)
2. [Health Endpoints](#health-endpoints)
3. [Telemetry API](#telemetry-api)
4. [Worktree API](#worktree-api)
5. [Workflow Management API](#workflow-management-api)
6. [Temporal Client API](#temporal-client-api)
7. [Error Responses](#error-responses)

---

## Authentication

Currently, most endpoints are unauthenticated for development. Production deployment should use:

- **JWT Tokens** for API endpoints
- **OAuth2 (GitHub)** for dashboard access
- **mTLS** for Temporal Cloud communication

### Example (Future)

```bash
# Get token
curl -X POST http://localhost:21009/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"secret"}'

# Response
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresAt": "2026-01-19T12:00:00Z"
}

# Use token
curl -H "Authorization: Bearer eyJhbGc..." http://localhost:21009/api/v1/telemetry/events
```

---

## Health Endpoints

### GET /health

Basic health check (liveness probe).

**Response**

```json
{
  "status": "ok",
  "timestamp": "2026-01-18T10:00:00Z",
  "service": "martha-orchestration",
  "version": "3.0.0"
}
```

**Example**

```bash
curl http://localhost:21009/health
```

---

### GET /health/ready

Readiness check (includes database connectivity).

**Response**

```json
{
  "ready": true,
  "timestamp": "2026-01-18T10:00:00Z"
}
```

**Example**

```bash
curl http://localhost:21009/health/ready
```

---

## Telemetry API

### GET /api/v1/telemetry/events

Query telemetry events with filtering.

**Query Parameters**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | number | 50 | Maximum events to return |
| `offset` | number | 0 | Pagination offset |
| `workflowId` | string | - | Filter by workflow ID |
| `issueId` | string | - | Filter by issue ID |
| `epicId` | string | - | Filter by epic ID |
| `category` | string | - | Event category (workflow, activity, exception) |
| `severity` | string | - | Severity level (info, warn, error, critical) |
| `startTime` | ISO 8601 | - | Start time filter |
| `endTime` | ISO 8601 | - | End time filter |

**Response**

```json
{
  "success": true,
  "events": [
    {
      "id": 12345,
      "timestamp": "2026-01-18T10:00:00.123Z",
      "workflowId": "issue-lifecycle-TASK-123",
      "workflowType": "IssueLifecycleWorkflow",
      "eventType": "activity_started",
      "eventCategory": "activity",
      "severity": "info",
      "activityName": "prepareIssue",
      "activityId": "uuid-...",
      "issueId": "TASK-123",
      "epicId": "EPIC-1",
      "agentId": null,
      "agentType": null,
      "durationMs": null,
      "errorMessage": null,
      "errorStack": null,
      "errorCode": null,
      "payload": {
        "title": "Fix bug in login",
        "complexity": 2
      },
      "source": "temporal",
      "retryAttempt": 0
    }
  ],
  "count": 1,
  "filters": {
    "limit": 50,
    "offset": 0,
    "issueId": "TASK-123"
  }
}
```

**Example**

```bash
# Get recent events
curl "http://localhost:21009/api/v1/telemetry/events?limit=10"

# Filter by issue
curl "http://localhost:21009/api/v1/telemetry/events?issueId=TASK-123"

# Filter by severity
curl "http://localhost:21009/api/v1/telemetry/events?severity=error&limit=20"

# Time range query
curl "http://localhost:21009/api/v1/telemetry/events?startTime=2026-01-18T00:00:00Z&endTime=2026-01-18T23:59:59Z"
```

---

### GET /api/v1/telemetry/agent-metrics

Get aggregated agent performance metrics.

**Query Parameters**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | number | 20 | Maximum agents to return |
| `timeRange` | string | 1h | Time range (format: `Nm`, `Nh`, `Nd`) |

**Response**

```json
{
  "success": true,
  "metrics": [
    {
      "agentId": "agent-abc123",
      "agentType": "claude-sonnet-4.5",
      "totalEvents": 247,
      "avgDurationMs": 3456,
      "errorCount": 2,
      "successRate": 99.19,
      "lastActive": "2026-01-18T10:00:00Z"
    }
  ],
  "count": 1,
  "timeRange": {
    "start": "2026-01-18T09:00:00Z",
    "end": "2026-01-18T10:00:00Z"
  }
}
```

**Example**

```bash
# Last hour (default)
curl "http://localhost:21009/api/v1/telemetry/agent-metrics"

# Last 24 hours
curl "http://localhost:21009/api/v1/telemetry/agent-metrics?timeRange=24h"

# Last 7 days, top 50 agents
curl "http://localhost:21009/api/v1/telemetry/agent-metrics?timeRange=7d&limit=50"
```

---

### GET /api/v1/telemetry/exceptions

Query exception events.

**Query Parameters**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | number | 50 | Maximum exceptions to return |
| `resolved` | boolean | - | Filter by resolved status |
| `severity` | string | - | Filter by severity |

**Response**

```json
{
  "success": true,
  "exceptions": [
    {
      "id": 1,
      "timestamp": "2026-01-18T10:00:00Z",
      "workflowId": "issue-lifecycle-TASK-123",
      "issueId": "TASK-123",
      "errorMessage": "Tests failed: 3 failures, 7 passed",
      "errorStack": "Error: Tests failed...\n  at runTests...",
      "errorCode": null,
      "severity": "error",
      "resolved": false,
      "occurrenceCount": 1
    }
  ],
  "count": 1
}
```

**Example**

```bash
# Recent exceptions
curl "http://localhost:21009/api/v1/telemetry/exceptions?limit=20"

# Critical errors only
curl "http://localhost:21009/api/v1/telemetry/exceptions?severity=critical"
```

---

### GET /api/v1/telemetry/workflows

Query workflow metadata.

**Query Parameters**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | number | 20 | Maximum workflows to return |
| `status` | string | - | Filter by status (running, completed, failed) |
| `type` | string | - | Filter by workflow type |

**Response**

```json
{
  "success": true,
  "workflows": [
    {
      "workflowId": "issue-lifecycle-TASK-123",
      "workflowType": "IssueLifecycleWorkflow",
      "issueId": "TASK-123",
      "epicId": "EPIC-1",
      "status": "completed",
      "startedAt": "2026-01-18T09:00:00Z",
      "completedAt": "2026-01-18T10:00:00Z",
      "durationMs": 3600000,
      "eventCount": 42
    }
  ],
  "count": 1
}
```

**Example**

```bash
# Recent workflows
curl "http://localhost:21009/api/v1/telemetry/workflows?limit=10"

# Running workflows only
curl "http://localhost:21009/api/v1/telemetry/workflows?status=running"

# Specific workflow type
curl "http://localhost:21009/api/v1/telemetry/workflows?type=IssueLifecycleWorkflow"
```

---

### GET /api/v1/telemetry/learning-patterns

Get ML-detected patterns (Phase 5 feature - currently mock data).

**Query Parameters**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | number | 10 | Maximum patterns to return |

**Response**

```json
{
  "success": true,
  "patterns": [
    {
      "id": "pattern-001",
      "patternType": "Performance Optimization",
      "description": "Workflows with parallel activity execution complete 3.2x faster on average",
      "confidence": 0.94,
      "occurrences": 247,
      "lastSeen": "2026-01-18T09:55:00Z",
      "impact": "high"
    }
  ],
  "count": 1
}
```

**Example**

```bash
curl "http://localhost:21009/api/v1/telemetry/learning-patterns"
```

---

### GET /api/v1/telemetry/metrics/:aggregateType

Get aggregated metrics in time buckets.

**Path Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `aggregateType` | string | Time bucket size: `1min`, `1hour`, `1day` |

**Query Parameters**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `workflowType` | string | - | Filter by workflow type |
| `category` | string | - | Filter by event category |
| `limit` | number | 100 | Maximum buckets to return |

**Response**

```json
{
  "success": true,
  "metrics": [
    {
      "bucket": "2026-01-18T10:00:00Z",
      "eventCount": 142,
      "avgDurationMs": 2345.67,
      "errorCount": 3,
      "successRate": 97.89
    }
  ],
  "count": 1,
  "aggregateType": "1min"
}
```

**Example**

```bash
# 1-minute aggregates
curl "http://localhost:21009/api/v1/telemetry/metrics/1min?limit=60"

# 1-hour aggregates for specific workflow type
curl "http://localhost:21009/api/v1/telemetry/metrics/1hour?workflowType=IssueLifecycleWorkflow"

# Daily aggregates
curl "http://localhost:21009/api/v1/telemetry/metrics/1day?limit=30"
```

---

## Worktree API

### GET /api/v1/worktrees

List all worktrees with status.

**Response**

```json
{
  "worktrees": [
    {
      "name": "martha-dev-v4",
      "branch": "feature/telemetry",
      "index": 21,
      "ports": {
        "service": 21009,
        "dashboard": 21009,
        "database": 21006,
        "redis": 21007
      },
      "status": "online",
      "baseBranch": "main",
      "repository": "martha.dev-v4",
      "isDailyBranch": false,
      "path": "/mnt/data/martha.dev-v4-orchestration",
      "lastSeen": "2026-01-18T10:00:00Z",
      "agentVersion": "3.0.0",
      "agentInfo": {
        "pid": 12345,
        "uptime": 3600
      }
    }
  ],
  "total": 1,
  "online": 1,
  "offline": 0
}
```

**Example**

```bash
curl "http://localhost:21009/api/v1/worktrees"
```

---

### GET /api/v1/worktrees/:worktree

Get specific worktree status.

**Path Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `worktree` | string | Worktree name |

**Response**

```json
{
  "name": "martha-dev-v4",
  "status": "online",
  "lastSeen": "2026-01-18T10:00:00Z",
  "agentVersion": "3.0.0",
  "agentInfo": {
    "pid": 12345,
    "uptime": 3600
  }
}
```

**Example**

```bash
curl "http://localhost:21009/api/v1/worktrees/martha-dev-v4"
```

---

### GET /api/v1/worktrees/:worktree/events

Get event history for a worktree.

**Path Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `worktree` | string | Worktree name |

**Query Parameters**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | number | 100 | Maximum events to return |
| `offset` | number | 0 | Pagination offset |

**Response**

```json
{
  "events": [
    {
      "id": "event-123",
      "timestamp": "2026-01-18T10:00:00Z",
      "type": "git_commit",
      "data": {
        "sha": "abc123",
        "message": "feat: add telemetry"
      }
    }
  ],
  "total": 42,
  "limit": 100,
  "offset": 0
}
```

**Example**

```bash
curl "http://localhost:21009/api/v1/worktrees/martha-dev-v4/events?limit=50"
```

---

## Workflow Management API

These endpoints interact with Temporal workflows (future implementation).

### POST /api/v1/workflows

Start a new workflow execution.

**Request Body**

```json
{
  "workflowType": "IssueLifecycleWorkflow",
  "workflowId": "issue-lifecycle-TASK-123",
  "input": {
    "id": "TASK-123",
    "title": "Fix login bug",
    "epicId": "EPIC-1",
    "complexity": 2
  },
  "taskQueue": "martha-tasks",
  "searchAttributes": {
    "IssueId": ["TASK-123"],
    "EpicId": ["EPIC-1"]
  }
}
```

**Response**

```json
{
  "success": true,
  "workflowId": "issue-lifecycle-TASK-123",
  "runId": "uuid-...",
  "startedAt": "2026-01-18T10:00:00Z"
}
```

**Example**

```bash
curl -X POST http://localhost:21009/api/v1/workflows \
  -H "Content-Type: application/json" \
  -d '{
    "workflowType": "IssueLifecycleWorkflow",
    "workflowId": "issue-lifecycle-TASK-123",
    "input": {
      "id": "TASK-123",
      "title": "Fix bug",
      "epicId": "EPIC-1"
    }
  }'
```

---

### POST /api/v1/workflows/:workflowId/signal

Send a signal to a running workflow.

**Path Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `workflowId` | string | Workflow ID |

**Request Body**

```json
{
  "signalName": "agentStarted",
  "args": [{
    "agentId": "agent-xyz",
    "startTime": 1705572000000
  }]
}
```

**Response**

```json
{
  "success": true,
  "workflowId": "issue-lifecycle-TASK-123",
  "signalName": "agentStarted"
}
```

**Example**

```bash
# Agent started signal
curl -X POST http://localhost:21009/api/v1/workflows/issue-lifecycle-TASK-123/signal \
  -H "Content-Type: application/json" \
  -d '{
    "signalName": "agentStarted",
    "args": [{"agentId":"agent-xyz","startTime":1705572000000}]
  }'

# Commit made signal
curl -X POST http://localhost:21009/api/v1/workflows/issue-lifecycle-TASK-123/signal \
  -H "Content-Type: application/json" \
  -d '{
    "signalName": "commitMade",
    "args": [{"sha":"abc123","message":"fix: bug","files":["app.ts"]}]
  }'

# Test results signal
curl -X POST http://localhost:21009/api/v1/workflows/issue-lifecycle-TASK-123/signal \
  -H "Content-Type: application/json" \
  -d '{
    "signalName": "testResults",
    "args": [{"passed":10,"failed":0}]
  }'

# Review approved signal
curl -X POST http://localhost:21009/api/v1/workflows/issue-lifecycle-TASK-123/signal \
  -H "Content-Type: application/json" \
  -d '{
    "signalName": "reviewApproved",
    "args": []
  }'
```

---

### GET /api/v1/workflows/:workflowId/query

Query workflow state.

**Path Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `workflowId` | string | Workflow ID |

**Query Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `queryName` | string | Query name (e.g., `getStatus`, `getMetrics`) |

**Response**

```json
{
  "success": true,
  "workflowId": "issue-lifecycle-TASK-123",
  "queryName": "getStatus",
  "result": "development"
}
```

**Example**

```bash
# Get workflow status
curl "http://localhost:21009/api/v1/workflows/issue-lifecycle-TASK-123/query?queryName=getStatus"

# Get workflow metrics
curl "http://localhost:21009/api/v1/workflows/issue-lifecycle-TASK-123/query?queryName=getMetrics"

# Get workflow history
curl "http://localhost:21009/api/v1/workflows/issue-lifecycle-TASK-123/query?queryName=getHistory"
```

---

### DELETE /api/v1/workflows/:workflowId

Cancel a running workflow.

**Path Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `workflowId` | string | Workflow ID |

**Response**

```json
{
  "success": true,
  "workflowId": "issue-lifecycle-TASK-123",
  "cancelled": true
}
```

**Example**

```bash
curl -X DELETE http://localhost:21009/api/v1/workflows/issue-lifecycle-TASK-123
```

---

## Temporal Client API

Programmatic API for interacting with Temporal workflows from TypeScript.

### getTemporalClient()

Get singleton Temporal client instance.

```typescript
import { getTemporalClient } from './temporal/client.js';

const client = await getTemporalClient();
```

---

### startWorkflow()

Start a new workflow execution.

**Signature**

```typescript
async function startWorkflow<T = any>(
  workflowType: string,
  workflowId: string,
  args: any[],
  options?: {
    taskQueue?: string;
    workflowExecutionTimeout?: number;
    searchAttributes?: Record<string, any>;
  }
): Promise<WorkflowHandle<T>>
```

**Example**

```typescript
import { startWorkflow } from './temporal/client.js';

const handle = await startWorkflow(
  'IssueLifecycleWorkflow',
  'issue-lifecycle-TASK-123',
  [{
    id: 'TASK-123',
    title: 'Fix bug',
    epicId: 'EPIC-1',
    complexity: 2,
  }],
  {
    taskQueue: 'martha-tasks',
    searchAttributes: {
      IssueId: ['TASK-123'],
      EpicId: ['EPIC-1'],
    },
  }
);

// Wait for result
const result = await handle.result();

// Or get workflow ID
console.log('Workflow ID:', handle.workflowId);
```

---

### getWorkflowHandle()

Get a handle to an existing workflow.

**Signature**

```typescript
async function getWorkflowHandle<T = any>(
  workflowId: string,
  runId?: string
): Promise<WorkflowHandle<T>>
```

**Example**

```typescript
import { getWorkflowHandle } from './temporal/client.js';

const handle = await getWorkflowHandle('issue-lifecycle-TASK-123');

// Query status
const status = await handle.query('getStatus');
console.log('Status:', status);
```

---

### signalWorkflow()

Send a signal to a workflow.

**Signature**

```typescript
async function signalWorkflow(
  workflowId: string,
  signalName: string,
  args?: any[]
): Promise<void>
```

**Example**

```typescript
import { signalWorkflow } from './temporal/client.js';

// Agent started
await signalWorkflow('issue-lifecycle-TASK-123', 'agentStarted', [{
  agentId: 'agent-xyz',
  startTime: Date.now(),
}]);

// Commit made
await signalWorkflow('issue-lifecycle-TASK-123', 'commitMade', [{
  sha: 'abc123',
  message: 'fix: bug',
  files: ['app.ts'],
}]);

// Test results
await signalWorkflow('issue-lifecycle-TASK-123', 'testResults', [{
  passed: 10,
  failed: 0,
}]);

// Review approved
await signalWorkflow('issue-lifecycle-TASK-123', 'reviewApproved');
```

---

### queryWorkflow()

Query workflow state.

**Signature**

```typescript
async function queryWorkflow<T = any>(
  workflowId: string,
  queryName: string,
  args?: any[]
): Promise<T>
```

**Example**

```typescript
import { queryWorkflow } from './temporal/client.js';

// Get status
const status = await queryWorkflow<string>('issue-lifecycle-TASK-123', 'getStatus');
console.log('Status:', status);  // "development"

// Get metrics
const metrics = await queryWorkflow('issue-lifecycle-TASK-123', 'getMetrics');
console.log('Metrics:', metrics);
// { totalCommits: 5, timeToFirstCommit: 123456, ... }

// Get history
const history = await queryWorkflow('issue-lifecycle-TASK-123', 'getHistory');
console.log('History:', history);
// [{ stage: 'preparation', timestamp: ..., event: '...', details: {...} }, ...]
```

---

### cancelWorkflow()

Cancel a running workflow (graceful).

**Signature**

```typescript
async function cancelWorkflow(workflowId: string): Promise<void>
```

**Example**

```typescript
import { cancelWorkflow } from './temporal/client.js';

await cancelWorkflow('issue-lifecycle-TASK-123');
```

---

### terminateWorkflow()

Terminate a workflow immediately (forceful).

**Signature**

```typescript
async function terminateWorkflow(
  workflowId: string,
  reason?: string
): Promise<void>
```

**Example**

```typescript
import { terminateWorkflow } from './temporal/client.js';

await terminateWorkflow('issue-lifecycle-TASK-123', 'Manual intervention required');
```

---

## Error Responses

All error responses follow this structure:

```json
{
  "success": false,
  "error": "Error message",
  "message": "Detailed error description",
  "code": "ERROR_CODE",
  "timestamp": "2026-01-18T10:00:00Z"
}
```

### HTTP Status Codes

| Code | Meaning | Example |
|------|---------|---------|
| 200 | OK | Successful request |
| 201 | Created | Workflow started |
| 400 | Bad Request | Invalid input parameters |
| 401 | Unauthorized | Missing/invalid auth token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Workflow/resource not found |
| 409 | Conflict | Workflow ID already exists |
| 500 | Internal Server Error | Server-side error |
| 503 | Service Unavailable | Database/Temporal unavailable |

### Example Error Responses

**400 Bad Request**

```json
{
  "success": false,
  "error": "Invalid input",
  "message": "workflowType is required",
  "code": "INVALID_INPUT"
}
```

**404 Not Found**

```json
{
  "success": false,
  "error": "Workflow not found",
  "message": "Workflow 'issue-lifecycle-TASK-999' does not exist",
  "code": "WORKFLOW_NOT_FOUND"
}
```

**500 Internal Server Error**

```json
{
  "success": false,
  "error": "Failed to fetch telemetry events",
  "message": "Database connection timeout",
  "code": "DATABASE_ERROR"
}
```

---

**For more information**, see:
- System Overview: `SYSTEM_OVERVIEW.md`
- Operator Runbook: `OPERATOR_RUNBOOK.md`
- Developer Guide: `DEVELOPER_GUIDE.md`
- Architecture Diagrams: `ARCHITECTURE_DIAGRAMS.md`
