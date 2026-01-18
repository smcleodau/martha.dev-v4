# Martha.dev v4 - Comprehensive Testing Plan

**Version:** 1.0
**Date:** 2026-01-18
**Status:** Ready for Execution
**Estimated Duration:** 2-3 hours

---

## Executive Summary

This plan provides step-by-step testing procedures to validate all 8 phases of the martha.dev-v4 platform. Tests are organized by phase and include exact commands, expected results, and success criteria.

**Test Environment:**
- Temporal Cloud: ap-northeast-1.aws.api.temporal.io:7233
- TimescaleDB: localhost:21006
- API Server: localhost:21009
- Dashboard: localhost:21009/dashboard

---

## Pre-Test Setup

### 1. Environment Validation
```bash
# Verify environment variables
cd /mnt/data/martha.dev-v4-orchestration
cat .env.local | grep -E "TEMPORAL_ADDRESS|TEMPORAL_NAMESPACE|TEMPORAL_API_KEY|DATABASE_URL"

# Expected output:
# TEMPORAL_ADDRESS=ap-northeast-1.aws.api.temporal.io:7233
# TEMPORAL_NAMESPACE=martha-dev-v4.mnjo7
# TEMPORAL_API_KEY=eyJ... (valid token)
# DATABASE_URL=postgresql://... (port 21006)
```

### 2. Install Dependencies
```bash
cd /mnt/data/martha.dev-v4-orchestration
npm install

# Verify installation
npm list --depth=0 | grep -E "jest|temporal|postgres|fastify"
```

### 3. Database Verification
```bash
# Check TimescaleDB is running
pg_isready -h localhost -p 21006

# Expected: localhost:21006 - accepting connections

# Verify migrations applied
psql -h localhost -p 21006 -U postgres -d martha_development -c "SELECT version FROM schema_migrations ORDER BY version;"

# Expected: migrations 003, 004, 005, 006, 007, 008
```

---

## Phase 1: Temporal Client & Worker

### Test 1.1: Temporal Cloud Connection
```bash
# Test client connection
cd /mnt/data/martha.dev-v4-orchestration
npm run build

# Start worker (in background)
npm run worker > /tmp/worker-test.log 2>&1 &
WORKER_PID=$!

# Wait 10 seconds for connection
sleep 10

# Check logs
tail -20 /tmp/worker-test.log | grep -i "connected\|polling"

# Expected: "Connected to Temporal Cloud" or "Polling for tasks"

# Kill worker
kill $WORKER_PID
```

**Success Criteria:**
- ✅ Worker connects without errors
- ✅ Worker starts polling for tasks
- ✅ No authentication errors

---

## Phase 2: Telemetry System

### Test 2.1: Jest Unit Tests
```bash
cd /mnt/data/martha.dev-v4-orchestration

# Run validation tests
npm test -- jest-config-validation.test.ts

# Expected output:
# ✓ Test Suites: 1 passed
# ✓ Tests: 11 passed
```

**Success Criteria:**
- ✅ All 11 validation tests pass
- ✅ No ESM module errors
- ✅ Test execution time < 5 seconds

### Test 2.2: Database Telemetry
```bash
# Query telemetry events
psql -h localhost -p 21006 -U postgres -d martha_development -c "
SELECT
  COUNT(*) as total_events,
  COUNT(DISTINCT category) as categories,
  MIN(timestamp) as first_event,
  MAX(timestamp) as last_event
FROM telemetry_events;
"

# Expected:
# total_events > 0
# categories >= 3
# Timestamps show recent activity
```

**Success Criteria:**
- ✅ Telemetry events exist in database
- ✅ Multiple event categories present
- ✅ Timestamps are recent

### Test 2.3: Continuous Aggregates
```bash
# Verify continuous aggregates exist
psql -h localhost -p 21006 -U postgres -d martha_development -c "
SELECT view_name, materialized_only
FROM timescaledb_information.continuous_aggregates;
"

# Expected:
# telemetry_1min_agg
# telemetry_1hour_agg
# telemetry_1day_agg
```

**Success Criteria:**
- ✅ 3 continuous aggregates exist
- ✅ Aggregates are materialized

