# Martha.dev MAPDS: System Requirements Document
**Version:** 1.0
**Date:** 2026-01-11
**Status:** APPROVED

---

## Executive Summary

Martha.dev MAPDS (Multi-Agent Parallel Development System) is an MCP (Model Context Protocol) server that orchestrates claude-flow swarms to complete GitHub epics with verifiable execution evidence. The system deploys dedicated swarms per worktree, coordinates testing, and updates GitHub issues with proof of completion.

**Core Purpose:** Ensure GitHub issues are updated with verifiable evidence after proper testing - traceable, replayable, independently inspectable.

---

## 1. System Overview

### 1.1 Primary Goals
- Deploy claude-flow swarms to worktrees for epic completion
- Coordinate real testing (integration, E2E, API contract)
- Update GitHub issues with execution evidence (Braintrust traces, Browserbase replays)
- Automate GitHub Project board movement based on progress
- Enforce "Definition of Done" with verifiable proof

### 1.2 Key Principles
- **One Epic = One Swarm = One Worktree** (perfect isolation)
- **Evidence-Based Completion** (no evidence = issue stays open)
- **Real Tests Only** (no mocks, actual database/API interactions)
- **Traceable Execution** (end-to-end observability)

---

## 2. Architecture

### 2.1 System Components

**Martha Service** (Python FastAPI, always running)
- Manages GitHub epic/issue state
- Provisions/monitors worktrees
- Deploys claude-flow swarms
- Orchestrates testing
- Updates GitHub with evidence

**Martha MCP Server** (on-demand interface)
- MCP tools for Claude Code agents
- Forwards requests to Martha Service
- Enables agents to query epic context, trigger tests

**claude-flow Integration**
- Swarm spawning via subprocess
- Hook-based callbacks for events
- State file polling for progress

### 2.2 Integration Points
- **GitHub:** GraphQL API for epics/sub-issues, project boards
- **PostgreSQL:** Epic/issue/test state persistence
- **Redis:** Event streaming, caching
- **Docker:** Worktree environment isolation
- **Cloudflare:** Tunnel provisioning (optional)
- **Braintrust:** LLM observability traces
- **Browserbase:** E2E test session replays

---

## 3. Functional Requirements

### FR1: Epic Discovery & Tracking

**FR1.1: Epic Discovery (Simplified - Epic Already Exists)**
- **MUST** accept existing GitHub epic number as input
- **MUST** query GitHub GraphQL to fetch epic and sub-issues
- **MUST** store epic context in PostgreSQL
- **MUST** identify worktree path for epic

**FR1.2: Epic Status Tracking**
- **MUST** track state: `created`, `in_progress`, `testing`, `ready_for_merge`, `merged`, `closed`
- **MUST** provide MCP tool: `epic__get_context(worktree_name)`
- **MUST** calculate completion percentage from sub-issues
- **MUST** detect when all sub-issues complete

**FR1.3: Project Board Automation**
- **MUST** move issues through columns: To-Do → In Progress → Done
- **MUST** use GitHub GraphQL `updateProjectV2ItemFieldValue`
- **MUST** post comments explaining status changes

---

### FR2: Worktree Lifecycle Management

**FR2.1: Worktree Provisioning**
- **MUST** create git worktree with branch name matching epic
- **MUST** allocate unique port range (5 ports per worktree)
- **MUST** generate `.env.local` with allocated ports
- **MUST** initialize Docker Compose environment
- **MUST** provision Cloudflare tunnels (if enabled)
- **MUST** update registry.json with worktree metadata

**FR2.2: Worktree Monitoring**
- **MUST** monitor Git status (branch, commits, changes)
- **MUST** monitor Docker container health
- **MUST** monitor Cloudflare tunnel status
- **MUST** provide MCP tool: `worktree__get_status(name)`

**FR2.3: Worktree Cleanup**
- **MUST** stop Docker containers
- **MUST** destroy Cloudflare tunnels
- **MUST** remove git worktree directory
- **MUST** deallocate ports in registry
- **MUST** archive state to PostgreSQL

---

### FR3: Test Orchestration

**FR3.1: Test Execution**
- **MUST** support real integration tests (PostgreSQL, Redis, API)
- **MUST** support E2E tests (Playwright/Selenium)
- **MUST** support API contract tests
- **MUST** execute tests in Docker within worktree
- **MUST** capture test output and parse results
- **MUST** extract coverage percentage

**FR3.2: Test Result Management**
- **MUST** store results in PostgreSQL
- **MUST** link results to sub-issues
- **MUST** provide MCP tool: `test__get_results(execution_id)`
- **MUST** post results as GitHub comments
- **MUST** only mark issue "Done" if tests pass

