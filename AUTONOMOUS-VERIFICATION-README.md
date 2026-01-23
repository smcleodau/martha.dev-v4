# Autonomous Verification System

Comprehensive 8-phase verification system for the Martha workflow platform that tests Temporal workflows, evidence tracking, stage gates, and real Claude agent execution.

## Overview

The autonomous verification system runs 150+ tests across multiple categories:
- **Unit tests** (Phase 2): Evidence, gates, agents, workflows
- **Integration tests** (Phase 3): Database, API, Temporal Cloud
- **E2E tests** (Phase 4): Mock agents, real agents, batch coordination
- **Load tests** (Phase 5): Concurrent workflows, stress testing
- **Error scenarios** (Phase 6): Failure handling and recovery
- **Observability** (Phase 7): Metrics and telemetry validation
- **Reporting** (Phase 8): HTML/JSON/Markdown reports + cleanup

## Quick Start

### Run All Phases

```bash
npm run verify:all
```

This executes all 8 phases sequentially with automatic error diagnosis and recovery.

### Run Individual Phases

```bash
npm run verify:infra         # Phase 1: Infrastructure validation
npm run verify:unit          # Phase 2: Unit tests
npm run verify:integration   # Phase 3: Integration tests
npm run verify:load          # Phase 5: Load testing
npm run verify:errors        # Phase 6: Error scenarios
npm run verify:observability # Phase 7: Observability validation
npm run verify:report        # Phase 8: Generate reports and cleanup
```

## Prerequisites

Before running verification, ensure:

1. **Environment variables** configured in `.env.local`:
   ```bash
   DATABASE_URL=postgresql://...
   TEMPORAL_ADDRESS=...
   TEMPORAL_NAMESPACE=...
   TEMPORAL_API_KEY=...
   TEMPORAL_TASK_QUEUE=...
   ```

2. **Services running**:
   - PostgreSQL/TimescaleDB (port 21006)
   - Redis (port 20001)
   - Temporal Cloud connection available

3. **Claude CLI** installed:
   ```bash
   # Check installation
   claude --version
   ```

4. **Database migrations** applied:
   ```bash
   npm run db:migrate
   ```

## Phase Details

### Phase 1: Infrastructure Validation (Critical)

Validates prerequisites and auto-fixes common issues:
- Node.js >= 18.0.0
- Git configuration
- Claude CLI availability
- Database connectivity
- TimescaleDB schema (evidence_events, telemetry_events)
- Temporal Cloud connectivity

**Auto-fix capabilities**:
- Runs database migrations if tables missing
- Installs npm dependencies if needed
- Fixes file permissions

**Success criteria**: All critical checks pass

### Phase 2: Unit Testing (Critical)

Runs Jest unit tests with coverage:
- Evidence store tests (19 tests)
- Evidence validator tests (25 tests)
- Stage gates tests (20 tests)
- Agent spawner tests (20 tests)
- Workflow signals/queries tests (20 tests)

**Success criteria**:
- All tests pass
- Code coverage >= 80%
- Execution < 5 minutes

### Phase 3: Integration Testing

Tests component interactions:
- Workflow + Evidence integration
- API endpoint functionality
- Temporal Cloud workflow execution

**Success criteria**: All 30 integration tests pass

### Phase 4: End-to-End Testing

**4.1 Simple E2E** (Mock agent):
- Create test issue
- Start IssueLifecycleWorkflow
- Send signals at each stage
- Verify completion

**4.2 Real Agent E2E** (Most complex):
- Create temporary git repository
- Spawn actual Claude Code CLI process
- Agent implements calculator function
- Runs tests autonomously
- Commits changes
- Workflow completes

**4.3 Batch Coordination**:
- Test dependency graph with 5 issues
- Verify parallel execution
- Check completion order

**Success criteria**: Real agent completes task autonomously

### Phase 5: Load & Stress Testing

Performance validation:
- **Normal load**: 10 concurrent workflows
- **Stress test**: 25 concurrent workflows
- **Performance**: 500 evidence inserts

**Success criteria**:
- Normal: 100% success, <500ms avg latency
- Stress: ≥90% success, <2000ms avg latency
- Performance: p95 <100ms

### Phase 6: Error Scenarios

Tests failure handling:
- Agent crashes and timeouts
- Gate blocking scenarios
- Database failures
- Workflow recovery

**Success criteria**: All 17 error scenarios handled gracefully

### Phase 7: Observability

Validates monitoring:
- 75+ Prometheus metrics exposed
- 30+ telemetry event types recorded
- Health endpoint returns 200 OK

**Success criteria**: Comprehensive observability

### Phase 8: Reporting & Cleanup

Generates reports and cleans up:
- HTML report (visual dashboard)
- JSON report (machine-readable)
- Markdown summary (documentation)
- Database cleanup (TEST-%, LOAD-%, PERF-%)
- Filesystem cleanup (/tmp/test-*)
- Results archive

**Success criteria**: All test data removed

## Advanced Usage

