# Martha.dev-v4 Orchestration Platform Implementation Plan

**Branch:** `feature/orchestration-platform`
**Base:** `develop` branch of `/mnt/data/martha.dev-v4`
**Created:** 2026-01-16

## Executive Summary

Implement a complete development orchestration platform in martha.dev-v4 that uses Temporal workflows, comprehensive telemetry, ML-driven agent selection, and real-time monitoring to coordinate AI coding agents at massive scale (14-24+ issues per batch).

**Key Goal:** Build the orchestration engine ON TOP OF existing martha.dev-v4 infrastructure (Fastify server, PostgreSQL, Redis, tracker).

## Project Scope

### What Already Exists (martha.dev-v4)
✅ **Foundation Infrastructure:**
- Fastify web server (port 20000)
- PostgreSQL database with `pg` driver
- Redis pub/sub with `ioredis`
- WebSocket support
- Issue tracker system (`src/tracker/`)
- Agent management (`src/agents/`)
- Dashboard UI
- MCP server integration

✅ **Completed Phases:**
- Phase 1: Foundation (config, database, logging)
- Phase 2: Server & WebSocket (Fastify, events, pub/sub)

### What We're Building (New)
🆕 **Orchestration Platform:**
- Temporal workflows (IssueLifecycleWorkflow, BatchCoordinatorWorkflow)
- TimescaleDB telemetry (hypertables, continuous aggregates)
- ML learning system (3 models: complexity, agent selection, failure prediction)
- Exception detection (12 exception types)
- Agent performance tracking
- Documentation hub with auto-generation

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│            Existing Martha.dev-v4 Infrastructure             │
├─────────────────────────────────────────────────────────────┤
│  Fastify Server (port 20000)                                │
│  PostgreSQL Database                                         │
│  Redis Pub/Sub                                              │
│  Issue Tracker                                              │
│  Dashboard UI                                               │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  │ ADD NEW LAYER
                  ▼
┌─────────────────────────────────────────────────────────────┐
│         New Orchestration Platform Components                │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────┐      ┌──────────────────┐            │
│  │  Temporal        │      │  TimescaleDB     │            │
│  │  Workflows       │◄────►│  Telemetry       │            │
│  │                  │      │  (PostgreSQL ext)│            │
│  └──────────────────┘      └──────────────────┘            │
│                                                              │
│  ┌──────────────────┐      ┌──────────────────┐            │
│  │  ML Learning     │      │  Exception       │            │
│  │  System (Python) │      │  Detection       │            │
│  └──────────────────┘      └──────────────────┘            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Implementation Phases

### Phase 1: Temporal Foundation (Week 1-2) - 89 SP

**Epic 1.1: Temporal Server Setup (13 SP)**
- Reuse Temporal server from archie-platform (localhost:7233)
- Configure task queue 'martha-tasks'
- Set up worker pool (10 workers)
- Configure retry policies (5 attempts, exponential backoff)
- Integrate Temporal Web UI (localhost:8233)

**Epic 1.2: IssueLifecycleWorkflow (34 SP)**
- 7-stage workflow: Preparation → Spawn → Development → Testing → Review → Merge → Completion
- 6 signals: agentStarted, commitMade, agentCompleted, testResults, reviewApproved, block
- 3 queries: getStatus, getMetrics, getHistory
- SAGA compensation pattern
- Full workflow tests

**Epic 1.3: BatchCoordinatorWorkflow (21 SP)**
- Dependency graph management
- Child workflow spawning
- Event-driven completion monitoring (NO polling)
- Batch completion tracking
- Tests: parallel, sequential, diamond dependencies

**Epic 1.4: Temporal Activities (21 SP)**
- 8 activities: prepareIssue, spawnAgent, monitorAgentHeartbeat, runTests, moveToReview, mergeCode, recordCompletion, captureFailure
- All activities IDEMPOTENT
- Retry policies per activity type
- Comprehensive activity tests

**Files to Create:**
```
src/
├── workflows/
│   ├── IssueLifecycleWorkflow.ts
│   ├── BatchCoordinatorWorkflow.ts
│   └── __tests__/
│       ├── IssueLifecycleWorkflow.test.ts
│       └── BatchCoordinatorWorkflow.test.ts
├── activities/
│   ├── issue-activities.ts
│   └── __tests__/
│       └── issue-activities.test.ts
└── temporal/
    ├── worker.ts
    ├── client.ts
    └── config.ts
```

### Phase 2: Telemetry System (Week 3) - 55 SP