---

## Phase 3: Workflow Orchestration

### Test 3.1: Workflow Compilation
```bash
cd /mnt/data/martha.dev-v4-orchestration

# Build workflows
npm run build

# Check workflow bundles exist
ls -lh dist/src/workflows/*.js

# Expected:
# BatchCoordinatorWorkflow.js
# IssueLifecycleWorkflow.js
```

**Success Criteria:**
- ✅ Build completes without errors
- ✅ Workflow bundles generated
- ✅ Bundle sizes reasonable (< 100KB each)

### Test 3.2: Activity Functions
```bash
# Verify activity files exist
ls -lh dist/src/activities/*.js

# Expected:
# issue-activities.js (~50KB)
# agent-activities.js
# test-activities.js
```

**Success Criteria:**
- ✅ All activity files compiled
- ✅ No TypeScript compilation errors

### Test 3.3: Simple Workflow Test (Integration)
```bash
# Run integration test
npm run test:integration

# Expected:
# Worker connects successfully
# Worker can poll for tasks
# Worker shuts down cleanly
```

**Success Criteria:**
- ✅ Integration test passes
- ✅ Worker lifecycle working

---

## Phase 4: Agent Selection

### Test 4.1: Agent Manager
```bash
# Check agent session files
ls -la /mnt/data/martha-workflow/.martha/agents/sessions/

# Expected: Session JSON files or empty directory

# Query agent performance table
psql -h localhost -p 21006 -U postgres -d martha_development -c "
SELECT COUNT(*) FROM agent_performance;
"

# Expected: Table exists (may be empty)
```

**Success Criteria:**
- ✅ Agent session tracking available
- ✅ Database tables exist

---

## Phase 5: Learning System

### Test 5.1: Database Tables
```bash
# Verify learning tables exist
psql -h localhost -p 21006 -U postgres -d martha_development -c "
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE 'learning_%' OR table_name LIKE 'model_%';
"

# Expected:
# learning_feedback
# model_predictions
# model_versions
```

**Success Criteria:**
- ✅ All learning tables exist
- ✅ Tables have correct schema

---

## Phase 6: Exception Handling

### Test 6.1: Exception Tracking
```bash
# Query exceptions table
psql -h localhost -p 21006 -U postgres -d martha_development -c "
SELECT
  COUNT(*) as total_exceptions,
  COUNT(DISTINCT severity) as severity_levels,
  COUNT(*) FILTER (WHERE resolved = true) as resolved_count
FROM exceptions;
"

# Expected: Table exists (may have 0 or more exceptions)
```

**Success Criteria:**
- ✅ Exceptions table exists
- ✅ Schema includes severity and resolved fields

---

## Phase 7: Integration & Polish

### Test 7.1: Martha Commands
```bash
# Verify command files exist
ls -lh /mnt/data/martha-workflow/.claude/commands/martha/ | grep -E "2x2|spawn|test|muster|gate"

# Expected files:
# 2x2.md (~11KB)
# spawn.md (~7KB)
# test.md (~34KB)
# test-batch.md (~29KB)
# muster.md (~30KB)
# gate.md (~3.5KB)

# Check for Temporal integration in 2x2
grep -i "BatchCoordinatorWorkflow" /mnt/data/martha-workflow/.claude/commands/martha/2x2.md

# Expected: Found references to BatchCoordinatorWorkflow
```

**Success Criteria:**
- ✅ All 6 commands exist
- ✅ Commands reference Temporal workflows
- ✅ Documentation updated

### Test 7.2: Dashboard Files
```bash
# Check dashboard files
ls -la /mnt/data/martha.dev-v4/dashboard/src/pages/Dashboard.tsx
ls -la /mnt/data/martha.dev-v4/dashboard/src/components/dashboard/

# Expected:
# Dashboard.tsx exists
# Component directory has 6+ dashboard components
```

**Success Criteria:**
- ✅ Dashboard component exists
- ✅ All view components created

