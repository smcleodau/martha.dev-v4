# Unified Dashboard - Visual Layout Reference

## Dashboard URL
`http://localhost:21009/dashboard`

---

## Layout Structure

```
┌─────────────────────────────────────────────────────────────────────┐
│  🎛️ Unified Dashboard                                    [●] Live  │
│  Martha.dev v4 - Monitoring, Telemetry & Analytics                 │
├─────────────────────────────────────────────────────────────────────┤
│  📊 Overview │ 📡 Telemetry │ ⚡ Performance │ ⚠️ Exceptions │     │
│  🔄 Workflows │ 🧠 Learning │ ⏱️ Temporal UI                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  [MAIN CONTENT AREA - Dynamic based on selected tab]               │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Tab Views

### 1. Overview Tab (Default)

```
┌─────────────────────────────────────────────────────────────────────┐
│  Quick Stats                                                        │
│  ┌──────────────┬──────────────┬──────────────┬──────────────┐     │
│  │ 🔄           │ 📡           │ ⚠️           │ 🧠           │     │
│  │ Active       │ Events/min   │ Active       │ Learning     │     │
│  │ Workflows    │ 847          │ Exceptions   │ Models       │     │
│  │ 12    (+3)   │    (+12%)    │ 3     (-2)   │ 5     (0)    │     │
│  └──────────────┴──────────────┴──────────────┴──────────────┘     │
│                                                                     │
│  Views Preview (2x2 Grid)                                          │
│  ┌─────────────────────────┬─────────────────────────┐            │
│  │ Recent Telemetry        │ Agent Performance       │            │
│  │ [TelemetryExplorer]     │ [AgentMetrics]          │            │
│  │ (compact mode)          │ (compact mode)          │            │
│  └─────────────────────────┴─────────────────────────┘            │
│  ┌─────────────────────────┬─────────────────────────┐            │
│  │ Active Exceptions       │ Active Workflows        │            │
│  │ [ExceptionDashboard]    │ [WorkflowViz]           │            │
│  │ (compact mode)          │ (compact mode)          │            │
│  └─────────────────────────┴─────────────────────────┘            │
│  ┌───────────────────────────────────────────────────┐            │
│  │ Learning Insights                                 │            │
│  │ [LearningInsights] (compact mode)                 │            │
│  └───────────────────────────────────────────────────┘            │
└─────────────────────────────────────────────────────────────────────┘
```

### 2. Telemetry Explorer Tab

```
┌─────────────────────────────────────────────────────────────────────┐
│  📡 Telemetry Explorer                                   [Refresh] │
│                                                                     │
│  Filters:                                                          │
│  [All Categories ▼] [All Severities ▼] [Search...]                │
│                                                                     │
│  Events Table:                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ Time     │ Category │ Event Type      │ Workflow │ Severity │  │
│  ├──────────────────────────────────────────────────────────────┤  │
│  │ 10:30:15 │ 🔄 workflow│ task_started  │ wf-abc.. │ info    │  │
│  │ 10:30:12 │ ⚙️ activity│ processing    │ wf-def.. │ info    │  │
│  │ 10:30:10 │ ⚠️ exception│ db_timeout   │ wf-ghi.. │ error   │  │
│  │ 10:30:08 │ 📡 signal  │ state_update  │ wf-jkl.. │ info    │  │
│  │ ...                                                          │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  Showing 50 events | Last updated: 10:30:20                        │
└─────────────────────────────────────────────────────────────────────┘
```

### 3. Agent Performance Tab

```
┌─────────────────────────────────────────────────────────────────────┐
│  ⚡ Agent Performance Metrics               [15m][1h][6h][24h]     │
│                                                                     │
│  Summary Stats:                                                    │
│  ┌────────────┬────────────┬────────────┬────────────┐            │
│  │ Total      │ Active     │ Total      │ Avg Success│            │
│  │ Agents     │ Agents     │ Events     │ Rate       │            │
│  │ 5          │ 3          │ 5,427      │ 99.18%     │            │
│  └────────────┴────────────┴────────────┴────────────┘            │
│                                                                     │
│  Metrics Table:                                                    │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ Status │ Type          │ ID        │ Events │ Success Rate │  │
│  ├──────────────────────────────────────────────────────────────┤  │
│  │ ● Active│ IssueProc...  │ agent-001 │ 1,247  │ 99.76%      │  │
│  │ ● Active│ CodeAnalyzer  │ agent-002 │ 856    │ 98.60%      │  │
│  │ ○ Idle  │ DocGenerator  │ agent-003 │ 423    │ 100.00%     │  │
│  │ ● Active│ TestRunner    │ agent-004 │ 2,134  │ 97.89%      │  │
│  │ ...                                                          │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  Showing 5 agents | Last updated: 10:30:25                         │
└─────────────────────────────────────────────────────────────────────┘
```

### 4. Exceptions Dashboard Tab

```
┌─────────────────────────────────────────────────────────────────────┐
│  ⚠️ Exception Dashboard                                [Refresh]   │
│                                                                     │
│  Summary Stats:                                                    │
│  ┌────────────┬────────────┬────────────┬────────────┐            │
│  │ 🔥 Critical│ ❌ Errors  │ ⚠️ Warnings│ ✅ Resolved│            │
│  │ 1          │ 2          │ 0          │ 2          │            │
│  └────────────┴────────────┴────────────┴────────────┘            │
│                                                                     │
│  Filters: [All Severities ▼] [Active Only ▼]                      │
│                                                                     │
│  Exceptions List:                                                  │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ 🔥 10:30:00 | 3x                                    [Resolve]│  │
│  │ Null pointer exception in activity processor                │  │
│  │ wf-mno345pqr678 | BUG-567 | NULL_REF                        │  │
│  ├──────────────────────────────────────────────────────────────┤  │
│  │ ❌ 10:25:00 | 12x                                   [Resolve]│  │
│  │ Database connection timeout                                  │  │
│  │ wf-abc123def456 | TASK-1234 | ETIMEDOUT                     │  │
│  ├──────────────────────────────────────────────────────────────┤  │
│  │ ❌ 10:20:00 | 5x                                   [Resolved]│  │
│  │ Rate limit exceeded for GitHub API                          │  │
│  │ wf-xyz789ghi012 | TASK-1235 | RATE_LIMIT                    │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  Showing 3 exceptions | Last updated: 10:30:30                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 5. Workflow Visualization Tab

