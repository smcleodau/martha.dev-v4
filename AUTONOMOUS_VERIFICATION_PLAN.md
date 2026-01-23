# Martha.dev v4 Orchestration - Autonomous Verification Plan

**Created:** 2026-01-18
**Branch:** feature/evidence-events-enhancement
**Estimated Duration:** 10-15 hours
**Execution Mode:** Autonomous with intelligent error resolution

---

## Executive Summary

This plan provides a comprehensive, autonomous verification strategy for the entire Martha.dev v4 orchestration system. The verification will validate all components from database infrastructure through end-to-end workflow execution, including the recent evidence tracking and events enhancements.

**Key Features:**
- ✅ Real Claude agent spawning and communication
- ✅ Temporal Cloud production namespace workflows
- ✅ Development database with isolated test data
- ✅ Intelligent error detection and automatic resolution
- ✅ Comprehensive artifact collection and reporting

---

## Configuration

### Environment Settings
```bash
Database: postgresql://localhost:21006/martha_ts (ts_martha schema)
Temporal: ap-northeast-1.aws.api.temporal.io:7233 (martha-dev-v4.mnjo7 namespace)
Task Queue: martha-tasks-verification (isolated queue for tests)
Redis: redis://localhost:20001 (ts: prefix)
API Server: http://localhost:21009
```

### Test Data Isolation
```sql
-- All test data will use prefix: TEST-AUTO-{timestamp}-{counter}
-- Issue IDs: TEST-AUTO-20260118-001, TEST-AUTO-20260118-002, etc.
-- Workflow IDs: verify-{timestamp}-{issueId}
-- Cleanup: DELETE FROM evidence_events WHERE issue_id LIKE 'TEST-AUTO-%'
```

### Error Resolution Framework
```typescript
interface ErrorResolver {
  detect: () => Promise<Error[]>;
  diagnose: (error: Error) => Promise<Diagnosis>;
  resolve: (diagnosis: Diagnosis) => Promise<Resolution>;
  verify: (resolution: Resolution) => Promise<boolean>;
}
```

---

## Phase 1: Infrastructure Validation (45-60 minutes)

### 1.1 Pre-Flight Checks

**Objective:** Ensure all services are healthy before starting verification.

**Actions:**
1. Check all service ports available (21000, 21001, 21006, 21009)
2. Verify Temporal Cloud connectivity and API key validity
3. Test database connection and schema existence
4. Verify Redis connectivity
5. Check Claude CLI installation and version
6. Validate environment variables

**Error Resolution:**
- **Port conflicts:** Identify process, offer to kill or suggest alternative port
- **Temporal connection failed:** Check API key expiry, suggest renewal, test mTLS
- **Database unreachable:** Check if TimescaleDB running, attempt to start service
- **Redis down:** Attempt to start Redis service
- **Claude CLI missing:** Provide installation instructions, check PATH

**Success Criteria:**
- All 6 checks pass
- Services respond within timeout (5s)
- No port conflicts

**Script:** `scripts/autonomous-verify/phase1-preflight.ts`

---

### 1.2 Database Schema Verification

**Objective:** Validate migration 008 and all evidence tracking infrastructure.

**Actions:**
1. Run existing integration test: `tsx scripts/test-evidence-integration.ts`
2. Verify all 9 tests pass (connectivity, table, hypertable, indexes, insert, query, aggregates, validation, telemetry)
3. Additional checks:
   - Count existing evidence_events (for baseline)
   - Verify TimescaleDB compression policy active
   - Check retention policy (90 days)
   - Test continuous aggregate refresh
   - Validate SQL functions (get_latest_evidence, has_valid_evidence)

**Error Resolution:**
- **Table missing:** Check if migration 008 ran, offer to run: `tsx scripts/migrate.ts`
- **Hypertable not created:** Run CREATE_HYPERTABLE command manually
- **Indexes missing:** Regenerate missing indexes from migration file
- **Functions invalid:** Re-create functions from migration
- **Compression not working:** Check TimescaleDB version, enable compression

**Success Criteria:**
- All 9 integration tests pass
- evidence_events is hypertable with 9+ indexes
- Both SQL functions executable
- Continuous aggregate exists and refreshes

**Artifacts:**
- `logs/phase1-db-validation.log`
- `logs/phase1-db-schema.json` (schema export)

**Script:** `scripts/autonomous-verify/phase1-database.ts`

---

### 1.3 Component Availability Verification

**Objective:** Verify all Phase 1-4 components exist and are importable.

**Actions:**
1. Run existing verification: `npx tsx scripts/test-component-verification.ts`
2. Verify all 8 components pass:
   - ClaudeAgentSpawner
   - AgentHealthMonitor
   - Workflow Signal Routes
   - Gate Activities
   - Evidence Store
   - Evidence Validator
   - Stage Gates
   - Telemetry Writer

3. Additional import tests for each component
4. Verify TypeScript compilation: `npm run typecheck`

**Error Resolution:**
- **File missing:** Check git status, suggest pulling latest, check if on correct branch
- **Import errors:** Run `npm install`, check for missing dependencies
- **TypeScript errors:** Identify error, suggest fix, run tsc to get details
- **Method missing:** Compare with expected API, suggest implementation

**Success Criteria:**
- All 8 components verified
- No import errors
- TypeScript compiles without errors
- Coverage > 80% for component files

**Artifacts:**
- `logs/phase1-components.log`
- `logs/phase1-typecheck.log`

**Script:** `scripts/autonomous-verify/phase1-components.ts`

---

## Phase 2: Unit Testing Suite (2-3 hours)

### 2.1 Evidence Store Unit Tests

**Objective:** Comprehensive testing of evidence storage operations.

**Test File:** `src/evidence/__tests__/evidence-store.test.ts` (CREATE)

**Test Coverage:**

**2.1.1 Storage Operations (6 tests)**
- ✅ Store evidence with all fields
- ✅ Store evidence with minimal required fields
- ✅ Handle duplicate event_id (should fail)
- ✅ Validate required fields (issue_id, stage, evidence_type)
- ✅ Store JSONB evidence_data correctly
- ✅ Auto-generate timestamp if not provided

**2.1.2 Retrieval Operations (8 tests)**
- ✅ Get latest evidence by issue_id and stage
- ✅ Get evidence timeline for issue (ordered by timestamp)
- ✅ Query with validation status filter
- ✅ Query with quality score threshold
- ✅ Query with time range filter
- ✅ Handle non-existent issue (return empty)
- ✅ Get validation summary with aggregates
- ✅ Pagination support for large result sets

**2.1.3 Update Operations (3 tests)**
- ✅ Update validation status after analysis
- ✅ Update quality score
- ✅ Cannot update immutable fields (event_id, timestamp)

**2.1.4 Delete Operations (2 tests)**
- ✅ Delete evidence for issue (cleanup)
- ✅ Delete with foreign key constraints

**Error Resolution:**
- **Database errors:** Check connection, retry with backoff
- **Schema mismatch:** Re-run migration 008
- **Timeout:** Increase Jest timeout, check database performance
- **Type errors:** Fix TypeScript definitions

**Success Criteria:**
- 19 tests pass
- Code coverage > 85%
- All CRUD operations work
- Edge cases handled

**Duration:** 30-40 minutes

**Script:** `scripts/autonomous-verify/phase2-evidence-store-tests.ts`

---

### 2.2 Evidence Validator Unit Tests

**Objective:** Test validation logic for all 7 lifecycle stages.

**Test File:** `src/validation/__tests__/evidence-validator.test.ts` (CREATE)

**Test Coverage by Stage:**

**2.2.1 DEVELOPMENT Stage (5 tests)**
- ✅ Valid commits evidence (quality >= 70)
- ✅ Invalid: no commits
- ✅ Invalid: quality score < 70
- ✅ Edge: exactly threshold (70)
- ✅ Multiple commits with aggregation

**2.2.2 TESTING Stage (6 tests)**
- ✅ Valid test results (all passing, quality >= 80)
- ✅ Invalid: failing tests
- ✅ Invalid: no test evidence
- ✅ Invalid: quality score < 80
- ✅ Partial pass rate (95%+)
- ✅ Coverage validation

