# Martha.dev v4 - Installation Guide

**Next-generation TypeScript service for worktree management, issue tracking, and development monitoring**

## Prerequisites

- **Node.js** 18+ and npm
- **PostgreSQL** 14+ (for worktree registry and metrics)
- **Redis** (optional, for pub/sub events)
- **Docker** and Docker Compose (optional, for containerized deployment)
- **Git** with worktrees configured
- (Optional) **Cloudflare** account with API token for tunnels

## System Requirements

- Linux/macOS (Windows WSL2 supported)
- 4GB RAM minimum (8GB recommended)
- Network ports available:
  - 20000: Main service (API + Dashboard)
  - 20001: MCP server
  - 5432: PostgreSQL (if running locally)
  - 6379: Redis (if running locally)

## Quick Start

```bash
# Clone repository
git clone https://github.com/yourusername/martha.dev-v4.git
cd martha.dev-v4

# Install dependencies
npm install
cd dashboard && npm install && cd ..

# Set up environment configuration
cp .env.local.template .env.local
# Edit .env.local with your settings

# Set up database
npm run db:setup

# Build the service
npm run build

# Build the dashboard
cd dashboard && npm run build && cd ..

# Start the service
npm start
```

The service will be available at:
- **Dashboard**: http://localhost:20000
- **API**: http://localhost:20000/api
- **Tracker**: http://localhost:20000/tracker
- **WebSocket**: ws://localhost:20000/ws
- **MCP Server**: Use `npm run mcp` (separate process)

## Detailed Installation

### 1. Install Node.js Dependencies

```bash
# Install backend dependencies
npm install

# Install dashboard dependencies
cd dashboard
npm install
cd ..
```

### 2. Set Up PostgreSQL Database

**Option A: Using Docker Compose**

```bash
# Start PostgreSQL and Redis
docker-compose up -d postgres redis
```

**Option B: Local PostgreSQL**

```bash
# Create database
createdb martha_dev

# Create database user (if needed)
psql -c "CREATE USER martha WITH PASSWORD 'your_password';"
psql -c "GRANT ALL PRIVILEGES ON DATABASE martha_dev TO martha;"
```

### 3. Configure Environment

```bash
# Copy template
cp .env.local.template .env.local

# Edit configuration
nano .env.local
```

**Required settings:**
```bash
# Service Configuration
PORT=20000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://martha:password@localhost:5432/martha_dev

# Tracker
MARTHA_DIR=/path/to/.martha
TRACKER_SYNC_ENABLED=true

# Optional: GitHub Integration
GITHUB_TOKEN=ghp_xxxxxxxxxxxxx
GITHUB_OWNER=your-org
GITHUB_REPO=your-repo

# Optional: Cloudflare Tunnels
CLOUDFLARE_API_TOKEN=xxxxxxxxxxxxx
CLOUDFLARE_ACCOUNT_ID=xxxxxxxxxxxxx
CLOUDFLARE_ZONE_ID=xxxxxxxxxxxxx
CLOUDFLARE_DOMAIN=example.com
```

### 4. Initialize Database

```bash
# Run database setup script
npm run db:setup

# Or manually run schema
psql martha_dev < src/database/schema.sql

# Optional: Seed development data
npm run db:seed
```

### 5. Build and Start

```bash
# Build TypeScript service
npm run build

# Build React dashboard
cd dashboard && npm run build && cd ..

# Start the service
npm start
```

### 6. Verify Installation

```bash
# Check health endpoint
curl http://localhost:20000/api/health

# Expected response:
# {
#   "status": "healthy",
#   "version": "3.0.0",
#   "uptime": 123.456,
#   "database": "connected",
#   "redis": "connected"
# }

# Open dashboard in browser
open http://localhost:20000

# Test tracker
open http://localhost:20000/tracker

# Check WebSocket connection
wscat -c ws://localhost:20000/ws
```

## Development Mode

For active development with hot-reload:

```bash
# Terminal 1: Run backend with watch mode
npm run dev

# Terminal 2: Run dashboard dev server
cd dashboard && npm run dev
```

The dashboard dev server runs on port 21004 with proxying to the backend on port 20000.

## MCP Server Setup

The Model Context Protocol server allows Claude Code to interact with Martha:

```bash
# Start MCP server (separate terminal)
npm run mcp

# Or build and run compiled version
npm run mcp:build
npm run mcp:start
```

Add to your Claude Code configuration:
```json
{
  "mcpServers": {
    "martha": {
      "command": "node",
      "args": ["/path/to/martha.dev-v4/dist/mcp/server.js"],
      "disabled": false
    }
  }
}
```

## Production Deployment

### Using PM2

```bash
# Install PM2
npm install -g pm2

# Start service with PM2
pm2 start npm --name "martha-service" -- start

# Enable auto-restart on reboot
pm2 startup
pm2 save
```

### Using systemd