**Epic 2.1: Database Schema (21 SP)**
- Create migration `003_telemetry.sql`
- telemetry_events table (hypertable with JSONB)
- 8 indexes for multi-dimensional queries
- Continuous aggregates (1min, 1hr, 1day rollups)
- Retention (90 days) and compression (7 days)

**Epic 2.2: Telemetry Writer Service (13 SP)**
- TelemetryWriter service in TypeScript
- Single and batch write methods
- Integrate with all activities and signals
- Query endpoints for telemetry retrieval
- End-to-end test (50+ events per workflow)

**Epic 2.3: Claude-Flow Hook Integration (8 SP)**
- Modify existing hook endpoints in `src/server/routes/hooks.ts`
- Forward hooks to Temporal signals
- Write all hooks to telemetry
- Publish to Redis for real-time UI updates

**Files to Create:**
```
migrations/
└── 003_telemetry.sql

src/
├── services/
│   └── TelemetryWriter.ts
└── server/routes/
    └── hooks.ts (modify existing)
```

### Phase 3: Agent Performance Tracking (Week 4) - 34 SP

**Epic 3.1: Agent Performance Schema (5 SP)**
- Migration `004_agent_performance.sql`
- agent_performance table (15+ columns)
- 3 indexes

**Epic 3.2: Performance Calculator (13 SP)**
- PerformanceCalculator service
- calculateAgentPerformance method
- getTrendAnalysis (30-day moving average)
- getSpecialization (performance by epic type)
- Hook into recordCompletion activity

**Epic 3.3: Performance Dashboard (13 SP)**
- React component in dashboard/
- Agent profile card
- Specialization radar chart
- Comparative analysis table
- Trend chart
- API endpoint GET /api/performance/agents/:agentId

**Files to Create:**
```
migrations/
└── 004_agent_performance.sql

src/
└── services/
    └── PerformanceCalculator.ts

dashboard/src/
└── components/
    └── AgentPerformance.tsx
```

### Phase 4: Exception Detection (Week 5) - 34 SP

**Epic 4.1: Exception Detectors (13 SP)**
- ExceptionDetector service
- 5 detectors: detectStageTimeout, detectHighRetryCount, detectDegradedPerformance, detectAgentStale, detectTestFailures
- exceptions table
- Scheduled via Temporal workflow (1-minute interval)

**Epic 4.2: Exception Dashboard (8 SP)**
- React component
- Exception list grouped by severity
- Detail drill-down
- Real-time updates via WebSocket

**Epic 4.3: Alerting System (5 SP)**
- AlertService
- Slack webhook support
- Email (SMTP) support
- Throttling (max 1 per 5 min)

**Files to Create:**
```
src/
├── services/
│   ├── ExceptionDetector.ts
│   └── AlertService.ts
└── workflows/
    └── ExceptionDetectionWorkflow.ts

dashboard/src/
└── components/
    └── ExceptionDashboard.tsx
```

### Phase 5: ML Learning System (Week 6-8) - 89 SP

**Epic 5.1: Learning Feedback Schema (3 SP)**
- Migration `005_learning_system.sql`
- learning_feedback table
- model_versions table

**Epic 5.2: Feature Extractors (8 SP)**
- Python script `ml/feature_extractors.py`
- extractIssueFeatures (title, description, dependencies, embeddings)
- extractAgentFeatures (performance, specialization, trend)

**Epic 5.3: Complexity Estimator Model (13 SP)**
- XGBoost regression model
- Predict complexity (1-10) from features
- Target R² > 0.7
- Integrate into prepareIssue activity

**Epic 5.4: Agent Selector Model (13 SP)**
- Gradient boosting classifier
- Predict success probability for (agent, issue) pair
- Target AUC > 0.8
- Integrate into spawnAgent activity

**Epic 5.5: Failure Predictor Model (8 SP)**
- Random forest classifier
- Predict workflow failure probability
- Target precision > 0.75
- Alert if >30% risk

**Epic 5.6: Continuous Retraining (8 SP)**
- LearningSystemWorkflow
- Daily retraining schedule
- Retrain if >100 new samples
- Deploy if accuracy improved

**Epic 5.7: Optimization Recommender (8 SP)**
- Python script `ml/optimization_recommender.py`
- Timeout pattern detector
- Load balancer (agent overload detection)
- Flaky test detector
- Weekly optimization report

**Files to Create:**
```
migrations/
└── 005_learning_system.sql

ml/
├── feature_extractors.py
├── complexity_estimator.py
├── agent_selector.py
├── failure_predictor.py
├── optimization_recommender.py
└── models/
    ├── complexity_estimator_v1.json
    ├── agent_selector_v1.json
    └── failure_predictor_v1.json

src/workflows/
└── LearningSystemWorkflow.ts
```