```
┌─────────────────────────────────────────────────────────────────────┐
│  🔄 Workflow Visualization                             [Refresh]   │
│                                                                     │
│  Summary Stats:                                                    │
│  ┌────────────────────┬────────────────────┬────────────────────┐  │
│  │ 🔄 Running         │ ✅ Completed       │ ❌ Failed          │  │
│  │ 2                  │ 1                  │ 1                  │  │
│  └────────────────────┴────────────────────┴────────────────────┘  │
│                                                                     │
│  Filters: [All Statuses ▼]                                        │
│                                                                     │
│  Workflows List:                                                   │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ 🔄 IssueLifecycle          running                  ● Live  │  │
│  │ wf-issue-lifecycle-001                                       │  │
│  │ TASK-1234 | EPIC-45 | Events: 47                            │  │
│  │ Running for 15m 30s                                          │  │
│  ├──────────────────────────────────────────────────────────────┤  │
│  │ 🔄 BatchProcessor          running                  ● Live  │  │
│  │ wf-batch-processing-002                                      │  │
│  │ EPIC-46 | Events: 23                                        │  │
│  │ Running for 8m 15s                                           │  │
│  ├──────────────────────────────────────────────────────────────┤  │
│  │ ✅ CodeAnalysis           completed                         │  │
│  │ wf-code-analysis-003                                         │  │
│  │ TASK-1235 | Events: 156                                     │  │
│  │ Completed in 15m 0s                                          │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  Showing 3 workflows | Last updated: 10:30:35                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 6. Learning Insights Tab

```
┌─────────────────────────────────────────────────────────────────────┐
│  🧠 Learning Insights                                              │
│                                                                     │
│  Summary Stats:                                                    │
│  ┌────────────┬────────────┬────────────┬────────────┐            │
│  │ 🧠 Patterns│ 🔥 High    │ 📊 Avg     │ 📈 Obs.    │            │
│  │ 7          │ Impact: 3  │ Conf: 89.5%│ 1,699      │            │
│  └────────────┴────────────┴────────────┴────────────┘            │
│                                                                     │
│  Patterns List:                                                    │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ 🔥 Performance Optimization      high impact          [94] │  │
│  │ Workflows with parallel activity execution complete 3.2x    │  │
│  │ faster on average                                           │  │
│  │ Confidence: 94.0% | 247 occurrences                         │  │
│  ├──────────────────────────────────────────────────────────────┤  │
│  │ 🔥 Error Recovery                high impact          [87] │  │
│  │ Database timeout errors most common 2-3 AM UTC, retry       │  │
│  │ after 5s succeeds 89% of the time                           │  │
│  │ Confidence: 87.0% | 156 occurrences                         │  │
│  ├──────────────────────────────────────────────────────────────┤  │
│  │ ⚡ Resource Usage                medium impact        [92] │  │
│  │ Memory usage spikes correlate with batch sizes > 50 items   │  │
│  │ Confidence: 92.0% | 89 occurrences                          │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  Showing 7 learned patterns | Last updated: 10:30:40               │
└─────────────────────────────────────────────────────────────────────┘
```

### 7. Temporal UI Tab

```
┌─────────────────────────────────────────────────────────────────────┐
│  ⏱️ Temporal Cloud UI                    [Hide Help][Open in Tab]  │
│  Real-time workflow monitoring and management                      │
│                                                                     │
│  Quick Guide:                                                      │
│  Namespace: martha-dev-v4.mnjo7                                    │
│  Region: ap-northeast-1 (AWS Asia Pacific)                         │
│  • Monitor running and completed workflows                         │
│  • View workflow execution history                                 │
│  • Inspect workflow inputs and outputs                             │
│  • Debug workflow failures and retries                             │
│                                                                     │
│  Connection Info:                                                  │
│  ┌────────────────────────────────────────────────────────────────┐│
│  │ Namespace: martha-dev-v4.mnjo7                                ││
│  │ Endpoint: ap-northeast-1.aws.api.temporal.io:7233             ││
│  │ Web UI: cloud.temporal.io                                     ││
│  └────────────────────────────────────────────────────────────────┘│
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                                                             │   │
│  │        [TEMPORAL CLOUD UI IFRAME]                           │   │
│  │                                                             │   │
│  │        Note: If iframe fails to load due to                 │   │
│  │        X-Frame-Options, use "Open in Tab" button           │   │
│  │                                                             │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  Connected to Temporal Cloud                              ● Live   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Color Scheme