**2.2.3 REVIEW Stage (5 tests)**
- ✅ Valid approved review (quality >= 75)
- ✅ Invalid: pending review
- ✅ Invalid: no review evidence
- ✅ Invalid: quality score < 75
- ✅ Multiple reviewers

**2.2.4 MERGE Stage (4 tests)**
- ✅ Valid merge commit (quality >= 70)
- ✅ Invalid: no merge SHA
- ✅ Invalid: conflicts present
- ✅ Invalid: quality score < 70

**2.2.5 Cross-Stage (5 tests)**
- ✅ Validate evidence array
- ✅ Calculate quality score from data
- ✅ Missing evidence type handling
- ✅ Invalid stage name
- ✅ Empty evidence array

**Error Resolution:**
- **Validation logic errors:** Review stage requirements, fix rules
- **Quality calculation errors:** Debug scoring algorithm
- **Type errors:** Fix evidence interfaces

**Success Criteria:**
- 25 tests pass
- Coverage > 85%
- All stage validations work
- Quality thresholds enforced

**Duration:** 45-60 minutes

**Script:** `scripts/autonomous-verify/phase2-validator-tests.ts`

---

### 2.3 Stage Gates Unit Tests

**Objective:** Test gate transition logic for all stage combinations.

**Test File:** `src/workflows/gates/__tests__/stage-gates.test.ts` (CREATE)

**Test Coverage:**

**2.3.1 Development → Testing Gate (4 tests)**
- ✅ Pass with valid commits (score >= 70)
- ✅ Block: no commits
- ✅ Block: quality < 70
- ✅ Block: validation errors

**2.3.2 Testing → Review Gate (5 tests)**
- ✅ Pass with all tests passing (score >= 80)
- ✅ Block: failing tests
- ✅ Block: quality < 80
- ✅ Block: insufficient coverage
- ✅ Pass: edge case exactly 80

**2.3.3 Review → Merge Gate (4 tests)**
- ✅ Pass with approved reviews (score >= 75)
- ✅ Block: pending reviews
- ✅ Block: quality < 75
- ✅ Block: insufficient approvals

**2.3.4 Merge → Completion Gate (4 tests)**
- ✅ Pass with successful merge (score >= 70)
- ✅ Block: no merge evidence
- ✅ Block: quality < 70
- ✅ Block: merge conflicts

**2.3.5 Gate Dispatcher (3 tests)**
- ✅ Routes to correct gate
- ✅ Handles unknown stage
- ✅ Returns proper GateResult format

**Error Resolution:**
- **Gate logic errors:** Review evidence requirements per stage
- **Evidence store errors:** Check database connectivity
- **Type mismatches:** Fix GateResult interface

**Success Criteria:**
- 20 tests pass
- Coverage > 80%
- All gates tested
- Threshold enforcement verified

**Duration:** 40-50 minutes

**Script:** `scripts/autonomous-verify/phase2-gates-tests.ts`

---

### 2.4 Claude Agent Spawner Unit Tests

**Objective:** Test agent spawning logic (with spawn mocked, but context real).

**Test File:** `src/services/__tests__/ClaudeAgentSpawner.test.ts` (CREATE)

**Test Coverage:**

**2.4.1 Context Building (7 tests)**
- ✅ Build complete AgentContext with all fields
- ✅ Include issue details
- ✅ Include worktree info
- ✅ Include dependencies
- ✅ Include signal endpoints
- ✅ Include quality thresholds
- ✅ Include evidence requirements

**2.4.2 Prompt Generation (4 tests)**
- ✅ Generate agent prompt with context
- ✅ Format correctly
- ✅ Include all context sections
- ✅ Escape special characters

**2.4.3 Work Directory Setup (5 tests)**
- ✅ Create .martha/work/{agentId} directory
- ✅ Write context.json
- ✅ Write prompt.txt
- ✅ Set correct permissions
- ✅ Handle existing directory (cleanup)

**2.4.4 Process Spawning (4 tests - mocked)**
- ✅ Spawn with correct arguments
- ✅ Capture process ID
- ✅ Handle spawn errors
- ✅ Set environment variables

**Error Resolution:**
- **Directory creation errors:** Check permissions, create parent dirs
- **JSON serialization errors:** Fix context object
- **Mock errors:** Update spawn mock

**Success Criteria:**
- 20 tests pass
- Coverage > 75%
- Context building verified
- Directory setup works

**Duration:** 45-60 minutes

**Script:** `scripts/autonomous-verify/phase2-spawner-tests.ts`

---

### 2.5 Workflow Signal Routes Unit Tests

**Objective:** Test API endpoints for workflow signals.

**Test File:** `src/server/routes/__tests__/workflow-signals.test.ts` (CREATE)

**Test Coverage:**

**2.5.1 Generic Signal Endpoint (5 tests)**
- ✅ POST /api/v1/workflows/:workflowId/signals/:signalName
- ✅ Validate payload schema
- ✅ Write telemetry event
- ✅ Forward to Temporal (mocked)
- ✅ Return success response

**2.5.2 Specific Signals (10 tests - 2 per signal type)**
- ✅ agent-started: valid payload
- ✅ agent-started: invalid payload
- ✅ commit-made: valid with commit details
- ✅ commit-made: missing required fields
- ✅ agent-completed: with success
- ✅ agent-completed: with failure
- ✅ test-results: valid test data
- ✅ test-results: invalid format
- ✅ block: with reason
- ✅ block: missing reason

**2.5.3 Error Handling (5 tests)**
- ✅ Invalid workflow ID format
- ✅ Temporal unreachable (timeout)
- ✅ Malformed JSON payload
- ✅ Unknown signal name
- ✅ Rate limiting (if enabled)

**Error Resolution:**
- **Fastify setup errors:** Check server initialization
- **Mock errors:** Fix Temporal client mock
- **Validation errors:** Update schema

**Success Criteria:**
- 20 tests pass
- Coverage > 80%
- All signal types tested
- Error handling verified

**Duration:** 45-60 minutes

**Script:** `scripts/autonomous-verify/phase2-signal-routes-tests.ts`

---

### Phase 2 Summary

**Total Tests:** ~104 tests across 5 test suites
**Expected Coverage:** 80-85% overall
**Duration:** 2-3 hours
**Artifacts:**
- Test results: `logs/phase2-unit-tests.json`
- Coverage report: `coverage/lcov-report/index.html`
- Failed tests log: `logs/phase2-failures.log`

---

## Phase 3: Integration Testing (2-3 hours)

### 3.1 Temporal Workflow Integration Tests

**Objective:** Test IssueLifecycleWorkflow with real Temporal workflows and mocked activities.

**Test File:** Extend `src/workflows/__tests__/IssueLifecycleWorkflow.test.ts`

**New Test Cases:**

**3.1.1 Stage Gate Integration (7 tests)**
```typescript
describe('Stage Gate Integration', () => {
  it('should block at DEVELOPMENT without commits', async () => {
    const handle = await startWorkflow(issueInput);
    await handle.signal(agentStartedSignal, { agentId: 'test' });
    await handle.signal(agentCompletedSignal, { success: true });

    const status = await handle.query(getStatusQuery);
    expect(status.stage).toBe(Stage.DEVELOPMENT);
    expect(status.blocked).toBe(true);
    expect(status.blockedReason).toContain('commits');
  });

  it('should progress DEVELOPMENT → TESTING with valid commits', async () => {
    // Send commit signal with score >= 70
    // Verify stage advances to TESTING
  });

  it('should block at TESTING with failing tests', async () => {
    // Progress to TESTING
    // Send test results with failures
    // Verify stays at TESTING
  });

  it('should progress TESTING → REVIEW with passing tests', async () => {
    // Send test results with 100% pass, score >= 80
    // Verify stage advances to REVIEW
  });

  // ... similar for REVIEW → MERGE and MERGE → COMPLETION
});
```

**3.1.2 Evidence Collection Flow (6 tests)**
```typescript
describe('Evidence Collection', () => {
  it('should store commit evidence on commit signal', async () => {
    const handle = await startWorkflow(issueInput);
    await handle.signal(commitMadeSignal, {
      commitSha: 'abc123',
      filesChanged: 5,
      timestamp: new Date()
    });

    // Query evidence from database
    const evidence = await evidenceStore.getLatestEvidence(
      issueId,
      'DEVELOPMENT'
    );
    expect(evidence).toBeDefined();
    expect(evidence.evidenceType).toBe('commits');
  });

  // ... test results evidence
  // ... review evidence
  // ... merge evidence
});
```

