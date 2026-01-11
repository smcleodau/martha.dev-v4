# Martha.dev MAPDS - Port Allocation Strategy

**Last Updated:** 2026-01-11

## Overview

Martha.dev uses a structured port allocation scheme to ensure complete isolation between worktrees and prevent port conflicts. Each worktree gets a dedicated range of 5 ports based on its index.

## Port Allocation Formula

```
BASE_PORT = INDEX × 1000
SERVICE_PORT = BASE_PORT + OFFSET
```

## Port Ranges

### Martha Host System (Index 20)

**Range:** 20000-20004

Martha, being the host orchestration system, has a distinctive port range separate from worktrees.

| Service | Port | Status | Description |
|---------|------|--------|-------------|
| Monitoring Service | 20000 | Active | FastAPI service with WebSocket support |
| Martha Redis | 20001 | Active | Dedicated Redis for event storage |
| Dashboard | 20002 | Reserved | Future: Web dashboard UI |
| API Gateway | 20003 | Reserved | Future: Central API gateway |
| Web UI | 20004 | Reserved | Future: Management interface |

**Configuration:**
- Registry index: 20
- Service URL: `http://localhost:20000`
- WebSocket: `ws://localhost:20000`
- Health check: `http://localhost:20000/health`

---

### Production Worktree (Index 1)

**Range:** 1000-1004

The main production branch serving live traffic.

| Service | Port | Status | Description |
|---------|------|--------|-------------|
| PostgreSQL | 1000 | Active | Production database |
| Redis | 1001 | Active | Production cache |
| API | 1002 | Active | Production API server |
| pgAdmin | 1003 | Available | Database management |
| Frontend | 1004 | Active | Production web server |

**Worktree:** `main-develop` (`/mnt/data/archie-platform-v2`)
**Protection:** Manual control only, no auto-remediation
**Monitoring:** Full agent monitoring enabled

---

### Reserved Range (Index 2)

**Range:** 2000-2004

Reserved for future infrastructure or special purposes.

**Status:** Available

---

### Development Worktrees (Index 3-19)

**Active Worktrees:**

#### communications-service (Index 3)
**Range:** 3000-3004

| Service | Port | Status |
|---------|------|--------|
| PostgreSQL | 3000 | Active |
| Redis | 3001 | Active |
| API | 3002 | Active |
| pgAdmin | 3003 | Available |
| Frontend | 3004 | Active |

**Path:** `/mnt/data/archie-platform-v2-worktrees/communications-service`

#### copilot-integration (Index 4)
**Range:** 4000-4004

| Service | Port | Status |
|---------|------|--------|
| PostgreSQL | 4000 | Active |
| Redis | 4001 | Active |
| API | 4002 | Active |
| pgAdmin | 4003 | Available |
| Frontend | 4004 | Active |

**Path:** `/mnt/data/archie-platform-v2-worktrees/copilot-integration`

#### excel-sidebar-epics (Index 5)
**Range:** 5000-5004

| Service | Port | Status |
|---------|------|--------|
| PostgreSQL | 5000 | Active |
| Redis | 5001 | Active |
| API | 5002 | Active |
| pgAdmin | 5003 | Available |
| Frontend | 5004 | Active |

**Path:** `/mnt/data/archie-platform-v2-worktrees/excel-sidebar-epics`
**Cloudflare Tunnels:**
- API: `https://excel-sidebar-api.arch.ie`
- Web: `https://excel-sidebar-web.arch.ie`

#### teams-integration (Index 6)
**Range:** 6000-6004

| Service | Port | Status |
|---------|------|--------|
| PostgreSQL | 6000 | Active |
| Redis | 6001 | Active |
| API | 6002 | Active |
| pgAdmin | 6003 | Available |
| Frontend | 6004 | Active |

**Path:** `/mnt/data/archie-platform-v2-worktrees/teams-integration`

#### python-310-work (Index 7)
**Range:** 7000-7004

| Service | Port | Status |
|---------|------|--------|
| PostgreSQL | 7000 | Available |
| Redis | 7001 | Available |
| API | 7002 | Available |
| pgAdmin | 7003 | Available |
| Frontend | 7004 | Available |

**Path:** `/mnt/data/archie-platform-v2-worktrees/python-310-work`
**Status:** Configured but not yet deployed

---

### Available Indices (8-19)

**Ranges:** 8000-8004, 9000-9004, ..., 19000-19004

