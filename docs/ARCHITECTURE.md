# Martha TypeScript Service - Architecture

System architecture and design decisions for the Martha v3.0 TypeScript rewrite.

---

## System Overview

Martha is a multi-agent parallel development orchestration system that manages git worktrees, monitors services, and coordinates development workflows.

```
┌─────────────────────────────────────────────────────────────┐
│                      Martha Dashboard                        │
│                   (React + TailwindCSS)                      │
│                     Port 21004                               │
└──────────────────┬──────────────────────────────────────────┘
                   │ HTTP / WebSocket
┌──────────────────▼──────────────────────────────────────────┐
│                Martha TypeScript Service                      │
│                   (Fastify + Node.js)                        │
│                     Port 21000                               │
├───────────────────────────────────────────────────────────────┤
│  REST API  │  WebSocket  │  MCP Server  │  Event System     │
└──┬────┬────┴──────┬──────┴──────┬────────┴──────┬───────────┘
   │    │           │             │               │
   │    │           │             │               │
┌──▼────▼───┐  ┌───▼────┐   ┌────▼─────┐  ┌─────▼──────┐
│PostgreSQL │  │ Redis  │   │  Docker  │  │   GitHub   │
│Port 21005 │  │Port    │   │  Engine  │  │    API     │
│(isolated) │  │20001   │   │          │  │            │
└───────────┘  └────────┘   └──────────┘  └────────────┘
                  │
           ┌──────▼───────┐
           │  Worktree    │
           │   Agents     │
           │ (Monitoring) │
           └──────────────┘
```

---

## Core Components

### 1. Fastify Service (Port 21000)

**Purpose:** HTTP API and WebSocket server

**Responsibilities:**
- Handle REST API requests
- Manage WebSocket connections (agents + clients)
- Route events between agents and clients
- Provide health and status endpoints

**Technology:**
- Fastify 4.26 (web framework)
- @fastify/websocket (WebSocket support)
- @fastify/cors (CORS handling)

**Key Files:**
- `src/server/fastify.ts` - Server configuration
- `src/server/routes/` - API route handlers
- `src/server/websocket.ts` - WebSocket endpoints

---

### 2. Connection Manager

**Purpose:** Manage WebSocket connections and message routing

**Responsibilities:**
- Track agent connections (one per worktree)
- Track client connections (dashboards, tools)
- Manage subscriptions (clients subscribe to worktrees)
- Route messages between agents and clients
- Track worktree online/offline status

**Data Structures:**
```typescript
class ConnectionManager {
  private agents: Map<string, WebSocket>        // worktree → websocket
  private clients: Map<string, WebSocket>       // clientId → websocket
  private subscriptions: Map<string, Set<string>> // clientId → worktrees[]
  private worktrees: Map<string, WorktreeStatus>  // worktree → status
}
```

**Key Files:**
- `src/core/connection-manager.ts`

---

### 3. Event System

**Purpose:** Store, stream, and query events

**Components:**

#### Event Store (Redis)
- Stores last 1000 events per worktree
- 7-day TTL for automatic cleanup
- Query by worktree, type, or issue number

**Redis Keys:**
```
ts:events:{worktree}                 # List of events (LPUSH)
ts:events:{worktree}:{event_type}   # Filtered events
ts:events:issue:{issue_number}      # Events tagged with issue
ts:worktree:{name}:status           # Worktree status cache
```

#### Pub/Sub Manager (Redis)
- Channel-based message routing
- Multiple handlers per channel
- Automatic subscription management

**Pub/Sub Channels:**
```
ts:events                  # All events
ts:events:{worktree}       # Worktree-specific
ts:hooks                   # Claude-flow hooks
ts:swarm:{id}              # Swarm-specific
```

**Event Flow:**
```
Agent → WebSocket → Service → Event Store (Redis)
                            → Pub/Sub (Redis)
                            → Subscribed Clients (WebSocket)
```

**Key Files:**
- `src/redis/event-store.ts`
- `src/redis/pub-sub.ts`

---

### 4. Worktree Agents

**Purpose:** Monitor individual worktrees and stream events

**Deployment:** One agent process per worktree

**Collectors:**
- **GitWatcher** - Monitor Git repository (branch, commits, uncommitted files)
- **DockerWatcher** - Monitor Docker containers (status, health)
- **HealthChecker** - Check service health (API, PostgreSQL)

**Watch Loop:**
- Runs every 10 seconds
- Collects events from all collectors
- Sends events to service via WebSocket

**Commands:**
- `restart_container` - Restart a Docker container
- `git_pull` - Pull latest changes
- `health_check` - Run health checks on demand

**Key Files:**
- `src/agents/worktree-agent.ts`
- `src/agents/collectors/git-watcher.ts`
- `src/agents/collectors/docker-watcher.ts`
- `src/agents/collectors/health-checker.ts`

---

### 5. Database Layer (PostgreSQL)

**Purpose:** Persistent data storage

**Schema:** `ts_martha`

**Tables:**
- `epics` - GitHub epic tracking
- `issues` - Sub-issues linked to epics
- `worktrees` - Git worktree registry
- `swarms` - Claude-flow swarm tracking
- `test_executions` - Test run results
- `evidence` - Braintrust traces & Browserbase sessions
- `events` - Event log (Redis is primary)

**Connection Pooling:**
- Max 20 connections
- 30s idle timeout
- 5s connection timeout

**Key Files:**
- `src/database/client.ts`
- `src/database/schema.sql`
- `src/database/repositories/`

---

### 6. Dashboard (React + Vite)

**Purpose:** Web UI for monitoring and documentation

**Pages:**
- **Overview** - Service health, worktree status
- **Documentation** - Browse guides and API docs
- **Settings** - Configuration display