**3.1.3 Signal-Gate-Stage Cycle (4 tests)**
```typescript
describe('Complete Lifecycle', () => {
  it('should complete all 7 stages with valid evidence', async () => {
    const handle = await startWorkflow(issueInput);

    // PREPARATION → SPAWN (automatic)
    await waitForStage(handle, Stage.SPAWN);

    // SPAWN → DEVELOPMENT (agent signals)
    await handle.signal(agentStartedSignal, { ... });
    await waitForStage(handle, Stage.DEVELOPMENT);

    // DEVELOPMENT → TESTING (commits + gate)
    await handle.signal(commitMadeSignal, { score: 85 });
    await handle.signal(agentCompletedSignal, { ... });
    await waitForStage(handle, Stage.TESTING);

    // TESTING → REVIEW (tests + gate)
    await handle.signal(testResultsSignal, { passed: 10, failed: 0, score: 90 });
    await waitForStage(handle, Stage.REVIEW);

    // REVIEW → MERGE (review + gate)
    await handle.signal(reviewApprovedSignal, { approved: true, score: 80 });
    await waitForStage(handle, Stage.MERGE);

    // MERGE → COMPLETION (merge + gate)
    // Mock merge activity completes
    await waitForStage(handle, Stage.COMPLETION);

    // Verify completion
    const result = await handle.result();
    expect(result).toBeDefined();

    // Verify all evidence stored
    const timeline = await evidenceStore.getEvidenceTimeline(issueId);
    expect(timeline.length).toBeGreaterThanOrEqual(4);
  });
});
```

**Error Resolution:**
- **Temporal connection errors:** Check API key, retry connection
- **Workflow stuck:** Check signals sent, verify gate logic
- **Evidence not stored:** Check database connection, verify evidenceStore
- **Timeout errors:** Increase Jest timeout, check workflow execution time

**Success Criteria:**
- 17+ new tests pass
- All 7 stages tested
- Evidence flow verified
- Gates work with workflows

**Duration:** 60-90 minutes

**Script:** `scripts/autonomous-verify/phase3-workflow-integration.ts`

---

### 3.2 API Integration Tests

**Objective:** Test API endpoints with real database and Temporal interactions.

**Test File:** `tests/integration/api-integration.test.ts` (CREATE)

**Test Coverage:**

**3.2.1 Health Endpoints (3 tests)**
```typescript
describe('Health Endpoints', () => {
  it('GET /health should return service status', async () => {
    const response = await fetch('http://localhost:21009/health');
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe('healthy');
    expect(body.version).toBeDefined();
  });

  it('GET /health/ready should verify database connectivity', async () => {
    const response = await fetch('http://localhost:21009/health/ready');
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.database).toBe('connected');
  });
});
```

**3.2.2 Workflow Signal Endpoints (8 tests)**
```typescript
describe('Workflow Signals', () => {
  let workflowId: string;

  beforeAll(async () => {
    // Start a real workflow in Temporal
    const handle = await client.workflow.start(IssueLifecycleWorkflow, {
      args: [testIssue],
      taskQueue: 'martha-tasks-verification',
      workflowId: `api-test-${Date.now()}`
    });
    workflowId = handle.workflowId;
  });

  it('POST /workflows/:id/signals/agent-started should forward to Temporal', async () => {
    const response = await fetch(
      `http://localhost:21009/api/v1/workflows/${workflowId}/signals/agent-started`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: 'api-test-agent',
          timestamp: new Date().toISOString()
        })
      }
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);

    // Verify telemetry written
    const telemetry = await query(`
      SELECT * FROM telemetry_events
      WHERE workflow_id = $1
        AND event_type = 'signal_received'
      ORDER BY timestamp DESC
      LIMIT 1
    `, [workflowId]);

    expect(telemetry.rows.length).toBe(1);
  });

  // ... test other signal types
});
```

**3.2.3 Metrics Endpoint (2 tests)**
```typescript
describe('Metrics', () => {
  it('GET /metrics should return Prometheus format', async () => {
    const response = await fetch('http://localhost:21009/metrics');
    expect(response.status).toBe(200);
    const text = await response.text();

    // Verify Prometheus format
    expect(text).toContain('# HELP');
    expect(text).toContain('# TYPE');
    expect(text).toContain('martha_');
  });
});
```

**Error Resolution:**
- **Server not running:** Start Fastify server automatically
- **Connection refused:** Check port 21009, kill conflicting process
- **Temporal errors:** Verify workflow started, check task queue
- **Database errors:** Check connection, verify schema

**Success Criteria:**
- 13 tests pass
- All endpoints respond correctly
- Database integration works
- Temporal signals forwarded

**Duration:** 45-60 minutes

**Script:** `scripts/autonomous-verify/phase3-api-integration.ts`

---

### Phase 3 Summary

**Total Tests:** ~30 integration tests
**Duration:** 2-3 hours
**Artifacts:**
- Integration test results: `logs/phase3-integration.json`
- Temporal workflow histories: `logs/phase3-temporal-workflows.json`
- API request/response logs: `logs/phase3-api-requests.log`

---

## Phase 4: End-to-End Verification (3-4 hours)

### 4.1 Single Issue E2E with Real Claude Agent

**Objective:** Complete workflow from issue creation to completion with a real Claude CLI agent.

**Test File:** `tests/e2e/single-issue-real-agent.test.ts` (CREATE)

**Flow:**

**4.1.1 Setup (5 minutes)**
```typescript
describe('Single Issue E2E with Real Agent', () => {
  let issueId: string;
  let workflowId: string;
  let agentId: string;

  beforeAll(async () => {
    // Start services
    await startWorker();
    await startApiServer();

    // Create test issue
    issueId = `TEST-AUTO-${Date.now()}-001`;
    workflowId = `verify-${issueId}`;

    // Prepare simple task for agent
    // Task: "Add a function to calculate factorial of a number"
  });

  afterAll(async () => {
    // Cleanup test data
    await cleanupTestData(issueId);
    await shutdownServices();
  });

  it('should complete full lifecycle with real agent', async () => {
    // ... test implementation below
  }, 600000); // 10 minute timeout
});
```

**4.1.2 Start Workflow**
```typescript
const handle = await client.workflow.start(IssueLifecycleWorkflow, {
  args: [{
    id: issueId,
    title: 'Add factorial function',
    description: 'Create a function that calculates factorial',
    acceptanceCriteria: [
      'Function named factorial',
      'Takes integer parameter',
      'Returns factorial result',
      'Handles edge cases (0, 1)'
    ],
    complexity: 2,
    epicId: 'TEST-AUTO-EPIC'
  }],
  taskQueue: 'martha-tasks-verification',
  workflowId
});

console.log(`Started workflow: ${workflowId}`);
```

**4.1.3 Monitor Workflow Progress**
```typescript
// Poll workflow status
let currentStage = Stage.PREPARATION;
const stageTimestamps: Record<string, Date> = {};

while (currentStage !== Stage.COMPLETION) {
  await sleep(5000); // Check every 5 seconds

  const status = await handle.query(getStatusQuery);

  if (status.stage !== currentStage) {
    console.log(`Stage transition: ${currentStage} → ${status.stage}`);
    stageTimestamps[status.stage] = new Date();
    currentStage = status.stage;
  }

  // Check for blocks
  if (status.blocked) {
    console.log(`Workflow blocked at ${status.stage}: ${status.blockedReason}`);
    // Attempt resolution (Phase 4.1.5)
  }
}
```

**4.1.4 Verify Each Stage**

**PREPARATION:**
```typescript
await waitForStage(handle, Stage.PREPARATION);
// Verify: Branch created, documentation generated
const metrics = await handle.query(getMetricsQuery);
expect(metrics.branchCreated).toBe(true);
```

**SPAWN:**
```typescript
await waitForStage(handle, Stage.SPAWN);
// Verify: Agent process spawned
const status = await handle.query(getStatusQuery);
agentId = status.currentAgentId;
expect(agentId).toBeDefined();

// Verify: Work directory created
const workDir = path.join('.martha/work', agentId);
expect(await fs.pathExists(workDir)).toBe(true);