**FR3.3: Quality Gates**
- **MUST** enforce minimum coverage threshold (default 80%)
- **MUST** prevent merge if tests failing
- **MUST** validate linting passes

---

### FR4: Swarm Deployment & Management

**FR4.1: Swarm Initialization**
- **MUST** spawn swarm: `npx claude-flow@alpha hive-mind spawn`
- **MUST** configure with epic context
- **MUST** create `.claude-flow/config.json`
- **MUST** track swarm PID for monitoring
- **SHOULD** use Node.js bridge for production (headless workaround)

**FR4.2: Hook-Based Integration**
- **MUST** configure hooks in `.claude/settings.json`
- **MUST** create `martha-notify.py` wrapper for HTTP callbacks
- **MUST** support events: `post-task`, `session-end`, `agent-complete`

**FR4.3: Swarm Health Monitoring**
- **MUST** poll `.swarm/state.json` every 30 seconds
- **MUST** detect crashes, attempt auto-recovery
- **MUST** track resource usage
- **SHOULD** enforce limits (4 CPUs, 4GB RAM per swarm)

**FR4.4: Swarm Registry**
- **MUST** maintain registry at `~/.martha/swarms-registry.json`
- Track: PID, worktree path, epic number, timestamps, status

---

### FR5: Evidence Collection & GitHub Updates

