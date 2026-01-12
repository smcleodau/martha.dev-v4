# Martha Capabilities Documentation

**Version:** 3.0.0
**Last Updated:** 2026-01-12

## Overview

Martha is a Multi-Agent Parallel Development System (MAPDS) that provides intelligent orchestration, monitoring, and observability for parallel development workflows using git worktrees.

## Core Capabilities

### 1. Worktree Management

Martha manages multiple git worktrees with full lifecycle support:

#### Worktree Creation
- **Daily Branch Creation**: Automatically create dated working branches from `origin/develop`
- **Feature Branch Worktrees**: Create worktrees for specific epics/features
- **Parent-Child Relationships**: Track worktree dependencies in the database
- **Port Allocation**: Automatically assign port ranges based on worktree index
- **Configuration Management**: Generate `.worktree-config.json` for each worktree

#### Worktree Operations
- **List Worktrees**: Query all registered worktrees with status
- **Destroy Worktrees**: Clean removal with dependency checking
- **Status Tracking**: Real-time online/offline status via agent connections
- **Path Management**: Track worktree filesystem locations

#### Database Tracking
- PostgreSQL-backed worktree registry
- Track: name, branch, base branch, ports, parent relationships, repository
- Support for multiple repositories (martha.dev-v4, archie-platform-v2)

### 2. Real-Time Monitoring

Martha provides comprehensive real-time monitoring through worktree agents:

#### Agent System
- **TypeScript Agents**: Node.js-based monitoring agents (v3.0.0)
- **WebSocket Communication**: Bidirectional real-time connection to main service
- **Auto-Reconnection**: Exponential backoff with retry logic
- **Multi-Worktree Support**: Each worktree runs its own agent

#### Monitoring Capabilities
- **Git Status**: Detect uncommitted changes, branch state, ahead/behind commits
- **Docker Containers**: Monitor container status and health checks (when Docker available)
- **Health Checks**: Check service availability on configured ports
- **Event Streaming**: Real-time event broadcasting to connected clients

#### Smart Docker Monitoring
- Graceful degradation when Docker is unavailable
- Single warning message instead of continuous errors
- Automatic permission detection and silent disabling

### 3. Live Dashboard

React-based web dashboard with real-time updates:

#### Pages
- **Overview**: Service health, worktree status grid, quick links
- **Logs**: Live log streaming with SSE, log parsing, filtering
- **Documentation**: Integrated documentation viewer
- **Settings**: Configuration management

#### Features
- **Real-Time Updates**: 5-second polling for worktree status
- **Color-Coded Status**: Online (green), Offline (gray)
- **Agent Version Display**: Show agent versions for each worktree
- **Directory Paths**: Full filesystem paths for each worktree
- **Port Information**: Display all assigned ports per worktree

