# Remaining Implementation Tasks - Evidence & Events Enhancement

## Context
Phase 1 (Event Instrumentation) is COMPLETE with 85-90% event coverage.
Phase 2 (Agent Context Handoff) is 60% COMPLETE with types and spawner service created.

**Branch**: `feature/evidence-events-enhancement`
**Repo**: `/mnt/data/martha.dev-v4-orchestration`

## Phase 2 Remaining Tasks (40%)

### Task 2.3: Enhance spawnAgent Activity
**File**: `src/activities/issue-activities.ts`
**Current State**: Lines 439-584 only create git branch
**Required Changes**:

1. Import new dependencies:
```typescript
import { AgentContextBuilder, determineIssueType, extractAcceptanceCriteria } from '../types/agent-context.js';
import { claudeAgentSpawner } from '../services/ClaudeAgentSpawner.js';
```

2. Build full AgentContext in spawnAgent function:
   - Use existing `findIssue()` to get issue data
   - Create AgentContextBuilder instance
   - Build complete context with all required fields:
     - agentId (use uuidv4())
     - workflowId (from Context.current())
     - issue (extract from issue JSON file)
     - worktree (from findIssue result)
     - git (branch, baseBranch, repoPath)
     - github (owner, repo from env vars)
     - work (taskType, relatedFiles, testRequirements, exitCriteria)
     - signals (API endpoints from env or config)
     - metadata (createdAt, spawnedBy, contextVersion, workDirectory)

3. Call ClaudeAgentSpawner:
```typescript
const spawnResult = await claudeAgentSpawner.spawnAgent(context);
```

4. Update return type to include:
```typescript
return {
  agentId: spawnResult.agentId,
  processId: spawnResult.processId,
  contextPath: spawnResult.contextPath,
  branch: input.branch,
};
```

5. Add telemetry event for agent spawn

**Acceptance Criteria**:
- [ ] spawnAgent builds complete AgentContext
- [ ] Context written to /.martha/work/{agentId}/context.json
- [ ] Claude CLI process spawned
- [ ] Returns agentId, processId, contextPath
- [ ] Telemetry event emitted

---

### Task 2.4: Create Workflow Signal API Endpoints
**File**: `src/server/routes/workflow-signals.ts` (NEW)
**Purpose**: Provide HTTP endpoints for agents to signal workflows

**Implementation**:

1. Create new route file with Fastify endpoints:
```typescript
import { FastifyInstance } from 'fastify';
import { signalWorkflow } from '../../temporal/client.js';
import { createLogger } from '../../utils/logger.js';
import { telemetryWriter } from '../../services/TelemetryWriter.js';

export async function registerWorkflowSignalRoutes(fastify: FastifyInstance) {
  // Generic signal endpoint
  fastify.post('/api/v1/workflows/:workflowId/signals/:signalName', ...);

  // Specific endpoints
  fastify.post('/api/v1/workflows/:workflowId/signals/agent-started', ...);
  fastify.post('/api/v1/workflows/:workflowId/signals/commit-made', ...);
  fastify.post('/api/v1/workflows/:workflowId/signals/agent-completed', ...);
  fastify.post('/api/v1/workflows/:workflowId/signals/test-results', ...);
  fastify.post('/api/v1/workflows/:workflowId/signals/block', ...);
}
```

2. Each endpoint should:
   - Validate payload schema
   - Write telemetry event
   - Forward to Temporal workflow via signalWorkflow()
   - Queue signal if workflow unreachable (store in Redis)
   - Return success/error response

3. Register in main server file:
```typescript
// In src/server/fastify.ts
import { registerWorkflowSignalRoutes } from './routes/workflow-signals.js';
await registerWorkflowSignalRoutes(fastify);
```

**Acceptance Criteria**:
- [ ] Generic signal endpoint handles any signal type
- [ ] 5 specific endpoints created
- [ ] Telemetry written for each signal received
- [ ] Signals forwarded to Temporal workflows
- [ ] Error handling for unreachable workflows
- [ ] Endpoints registered in server

---

### Task 2.5: Create AgentHealthMonitor Service
**File**: `src/services/AgentHealthMonitor.ts` (NEW)
**Purpose**: Monitor agent process health and trigger recovery

**Implementation**:

1. Create AgentHealthMonitor class:
```typescript
export class AgentHealthMonitor {
  private monitoringIntervals: Map<string, NodeJS.Timeout>;

  startMonitoring(agentId: string, processId: number, workflowId: string): void;
  stopMonitoring(agentId: string): void;
  private checkAgentAlive(agentId: string, processId: number): Promise<boolean>;
  private handleAgentCrash(agentId: string, workflowId: string): Promise<void>;
}
```

2. Health check logic:
   - Use `ps` command or process.kill(0) to check if process exists
   - Check every 30 seconds
   - If process not found, trigger crash handler

3. Crash handler:
   - Write telemetry event (agent_crashed)
   - Send block signal to workflow
   - Cleanup monitoring interval
   - Log detailed crash info

