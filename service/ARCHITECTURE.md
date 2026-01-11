# Worktree Monitoring Service - Real-Time Streaming Architecture

**Status:** Design Phase → Implementation
**Date:** 2026-01-11
**Version:** 2.0.0 (Streaming Service)

---

## 🎯 Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│  Central Monitoring Service (FastAPI + WebSockets)          │
│  Port: 9000                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  WebSocket   │  │  Redis       │  │  PostgreSQL  │      │
│  │  Hub         │  │  Pub/Sub     │  │  Storage     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└───────────┬─────────────────────────────────┬───────────────┘
            │                                 │
   ┌────────▼────────┐               ┌───────▼────────┐
   │  Worktree       │               │  Client Apps    │
   │  Agents         │               │                 │
   ├─────────────────┤               ├─────────────────┤
   │ • copilot       │               │ • Mac Menu Bar  │
   │ • excel         │               │ • iOS/Android   │
   │ • teams         │               │ • Web Dashboard │
   │ • comms         │               │ • CLI Client    │
   └─────────────────┘               └─────────────────┘
```

---

## 📡 Communication Flow

### 1. Worktree Agent → Service
- **Protocol:** WebSocket (persistent connection)
- **Events:** Git changes, container status, PR updates, health checks
- **Heartbeat:** Every 10 seconds
- **Reconnect:** Automatic with exponential backoff

### 2. Service → Clients
- **Protocol:** WebSocket (Server-Sent Events fallback)
- **Events:** Aggregated from all worktrees + system events
- **Filtering:** Clients can subscribe to specific worktrees
- **Replay:** Last 100 events on connection

### 3. Service → Worktree Agent
- **Commands:** Restart containers, pull git, run health checks
- **Updates:** Hot-reload agent code without restart
- **Configuration:** Dynamic config updates

---

## 🔌 API Specification

### WebSocket Endpoints

#### `/ws/agent/{worktree_name}`
**Purpose:** Worktree agents connect here
**Authentication:** JWT token or API key
**Events Sent (Agent → Service):**
```json
{
  "type": "git.commit",
  "worktree": "copilot-integration",
  "timestamp": "2026-01-11T14:30:00Z",
  "data": {
    "hash": "abc123",
    "message": "Fix auth bug",
    "files_changed": 3
  }
}

{
  "type": "container.status",
  "worktree": "copilot-integration",
  "timestamp": "2026-01-11T14:30:05Z",
  "data": {
    "container": "archie-copilot-integration-api",
    "status": "running",
    "health": "healthy",
    "uptime_seconds": 3600
  }
}

{
  "type": "pr.updated",
  "worktree": "copilot-integration",
  "timestamp": "2026-01-11T14:30:10Z",
  "data": {
    "pr_number": 1401,
    "status": "open",
    "reviews_approved": 2,
    "mergeable": true
  }
}

{
  "type": "health.check",
  "worktree": "copilot-integration",
  "timestamp": "2026-01-11T14:30:15Z",
  "data": {
    "postgres": {"status": "healthy", "latency_ms": 2},
    "redis": {"status": "healthy", "latency_ms": 1},
    "api": {"status": "healthy", "latency_ms": 45}
  }
}
```

**Commands Received (Service → Agent):**
```json
{
  "command": "restart_container",
  "container": "api",
  "request_id": "req_123"
}

{
  "command": "git_pull",
  "request_id": "req_124"
}

{
  "command": "update_agent",
  "version": "2.1.0",
  "download_url": "https://...",
  "request_id": "req_125"
}
```

#### `/ws/client/{client_id}`
**Purpose:** Client applications connect here
**Authentication:** Session token or API key
**Events Sent (Service → Client):**
```json
{
  "type": "worktree.event",
  "worktree": "copilot-integration",
  "event_type": "git.commit",
  "timestamp": "2026-01-11T14:30:00Z",
  "data": { ... }
}

{
  "type": "system.alert",
  "severity": "warning",
  "message": "copilot-integration API health check failed",
  "timestamp": "2026-01-11T14:30:20Z"
}

