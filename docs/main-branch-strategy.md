# Main Develop Branch Protection Strategy

## Current Situation

**Main Branch**: `/mnt/data/archie-platform-v2` (develop)
- **Purpose**: Production/staging environment serving stuart.arch.ie
- **Current Ports**: 8000 (API), 5432 (Postgres), 6379 (Redis) - DEFAULT PORTS
- **Containers**: archie-postgres-dev, archie-redis-dev, archie-api-dev
- **Status**: Containers NOT currently running (stuart.arch.ie responding via other means)
- **Problem**: Default ports create conflicts with worktrees

## Solution: Allocate Index 1 with Port Range 1000-1004

### Port Allocation
- **Index**: 1 (highest priority)
- **Port Range**: 1000-1004
- **PostgreSQL**: 1000
- **Redis**: 1001  
- **API**: 1002
- **pgAdmin**: 1003
- **Frontend**: 1004

### Why 1000-1004?
1. **Priority**: Index 1 signifies this is the primary/production environment
2. **Isolation**: Well separated from all worktrees (3000+)
3. **No Conflicts**: Avoids default ports (5432, 6379, 8000)
4. **Clear Hierarchy**: Main (1xxx) > Worktrees (3xxx-7xxx)

## Implementation Plan

### 1. Create .env.local for Main Branch
```bash
COMPOSE_PROJECT_NAME=archie-main-dev
POSTGRES_PORT=1000
REDIS_PORT=1001
API_PORT=1002
PGADMIN_PORT=1003
FRONTEND_PORT=1004
DATABASE_URL=postgresql://archie_user:archie_dev_password@localhost:1000/archie_dev
REDIS_URL=redis://:archie_dev_redis_password@localhost:1001
```

### 2. Update Registry
Add main branch as index 1:
```json
{
  "name": "main-develop",
  "index": 1,
  "branch": "develop",
  "path": "/mnt/data/archie-platform-v2",
  "ports": {
    "postgres": 1000,
    "redis": 1001,
    "api": 1002,
    "pgadmin": 1003,
    "frontend": 1004
  },
  "enabled": true,
  "production": true
}
```

### 3. Protection Rules
- **NO worktree monitoring agent** - Keep main branch separate
- **NO auto-management** - Manual control only
- **Reserved range**: 1000-1999 exclusively for main branch
- **Cloudflare tunnel**: Keep existing stuart.arch.ie configuration

### 4. Fix Copilot Port Conflicts
Copilot is currently using BOTH 4000-4004 AND default ports (5432, 6379, 8000).
Stop and restart with ONLY 4000-4004.

## Final Port Map

| Environment | Index | Port Range | Purpose |
|-------------|-------|------------|---------|
| **Main (develop)** | 1 | 1000-1004 | Production/staging (stuart.arch.ie) |
| Reserved | 2 | 2000-2004 | (Future use) |
| communications-service | 3 | 3000-3004 | Worktree |
| copilot-integration | 4 | 4000-4004 | Worktree |
| excel-sidebar-epics | 5 | 5000-5004 | Worktree |
| teams-integration | 6 | 6000-6004 | Worktree |
| python-310-work | 7 | 7000-7004 | Worktree |

## Non-Intrusion Guarantees

1. **.env.local only** - Main .env untouched
2. **Manual startup** - No automatic agent control
3. **Separate monitoring** - Not part of worktree monitoring system
4. **Port isolation** - No overlap with any worktree (3000+)
5. **Cloudflare separate** - Keep existing stuart.arch.ie tunnel configuration