// Verify: Context file exists
const contextPath = path.join(workDir, 'context.json');
expect(await fs.pathExists(contextPath)).toBe(true);

const context = JSON.parse(await fs.readFile(contextPath, 'utf-8'));
expect(context.issue.id).toBe(issueId);
expect(context.signalEndpoints).toBeDefined();
```

**DEVELOPMENT:**
```typescript
await waitForStage(handle, Stage.DEVELOPMENT);

// Wait for agent to send signals (agent-started, commit-made, agent-completed)
// This is automatic from real Claude agent

// Verify: Commits made
const commits = await getCommitsFromBranch(issueId);
expect(commits.length).toBeGreaterThan(0);

// Verify: Evidence stored
const devEvidence = await evidenceStore.getLatestEvidence(issueId, 'DEVELOPMENT');
expect(devEvidence).toBeDefined();
expect(devEvidence.evidenceType).toBe('commits');
expect(devEvidence.qualityScore).toBeGreaterThanOrEqual(70);

// Verify: Gate passed
await waitForStage(handle, Stage.TESTING);
```

**TESTING:**
```typescript
// Verify: Tests run automatically (via runTests activity)
const testEvidence = await evidenceStore.getLatestEvidence(issueId, 'TESTING');
expect(testEvidence).toBeDefined();
expect(testEvidence.evidenceType).toBe('tests');

const testData = testEvidence.evidenceData as TestResultsData;
expect(testData.testsPassed).toBeGreaterThan(0);
expect(testData.testsFailed).toBe(0);
expect(testEvidence.qualityScore).toBeGreaterThanOrEqual(80);

// Verify: Gate passed
await waitForStage(handle, Stage.REVIEW);
```

**REVIEW:**
```typescript
// In automated mode, review auto-approves for test issues
const reviewEvidence = await evidenceStore.getLatestEvidence(issueId, 'REVIEW');
expect(reviewEvidence).toBeDefined();
expect(reviewEvidence.evidenceType).toBe('reviews');

// Verify: Gate passed
await waitForStage(handle, Stage.MERGE);
```

**MERGE:**
```typescript
// Verify: Merge completed
const mergeEvidence = await evidenceStore.getLatestEvidence(issueId, 'MERGE');
expect(mergeEvidence).toBeDefined();
expect(mergeEvidence.evidenceType).toBe('merge');

const mergeData = mergeEvidence.evidenceData as MergeData;
expect(mergeData.mergeSha).toBeDefined();
expect(mergeData.conflicted).toBe(false);

// Verify: Gate passed
await waitForStage(handle, Stage.COMPLETION);
```

**COMPLETION:**
```typescript
// Wait for workflow to complete
const result = await handle.result();
expect(result).toBeDefined();
expect(result.success).toBe(true);

// Verify: Metrics recorded
const finalMetrics = await handle.query(getMetricsQuery);
expect(finalMetrics.completedAt).toBeDefined();
expect(finalMetrics.totalCommits).toBeGreaterThan(0);
expect(finalMetrics.timeToFirstCommit).toBeDefined();
```

**4.1.5 Evidence Verification**
```typescript
// Get complete evidence timeline
const timeline = await evidenceStore.getEvidenceTimeline(issueId);

// Verify minimum evidence entries
expect(timeline.length).toBeGreaterThanOrEqual(4);

// Verify evidence types present
const types = new Set(timeline.map(e => e.evidenceType));
expect(types).toContain('commits');
expect(types).toContain('tests');
expect(types).toContain('reviews');
expect(types).toContain('merge');

// Verify all evidence validated
const invalidEvidence = timeline.filter(e => e.validationStatus === 'invalid');
expect(invalidEvidence.length).toBe(0);

// Verify quality scores above thresholds
const evidenceByStage = {
  DEVELOPMENT: timeline.filter(e => e.stage === 'DEVELOPMENT'),
  TESTING: timeline.filter(e => e.stage === 'TESTING'),
  REVIEW: timeline.filter(e => e.stage === 'REVIEW'),
  MERGE: timeline.filter(e => e.stage === 'MERGE')
};

expect(Math.max(...evidenceByStage.DEVELOPMENT.map(e => e.qualityScore))).toBeGreaterThanOrEqual(70);
expect(Math.max(...evidenceByStage.TESTING.map(e => e.qualityScore))).toBeGreaterThanOrEqual(80);
expect(Math.max(...evidenceByStage.REVIEW.map(e => e.qualityScore))).toBeGreaterThanOrEqual(75);
expect(Math.max(...evidenceByStage.MERGE.map(e => e.qualityScore))).toBeGreaterThanOrEqual(70);
```

**4.1.6 Telemetry Verification**
```typescript
// Query telemetry events
const telemetryEvents = await query(`
  SELECT
    event_type,
    timestamp,
    payload
  FROM telemetry_events
  WHERE workflow_id = $1
  ORDER BY timestamp ASC
`, [workflowId]);

// Verify minimum event count
expect(telemetryEvents.rows.length).toBeGreaterThanOrEqual(15);

// Verify key events present
const eventTypes = new Set(telemetryEvents.rows.map(r => r.event_type));
expect(eventTypes).toContain('workflow_started');
expect(eventTypes).toContain('stage_transitioned');
expect(eventTypes).toContain('signal_received');
expect(eventTypes).toContain('gate_check_passed');
expect(eventTypes).toContain('workflow_completed');

// Verify stage transitions
const transitions = telemetryEvents.rows.filter(r => r.event_type === 'stage_transitioned');
expect(transitions.length).toBeGreaterThanOrEqual(6); // All 7 stages minus initial
```

**Error Resolution:**
- **Agent spawn fails:** Check Claude CLI path, verify context.json, check permissions
- **Agent stalls:** Monitor agent output, check for errors, kill and respawn if needed
- **Gate blocks:** Check evidence quality, manually add evidence if needed, adjust thresholds for test
- **Tests fail:** Check test implementation, verify factorial function works
- **Timeout:** Extend timeout, check if agent is actively working

**Success Criteria:**
- Workflow completes all 7 stages
- Real agent successfully completes task
- All evidence stored with valid quality scores
- All gates pass
- Telemetry events recorded
- Test completes within 10 minutes

**Duration:** 45-60 minutes (including agent work time)

**Artifacts:**
- Workflow execution log: `logs/phase4-e2e-single-issue.log`
- Agent output: `logs/phase4-agent-${agentId}.log`
- Evidence timeline: `logs/phase4-evidence-timeline.json`
- Telemetry events: `logs/phase4-telemetry-events.json`
- Created code: `.martha/work/${agentId}/`

**Script:** `scripts/autonomous-verify/phase4-single-issue-e2e.ts`

---

### 4.2 Batch Workflow E2E with Dependencies

**Objective:** Test batch coordination with 5 issues including dependency chains.

**Test File:** `tests/e2e/batch-workflow-e2e.test.ts` (CREATE)

**Setup:**
```typescript
const batchId = `TEST-AUTO-BATCH-${Date.now()}`;
const issues = [
  {
    id: `${batchId}-001`,
    title: 'Create base utility module',
    dependencies: [],
    task: 'Create a utils.ts file with a sum function'
  },
  {
    id: `${batchId}-002`,
    title: 'Create advanced utility',
    dependencies: [`${batchId}-001`], // Depends on 001
    task: 'Add multiply function to utils.ts'
  },
  {
    id: `${batchId}-003`,
    title: 'Independent feature A',
    dependencies: [],
    task: 'Create feature-a.ts with greeting function'
  },
  {
    id: `${batchId}-004`,
    title: 'Independent feature B',
    dependencies: [],
    task: 'Create feature-b.ts with farewell function'
  },
  {
    id: `${batchId}-005`,
    title: 'Integration module',
    dependencies: [`${batchId}-003`, `${batchId}-004`], // Depends on both
    task: 'Create integration.ts that uses both features'
  }
];

const batchInput: BatchInput = {
  batchId,
  epics: [{
    epicId: `${batchId}-EPIC`,
    name: 'Test Epic',
    issues: issues.map(i => ({
      id: i.id,
      title: i.title,
      dependencies: i.dependencies,
      complexity: 1
    }))
  }]
};
```

**Flow:**

**4.2.1 Start Batch**
```typescript
const handle = await client.workflow.start(BatchCoordinatorWorkflow, {
  args: [batchInput],
  taskQueue: 'martha-tasks-verification',
  workflowId: `batch-${batchId}`
});