**Status:** Available for new worktrees

**Note:** Index 9 (9000-9004) is now available after Martha's port reorganization.

---

## Service Offsets

All worktrees follow the same offset pattern:

| Offset | Service | Default Container Port | Purpose |
|--------|---------|----------------------|---------|
| +0 | PostgreSQL | 5432 | Primary database |
| +1 | Redis | 6379 | Cache and sessions |
| +2 | API | 8000 | Backend API server |
| +3 | pgAdmin | 80/5050 | Database management UI |
| +4 | Frontend | 3000/8080 | Web application |

### Example: Index 5 (excel-sidebar-epics)
```
Base Port: 5 × 1000 = 5000

PostgreSQL: 5000:5432 (host:container)
Redis:      5001:6379
API:        5002:8000
pgAdmin:    5003:80
Frontend:   5004:3000
```

---

## Configuration Files

### Registry Entry Template

Each worktree has an entry in `~/.martha/registry.json`:

```json
{
  "name": "worktree-name",
  "index": 5,
  "path": "/path/to/worktree",
  "ports": {
    "postgres": 5000,
    "redis": 5001,
    "api": 5002,
    "pgadmin": 5003,
    "frontend": 5004
  },
  "enabled": true,
  "production": false,
  "monitoring_agent": true
}
```

### Worktree .env.local Template

Each worktree needs a `.env.local` file:

```bash
# Worktree Identity
WORKTREE_INDEX=5
WORKTREE_NAME=excel-sidebar-epics
COMPOSE_PROJECT_NAME=archie-excel-sidebar-epics

# Port Configuration (5xxx range for index 5)
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

# Monitoring
MONITOR_SERVICE_URL=ws://localhost:20000
```

### Docker Compose Configuration

Worktree `docker-compose.yml` must use environment variables:

```yaml
services:
  postgres:
    ports:
      - "${POSTGRES_PORT:-5432}:5432"
    container_name: "${COMPOSE_PROJECT_NAME}-postgres"

  redis:
    ports:
      - "${REDIS_PORT:-6379}:6379"
    container_name: "${COMPOSE_PROJECT_NAME}-redis"

  api:
    ports:
      - "${API_PORT:-8000}:8000"
    container_name: "${COMPOSE_PROJECT_NAME}-api"
```

---

## Port Conflict Prevention

### Checking for Conflicts

Before allocating a new index, verify ports are free:

```bash
# Check if port range is available (e.g., index 8)
for port in {8000..8004}; do
  lsof -i :$port
done
```

### Common Conflicts

**Avoid these port ranges:**
- 3000 (default Create React App)
- 5000 (default Flask)
- 5432 (default PostgreSQL)
- 6379 (default Redis)
- 8000 (default Django/FastAPI)
- 8080 (common HTTP alternative)

**Safe Ranges:**
- 1000-1004 (main-develop - protected)
- 3000-7004 (worktrees 3-7)
- 20000-20004 (Martha infrastructure)

---

## Adding a New Worktree

### Step 1: Allocate Index

Find the next available index:

```bash
# Check registry for highest index
cat ~/.martha/registry.json | jq '.[] | .index' | sort -n | tail -1

# Next available: highest + 1 (skip 20 - reserved for Martha)
```

### Step 2: Calculate Port Range

```
INDEX = 8 (example)
BASE_PORT = 8 × 1000 = 8000
PORT_RANGE = 8000-8004
```

### Step 3: Update Registry

Add entry to `~/.martha/registry.json`:

```json
{
  "name": "new-worktree",
  "index": 8,
  "path": "/path/to/new-worktree",
  "ports": {
    "postgres": 8000,
    "redis": 8001,
    "api": 8002,
    "pgadmin": 8003,
    "frontend": 8004
  },
  "enabled": true,
  "production": false,
  "monitoring_agent": true
}
```

### Step 4: Create .env.local

Copy template and customize:

```bash
cp config/.env.worktree.example /path/to/worktree/.env.local
# Edit with index 8 ports (8000-8004)
```

### Step 5: Update docker-compose.yml

Ensure all services use `${PORT}` variables:

```yaml
ports:
  - "${POSTGRES_PORT:-5432}:5432"
```

### Step 6: Deploy Agent

```bash
cp agent/worktree_agent.py /path/to/worktree/
./scripts/start-single-agent.sh new-worktree /path/to/worktree /path/to/log
```

---

