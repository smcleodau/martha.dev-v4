# Martha Documentation

**Version:** 3.0.0
**Service:** Multi-Agent Parallel Development System (MAPDS)

## What is Martha?

Martha orchestrates parallel development workflows. It manages worktrees, monitors agents, and coordinates autonomous swarms for epic-level task execution.

**Core Capabilities:**
- **Swarm Orchestration** - Launch autonomous multi-agent swarms to work through GitHub epics
- **Worktree Management** - Create and track multiple git worktrees (isolated development environments)
- **Real-Time Monitoring** - WebSocket agents that monitor each worktree's status
- **Dashboard** - Web UI at https://martha.arch.ie for viewing status and logs
- **MCP Integration** - Model Context Protocol tools for Claude Code

**Note:** Martha is a background service - it doesn't intercept commands or modify your shell.

## Swarms: Autonomous Epic Management

Martha's most powerful feature is **swarm orchestration**. Launch a swarm for any GitHub epic and watch multiple Claude agents work through all sub-issues autonomously.

```bash
# Via MCP in Claude Code
martha__swarm__spawn(epic_number=123, worktree_path="/path/to/worktree")
```

The swarm:
- Fetches the epic and all sub-issues from GitHub
- Spawns multiple specialized agents (planner, implementer, tester, reviewer)
- Agents coordinate via hive-mind topology (shared reasoning)
- Work progresses autonomously through tasks
- Posts progress updates to GitHub as phases complete
- Monitors resource usage and health (CPU, memory, uptime)

Monitor in real-time via dashboard or MCP:
```bash
martha__swarm__status(swarm_id="abc-123")
martha__swarm__list_active()
martha__swarm__terminate(swarm_id="abc-123", reason="Epic scope changed")
```

**Example:** Spawn a swarm for epic #123 with 5 sub-issues. The swarm spawns 4 agents that collaborate to implement features, write tests, and create PRs. Watch progress in the dashboard or GitHub comments. Swarm completes autonomously and posts completion status.

## How Martha Works

```
┌─────────────────────────────────────────────────────┐
│  Claude Code / Terminal                             │
│  - Use Martha MCP tools                             │
│  - Spawn swarms for epics                           │
│  - Create/manage worktrees                          │
└──────────────┬──────────────────────────────────────┘
               │ (MCP calls)
┌──────────────▼──────────────────────────────────────┐
│  Martha Service (http://localhost:20000)            │
│  - Worktree registry & lifecycle                    │
│  - Swarm orchestration                              │
│  - API and WebSocket                                │
│  - GitHub integration                               │
└──────────┬────────────────────┬─────────────────────┘
           │                    │
           │ (WebSocket)        │ (Process spawn)
           │                    │
┌──────────▼───────┐   ┌───────▼──────────────────────┐
│  Worktree Agents │   │  Swarms (claude-flow)        │
│  - Monitor git   │   │  ├─ Agent 1 (planner)        │
│  - Track Docker  │   │  ├─ Agent 2 (implementer)    │
│  - Send events   │   │  ├─ Agent 3 (tester)         │
└──────────────────┘   │  └─ Agent 4 (reviewer)       │
                       │  Hive-mind coordination       │
                       │  Post callbacks to Martha     │
                       └──────────────────────────────┘
```

## When You Use Martha

### Through Claude Code (MCP)
When you're in Claude Code, you can use Martha tools:

```javascript
// Example MCP tool calls
martha__worktree__create_daily()           // Create daily branch
martha__worktree__create(...)              // Create feature worktree
martha__worktree__list()                   // List all worktrees
martha__worktree__destroy(...)             // Remove worktree
```

Claude Code will show you when it's calling these tools. **You're in control.**

### Through the API
You can also call Martha's REST API directly:

```bash
curl http://localhost:20000/api/v1/worktrees  # List worktrees
curl http://localhost:20000/health            # Check service status
```

### Through the Dashboard
Open https://martha.arch.ie in your browser to:
- View all worktree statuses
- Watch live logs
- See service health
- Monitor agent connections

## Starting Claude Code

Martha does **not** interfere with Claude Code starting. They are separate:

- **Claude Code** - AI coding assistant CLI tool
- **Martha** - Background service for worktree management