#### Aesthetic
- Mint green (#6ee7b7) and soft blue (#82c9ed) color scheme
- Clean, modern UI with Tailwind CSS
- Responsive design

### 4. Log Streaming

Server-Sent Events (SSE) based log streaming:

#### Features
- **Real-Time Streaming**: Live log updates as agents write to log files
- **Historical Logs**: Load last N lines on connection
- **JSON Parsing**: Automatic parsing of structured logs
- **Colored Output**: Level-based coloring (ERROR/WARN/INFO/DEBUG)
- **Auto-Scroll**: Optional auto-scroll to newest logs
- **Multiple Worktrees**: Switch between different agent logs

#### Implementation
- SSE endpoint: `/api/v1/logs/:worktree`
- Watches `/tmp/agent-{worktree}.log` files
- Heartbeat to keep connections alive
- Client disconnect handling

### 5. API & WebSocket

Comprehensive REST and WebSocket APIs:

#### REST Endpoints
```
GET  /health                          # Service health check
GET  /api/v1/worktrees                # List all worktrees with status
GET  /api/v1/worktrees/:name          # Get specific worktree
GET  /api/v1/worktrees/:name/events   # Get worktree event history
GET  /api/v1/agents                   # List connected agents
GET  /api/v1/clients                  # List connected clients
GET  /api/v1/logs                     # List available log files
GET  /api/v1/logs/:worktree           # Stream logs (SSE)
GET  /api/v1/changelog                # Get recent changelog entries
```

#### WebSocket Endpoints
```
WS   /ws/agent/:worktree              # Agent connection
WS   /ws/client/:clientId             # Client connection
```

#### Event Types
- `agent.startup` - Agent initialization with version and ports
- `agent.connected` / `agent.disconnected` - Connection status
- `git.uncommitted` - Uncommitted changes detected
- `git.ahead` / `git.behind` - Branch sync status
- `container.status` - Docker container state changes
- `container.detected` - New container found
- `health.check` - Service health status

### 6. Cloudflare Integration

Declarative tunnel and DNS management:

#### Tunnel Configuration
- Single tunnel ID with multiple hostnames
- Automatic routing configuration
- Cloud-stored config with local overrides

#### DNS Management
- Automatic DNS record creation/updates
- Subdomain routing (martha.arch.ie, martha-api.arch.ie)
- Proxied through Cloudflare

### 7. Database Management

PostgreSQL-based data persistence:

#### Tables
- `ts_martha.worktrees` - Worktree registry with relationships
- Event storage in Redis (temporary)

#### Features
- Connection pooling (max 20 connections)
- Automatic schema creation
- Migration support
- Multi-repository tracking

### 8. Redis Integration

Redis for event streaming and pub/sub:

#### Features
- Event storage with TTL
- Pub/sub for real-time broadcasting
- Connection retry with exponential backoff
- Graceful degradation on connection loss

### 9. MCP Server (Model Context Protocol)

Integration with Claude Code for AI-assisted development:

#### Tools (Available via MCP)
- Worktree management (create, destroy, list)
- Daily branch creation
- Changelog querying
- Git operations coordination

#### Configuration
- MCP server name: `martha-dev`
- Version: 3.0.0
- stdio transport

### 10. Command-Line Tools

Bash scripts for common operations:

#### Available Scripts
- `start-ts-agent.sh` - Start monitoring agent for a worktree
- Port-based service management
- Automated tunnel setup

## Technical Stack

### Backend
- **Runtime**: Node.js 20+ with TypeScript
- **Framework**: Fastify (HTTP + WebSocket)
- **Database**: PostgreSQL 14+
- **Cache**: Redis 6+
- **Compilation**: SWC (fast TypeScript compilation)

### Frontend
- **Framework**: React 18 with TypeScript
- **Build**: Vite
- **Styling**: Tailwind CSS
- **HTTP**: Axios
- **Routing**: React Router

### Deployment
- **Hosting**: Bare metal Linux server
- **Ports**: 20000-20004 (service, Redis, MCP, metrics, dashboard)
- **Tunneling**: Cloudflare Tunnel
- **DNS**: Cloudflare DNS (arch.ie domain)

### Monitoring
- **Logs**: Pino (structured JSON logging)
- **Metrics**: Custom Prometheus-compatible metrics (planned)
- **Observability**: Braintrust integration (planned)

## Use Cases

### 1. Parallel Feature Development
Create isolated worktrees for different features, allowing simultaneous work without conflicts:
```bash
# Via MCP tool
martha__worktree__create_daily()  # Create daily branch
martha__worktree__create(epic_number=123, branch_name="feature-auth")
martha__worktree__create(epic_number=124, branch_name="feature-api")
```

### 2. Production Isolation
Keep production (main-develop) separate from feature branches:
- Main worktree on `develop` branch
- Feature worktrees branch from daily work branch
- Prevents accidental modifications to production code

### 3. Service Monitoring
Monitor all running services across worktrees:
- Real-time status in dashboard
- Log streaming for debugging
- Docker container monitoring
- Health check automation

### 4. CI/CD Coordination
Track worktree states for automated testing:
- Git status monitoring
- Event-driven test triggers
- Deployment coordination

### 5. Multi-Repository Management
Manage worktrees across different repositories:
- archie-platform-v2 (existing project)
- martha.dev-v4 (this service)
- Shared monitoring infrastructure

## Configuration

### Environment Variables
```bash
# Service
SERVICE_PORT=20000
NODE_ENV=production

# Database
DATABASE_URL=postgresql://martha_ts_user:***@localhost:21005/martha_ts
DATABASE_SCHEMA=ts_martha

# Redis
REDIS_URL=redis://:password@localhost:20001
REDIS_KEY_PREFIX=ts:

# Integrations
GITHUB_TOKEN=***
CLOUDFLARE_API_TOKEN=***
CLOUDFLARE_ZONE_ID=***
CLOUDFLARE_ACCOUNT_ID=***
CLOUDFLARE_DOMAIN=arch.ie

# Observability (optional)
BRAINTRUST_API_KEY=***
BROWSERBASE_API_KEY=***
BROWSERBASE_PROJECT_ID=***
```

### Worktree Configuration
Each worktree has a `.worktree-config.json`:
```json
{
  "name": "feature-auth",
  "index": 4,
  "ports": {
    "postgres": 4000,
    "redis": 4001,
    "api": 4002,
    "pgadmin": 4003,
    "frontend": 4004
  }
}
```

## Roadmap

### Phase 4: Enhanced MCP Integration
- Additional MCP tools for git operations
- Swarm orchestration tools
- Test execution coordination

### Phase 5: Observability
- Braintrust LLM logging
- Browserbase session replay
- Prometheus metrics export

### Phase 6: Advanced Features
- Automated testing triggers
- Deployment automation
- Performance profiling
- Resource usage tracking

## Limitations

### Current Limitations
- Docker monitoring requires Docker group membership or root access
- Redis required for event streaming (graceful degradation in progress)
- Single-server deployment (no horizontal scaling yet)
- Manual tunnel configuration updates

### Known Issues
- Redis connection retry can be verbose in logs
- Dashboard WebSocket reconnection needs improvement
- Agent startup delay on service restart

## Security Considerations

### Access Control
- No authentication on API endpoints (internal use only)
- Cloudflare Tunnel provides secure public access
- PostgreSQL password authentication
- Redis password protection

### Best Practices
- Keep `.env.local` files secure and out of version control
- Use read-only database users where possible
- Restrict Docker socket access
- Regular security updates for dependencies

## Support & Contributing

### Documentation
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System design
- [API.md](./API.md) - API reference
- [PORT_ALLOCATION.md](./PORT_ALLOCATION.md) - Port strategy
- [DEPLOYMENT_SESSION_2026-01-11.md](./DEPLOYMENT_SESSION_2026-01-11.md) - Deployment notes

### Getting Help
- Check documentation in `/docs`
- Review logs in `/tmp/agent-*.log` and `/tmp/martha-20000.log`
- Dashboard provides real-time status

### Development Workflow
- Branch strategy documented in [BRANCHING_STRATEGY.md](./BRANCHING_STRATEGY.md)
- Feature branches from `develop`
- Pull requests required for merging
- Automated testing (in progress)

---

**Martha** - Making parallel development productive and observable.
