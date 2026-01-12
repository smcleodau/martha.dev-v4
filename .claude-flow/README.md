# Claude-Flow Swarm Configuration for Martha TypeScript Migration

## Overview

This directory contains the claude-flow hive-mind configuration to accelerate Martha TypeScript migration phases 6-11 using parallel agent execution.

## Architecture

**Topology:** Hive-Mind (parallel multi-agent)

**Agents (6 specialists):**
1. **cloudflare_agent** - Phase 6: Cloudflare tunnel integration
2. **swarm_agent** - Phase 7: Swarm orchestration (depends on Phase 6)
3. **test_agent** - Phase 8: Test execution (parallel with Phase 7)
4. **evidence_agent** - Phase 9: Evidence collection (depends on Phases 7 & 8)
5. **monitoring_agent** - Phase 10: Prometheus/Grafana (parallel)
6. **testing_agent** - Phase 11: QA & validation (depends on all)

**Execution Strategy:**
- Phases 6, 8, 10 start immediately (no dependencies)
- Phase 7 waits for Phase 6 completion
- Phase 9 waits for Phases 7 & 8 completion
- Phase 11 waits for all phases 6-10 completion

## Files

```
.claude-flow/
├── README.md                    # This file
├── config.json                  # Main configuration
├── tasks/
│   ├── phase-6-cloudflare.md   # Cloudflare integration tasks
│   ├── phase-7-swarms.md        # Swarm orchestration tasks
│   ├── phase-8-tests.md         # Test execution tasks
│   ├── phase-9-evidence.md      # Evidence collection tasks
│   ├── phase-10-monitoring.md   # Monitoring/metrics tasks
│   └── phase-11-testing.md      # QA/validation tasks
├── progress.log                 # Execution progress (generated)
├── metrics.json                 # Telemetry data (generated)
├── artifacts/                   # Agent outputs (generated)
└── checkpoints/                 # State checkpoints (generated)
```

## Spawning the Swarm

### Prerequisites

1. **Claude Code installed:**
   ```bash
   npm install -g @anthropic/claude-code
   ```

2. **Environment variables set:**
   ```bash
   export GITHUB_TOKEN="ghp_xxxxxxxxxxxxx"
   export GITHUB_REPO="owner/repository"
   export CLOUDFLARE_API_TOKEN="xxxxx"
   export CLOUDFLARE_ACCOUNT_ID="xxxxx"
   export CLOUDFLARE_ZONE_ID="xxxxx"
   export BRAINTRUST_API_KEY="xxxxx"
   export BROWSERBASE_API_KEY="xxxxx"
   export BROWSERBASE_PROJECT_ID="xxxxx"
   ```

3. **Martha service running:**
   ```bash
   curl http://localhost:21000/health
   # Should return: {"status":"healthy","version":"3.0.0"}
   ```

### Spawn Command

```bash
cd /mnt/data/martha.dev-v4-worktrees/typescript-rewrite

# Option 1: Using npx (recommended)
npx claude-flow@alpha hive-mind spawn --config .claude-flow/config.json

# Option 2: If claude-flow is installed globally
claude-flow hive-mind spawn --config .claude-flow/config.json
```

### Expected Output

```
🐝 Claude-Flow Hive-Mind Spawning...

Project: martha-typescript-phases-6-11
Agents: 6
Topology: hive-mind

Starting agents:
  ✓ cloudflare_agent (Phase 6) - Priority: high
  ✓ test_agent (Phase 8) - Priority: medium
  ✓ monitoring_agent (Phase 10) - Priority: medium
  ⏳ swarm_agent (Phase 7) - Waiting for cloudflare_agent
  ⏳ evidence_agent (Phase 9) - Waiting for swarm_agent, test_agent
  ⏳ testing_agent (Phase 11) - Waiting for all

Swarm ID: martha-phases-6-11-abc123
State file: .swarm/state.json
PID: 12345

🚀 Swarm is running!

Monitor: tail -f .claude-flow/progress.log
Stop: kill -SIGTERM 12345
```

## Monitoring Progress

### Real-Time Logs

```bash
# Follow progress log
tail -f .claude-flow/progress.log

# Follow swarm state
watch -n 5 'cat .swarm/state.json | jq .'
```

### Martha Service Monitoring

```bash
# Check active swarms
curl http://localhost:21000/api/v1/swarms | jq .

# Get specific swarm status
curl http://localhost:21000/api/v1/swarms/<swarm-id> | jq .
```

### Hooks Integration

The swarm sends callbacks to Martha service:

- `POST /api/v1/hooks/task-complete` - When an agent completes a task
- `POST /api/v1/hooks/phase-complete` - When a phase is complete
- `POST /api/v1/hooks/error` - When an error occurs

### Dashboard Monitoring

Open the Martha dashboard:
```bash
# View in browser
open http://localhost:21004

# Or via tunnel
open https://martha.arch.ie
```

## Phase Completion Tracking

### Check Phase Status

```bash
# Read state file
cat .swarm/state.json | jq '.phases'

# Expected output:
{
  "phase_6": "completed",
  "phase_7": "in_progress",
  "phase_8": "completed",
  "phase_9": "pending",
  "phase_10": "in_progress",
  "phase_11": "pending"
}
```

### Verify Implementation

After each phase completes:

```bash
# Verify TypeScript compiles
npm run build

# Run tests for completed phase
npm run test -- --testPathPattern="phase-6"

# Check MCP tools
npm run mcp

# Test API endpoints
curl http://localhost:21000/api/v1/swarms
```