console.log(`Started batch workflow: ${batchId}`);
```

**4.2.2 Monitor Parallel Execution**
```typescript
// Track which issues are running
const runningIssues = new Set<string>();
const completedIssues = new Set<string>();

const checkInterval = setInterval(async () => {
  const status = await handle.query(getBatchStatusQuery);

  // Log status changes
  for (const issueId of status.runningIssues) {
    if (!runningIssues.has(issueId)) {
      console.log(`Issue started: ${issueId}`);
      runningIssues.add(issueId);
    }
  }

  for (const issueId of status.completedIssues) {
    if (!completedIssues.has(issueId)) {
      console.log(`Issue completed: ${issueId}`);
      completedIssues.add(issueId);
      runningIssues.delete(issueId);
    }
  }

  // Check completion
  if (status.completedIssues.size === issues.length) {
    clearInterval(checkInterval);
  }
}, 10000); // Check every 10 seconds
```

**4.2.3 Verify Dependency Ordering**
```typescript
// Verify Issue 001 started first (no dependencies)
// Verify Issue 002 did NOT start until 001 completed
// Verify Issue 003 and 004 started immediately (independent)
// Verify Issue 005 did NOT start until both 003 and 004 completed

const completionTimes: Record<string, Date> = {};

for (const issue of issues) {
  const timeline = await evidenceStore.getEvidenceTimeline(issue.id);
  const firstEvidence = timeline[0];
  completionTimes[issue.id] = new Date(firstEvidence.timestamp);
}

// 001 starts before 002
expect(completionTimes[`${batchId}-001`].getTime())
  .toBeLessThan(completionTimes[`${batchId}-002`].getTime());

// 003 and 004 start in parallel (within 30 seconds of each other)
const diff = Math.abs(
  completionTimes[`${batchId}-003`].getTime() -
  completionTimes[`${batchId}-004`].getTime()
);
expect(diff).toBeLessThan(30000);

// 005 starts after both 003 and 004
expect(completionTimes[`${batchId}-005`].getTime())
  .toBeGreaterThan(completionTimes[`${batchId}-003`].getTime());
expect(completionTimes[`${batchId}-005`].getTime())
  .toBeGreaterThan(completionTimes[`${batchId}-004`].getTime());
```

**4.2.4 Verify All Issues Complete**
```typescript
// Wait for batch completion
const result = await handle.result();

// Verify all 5 issues completed
expect(result.completedIssues.length).toBe(5);
expect(result.failedIssues.length).toBe(0);