4. Integration points:
   - Call `startMonitoring()` after spawnAgent succeeds
   - Call `stopMonitoring()` when agent completes
   - Handle cleanup on service shutdown

**Acceptance Criteria**:
- [ ] Monitors agent processes every 30 seconds
- [ ] Detects process crashes
- [ ] Sends block signal on crash
- [ ] Cleans up monitoring on completion
- [ ] Logs health check results

---

## Phase 3: Evidence Tracking

### Task 3.1: Create Evidence Database Migration
**File**: `migrations/007_evidence_tracking.sql` (NEW)

**Implementation**:
```sql
CREATE TABLE evidence_events (
    id                  BIGSERIAL,
    event_id            UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    issue_id            VARCHAR(50) NOT NULL,
    stage               VARCHAR(50) NOT NULL,
    evidence_type       VARCHAR(50) NOT NULL,
    timestamp           TIMESTAMPTZ NOT NULL,
    evidence_data       JSONB NOT NULL,
    quality_score       INTEGER CHECK (quality_score BETWEEN 0 AND 100),
    validation_status   VARCHAR(20),
    validation_errors   TEXT[],
    PRIMARY KEY (id, timestamp)
);

SELECT create_hypertable('evidence_events', 'timestamp', chunk_time_interval => INTERVAL '1 day');

CREATE INDEX idx_evidence_issue ON evidence_events (issue_id, timestamp DESC);
CREATE INDEX idx_evidence_stage ON evidence_events (stage, timestamp DESC);
CREATE INDEX idx_evidence_data ON evidence_events USING gin(evidence_data jsonb_path_ops);
```

**Acceptance Criteria**:
- [ ] Evidence events hypertable created
- [ ] Indexes created
- [ ] Migration tested

---

### Task 3.2: Define Evidence Type Interfaces
**File**: `tracker/types/evidence.ts` (NEW in martha-workflow repo)
**Location**: `/mnt/data/martha-workflow/tracker/types/evidence.ts`

**Implementation**:
Define TypeScript interfaces for:
- `BaseEvidence`
- `DevelopmentEvidence` (commits, code stats, git metadata)
- `TestingEvidence` (test suites, coverage, quality checks)
- `ReviewEvidence` (reviews, comments, approval status)
- `MergeEvidence` (merge SHA, conflicts, final commit count)
- `ValidationSummary`

**Acceptance Criteria**:
- [ ] All evidence types defined
- [ ] Validation rules included
- [ ] Export all types

---

### Task 3.3: Create EvidenceStore Service
**File**: `src/evidence/evidence-store.ts` (NEW)

**Implementation**:
```typescript
export class EvidenceStore {
  async storeEvidence(evidence: BaseEvidence): Promise<number>;
  async getLatestEvidence(issueId: string, stage: string): Promise<BaseEvidence | null>;
  async getEvidenceTimeline(issueId: string): Promise<BaseEvidence[]>;
  async queryEvidence(filters: EvidenceQueryFilters): Promise<BaseEvidence[]>;
}
```

Uses TimescaleDB to store and retrieve evidence.

**Acceptance Criteria**:
- [ ] Store evidence with quality scores
- [ ] Retrieve latest evidence by stage
- [ ] Query evidence timeline
- [ ] Support filtering

---

### Task 3.4: Create EvidenceValidator
**File**: `src/validation/evidence-validator.ts` (NEW)

**Implementation**:
```typescript
export class EvidenceValidator {
  async validateEvidence(evidence: BaseEvidence): Promise<ValidationSummary>;
  private getRulesForStage(stage: string): ValidationRule[];
  private calculateWeightedScore(results: RuleResult[], rules: ValidationRule[]): number;
}
```

Validation rules for each stage:
- **DEVELOPMENT**: has_commits, code_stats_present, file_changes_tracked
- **TESTING**: has_test_results, all_tests_passed, braintrust_traces_for_llm
- **REVIEW**: has_reviews, all_reviews_approved
- **MERGE**: merge_sha_present, conflicts_resolved

**Acceptance Criteria**:
- [ ] Validates evidence against rules
- [ ] Calculates quality scores
- [ ] Returns validation errors
- [ ] Weighted scoring

---

### Task 3.5: Create StageGate Implementation
**File**: `src/workflows/gates/stage-gates.ts` (NEW)

**Implementation**:
```typescript
export class StageGate {
  async canMoveToTesting(issueId: string): Promise<GateResult>;
  async canMoveToReview(issueId: string): Promise<GateResult>;
  async canMoveToMerge(issueId: string): Promise<GateResult>;
  async canMoveToCompletion(issueId: string): Promise<GateResult>;
}
```

Each gate checks:
1. Evidence exists for current stage
2. Evidence is valid (validation_status = 'valid')
3. Quality score meets threshold
4. All required rules passed

**Acceptance Criteria**:
- [ ] Gates for all stage transitions
- [ ] Returns allowed/blocked with reason
- [ ] Lists missing requirements
- [ ] Integrates with EvidenceValidator

---

## Phase 4: Test Automation & Code Tracking

### Task 4.1: Create Enhanced test-activities.ts
**File**: `src/activities/test-activities.ts` (NEW)