## Terminating the Swarm

### Graceful Shutdown

```bash
# Get swarm PID from state file
SWARM_PID=$(cat .swarm/state.json | jq -r '.pid')

# Send graceful shutdown signal
kill -SIGTERM $SWARM_PID

# Wait for cleanup (30 seconds)
# Swarm will save state and cleanup resources
```

### Force Termination

```bash
# Only if graceful shutdown fails
kill -SIGKILL $SWARM_PID
```

### Via Martha Service

```bash
# Using MCP tool
echo '{"swarm_id": "martha-phases-6-11-abc123"}' | \
  node dist/mcp/server.js --tool martha__swarm__terminate

# Or via API
curl -X DELETE http://localhost:21000/api/v1/swarms/<swarm-id>
```

## Troubleshooting

### Swarm Won't Start

**Check prerequisites:**
```bash
# Node.js version
node --version  # Should be 18+

# Claude Code installed
which claude-flow || npm install -g @anthropic/claude-code

# Environment variables
env | grep -E '(GITHUB|CLOUDFLARE|BRAINTRUST|BROWSERBASE)'
```

**Check Martha service:**
```bash
curl http://localhost:21000/health
```

### Agent Stuck

**Check logs:**
```bash
tail -100 .claude-flow/progress.log | grep ERROR
```

**Check dependencies:**
```bash
# View agent status
cat .swarm/state.json | jq '.agents'
```

**Restart specific agent:**
```bash
# Not supported - restart entire swarm
kill -SIGTERM $SWARM_PID
npx claude-flow@alpha hive-mind spawn --config .claude-flow/config.json
```

### Hook Callbacks Failing

**Check Martha service endpoints:**
```bash
# Test hook endpoint
curl -X POST http://localhost:21000/api/v1/hooks/task-complete \
  -H "Content-Type: application/json" \
  -d '{"task":"test","status":"completed"}'
```

**Check logs:**
```bash
# Martha service logs
tail -f ~/.martha/logs/service.log
```

### Phase Not Starting

**Check dependencies:**
```bash
# View dependency graph
cat .claude-flow/config.json | jq '.agents | to_entries[] | {agent: .key, dependencies: .value.dependencies}'
```

**Manual dependency resolution:**
If Phase 7 won't start, ensure Phase 6 is marked complete:
```bash
# Check phase 6 completion
cat .swarm/state.json | jq '.phases.phase_6'

# If stuck, manually trigger (not recommended)
# Let swarm manage dependencies automatically
```

## Checkpoints & Recovery

### Automatic Checkpoints

Swarm saves checkpoints every 10 minutes:
```bash
ls -lah .claude-flow/checkpoints/
# checkpoint-2026-01-12T10-00-00.json
# checkpoint-2026-01-12T10-10-00.json
```

### Resume from Checkpoint

```bash
# If swarm crashes, resume from last checkpoint
npx claude-flow@alpha hive-mind resume \
  --checkpoint .claude-flow/checkpoints/checkpoint-latest.json
```

## Validation After Completion

### All Phases Complete

```bash
# Check final state
cat .swarm/state.json | jq '.status'
# Should be: "completed"

# Verify all phases
cat .swarm/state.json | jq '.phases | to_entries[] | select(.value != "completed")'
# Should be empty

# Count files created
find src -type f -name "*.ts" | wc -l
# Should be ~60+ files

# Total lines of code
find src -type f -name "*.ts" -exec wc -l {} + | tail -1
# Should be ~10,000+ lines
```

### Run Full Test Suite

```bash
# Build project
npm run build

# Run all tests
npm run test:coverage

# Check coverage
open coverage/lcov-report/index.html
# Should show 80%+ coverage
```

### Verify MCP Tools

```bash
# Start MCP server
npm run mcp

# List tools (in another terminal)
echo '{"method":"tools/list"}' | node dist/mcp/server.js

# Should show 23 tools total
```

### Verify Service Integration

```bash
# Check service health
curl http://localhost:21000/health/detailed

# List worktrees
curl http://localhost:21000/api/v1/worktrees

# List swarms
curl http://localhost:21000/api/v1/swarms

# Check metrics endpoint
curl http://localhost:21000/metrics
```

## Next Steps After Completion

Once all phases (6-11) are complete:

1. **Review implementation:**
   ```bash
   git diff feature/typescript-rewrite
   ```

2. **Run integration tests:**
   ```bash
   npm run test:integration
   ```

3. **Manual testing:**
   - Test worktree creation end-to-end
   - Test epic tracking with GitHub
   - Test evidence collection
   - Test tunnel provisioning

4. **Update documentation:**
   - Update CHANGELOG.md with phases 6-11
   - Update README.md with new features
   - Document new MCP tools

5. **Prepare for Phase 12 (Cutover):**
   - Create cutover plan
   - Backup Python service state
   - Plan downtime window
   - Prepare rollback procedure

6. **Merge to main:**
   ```bash
   git checkout main
   git merge feature/typescript-rewrite
   git push origin main
   ```

## Support

If you encounter issues:
1. Check logs: `.claude-flow/progress.log`
2. Check state: `.swarm/state.json`
3. Check Martha service: `http://localhost:21000/health`
4. Review task definitions: `.claude-flow/tasks/*.md`

## Telemetry

Swarm execution data is sent to Braintrust:
- Project: martha-typescript-migration
- Experiment: phases-6-11
- Tags: migration, typescript, parallel-execution

View traces: https://braintrust.dev