### Phase 6: Documentation Hub & UI (Week 6-8) - 68 SP

**Epic 6.1: Documentation Database (8 SP)**
- Migration `006_documentation.sql`
- documentation_pages table
- documentation_links table
- documentation_activity table
- Full-text search trigger

**Epic 6.2: Documentation Hub Landing Page (13 SP)**
- DocuFlow-style UI (#E3D4C5 background, #D97F6F accents)
- Jump Back In section
- Documentation Overview
- Active Issues/Epics
- Activity Feed (real-time via WebSocket)
- Sidebar navigation with ⌘K search

**Epic 6.3: Kanban Board (10 columns) (13 SP)**
- Board view with drag-and-drop
- 10 columns: Backlog → Setup → In Development → Code Complete → Testing → MESA Review → CTO Review → Approved → Done → Blocked
- View toggles (Board/List/Timeline)
- Grouping options (status/assignee/priority/epic)

**Epic 6.4: Issue Detail Page (13 SP)**
- Story Quality Metrics
- Human Engagement Tracking
- Activity & Comments
- Workflow Progress
- Linked Implementations
- Release Tracking
- Sidebar

**Epic 6.5: AI-Powered Search (8 SP)**
- PostgreSQL full-text search
- Fuzzy matching (pg_trgm)
- Command palette (⌘K)
- Keyboard navigation

**Epic 6.6: Auto-Generation from Code (8 SP)**
- SchemaDocGenerator (parse SQL migrations)
- ApiDocGenerator (parse TypeScript)
- Daily regeneration via Temporal

**Epic 6.7: Auto-Linking Service (8 SP)**
- LinkingService
- Detect references (TASK-15, EPIC-547)
- Create bidirectional links
- Validate links (detect broken)

**Epic 6.8: Template Library (5 SP)**
- 5 templates: Specification, ADR, Guide, API, Troubleshooting
- Template UI component
- One-click doc creation

**Files to Create:**
```
migrations/
└── 006_documentation.sql

src/
└── documentation/
    ├── generators/
    │   ├── SchemaDocGenerator.ts
    │   └── ApiDocGenerator.ts
    └── services/
        └── LinkingService.ts

dashboard/src/
├── pages/
│   ├── DocsHub.tsx
│   └── IssuePage.tsx
└── components/
    ├── KanbanBoard.tsx
    └── SearchPalette.tsx
```

### Phase 7: Integration & Polish (Week 9-10) - 55 SP

**Epic 7.1: Martha Command Integration (21 SP)**
- Update `/martha:2x2` → call BatchCoordinatorWorkflow
- Update `/martha:spawn` → use ML agent selector
- Update `/martha:test` → upload to Braintrust, signal workflow
- Update `/martha:test-batch` → coordinate parallel tests
- Update `/martha:muster` → query martha.dev tracker API
- Update `/martha:gate` → check workflow status via Temporal query
- Test full workflow: muster → 2x2 → spawn → develop → test → gate → review → merge

**Epic 7.2: Unified Dashboard (8 SP)**
- Main Dashboard component
- Combine: Telemetry explorer, Agent performance, Exception dashboard, Workflow visualization, Learning insights
- Temporal UI iframe

**Epic 7.3: Documentation (13 SP)**
- System overview doc
- Operator runbook
- Developer guide
- API reference
- Architecture diagrams

**Epic 7.4: Production Hardening (21 SP)**
- Comprehensive error handling
- Database index optimization
- Observability (Prometheus, Grafana, OpenTelemetry)
- Security hardening (input validation, SQL injection prevention, XSS, rate limiting, auth)
- Load testing (50 concurrent workflows)

**Files to Modify:**
```
/mnt/data/martha-workflow/.claude/commands/martha/
├── 2x2.md (modify)
├── spawn.md (modify)
├── test.md (modify)
├── test-batch.md (modify)
├── muster.md (modify)
└── gate.md (modify)
```

### Phase 8: Communications Service (Week 11+) - 55 SP

**Epic 8.1: Service Architecture (5 SP)**
- Create design issue in tracker
- Spawn agent for architecture design
- Review and approve

**Epic 8.2: Implementation (14-24 issues) (34 SP)**
- Break down into 14-24 issues
- Run /martha:muster
- Run /martha:2x2
- Platform orchestrates all issues
- Track via telemetry
- View on dashboard

**Epic 8.3: Testing & Deployment (13 SP)**
- Run /martha:test-batch
- Aggregate results
- Upload evidence to Braintrust
- Deploy service

## Dependencies to Install

```bash
# Temporal dependencies
npm install @temporalio/client @temporalio/worker @temporalio/workflow @temporalio/activity

# TimescaleDB (PostgreSQL extension - already have pg!)
# Install via: CREATE EXTENSION timescaledb;

# ML dependencies (Python - create separate venv)
pip install xgboost scikit-learn pandas numpy
```

## Environment Variables to Add

```bash
# .env.local additions
TEMPORAL_ADDRESS=localhost:7233
TEMPORAL_NAMESPACE=default
TEMPORAL_TASK_QUEUE=martha-tasks

TIMESCALEDB_ENABLED=true

BRAINTRUST_API_KEY=your_key_here

SLACK_WEBHOOK_URL=your_webhook_url
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_user
SMTP_PASS=your_pass
```

## Success Criteria

**Platform Metrics:**
- ✅ 200+ concurrent workflows supported
- ✅ <1% workflow failure rate
- ✅ 100+ telemetry events per issue
- ✅ <5 min exception detection time
- ✅ 80%+ ML model accuracy

**Developer Metrics:**
- ✅ 14-24 issues per batch
- ✅ <2 hours per issue (avg)
- ✅ >90% test pass rate on first run
- ✅ <10% rework rate

## Issue Tracker

All 251 issues (35 epics, 216 tasks) are loaded in:
```
/mnt/data/martha-workflow/.martha/worktrees/martha-dev-v4/
├── index.json (tracker API)
├── config.json (worktree config)
└── boards/ (8 phase boards with markdown files)
```

Access via martha tracker API or read markdown files directly.

## Key Integration Points

### 1. Existing Fastify Server
- Add new routes under `/api/v1/workflows/`
- Add Temporal workflow trigger endpoints
- Integrate with existing `/api/v1/hooks/` endpoints

### 2. Existing PostgreSQL Database
- Add TimescaleDB extension
- Run new migrations (003-006)
- Reuse existing connection pool

### 3. Existing Redis Pub/Sub
- Publish workflow events to existing channels
- Subscribe to workflow updates in dashboard

### 4. Existing Tracker System
- Integrate IssueLifecycleWorkflow with tracker API
- Update issue status via tracker endpoints
- Query issue dependencies from tracker

### 5. Existing Dashboard
- Add new pages for telemetry, performance, exceptions
- Integrate Temporal workflow visualizations
- Add DocuFlow-style documentation hub

## Development Workflow

1. **Start with Phase 1**: Temporal Foundation
   - Install Temporal dependencies
   - Set up Temporal server (reuse archie-platform)
   - Implement IssueLifecycleWorkflow
   - Write comprehensive tests

2. **Iterate Phase by Phase**: Following the 8-phase plan
   - Complete all epics in a phase before moving to next
   - Write tests for every component
   - Document as you go

3. **Integration Testing**: After each phase
   - Test integration with existing martha.dev-v4 infrastructure
   - Verify end-to-end workflows
   - Check performance and resource usage

4. **Martha Command Integration**: Phase 7
   - Update commands in `/mnt/data/martha-workflow/`
   - Test full workflow: muster → 2x2 → spawn → develop → test → gate

5. **Production Deployment**: Phase 7
   - Load testing
   - Security hardening
   - Observability setup

## Resources

**Documentation:**
- `/mnt/data/martha-workflow/.martha/worktrees/martha-dev-v4/documentation/`
  - 01-system-overview.md
  - 03-database-schema.md
  - 05-operator-runbook.md

**Reference Implementation:**
- Archie Platform Temporal: `/mnt/data/archie-platform-v2/` (has Temporal infrastructure)
- Martha Workflow Commands: `/mnt/data/martha-workflow/.claude/commands/martha/`

**Comprehensive Plan:**
- Original: `/home/archiedev/.claude/plans/precious-exploring-lemur.md` (19,402 words)
- Summary: `/home/archiedev/.claude/plans/piped-sparking-eich.md` (855 lines)
- Review: `/tmp/martha-dev-v4-comprehensive-review.md` (75 pages, 6 agent reviews)

## Next Steps

1. **Start Temporal Server**: Reuse from archie-platform
2. **Install Dependencies**: npm install @temporalio/client etc.
3. **Create Directories**: src/workflows/, src/activities/, ml/, migrations/
4. **Begin EPIC-1.1**: Temporal Server Setup
5. **Write First Workflow**: IssueLifecycleWorkflow.ts

**Let's build the orchestration platform!** 🚀

---

**Total Scope:**
- 8 Phases
- 35 Epics
- 216 Tasks
- 479 Story Points
- ~10-11 weeks estimated timeline

**Repository:** `/mnt/data/martha.dev-v4-orchestration` (worktree)
**Branch:** `feature/orchestration-platform`
**Base Branch:** `develop`