### Status Colors:
- **Green** (🟢): Active, Success, Completed, Healthy
- **Blue** (🔵): Running, Info, Primary actions
- **Yellow** (🟡): Idle, Warning
- **Red** (🔴): Failed, Error, Critical
- **Gray** (⚫): Inactive, Neutral
- **Purple** (🟣): High impact, Learning insights

### Severity Levels:
- **Debug**: Gray
- **Info**: Blue
- **Warning**: Yellow
- **Error**: Red
- **Critical**: Bright Red with glow

---

## Navigation Flow

```
Sidebar → Dashboard → Tab Selection → View Content
   │          │              │              │
   │          │              │              └── Component renders with data
   │          │              └── Update active tab
   │          └── Load dashboard page
   └── Click "Dashboard" link (🎛️)
```

---

## Auto-Refresh Intervals

| Component                 | Interval | Reason                    |
|---------------------------|----------|---------------------------|
| TelemetryExplorer         | 5s       | Real-time event stream    |
| WorkflowVisualization     | 5s       | Track running workflows   |
| AgentPerformanceMetrics   | 10s      | Monitor agent health      |
| ExceptionDashboard        | 10s      | Catch new exceptions      |
| LearningInsights          | 30s      | Pattern updates slower    |
| TemporalUIEmbed           | N/A      | Temporal handles refresh  |

---

## Responsive Breakpoints

- **Mobile**: < 768px (1 column)
- **Tablet**: 768px - 1024px (2 columns)
- **Desktop**: > 1024px (4 columns for stats, 2 for views)

---

## API Endpoints Reference

```
GET /api/v1/telemetry/events
GET /api/v1/telemetry/agent-metrics
GET /api/v1/telemetry/exceptions
GET /api/v1/telemetry/workflows
GET /api/v1/telemetry/learning-patterns
GET /api/v1/telemetry/metrics/:aggregateType
```

All endpoints support CORS and return JSON with consistent structure:
```json
{
  "success": true,
  "data": [...],
  "count": 50
}
```

---

## Quick Start Commands

```bash
# Terminal 1: Start Backend
cd /mnt/data/martha.dev-v4-orchestration
npm run dev

# Terminal 2: Start Frontend (optional - for development)
cd /mnt/data/martha.dev-v4/dashboard
npm run dev

# Access Dashboard
open http://localhost:21009/dashboard
```

---

**Last Updated**: January 18, 2026
**Version**: 1.0.0
**Status**: Production Ready
