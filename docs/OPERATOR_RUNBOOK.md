# Martha.dev v4 Platform - Operator Runbook

**Version:** 4.0.0
**Last Updated:** January 2026
**Audience:** DevOps Engineers, SREs, System Administrators

## Table of Contents

1. [Quick Reference](#quick-reference)
2. [Starting Services](#starting-services)
3. [Monitoring](#monitoring)
4. [Common Operations](#common-operations)
5. [Troubleshooting](#troubleshooting)
6. [Incident Response](#incident-response)
7. [Maintenance Tasks](#maintenance-tasks)
8. [Backup & Recovery](#backup--recovery)
9. [Performance Tuning](#performance-tuning)

---

## Quick Reference

### Service Endpoints

| Service | URL | Port | Health Check |
|---------|-----|------|--------------|
| API Server | http://localhost:21009 | 21009 | `GET /health` |
| Dashboard | http://localhost:21009 | 21009 | `GET /` |
| TimescaleDB | postgresql://localhost:21006 | 21006 | `SELECT 1` |
| Redis | redis://localhost:21007 | 21007 | `PING` |
| Temporal Cloud | ap-northeast-1.aws.api.temporal.io | 7233 | Web UI |

### Critical Paths

```bash
# Installation directory
/mnt/data/martha.dev-v4-orchestration/

# Configuration
/mnt/data/martha.dev-v4-orchestration/.env.local

# Logs
/var/log/martha/api.log
/var/log/martha/worker.log

# Database backups
/var/backups/martha/timescaledb/

# SSL certificates (for Temporal Cloud)
/mnt/data/martha.dev-v4-orchestration/config/certs/
```

### Emergency Contacts

- **Platform Lead**: [Your Name] - [email/slack]
- **On-Call Engineer**: PagerDuty rotation
- **Temporal Support**: support@temporal.io (Enterprise SLA)

---

## Starting Services

### Option 1: Temporal Cloud (Recommended for Production)

Temporal Cloud is a fully-managed service that eliminates the need to run your own Temporal server.

#### Prerequisites

1. **Temporal Cloud Account**
   - Sign up at https://cloud.temporal.io
   - Create a namespace (e.g., `martha-dev-v4.mnjo7`)
   - Note your namespace ID and region

2. **Generate API Key**
   ```bash
   # Via Temporal Cloud web UI:
   # Settings → API Keys → Create API Key
   # Copy the key immediately (only shown once)
   ```

3. **Download Certificates** (if using mTLS)
   ```bash
   # Via Temporal Cloud web UI:
   # Settings → Certificates → Download CA Certificate

   mkdir -p config/certs
   # Save ca-cert.pem to config/certs/
   ```

#### Configuration

Edit `.env.local`:

```bash
# Temporal Cloud Configuration
TEMPORAL_ADDRESS=ap-northeast-1.aws.api.temporal.io:7233
TEMPORAL_NAMESPACE=martha-dev-v4.mnjo7
TEMPORAL_TASK_QUEUE=martha-tasks

# Authentication (choose ONE method)

# Method 1: API Key (Recommended - simpler)
TEMPORAL_API_KEY=your-api-key-here

# Method 2: mTLS Certificates
TEMPORAL_TLS_CERT_PATH=/path/to/client-cert.pem
TEMPORAL_TLS_KEY_PATH=/path/to/client-key.pem
TEMPORAL_TLS_CA_CERT_PATH=/path/to/ca-cert.pem

# Namespace must match your Cloud namespace
```

#### Start Worker

```bash
cd /mnt/data/martha.dev-v4-orchestration

# Build the worker
npm run worker:build

# Start worker (connects to Temporal Cloud)
npm run worker:start

# Or use systemd for production
sudo systemctl start martha-worker
sudo systemctl status martha-worker
```

Verify connection:

```bash
# Check worker logs
tail -f /var/log/martha/worker.log

# Look for:
# [INFO] Starting Temporal worker
# [INFO] Connecting to Temporal Cloud with API key
# [INFO] Temporal worker created, starting run loop
```

#### Verify in Temporal Cloud UI

1. Navigate to https://cloud.temporal.io
2. Select your namespace
3. Go to "Workers" tab
4. Verify worker shows as "Online" with task queue "martha-tasks"

### Option 2: Self-Hosted Temporal (Development/Testing)

For local development or testing, run Temporal using Docker Compose.

#### Start Temporal Server

```bash
cd /mnt/data/martha.dev-v4-orchestration

# Start Temporal + dependencies
docker-compose -f docker-compose.temporal.yml up -d

# Verify services
docker-compose -f docker-compose.temporal.yml ps

# Should show:
# temporal-server    (port 7233)
# temporal-web       (port 8088)
# postgresql         (internal)
# elasticsearch      (internal)
```

#### Configuration

Edit `.env.local`:

```bash
# Self-Hosted Temporal
TEMPORAL_ADDRESS=localhost:7233
TEMPORAL_NAMESPACE=default
TEMPORAL_TASK_QUEUE=martha-tasks

# No authentication needed for local development
```

#### Start Worker

```bash
npm run worker:start
```

#### Access Temporal Web UI

Open browser: http://localhost:8088

### Start TimescaleDB

```bash
cd /mnt/data/martha.dev-v4-orchestration

# Start database
docker-compose -f docker-compose.db.yml up -d

# Verify
docker-compose -f docker-compose.db.yml ps
# Should show: timescaledb (port 21006)

# Test connection
psql postgresql://archie_user:password@localhost:21006/martha_development -c "SELECT version();"
```

### Start API Server

```bash
cd /mnt/data/martha.dev-v4-orchestration

# Build
npm run build

# Start server
npm start

# Or use systemd
sudo systemctl start martha-api
sudo systemctl status martha-api
```

### Verify All Services

```bash
# API health check
curl http://localhost:21009/health

# Expected response:
# {"status":"ok","timestamp":"...","service":"martha-orchestration","version":"3.0.0"}

# Database connectivity
curl http://localhost:21009/health/ready

# Expected response:
# {"ready":true,"timestamp":"..."}

# Dashboard
curl -I http://localhost:21009/
# Expected: HTTP/1.1 200 OK
```

---

## Monitoring

### Health Checks

#### API Server

```bash
# Liveness
curl http://localhost:21009/health

# Readiness (includes database check)
curl http://localhost:21009/health/ready
```

#### Temporal Cloud

```bash
# Web UI health
curl -I https://cloud.temporal.io

# Programmatic check
npm run temporal:client
# Expected: "Connected!"
```

#### TimescaleDB

```bash
# Connection test
psql postgresql://archie_user:password@localhost:21006/martha_development -c "SELECT NOW();"

# Database size
psql postgresql://archie_user:password@localhost:21006/martha_development -c "
  SELECT pg_size_pretty(pg_database_size('martha_development'));
"

# Hypertable health
psql postgresql://archie_user:password@localhost:21006/martha_development -c "
  SELECT * FROM timescaledb_information.hypertables;
"
```

#### Temporal Worker

```bash
# Check process
ps aux | grep "node.*worker"

# Check logs
tail -f /var/log/martha/worker.log

# Systemd status
sudo systemctl status martha-worker
```

### Logs

#### API Server Logs

```bash
# Real-time
tail -f /var/log/martha/api.log

# Filter by level
cat /var/log/martha/api.log | grep '"level":50'  # Errors only
cat /var/log/martha/api.log | grep '"level":40'  # Warnings only

# JSON parsing with jq
cat /var/log/martha/api.log | jq -r '. | select(.level >= 50) | .msg'
```

#### Worker Logs

```bash
# Real-time
tail -f /var/log/martha/worker.log

# Activity failures
cat /var/log/martha/worker.log | grep "activity_failed"

# Workflow errors
cat /var/log/martha/worker.log | grep "workflow_failed"
```

#### Temporal Cloud Logs

Access via web UI:
1. Navigate to https://cloud.temporal.io
2. Select namespace
3. Click "Workflows" tab
4. Click on workflow ID
5. View "Event History" and "Task Queue" tabs

### Metrics

#### Query Telemetry API

```bash
# Recent events
curl http://localhost:21009/api/v1/telemetry/events?limit=10 | jq

# Agent metrics
curl http://localhost:21009/api/v1/telemetry/agent-metrics | jq

# Exceptions
curl http://localhost:21009/api/v1/telemetry/exceptions | jq

# Workflows
curl http://localhost:21009/api/v1/telemetry/workflows | jq

# Aggregated metrics (1min buckets)
curl http://localhost:21009/api/v1/telemetry/metrics/1min | jq
```

#### Database Queries

```bash
# Event count by category
psql postgresql://archie_user:password@localhost:21006/martha_development -c "
  SELECT event_category, COUNT(*)
  FROM telemetry_events
  GROUP BY event_category
  ORDER BY COUNT(*) DESC;
"

# Error rate (last 24 hours)
psql postgresql://archie_user:password@localhost:21006/martha_development -c "
  SELECT
    COUNT(*) FILTER (WHERE severity = 'error') AS errors,
    COUNT(*) AS total,
    ROUND(100.0 * COUNT(*) FILTER (WHERE severity = 'error') / COUNT(*), 2) AS error_rate_pct
  FROM telemetry_events
  WHERE timestamp > NOW() - INTERVAL '24 hours';
"

# Top agents by performance
psql postgresql://archie_user:password@localhost:21006/martha_development -c "
  SELECT
    agent_id,
    COUNT(*) AS issues_completed,
    AVG(duration_ms) AS avg_duration_ms,
    AVG(test_pass_rate) AS avg_test_pass_rate
  FROM agent_performance
  WHERE completed_at > NOW() - INTERVAL '7 days'
  GROUP BY agent_id
  ORDER BY issues_completed DESC
  LIMIT 10;
"
```

---

## Common Operations

### Deploy Worker

```bash
# 1. Pull latest code
cd /mnt/data/martha.dev-v4-orchestration
git pull origin main

# 2. Install dependencies
npm install

# 3. Build
npm run worker:build

# 4. Restart worker (zero downtime with systemd)
sudo systemctl restart martha-worker

# 5. Verify
sudo systemctl status martha-worker
tail -f /var/log/martha/worker.log
```

### Deploy API Server

```bash
# 1. Pull latest code
git pull origin main

# 2. Install dependencies
npm install

# 3. Build
npm run build

# 4. Restart API (zero downtime with multiple instances)
sudo systemctl restart martha-api

# 5. Verify
curl http://localhost:21009/health
```

### Trigger Workflow

```bash
# Via Temporal CLI (requires tcld)
tcld workflow start \
  --namespace martha-dev-v4.mnjo7 \
  --task-queue martha-tasks \
  --workflow-type IssueLifecycleWorkflow \
  --workflow-id issue-TASK-123 \
  --input '{"id":"TASK-123","title":"Fix bug","epicId":"EPIC-1"}'

# Or use the API (if trigger endpoint exists)
curl -X POST http://localhost:21009/api/v1/workflows \
  -H "Content-Type: application/json" \
  -d '{
    "workflowType": "IssueLifecycleWorkflow",
    "workflowId": "issue-TASK-123",
    "input": {
      "id": "TASK-123",
      "title": "Fix bug",
      "epicId": "EPIC-1"
    }
  }'
```

### Query Workflow Status

```bash
# Via Temporal CLI
tcld workflow describe \
  --namespace martha-dev-v4.mnjo7 \
  --workflow-id issue-TASK-123

# Via Temporal Cloud UI
# 1. Go to https://cloud.temporal.io
# 2. Select namespace
# 3. Search for workflow ID
```

### Send Signal to Workflow

```bash
# Agent started signal
tcld workflow signal \
  --namespace martha-dev-v4.mnjo7 \
  --workflow-id issue-TASK-123 \
  --name agentStarted \
  --input '{"agentId":"agent-xyz","startTime":1234567890}'

# Commit made signal
tcld workflow signal \
  --namespace martha-dev-v4.mnjo7 \
  --workflow-id issue-TASK-123 \
  --name commitMade \
  --input '{"sha":"abc123","message":"fix: bug","files":["src/app.ts"]}'

# Test results signal
tcld workflow signal \
  --namespace martha-dev-v4.mnjo7 \
  --workflow-id issue-TASK-123 \
  --name testResults \
  --input '{"passed":10,"failed":0}'

# Review approved signal
tcld workflow signal \
  --namespace martha-dev-v4.mnjo7 \
  --workflow-id issue-TASK-123 \
  --name reviewApproved
```

### Cancel Workflow

```bash
# Graceful cancellation
tcld workflow cancel \
  --namespace martha-dev-v4.mnjo7 \
  --workflow-id issue-TASK-123

# Forceful termination (USE WITH CAUTION)
tcld workflow terminate \
  --namespace martha-dev-v4.mnjo7 \
  --workflow-id issue-TASK-123 \
  --reason "Manual intervention required"
```

---

## Troubleshooting

### Worker Not Connecting to Temporal Cloud

**Symptoms**:
- Worker logs show connection errors
- No workers visible in Temporal Cloud UI
- Workflows not progressing

**Diagnosis**:

```bash
# Check worker logs
tail -f /var/log/martha/worker.log

# Look for errors like:
# "Failed to connect to Temporal Cloud"
# "Authentication failed"
# "Certificate verification failed"
```

**Solutions**:

1. **Verify credentials**:
   ```bash
   # Check .env.local
   grep TEMPORAL_API_KEY /mnt/data/martha.dev-v4-orchestration/.env.local

   # Ensure API key is valid (not expired)
   # Regenerate if needed via Temporal Cloud UI
   ```

2. **Check network connectivity**:
   ```bash
   # Test connection to Temporal Cloud
   telnet ap-northeast-1.aws.api.temporal.io 7233

   # Should connect (press Ctrl+C to exit)
   # If timeout, check firewall rules
   ```

3. **Verify namespace**:
   ```bash
   # Ensure namespace in .env.local matches Cloud console
   grep TEMPORAL_NAMESPACE /mnt/data/martha.dev-v4-orchestration/.env.local
   ```

4. **Restart worker**:
   ```bash
   sudo systemctl restart martha-worker
   sudo systemctl status martha-worker
   ```

### Workflow Stuck

**Symptoms**:
- Workflow shows as "Running" but not progressing
- No recent events in Event History
- Activities timing out

**Diagnosis**:

1. **Check Temporal Cloud UI**:
   - Navigate to workflow
   - View "Event History"
   - Look for last event timestamp

2. **Check worker logs**:
   ```bash
   tail -f /var/log/martha/worker.log | grep "TASK-123"
   ```

**Solutions**:

1. **Worker not running**:
   ```bash
   sudo systemctl restart martha-worker
   ```

2. **Activity timeout**:
   - Check activity StartToClose timeout (default: 30 minutes)
   - If legitimate long-running task, send heartbeat from activity
   - Or cancel and retry workflow

3. **Waiting for signal**:
   - Check if workflow is waiting for external signal (agentStarted, testResults, etc.)
   - Send signal manually if needed (see "Send Signal" section)

4. **Dependencies not met**:
   - For BatchCoordinator, check if waiting for dependency issue to complete
   - Review dependency graph in workflow input

### Database Connection Errors

**Symptoms**:
- API returns 503 Service Unavailable
- `/health/ready` fails
- Worker can't write telemetry

**Diagnosis**:

```bash
# Test database connection
psql postgresql://archie_user:password@localhost:21006/martha_development -c "SELECT 1;"

# Check database service
docker-compose -f docker-compose.db.yml ps

# Check logs
docker-compose -f docker-compose.db.yml logs timescaledb
```

**Solutions**:

1. **Database not running**:
   ```bash
   docker-compose -f docker-compose.db.yml up -d
   ```

2. **Wrong credentials**:
   ```bash
   # Verify credentials in .env.local
   grep DATABASE_URL /mnt/data/martha.dev-v4-orchestration/.env.local
   ```

3. **Connection limit reached**:
   ```sql
   -- Check active connections
   SELECT COUNT(*) FROM pg_stat_activity WHERE datname = 'martha_development';

   -- Kill idle connections (if needed)
   SELECT pg_terminate_backend(pid)
   FROM pg_stat_activity
   WHERE datname = 'martha_development'
   AND state = 'idle'
   AND state_change < NOW() - INTERVAL '10 minutes';
   ```

4. **Disk full**:
   ```bash
   df -h
   # If /var/lib/docker is full, clean up old data
   docker system prune -a
   ```

### High Error Rate

**Symptoms**:
- Dashboard shows many exceptions
- Workflows failing repeatedly
- Alert notifications firing

**Diagnosis**:

```bash
# Query recent exceptions
curl http://localhost:21009/api/v1/telemetry/exceptions?limit=50 | jq

# Check error rate
psql postgresql://archie_user:password@localhost:21006/martha_development -c "
  SELECT
    DATE_TRUNC('hour', timestamp) AS hour,
    COUNT(*) FILTER (WHERE severity = 'error') AS errors,
    COUNT(*) AS total
  FROM telemetry_events
  WHERE timestamp > NOW() - INTERVAL '24 hours'
  GROUP BY hour
  ORDER BY hour DESC;
"
```

**Solutions**:

1. **Identify root cause**:
   - Group exceptions by error message
   - Find most common failure pattern
   - Review stack traces

2. **Common issues**:
   - **Tests failing**: Fix code, redeploy agents
   - **Git merge conflicts**: Manual intervention needed
   - **API rate limits**: Add exponential backoff
   - **External service down**: Check Temporal Cloud, GitHub status

3. **Temporary mitigation**:
   ```bash
   # Pause new workflow starts
   # (No built-in pause - use task queue isolation)

   # Fix issue
   # ...

   # Restart failed workflows
   tcld workflow reset --namespace martha-dev-v4.mnjo7 --workflow-id issue-TASK-123
   ```

---

## Incident Response

### P1: Complete System Outage

**Actions** (within 5 minutes):

1. **Alert team via PagerDuty**
2. **Update status page**
3. **Check Temporal Cloud status**: https://status.temporal.io
4. **Verify infrastructure**:
   ```bash
   # Check all services
   sudo systemctl status martha-api
   sudo systemctl status martha-worker
   docker-compose -f docker-compose.db.yml ps
   ```
5. **Review logs for errors**
6. **Restart services if needed**
7. **Escalate to Temporal support if Cloud issue**

### P2: Degraded Performance

**Actions** (within 15 minutes):

1. **Identify bottleneck**:
   - High database CPU?
   - Worker at max capacity?
   - API request latency?

2. **Scale appropriately**:
   ```bash
   # Add more workers
   sudo systemctl start martha-worker@2
   sudo systemctl start martha-worker@3

   # Or use horizontal scaling with load balancer
   ```

3. **Monitor improvement**
4. **Document root cause**

### P3: Individual Workflow Failures

**Actions** (within 1 hour):

1. **Investigate failure**:
   - View workflow in Temporal Cloud UI
   - Check Event History
   - Review error messages

2. **Fix data/code issue**
3. **Reset or retry workflow**
4. **Monitor for recurrence**

---

## Maintenance Tasks

### Daily

```bash
# Check system health
curl http://localhost:21009/health

# Review error logs
cat /var/log/martha/api.log | grep '"level":50' | tail -20

# Monitor disk usage
df -h
```

### Weekly

```bash
# Review agent performance
psql postgresql://archie_user:password@localhost:21006/martha_development -c "
  SELECT
    agent_id,
    COUNT(*) AS completed,
    AVG(test_pass_rate) AS avg_pass_rate
  FROM agent_performance
  WHERE completed_at > NOW() - INTERVAL '7 days'
  GROUP BY agent_id;
"

# Check database size
psql postgresql://archie_user:password@localhost:21006/martha_development -c "
  SELECT pg_size_pretty(pg_database_size('martha_development'));
"

# Vacuum database
psql postgresql://archie_user:password@localhost:21006/martha_development -c "VACUUM ANALYZE;"
```

### Monthly

```bash
# Rotate logs
sudo logrotate /etc/logrotate.d/martha

# Update dependencies
cd /mnt/data/martha.dev-v4-orchestration
npm audit
npm update

# Review Temporal Cloud usage
# (via Cloud UI → Settings → Usage)

# Backup database (see Backup section)
```

---

## Backup & Recovery

### TimescaleDB Backup

```bash
# Daily automated backup (add to cron)
0 2 * * * /mnt/data/martha.dev-v4-orchestration/scripts/backup-db.sh

# Manual backup
pg_dump postgresql://archie_user:password@localhost:21006/martha_development \
  --format=custom \
  --file=/var/backups/martha/timescaledb/backup-$(date +\%Y\%m\%d-\%H\%M\%S).dump

# Verify backup
pg_restore --list /var/backups/martha/timescaledb/backup-*.dump
```

### Restore from Backup

```bash
# Stop services
sudo systemctl stop martha-api
sudo systemctl stop martha-worker

# Drop and recreate database
psql postgresql://archie_user:password@localhost:21006/postgres -c "DROP DATABASE martha_development;"
psql postgresql://archie_user:password@localhost:21006/postgres -c "CREATE DATABASE martha_development;"

# Restore
pg_restore \
  --dbname=postgresql://archie_user:password@localhost:21006/martha_development \
  --jobs=4 \
  /var/backups/martha/timescaledb/backup-20260115-020000.dump

# Restart services
sudo systemctl start martha-worker
sudo systemctl start martha-api
```

### Configuration Backup

```bash
# Backup environment files
cp .env.local /var/backups/martha/config/.env.local-$(date +\%Y\%m\%d)

# Backup certificates
tar -czf /var/backups/martha/config/certs-$(date +\%Y\%m\%d).tar.gz config/certs/
```

---

## Performance Tuning

### Worker Tuning

Edit `.env.local`:

```bash
# Increase concurrent executions
TEMPORAL_MAX_CONCURRENT_WORKFLOWS=200  # Default: 100
TEMPORAL_MAX_CONCURRENT_ACTIVITIES=200  # Default: 100

# Restart worker
sudo systemctl restart martha-worker
```

### Database Tuning

```sql
-- Increase connection pool
ALTER SYSTEM SET max_connections = 200;  -- Default: 100

-- Increase cache
ALTER SYSTEM SET shared_buffers = '2GB';  -- Default: 128MB

-- Reload config
SELECT pg_reload_conf();
```

### Compression Policies

```sql
-- Compress older data more aggressively
SELECT add_compression_policy('telemetry_events', INTERVAL '3 days');  -- Default: 7 days

-- Adjust retention
SELECT add_retention_policy('telemetry_events', INTERVAL '60 days');  -- Default: 90 days
```

---

**For more information**, see:
- System Overview: `SYSTEM_OVERVIEW.md`
- Developer Guide: `DEVELOPER_GUIDE.md`
- API Reference: `API_REFERENCE.md`
