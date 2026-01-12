# Changelog

All notable changes to the Martha TypeScript Service will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.0.0] - 2026-01-12

### Major Release - TypeScript Migration Foundation

Complete rewrite of Martha from Python to TypeScript/Node.js to enable MCP integration and modern observability.

---

## Phase 4: MCP Server (2026-01-12)

### Added
- **MCP Server** (`src/mcp/server.ts`)
  - Model Context Protocol server using official SDK v0.5
  - Stdio transport for Claude Code integration
  - Request handler routing for 9 tools across 3 categories
  - Comprehensive error handling and structured logging
  - Version 3.0.0

- **Epic Management Tools** (3 tools)
  - `martha__epic__start` - Start tracking GitHub epic and provision worktree
    * Fetches epic metadata and sub-issues
    * Returns epic context with next steps
    * Placeholder for full GitHub integration
  - `martha__epic__get_context` - Get epic metadata for a worktree
    * Queries service API for worktree status
    * Returns agent version, ports, health status
  - `martha__epic__get_status` - Get epic completion status
    * Placeholder for completion tracking
    * Will show progress percentage and test results

- **Worktree Management Tools** (4 tools)
  - `martha__worktree__create` - Create new git worktree
    * Placeholder for port allocation, Docker setup, tunnel provisioning
    * Returns manual steps for current implementation
  - `martha__worktree__get_status` - Get real-time worktree status ✅ **Fully Working**
    * Queries service API for live data
    * Returns status, agent version, last seen, ports, health
  - `martha__worktree__destroy` - Destroy worktree and cleanup
    * Placeholder for agent stop, container cleanup, tunnel removal
  - `martha__worktree__list_all` - List all registered worktrees ✅ **Fully Working**
    * Returns summary (total, online, offline)
    * Shows status for each worktree

- **Event Query Tools** (2 tools)
  - `martha__events__get_recent` - Query recent worktree events ✅ **Fully Working**
    * Supports limit and event_type filters
    * Groups events by type for readability
    * Returns summary and recent events
  - `martha__events__get_by_issue` - Get events tagged with issue number
    * Placeholder for issue-tagged event tracking

- **Tool Handler Architecture**
  - `src/mcp/tools/epic-tools.ts` - Epic management handlers
  - `src/mcp/tools/worktree-tools.ts` - Worktree management handlers
  - `src/mcp/tools/event-tools.ts` - Event query handlers
  - `src/mcp/types.ts` - Shared type definitions

- **npm scripts** for MCP server
  - `npm run mcp` - Run MCP server with tsx (development)
  - `npm run mcp:build` - Build MCP server to dist/
  - `npm run mcp:start` - Run production MCP server