### Test 7.3: Documentation Completeness
```bash
# Verify all documentation exists
cd /mnt/data/martha.dev-v4-orchestration/docs
ls -lh

# Expected files:
# SYSTEM_OVERVIEW.md (~12KB)
# OPERATOR_RUNBOOK.md (~20KB)
# DEVELOPER_GUIDE.md (~19KB)
# API_REFERENCE.md (~20KB)
# ARCHITECTURE_DIAGRAMS.md (~38KB)
# DOCUMENTATION_INDEX.md (~15KB)

# Count diagrams
grep -c "```mermaid" ARCHITECTURE_DIAGRAMS.md

# Expected: 5+ Mermaid diagrams
```

**Success Criteria:**
- ✅ All 6 documentation files exist
- ✅ Total documentation > 100KB
- ✅ 5+ architecture diagrams

### Test 7.4: Production Hardening
```bash
# Check error handling middleware
test -f /mnt/data/martha.dev-v4-orchestration/src/middleware/error-handler.ts
echo "Error handler exists: $?"

# Check database optimization migration
psql -h localhost -p 21006 -U postgres -d martha_development -c "
SELECT COUNT(*) as index_count
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('telemetry_events', 'agent_performance', 'exceptions');
"

# Expected: 15+ indexes

# Check Prometheus metrics file
test -f /mnt/data/martha.dev-v4-orchestration/src/monitoring/prometheus-metrics.ts
echo "Prometheus metrics exists: $?"

# Check Grafana dashboards
ls -la /mnt/data/martha.dev-v4-orchestration/grafana/dashboards/

# Expected: 2+ dashboard JSON files
```

**Success Criteria:**
- ✅ Error handling implemented
- ✅ Database indexes created (15+)
- ✅ Observability stack ready
- ✅ Security features in place

---

## Phase 8: Communications Service POC

### Test 8.1: Architecture Documentation
```bash
# Check architecture document
test -f /mnt/data/martha-workflow/.martha/worktrees/communications-service/ARCHITECTURE.md
ls -lh /mnt/data/martha-workflow/.martha/worktrees/communications-service/ARCHITECTURE.md

# Expected: ~42KB file

# Count sections
grep -c "^##" /mnt/data/martha-workflow/.martha/worktrees/communications-service/ARCHITECTURE.md

# Expected: 10+ major sections
```

**Success Criteria:**
- ✅ Architecture document exists
- ✅ Document is comprehensive (40+ KB)
- ✅ 10+ major sections

### Test 8.2: Issue Tracker
```bash
# Count implementation issues
ls -1 /mnt/data/martha-workflow/.martha/worktrees/communications-service/boards/communications/issues/MTH-*.json | wc -l

# Expected: 20+ issues (MTH-176 to MTH-195)

# Verify issue structure
jq '.id, .title, .story_points, .epic_id' /mnt/data/martha-workflow/.martha/worktrees/communications-service/boards/communications/issues/MTH-176.json

# Expected: Valid JSON with all fields
```

**Success Criteria:**
- ✅ 20 implementation issues created
- ✅ Issues have proper structure
- ✅ Total story points = 50

### Test 8.3: Batch Tracker
```bash
# Find batch tracker
find /mnt/data/martha-workflow/.martha/worktrees/communications-service/.martha/batches -name "*.json" -type f

# Expected: batch-*.json file

# Verify batch structure
ls -la /mnt/data/martha-workflow/.martha/worktrees/communications-service/.martha/batches/
```

**Success Criteria:**
- ✅ Batch tracker file exists
- ✅ Batch includes first 2 epics

### Test 8.4: Testing & Deployment Documentation
```bash
# Check testing documentation
test -f /mnt/data/martha-workflow/.martha/worktrees/communications-service/EPIC-8.3-TESTING-DEPLOYMENT.md
ls -lh /mnt/data/martha-workflow/.martha/worktrees/communications-service/EPIC-8.3-TESTING-DEPLOYMENT.md

# Expected: ~88KB file

# Check deployment verification script
test -x /mnt/data/martha-workflow/.martha/worktrees/communications-service/verify-deployment.sh
echo "Deployment script executable: $?"
```

**Success Criteria:**
- ✅ Testing documentation exists (80+ KB)
- ✅ Deployment script is executable
- ✅ Deployment checklist complete

---

## API Server Testing (Optional - if server running)

### Test A.1: Start API Server
```bash
cd /mnt/data/martha.dev-v4-orchestration
npm run dev > /tmp/api-server.log 2>&1 &
API_PID=$!

