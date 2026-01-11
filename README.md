# Martha.dev Multi-Agent Parallel Development System (MAPDS)

**Real-time monitoring and orchestration for Git worktrees with isolated Docker environments**

The Martha.dev Multi-Agent Parallel Development System (MAPDS) is a comprehensive infrastructure for parallel development across multiple Git worktrees. Each worktree operates in complete isolation with dedicated Docker environments, automated port allocation, health monitoring, and Cloudflare tunnel management.

MAPDS enables teams to work on multiple features, branches, and epics simultaneously without port conflicts, container naming collisions, or infrastructure interference.

## Features

- 🔄 **Real-time WebSocket Monitoring** - Live event streaming from all worktrees
- 🐳 **Isolated Docker Environments** - Each worktree gets unique ports and containers
- 🚀 **Automatic Port Allocation** - INDEX × 1000 port scheme (3000-3004, 4000-4004, etc.)
- ☁️ **Cloudflare Tunnel Management** - Centralized DNS and tunnel provisioning
- 🏥 **Health Monitoring** - Continuous checks for Docker, PostgreSQL, Redis, API
- 📊 **Event Streaming** - Real-time status updates via WebSocket
- 🔐 **Git-Safe Configuration** - All sensitive config in .env.local (gitignored)
- 🎯 **Production Protection** - Main branch isolation with manual-only control

## Architecture

### Components

1. **Monitoring Service** (`service/service.py`)
   - FastAPI server with WebSocket support
   - Centralized event aggregation
   - Cloudflare API integration
   - Redis-based event storage
   - Runs on port 20000

2. **Worktree Agents** (`agent/worktree_agent.py`)
   - One agent per worktree
   - Docker container monitoring
   - Health checks (Postgres, Redis, API)
   - Event emission to central service
   - Auto-remediation capabilities

3. **Registry** (`config/registry.template.json`)
   - Central port allocation database
   - Worktree metadata
   - Container naming schemes
   - Production vs development flags

4. **Control Scripts** (`scripts/`)
   - `start-worktree-agents.sh` - Start all agents
   - `start-single-agent.sh` - Start individual agent
   - `validate-worktree-config.py` - Configuration validation
   - `verify-git-safety.sh` - Ensure no .env files tracked

## Port Allocation Scheme

Martha.dev uses a simple INDEX × 1000 port allocation:

| Environment | Index | Port Range | Services |
|-------------|-------|------------|----------|
| **main-develop** | 1 | 1000-1004 | Production (manual only) |
| Reserved | 2 | 2000-2004 | Future use |
| communications-service | 3 | 3000-3004 | Worktree |
| copilot-integration | 4 | 4000-4004 | Worktree |
| excel-sidebar-epics | 5 | 5000-5004 | Worktree |
| teams-integration | 6 | 6000-6004 | Worktree |
| python-310-work | 7 | 7000-7004 | Worktree |
| **martha-monitoring** | 20 | 20000-20004 | Martha Host System |

**Service Offsets:**
- +0: PostgreSQL
- +1: Redis
- +2: API
- +3: pgAdmin
- +4: Frontend

Example: Worktree index 3 → Postgres: 3000, Redis: 3001, API: 3002, etc.

## Quick Start

### 1. Install Dependencies

```bash
# Service dependencies
cd service
pip install -r requirements.txt

# Agent dependencies (same as service)
cd ../agent
pip install -r ../service/requirements.txt
```

### 2. Configure Registry

```bash
# Copy and customize registry
cp config/registry.template.json ~/.martha/registry.json

# Edit registry with your worktrees
nano ~/.martha/registry.json
```

### 3. Configure Service

```bash
# Create service config directory
mkdir -p ~/.martha/service

# Copy and customize service configuration
cp config/.env.template ~/.martha/service/.env

# Set Redis password and other variables
nano ~/.martha/service/.env
```

### 4. Start Monitoring Service

```bash
cd service
python service.py
```