If Claude Code won't start, it's a separate issue (likely Python environment issue, not Martha).

## Quick Start Guide

### 1. Check if Martha is Running
```bash
curl http://localhost:20000/health
```

### 2. Launch a Swarm (Most Powerful Feature)
In Claude Code, spawn a swarm for a GitHub epic:
```bash
# Martha fetches epic #123 and spawns autonomous agents
martha__swarm__spawn(epic_number=123, worktree_path="/path/to/worktree")

# Monitor progress
martha__swarm__list_active()
martha__swarm__status(swarm_id="...")
```

Watch in the dashboard as agents collaborate to complete all sub-issues.

### 3. View Dashboard
Open https://martha.arch.ie to monitor:
- Active swarms and their progress
- Worktree statuses
- Real-time logs
- Resource usage

### 4. Create Worktrees (Manual Development)
```bash
# Via MCP in Claude Code
martha__worktree__create_daily()  # Create daily work branch
martha__worktree__list()           # List all worktrees
```

### 5. Use in Claude Code
Martha's MCP tools are available in Claude Code. When you need worktree operations or want to spawn swarms, Claude will call the appropriate tools.

## Documentation Index

### Core Documentation
- **[CAPABILITIES.md](./CAPABILITIES.md)** - Complete feature list and technical details
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System design and components
- **[API.md](./API.md)** - REST and WebSocket API reference

### Setup & Configuration
- **[INSTALLATION.md](./INSTALLATION.md)** - Installation instructions
- **[PORT_ALLOCATION.md](./PORT_ALLOCATION.md)** - Port allocation strategy
- **[BRANCHING_STRATEGY.md](./BRANCHING_STRATEGY.md)** - Git workflow

### Deployment
- **[DEPLOYMENT_SESSION_2026-01-11.md](./DEPLOYMENT_SESSION_2026-01-11.md)** - Deployment session notes

## Current Status

### Service
- Running on port 20000
- Dashboard accessible at https://martha.arch.ie
- Database: PostgreSQL (port 21005)
- Cache: Redis (port 20001)

### Active Worktrees
Check the dashboard or run:
```bash
curl -s http://localhost:20000/api/v1/worktrees | jq '.worktrees[] | {name, status}'
```

### Logs
Agent logs are at:
```bash
/tmp/agent-{worktree-name}.log
```

Service log:
```bash
/tmp/martha-20000.log
```

## Common Operations

### Stop Martha
```bash
# Stop the service
pkill -f "node dist/src/index.js"

# Stop all agents
pkill -f "agent-cli"

# Stop a specific swarm
martha__swarm__terminate(swarm_id="...", reason="Manual stop")
```

### Restart Martha
```bash
cd /mnt/data/martha.dev-v4
npm start > /tmp/martha-20000.log 2>&1 &
```

### Check Swarm Status
```bash
# List all active swarms
curl http://localhost:20000/api/v1/swarms | jq

# Get specific swarm details
martha__swarm__status(swarm_id="...")
```

## Troubleshooting

### Service won't start
```bash
# Check if port is in use
lsof -i :20000

# Check logs
tail -50 /tmp/martha-20000.log
```

### Agents not connecting
```bash
# Check agent logs
tail -50 /tmp/agent-{worktree-name}.log

# Restart agent
bash scripts/start-ts-agent.sh {name} {path} ws://localhost:20000
```

### Dashboard shows worktrees offline
- Check if service is running: `curl http://localhost:20000/health`
- Check if agents are running: `ps aux | grep agent-cli`
- Restart agents using the script above

## Getting Help

1. Check the dashboard for real-time status
2. Review logs in `/tmp/agent-*.log` and `/tmp/martha-20000.log`
3. Read [CAPABILITIES.md](./CAPABILITIES.md) for detailed feature documentation
4. Check [API.md](./API.md) for API reference

## Summary

Martha orchestrates parallel development with three key capabilities:

1. **Swarms** - Autonomous multi-agent sessions that work through entire GitHub epics
2. **Worktrees** - Isolated development environments with automatic port allocation
3. **Monitoring** - Real-time status tracking, logs, and resource usage

Access via:
- **MCP tools** in Claude Code
- **Dashboard** at https://martha.arch.ie
- **REST API** at http://localhost:20000