// Verify evidence for all issues
for (const issue of issues) {
  const timeline = await evidenceStore.getEvidenceTimeline(issue.id);
  expect(timeline.length).toBeGreaterThanOrEqual(4);
}
```

**Error Resolution:**
- **Dependency violation:** Check batch coordinator logic, verify dependency graph
- **Issue hangs:** Check child workflow, verify agent working
- **Partial completion:** Identify failed issue, check logs, retry if needed

**Success Criteria:**
- All 5 issues complete successfully
- Dependencies respected (002 waits for 001, 005 waits for 003+004)
- Independent issues run in parallel (001, 003, 004)
- Evidence for all issues
- Test completes within 15 minutes

**Duration:** 60-90 minutes

**Artifacts:**
- Batch status log: `logs/phase4-batch-status.log`
- Dependency graph: `logs/phase4-dependency-graph.json`
- Completion times: `logs/phase4-completion-times.json`

**Script:** `scripts/autonomous-verify/phase4-batch-e2e.ts`

---

### Phase 4 Summary

**Total Duration:** 3-4 hours
**Issues Created:** 6 (1 single + 5 batch)
**Workflows Started:** 7 (1 batch coordinator + 6 child workflows)
**Real Agents Spawned:** 6
**Evidence Entries Created:** ~24+ (4 per issue minimum)
**Telemetry Events:** ~100+

**Critical Success Factors:**
- Real Claude agents complete tasks successfully
- All evidence properly tracked and validated
- All gates pass with correct thresholds
- Batch dependencies enforced
- No manual intervention required

---

## Phase 5: Load & Stress Testing (2-3 hours)

### 5.1 Concurrent Workflow Load Test

**Objective:** Verify system handles multiple concurrent workflows without degradation.

**Test File:** `tests/load/concurrent-workflows.test.ts` (CREATE)

**Test Scenarios:**

**5.1.1 10 Concurrent Workflows**
```typescript
describe('10 Concurrent Workflows', () => {
  it('should complete all workflows successfully', async () => {
    const workflows = [];

    for (let i = 0; i < 10; i++) {
      const issueId = `TEST-LOAD-10-${i}`;
      const handle = client.workflow.start(IssueLifecycleWorkflow, {
        args: [{
          id: issueId,
          title: `Load test ${i}`,
          task: 'Add simple function (load test)',
          complexity: 1
        }],
        taskQueue: 'martha-tasks-verification',
        workflowId: `load-10-${i}`
      });
      workflows.push(handle);
    }

    // Wait for all
    const startTime = Date.now();
    const results = await Promise.all(workflows.map(w => w.result()));
    const duration = Date.now() - startTime;

    // Verify all succeeded
    expect(results).toHaveLength(10);
    expect(results.every(r => r.success)).toBe(true);

    // Performance check (should complete in < 15 min for 10 concurrent)
    expect(duration).toBeLessThan(900000);

    console.log(`10 concurrent workflows completed in ${duration}ms`);
  }, 1000000); // 16 minute timeout
});
```

**5.1.2 25 Concurrent Workflows (Stress Test)**
```typescript
describe('25 Concurrent Workflows (Stress)', () => {
  it('should handle 25 workflows with < 10% failure rate', async () => {
    const workflows = [];

    for (let i = 0; i < 25; i++) {
      const handle = client.workflow.start(IssueLifecycleWorkflow, {
        args: [{
          id: `TEST-LOAD-25-${i}`,
          title: `Stress test ${i}`,
          task: 'Add simple utility function',
          complexity: 1
        }],
        taskQueue: 'martha-tasks-verification',
        workflowId: `load-25-${i}`
      });
      workflows.push({ id: i, handle });
    }

    // Wait with error handling
    const results = await Promise.allSettled(
      workflows.map(w => w.handle.result())
    );

    const succeeded = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    console.log(`25 concurrent: ${succeeded} succeeded, ${failed} failed`);

    // Allow up to 10% failure under stress
    expect(failed).toBeLessThanOrEqual(2);
    expect(succeeded).toBeGreaterThanOrEqual(23);
  }, 1800000); // 30 minute timeout
});
```

**5.1.3 Resource Monitoring**
```typescript
// Monitor during load test
const resourceMonitor = setInterval(async () => {
  // Check database connections
  const dbPool = await query(`
    SELECT count(*) as active_connections
    FROM pg_stat_activity
    WHERE datname = 'martha_ts'
  `);

  // Check Temporal task queue depth
  const queueDepth = await getTaskQueueDepth('martha-tasks-verification');

  // Log metrics
  console.log({
    dbConnections: dbPool.rows[0].active_connections,
    queueDepth,
    timestamp: new Date()
  });
}, 30000); // Every 30 seconds
```

**Error Resolution:**
- **Connection pool exhausted:** Increase pool size, optimize queries
- **Temporal queue saturated:** Increase worker count, reduce concurrency
- **High failure rate:** Identify common failure cause, fix before continuing
- **Timeout:** Increase timeout, check if agents making progress

**Success Criteria:**
- 10 concurrent: 100% success rate, < 15 min total
- 25 concurrent: >= 90% success rate, < 30 min total
- Database connections stable (< 50 active)
- No memory leaks or resource exhaustion

**Duration:** 60-90 minutes

**Artifacts:**
- Load test results: `logs/phase5-load-test-results.json`
- Resource usage: `logs/phase5-resource-usage.json`
- Performance metrics: `logs/phase5-performance-metrics.json`

**Script:** `scripts/autonomous-verify/phase5-load-test.ts`

---

### 5.2 Evidence Storage Performance Test

**Objective:** Verify database can handle high evidence write rate.

**Test File:** `tests/load/evidence-performance.test.ts` (CREATE)

**Test:**
```typescript
describe('Evidence Storage Performance', () => {
  it('should handle 500 evidence inserts under 30 seconds', async () => {
    const startTime = Date.now();
    const promises = [];

    for (let i = 0; i < 500; i++) {
      const evidence: BaseEvidence = {
        eventId: uuidv4(),
        issueId: `PERF-TEST-${i % 50}`, // Spread across 50 issues
        stage: ['DEVELOPMENT', 'TESTING', 'REVIEW', 'MERGE'][i % 4],
        evidenceType: 'commits',
        timestamp: new Date().toISOString(),
        evidenceData: {
          commits: [{ sha: `sha-${i}`, message: `Commit ${i}` }]
        },
        qualityScore: 70 + (i % 30),
        validationStatus: 'valid'
      };

      promises.push(evidenceStore.storeEvidence(evidence));
    }

    await Promise.all(promises);
    const duration = Date.now() - startTime;

    console.log(`500 evidence inserts completed in ${duration}ms`);
    expect(duration).toBeLessThan(30000); // 30 seconds
  });

  it('should maintain fast query performance during writes', async () => {
    // Start background writes
    const writeInterval = setInterval(async () => {
      await evidenceStore.storeEvidence({ /* ... */ });
    }, 100); // 10 writes/second

    // Query performance
    const queryStartTime = Date.now();
    for (let i = 0; i < 100; i++) {
      await evidenceStore.getLatestEvidence('PERF-TEST-1', 'DEVELOPMENT');
    }
    const queryDuration = Date.now() - queryStartTime;

    clearInterval(writeInterval);

    // Average query should be < 50ms even under write load
    const avgQueryTime = queryDuration / 100;
    expect(avgQueryTime).toBeLessThan(50);
  });
});
```

**Success Criteria:**
- 500 inserts in < 30 seconds (16.7 inserts/sec)
- Query latency < 50ms average
- No database errors or deadlocks

**Duration:** 15-20 minutes

**Script:** `scripts/autonomous-verify/phase5-evidence-performance.ts`

---

### Phase 5 Summary

**Total Load Generated:**
- 35 concurrent workflows (10 + 25)
- 500+ evidence inserts
- 100+ concurrent queries

**Duration:** 2-3 hours
**Success Rate Target:** >= 90%

---

## Phase 6: Error Scenarios & Recovery (1-2 hours)

### 6.1 Agent Failure Scenarios

**Objective:** Test system handles agent failures gracefully.

**Test File:** `tests/error/agent-failures.test.ts` (CREATE)

**Test Cases:**

**6.1.1 Agent Process Crash**
```typescript
describe('Agent Crash Handling', () => {
  it('should detect and handle agent crash', async () => {
    const handle = await startWorkflow({ id: 'ERROR-CRASH-001' });

    // Wait for agent to spawn
    await waitForStage(handle, Stage.DEVELOPMENT);
    const status = await handle.query(getStatusQuery);
    const agentPid = status.agentPid;

    // Kill agent process
    process.kill(agentPid, 'SIGKILL');

    // Wait for crash detection (health monitor should detect within 30s)
    await sleep(35000);

    // Verify workflow handled crash
    const newStatus = await handle.query(getStatusQuery);
    expect(newStatus.agentCrashed).toBe(true);

    // Verify telemetry recorded
    const telemetry = await query(`
      SELECT * FROM telemetry_events
      WHERE workflow_id = $1
        AND event_type = 'agent_crashed'
    `, [handle.workflowId]);
    expect(telemetry.rows.length).toBeGreaterThan(0);
  });
});
```

**6.1.2 Agent Timeout (No Signals)**
```typescript
describe('Agent Timeout', () => {
  it('should timeout if agent never sends signals', async () => {
    // Start workflow with agent that won't send signals
    // (mock spawnAgent to spawn dummy process)

    const handle = await startWorkflow({ id: 'ERROR-TIMEOUT-001' });

    // Wait for timeout (should be < 5 minutes)
    const result = await handle.result();

    expect(result.success).toBe(false);
    expect(result.error).toContain('timeout');
  });
});
```

**Error Resolution:**
- **Crash detection fails:** Check health monitor, verify heartbeat intervals
- **Timeout not working:** Check workflow timeout configuration
- **No telemetry:** Verify event writing

**Success Criteria:**
- Crashes detected within 30 seconds
- Timeouts enforce correctly
- Compensation logic runs
- All errors logged

**Duration:** 30-40 minutes

**Script:** `scripts/autonomous-verify/phase6-agent-failures.ts`

---

### 6.2 Gate Blocking Scenarios

**Objective:** Verify gates correctly block progression.

**Test File:** `tests/error/gate-blocking.test.ts` (CREATE)

**Test Cases:**

**6.2.1 Low Quality Evidence**
```typescript
describe('Gate Blocking', () => {
  it('should block DEVELOPMENT → TESTING with quality < 70', async () => {
    const handle = await startWorkflow({ id: 'GATE-BLOCK-001' });

    await waitForStage(handle, Stage.DEVELOPMENT);

    // Send commit with low quality score
    await handle.signal(commitMadeSignal, {
      commitSha: 'abc123',
      qualityScore: 50 // Below threshold
    });
    await handle.signal(agentCompletedSignal, { success: true });

    // Wait and verify still at DEVELOPMENT
    await sleep(10000);
    const status = await handle.query(getStatusQuery);
    expect(status.stage).toBe(Stage.DEVELOPMENT);
    expect(status.blocked).toBe(true);
    expect(status.blockedReason).toContain('quality');
  });

  it('should block TESTING → REVIEW with failing tests', async () => {
    // Progress to TESTING
    // Send test results with failures
    // Verify stays at TESTING
  });
});
```

**Success Criteria:**
- All 4 gates tested
- Blocking works for low quality
- Clear blocked reasons
- Gates release when evidence improved

**Duration:** 30-40 minutes

**Script:** `scripts/autonomous-verify/phase6-gate-blocking.ts`

---

### 6.3 Database Failure Recovery

**Objective:** Test system resilience to database issues.

**Test File:** `tests/error/database-failures.test.ts` (CREATE)

**Test Cases:**

**6.3.1 Temporary Connection Loss**
```typescript
describe('Database Resilience', () => {
  it('should retry on connection loss', async () => {
    // Start workflow
    const handle = await startWorkflow({ id: 'DB-FAIL-001' });

    // Simulate connection loss (mock pg client)
    mockPgClient.connect.mockRejectedValueOnce(new Error('Connection lost'));

    // Trigger evidence store operation
    await handle.signal(commitMadeSignal, { /* ... */ });

    // Restore connection on next attempt
    mockPgClient.connect.mockResolvedValue(mockConnection);

    // Verify workflow continued (retry succeeded)
    const status = await handle.query(getStatusQuery);
    expect(status.error).toBeUndefined();
  });
});
```

**Success Criteria:**
- Retries work (up to 5 attempts)
- Workflows eventually succeed
- No data corruption

**Duration:** 20-30 minutes

**Script:** `scripts/autonomous-verify/phase6-database-failures.ts`

---

### Phase 6 Summary

**Error Scenarios Tested:** 10+
**Duration:** 1-2 hours
**Critical Validation:** System remains stable under failures

---

## Phase 7: Observability & Monitoring Verification (1 hour)

### 7.1 Prometheus Metrics Verification

**Objective:** Verify all metrics exposed and updating correctly.

**Test File:** `tests/observability/prometheus-metrics.test.ts` (CREATE)

**Test:**
```typescript
describe('Prometheus Metrics', () => {
  it('should expose 78+ metrics at /metrics endpoint', async () => {
    const response = await fetch('http://localhost:21009/metrics');
    const text = await response.text();

    // Parse Prometheus format
    const metrics = parsePrometheusText(text);

    // Verify metric count
    expect(Object.keys(metrics).length).toBeGreaterThanOrEqual(78);

    // Verify key metrics present
    expect(metrics).toHaveProperty('martha_workflows_started_total');
    expect(metrics).toHaveProperty('martha_workflows_completed_total');
    expect(metrics).toHaveProperty('martha_workflow_duration_seconds');
    expect(metrics).toHaveProperty('martha_http_request_duration_seconds');
    expect(metrics).toHaveProperty('martha_database_query_duration_seconds');
  });

  it('should update metrics in real-time', async () => {
    const before = await getMetric('martha_workflows_started_total');

    // Start a workflow
    await startWorkflow({ id: 'METRICS-TEST-001' });

    // Check metric updated
    const after = await getMetric('martha_workflows_started_total');
    expect(after).toBe(before + 1);
  });
});
```

**Success Criteria:**
- 78+ metrics present
- Metrics update in real-time
- Prometheus format valid

**Duration:** 15-20 minutes

---

### 7.2 Telemetry Event Coverage

**Objective:** Verify all event types are being written.

**Test File:** `tests/observability/telemetry-coverage.test.ts` (CREATE)

**Test:**
```typescript
describe('Telemetry Coverage', () => {
  it('should write all expected event types', async () => {
    // Run a complete workflow
    const handle = await startWorkflow({ id: 'TELEMETRY-001' });
    await handle.result();

    // Query all events for this workflow
    const events = await query(`
      SELECT DISTINCT event_type
      FROM telemetry_events
      WHERE workflow_id = $1
    `, [handle.workflowId]);

    const eventTypes = new Set(events.rows.map(r => r.event_type));

    // Verify expected events
    const expected = [
      'workflow_started',
      'stage_transitioned',
      'activity_started',
      'activity_completed',
      'signal_received',
      'gate_check_passed',
      'workflow_completed'
    ];

    for (const type of expected) {
      expect(eventTypes).toContain(type);
    }
  });
});
```

**Success Criteria:**
- All 7+ event types recorded
- Events have correct structure
- Timestamps accurate

**Duration:** 15-20 minutes

---

### 7.3 Health Endpoint Validation

**Test File:** `tests/observability/health-endpoints.test.ts` (CREATE)

**Tests:**
```typescript
describe('Health Endpoints', () => {
  it('GET /health should return service status', async () => {
    const response = await fetch('http://localhost:21009/health');
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.status).toBe('healthy');
    expect(body.uptime).toBeDefined();
  });

  it('GET /health/ready should verify dependencies', async () => {
    const response = await fetch('http://localhost:21009/health/ready');
    const body = await response.json();

    expect(body.database).toBe('connected');
    expect(body.temporal).toBe('connected');
  });
});
```

**Success Criteria:**
- Health endpoints respond < 100ms
- Accurate status reporting

**Duration:** 10-15 minutes

---

### Phase 7 Summary

**Duration:** 1 hour
**Metrics Verified:** 78+
**Event Types Verified:** 7+

---

## Phase 8: Reporting & Cleanup (30-45 minutes)

### 8.1 Generate Comprehensive Test Report

**Script:** `scripts/autonomous-verify/generate-report.ts`

**Report Sections:**

1. **Executive Summary**
   - Total test count
   - Pass/fail breakdown
   - Coverage percentages
   - Total duration

2. **Phase Results**
   - Results per phase
   - Success criteria met/unmet
   - Issues found and resolved

3. **Test Coverage**
   - Lines/branches/functions covered
   - Uncovered areas

4. **Performance Metrics**
   - Workflow execution times
   - Signal latency
   - Database query times
   - API response times

5. **Evidence Verification**
   - Total evidence entries created
   - Validation pass rate
   - Quality score distribution

6. **Error Resolution Log**
   - Errors encountered
   - Resolution attempts
   - Final status

7. **Recommendations**
   - Areas needing improvement
   - Performance optimizations
   - Additional test coverage needed

**Output Formats:**
- HTML: `reports/verification-report.html`
- JSON: `reports/verification-report.json`
- Markdown: `VERIFICATION_SUMMARY.md`

**Duration:** 20-30 minutes

---

### 8.2 Cleanup Test Data

**Script:** `scripts/autonomous-verify/cleanup.ts`

**Actions:**
```sql
-- Delete test evidence
DELETE FROM evidence_events
WHERE issue_id LIKE 'TEST-AUTO-%'
  OR issue_id LIKE 'TEST-LOAD-%'
  OR issue_id LIKE 'ERROR-%'
  OR issue_id LIKE 'GATE-BLOCK-%'
  OR issue_id LIKE 'DB-FAIL-%'
  OR issue_id LIKE 'METRICS-TEST-%'
  OR issue_id LIKE 'TELEMETRY-%';