{
  "type": "worktree.summary",
  "worktrees": [
    {
      "name": "copilot-integration",
      "status": "healthy",
      "pr_number": 1401,
      "uncommitted": 2,
      "containers": {
        "api": "healthy",
        "postgres": "healthy",
        "redis": "degraded"
      }
    }
  ]
}
```

**Commands Sent (Client → Service):**
```json
{
  "command": "subscribe",
  "worktrees": ["copilot-integration", "excel-sidebar-epics"]
}

{
  "command": "restart_container",
  "worktree": "copilot-integration",
  "container": "api"
}

{
  "command": "get_history",
  "worktree": "copilot-integration",
  "limit": 50
}
```

### REST API Endpoints

#### `GET /api/v1/worktrees`
**Purpose:** List all registered worktrees
**Response:**
```json
{
  "worktrees": [
    {
      "name": "copilot-integration",
      "status": "online",
      "last_seen": "2026-01-11T14:30:00Z",
      "agent_version": "2.0.0",
      "ports": {"postgres": 4000, "redis": 4001, "api": 4002}
    }
  ]
}
```

#### `GET /api/v1/worktrees/{name}/events`
**Purpose:** Get historical events for a worktree
**Query Params:** `?limit=100&offset=0&type=git.commit`

#### `POST /api/v1/worktrees/{name}/actions`
**Purpose:** Execute action on worktree
**Body:**
```json
{
  "action": "restart_container",
  "container": "api"
}
```

#### `GET /api/v1/health`
**Purpose:** Service health check
**Response:**
```json
{
  "status": "healthy",
  "worktrees_online": 4,
  "clients_connected": 2,
  "redis_status": "connected",
  "postgres_status": "connected"
}
```

---

## 🏗️ Component Architecture

### Central Service Components

#### 1. WebSocket Hub (`service/hub.py`)
- Manages all WebSocket connections
- Routes events between agents and clients
- Handles subscriptions and filters
- Connection pooling and load balancing

#### 2. Event Processor (`service/processor.py`)
- Receives events from agents
- Validates and enriches events
- Publishes to Redis Pub/Sub
- Stores in PostgreSQL for history

#### 3. Redis Pub/Sub Bridge (`service/pubsub.py`)
- Subscribes to Redis channels
- Broadcasts to connected clients
- Handles message queuing
- Dead letter queue for failed deliveries

#### 4. Storage Layer (`service/storage.py`)
- PostgreSQL for event history
- Time-series optimization
- Retention policies (7 days default)
- Query API for historical data

#### 5. Agent Manager (`service/agent_manager.py`)
- Tracks connected agents
- Heartbeat monitoring
- Command dispatch
- Agent version management

### Per-Worktree Agent Components

#### 1. Event Collector (`agent/collector.py`)
- Watches git repository (file system events)
- Monitors Docker containers (Docker API)
- Polls GitHub API (PRs, reviews)
- Health checks (HTTP, PostgreSQL, Redis)

#### 2. WebSocket Client (`agent/client.py`)
- Persistent connection to service
- Automatic reconnection with backoff
- Event queue for offline scenarios
- Command handler

#### 3. Action Executor (`agent/executor.py`)
- Executes commands from service
- Docker operations (restart, logs)
- Git operations (pull, status)
- Self-update mechanism

---

## 🔐 Security

### Authentication
- **Agents:** API keys (per worktree)
- **Clients:** JWT tokens (OAuth2/session-based)
- **Service:** TLS/SSL for all connections

### Authorization
- **Agents:** Can only report for their worktree
- **Clients:** Can subscribe to authorized worktrees only
- **Commands:** Role-based access control

### Data Privacy
- Sensitive data (tokens, passwords) never logged
- Event data retention (7 days)
- Client IP logging (for security audits)

---

## 📊 Event Types

### Git Events
- `git.commit` - New commit detected
- `git.push` - Push to remote
- `git.pull` - Pull from remote
- `git.merge` - Merge operation
- `git.conflict` - Merge conflict detected
- `git.branch` - Branch change

### Container Events
- `container.start` - Container started
- `container.stop` - Container stopped
- `container.crash` - Container crashed
- `container.restart` - Container restarted
- `container.health` - Health check result

### PR Events
- `pr.created` - PR opened
- `pr.updated` - PR updated
- `pr.reviewed` - Review submitted
- `pr.merged` - PR merged
- `pr.closed` - PR closed
- `pr.conflict` - PR has conflicts

### System Events
- `system.alert` - System-level alert
- `system.startup` - Agent started
- `system.shutdown` - Agent stopped
- `system.error` - Error occurred

### Health Events
- `health.check` - Periodic health check
- `health.degraded` - Service degraded
- `health.recovered` - Service recovered

---

## 🚀 Deployment

### Service Deployment
```bash
# Option 1: Docker Compose (Development)
cd ~/.claude/worktree-monitor/service
docker-compose up -d

