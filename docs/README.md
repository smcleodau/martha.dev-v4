# Martha Documentation

**Version:** 3.0.0
**Service:** Multi-Agent Parallel Development System (MAPDS)

## What is Martha?

Martha is a **development orchestration service** that runs in the background on your machine. It provides:

- **Worktree Management** - Create and track multiple git worktrees (isolated development environments)
- **Real-Time Monitoring** - WebSocket agents that monitor each worktree's status
- **Dashboard** - Web UI at https://martha.arch.ie for viewing status and logs
- **MCP Integration** - Model Context Protocol tools for Claude Code

## Does Martha Take Over Everything?

**No.** Martha is a **service** (like a database or Redis) - it runs in the background and provides tools when you need them.

### What Martha Does:
- ✅ Monitors worktrees you create through it
- ✅ Tracks git status, Docker containers, and service health
- ✅ Provides a dashboard to view everything
- ✅ Offers MCP tools in Claude Code for worktree operations

### What Martha Does NOT Do:
- ❌ Does not intercept or modify your regular commands
- ❌ Does not automatically run commands without your request
- ❌ Does not modify your shell or terminal
- ❌ Does not track worktrees you create manually (unless you register them)

## How Martha Works

```
┌─────────────────────────────────────────────────────┐
│  Your Terminal / Claude Code                        │
│  - You run commands normally                        │
│  - Optionally use Martha MCP tools                  │
└──────────────┬──────────────────────────────────────┘
               │
               │ (optional MCP calls)
               │
┌──────────────▼──────────────────────────────────────┐
│  Martha Service (http://localhost:20000)            │
│  - Runs in background                               │
│  - Provides API and WebSocket                       │
│  - Manages worktree registry                        │
└──────────────┬──────────────────────────────────────┘
               │
               │ (WebSocket connections)
               │
┌──────────────▼──────────────────────────────────────┐
│  Worktree Agents (one per worktree)                 │
│  - Monitor git status                               │
│  - Check Docker containers (if available)           │
│  - Send events to Martha service                    │
└─────────────────────────────────────────────────────┘
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

### 2. View Dashboard
Open https://martha.arch.ie in your browser

### 3. List Worktrees
```bash
curl http://localhost:20000/api/v1/worktrees | jq
```

### 4. Use in Claude Code
Just use Claude Code normally. When you need worktree operations, Claude will call Martha's MCP tools (you'll see it in the conversation).

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

## Common Questions

### Q: Does Martha slow down my terminal?
**A:** No. Martha is a background service. It doesn't hook into your terminal or shell.

### Q: Can I use git normally?
**A:** Yes! Martha just provides additional tooling for managing worktrees. Your normal git commands work exactly as before.

### Q: What if I don't want to use Martha?
**A:** Just don't call its MCP tools in Claude Code. The service runs in the background but doesn't interfere with anything else.

### Q: How do I stop Martha?
```bash
# Stop the service
pkill -f "node dist/src/index.js"

# Stop all agents
pkill -f "agent-cli"
```

### Q: How do I restart Martha?
```bash
cd /mnt/data/martha.dev-v4
npm start > /tmp/martha-20000.log 2>&1 &
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

Martha is a **helpful service** that provides worktree management and monitoring. It:
- ✅ Runs quietly in the background
- ✅ Provides tools when you need them (via MCP in Claude Code)
- ✅ Shows you what's happening via dashboard and logs
- ❌ Does NOT take over your terminal or commands
- ❌ Does NOT run automatically without your request

**You are always in control.**