Create `/etc/systemd/system/martha.service`:

```ini
[Unit]
Description=Martha.dev v4 Service
After=network.target postgresql.service redis.service

[Service]
Type=simple
User=youruser
WorkingDirectory=/path/to/martha.dev-v4
ExecStart=/usr/bin/node /path/to/martha.dev-v4/dist/src/index.js
Restart=always
RestartSec=10
Environment="NODE_ENV=production"
Environment="PORT=20000"
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable martha
sudo systemctl start martha

# Check status
sudo systemctl status martha

# View logs
sudo journalctl -u martha -f
```

### Using Docker

```bash
# Build Docker image
docker build -t martha-dev-v4:latest .

# Run container
docker run -d \
  --name martha-service \
  -p 20000:20000 \
  -v $(pwd)/.env.local:/app/.env.local \
  -v /path/to/.martha:/mnt/data/martha-workflow/.martha \
  --restart unless-stopped \
  martha-dev-v4:latest
```

## Cloudflare Tunnel Setup

For remote access via Cloudflare Tunnel:

```bash
# Install cloudflared
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
sudo mv cloudflared-linux-amd64 /usr/local/bin/cloudflared
sudo chmod +x /usr/local/bin/cloudflared

# Authenticate
cloudflared tunnel login

# Create tunnel
cloudflared tunnel create martha

# Add tunnel configuration
cat > ~/.cloudflared/config.yml <<EOF
tunnel: martha
credentials-file: /home/youruser/.cloudflared/<tunnel-id>.json

ingress:
  - hostname: martha.example.com
    service: http://localhost:20000
  - service: http_status:404
EOF

# Start tunnel
cloudflared tunnel run martha
```

Or use systemd service for automatic startup.

## Worktree Registry Setup

Create worktree registry at `~/.martha/registry.json`:

```json
{
  "worktrees": [
    {
      "name": "my-feature",
      "path": "/path/to/worktree",
      "branch": "feature/new-feature",
      "status": "active",
      "metadata": {
        "created_at": "2026-01-15T00:00:00Z",
        "owner": "username"
      }
    }
  ]
}
```

Or manage via API:

```bash
# Add worktree
curl -X POST http://localhost:20000/api/worktrees \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my-feature",
    "path": "/path/to/worktree",
    "branch": "feature/new-feature"
  }'
```

## Troubleshooting

### Service Won't Start

1. **Check logs:**
   ```bash
   # If using npm start
   tail -f ~/.martha/logs/app.log

   # If using PM2
   pm2 logs martha-service

   # If using systemd
   sudo journalctl -u martha -f
   ```

2. **Check port availability:**
   ```bash
   lsof -i :20000
   ```

3. **Verify database connection:**
   ```bash
   psql $DATABASE_URL -c "SELECT version();"
   ```

### Database Connection Failed

```bash
# Check PostgreSQL is running
systemctl status postgresql
# or
docker ps | grep postgres

# Test connection
psql martha_dev -c "SELECT 1;"

# Verify DATABASE_URL in .env.local
cat .env.local | grep DATABASE_URL
```

### Dashboard Not Loading

```bash
# Rebuild dashboard
cd dashboard && npm run build && cd ..

# Verify build output exists
ls -la dashboard/dist/

# Check service logs for static file errors
tail -f ~/.martha/logs/app.log | grep "dashboard"
```

### Tracker Issues Not Loading

```bash
# Verify .martha directory exists
ls -la /path/to/.martha/

# Check issues directory
ls -la /path/to/.martha/issues/

# Test tracker API
curl http://localhost:20000/api/tracker/issues

# Check MARTHA_DIR in .env.local
cat .env.local | grep MARTHA_DIR
```

### WebSocket Connection Failed

```bash
# Test WebSocket with wscat
npm install -g wscat
wscat -c ws://localhost:20000/ws

# Check firewall rules
sudo ufw status | grep 20000
```

## Upgrading

```bash
# Pull latest changes
git pull origin main

# Install new dependencies
npm install
cd dashboard && npm install && cd ..

# Run database migrations (if any)
npm run db:migrate

# Rebuild
npm run build
cd dashboard && npm run build && cd ..

# Restart service
pm2 restart martha-service
# or
sudo systemctl restart martha
```

## Support

For issues during installation:
1. Check logs at `~/.martha/logs/`
2. Review [ARCHITECTURE.md](./ARCHITECTURE.md) for system design
3. Open an issue on GitHub with:
   - Installation log output
   - Environment details (OS, Node version, PostgreSQL version)
   - Configuration (redact sensitive values)

## Next Steps

After installation:
- Read [README.md](../README.md) for usage guide
- Configure [Cloudflare Tunnels](./PORT_ALLOCATION.md) for remote access
- Set up [MCP Server](../src/mcp/README.md) for Claude Code integration
- Explore [Tracker](./docs/TRACKER.md) for issue management