**Technology:**
- React 18 + TypeScript
- Vite (dev server + build)
- TailwindCSS 3 (styling)
- React Router 6 (routing)
- Axios (HTTP client)

**Color Palette:**
- Primary (Coral): `#fa7d6a`
- Accent (Turquoise): `#4db8b8`
- Secondary (Peach): `#ff9a76`

**Key Files:**
- `dashboard/src/App.tsx`
- `dashboard/src/pages/`
- `dashboard/src/components/layout/Layout.tsx`

---

## Data Flow

### Agent Event Flow

```
1. Agent collects events (Git/Docker/Health)
2. Agent sends event via WebSocket to service
3. Service validates and adds metadata
4. Service stores event in Redis
5. Service publishes to pub/sub channel
6. Service broadcasts to subscribed clients
```

### Client Subscription Flow

```
1. Client connects via WebSocket
2. Client sends subscription message
3. Service adds client to subscription map
4. When events arrive for subscribed worktrees:
   - Service forwards events to client
```

### API Request Flow

```
1. Client sends HTTP request
2. Fastify routes to handler
3. Handler queries database or Redis
4. Handler returns response
```

---

## Design Decisions

### Why Fastify over Express?

- **Performance:** 2-3x faster than Express
- **TypeScript:** First-class TypeScript support
- **Plugins:** Robust plugin system
- **WebSocket:** Built-in WebSocket support via plugin

### Why Redis for Events?

- **Speed:** Sub-millisecond read/write
- **Pub/Sub:** Native pub/sub support
- **TTL:** Automatic expiration (7-day retention)
- **Lists:** LPUSH/LTRIM for event queues

### Why PostgreSQL over MongoDB?

- **Relational data:** Epics, issues, worktrees have clear relationships
- **ACID:** Need transactional guarantees
- **Indexes:** Efficient queries on structured data
- **Mature:** Battle-tested with excellent tooling

### Why Separate PostgreSQL Instance?

- **Isolation:** Avoid shared failure domain with Python version
- **Testing:** Can test TypeScript version without affecting Python
- **Migration:** Easier cutover without data conflicts

### Why Shared Redis?

- **Real-time:** Events from both Python and TypeScript visible in same stream
- **Cost:** Redis handles both workloads easily
- **Key prefix:** `ts:` differentiates TypeScript keys

---

## Port Allocation

| Port | Service | Shared? | Purpose |
|------|---------|---------|---------|
| 21000 | Service | No | HTTP API + WebSocket |
| 20001 | Redis | Yes | Events & cache (Python + TypeScript) |
| 21005 | PostgreSQL | No | Data (TypeScript only) |
| 21004 | Dashboard | No | Web UI |
| 21002 | MCP Server | No | Claude Code integration (upcoming) |

---

## Scalability Considerations

### Current (Single Instance)

- Service handles ~1000 events/sec
- PostgreSQL pool: 20 connections
- Redis: Single instance, no clustering

### Future (Multiple Instances)

**Horizontal Scaling:**
- Multiple service instances behind load balancer
- Redis clustering for high availability
- PostgreSQL read replicas for queries

**WebSocket Scaling:**
- Redis pub/sub for inter-service communication
- Sticky sessions for WebSocket connections
- Service mesh (e.g., Linkerd) for routing

---

## Security

### Current

- No authentication (internal use)
- Sensitive values masked in UI
- PostgreSQL credentials in .env.local
- API tokens never logged

### Future

- API key authentication for external clients
- JWT tokens for MCP tools
- WebSocket authentication
- Rate limiting per client
- HTTPS/TLS for production

---

## Monitoring & Observability

### Current

- Structured JSON logging (Pino)
- Health endpoints for k8s probes
- Event storage in Redis (7 days)

### Upcoming (Phase 10)

- Prometheus metrics export
- Grafana dashboards
- Alerting rules
- Braintrust LLM traces
- Browserbase E2E replays

---

## Deployment

### Development

```bash
npm run dev              # Service with hot reload
cd dashboard && npm run dev  # Dashboard with HMR
npm run agent <name>     # Start worktree agent
```

### Production

```bash
npm run build            # Build to dist/
npm run start            # Run production build
systemctl start martha-ts  # Systemd service
```

---

## Testing Strategy

### Unit Tests
- Individual functions and classes
- Mocked dependencies
- Target: 80%+ coverage

### Integration Tests
- API endpoints
- Database interactions
- Redis pub/sub

### E2E Tests
- Full agent → service → client flow
- WebSocket connections
- Event streaming

---

## Migration Strategy

### Parallel Operation

- Python: Ports 20000-20004 (existing)
- TypeScript: Ports 21000-21004 (new)
- Shared Redis (different key prefixes)
- Separate PostgreSQL instances

### Cutover Plan

1. Validate TypeScript stable for 7 days
2. Migrate all agents to TypeScript
3. Stop Python service
4. Move TypeScript to ports 20000-20004
5. Update DNS/tunnels
6. Decommission Python service

---

## Future Architecture

### Phase 4-12 Additions

```
┌──────────────────────────────────────────┐
│          Claude Code (MCP Client)        │
└────────────────┬─────────────────────────┘
                 │ Stdio
┌────────────────▼─────────────────────────┐
│           MCP Server (23 tools)          │
└────────────────┬─────────────────────────┘
                 │ Internal API
┌────────────────▼─────────────────────────┐
│        Martha Service (Fastify)          │
├──────────────────────────────────────────┤
│  Swarm Orchestrator  │  Evidence        │
│  GitHub Integration  │  Cloudflare      │
│  Test Runner         │  Metrics         │
└──────────────────────────────────────────┘
```

---

**Last Updated:** 2026-01-12
**Version:** 3.0.0
