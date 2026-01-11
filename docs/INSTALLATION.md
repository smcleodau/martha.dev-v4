# Martha.dev MAPDS - Installation Guide

**Multi-Agent Parallel Development System**

## Prerequisites

- Python 3.8+
- Docker and Docker Compose
- Redis (for event storage)
- Git worktrees already set up
- (Optional) Cloudflare account with API token

## System Requirements

- Linux/macOS (Windows WSL2 supported)
- 4GB RAM minimum (8GB recommended)
- Docker socket access for user account
- Network ports available (9000 for service, worktree-specific ports)

## Installation Steps

### 1. Clone Repository

```bash
git clone https://github.com/yourusername/martha.dev-v4.git
cd martha.dev-v4
```

### 2. Install Python Dependencies

```bash
# Create virtual environment (recommended)
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Create Configuration Directory

```bash
mkdir -p ~/.martha/service
mkdir -p ~/.martha/logs
mkdir -p ~/.martha/tunnels
```

### 4. Configure Service

```bash
# Copy service configuration template
cp config/.env.template ~/.martha/service/.env

# Edit configuration
nano ~/.martha/service/.env
```

**Required settings:**
```bash
SERVICE_PORT=9000
REDIS_URL=redis://:your_password@localhost:6379
```

**Optional settings:**
```bash
# For GitHub integration
GITHUB_TOKEN=ghp_xxxxxxxxxxxxx

# For Cloudflare tunnels
CLOUDFLARE_API_TOKEN=xxxxxxxxxxxxx
CLOUDFLARE_ZONE_ID=xxxxxxxxxxxxx
CLOUDFLARE_ACCOUNT_ID=xxxxxxxxxxxxx
CLOUDFLARE_DOMAIN=arch.ie
```

### 5. Create Registry

```bash
# Copy registry template
cp config/registry.template.json ~/.martha/registry.json

# Edit with your worktrees
nano ~/.martha/registry.json
```

**Example entry:**
```json
{
  "name": "my-worktree",
  "index": 5,
  "branch": "feature-branch",
  "path": "/path/to/worktree",
  "ports": {
    "postgres": 5000,
    "redis": 5001,
    "api": 5002,
    "pgadmin": 5003,
    "frontend": 5004
  },
  "containers": {
    "postgres": "archie-my-worktree-postgres",
    "redis": "archie-my-worktree-redis",
    "api": "archie-my-worktree-api",
    "pgadmin": "archie-my-worktree-pgadmin"
  },
  "network": "archie-my-worktree-network",
  "volumes": {
    "postgres": "archie-my-worktree-postgres-data",
    "redis": "archie-my-worktree-redis-data",
    "file_uploads": "archie-my-worktree-file-uploads"
  },
  "database": {
    "name": "archie_my_worktree_dev",
    "url": "postgresql://user:pass@localhost:5000/archie_my_worktree_dev"
  },
  "enabled": true
}
```

### 6. Configure Docker Group Access

The monitoring agents need access to Docker socket:

```bash
# Add your user to docker group
sudo usermod -aG docker $USER

# Log out and back in, or use:
newgrp docker

# Verify access
docker ps
```

### 7. Start Redis (if not already running)

```bash
# Using Docker
docker run -d \
  --name martha-redis \
  -p 6379:6379 \
  redis:alpine redis-server --requirepass your_password

# Or use system Redis
sudo systemctl start redis
```

### 8. Start Monitoring Service

```bash
cd service
python service.py
```

You should see:
```
[2026-01-11 18:00:00] INFO: 🚀 Worktree Monitoring Service starting...
[2026-01-11 18:00:00] INFO: Version: 2.0.0
[2026-01-11 18:00:00] INFO: Port: 9000
[2026-01-11 18:00:00] INFO: ✅ Connected to Redis
INFO:     Uvicorn running on http://0.0.0.0:9000
```

Verify: `curl http://localhost:9000/health`

### 9. Configure Worktrees

For each worktree you want to monitor:

```bash
# Copy agent script
cp agent/worktree_agent.py /path/to/worktree/

# Copy and customize .env.local
cp config/.env.worktree.example /path/to/worktree/.env.local

# Edit with correct INDEX and ports
nano /path/to/worktree/.env.local
```

**Example .env.local for index 5:**
```bash
WORKTREE_INDEX=5
WORKTREE_NAME=my-worktree
COMPOSE_PROJECT_NAME=archie-my-worktree

POSTGRES_PORT=5000
REDIS_PORT=5001
API_PORT=5002
PGADMIN_PORT=5003
FRONTEND_PORT=5004

DATABASE_URL=postgresql://user:pass@localhost:5000/dbname
REDIS_URL=redis://:pass@localhost:5001
```

### 10. Update Docker Compose Files

Your `docker-compose.yml` must support environment variable ports:

```yaml
services:
  postgres:
    image: postgres:15-alpine
    ports:
      - "${POSTGRES_PORT:-5432}:5432"
    container_name: ${COMPOSE_PROJECT_NAME:-archie}-postgres
    networks:
      - ${COMPOSE_PROJECT_NAME:-archie}-network
    volumes:
      - ${COMPOSE_PROJECT_NAME:-archie}-postgres-data:/var/lib/postgresql/data

  redis:
    image: redis:alpine
    ports:
      - "${REDIS_PORT:-6379}:6379"
    container_name: ${COMPOSE_PROJECT_NAME:-archie}-redis
    networks:
      - ${COMPOSE_PROJECT_NAME:-archie}-network
    volumes:
      - ${COMPOSE_PROJECT_NAME:-archie}-redis-data:/data

networks:
  default:
    name: ${COMPOSE_PROJECT_NAME:-archie}-network

volumes:
  postgres-data:
    name: ${COMPOSE_PROJECT_NAME:-archie}-postgres-data
  redis-data:
    name: ${COMPOSE_PROJECT_NAME:-archie}-redis-data
```

### 11. Start Worktree Agents

```bash
# Start all agents at once
./scripts/start-worktree-agents.sh

# Or start individually
./scripts/start-single-agent.sh my-worktree /path/to/worktree ~/.martha/logs/my-worktree.log
```

### 12. Verify Everything is Running

```bash
# Check service health
curl http://localhost:9000/health

# List connected worktrees
curl http://localhost:9000/api/v1/worktrees

# Check agent logs
tail -f ~/.martha/logs/worktree-agents-my-worktree.log
```

Expected output for connected worktree:
```json
{
  "name": "my-worktree",
  "status": "online",
  "last_seen": "2026-01-11T18:00:00",
  "health": {
    "docker": "healthy",
    "postgres": "healthy",
    "redis": "healthy",
    "api": "healthy"
  }
}
```

## Post-Installation

### Provision Cloudflare Tunnels (Optional)

```bash
# Via CLI
cd service
python cli_client.py provision-tunnel my-worktree

# Or via API
curl -X POST http://localhost:9000/api/v1/worktrees/my-worktree/tunnels/provision
```

### Start Worktree Docker Containers

```bash
cd /path/to/worktree
docker-compose up -d
```

The agent will automatically detect the containers and start monitoring.

### Validate Configuration

```bash
# Run validation script
python scripts/validate-worktree-config.py /path/to/worktree

# Verify git safety
./scripts/verify-git-safety.sh
```

## Running as System Service (Optional)

### Systemd Service

Create `/etc/systemd/system/martha-service.service`:

```ini
[Unit]
Description=Martha.dev Worktree Monitoring Service
After=network.target redis.service docker.service

[Service]
Type=simple
User=youruser
WorkingDirectory=/home/youruser/martha.dev-v4/service
ExecStart=/home/youruser/martha.dev-v4/venv/bin/python service.py
Restart=always
RestartSec=10
Environment="PYTHONUNBUFFERED=1"

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable martha-service
sudo systemctl start martha-service
sudo systemctl status martha-service
```

### Agent Systemd Services

For each worktree, create `/etc/systemd/system/martha-agent-{name}.service`:

```ini
[Unit]
Description=Martha.dev Agent - {worktree-name}
After=network.target docker.service martha-service.service

[Service]
Type=simple
User=youruser
WorkingDirectory=/path/to/worktree
ExecStart=/home/youruser/martha.dev-v4/scripts/start-single-agent.sh {name} /path/to/worktree /var/log/martha/{name}.log
Restart=always
RestartSec=10
Environment="PYTHONUNBUFFERED=1"

[Install]
WantedBy=multi-user.target
```

## Troubleshooting Installation

### Service Won't Start

**Redis connection failed:**
```bash
# Check Redis is running
redis-cli -a your_password ping

# Verify Redis URL in .env
cat ~/.martha/service/.env | grep REDIS_URL
```

**Port 9000 already in use:**
```bash
# Find what's using the port
lsof -i :9000

# Kill the process or change SERVICE_PORT in .env
```

### Agent Won't Connect

**WebSocket connection refused:**
- Ensure service is running: `curl http://localhost:9000/health`
- Check firewall allows port 9000
- Verify MONITOR_SERVICE_URL in agent environment

**Docker permission denied:**
```bash
# Verify Docker group membership
groups | grep docker

# Add to group if needed
sudo usermod -aG docker $USER
newgrp docker
```

### Port Conflicts

**Port already in use:**
```bash
# Find what's using the port
lsof -i :5000

# Update INDEX in .env.local to use different range
# Example: INDEX=8 → ports 8000-8004
```

**Docker container name conflicts:**
- Ensure COMPOSE_PROJECT_NAME is unique per worktree
- Check no containers with same names: `docker ps -a | grep archie-`

## Next Steps

- Read [Main Branch Strategy](main-branch-strategy.md) for production setup
- Review [Architecture](../service/ARCHITECTURE.md) for system design
- Explore [API Documentation](API.md) for integration options
- Set up monitoring dashboards (Grafana, etc.)

## Support

If you encounter issues during installation:
1. Check logs: `~/.martha/logs/` and `service/service.log`
2. Validate configuration: `python scripts/validate-worktree-config.py`
3. Review troubleshooting section in main [README](../README.md)
4. Open an issue on GitHub with logs and configuration
