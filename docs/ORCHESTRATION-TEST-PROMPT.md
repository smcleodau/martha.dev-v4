# Orchestration Repository - Calculator Epic Testing Session

## Context

You are working on the **Martha Orchestration System** (separate from the tracker repo). Your job is to implement and test workflow orchestration using the **Calculator Epic** that has been prepared in the tracker.

## What Has Been Prepared for You

### Test Data in Tracker (martha.dev-v4 repo)

A complete calculator epic has been created with realistic test data:

**Location**: `calculator-app` worktree, `calculator-development` board

**Epic Structure**:
- **MTH-001**: Calculator Application (Epic, 25 story points total)
  - **MTH-002**: Implement basic arithmetic operations (Story, 5 SP, status: `todo`)
  - **MTH-003**: Build calculator UI components (Story, 8 SP, status: `todo`)
  - **MTH-004**: Add memory functions (Story, 3 SP, status: `backlog`)
  - **MTH-005**: Write unit tests for arithmetic logic (Task, 3 SP, status: `todo`)
  - **MTH-006**: Create E2E tests for user interactions (Task, 5 SP, status: `backlog`)
  - **MTH-007**: Handle division by zero gracefully (Bug, 1 SP, status: `backlog`)

**Dependencies**:
- MTH-005 (unit tests) **blocked by** MTH-002 (arithmetic logic)
- MTH-006 (E2E tests) **blocked by** MTH-003 (UI components)
- MTH-004 (memory functions) **blocked by** MTH-002 (arithmetic logic)
- MTH-007 (division bug) **related to** MTH-002 (arithmetic logic)

**Release**:
- **REL-B1YV90**: Calculator v1.0
- Target date: 14 days from creation
- All 6 issues assigned to release
- 4 quality gates (all pending):
  - Security Review (required)
  - Testing Complete (required)
  - Documentation Updated (required)
  - Code Review (required)

### Tracker API Available

**Base URL**: `http://localhost:20000/api/tracker`

**Key Endpoints**:
- `GET /worktrees/{worktreeId}/boards/{boardId}/issues` - List all issues
- `GET /worktrees/{worktreeId}/boards/{boardId}/issues/{issueId}` - Get issue details
- `PATCH /worktrees/{worktreeId}/boards/{boardId}/issues/{issueId}` - Update issue (status, assignee, etc.)
- `GET /worktrees/{worktreeId}/releases/{releaseId}` - Get release details
- `PATCH /worktrees/{worktreeId}/releases/{releaseId}/gates/{gateId}` - Update quality gate
- `GET /worktrees/{worktreeId}/releases/{releaseId}/stats` - Get release statistics

**Full API Documentation**: See `docs/api/TRACKER-API-REFERENCE.md` in martha.dev-v4 repo

---

## Your Mission

Implement and test the orchestration workflows using the calculator epic as your test case. Focus on **end-to-end automation** with evidence collection.

### Priority 1: Basic Workflow Execution (Week 1)

#### 1.1 Implement Issue Lifecycle Workflow

Create a Temporal workflow that:
1. Takes an issue ID as input (e.g., `MTH-002`)
2. Checks dependencies via tracker API
3. Waits if blocked (polls blocker status every 5 minutes, 24h timeout)
4. Updates issue status to `in-progress` when ready
5. Executes simulated development (for testing, just wait 30 seconds)
6. Updates issue status to `done`
7. Returns success/failure

**Test with**: MTH-002 (has no blockers, should execute immediately)

**Verification**:
- Check Temporal UI shows workflow execution
- Verify MTH-002 status updated via tracker API
- Confirm no errors in logs

#### 1.2 Test Dependency Blocking

Create a workflow for MTH-005 (blocked by MTH-002):
1. Start workflow for MTH-005
2. Verify it waits because MTH-002 is not done
3. Manually update MTH-002 to `done` via tracker API
4. Verify MTH-005 workflow detects this and proceeds

