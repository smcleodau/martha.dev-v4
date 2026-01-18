# Production Runbook
**Epic 7.4: Production Hardening**

Quick reference guide for operating Martha.dev v4 in production.

## Quick Start Commands

### Start Services
```bash
# Start main application
pm2 start dist/src/index.js --name martha-orchestration

# Start Temporal worker
pm2 start dist/temporal/worker.js --name martha-worker

# View logs
pm2 logs martha-orchestration

# Monitor processes
pm2 monit
```

### Health Checks
```bash
# Application health
curl http://localhost:21009/health

# Metrics
curl http://localhost:21009/metrics

# Database connection
psql $DATABASE_URL -c "SELECT NOW();"
```

## Common Operations

### View Error Statistics
```bash
# Recent errors (last hour)
curl http://localhost:21009/api/metrics/json | jq '.metrics[] | select(.name | contains("error"))'

# Database query
psql $DATABASE_URL -c "
  SELECT exception_type, COUNT(*)
  FROM ts_martha.exceptions
  WHERE detected_at > NOW() - INTERVAL '1 hour'
  GROUP BY exception_type;
"
```

### Monitor Workflows
```bash
# Active workflows
curl http://localhost:21009/api/workflows/active

# Recent completions
curl http://localhost:21009/api/workflows/recent?limit=10
```

### Database Maintenance
```bash
# Run optimization analysis
npm run db:analyze

# Apply indexes
npm run db:migrate

# Vacuum analyze
psql $DATABASE_URL -c "VACUUM ANALYZE;"
```

## Troubleshooting

### High Error Rate
1. Check error monitor:
   ```bash
   curl http://localhost:21009/api/errors/statistics
   ```

2. Review recent errors:
   ```bash
   psql $DATABASE_URL -c "
     SELECT * FROM ts_martha.exceptions
     WHERE detected_at > NOW() - INTERVAL '5 minutes'
     ORDER BY detected_at DESC LIMIT 10;
   "
   ```

3. Check for alerts:
   ```bash
   pm2 logs martha-orchestration | grep "Error alert"
   ```

### Slow Queries
1. Check query performance:
   ```bash
   psql $DATABASE_URL -c "
     SELECT query, calls, mean_exec_time, total_exec_time
     FROM pg_stat_statements
     ORDER BY mean_exec_time DESC LIMIT 10;
   "
   ```

2. Review index usage:
   ```bash
   psql $DATABASE_URL -c "
     SELECT * FROM ts_martha.slow_query_monitor
     WHERE status != 'HEALTHY';
   "
   ```

### Memory Issues
1. Check memory usage:
   ```bash
   pm2 info martha-orchestration
   ```

2. Review memory metrics:
   ```bash
   curl http://localhost:21009/metrics | grep "nodejs_heap"
   ```

3. Check for memory leaks:
   ```bash
   npm run load-test
   cat load-test-report.md | grep "Memory"
   ```

### High Latency
1. Check P95 latency:
   ```bash
   curl http://localhost:21009/metrics | grep "http_request_duration.*0.95"
   ```

2. Review slow workflows:
   ```bash
   psql $DATABASE_URL -c "
     SELECT workflow_id, duration_ms
     FROM ts_martha.telemetry_metadata
     WHERE duration_ms > 10000
     ORDER BY duration_ms DESC LIMIT 10;
   "
   ```

## Alerting

### Configure Alerts
Edit alert thresholds in error monitor:
```typescript
const thresholds = {
  criticalErrorsPerMinute: 5,
  highErrorsPerMinute: 10,
  errorRatePercentage: 10,
  consecutiveFailures: 3,
};
```

### Alert Response Procedures

**Critical Error Alert**:
1. Check error dashboard
2. Review recent exceptions
3. Check for system outages
4. Escalate if needed

**High Error Rate Alert**:
1. Identify error type
2. Check affected workflows
3. Review recent deployments
4. Apply hotfix if needed

**Memory Leak Alert**:
1. Check memory metrics
2. Review heap dump
3. Identify leaking objects
4. Plan restart if confirmed

## Backup & Recovery

### Database Backup
```bash
# Full backup
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d-%H%M%S).sql

# Schema only
pg_dump --schema-only $DATABASE_URL > schema.sql
```

### Restore
```bash
# Restore from backup
psql $DATABASE_URL < backup.sql
```

## Performance Tuning

### Database Tuning
```bash
# Update statistics
psql $DATABASE_URL -c "ANALYZE;"

# Rebuild indexes
psql $DATABASE_URL -c "REINDEX DATABASE martha_development;"

# Check bloat
psql $DATABASE_URL -c "
  SELECT schemaname, tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
  FROM pg_tables
  WHERE schemaname = 'ts_martha'
  ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
"
```

### Application Tuning
```bash
# Adjust worker concurrency
# Edit .env.local:
TEMPORAL_MAX_CONCURRENT_WORKFLOW_EXECUTIONS=10
TEMPORAL_MAX_CONCURRENT_ACTIVITY_EXECUTIONS=20

# Restart worker
pm2 restart martha-worker
```

## Monitoring URLs

- **Health**: http://localhost:21009/health
- **Metrics**: http://localhost:21009/metrics
- **Grafana**: http://localhost:3000 (if configured)
- **Temporal UI**: https://cloud.temporal.io/

## Contact Information

**On-Call**: [Your Team]
**Slack**: #martha-production
**Escalation**: [Manager Email]

## Additional Resources

- [Production Deployment Checklist](./PRODUCTION-DEPLOYMENT-CHECKLIST.md)
- [Epic 7.4 Summary](./EPIC-7.4-PRODUCTION-HARDENING.md)
- [Error Handling Guide](./ERROR-HANDLING.md)
- [Database Optimization](./DATABASE-OPTIMIZATION.md)
