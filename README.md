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

# Start the service
npm run dev          # Service on port 21000

# Start the dashboard
cd dashboard && npm install && npm run dev  # Dashboard on port 21004
```

**Service:** http://localhost:21000
**Dashboard:** http://localhost:21004

## 📋 Current Status

**Version:** 3.0.0 | **Branch:** feature/typescript-rewrite

### ✅ Completed
- Phase 1: Foundation (config, database, logging)
- Phase 2: Server & WebSocket (Fastify, events, pub/sub)
- Phase 3: Worktree Agent (Git/Docker/health monitoring)
- Dashboard: React UI with Martha's color palette

### 🔄 Next: Phase 4 - MCP Server (23 tools)

## 🏗️ Architecture

| Service | Port | Purpose |
|---------|------|---------|
| Main Service | 21000 | HTTP API + WebSocket |
| Redis | 20001 | Events & cache (shared) |
| PostgreSQL | 21005 | Data (isolated) |
| Dashboard | 21004 | Web UI |

## 🎨 Dashboard

Martha's vibrant beach aesthetic:
- **Primary:** #fa7d6a (coral/salmon)
- **Accent:** #4db8b8 (turquoise)
- **Secondary:** #ff9a76 (peach)

Pages: Overview, Documentation, Settings

## 📚 Documentation

See `/docs` directory:
- `ARCHITECTURE.md` - System design
- `API.md` - API reference
- `CHANGELOG.md` - Version history
- `MIGRATION_PLAN.md` - 12-week plan

## 🔌 API Quick Reference

```bash
GET  /health                        # Health check
GET  /api/v1/worktrees             # List worktrees
WS   /ws/agent/:worktree           # Agent connection
WS   /ws/client/:id                # Client connection
```

## 🤖 Running an Agent

```bash
npm run agent <name> [path] [url]

# Example
npm run agent typescript-rewrite . ws://localhost:21000
```

## 🔧 Configuration

Edit `.env.local`:
- Database: `postgresql://martha_ts_user:***@localhost:21005/martha_ts`
- Redis: `redis://:***@localhost:20001`
- Ports: 21000 (service), 21004 (dashboard), 21005 (postgres)

---

**Version 3.0.0** | MIT License | 2026-01-12