-- Delete test telemetry
DELETE FROM telemetry_events
WHERE workflow_id LIKE 'verify-%'
  OR workflow_id LIKE 'load-%'
  OR workflow_id LIKE 'batch-TEST-%';

-- Verify cleanup
SELECT COUNT(*) FROM evidence_events WHERE issue_id LIKE 'TEST-%';
SELECT COUNT(*) FROM telemetry_events WHERE workflow_id LIKE 'verify-%';
```

**Duration:** 5-10 minutes

---

### 8.3 Archive Artifacts

**Structure:**
```
artifacts/verification-${timestamp}/
├── logs/
│   ├── phase1-preflight.log
│   ├── phase1-database.log
│   ├── phase2-unit-tests.json
│   ├── phase3-integration.json
│   ├── phase4-e2e-*.log
│   ├── phase5-load-test.json
│   ├── phase6-error-scenarios.log
│   └── phase7-observability.log
├── coverage/
│   ├── lcov.info
│   ├── lcov-report/
│   └── coverage-summary.json
├── evidence/
│   ├── evidence-timeline-*.json
│   └── evidence-summary.json
├── telemetry/
│   ├── events-*.json
│   └── metrics-snapshot.txt
├── reports/
│   ├── verification-report.html
│   ├── verification-report.json
│   └── VERIFICATION_SUMMARY.md
└── workflows/
    ├── workflow-histories.json
    └── workflow-metrics.json
```

**Duration:** 5-10 minutes

---

## Error Resolution Framework

### Automated Resolution Strategies

**1. Database Errors**
```typescript
class DatabaseErrorResolver implements ErrorResolver {
  async detect(): Promise<Error[]> {
    // Check connection, schema, migrations
  }

  async diagnose(error: Error): Promise<Diagnosis> {
    if (error.message.includes('relation does not exist')) {
      return { cause: 'missing_table', solution: 'run_migration' };
    }
    if (error.message.includes('connection refused')) {
      return { cause: 'db_down', solution: 'start_service' };
    }
    // ... more patterns
  }

  async resolve(diagnosis: Diagnosis): Promise<Resolution> {
    switch (diagnosis.solution) {
      case 'run_migration':
        await exec('tsx scripts/migrate.ts');
        break;
      case 'start_service':
        await exec('docker start timescaledb');
        break;
      // ... more solutions
    }
  }

  async verify(resolution: Resolution): Promise<boolean> {
    // Re-test database connectivity
    return await checkDatabaseHealth();
  }
}
```

**2. Temporal Errors**
```typescript
class TemporalErrorResolver implements ErrorResolver {
  async diagnose(error: Error): Promise<Diagnosis> {
    if (error.message.includes('invalid API key')) {
      return { cause: 'expired_key', solution: 'update_env' };
    }
    if (error.message.includes('namespace not found')) {
      return { cause: 'wrong_namespace', solution: 'check_config' };
    }
  }

  async resolve(diagnosis: Diagnosis): Promise<Resolution> {
    switch (diagnosis.solution) {
      case 'update_env':
        console.log('❌ Temporal API key expired. Please update TEMPORAL_API_KEY in .env.local');
        console.log('Get new key from: https://cloud.temporal.io/settings/api-keys');
        process.exit(1);
        break;
      case 'check_config':
        const config = await readEnvFile();
        console.log(`Current namespace: ${config.TEMPORAL_NAMESPACE}`);
        console.log('Expected: martha-dev-v4.mnjo7');
        break;
    }
  }
}
```

**3. Agent Errors**
```typescript
class AgentErrorResolver implements ErrorResolver {
  async diagnose(error: Error): Promise<Diagnosis> {
    if (error.message.includes('claude: command not found')) {
      return { cause: 'cli_not_installed', solution: 'install_claude' };
    }
    if (error.message.includes('permission denied')) {
      return { cause: 'permissions', solution: 'fix_permissions' };
    }
  }