# Wait for server to start
sleep 5

# Check if running
ps -p $API_PID

# Expected: Process running
```

### Test A.2: Health Check
```bash
curl -s http://localhost:21009/health | jq .

# Expected:
# {
#   "status": "healthy",
#   "timestamp": "...",
#   "uptime": ...
# }
```

### Test A.3: Telemetry API
```bash
# Get telemetry events
curl -s "http://localhost:21009/api/v1/telemetry/events?limit=10" | jq '.events | length'

# Expected: Number between 0-10

# Get agent metrics
curl -s http://localhost:21009/api/v1/telemetry/agent-metrics | jq .

# Expected: JSON with metrics data
```

### Test A.4: Dashboard
```bash
# Test dashboard page loads
curl -s http://localhost:21009/dashboard | grep -i "dashboard"

# Expected: HTML containing "dashboard" text
```

### Cleanup
```bash
# Stop API server
kill $API_PID
```

---

## Final Validation

### Test F.1: Build Entire Project
```bash
cd /mnt/data/martha.dev-v4-orchestration
npm run build

# Expected:
# Build successful
# No TypeScript errors
# dist/ directory populated
```

### Test F.2: Count Deliverables
```bash
# Count documentation files
find /mnt/data/martha.dev-v4-orchestration/docs -name "*.md" | wc -l

# Expected: 6+ files

# Count communications service docs
find /mnt/data/martha-workflow/.martha/worktrees/communications-service -name "*.md" | wc -l

# Expected: 10+ files

# Count issue files
find /mnt/data/martha-workflow/.martha/worktrees/communications-service -name "*.json" | wc -l

# Expected: 20+ files
```

### Test F.3: Database Final Check
```bash
psql -h localhost -p 21006 -U postgres -d martha_development -c "
SELECT
  'Tables' as type, COUNT(*) as count FROM information_schema.tables WHERE table_schema = 'public'
UNION ALL
SELECT 'Indexes' as type, COUNT(*) FROM pg_indexes WHERE schemaname = 'public'
UNION ALL
SELECT 'Telemetry Events' as type, COUNT(*) FROM telemetry_events
UNION ALL
SELECT 'Exceptions' as type, COUNT(*) FROM exceptions;
"

# Expected:
# Tables: 12+
# Indexes: 15+
# Telemetry Events: 0+ (any number)
# Exceptions: 0+ (any number)
```

---

## Success Criteria Summary

| Phase | Tests | Required Pass Rate |
|-------|-------|-------------------|
| Phase 1 | 1 | 100% |
| Phase 2 | 3 | 100% |
| Phase 3 | 3 | 100% |
| Phase 4 | 1 | 100% |
| Phase 5 | 1 | 100% |
| Phase 6 | 1 | 100% |
| Phase 7 | 4 | 100% |
| Phase 8 | 4 | 100% |
| API Tests | 4 | Optional |
| Final | 3 | 100% |

**Overall Success Criteria:**
- ✅ All required tests pass (100%)
- ✅ No critical errors in logs
- ✅ All documentation complete
- ✅ Database healthy with proper schema
- ✅ Build completes successfully

---

## Test Execution Log Template

Copy this template to record test results:

```markdown
# Test Execution Log
**Date:** YYYY-MM-DD
**Tester:** [Name]
**Environment:** [Development/Staging/Production]

## Phase 1: Temporal Client & Worker
- [ ] Test 1.1: Temporal Cloud Connection - PASS/FAIL
  - Notes:

## Phase 2: Telemetry System
- [ ] Test 2.1: Jest Unit Tests - PASS/FAIL
  - Notes:
- [ ] Test 2.2: Database Telemetry - PASS/FAIL
  - Notes:
- [ ] Test 2.3: Continuous Aggregates - PASS/FAIL
  - Notes:

## Phase 3: Workflow Orchestration
- [ ] Test 3.1: Workflow Compilation - PASS/FAIL
  - Notes:
- [ ] Test 3.2: Activity Functions - PASS/FAIL
  - Notes:
