# Phase 8: Calculator App E2E Test Plan

**Goal:** Prove the orchestration platform works with a real application by building a calculator app with full issue tracking, workflow orchestration, and evidence generation.

---

## Setup

### 1. New Repository
```bash
cd /mnt/data
npx create-next-app calculator-app --typescript --tailwind --app --no-src-dir
cd calculator-app
git init
git add .
git commit -m "feat: initial Next.js calculator app"
```

### 2. New Worktree Configuration
**Location:** `.worktree-config.json`
```json
{
  "name": "calculator-app",
  "index": 22,
  "branch": "main",
  "projectBoard": 29,
  "services": {
    "web": { "port": 22000, "command": "npm run dev" },
    "tests": { "port": 22001, "command": "npm test" }
  }
}
```

### 3. New Board in Tracker
**Location:** `/mnt/data/martha-workflow/.martha/worktrees/calculator-app/`
```
calculator-app/
├── config.json (worktree metadata)
├── boards/
│   └── calculator-development/
│       ├── state.json (Kanban board state)
│       └── issues/ (issue JSON files)
└── comments/ (evidence comments)
```

---

## Issues to Create (10-15)

### EPIC-1: Calculator UI (4 tasks) - 13 SP

**TASK-1.1:** Create Next.js project structure (3 SP)
- **AC:** Next.js 14 app with TypeScript, Tailwind, ESLint
- **Files:** package.json, tsconfig.json, app layout

**TASK-1.2:** Design calculator button layout (3 SP)
- **AC:** 4x4 grid with numbers 0-9, operators (+, -, *, /), equals, clear
- **Files:** app/page.tsx, components/Calculator.tsx

**TASK-1.3:** Implement display component (3 SP)
- **AC:** Shows current input and result, supports up to 15 digits
- **Files:** components/Display.tsx

**TASK-1.4:** Style calculator with Tailwind (4 SP)
- **AC:** Dark mode support, responsive design, hover states
- **Files:** app/globals.css, tailwind.config.ts

---

### EPIC-2: Calculator Logic (4 tasks) - 21 SP

**TASK-2.1:** Implement addition operation (3 SP)
- **AC:** Correctly adds two numbers, handles decimals
- **Files:** lib/calculator.ts, tests for addition

**TASK-2.2:** Implement subtraction operation (3 SP)
- **AC:** Correctly subtracts, handles negative results
- **Files:** lib/calculator.ts, tests for subtraction

**TASK-2.3:** Implement multiplication operation (3 SP)
- **AC:** Correctly multiplies, handles large numbers
- **Files:** lib/calculator.ts, tests for multiplication

**TASK-2.4:** Implement division operation (5 SP)
- **AC:** Correctly divides, handles division by zero, displays error
- **Files:** lib/calculator.ts, error handling

**TASK-2.5:** Integrate operations with UI (7 SP)
- **AC:** Button clicks trigger operations, result displays correctly
- **Files:** components/Calculator.tsx, event handlers

---

### EPIC-3: Testing & Deployment (3 tasks) - 21 SP

**TASK-3.1:** Write unit tests for operations (8 SP)
- **AC:** 100% coverage for calculator logic, edge cases tested
- **Files:** lib/calculator.test.ts (Vitest)

**TASK-3.2:** Write E2E tests with Playwright (8 SP)
- **AC:** Test full user flow: input → operation → result
- **Files:** tests/calculator.spec.ts

**TASK-3.3:** Deploy to Cloudflare Pages (5 SP)
- **AC:** Live calculator at https://calculator.arch.ie, CI/CD pipeline
- **Files:** .github/workflows/deploy.yml

---

## Orchestration Flow

### Step 1: Create Batch
```bash
# In martha-workflow repo
cd /mnt/data/martha-workflow
/martha:worktree-create calculator-app --index 22
```

This creates:
- Worktree config
- Board structure
- Port allocations

### Step 2: Load Issues
Create 10 issue JSON files in `.martha/worktrees/calculator-app/boards/calculator-development/issues/`

Each issue:
```json
{
  "id": "TASK-1.1",
  "type": "task",
  "title": "Create Next.js project structure",
  "status": "backlog",
  "parent_id": "EPIC-1",
  "story_points": 3,
  ...
}
```

### Step 3: Muster First Batch
```bash
/martha:muster EPIC-1 EPIC-2
```