  async resolve(diagnosis: Diagnosis): Promise<Resolution> {
    switch (diagnosis.solution) {
      case 'install_claude':
        console.log('❌ Claude CLI not found');
        console.log('Install from: https://docs.anthropic.com/claude/docs/claude-cli');
        process.exit(1);
        break;
      case 'fix_permissions':
        await exec('chmod +x $(which claude)');
        break;
    }
  }
}
```

**4. Test Failures**
```typescript
class TestErrorResolver implements ErrorResolver {
  async diagnose(error: Error): Promise<Diagnosis> {
    // Parse Jest error output
    const match = error.message.match(/Expected: (\d+), Received: (\d+)/);
    if (match) {
      return {
        cause: 'assertion_failed',
        solution: 'review_logic',
        details: { expected: match[1], received: match[2] }
      };
    }
  }

  async resolve(diagnosis: Diagnosis): Promise<Resolution> {
    // Log details for manual review
    console.log('⚠️  Test assertion failed:');
    console.log(`Expected: ${diagnosis.details.expected}`);
    console.log(`Received: ${diagnosis.details.received}`);
    console.log('This requires manual investigation.');

    // Attempt to provide context
    const relatedCode = await findRelatedCode(diagnosis);
    console.log(`Related code: ${relatedCode}`);

    return { status: 'manual_review_required' };
  }
}
```

### Error Resolution Workflow

```typescript
async function executePhaseWithErrorResolution(phase: Phase): Promise<PhaseResult> {
  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    try {
      // Execute phase
      const result = await phase.execute();

      if (result.success) {
        return result;
      }

      // Phase failed, attempt resolution
      const errors = result.errors;
      const resolvers = [
        new DatabaseErrorResolver(),
        new TemporalErrorResolver(),
        new AgentErrorResolver(),
        new TestErrorResolver()
      ];

      let resolvedCount = 0;

      for (const error of errors) {
        for (const resolver of resolvers) {
          const diagnosis = await resolver.diagnose(error);

          if (diagnosis) {
            console.log(`🔧 Attempting to resolve: ${diagnosis.cause}`);
            const resolution = await resolver.resolve(diagnosis);
            const verified = await resolver.verify(resolution);

            if (verified) {
              console.log(`✅ Resolved: ${diagnosis.cause}`);
              resolvedCount++;
              break;
            }
          }
        }
      }

      if (resolvedCount === errors.length) {
        console.log(`✅ All ${resolvedCount} errors resolved, retrying phase...`);
        attempts++;
        continue;
      } else {
        console.log(`❌ Unable to resolve ${errors.length - resolvedCount} errors`);
        return result; // Return with failures
      }

    } catch (error) {
      console.error(`❌ Phase execution failed: ${error.message}`);
      attempts++;

      if (attempts >= maxAttempts) {
        return {
          success: false,
          errors: [error],
          message: `Failed after ${maxAttempts} attempts`
        };
      }
    }
  }
}
```

---

## Execution Plan

### Master Orchestration Script

**Script:** `scripts/autonomous-verify/run-all.ts`

```typescript
async function runAutonomousVerification() {
  console.log('🚀 Starting Martha.dev v4 Autonomous Verification');
  console.log('================================================');

  const startTime = Date.now();
  const results: PhaseResult[] = [];

  // Phase 1: Infrastructure
  console.log('\n📋 PHASE 1: Infrastructure Validation');
  results.push(await executePhaseWithErrorResolution({
    name: 'Phase 1',
    execute: async () => {
      await runPhase1Preflight();
      await runPhase1Database();
      await runPhase1Components();
      return { success: true };
    }
  }));

  if (!results[0].success) {
    console.error('❌ Phase 1 failed. Cannot continue.');
    await generateFailureReport(results);
    process.exit(1);
  }

  // Phase 2: Unit Testing
  console.log('\n🧪 PHASE 2: Unit Testing');
  results.push(await executePhaseWithErrorResolution({
    name: 'Phase 2',
    execute: async () => {
      await runPhase2EvidenceStoreTests();
      await runPhase2ValidatorTests();
      await runPhase2GatesTests();
      await runPhase2SpawnerTests();
      await runPhase2SignalRoutesTests();
      return { success: true };
    }
  }));

  // Continue for all phases...

  // Phase 8: Reporting
  console.log('\n📊 PHASE 8: Reporting & Cleanup');
  await generateComprehensiveReport(results);
  await cleanupTestData();
  await archiveArtifacts();

  const duration = Date.now() - startTime;
  console.log('\n================================================');
  console.log('✅ Autonomous Verification Complete!');
  console.log(`Total Duration: ${formatDuration(duration)}`);
  console.log(`View report: reports/verification-report.html`);
}

runAutonomousVerification().catch(error => {
  console.error('❌ Autonomous verification failed:', error);
  process.exit(1);
});
```

---

## Success Criteria Summary

**System Passes Verification When:**

1. ✅ **Infrastructure (Phase 1)**
   - All services healthy
   - Database schema valid (9/9 tests pass)
   - All 8 components verified

2. ✅ **Unit Tests (Phase 2)**
   - 104+ tests pass
   - Coverage > 80%
   - All components tested

3. ✅ **Integration Tests (Phase 3)**
   - 30+ tests pass
   - Workflows integrate with evidence tracking
   - API endpoints work

4. ✅ **End-to-End (Phase 4)**
   - Real agents complete tasks
   - All 7 stages execute
   - Evidence properly tracked
   - Batch dependencies enforced

5. ✅ **Load Tests (Phase 5)**
   - 90%+ success rate under load
   - Performance within thresholds
   - No resource exhaustion

6. ✅ **Error Handling (Phase 6)**
   - Failures detected and handled
   - Recovery mechanisms work
   - System remains stable

7. ✅ **Observability (Phase 7)**
   - 78+ metrics exposed
   - All event types recorded
   - Health checks accurate

8. ✅ **Overall**
   - No critical failures
   - Test data cleanup complete
   - Comprehensive report generated

---

## Appendices

### A. Environment Variables Checklist

```bash
# Required for verification
✅ DATABASE_URL
✅ TEMPORAL_ADDRESS
✅ TEMPORAL_NAMESPACE
✅ TEMPORAL_API_KEY
✅ TEMPORAL_TASK_QUEUE
✅ REDIS_URL
✅ SERVICE_PORT
✅ LOG_LEVEL

# Optional but recommended
⬜ GITHUB_TOKEN (for real git operations)
⬜ SLACK_WEBHOOK_URL (for alerts)
```

### B. Service Startup Commands

```bash
# TimescaleDB
docker start timescaledb-martha-ts

# Redis
redis-server --port 20001

# Temporal Worker
npm run worker

# Fastify API
npm run dev

# Verification Suite
tsx scripts/autonomous-verify/run-all.ts
```

### C. Cleanup Commands

```bash
# Remove test data
tsx scripts/autonomous-verify/cleanup.ts

# Remove test workflows from Temporal
# (use Temporal UI to filter by workflow ID prefix "verify-")

# Clear logs
rm -rf logs/phase*.log
```

### D. Troubleshooting Guide

**Issue: Tests timeout**
```bash
# Increase Jest timeout
# Edit jest.config.js: testTimeout: 30000
```

**Issue: Database connection errors**
```bash
# Check TimescaleDB running
docker ps | grep timescale

# Check connection
psql postgresql://localhost:21006/martha_ts
```

**Issue: Temporal connection errors**
```bash
# Verify API key
echo $TEMPORAL_API_KEY

# Test connection
npm run temporal:client
```

**Issue: Agent spawn fails**
```bash
# Check Claude CLI
which claude
claude --version

# Test context building
tsx scripts/test-agent-context.ts
```

---

## Conclusion

This autonomous verification plan provides a comprehensive, multi-hour strategy to validate the entire Martha.dev v4 orchestration system. With intelligent error resolution, real agent testing, and thorough coverage across all components, this plan ensures the system is production-ready.

**Estimated Timeline:**
- Phase 1: 45-60 min
- Phase 2: 2-3 hours
- Phase 3: 2-3 hours
- Phase 4: 3-4 hours
- Phase 5: 2-3 hours
- Phase 6: 1-2 hours
- Phase 7: 1 hour
- Phase 8: 30-45 min

**Total: 12-17 hours of autonomous execution**

Execute with:
```bash
tsx scripts/autonomous-verify/run-all.ts
```