**FR5.1: Braintrust Integration**
- **MUST** integrate [Braintrust](https://www.braintrust.dev/) for LLM observability
- **MUST** capture traces (LLM calls, tool usage, reasoning)
- **MUST** tag traces with epic_number, issue_number
- **MUST** generate shareable trace URLs
- **MUST** capture metrics: duration, tokens, cost, errors

**FR5.2: Browserbase Integration**
- **MUST** integrate [Browserbase](https://docs.browserbase.com/) for E2E recording
- **MUST** capture session replays using rrweb
- **MUST** record DOM state, network HAR files
- **MUST** generate shareable replay URLs
- **MUST** link sessions to test executions

**FR5.3: VNC Recording (Optional)**
- **SHOULD** support VNC session recording
- **SHOULD** generate shareable recording URLs

**FR5.4: Evidence Aggregation**
- **MUST** collect after tests pass:
  - Braintrust trace IDs
  - Browserbase session IDs
  - Test results (pass/fail, coverage)
  - Commit hashes
- **MUST** validate evidence exists before marking complete
- **MUST** store evidence metadata in PostgreSQL

**FR5.5: GitHub Evidence Posting**
- **MUST** post evidence as issue comment
- **MUST** include: trace links, replay links, test summary, commits
- **MUST** move issue to "Done" ONLY after evidence posted
- **MUST** fail gracefully if evidence missing

**FR5.6: Definition of Done Enforcement**
- **MUST** enforce: No evidence = Issue stays open
- **MUST** validate evidence URLs accessible
- **MUST** ensure evidence shows real execution
- **MUST** make workflow traceable end-to-end

**GitHub Comment Template:**
```markdown
## ✅ Task Complete - Evidence Attached

**Issue:** #{issue_number}
**Epic:** #{epic_number}
**Completed:** {timestamp}

### 📊 Execution Traces
- [Braintrust Trace](https://braintrust.dev/traces/{trace_id})
- [Browserbase Replay](https://browserbase.com/sessions/{session_id})

### ✓ Test Results
- **Integration Tests:** 45/45 passed ✅
- **E2E Tests:** 12/12 passed ✅
- **Coverage:** 87.3%

### 📝 Commits
- `abc123` - Implement feature
- `def456` - Add tests

**Definition of Done:** ✅ Traceable, replayable, independently inspectable
```

---

## 4. Martha.dev MCP Server Specification

**Server Name:** `martha-dev`

**Installation:**
```bash
claude mcp add martha-dev python -m martha.mcp_server
```

**MCP Tools (15 total):**

**Epic Management:**
- `martha__epic__start(epic_number)`
- `martha__epic__get_context(worktree_name)`
- `martha__epic__get_status(epic_number)`

**Worktree Control:**
- `martha__worktree__create(epic_number, branch_name)`
- `martha__worktree__get_status(worktree_name)`
- `martha__worktree__destroy(worktree_name)`
- `martha__worktree__list_all()`

**Swarm Management:**
- `martha__swarm__spawn(epic_number, worktree_path)`
- `martha__swarm__status(swarm_id)`
- `martha__swarm__terminate(swarm_id)`
- `martha__swarm__list_active()`

**Test Management:**
- `martha__test__trigger(worktree_name, test_suites)`
- `martha__test__get_results(test_execution_id)`
- `martha__test__get_history(worktree_name)`

**Evidence Management:**
- `martha__evidence__collect(issue_number)`
- `martha__evidence__post_to_github(issue_number, evidence_bundle)`
- `martha__evidence__validate(evidence_bundle)`
- `martha__evidence__get_traces(issue_number)`

**Tunnel Provisioning:**
- `martha__tunnel__provision(worktree_name)`
- `martha__tunnel__destroy(worktree_name)`

**Event Queries:**
- `martha__events__get_recent(worktree_name, limit)`
- `martha__events__get_by_issue(issue_number)`

---

## 5. Implementation Phases

### Phase 1: Core MCP Server (Week 1) - START HERE
- Build Martha MCP server with 6 core tools
- Implement subprocess swarm spawning
- Test basic epic workflow

### Phase 2: GitHub Integration (Week 1-2)
- GraphQL client for epic/sub-issue management
- Project board automation
- Issue status synchronization

### Phase 3: Swarm Coordination (Week 2)
- Hook-based callback system
- Swarm registry and health monitoring
- State file polling

### Phase 4: Test Orchestration (Week 2-3)
- Test execution coordination
- Quality gate enforcement
- Result aggregation and GitHub reporting

### Phase 5: Production Hardening (Week 3-4)
- Node.js bridge service for swarm spawning
- Resource limits per swarm
- Error recovery and auto-retry
- Multi-repo state synchronization

### Phase 6: Evidence Collection (FUTURE)
- Braintrust integration
- Browserbase integration
- Evidence posting to GitHub
- Definition of done enforcement

---

## 6. Non-Functional Requirements

### NFR1: Performance
- MCP tool response time < 500ms
- Test execution start latency < 5 seconds
- Swarm spawn time < 30 seconds
- Support up to 5 concurrent swarms

### NFR2: Reliability
- System uptime: 99.5%
- Automatic swarm crash recovery
- State persistence across service restarts
- Graceful degradation if GitHub API unavailable

### NFR3: Security
- GitHub token stored securely (env vars)
- PostgreSQL credentials encrypted
- API authentication for Martha Service
- Audit logging for all state changes

### NFR4: Observability
- Structured logging (JSON format)
- Prometheus metrics export
- Distributed tracing with OpenTelemetry
- Health check endpoints

### NFR5: Scalability
- Horizontal scaling of Martha Service
- Connection pooling for PostgreSQL
- Redis for distributed state
- Kubernetes-ready deployment

---

## 7. Success Criteria

**Must Have (MVP):**
- ✅ Start from existing epic → worktree + swarm deployed
- ✅ Claude agents query context via MCP
- ✅ Tests execute with real databases
- ✅ Test results posted to GitHub
- ✅ Issues move through project board automatically
- ✅ Evidence (Braintrust/Browserbase) posted to issues

**Should Have:**
- Parallel swarm coordination
- Dependency tracking between epics
- File conflict detection
- Epic pause/resume

**Nice to Have:**
- Web dashboard for visualization
- Slack notifications
- Epic templates
- Automatic rollback on failures

---

## 8. Dependencies

**Required:**
- Python 3.11+
- PostgreSQL 15+
- Redis 7+
- Docker 24+
- Node.js 18+ (for claude-flow)
- GitHub Personal Access Token (repo, project scopes)
- GitHub repo with sub-issues enabled (public preview)

**Optional:**
- Cloudflare API token (tunnels)
- Braintrust API key (evidence)
- Browserbase API key (E2E recording)

**Python Packages:**
```
fastapi
httpx
asyncpg
redis
pydantic
pydantic-settings
python-jose
```

---

## 9. Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| GitHub API rate limits | High | Cache IDs, batch mutations, exponential backoff |
| Test execution timeouts | Medium | Per-suite timeouts, fast-fail |
| Swarm crashes | High | Auto-recovery, state persistence |
| Resource exhaustion | High | Max 5 concurrent swarms, container limits |
| claude-flow headless issues | Medium | Node.js bridge service with PTY |

---

## 10. References

- [Braintrust Platform](https://www.braintrust.dev/)
- [Browserbase Session Replay](https://docs.browserbase.com/features/session-replay)
- [claude-flow GitHub](https://github.com/ruvnet/claude-flow)
- [claude-flow Hooks System](https://github.com/ruvnet/claude-flow/wiki/Hooks-System)
- [Model Context Protocol Specification](https://modelcontextprotocol.io/)

---

**Document Approved By:** User
**Implementation Start Date:** 2026-01-11
**Target Completion:** Week 3-4 (infrastructure), Week 6+ (evidence)