**Verification**:
- Temporal UI shows MTH-005 workflow in "waiting" state
- After MTH-002 done, MTH-005 proceeds automatically
- Issue status transitions tracked in tracker

#### 1.3 Implement Epic Orchestration Workflow

Create a workflow that processes the entire epic:
1. Fetches all child issues from epic MTH-001
2. Topologically sorts by dependencies
3. Spawns child workflows for each issue in order
4. Waits for all to complete
5. Marks epic as done

**Test with**: MTH-001 (full calculator epic)

**Expected execution order**:
1. MTH-002, MTH-003, MTH-007 (parallel - no blockers)
2. MTH-004, MTH-005 (after MTH-002)
3. MTH-006 (after MTH-003)

**Verification**:
- All 6 issues complete in correct order
- Epic MTH-001 marked done
- Temporal UI shows parent workflow with 6 child workflows

---

### Priority 2: Evidence Collection (Week 1-2)

#### 2.1 Braintrust Integration

**Goal**: Collect LLM traces during "development"

**Implementation**:
1. Install Braintrust SDK (`npm install braintrust autoevals`)
2. When simulating development work, log fake LLM interactions:
   ```typescript
   await braintrust.log({
     project: 'martha-calculator',
     experiment: `issue-${issueId}`,
     input: 'Implement arithmetic operations',
     output: 'Created add/subtract/multiply/divide functions',
     model: 'claude-3-opus',
     metadata: { issue_id: issueId, timestamp: new Date() }
   });
   ```
3. Store Braintrust dashboard URL in issue metadata
4. Create Temporal activity `collectBraintrustEvidence`

**Test with**: MTH-002

**Verification**:
- Braintrust dashboard shows traces for `issue-MTH-002`
- Tracker API shows evidence link in issue metadata
- Evidence URL accessible and valid

#### 2.2 Browserbase Integration

**Goal**: Record E2E test sessions

**Implementation**:
1. Install Browserbase SDK (`npm install @browserbasehq/sdk`)
2. Create Temporal activity `runE2ETestsWithRecording`:
   ```typescript
   const session = await browserbase.sessions.create({
     projectId: BROWSERBASE_PROJECT_ID,
     record: true
   });
   // Run Playwright tests using Browserbase session
   const recordingUrl = await browserbase.sessions.retrieve(session.id).recordingUrl;
   return { recordingUrl, sessionId: session.id };
   ```
3. Store recording URL in issue metadata

**Test with**: MTH-006 (E2E tests issue)

**Verification**:
- Browserbase session recorded
- Recording URL stored in tracker
- Video playback works

#### 2.3 Evidence Posting to Tracker

**Implementation**:
Create Temporal activity `postEvidenceToTracker`:
```typescript
await axios.patch(
  `${TRACKER_API}/worktrees/${worktreeId}/boards/${boardId}/issues/${issueId}`,
  {
    metadata: {
      evidence: {
        braintrust_url: braintrustDashboardUrl,
        browserbase_session: recordingUrl,
        test_report: testReportUrl,
        collected_at: new Date().toISOString()
      }
    }
  }
);
```

**Test with**: Any completed issue

**Verification**:
- Issue metadata contains evidence links
- All URLs accessible
- Evidence survives issue updates

---

### Priority 3: Test Orchestration (Week 2)

#### 3.1 Automated Test Execution

**Goal**: Trigger tests automatically when code issues complete

**Implementation**:
1. Create Temporal activity `runTests`:
   ```typescript
   async function runTests(params: {
     worktreeId: string;
     testType: 'unit' | 'e2e';
     recordSession?: boolean
   }) {
     // Execute tests (can be mocked for now)
     return {
       passed: 10,
       failed: 0,
       coverage: 85,
       reportUrl: 'file://...',
       sessionUrl: recordSession ? await createBrowserbaseSession() : null
     };
   }
   ```