### Technical Implementation
- All tools return JSON-formatted responses
- Tools connect to Martha service API (http://localhost:21000)
- Axios for HTTP requests to service endpoints
- Type-safe interfaces using TypeScript and MCP SDK types
- Error handling with try/catch and logging for all operations

### Testing
- ✅ Tool listing verified (all 9 tools returned with schemas)
- ✅ Tool execution tested (martha__worktree__list_all)
- ✅ Service API integration working
- ✅ Live data returned from typescript-rewrite worktree

### Integration
- Ready for Claude Code: `claude mcp add martha-dev node dist/mcp/server.js`
- Tools call Martha service for real-time data
- Event system integration via Redis
- Prepared for GitHub API and Cloudflare integration

### Future Phases
- Phase 5: GitHub Integration (Octokit, GraphQL, issue tracking)
- Phase 6: Cloudflare Tunnels (actual provisioning)
- Phase 7: Swarm Orchestration (4 tools)
- Phase 8: Test Execution (3 tools)
- Phase 9: Evidence Collection (4 tools)

**Commit:** `2c23cf1` - Implement MCP Server with 9 core tools (Phase 4)

---

## Phase 3: Worktree Agent System

### Added
- **WorktreeAgent** main class with WebSocket connection to service
  - Exponential backoff retry logic (max 10 retries)
  - Graceful shutdown handlers (SIGINT, SIGTERM, SIGHUP)
  - 10-second watch loop for event collection
  - Command execution: `restart_container`, `git_pull`, `health_check`
  
- **GitWatcher** collector for repository monitoring
  - Detects branch changes (`git.branch` events)
  - Detects new commits with hash and message (`git.commit` events)
  - Counts uncommitted files (`git.uncommitted` events)
  - Uses `child_process.execFile` for Git commands
  
- **DockerWatcher** collector for container monitoring
  - Uses `dockerode` library for Docker API integration
  - Detects container status changes (`container.status` events)
  - Detects new containers (`container.detected` events)
  - Monitors container health status
  - Filters by worktree name pattern: `archie-{worktree}-*`
  
- **HealthChecker** collector for service health
  - Checks API endpoints via curl (`health.check` events)
  - Checks PostgreSQL via `pg_isready`
  - Configurable port mappings
  
- **Agent CLI** entry point (`src/agents/index.ts`)
  - Supports command-line arguments and environment variables
  - Usage: `npm run agent <name> [path] [service-url]`
  - Graceful shutdown and error handling
  
- **npm scripts** for agent management
  - `npm run agent` - Run agent with tsx
  - `npm run agent:build` - Build agent to dist/
  - `npm run agent:start` - Run production agent

### Changed
- Agent version bumped to `3.0.0`
- All collectors emit standardized `AgentEvent` format

### Tested
- Agent successfully connects to service on port 21000
- Events stored in Redis and queryable via `/api/v1/worktrees/:name/events`
- Worktree status API shows agent as "online"
- Git, Docker, and health monitoring working correctly

**Commit:** `b65ab2c` - Implement worktree agent system (Phase 3)

---

## Dashboard: Modern React UI

### Added
- **React 18 + TypeScript** dashboard application
  - Vite for fast development and building
  - TailwindCSS 3 with custom Martha color palette
  - React Router 6 for client-side routing
  - Axios for API integration
  
- **Martha's Color Palette** extracted from brand image
  - Primary (Coral): `#fa7d6a` - Warm, friendly coral
  - Accent (Turquoise): `#4db8b8` - Fresh teal from outfit
  - Secondary (Peach): `#ff9a76` - Warm peachy orange
  - Sand (Cream): `#f5e6d3` - Sandy, beachy neutral
  - Complete color scales (50-950) for each palette
  
- **Overview Page** (`/`)
  - Real-time service health monitoring
  - Active worktrees list with status badges
  - Auto-refresh every 5 seconds
  - Quick links to API endpoints
  - Online/offline worktree count
  
- **Documentation Page** (`/docs`)
  - Documentation browser with list view
  - Individual document viewer with markdown rendering
  - Phase progress tracking (Phases 1-3 complete badges)
  - Breadcrumb navigation
  - Prepared for dynamic markdown loading from `/docs` directory
  
- **Settings Page** (`/settings`)
  - Complete configuration display
  - Categorized sections: Service, Database, Redis, Cloudflare
  - Port allocation visual overview (21000, 20001, 21005, 21002)
  - System information (Node.js, TypeScript, Fastify versions)
  - Sensitive values masked for security
  
- **Layout & Navigation**
  - Persistent sidebar with active route highlighting
  - Service status indicator in footer
  - Version information display
  - Responsive design for desktop/tablet/mobile
  
- **Design System**
  - Custom Tailwind utilities (btn, card, badge, input)
  - Inter font family for typography
  - Smooth animations (fade-in, slide-up, slide-down)
  - Custom scrollbars
  - Status badges (success, warning, error, info)

### Technical Details
- Dashboard runs on port **21004**
- Proxies API requests to service on port **21000**
- WebSocket proxy configured for real-time updates
- Environment-based configuration
- Production build optimization with Vite

### Dependencies Added
- `react-router-dom` - Client-side routing
- `react-markdown` - Markdown rendering
- `axios` - HTTP client
- `@tailwindcss/typography` - Prose styling

**Commit:** `e92d6e9` - Add modern React dashboard with documentation and settings

---

## Phase 2: Server & WebSocket

### Added
- **Fastify Server** with WebSocket support
  - CORS configuration for cross-origin requests
  - Request timeout: 30 seconds
  - Body size limit: 1MB
  - Graceful shutdown on SIGTERM/SIGINT
  
- **WebSocket Endpoints**
  - `/ws/agent/:worktree` - Agent connections (sends events)
  - `/ws/client/:clientId` - Client connections (receives events)
  - Message validation and error handling
  - Automatic connection tracking
  
- **Connection Manager** (`src/core/connection-manager.ts`)
  - Tracks agent and client WebSocket connections
  - Manages worktree status (online/offline)
  - Subscription management for filtered event streaming
  - Methods: `connectAgent`, `connectClient`, `sendToAgent`, `broadcastToClients`
  
- **Redis Pub/Sub Manager** (`src/redis/pub-sub.ts`)
  - Channel-based message routing
  - Multiple handlers per channel support
  - Automatic subscription/unsubscription
  - Event validation with Zod schemas
  
- **Event Store** (`src/redis/event-store.ts`)
  - Stores events in Redis lists (LPUSH)
  - Automatic trimming: keeps last 1000 events per worktree
  - 7-day TTL with automatic expiration
  - Query methods: `getRecentEvents`, `getEventsByType`, `getEventsByIssue`
  
- **Worktree API Routes** (`/api/v1/worktrees`)
  - `GET /api/v1/worktrees` - List all worktrees with stats
  - `GET /api/v1/worktrees/:name` - Get specific worktree status
  - `GET /api/v1/worktrees/:name/events` - Get worktree events (with limit/offset)
  - `GET /api/v1/agents` - List connected agents
  - `GET /api/v1/clients` - List connected clients

### Changed
- Server startup logging improved with structured output
- Health endpoints return more detailed information
- Hook handlers use sync callbacks with `done()` pattern

### Fixed
- TypeScript compilation errors with WebSocket types
- Event type conversion issues in pub/sub
- Async function warnings in hook handlers

**Commit:** `508468e` - Implement Martha TypeScript service foundation (Phase 1 & 2)

---

## Phase 1: Foundation

### Added
- **Project Setup**
  - TypeScript 5.3 with strict type checking
  - SWC for fast compilation
  - ESLint + Prettier for code quality
  - Jest for testing
  - Husky for git hooks
  
- **Configuration System** (`src/config/index.ts`)
  - Environment variable loading with dotenv
  - Zod schemas for validation
  - Type-safe configuration access
  - Defaults for development environment
  
- **PostgreSQL Integration**
  - Connection pooling with `pg` (max 20 connections)
  - Automatic schema setting (`ts_martha`)
  - Health check queries
  - Graceful shutdown on termination
  
- **Database Schema** (`src/database/schema.sql`)
  - Tables: `epics`, `issues`, `worktrees`, `swarms`, `test_executions`, `evidence`, `events`
  - Foreign key relationships with cascading
  - Indexes for common queries
  - Auto-updating `updated_at` triggers
  
- **Redis Integration**
  - Two separate clients: operations and pub/sub
  - Key prefix: `ts:` to differentiate from Python version
  - Retry strategy with exponential backoff
  - Event listeners for connection status
  
- **Structured Logging** with Pino
  - JSON format for machine parsing
  - Module-specific loggers
  - Log levels: trace, debug, info, warn, error, fatal
  - Pretty printing in development
  
- **Health Endpoints**
  - `GET /health` - Basic health check
  - `GET /health/detailed` - Health with dependency checks (DB, Redis)
  - `GET /ready` - Readiness probe for k8s
  - `GET /live` - Liveness probe for k8s

### Configuration
- Service port: **21000**
- PostgreSQL port: **21005** (isolated instance)
- Redis port: **20001** (shared with Python Martha)
- Redis key prefix: `ts:`
- Database schema: `ts_martha`

### Dependencies
- `fastify` 4.26 - Web framework
- `@fastify/websocket` 10.0 - WebSocket support
- `@fastify/cors` 9.0 - CORS middleware
- `pg` 8.11 - PostgreSQL client
- `ioredis` 5.3 - Redis client
- `pino` 8.19 - Logging
- `zod` 3.22 - Schema validation
- `dockerode` 4.0 - Docker API
- `ws` 8.16 - WebSocket client
- `dotenv` 16.4 - Environment variables

### Development Tools
- `@swc/core` 1.4 - Fast TypeScript compilation
- `tsx` 4.7 - TypeScript execution
- `jest` 29.7 - Testing framework
- `eslint` 8.56 - Linting
- `prettier` 3.2 - Code formatting

**Commit:** `508468e` - Implement Martha TypeScript service foundation (Phase 1 & 2)

---

## [Pre-3.0.0] - Python Version

The original Python implementation resides at `/mnt/data/martha.dev-v4/service` and continues to run on ports 20000-20004 during the migration period.

### Migration Strategy
- Parallel operation during testing (Python: 20000-20004, TypeScript: 21000-21004)
- Separate PostgreSQL instance (TypeScript on port 21005)
- Shared Redis with key prefix differentiation (`ts:` for TypeScript)
- Gradual cutover after Phase 12 validation

---

## Upcoming

### Phase 4: MCP Server (Next)
- [ ] MCP TypeScript SDK integration
- [ ] 23 MCP tools implementation
  - Epic tools (3): start, get_context, get_status
  - Worktree tools (4): create, status, destroy, list_all
  - Swarm tools (4): spawn, status, terminate, list_active
  - Test tools (3): trigger, get_results, get_history
  - Evidence tools (4): collect, post_to_github, validate, get_traces
  - Tunnel tools (2): provision, destroy
  - Event tools (2): get_recent, get_by_issue
- [ ] Stdio transport for Claude Code
- [ ] Tool validation and error handling

### Phase 5: GitHub Integration
- [ ] Octokit REST + GraphQL clients
- [ ] Epic fetching and tracking
- [ ] Issue management
- [ ] Project board automation
- [ ] Evidence comment posting

### Phase 6: Cloudflare Integration
- [ ] Tunnel management
- [ ] DNS record provisioning
- [ ] Daemon lifecycle management

### Phase 7: Claude-Flow Swarm Orchestration
- [ ] Swarm spawning via subprocess
- [ ] Hook system for callbacks
- [ ] Health monitoring
- [ ] Resource usage tracking

### Phase 8-12
- Test orchestration
- Evidence collection (Braintrust + Browserbase)
- Prometheus metrics
- Comprehensive testing
- Production cutover

---

## Version History

- **3.0.0** (2026-01-12) - TypeScript migration foundation complete (Phases 1-3 + Dashboard)
- **2.x** - Python version (legacy, still running)

---

## Links

- **Repository:** `/mnt/data/martha.dev-v4`
- **Worktree:** `/mnt/data/martha.dev-v4-worktrees/typescript-rewrite`
- **Branch:** `feature/typescript-rewrite`
- **Service:** http://localhost:21000
- **Dashboard:** http://localhost:21004
