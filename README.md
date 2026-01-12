# Martha.dev TypeScript Service

> **Multi-Agent Parallel Development System (MAPDS)** - TypeScript/Node.js Implementation

Martha is an intelligent development orchestration system that manages parallel git worktrees, coordinates multi-agent swarms, monitors service health, and provides comprehensive observability for modern development workflows.

## 🎯 Project Overview

This is a complete TypeScript/Node.js rewrite of the Martha development system, designed to enable first-class integration with:
- **Model Context Protocol (MCP)** - Claude Code integration
- **Claude-Flow** - Swarm orchestration
- **Modern observability** - Braintrust, Browserbase, Prometheus

### Why TypeScript?

- MCP SDK is TypeScript-native (`@modelcontextprotocol/sdk`)
- Claude-flow is Node.js-based (shared runtime simplifies integration)
- Better async patterns and type safety
- Superior tooling and developer experience

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Setup database
npm run db:setup

# Configure environment
cp .env.local.template .env.local
# Edit .env.local with your credentials

# Build and start
npm run build
npm start            # Service on port 20000
```

**Service:** http://localhost:20000 (or https://martha.arch.ie via Cloudflare Tunnel)
**Dashboard:** Built-in at root URL
**API:** `/api/v1/*` endpoints
**Logs:** `/logs` page with live streaming

## 📋 Current Status

**Version:** 3.0.0 | **Branch:** develop

### ✅ Completed
- ✅ Phase 1: Foundation (config, database, logging)
- ✅ Phase 2: Server & WebSocket (Fastify, events, pub/sub)
- ✅ Phase 3: Worktree Agent (Git/Docker/health monitoring)
- ✅ Dashboard: React UI with live updates and log streaming
- ✅ MCP Server: Basic worktree management tools
- ✅ Cloudflare Integration: Tunnel and DNS automation
- ✅ Multi-Repository Support: archie-platform-v2 and martha.dev-v4
- ✅ SSE Log Streaming: Real-time log viewing in dashboard
- ✅ Agent Version Tracking: Display v3.0.0 in dashboard

### 🔄 In Progress
- Enhanced observability (Braintrust, Browserbase)
- Automated testing infrastructure
- Swarm orchestration tools

## 🏗️ Architecture

| Service | Port | Purpose |
|---------|------|---------|
| Main Service | 20000 | HTTP API + WebSocket |
| Redis | 20001 | Events & cache |
| MCP Server | 20002 | Model Context Protocol |
| Metrics | 20003 | Prometheus metrics |
| Dashboard | 20004 | Web UI (served by main service) |
| PostgreSQL | 21005 | Database (isolated) |

## 🎨 Dashboard

Martha's fresh color palette:
- **Primary:** #6ee7b7 (mint green)
- **Accent:** #82c9ed (soft blue)
- **Secondary:** #fa7d6a (coral/salmon)
- **Tertiary:** #ff9a76 (peachy orange)

### Pages
- **Overview**: Real-time worktree status, service health, agent versions
- **Logs**: Live log streaming with SSE, JSON parsing, auto-scroll
- **Documentation**: Integrated docs viewer
- **Settings**: Configuration management

### Features
- Auto-refresh every 5 seconds
- Color-coded online/offline status
- Directory path display
- Port information per worktree
- Agent version tracking (v3.0.0)

## 📚 Documentation

See `/docs` directory:
- **[CAPABILITIES.md](./docs/CAPABILITIES.md)** - Complete feature overview
- **[ARCHITECTURE.md](./docs/ARCHITECTURE.md)** - System design
- **[API.md](./docs/API.md)** - API reference
- **[PORT_ALLOCATION.md](./docs/PORT_ALLOCATION.md)** - Port strategy
- **[BRANCHING_STRATEGY.md](./docs/BRANCHING_STRATEGY.md)** - Git workflow
- **[DEPLOYMENT_SESSION_2026-01-11.md](./docs/DEPLOYMENT_SESSION_2026-01-11.md)** - Deployment notes

## 🔌 API Quick Reference

```bash
# Core
GET  /health                              # Health check
GET  /api/v1/worktrees                    # List all worktrees with status
GET  /api/v1/worktrees/:name              # Get specific worktree
GET  /api/v1/worktrees/:name/events       # Worktree event history

# Monitoring
GET  /api/v1/agents                       # List connected agents
GET  /api/v1/clients                      # List connected clients
GET  /api/v1/logs                         # List available log files
GET  /api/v1/logs/:worktree               # Stream logs (SSE)

# Content
GET  /api/v1/changelog                    # Recent changelog entries

# WebSocket
WS   /ws/agent/:worktree                  # Agent connection
WS   /ws/client/:clientId                 # Client connection
```

## 🤖 Running an Agent

```bash
bash scripts/start-ts-agent.sh <name> <path> <url>

# Example
bash scripts/start-ts-agent.sh communications-service \
  /mnt/data/archie-platform-v2-worktrees/communications-service \
  ws://localhost:20000

# Logs
tail -f /tmp/agent-<name>.log
```

## 🔧 Configuration

Edit `.env.local`:
```bash
# Service
SERVICE_PORT=20000
NODE_ENV=production

# Database
DATABASE_URL=postgresql://martha_ts_user:***@localhost:21005/martha_ts
DATABASE_SCHEMA=ts_martha

# Redis
REDIS_URL=redis://:password@localhost:20001

# Integrations (optional)
GITHUB_TOKEN=***
CLOUDFLARE_API_TOKEN=***
BRAINTRUST_API_KEY=***
BROWSERBASE_API_KEY=***
```

## ✨ Key Features

### Real-Time Monitoring
- Live worktree status with agent version tracking
- WebSocket-based event streaming
- Auto-reconnection with exponential backoff
- Graceful degradation (Docker, Redis)

### Log Streaming
- Server-Sent Events (SSE) for live logs
- JSON log parsing with color-coded levels
- Auto-scroll and filtering
- View logs from any worktree agent

### Worktree Management
- Daily branch creation from origin/develop
- Parent-child worktree relationships
- Automatic port allocation
- Multi-repository support

### Developer Experience
- Integrated dashboard at root URL
- Comprehensive API documentation
- MCP integration for Claude Code
- Color-coded status indicators
- Ports: 21000 (service), 21004 (dashboard), 21005 (postgres)

---

**Version 3.0.0** | MIT License | 2026-01-12
