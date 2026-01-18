# Martha.dev v4 Platform - Architecture Diagrams

**Version:** 4.0.0
**Last Updated:** January 2026

This document contains visual diagrams of the Martha.dev v4 platform architecture using Mermaid diagrams (markdown-compatible) and ASCII art.

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Workflow Execution Flow](#workflow-execution-flow)
3. [Data Flow](#data-flow)
4. [Deployment Architecture](#deployment-architecture)
5. [Issue Lifecycle State Machine](#issue-lifecycle-state-machine)

---

## System Architecture

### High-Level Component Diagram

```mermaid
graph TB
    subgraph "Client Layer"
        Dashboard[React Dashboard<br/>Port 21009]
        CLI[CLI Tools<br/>tcld, curl]
    end

    subgraph "API Layer"
        Fastify[Fastify API Server<br/>Port 21009]
        WS[WebSocket Gateway]
    end

    subgraph "Orchestration Layer"
        TemporalCloud[Temporal Cloud<br/>ap-northeast-1.aws]
        Worker[Temporal Worker<br/>Node.js]
    end

    subgraph "Workflows & Activities"
        ILW[IssueLifecycleWorkflow]
        BCW[BatchCoordinatorWorkflow]
        Activities[Activities<br/>prepareIssue, spawnAgent, etc.]
    end

    subgraph "Data Layer"
        TimescaleDB[(TimescaleDB<br/>Port 21006)]
        Redis[(Redis<br/>Port 21007)]
    end

    subgraph "External Systems"
        GitHub[GitHub API]
        CloudflareAPI[Cloudflare API]
        Braintrust[Braintrust<br/>LLM Observability]
    end

    Dashboard --> Fastify
    CLI --> TemporalCloud
    Fastify --> WS
    Fastify --> TimescaleDB
    Fastify --> TemporalCloud

    TemporalCloud <--> Worker
    Worker --> ILW
    Worker --> BCW
    Worker --> Activities

    ILW --> Activities
    BCW --> ILW
    Activities --> TimescaleDB
    Activities --> GitHub
    Activities --> Braintrust

    Fastify --> Redis
    WS --> Redis

    Activities --> CloudflareAPI

    style TemporalCloud fill:#6ee7b7,stroke:#333,stroke-width:2px
    style TimescaleDB fill:#82c9ed,stroke:#333,stroke-width:2px
    style Worker fill:#fa7d6a,stroke:#333,stroke-width:2px
    style Fastify fill:#ff9a76,stroke:#333,stroke-width:2px
```

### ASCII Component Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                             │
│  ┌─────────────────┐              ┌─────────────────┐           │
│  │ React Dashboard │              │   CLI Tools     │           │
│  │   Port 21009    │              │  (tcld, curl)   │           │
│  └────────┬────────┘              └────────┬────────┘           │
└───────────┼──────────────────────────────────┼──────────────────┘
            │                                  │
┌───────────┼──────────────────────────────────┼──────────────────┐
│           ▼                API LAYER          ▼                  │
│  ┌─────────────────┐              ┌─────────────────┐           │
│  │ Fastify Server  │◄────────────►│  WebSocket GW   │           │
│  │   Port 21009    │              │                 │           │
│  └────────┬────────┘              └─────────────────┘           │
└───────────┼──────────────────────────────────────────────────────┘
            │
            │ HTTP/WS
            ▼
┌───────────────────────────────────────────────────────────────┐
│                  ORCHESTRATION LAYER                          │
│  ┌─────────────────────────┐      ┌──────────────────────┐   │
│  │    Temporal Cloud       │◄────►│  Temporal Worker     │   │
│  │  (ap-northeast-1.aws)   │      │    (Node.js)         │   │
│  │   Namespace: martha-    │      │  Task Queue: martha- │   │
│  │      dev-v4.mnjo7       │      │      tasks           │   │
│  └─────────────────────────┘      └──────────┬───────────┘   │
└─────────────────────────────────────────────────┼─────────────┘
                                                  │
                                                  │
┌─────────────────────────────────────────────────┼─────────────┐
│              WORKFLOWS & ACTIVITIES             ▼             │
│  ┌──────────────────────┐     ┌──────────────────────────┐   │
│  │ IssueLifecycle       │     │ BatchCoordinator         │   │
│  │ Workflow             │◄────┤ Workflow                 │   │
│  └──────────┬───────────┘     └──────────────────────────┘   │
│             │                                                 │
│             ▼                                                 │
│  ┌────────────────────────────────────────────────────────┐  │
│  │               Activities                                │  │
│  │  • prepareIssue    • spawnAgent    • runTests          │  │
│  │  • moveToReview    • mergeCode     • recordCompletion  │  │
│  └────────┬─────────────────────────────────┬─────────────┘  │
└───────────┼─────────────────────────────────┼────────────────┘
            │                                 │
            │ Telemetry                       │ Git/GitHub
            ▼                                 ▼
┌────────────────────────┐         ┌─────────────────────────┐
│    DATA LAYER          │         │   EXTERNAL SYSTEMS      │
│  ┌──────────────────┐  │         │  ┌──────────────────┐   │
│  │  TimescaleDB     │  │         │  │   GitHub API     │   │
│  │   Port 21006     │  │         │  └──────────────────┘   │
│  │  (Hypertables)   │  │         │  ┌──────────────────┐   │
│  └──────────────────┘  │         │  │ Cloudflare API   │   │
│  ┌──────────────────┐  │         │  └──────────────────┘   │
│  │     Redis        │  │         │  ┌──────────────────┐   │
│  │   Port 21007     │  │         │  │   Braintrust     │   │
│  │   (Pub/Sub)      │  │         │  │ (Observability)  │   │
│  └──────────────────┘  │         │  └──────────────────┘   │
└────────────────────────┘         └─────────────────────────┘
```

---

## Workflow Execution Flow

### IssueLifecycleWorkflow Execution Flow

```mermaid
sequenceDiagram
    participant Client
    participant API
    participant Temporal
    participant Worker
    participant Activities
    participant TimescaleDB
    participant GitHub

    Client->>API: POST /api/v1/workflows
    API->>Temporal: Start IssueLifecycleWorkflow
    Temporal->>Worker: Schedule workflow
    Worker->>Worker: Initialize state

    Note over Worker: Stage 1: Preparation
    Worker->>Activities: prepareIssue()
    Activities->>TimescaleDB: Write telemetry (activity_started)
    Activities->>GitHub: Validate issue exists
    Activities->>GitHub: Create feature branch
    Activities->>TimescaleDB: Write telemetry (activity_completed)
    Activities-->>Worker: {branch, documentationGenerated}

    Note over Worker: Stage 2: Agent Spawn
    Worker->>Activities: spawnAgent()
    Activities->>TimescaleDB: Write telemetry
    Activities->>Activities: Spawn claude-code process
    Activities-->>Worker: {agentId, processId}
    Worker->>Worker: Wait for agentStarted signal

    Client->>API: POST /signal (agentStarted)
    API->>Temporal: Send signal
    Temporal->>Worker: agentStarted signal received
    Worker->>Worker: Update state, proceed

    Note over Worker: Stage 3: Development
    loop Agent commits code
        Client->>API: POST /signal (commitMade)
        API->>Temporal: Send signal
        Temporal->>Worker: commitMade signal received
        Worker->>Worker: Track commit, update metrics
    end

    Client->>API: POST /signal (agentCompleted)
    API->>Temporal: Send signal
    Temporal->>Worker: agentCompleted signal received

    Note over Worker: Stage 4: Testing
    Worker->>Activities: runTests()
    Activities->>TimescaleDB: Write telemetry
    Activities->>Activities: Run npm test
    Activities->>Activities: Parse test output
    Activities-->>Worker: {passed, failed, evidence}

    alt Tests Failed
        Worker->>Worker: Throw error (workflow fails)
        Worker->>Activities: captureFailure()
        Activities->>TimescaleDB: Write exception
    else Tests Passed
        Note over Worker: Stage 5: Review
        Worker->>Activities: moveToReview()
        Activities->>GitHub: Create PR or update status
        Activities-->>Worker: {reviewId, reviewers}
        Worker->>Worker: Wait for reviewApproved signal

        Client->>API: POST /signal (reviewApproved)
        API->>Temporal: Send signal
        Temporal->>Worker: reviewApproved signal received

        Note over Worker: Stage 6: Merge
        Worker->>Activities: mergeCode()
        Activities->>GitHub: Merge branch to main
        Activities-->>Worker: {mergeSha, mergedAt}

        Note over Worker: Stage 7: Completion
        Worker->>Activities: recordCompletion()
        Activities->>TimescaleDB: Insert agent_performance
        Activities->>TimescaleDB: Write completion telemetry
        Worker->>Temporal: Workflow completed
    end

    Temporal-->>Client: Workflow result
```

### Batch Coordinator Flow (Simplified)

```mermaid
sequenceDiagram
    participant Client
    participant BatchCoordinator
    participant IssueWorkflow1
    participant IssueWorkflow2
    participant IssueWorkflow3

    Client->>BatchCoordinator: Start batch (3 issues)
    BatchCoordinator->>BatchCoordinator: Build dependency graph
    BatchCoordinator->>BatchCoordinator: Identify issues with no deps

    par Parallel execution
        BatchCoordinator->>IssueWorkflow1: Start (no deps)
        BatchCoordinator->>IssueWorkflow2: Start (no deps)
    end

    IssueWorkflow1->>IssueWorkflow1: Execute 7 stages
    IssueWorkflow2->>IssueWorkflow2: Execute 7 stages

    IssueWorkflow1-->>BatchCoordinator: Completed
    BatchCoordinator->>BatchCoordinator: Check newly unblocked issues
    BatchCoordinator->>IssueWorkflow3: Start (dep on Issue1)

    IssueWorkflow2-->>BatchCoordinator: Completed
    IssueWorkflow3->>IssueWorkflow3: Execute 7 stages
    IssueWorkflow3-->>BatchCoordinator: Completed

    BatchCoordinator-->>Client: Batch complete (3/3 success)
```

---

## Data Flow

### Telemetry Data Flow

```mermaid
flowchart LR
    subgraph "Event Sources"
        W[Workflows]
        A[Activities]
        API[API Server]
    end

    subgraph "Telemetry Pipeline"
        TW[TelemetryWriter<br/>Batching]
        Queue[Event Queue<br/>In-Memory]
    end

    subgraph "TimescaleDB"
        Events[(telemetry_events<br/>Hypertable)]
        Metadata[(telemetry_metadata<br/>Aggregations)]
        Agg1[(1min aggregates)]
        Agg2[(1hour aggregates)]
        Agg3[(1day aggregates)]
    end

    subgraph "Query Layer"
        QueryAPI[Query API<br/>/api/v1/telemetry/*]
        Dashboard[Dashboard<br/>React UI]
    end

    W --> TW
    A --> TW
    API --> TW
    TW --> Queue
    Queue --> Events
    Events --> Metadata
    Events --> Agg1
    Agg1 --> Agg2
    Agg2 --> Agg3

    QueryAPI --> Events
    QueryAPI --> Metadata
    QueryAPI --> Agg1
    QueryAPI --> Agg2
    QueryAPI --> Agg3

    Dashboard --> QueryAPI

    style Events fill:#82c9ed,stroke:#333,stroke-width:2px
    style TW fill:#fa7d6a,stroke:#333,stroke-width:2px
```

### ASCII Data Flow Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                      EVENT SOURCES                                │
│  ┌──────────┐     ┌──────────┐     ┌──────────┐                  │
│  │Workflows │     │Activities│     │API Server│                  │
│  └────┬─────┘     └────┬─────┘     └────┬─────┘                  │
└───────┼────────────────┼────────────────┼────────────────────────┘
        │                │                │
        │   telemetry    │                │
        └────────┬───────┴────────────────┘
                 │
                 ▼
        ┌────────────────┐
        │ TelemetryWriter│
        │   (Batching)   │
        └────────┬───────┘
                 │
                 ▼
        ┌────────────────┐
        │  Event Queue   │
        │  (In-Memory)   │
        └────────┬───────┘
                 │
                 │ INSERT BATCH
                 ▼
┌────────────────────────────────────────────────────────────────┐
│                      TimescaleDB                               │
│                                                                │
│  ┌──────────────────────────────────────────────────────┐     │
│  │           telemetry_events (Hypertable)              │     │
│  │  • timestamp • workflowId • eventType • payload      │     │
│  │  • Compression: 7-day chunks                         │     │
│  │  • Retention: 90 days                                │     │
│  └──────────────────┬───────────────────────────────────┘     │
│                     │                                          │
│                     │ AUTO AGGREGATE                           │
│                     ▼                                          │
│  ┌──────────────────────────────────────────────────────┐     │
│  │        Continuous Aggregates                         │     │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐           │     │
│  │  │  1min    │  │  1hour   │  │  1day    │           │     │
│  │  │  bucket  │  │  bucket  │  │  bucket  │           │     │
│  │  └──────────┘  └──────────┘  └──────────┘           │     │
│  └──────────────────────────────────────────────────────┘     │
│                     │                                          │
└─────────────────────┼──────────────────────────────────────────┘
                      │
                      │ SELECT queries
                      ▼
        ┌──────────────────────────┐
        │    Query API             │
        │ /api/v1/telemetry/*      │
        └──────────┬───────────────┘
                   │
                   │ HTTP/JSON
                   ▼
        ┌──────────────────────────┐
        │   React Dashboard        │
        │  • Telemetry View        │
        │  • Performance View      │
        │  • Exceptions View       │
        └──────────────────────────┘
```

---

## Deployment Architecture

### Production Deployment

```mermaid
graph TB
    subgraph "Cloud Provider (AWS/GCP/Azure)"
        subgraph "Load Balancer"
            LB[Load Balancer<br/>TLS Termination]
        end

        subgraph "Application Servers (Multi-AZ)"
            API1[API Server 1<br/>Port 21009]
            API2[API Server 2<br/>Port 21009]
            API3[API Server 3<br/>Port 21009]
        end

        subgraph "Worker Pool (Auto-Scaling)"
            W1[Worker 1]
            W2[Worker 2]
            W3[Worker 3]
            W4[Worker N...]
        end

        subgraph "Data Layer"
            TSDB_Primary[(TimescaleDB Primary<br/>Port 21006)]
            TSDB_Standby[(TimescaleDB Standby<br/>Streaming Replication)]
            Redis_Primary[(Redis Primary<br/>Port 21007)]
            Redis_Replica[(Redis Replica)]
        end
    end

    subgraph "Temporal Cloud (Managed SaaS)"
        TC[Temporal Cloud<br/>ap-northeast-1.aws<br/>99.99% SLA]
    end

    subgraph "Monitoring & Observability"
        Prometheus[Prometheus<br/>Metrics]
        Grafana[Grafana<br/>Dashboards]
        PagerDuty[PagerDuty<br/>Alerts]
    end

    Internet[Internet] --> LB
    LB --> API1
    LB --> API2
    LB --> API3

    API1 --> TC
    API2 --> TC
    API3 --> TC

    API1 --> TSDB_Primary
    API2 --> TSDB_Primary
    API3 --> TSDB_Primary

    API1 --> Redis_Primary
    API2 --> Redis_Primary
    API3 --> Redis_Primary

    TC --> W1
    TC --> W2
    TC --> W3
    TC --> W4

    W1 --> TSDB_Primary
    W2 --> TSDB_Primary
    W3 --> TSDB_Primary

    TSDB_Primary -.-> TSDB_Standby
    Redis_Primary -.-> Redis_Replica

    API1 --> Prometheus
    W1 --> Prometheus
    Prometheus --> Grafana
    Prometheus --> PagerDuty

    style TC fill:#6ee7b7,stroke:#333,stroke-width:2px
    style TSDB_Primary fill:#82c9ed,stroke:#333,stroke-width:2px
    style LB fill:#fa7d6a,stroke:#333,stroke-width:2px
```

### Network Diagram

```
                     INTERNET
                        │
                        │ HTTPS (443)
                        ▼
            ┌───────────────────────┐
            │   Cloudflare Tunnel   │
            │  (TLS Termination)    │
            └───────────┬───────────┘
                        │
                        │ HTTPS
                        ▼
            ┌───────────────────────┐
            │   Load Balancer       │
            │   (HAProxy/NGINX)     │
            └───────────┬───────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
        ▼               ▼               ▼
    ┌─────────┐   ┌─────────┐   ┌─────────┐
    │ API 1   │   │ API 2   │   │ API 3   │
    │ :21009  │   │ :21009  │   │ :21009  │
    └────┬────┘   └────┬────┘   └────┬────┘
         │             │             │
         └─────────────┼─────────────┘
                       │
         ┌─────────────┼─────────────┐
         │             │             │
         ▼             ▼             ▼
    ┌─────────────────────────────────────┐
    │      Temporal Cloud (SaaS)          │
    │  ap-northeast-1.aws.api.temporal.io │
    │            Port 7233                │
    └─────────────────┬───────────────────┘
                      │
         ┌────────────┼────────────┐
         │            │            │
         ▼            ▼            ▼
    ┌─────────┐  ┌─────────┐  ┌─────────┐
    │Worker 1 │  │Worker 2 │  │Worker N │
    └────┬────┘  └────┬────┘  └────┬────┘
         │            │            │
         └────────────┼────────────┘
                      │
         ┌────────────┼────────────┐
         │                         │
         ▼                         ▼
    ┌──────────────┐      ┌──────────────┐
    │TimescaleDB   │      │    Redis     │
    │   :21006     │      │   :21007     │
    │              │      │              │
    │  Primary     │      │  Primary     │
    │    ↕         │      │    ↕         │
    │  Standby     │      │  Replica     │
    └──────────────┘      └──────────────┘
```

---

## Issue Lifecycle State Machine

### State Transitions

```mermaid
stateDiagram-v2
    [*] --> Preparation: Workflow Started

    Preparation --> Spawn: Issue Prepared
    Spawn --> Development: Agent Spawned
    Development --> Testing: Agent Completed
    Testing --> Review: Tests Passed
    Review --> Merge: Review Approved
    Merge --> Completion: Code Merged
    Completion --> [*]: Success

    Preparation --> Failed: Preparation Error
    Spawn --> Failed: Spawn Error
    Development --> Failed: Development Timeout
    Testing --> Failed: Tests Failed
    Review --> Failed: Review Timeout
    Merge --> Failed: Merge Conflict

    Failed --> [*]: Workflow Failed

    note right of Preparation
        • Validate issue
        • Generate docs
        • Create branch
    end note

    note right of Development
        • Monitor commits
        • Track heartbeat
        • Wait for completion
    end note

    note right of Testing
        • Run test suite
        • Parse results
        • Upload evidence
    end note
```

### ASCII State Machine

```
                ┌─────────────┐
                │   START     │
                └──────┬──────┘
                       │
                       ▼
            ┌──────────────────┐
            │   PREPARATION    │◄────┐
            │  • Validate      │     │
            │  • Create branch │     │
            └─────────┬────────┘     │ Retry
                      │              │ (if configured)
                      ▼              │
            ┌──────────────────┐     │
            │      SPAWN       │─────┤
            │  • Select agent  │     │
            │  • Start process │     │
            └─────────┬────────┘     │
                      │              │
                      ▼              │
            ┌──────────────────┐     │
            │   DEVELOPMENT    │─────┤
            │  • Monitor       │     │
            │  • Track commits │     │
            └─────────┬────────┘     │
                      │              │
                      ▼              │
            ┌──────────────────┐     │
            │     TESTING      │─────┤
            │  • Run tests     │     │
            │  • Parse results │     │
            └─────────┬────────┘     │
                      │              │
                      ▼              │
            ┌──────────────────┐     │
            │     REVIEW       │─────┤
            │  • Create PR     │     │
            │  • Wait approval │     │
            └─────────┬────────┘     │
                      │              │
                      ▼              │
            ┌──────────────────┐     │
            │      MERGE       │─────┤
            │  • Merge code    │     │
            │  • Update status │     │
            └─────────┬────────┘     │
                      │              │
                      ▼              │
            ┌──────────────────┐     │
            │   COMPLETION     │     │
            │  • Record metrics│     │
            │  • Update DB     │     │
            └─────────┬────────┘     │
                      │              │
                      ▼              │
                ┌─────────┐          │
                │  DONE   │          │
                └─────────┘          │
                                     │
                ┌──────────────┐     │
                │   FAILED     │◄────┘
                │  (any stage) │
                └──────────────┘

Legend:
  ───► Normal flow
  ──┤  Error/retry path
```

---

## Sequence Diagrams

### Complete Issue Lifecycle (High-Level)

```
User         API         Temporal    Worker      Activities    GitHub      TimescaleDB
 │           │           │           │           │             │           │
 │  Start    │           │           │           │             │           │
 │  Workflow │           │           │           │             │           │
 ├──────────►│           │           │           │             │           │
 │           │ Start WF  │           │           │             │           │
 │           ├──────────►│           │           │             │           │
 │           │           │ Schedule  │           │             │           │
 │           │           ├──────────►│           │             │           │
 │           │           │           │           │             │           │
 │           │           │           │ Prepare   │             │           │
 │           │           │           ├──────────►│             │           │
 │           │           │           │           │ Validate    │           │
 │           │           │           │           ├────────────►│           │
 │           │           │           │           │◄────────────┤           │
 │           │           │           │           │ Write Event │           │
 │           │           │           │           ├────────────────────────►│
 │           │           │           │◄──────────┤             │           │
 │           │           │           │           │             │           │
 │           │           │           │ Spawn     │             │           │
 │           │           │           ├──────────►│             │           │
 │           │           │           │           │ Git branch  │           │
 │           │           │           │           ├────────────►│           │
 │           │           │           │◄──────────┤             │           │
 │           │           │           │           │             │           │
 │  Signal:  │           │           │           │             │           │
 │  Agent    │           │           │           │             │           │
 │  Started  │           │           │           │             │           │
 ├──────────►│           │           │           │             │           │
 │           │ Signal    │           │           │             │           │
 │           ├──────────►│           │           │             │           │
 │           │           │ Deliver   │           │             │           │
 │           │           ├──────────►│           │             │           │
 │           │           │           │ (continue)│             │           │
 │           │           │           │           │             │           │
 │  ... Development stage (commits) ...          │             │           │
 │           │           │           │           │             │           │
 │  Signal:  │           │           │           │             │           │
 │  Agent    │           │           │           │             │           │
 │  Complete │           │           │           │             │           │
 ├──────────►│           │           │           │             │           │
 │           ├──────────►│           │           │             │           │
 │           │           ├──────────►│           │             │           │
 │           │           │           │           │             │           │
 │           │           │           │ Run Tests │             │           │
 │           │           │           ├──────────►│             │           │
 │           │           │           │           │ npm test    │           │
 │           │           │           │◄──────────┤             │           │
 │           │           │           │           │             │           │
 │  Signal:  │           │           │           │             │           │
 │  Test     │           │           │           │             │           │
 │  Results  │           │           │           │             │           │
 ├──────────►│           │           │           │             │           │
 │           ├──────────►│           │           │             │           │
 │           │           ├──────────►│           │             │           │
 │           │           │           │           │             │           │
 │           │           │           │ Move to   │             │           │
 │           │           │           │ Review    │             │           │
 │           │           │           ├──────────►│             │           │
 │           │           │           │           │ Create PR   │           │
 │           │           │           │           ├────────────►│           │
 │           │           │           │◄──────────┤             │           │
 │           │           │           │           │             │           │
 │  Signal:  │           │           │           │             │           │
 │  Review   │           │           │           │             │           │
 │  Approved │           │           │           │             │           │
 ├──────────►│           │           │           │             │           │
 │           ├──────────►│           │           │             │           │
 │           │           ├──────────►│           │             │           │
 │           │           │           │           │             │           │
 │           │           │           │ Merge     │             │           │
 │           │           │           ├──────────►│             │           │
 │           │           │           │           │ git merge   │           │
 │           │           │           │           ├────────────►│           │
 │           │           │           │◄──────────┤             │           │
 │           │           │           │           │             │           │
 │           │           │           │ Record    │             │           │
 │           │           │           │ Completion│             │           │
 │           │           │           ├──────────►│             │           │
 │           │           │           │           │ Write Metrics           │
 │           │           │           │           ├────────────────────────►│
 │           │           │           │◄──────────┤             │           │
 │           │           │           │           │             │           │
 │           │           │◄──────────┤           │             │           │
 │           │◄──────────┤  Done     │           │             │           │
 │◄──────────┤           │           │           │             │           │
 │           │           │           │           │             │           │
```

---

**For more information**, see:
- System Overview: `SYSTEM_OVERVIEW.md`
- Operator Runbook: `OPERATOR_RUNBOOK.md`
- Developer Guide: `DEVELOPER_GUIDE.md`
- API Reference: `API_REFERENCE.md`