**Implementation**:
Integrate with test-parser.sh and test-executor.sh from martha-workflow:
1. Generate test plan from issue body
2. Validate Braintrust config if LLM tests
3. Execute each test scenario
4. Run code quality checks
5. Generate coverage report
6. Build TestingEvidence
7. Validate and store evidence

**Acceptance Criteria**:
- [ ] Integrates test-parser.sh
- [ ] Executes test scenarios
- [ ] Captures detailed results
- [ ] Generates quality score
- [ ] Stores evidence

---

### Task 4.2: Create development-activities.ts
**File**: `src/activities/development-activities.ts` (NEW)

**Implementation**:
```typescript
export async function captureDevelopmentEvidence(params: {
  issueId: string;
  branch: string;
  baseBranch: string;
  worktreePath: string;
}): Promise<DevelopmentEvidence>
```

Uses simple-git to:
1. Get all commits on branch
2. Get diff for each commit
3. Track file changes (additions, deletions)
4. Calculate code stats
5. Build DevelopmentEvidence
6. Validate and store

**Acceptance Criteria**:
- [ ] Captures all commits
- [ ] Tracks file changes
- [ ] Calculates code stats
- [ ] Stores evidence

---

### Task 4.3: Create FailureAnalyzer
**File**: `src/diagnostics/failure-analyzer.ts` (NEW)

**Implementation**:
```typescript
export class FailureAnalyzer {
  analyzeTestFailure(testResult: TestResult): FailureDiagnostic;
  private categorizeFailure(testResult: TestResult): FailureCategory;
  private inferRootCause(testResult: TestResult): string;
  private suggestRemediation(testResult: TestResult): RemediationStep[];
}
```

Categories: api_unavailable, api_endpoint_missing, braintrust_config_error, assertion_mismatch, test_logic_error

**Acceptance Criteria**:
- [ ] Categorizes failures
- [ ] Infers root cause
- [ ] Suggests remediation
- [ ] Determines if retry recommended

---

### Task 4.4: Integrate Validation Gates
**File**: `src/workflows/IssueLifecycleWorkflow.ts` (MODIFY)

**Implementation**:
Add stage gates before each transition:
```typescript
// Before transitioning to TESTING
const gateResult = await stageGate.canMoveToTesting(state.issueId);
if (!gateResult.allowed) {
  await setBlockSignal({ reason: gateResult.reason });
  return; // Don't proceed
}
```

Add for transitions:
- Development → Testing
- Testing → Review
- Review → Merge
- Merge → Completion

**Acceptance Criteria**:
- [ ] Gates before all transitions
- [ ] Block workflow if gate fails
- [ ] Log gate results
- [ ] Clear error messages

---

## Execution Instructions for Claude Flow

1. **Setup**: Ensure you're in `/mnt/data/martha.dev-v4-orchestration` on branch `feature/evidence-events-enhancement`

2. **Execution Order**: Complete tasks in numerical order (2.3 → 2.4 → 2.5 → 3.1 → ... → 4.4)

3. **Testing**: After each task, run basic validation:
   - TypeScript compilation: `npm run build`
   - Type checking: `npm run type-check` (if available)
   - Unit tests: `npm test` (for specific files)

4. **Commits**: Create a commit after each phase completes:
   - Phase 2 complete: "feat: Complete Phase 2 - Agent Context Handoff"
   - Phase 3 complete: "feat: Complete Phase 3 - Evidence Tracking"
   - Phase 4 complete: "feat: Complete Phase 4 - Test Automation"

5. **Dependencies**: Install if needed:
   - simple-git (for development-activities.ts)
   - Any other missing packages

6. **Cross-Repo Work**: Task 3.2 requires creating a file in `/mnt/data/martha-workflow` repo

7. **Environment Variables**: Check if any new env vars are needed for:
   - API URL for signal endpoints
   - GitHub owner/repo
   - Claude CLI path (currently hardcoded)

8. **Final Integration**: After all tasks complete, run end-to-end test with a sample issue

---

## Success Criteria

**Phase 2 Complete**:
- [ ] Agent context fully integrated
- [ ] Agents can be spawned with context
- [ ] Signal endpoints functional
- [ ] Health monitoring active

**Phase 3 Complete**:
- [ ] Evidence database created
- [ ] Evidence can be stored and retrieved
- [ ] Validation rules working
- [ ] Stage gates enforce evidence requirements

**Phase 4 Complete**:
- [ ] Test automation integrated
- [ ] Code tracking captures commits
- [ ] Failure analysis provides insights
- [ ] Full workflow with gates functional

**Overall Success**:
- [ ] 95%+ event coverage achieved
- [ ] Complete evidence trail for any issue
- [ ] Timeline reconstruction works
- [ ] Validation gates prevent progression without proof

---

## Notes

- Refer to IMPLEMENTATION_PROGRESS.md for current state
- Original plan document has full architectural details
- Test with TASK-3.3.1 or similar issue
- Monitor telemetry_events table for event coverage
- Check evidence_events table for evidence quality

---

**Ready for Claude Flow Execution**