The service will start on `http://localhost:20000`

### 5. Deploy Agents to Worktrees

```bash
# Copy agent to each worktree
cp agent/worktree_agent.py /path/to/your/worktree/

# Create .env.local for worktree
cp config/.env.worktree.example /path/to/your/worktree/.env.local

# Edit with correct ports (based on INDEX)
nano /path/to/your/worktree/.env.local
```

### 6. Start Agents

```bash
# Start all agents
./scripts/start-worktree-agents.sh

# Or start individual agent
./scripts/start-single-agent.sh worktree-name /path/to/worktree /path/to/log
```

### 7. Verify Status

```bash
# Check service health
curl http://localhost:20000/health

# View connected worktrees
curl http://localhost:20000/api/v1/worktrees

# View Cloudflare tunnels
curl http://localhost:20000/api/v1/tunnels
```

## Configuration

### Worktree .env.local

Each worktree needs a `.env.local` file with:

```bash
# Worktree identity
WORKTREE_INDEX=5
WORKTREE_NAME=excel-sidebar-epics
COMPOSE_PROJECT_NAME=archie-excel-sidebar-epics

# Port configuration (5xxx range for index 5)
POSTGRES_PORT=5000
REDIS_PORT=5001
API_PORT=5002
PGADMIN_PORT=5003
FRONTEND_PORT=5004

# Database URLs
DATABASE_URL=postgresql://user:pass@localhost:5000/dbname
DATABASE_URL_INTERNAL=postgresql://user:pass@postgres:5432/dbname

# Redis URLs
REDIS_URL=redis://:password@localhost:5001
REDIS_URL_INTERNAL=redis://:password@redis:6379
```

### Service .env

The monitoring service needs:

```bash
# Service configuration
SERVICE_PORT=20000
REDIS_URL=redis://:password@localhost:20001
GITHUB_TOKEN=  # Optional, leave empty to disable

# Cloudflare integration (optional)
CLOUDFLARE_API_TOKEN=your_token_here
CLOUDFLARE_ZONE_ID=your_zone_id
CLOUDFLARE_ACCOUNT_ID=your_account_id
CLOUDFLARE_DOMAIN=arch.ie
```

## Cloudflare Tunnel Management

### Provision Tunnels

```bash
# Via API
curl -X POST http://localhost:20000/api/v1/worktrees/{name}/tunnels/provision

# Via CLI
cd service
python cli_client.py provision-tunnel {worktree-name}
```

### DNS Allocation

Tunnels are automatically allocated DNS names:
- API: `{worktree-name}-api.arch.ie`
- WebSocket: `wss://{worktree-name}-api.arch.ie/ws`
- Frontend: `{worktree-name}-web.arch.ie`

### Destroy Tunnels

```bash
# Via API
curl -X DELETE http://localhost:20000/api/v1/worktrees/{name}/tunnels

# Via CLI
python cli_client.py destroy-tunnel {worktree-name}
```

## Monitoring Events

The system emits various event types:

- `agent.connected` / `agent.disconnected` - Agent lifecycle
- `health.check` - Periodic health status
- `docker.container.started` / `stopped` - Container changes
- `port.conflict` - Port allocation issues
- `service.unhealthy` - Service health failures
- `tunnel.provisioned` / `destroyed` - Cloudflare changes

### Subscribe to Events (WebSocket)

```javascript
const ws = new WebSocket('ws://localhost:20000/ws/worktree/excel-sidebar-epics');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Event:', data.type, data.data);
};
```

### Query Events (HTTP)

```bash
# Get all events for a worktree
curl http://localhost:20000/api/v1/worktrees/{name}/events

# Filter by event type
curl http://localhost:20000/api/v1/worktrees/{name}/events?event_type=health.check

# Filter by severity
curl http://localhost:20000/api/v1/worktrees/{name}/events?severity=error
```

## Main Branch Protection

The main production branch (serving live traffic) is protected:

- **Manual Control Only** - No monitoring agent
- **Isolated Ports** - 1000-1004 range (highest priority)
- **Registry Entry** - Marked with `"production": true`, `"monitoring_agent": false`
- **Separate Configuration** - Own .env.local, no interference

See `docs/main-branch-strategy.md` for complete protection strategy.

## Scripts Reference

### start-worktree-agents.sh

Starts monitoring agents for all enabled worktrees.

```bash
./scripts/start-worktree-agents.sh
```

Logs to: `~/.martha/logs/worktree-agents-{worktree}.log`

### validate-worktree-config.py

Validates worktree configuration before deployment.

```bash
python scripts/validate-worktree-config.py /path/to/worktree
```

Checks:
- Required environment variables
- Port conflicts
- Docker Compose compatibility
- Git safety (.env.local vs .env)

### verify-git-safety.sh

Ensures no sensitive .env files are tracked by git.

```bash
./scripts/verify-git-safety.sh
```

## Development

### Running Tests

```bash
# Install test dependencies
pip install pytest pytest-asyncio

# Run tests
pytest tests/
```

### Adding a New Worktree

1. Allocate next available INDEX (e.g., 8 for index 8 → ports 8000-8004)
2. Add entry to registry.json
3. Create .env.local in worktree directory
4. Update docker-compose.yml to use ${PORT} variables
5. Deploy agent: `cp agent/worktree_agent.py /path/to/worktree/`
6. Start agent: `./scripts/start-single-agent.sh name path log`
7. Provision tunnel (optional): `curl -X POST .../tunnels/provision`

### Service API Endpoints

**Worktrees:**
- `GET /api/v1/worktrees` - List all worktrees
- `GET /api/v1/worktrees/{name}` - Get worktree details
- `GET /api/v1/worktrees/{name}/events` - Query events
- `POST /api/v1/worktrees/{name}/tunnels/provision` - Create tunnels
- `DELETE /api/v1/worktrees/{name}/tunnels` - Destroy tunnels

**Tunnels:**
- `GET /api/v1/tunnels` - List all Cloudflare tunnels
- `GET /api/v1/tunnels/{tunnel_id}` - Tunnel details

**WebSocket:**
- `WS /ws/worktree/{name}` - Subscribe to worktree events

## Troubleshooting

### Agent Not Connecting

1. Check service is running: `curl http://localhost:20000/health`
2. Verify Redis connection in service logs
3. Check agent logs: `tail -f ~/.martha/logs/worktree-agents-{name}.log`
4. Verify WebSocket URL in agent environment

### Port Conflicts

1. Check registry for duplicate port allocations
2. Verify no containers using default ports (5432, 6379, 8000)
3. Use `lsof -i :PORT` to find process using port
4. Update .env.local with correct INDEX-based ports

### Docker Permission Denied

Agents need Docker socket access:

```bash
# Add user to docker group
sudo usermod -aG docker $USER

# Or use sg docker wrapper
sg docker -c "python worktree_agent.py"
```

### Cloudflare Tunnel Fails

1. Verify CLOUDFLARE_API_TOKEN has correct permissions
2. Check CLOUDFLARE_ZONE_ID and CLOUDFLARE_ACCOUNT_ID
3. Ensure DNS zone exists in Cloudflare
4. Check service logs for API errors

## License

MIT License - See LICENSE file for details

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## Support

For issues and questions:
- GitHub Issues: [Create an issue](https://github.com/yourusername/martha.dev-v4/issues)
- Documentation: See `docs/` directory

## Acknowledgments

Built on:
- FastAPI - Modern web framework
- WebSockets - Real-time communication
- Docker Python SDK - Container management
- Cloudflare API - Tunnel management
- Redis - Event storage

---

**Martha.dev MAPDS (Multi-Agent Parallel Development System)** - Orchestrating worktrees with confidence 🚀

*Enabling true parallel development across multiple Git worktrees*