# Option 2: Systemd Service (Production)
sudo systemctl enable worktree-monitor-service
sudo systemctl start worktree-monitor-service
```

### Agent Deployment (Per Worktree)
```bash
# Automatic via service
curl -X POST http://localhost:9000/api/v1/agents/deploy \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"worktree": "copilot-integration"}'

# Manual
cd /mnt/data/archie-platform-v2-worktrees/copilot-integration
./start-agent.sh
```

### Client Applications
- **Mac App:** Download from service `/downloads/mac`
- **iOS App:** TestFlight or App Store
- **Web Dashboard:** Access at `http://localhost:9000`
- **CLI Client:** `npm install -g @archie/worktree-cli`

---

## 📱 Client Implementations

### Mac Menu Bar App (Electron)
- Real-time notifications
- Quick container restart
- Git status overview
- One-click PR review

### iOS/Android App (React Native)
- Push notifications
- Worktree health dashboard
- Remote container management
- Git activity timeline

### Web Dashboard (React)
- Multi-worktree overview
- Event timeline
- Container logs viewer
- PR management

### CLI Client (Python/Node)
```bash
# Watch events in real-time
worktree-monitor watch copilot-integration

# Get status
worktree-monitor status

# Restart container
worktree-monitor restart copilot-integration api

# View logs
worktree-monitor logs copilot-integration api
```

---

## 🔄 Migration from v1.0

1. **Service Installation**
   ```bash
   cd ~/.claude/worktree-monitor/service
   pip install -r requirements.txt
   python service.py
   ```

2. **Deploy Agents** (automatically updates old polling agent)
   ```bash
   # Service automatically converts old agent to new streaming agent
   ./scripts/migrate-agents.sh
   ```

3. **Client Setup**
   ```bash
   # Mac client
   brew install --cask archie-worktree-monitor

   # CLI client
   npm install -g @archie/worktree-cli
   ```

4. **Verify**
   ```bash
   # Check service is running
   curl http://localhost:9000/health

   # Check agents are connected
   curl http://localhost:9000/api/v1/worktrees
   ```

---

## 🎯 Benefits Over v1.0

| Feature | v1.0 (Polling) | v2.0 (Streaming) |
|---------|----------------|------------------|
| **Latency** | 30 seconds | Real-time (<1s) |
| **Architecture** | Single daemon | Distributed service |
| **Clients** | Terminal only | Mac/iOS/Web/CLI |
| **Updates** | Restart agent | Hot-reload |
| **Scalability** | 4 worktrees max | Unlimited |
| **Remote Access** | No | Yes (anywhere) |
| **History** | None | 7 days in DB |
| **Alerts** | Log only | Push notifications |

---

## 📈 Performance Targets

- **Event Latency:** <100ms from agent to clients
- **Connection Capacity:** 100+ clients per service instance
- **Event Throughput:** 1000+ events/second
- **Memory Usage:** <200MB per service instance
- **Agent Footprint:** <50MB per worktree

---

**Next:** Implementation Phase → Start with central service, then agents, then clients