2. Modify issue workflow to trigger tests after dev complete:
   - MTH-002 done → run unit tests → collect results
   - MTH-003 done → run E2E tests with Browserbase recording

**Test with**:
- MTH-002 → triggers unit tests
- MTH-003 → triggers E2E tests with recording

**Verification**:
- Test results stored in issue metadata
- Failed tests prevent issue from moving to `done`
- Test evidence collected automatically

#### 3.2 Quality Gate Automation

**Goal**: Update release gates based on test results

**Implementation**:
Create Temporal activity `updateQualityGate`:
```typescript
async function updateQualityGate(
  releaseId: string,
  gateId: 'security' | 'testing' | 'documentation' | 'code-review',
  status: 'passed' | 'failed',
  evidence: any
) {
  await axios.patch(
    `${TRACKER_API}/worktrees/${worktreeId}/releases/${releaseId}/gates/${gateId}`,
    { status, metadata: evidence }
  );
}
```

**Test with**: REL-B1YV90

**Auto-update gates based on**:
- **Testing gate**: Update to `passed` when all test issues (MTH-005, MTH-006) complete with passing results
- **Security gate**: Run mock security scan, update to `passed`
- **Documentation gate**: Check if documentation exists, update status
- **Code review gate**: Mark passed after manual approval or auto-approve for testing

**Verification**:
- Release stats API shows gates updating
- `ready_for_release` becomes `true` when all required gates pass
- Gate metadata contains evidence links

#### 3.3 Release Readiness Workflow

**Goal**: Orchestrate entire release validation

**Implementation**:
Create `ReleaseWorkflow`:
1. Get all issues in release REL-B1YV90
2. Execute issue workflows for each (parallel where possible)
3. Run tests and collect evidence
4. Update quality gates based on results
5. Check release readiness via stats API
6. If ready, mark release as `released`

**Test with**: REL-B1YV90 (Calculator v1.0)

**Verification**:
- All 6 issues complete
- All 4 gates pass
- Release marked as `released`
- Complete evidence trail exists

---

### Priority 4: Advanced Orchestration (Week 2-3)

#### 4.1 GitHub Integration (Optional)

**Goal**: Post updates to GitHub issues

**Implementation**:
- Create GitHub issues for epic and sub-issues
- Post evidence links as comments when collected
- Update issue status when workflow state changes

**Test with**: MTH-001 epic

#### 4.2 Temporal Cloud Monitoring

**Goal**: Verify all workflows visible in Temporal Cloud UI

**Access**:
- Namespace: `martha-dev-v4.mnjo7`
- Endpoint: `ap-northeast-1.aws.api.temporal.io:7233`

**Verification**:
- All workflows appear in Temporal UI
- Workflow history shows all state transitions
- Activity executions logged
- Errors captured with stack traces

#### 4.3 Error Handling & Retries

**Goal**: Handle failures gracefully

**Test scenarios**:
1. Tracker API unavailable → workflow retries
2. Test execution fails → issue reverts to `todo`, retry after delay
3. Dependency cycle detected → workflow fails with clear error
4. 24h timeout on blocked issue → workflow cancels, issue marked stalled

**Implementation**:
Add retry policies to activities:
```typescript
const activities = proxyActivities({
  startToCloseTimeout: '10 minutes',
  retry: {
    initialInterval: '1 second',
    maximumInterval: '1 minute',
    maximumAttempts: 3,
    backoffCoefficient: 2
  }
});
```

---

## Success Criteria

### Minimum Viable Product (MVP)

After Week 1, you should have:

- ✅ Temporal Cloud connected, worker running
- ✅ `IssueLifecycleWorkflow` executes for MTH-002
- ✅ Dependency blocking works (MTH-005 waits for MTH-002)
- ✅ `EpicDevelopmentWorkflow` completes entire calculator epic
- ✅ All 6 issues transition through statuses correctly
- ✅ Temporal UI shows complete workflow history

### Full Production Ready

After Week 2-3, you should have:

- ✅ Braintrust integration collecting LLM traces
- ✅ Browserbase integration recording E2E tests
- ✅ Evidence automatically posted to tracker
- ✅ Test orchestration triggering tests after dev complete
- ✅ Quality gates auto-updating based on test results
- ✅ Release workflow validating entire release readiness
- ✅ REL-B1YV90 marked as `released` with all evidence
- ✅ Error handling and retries working
- ✅ Zero manual interventions needed for calculator epic

---

## Testing Checklist

Use this checklist to verify each feature:

### Week 1: Basic Orchestration

- [ ] Temporal Cloud client connects successfully
- [ ] Worker process starts and registers workflows
- [ ] Issue workflow executes for MTH-002 (no blockers)
- [ ] Issue status updates from `todo` → `in-progress` → `done`
- [ ] Dependency check prevents MTH-005 from starting
- [ ] Updating MTH-002 to `done` unblocks MTH-005
- [ ] Epic workflow processes all 6 issues in correct order
- [ ] Epic MTH-001 marked as `done` after all children complete
- [ ] Temporal UI shows parent/child workflow relationships
- [ ] No errors in worker logs

### Week 2: Evidence & Testing

- [ ] Braintrust SDK installed and configured
- [ ] LLM traces collected during issue execution
- [ ] Braintrust dashboard URL stored in issue metadata
- [ ] Browserbase SDK installed and configured
- [ ] E2E test session recorded with Browserbase
- [ ] Recording URL stored in tracker
- [ ] Test execution activity runs mock tests
- [ ] Test results stored in issue metadata
- [ ] Failed tests prevent issue completion
- [ ] Quality gates update based on test results

### Week 3: Release & Production

- [ ] Release workflow orchestrates entire REL-B1YV90
- [ ] All 6 issues complete with evidence
- [ ] All 4 quality gates pass
- [ ] Release stats API shows `ready_for_release: true`
- [ ] Release marked as `released`
- [ ] Complete evidence trail exists for audit
- [ ] Retry logic handles transient failures
- [ ] Workflow timeouts work correctly
- [ ] Error messages clear and actionable

---

## File Structure

Organize your orchestration repo like this:

```
orchestration-repo/
├── .temporal/
│   ├── certs/
│   │   ├── client.pem          # Temporal Cloud cert
│   │   └── client.key          # Temporal Cloud key
│   └── config.yaml
├── src/
│   ├── temporal/
│   │   ├── client.ts           # Temporal Cloud client
│   │   ├── worker.ts           # Worker process
│   │   ├── workflows/
│   │   │   ├── issue-lifecycle.ts     # Single issue workflow
│   │   │   ├── epic-development.ts    # Epic workflow
│   │   │   ├── test-execution.ts      # Test orchestration
│   │   │   └── release.ts             # Release validation
│   │   └── activities/
│   │       ├── tracker.ts      # Tracker API calls
│   │       ├── tests.ts        # Test execution
│   │       ├── evidence.ts     # Evidence collection
│   │       └── github.ts       # GitHub integration
│   ├── integrations/
│   │   ├── braintrust/
│   │   │   └── client.ts       # Braintrust SDK wrapper
│   │   └── browserbase/
│   │       └── client.ts       # Browserbase SDK wrapper
│   ├── config/
│   │   └── index.ts            # Configuration
│   └── index.ts                # Main entry point
├── tests/
│   ├── workflows/              # Workflow tests
│   └── activities/             # Activity tests
├── package.json
├── tsconfig.json
└── .env
```

---

## Environment Variables

Create `.env` file:

```bash
# Temporal Cloud
TEMPORAL_NAMESPACE=martha-dev-v4.mnjo7
TEMPORAL_ENDPOINT=ap-northeast-1.aws.api.temporal.io:7233

# Tracker API
TRACKER_API_URL=http://localhost:20000/api/tracker

# Evidence Collection
BRAINTRUST_API_KEY=your-api-key-here
BROWSERBASE_API_KEY=your-api-key-here
BROWSERBASE_PROJECT_ID=your-project-id-here

# GitHub (optional)
GITHUB_TOKEN=your-github-pat
GITHUB_REPO=your-org/your-repo

# Test Configuration
TEST_WORKTREE_ID=calculator-app
TEST_BOARD_ID=calculator-development
TEST_EPIC_ID=MTH-001
TEST_RELEASE_ID=REL-B1YV90
```

---

## Quick Start Commands

```bash
# Install dependencies
npm install @temporalio/client @temporalio/worker @temporalio/workflow @temporalio/activity
npm install braintrust autoevals @browserbasehq/sdk axios

# Start worker
npm run temporal:worker

# Run test workflow (in separate terminal)
npm run test:issue-workflow -- --issue MTH-002

# Run epic workflow
npm run test:epic-workflow -- --epic MTH-001

# Monitor in Temporal UI
open https://cloud.temporal.io
# Navigate to namespace: martha-dev-v4.mnjo7
```

---

## Expected Output

When everything works, you should see:

**Temporal UI**:
- Workflow: `EpicDevelopmentWorkflow-MTH-001` (completed)
  - Child: `IssueLifecycleWorkflow-MTH-002` (completed)
  - Child: `IssueLifecycleWorkflow-MTH-003` (completed)
  - Child: `IssueLifecycleWorkflow-MTH-004` (completed)
  - Child: `IssueLifecycleWorkflow-MTH-005` (completed)
  - Child: `IssueLifecycleWorkflow-MTH-006` (completed)
  - Child: `IssueLifecycleWorkflow-MTH-007` (completed)

**Tracker API** (`GET /worktrees/calculator-app/boards/calculator-development/issues`):
- All 6 issues have `status: "done"`
- All issues have evidence metadata
- All issues assigned to REL-B1YV90

**Tracker API** (`GET /worktrees/calculator-app/releases/REL-B1YV90/stats`):
```json
{
  "total_issues": 6,
  "completed_issues": 6,
  "completion_percentage": 100,
  "gates_passed": 4,
  "required_gates_passed": 4,
  "ready_for_release": true
}
```

**Braintrust**: Dashboard shows traces for all issues

**Browserbase**: Recordings for E2E test issues

---

## Troubleshooting

### Temporal Connection Issues
- Verify certificates in `.temporal/certs/`
- Check namespace and endpoint in `.env`
- Test connection: `temporal workflow list --namespace martha-dev-v4.mnjo7`

### Tracker API Errors
- Verify tracker service running: `curl http://localhost:20000/health`
- Check issue IDs are correct: `GET /worktrees/calculator-app/boards/calculator-development/issues`
- Enable debug logging in activities

### Evidence Collection Fails
- Verify Braintrust API key is valid
- Check Browserbase project ID is correct
- Test SDK connections independently before integrating

### Workflow Stuck
- Check Temporal UI for errors/stack traces
- Verify worker is running and connected
- Check for blocked dependencies in tracker
- Review activity retry policies

---

## Next Steps After Testing

Once the calculator epic completes successfully:

1. **Document learnings** - What worked? What needs improvement?
2. **Optimize workflows** - Reduce latency, improve parallelism
3. **Add real development** - Replace simulated work with actual code generation
4. **Scale testing** - Run multiple epics concurrently
5. **Production deployment** - Deploy to production Temporal namespace

---

## Support & Resources

- **Tracker API Docs**: `martha.dev-v4/docs/api/TRACKER-API-REFERENCE.md`
- **Orchestration Plan**: `martha.dev-v4/docs/ORCHESTRATION-REPO-PROMPT.md`
- **Temporal Docs**: https://docs.temporal.io
- **Braintrust Docs**: https://www.braintrust.dev/docs
- **Browserbase Docs**: https://docs.browserbase.com

Good luck! 🚀