- [ ] Test 3.3: Simple Workflow Test - PASS/FAIL
  - Notes:

## Phase 4: Agent Selection
- [ ] Test 4.1: Agent Manager - PASS/FAIL
  - Notes:

## Phase 5: Learning System
- [ ] Test 5.1: Database Tables - PASS/FAIL
  - Notes:

## Phase 6: Exception Handling
- [ ] Test 6.1: Exception Tracking - PASS/FAIL
  - Notes:

## Phase 7: Integration & Polish
- [ ] Test 7.1: Martha Commands - PASS/FAIL
  - Notes:
- [ ] Test 7.2: Dashboard Files - PASS/FAIL
  - Notes:
- [ ] Test 7.3: Documentation Completeness - PASS/FAIL
  - Notes:
- [ ] Test 7.4: Production Hardening - PASS/FAIL
  - Notes:

## Phase 8: Communications Service POC
- [ ] Test 8.1: Architecture Documentation - PASS/FAIL
  - Notes:
- [ ] Test 8.2: Issue Tracker - PASS/FAIL
  - Notes:
- [ ] Test 8.3: Batch Tracker - PASS/FAIL
  - Notes:
- [ ] Test 8.4: Testing & Deployment Documentation - PASS/FAIL
  - Notes:

## Final Validation
- [ ] Test F.1: Build Entire Project - PASS/FAIL
  - Notes:
- [ ] Test F.2: Count Deliverables - PASS/FAIL
  - Notes:
- [ ] Test F.3: Database Final Check - PASS/FAIL
  - Notes:

## Summary
**Total Tests:** XX
**Passed:** XX
**Failed:** XX
**Pass Rate:** XX%

**Overall Status:** PASS/FAIL

**Issues Found:**
1.
2.

**Recommendations:**
1.
2.
```

---

## Troubleshooting Guide

### Issue: Worker fails to connect to Temporal Cloud
**Solution:**
```bash
# Check environment variables
cat .env.local | grep TEMPORAL

# Verify API key not expired
# API keys expire - check expiration date in token

# Test connection manually
curl -H "Authorization: Bearer $TEMPORAL_API_KEY" \
  https://ap-northeast-1.aws.api.temporal.io:7233/api/v1/namespaces/martha-dev-v4.mnjo7
```

### Issue: Database connection refused
**Solution:**
```bash
# Check if TimescaleDB is running
pg_isready -h localhost -p 21006

# Start TimescaleDB if needed
# (commands depend on installation method)

# Check credentials in .env.local
```

### Issue: Jest tests fail with ESM errors
**Solution:**
```bash
# Verify NODE_OPTIONS in package.json
grep NODE_OPTIONS package.json

# Should include: --experimental-vm-modules

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Issue: Build fails
**Solution:**
```bash
# Clean build artifacts
rm -rf dist/

# Reinstall dependencies
npm ci

# Build with verbose logging
npm run build -- --verbose
```

---

## Next Steps After Testing

### If All Tests Pass:
1. Review comprehensive test report
2. Schedule production deployment
3. Set up monitoring (Prometheus/Grafana)
4. Train operations team on runbooks
5. Prepare rollback procedures

### If Tests Fail:
1. Document all failures in execution log
2. Categorize by severity (P0/P1/P2/P3)
3. Create issues in tracker for each failure
4. Fix critical issues (P0/P1)
5. Re-run failed tests
6. Generate updated test report

---

## Appendix: Quick Reference Commands

**Start Worker:**
```bash
cd /mnt/data/martha.dev-v4-orchestration && npm run worker
```

**Start API Server:**
```bash
cd /mnt/data/martha.dev-v4-orchestration && npm run dev
```

**Run All Tests:**
```bash
cd /mnt/data/martha.dev-v4-orchestration && npm test
```

**Build Project:**
```bash
cd /mnt/data/martha.dev-v4-orchestration && npm run build
```

**Database Query:**
```bash
psql -h localhost -p 21006 -U postgres -d martha_development
```

**View Logs:**
```bash
tail -f /tmp/worker-test.log
tail -f /tmp/api-server.log
```

---

**End of Testing Plan**