### Run Specific Phases

```bash
npm run verify:all -- --phases=1,2,3
```

### Skip Cleanup

```bash
npm run verify:all -- --skip-cleanup
```

### Inspect Results

After running verification:

```bash
# View HTML report
open reports/autonomous-verify-report.html

# View JSON results
cat reports/autonomous-verify-report.json | jq

# Read summary
cat reports/VERIFICATION-SUMMARY.md

# Check phase logs
ls -la logs/phase*.json
```

## Success Criteria (Overall)

For the entire system to pass:

- ✅ Critical phases (1, 2) must pass: 100% required
- ✅ Code coverage >= 80%
- ✅ Real Claude agent completes task autonomously
- ✅ All evidence properly tracked and validated
- ✅ Stage gates enforce thresholds correctly
- ✅ System handles 25+ concurrent workflows
- ✅ Error recovery mechanisms work
- ✅ Comprehensive reports generated
- ✅ All test data cleaned up

## Troubleshooting

### Phase 1 Fails: Missing Tables

```bash
# Run migrations
npm run db:migrate

# Retry verification
npm run verify:infra
```

### Phase 1 Fails: Temporal Connection

Check `.env.local`:
```bash
TEMPORAL_ADDRESS=ap-northeast-1.aws.api.temporal.io:7233
TEMPORAL_API_KEY=<your-api-key>
TEMPORAL_NAMESPACE=<your-namespace>
```

### Phase 2 Fails: Tests Not Found

```bash
# Ensure test files exist
ls -la tests/unit/

# Run tests directly
npm run test:unit
```

### Claude CLI Not Found

Install Claude CLI:
```bash
# Via npm
npm install -g @anthropic-ai/claude-code

# Or check expected path
ls -la /home/archiedev/.local/bin/claude
```

### Database Connection Refused

Start database:
```bash
docker-compose -f docker-compose.db.yml up -d
```

## Output Files

After successful run:

```
reports/
├── autonomous-verify-report.html  # Visual dashboard
├── autonomous-verify-report.json  # Machine-readable results
└── VERIFICATION-SUMMARY.md        # Human-readable summary

logs/
├── phase1-infrastructure.json
├── phase2-unit-tests.json
├── phase3-integration.json
├── phase5-load-testing.json
├── phase6-error-scenarios.json
├── phase7-observability.json
└── phase8-reporting.json

coverage/
└── lcov-report/
    └── index.html  # Code coverage report

autonomous-verify-artifacts-<timestamp>.tar.gz  # Archived results
```

## Architecture

```
scripts/autonomous-verify/
├── run-all.ts                    # Master orchestrator
├── phase1-infrastructure.ts      # Infrastructure validation
├── phase2-unit-tests.ts          # Jest unit tests
├── phase3-integration.ts         # Integration tests
├── phase4-simple-e2e.ts          # Simple E2E workflow
├── phase5-load-testing.ts        # Load & stress tests
├── phase6-error-scenarios.ts     # Error handling tests
├── phase7-observability.ts       # Metrics validation
├── phase8-reporting.ts           # Reports & cleanup
└── utils/
    ├── error-resolver.ts         # Auto-diagnosis/fix
    ├── cleanup-manager.ts        # Test data cleanup
    ├── test-helpers.ts           # Shared utilities
    └── report-generator.ts       # HTML/JSON/MD reports
```

## CI/CD Integration

Example GitHub Actions workflow:

```yaml
name: Autonomous Verification

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm install

      - name: Run verification
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          TEMPORAL_API_KEY: ${{ secrets.TEMPORAL_API_KEY }}
        run: npm run verify:all

      - name: Upload reports
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: verification-reports
          path: reports/
```

## Development

### Adding New Tests

1. Create test file in appropriate directory:
   - `tests/unit/` for unit tests
   - `tests/integration/` for integration tests
   - `tests/e2e/` for end-to-end tests

2. Follow Jest conventions:
   ```typescript
   describe('MyComponent', () => {
     it('should do something', () => {
       expect(actual).toBe(expected);
     });
   });
   ```

3. Run tests:
   ```bash
   npm run test:unit -- path/to/your.test.ts
   ```

### Adding New Phase

1. Create phase script: `scripts/autonomous-verify/phaseN-name.ts`

2. Add to `PHASES` array in `run-all.ts`:
   ```typescript
   {
     number: 9,
     name: 'My New Phase',
     script: 'scripts/autonomous-verify/phase9-mynew.ts',
     critical: false,
     skipOnFailure: true,
   }
   ```

3. Add npm script to `package.json`:
   ```json
   "verify:mynew": "tsx scripts/autonomous-verify/phase9-mynew.ts"
   ```

## Support

For issues or questions:
- Review error messages and logs in `logs/` directory
- Check this README for troubleshooting steps
- Consult the comprehensive plan: `AUTONOMOUS_VERIFICATION_PLAN.md`

---

**Version**: 1.0.0
**Last Updated**: 2024-01-19
**Author**: Martha.dev Team
