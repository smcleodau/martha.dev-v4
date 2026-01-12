# Martha TypeScript Service - API Documentation

Complete API reference for the Martha TypeScript Service v3.0.0

**Base URL:** `http://localhost:21000`

---

## Table of Contents

- [Health & Status Endpoints](#health--status-endpoints)
- [Worktree Management](#worktree-management)
- [WebSocket API](#websocket-api)
- [Event System](#event-system)
- [Error Responses](#error-responses)

---

## Health & Status Endpoints

### GET /health

Basic health check endpoint.

**Response 200:**
```json
{
  "status": "healthy",
  "service": "martha-typescript",
  "version": "3.0.0",
  "worktree": "typescript-rewrite",
  "timestamp": "2026-01-12T07:00:00.000Z"
}
```

**cURL Example:**
```bash
curl http://localhost:21000/health
```

---

### GET /health/detailed

Detailed health check with dependency status.

**Response 200:**
```json
{
  "status": "healthy",
  "service": "martha-typescript",
  "version": "3.0.0",
  "worktree": "typescript-rewrite",
  "timestamp": "2026-01-12T07:00:00.000Z",
  "dependencies": {
    "database": "healthy",
    "redis": "healthy"
  }
}
```

**Response 503:** (if dependencies fail)
```json
{
  "status": "unhealthy",
  "service": "martha-typescript",
  "dependencies": {
    "database": "unhealthy",
    "redis": "healthy"
  }
}
```

**cURL Example:**
```bash
curl http://localhost:21000/health/detailed
```

---

### GET /ready

Kubernetes readiness probe.

**Response 200:**
```json
{
  "status": "ready"
}
```

---

### GET /live

Kubernetes liveness probe.

**Response 200:**
```json
{
  "status": "alive"
}
```

---

## Worktree Management

### GET /api/v1/worktrees

List all registered worktrees with status.

**Response 200:**
```json
{
  "worktrees": [
    {
      "name": "typescript-rewrite",
      "status": "online",
      "lastSeen": "2026-01-12T07:00:00.000Z",
      "agentVersion": "3.0.0",
      "ports": {
        "api": 21000,
        "postgres": 21005
      },
      "health": {
        "api": "healthy",
        "postgres": "healthy"
      }
    }
  ],
  "total": 1,
  "online": 1,
  "offline": 0
}
```

**cURL Example:**
```bash
curl http://localhost:21000/api/v1/worktrees
```

---

### GET /api/v1/worktrees/:name

Get status of a specific worktree.

**Parameters:**
- `name` (path, required) - Worktree name

**Response 200:**
```json
{
  "name": "typescript-rewrite",
  "status": "online",
  "lastSeen": "2026-01-12T07:00:00.000Z",
  "agentVersion": "3.0.0",
  "ports": {
    "api": 21000
  },
  "health": {}
}
```

**Response 404:**
```json
{
  "error": "Worktree not found",
  "worktree": "nonexistent"
}
```

**cURL Example:**
```bash
curl http://localhost:21000/api/v1/worktrees/typescript-rewrite
```

---

### GET /api/v1/worktrees/:name/events

Get recent events for a worktree.

**Parameters:**
- `name` (path, required) - Worktree name
- `limit` (query, optional) - Number of events to return (default: 100, max: 1000)
- `offset` (query, optional) - Pagination offset (default: 0)
- `type` (query, optional) - Filter by event type (e.g., "git.commit")

**Response 200:**
```json
{
  "worktree": "typescript-rewrite",
  "events": [
    {
      "type": "git.commit",
      "worktree": "typescript-rewrite",
      "timestamp": "2026-01-12T07:00:00.000Z",
      "data": {
        "hash": "b65ab2c",
        "message": "Implement worktree agent system (Phase 3)",
        "branch": "feature/typescript-rewrite"
      }
    },
    {
      "type": "git.uncommitted",
      "worktree": "typescript-rewrite",
      "timestamp": "2026-01-12T06:59:50.000Z",
      "data": {
        "count": 2
      }
    }
  ],
  "total": 2,
  "limit": 100,
  "offset": 0
}
```

**cURL Examples:**
```bash
# Get last 10 events
curl "http://localhost:21000/api/v1/worktrees/typescript-rewrite/events?limit=10"

# Filter by event type
curl "http://localhost:21000/api/v1/worktrees/typescript-rewrite/events?type=git.commit"

# Pagination
curl "http://localhost:21000/api/v1/worktrees/typescript-rewrite/events?limit=50&offset=50"
```

---

### GET /api/v1/agents

List all connected agents.

**Response 200:**
```json
{
  "agents": [
    {
      "worktree": "typescript-rewrite",
      "status": "online",
      "lastSeen": "2026-01-12T07:00:00.000Z",
      "version": "3.0.0"
    }
  ],
  "total": 1
}
```

**cURL Example:**
```bash
curl http://localhost:21000/api/v1/agents
```

---

### GET /api/v1/clients

List all connected clients.

**Response 200:**
```json
{
  "clients": [
    {
      "clientId": "client-123",
      "connectedAt": "2026-01-12T06:55:00.000Z",
      "subscriptions": ["typescript-rewrite", "main"]
    }
  ],
  "total": 1
}
```

**cURL Example:**
```bash
curl http://localhost:21000/api/v1/clients
```

---

## WebSocket API

### WS /ws/agent/:worktree

Agent connection endpoint for worktree monitoring agents.

**Connection:**
```javascript
const ws = new WebSocket('ws://localhost:21000/ws/agent/typescript-rewrite');
```

**Agent → Service (Send Events):**

Agent sends events to the service in this format:

```json
{
  "type": "git.commit",
  "timestamp": "2026-01-12T07:00:00.000Z",
  "data": {
    "hash": "b65ab2c",
    "message": "Implement worktree agent",
    "branch": "feature/typescript-rewrite"
  }
}
```

**Service → Agent (Receive Commands):**

Service can send commands to agents:

```json
{
  "command": "restart_container",
  "container": "archie-typescript-rewrite-api",
  "request_id": "req-123"
}
```

**Supported Commands:**
- `restart_container` - Restart a Docker container
- `git_pull` - Pull latest changes from Git
- `health_check` - Perform health checks on demand

**Event Types Sent by Agent:**
- `agent.startup` - Agent connected
- `git.branch` - Branch changed
- `git.commit` - New commit detected
- `git.uncommitted` - Uncommitted files count
- `container.status` - Container status changed
- `container.detected` - New container detected
- `health.check` - Health check result

**Example (Node.js):**
```javascript
import WebSocket from 'ws';

const ws = new WebSocket('ws://localhost:21000/ws/agent/my-worktree');

ws.on('open', () => {
  // Send startup event
  ws.send(JSON.stringify({
    type: 'agent.startup',
    timestamp: new Date().toISOString(),
    data: {
      agent_version: '3.0.0',
      worktree: 'my-worktree',
      path: '/path/to/worktree',
      ports: { api: 30000 }
    }
  }));
});

ws.on('message', (data) => {
  const command = JSON.parse(data.toString());
  console.log('Received command:', command);
});
```

---

### WS /ws/client/:clientId

Client connection endpoint for receiving real-time events.

**Connection:**
```javascript
const ws = new WebSocket('ws://localhost:21000/ws/client/dashboard-123');
```

**Client → Service (Subscribe to Worktrees):**

```json
{
  "action": "subscribe",
  "worktrees": ["typescript-rewrite", "main"]
}
```

**Service → Client (Receive Events):**

Client receives events from subscribed worktrees:

```json
{
  "type": "event",
  "worktree": "typescript-rewrite",
  "event": {
    "type": "git.commit",
    "worktree": "typescript-rewrite",
    "timestamp": "2026-01-12T07:00:00.000Z",
    "data": {
      "hash": "b65ab2c",
      "message": "Implement worktree agent"
    }
  }
}
```

**Example (Browser):**
```javascript
const ws = new WebSocket('ws://localhost:21000/ws/client/dashboard');

ws.onopen = () => {
  // Subscribe to worktrees
  ws.send(JSON.stringify({
    action: 'subscribe',
    worktrees: ['typescript-rewrite']
  }));
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log('Event received:', message);
};
```

---

## Event System

### Event Format

All events follow a standardized format:

```typescript
interface AgentEvent {
  type: string;              // Event type (e.g., "git.commit")
  worktree?: string;         // Worktree name (added by service)
  timestamp?: string;        // ISO 8601 timestamp
  data: Record<string, any>; // Event-specific data
}
```

### Event Types

#### Git Events

**`git.branch`** - Branch changed
```json
{
  "type": "git.branch",
  "data": {
    "old_branch": "main",
    "new_branch": "feature/new-feature"
  }
}
```

**`git.commit`** - New commit detected
```json
{
  "type": "git.commit",
  "data": {
    "hash": "b65ab2c",
    "message": "Implement feature",
    "branch": "feature/new-feature"
  }
}
```

**`git.uncommitted`** - Uncommitted files
```json
{
  "type": "git.uncommitted",
  "data": {
    "count": 5
  }
}
```

#### Docker Events

**`container.status`** - Container status changed
```json
{
  "type": "container.status",
  "data": {
    "container": "archie-typescript-rewrite-api",
    "old_status": "running",
    "new_status": "exited",
    "health": "unhealthy"
  }
}
```

**`container.detected`** - New container detected
```json
{
  "type": "container.detected",
  "data": {
    "container": "archie-typescript-rewrite-postgres",
    "status": "running",
    "health": null
  }
}
```

#### Health Events

**`health.check`** - Health check result
```json
{
  "type": "health.check",
  "data": {
    "service": "api",
    "port": 21000,
    "status": "healthy"
  }
}
```

#### Agent Events

**`agent.startup`** - Agent connected
```json
{
  "type": "agent.startup",
  "data": {
    "agent_version": "3.0.0",
    "worktree": "typescript-rewrite",
    "path": "/path/to/worktree",
    "ports": { "api": 21000 }
  }
}
```

---

## Error Responses

### Standard Error Format

```json
{
  "error": "Error message",
  "statusCode": 404,
  "details": "Optional additional details"
}
```

### HTTP Status Codes

- **200 OK** - Request successful
- **201 Created** - Resource created
- **400 Bad Request** - Invalid request format or parameters
- **404 Not Found** - Resource not found
- **500 Internal Server Error** - Server error
- **503 Service Unavailable** - Service or dependencies unavailable

---

## Rate Limiting

Currently no rate limiting is implemented. Future versions may add rate limiting per client.

---

## Authentication

Currently no authentication is required. Future versions will add:
- API key authentication for external clients
- JWT tokens for MCP tools
- WebSocket authentication

---

## Versioning

API version is included in the path: `/api/v1/...`

Current version: **v1**

---

## Support

For issues or questions:
- Check service logs: `/mnt/data/martha.dev-v4-worktrees/typescript-rewrite/logs/`
- View dashboard: http://localhost:21004
- Check health: http://localhost:21000/health/detailed

---

**Last Updated:** 2026-01-12
**Version:** 3.0.0