This:
- Validates 2 epics selected
- Creates epic branches
- Moves epics + children to "Setup" status
- Initializes `.batch-tracker.json`
- Creates swarm configs

### Step 4: Start the 2x2 March (Orchestration!)
```bash
/martha:2x2
```

**What Happens:**
1. **POST /api/commands/2x2** called with batch data
2. `CommandIntegrationService.start2x2March()` executes
3. Starts `BatchCoordinatorWorkflow` in Temporal
4. Workflow spawns `IssueLifecycleWorkflow` for each task
5. Each workflow:
   - Stage 1: Setup → Create branch, assign agent
   - Stage 2: Implementation → Code the feature
   - Stage 3: Testing → Run tests
   - Stage 4: Code Review → Request review
   - Stage 5: PR Merge → Merge to main
   - Stage 6: Deployment → Deploy to Cloudflare
   - Stage 7: Verification → Verify deployment
6. **Telemetry events written** to TimescaleDB for each stage
7. **Board updates** as workflows progress
8. **Evidence generated** (commits, test results, deployment URLs)

### Step 5: Monitor Progress
```bash
# Check batch status
curl http://localhost:21000/api/commands/batch/20260117-103500

# Check specific workflow
curl http://localhost:21000/api/commands/workflow/issue-TASK-1.1-123456789

# Query telemetry
psql -U martha_ts_user -h localhost -p 21006 -d martha_ts -c "
  SELECT workflow_id, issue_id, event_type, COUNT(*)
  FROM ts_martha.telemetry_events
  WHERE batch_id = '20260117-103500'
  GROUP BY workflow_id, issue_id, event_type;
"
```

### Step 6: Gate Checks
```bash
# Pre-review gate
/martha:gate pre_review

# Pre-merge gate
/martha:gate pre_merge
```

**Gate Checks:**
- ✅ All issues in appropriate status
- ✅ No open exceptions
- ✅ Tests passing (95%+ pass rate)
- ✅ Code review approved

### Step 7: Deploy Final Epic
```bash
/martha:muster EPIC-3
/martha:2x2
```

Deploys calculator to Cloudflare Pages.

---

## Success Criteria

### Orchestration Proof
- ✅ 10 issues tracked in board
- ✅ All workflows started via Temporal
- ✅ Issues moved through board: Backlog → Setup → In Development → Code Complete → Testing → Done
- ✅ 500+ telemetry events written (50+ per workflow)
- ✅ Performance metrics calculated for each agent
- ✅ No exceptions detected (or resolved if any)

### Application Proof
- ✅ Calculator deployed at https://calculator.arch.ie
- ✅ All operations work (add, subtract, multiply, divide)
- ✅ 100% test coverage
- ✅ E2E tests passing

### Evidence Proof
- ✅ Each task has:
  - Commits in git
  - Test results
  - Quality checks completed
  - Evidence comment with file links
- ✅ Web UI displays evidence for all tasks
- ✅ Telemetry dashboard shows workflow execution

---

## Verification Commands

```bash
# 1. Check board state
cat .martha/worktrees/calculator-app/boards/calculator-development/state.json | \
  jq '.columns[] | {status: .id, count: (.issue_ids | length)}'

# 2. Check telemetry
psql -U martha_ts_user -h localhost -p 21006 -d martha_ts -c "
  SELECT
    COUNT(DISTINCT workflow_id) AS total_workflows,
    COUNT(*) AS total_events,
    AVG(duration_ms) AS avg_duration_ms
  FROM ts_martha.telemetry_events
  WHERE batch_id LIKE 'calculator-%';
"

# 3. Check agent performance
psql -U martha_ts_user -h localhost -p 21006 -d martha_ts -c "
  SELECT
    agent_id,
    COUNT(*) AS tasks_completed,
    AVG(duration_ms) / 1000.0 AS avg_duration_sec,
    AVG(CASE WHEN success THEN 1.0 ELSE 0.0 END) AS success_rate
  FROM ts_martha.agent_performance
  WHERE batch_id LIKE 'calculator-%'
  GROUP BY agent_id;
"

# 4. Test live calculator
curl https://calculator.arch.ie
```

---

## Next Steps

1. Create calculator-app repository
2. Create worktree configuration
3. Create board and load issues
4. Muster first batch
5. Run /martha:2x2 and monitor
6. Verify telemetry and evidence
7. Deploy and test live calculator

**This proves the platform works end-to-end!**