## Verification Commands

### Check All Allocated Ports

```bash
# List all ports from registry
cat ~/.martha/registry.json | jq -r '.[] | "\(.name) (index \(.index)): \(.ports | to_entries[] | "\(.key)=\(.value)") "'
```

### Check What's Listening

```bash
# Martha infrastructure
lsof -i :20000-20004

# Worktree services (example: index 5)
lsof -i :5000-5004

# All worktree ranges
for i in {1..7} {20..20}; do
  echo "=== Index $i ==="
  lsof -i :${i}000-${i}004
done
```

### Verify No Conflicts

```bash
# Check docker-compose uses variables
grep -r "ports:" docker-compose.yml | grep -v "\${.*PORT"
# Should return nothing - all ports should use variables
```

---

## Troubleshooting

### Port Already in Use

```bash
# Find what's using the port
lsof -i :5002
sudo netstat -tlnp | grep 5002

# Kill the process if needed
kill $(lsof -t -i :5002)
```

### Wrong Port in Container

**Problem:** Container using wrong port (e.g., 8000 instead of 5002)

**Solution:**
1. Check `.env.local` exists in worktree directory
2. Verify `docker-compose.yml` uses `${API_PORT:-8000}`
3. Restart containers: `docker compose down && docker compose up -d`

### Port Conflict Between Worktrees

**Problem:** Two worktrees assigned same index

**Solution:**
1. Check registry for duplicates:
   ```bash
   cat ~/.martha/registry.json | jq '.[] | .index' | sort | uniq -d
   ```
2. Reassign one worktree to unused index
3. Update `.env.local` with new ports
4. Restart containers

---

## Architecture Decisions

### Why Index 20 for Martha?

**Decision:** Martha uses index 20 (20000-20004) instead of index 0 (9000-9004)

**Rationale:**
1. **Separation:** Clear distinction between host system and worktrees
2. **Scalability:** Indices 1-19 available for worktrees (19 total)
3. **No Confusion:** 20000 range is unmistakably infrastructure
4. **Future Proofing:** Room for 5 Martha services (monitoring, dashboard, gateway, etc.)

### Why INDEX × 1000?

**Decision:** Use INDEX × 1000 formula instead of sequential allocation

**Rationale:**
1. **Simple Mental Model:** Index 5 → 5000 range (easy to remember)
2. **No Conflicts:** 1000-port gap ensures services never overlap
3. **Predictable:** Given worktree name, calculate ports instantly
4. **Scalable:** Supports 19 worktrees cleanly (1000-19000)

### Why 5 Ports Per Worktree?

**Decision:** Allocate 5 ports per worktree (+0 through +4)

**Rationale:**
1. **Standard Stack:** Postgres, Redis, API, pgAdmin, Frontend
2. **Flexibility:** Can add services within range if needed
3. **Waste Tolerance:** Unused ports (e.g., pgAdmin) are acceptable
4. **Consistency:** Same pattern across all worktrees

---

## Future Expansion

### Indices 21-99

**Available:** 21000-99004

**Purpose:** Additional infrastructure or special-purpose systems

**Examples:**
- Index 21: Build/CI system
- Index 22: Testing infrastructure
- Index 23: Staging environment
- Index 24: Monitoring/observability stack

### External Service Integration

For services requiring external connectivity (via Cloudflare Tunnels):

**Naming Convention:**
- API: `{worktree-name}-api.arch.ie`
- WebSocket: `wss://{worktree-name}-api.arch.ie/ws`
- Frontend: `{worktree-name}-web.arch.ie`

**Local to Public Mapping:**
- `localhost:5002` → `https://excel-sidebar-api.arch.ie`
- `localhost:5004` → `https://excel-sidebar-web.arch.ie`

---

## References

- **Registry:** `~/.martha/registry.json`
- **Service Config:** `~/.martha/service/.env`
- **Worktree Configs:** `{worktree}/.worktree-config.json`
- **Environment Files:** `{worktree}/.env.local`

**Related Documentation:**
- [README.md](../README.md) - System overview
- [DEPLOYMENT_SESSION_2026-01-11.md](DEPLOYMENT_SESSION_2026-01-11.md) - Initial deployment
- [main-branch-strategy.md](main-branch-strategy.md) - Production protection

---

**Maintained By:** Martha.dev MAPDS Team
**Last Review:** 2026-01-11
**Next Review:** When adding index 8+ worktrees
