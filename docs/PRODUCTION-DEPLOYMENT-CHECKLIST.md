# Production Deployment Checklist
**Epic 7.4: Production Hardening - TASK-7.4.6**

Generated: 2026-01-18
Version: 1.0.0

## Pre-Deployment Checklist

### 1. Infrastructure Setup
- [ ] TimescaleDB instance provisioned (port 21006)
- [ ] Redis instance provisioned (for caching/sessions)
- [ ] Temporal Cloud namespace configured
  - [ ] Namespace: `martha-dev-v4.mnjo7`
  - [ ] Region: `ap-northeast-1`
  - [ ] API key configured
- [ ] Application server provisioned
  - [ ] Minimum 4GB RAM, 2 CPUs
  - [ ] Node.js 18+ installed
  - [ ] Port 21009 available

### 2. Database Setup
- [ ] TimescaleDB migrations applied
  ```bash
  npm run db:migrate
  ```
- [ ] Database indexes optimized (migration 008)
- [ ] Connection pool configured (max: 20 connections)
- [ ] Database backups configured
- [ ] Query performance monitoring enabled

### 3. Environment Configuration
- [ ] `.env.local` file created with production values
- [ ] Required environment variables set:
  - [ ] `DATABASE_URL` - TimescaleDB connection string
  - [ ] `TEMPORAL_ADDRESS` - Temporal Cloud address
  - [ ] `TEMPORAL_NAMESPACE` - Temporal namespace
  - [ ] `TEMPORAL_API_KEY` - Temporal API key (if using Cloud)
  - [ ] `SERVICE_PORT` - Application port (default: 21009)
  - [ ] `NODE_ENV=production`
  - [ ] `REDIS_URL` - Redis connection string
- [ ] Secrets properly secured (not in version control)
- [ ] TLS certificates configured

### 4. Security Hardening
- [ ] Rate limiting enabled
- [ ] Input validation middleware active
- [ ] SQL injection prevention implemented
- [ ] XSS protection enabled
- [ ] Security headers configured (helmet)
- [ ] CORS properly configured for production domains
- [ ] Authentication/Authorization implemented
- [ ] API keys generated and distributed
- [ ] HTTPS enforced

### 5. Observability Setup
- [ ] Prometheus metrics endpoint exposed (`/metrics`)
- [ ] Grafana dashboards imported:
  - [ ] System Health dashboard
  - [ ] Workflow Metrics dashboard
  - [ ] Database Performance dashboard
- [ ] OpenTelemetry tracing configured
- [ ] Error monitoring enabled
- [ ] Alerting rules configured:
  - [ ] Critical error rate threshold
  - [ ] High error rate threshold
  - [ ] Memory leak detection
  - [ ] Database connection pool exhaustion
- [ ] Log aggregation configured (ELK/Datadog/CloudWatch)

### 6. Application Build
- [ ] Dependencies installed
  ```bash
  npm ci --production
  ```
- [ ] TypeScript compiled
  ```bash
  npm run build
  ```
- [ ] Build artifacts verified in `dist/` directory
- [ ] Source maps generated (for debugging)

### 7. Testing
- [ ] Unit tests passing
  ```bash
  npm run test:unit
  ```
- [ ] Integration tests passing
  ```bash
  npm run test:integration
  ```
- [ ] Load test completed successfully
  ```bash
  npm run load-test
  ```
- [ ] Load test metrics review:
  - [ ] Success rate > 95%
  - [ ] P95 latency < 1s
  - [ ] No memory leaks detected

## Deployment Steps

### 1. Stop Existing Service (if upgrading)
```bash
# Graceful shutdown with SIGTERM
pm2 stop martha-orchestration
# OR
systemctl stop martha-orchestration
```

### 2. Deploy Application
```bash
# Pull latest code
git pull origin main

# Install dependencies
npm ci --production

# Build application
npm run build

# Run database migrations
npm run db:migrate
```

### 3. Start Application
```bash
# Using PM2 (recommended)
pm2 start dist/src/index.js --name martha-orchestration

# OR using systemd
systemctl start martha-orchestration

# OR direct start
npm run start
```

### 4. Start Temporal Worker
```bash
pm2 start dist/temporal/worker.js --name martha-worker

# OR
systemctl start martha-worker
```

### 5. Verify Deployment
- [ ] Application started successfully
- [ ] Health check passing
  ```bash
  curl http://localhost:21009/health
  ```
- [ ] Metrics endpoint responding
  ```bash
  curl http://localhost:21009/metrics
  ```
- [ ] Database connection pool healthy
- [ ] Temporal worker connected
- [ ] No errors in logs

## Post-Deployment Verification

### 1. Critical Path Testing
- [ ] Workflow execution test
  ```bash
  npm run test:integration
  ```
- [ ] API endpoint tests
  - [ ] GET /health - returns 200
  - [ ] GET /metrics - returns Prometheus metrics
  - [ ] POST /api/workflows - creates workflow
  - [ ] GET /api/tracker/board - returns board data
- [ ] Database query performance
  ```bash
  npm run db:analyze
  ```

### 2. Monitoring Verification
- [ ] Prometheus scraping metrics successfully
- [ ] Grafana dashboards displaying data
- [ ] Error monitoring receiving events
- [ ] Alerting rules active
- [ ] Log aggregation working

### 3. Performance Baseline
- [ ] Record baseline metrics:
  - [ ] Average response time: __________
  - [ ] P95 response time: __________
  - [ ] Memory usage: __________
  - [ ] CPU usage: __________
  - [ ] Database connections: __________
- [ ] Compare with pre-deployment metrics
- [ ] Verify no performance degradation

### 4. Security Audit
- [ ] Run security scan
  ```bash
  npm audit
  ```
- [ ] Verify rate limiting working
  ```bash
  # Send 100 rapid requests, should get 429 after limit
  for i in {1..100}; do curl http://localhost:21009/api/health; done
  ```
- [ ] Verify input validation
  ```bash
  # Send malicious input, should get 400
  curl -X POST http://localhost:21009/api/test -d '{"name":"<script>alert(1)</script>"}'
  ```
- [ ] SSL/TLS certificate valid
- [ ] No secrets in logs or responses

## Rollback Plan

### If Deployment Fails
1. Stop new service
   ```bash
   pm2 stop martha-orchestration
   ```

2. Restore previous version
   ```bash
   git checkout <previous-tag>
   npm ci --production
   npm run build
   ```

3. Rollback database migrations (if needed)
   ```bash
   npm run db:rollback
   ```

4. Start previous version
   ```bash
   pm2 start dist/src/index.js
   ```

5. Verify rollback successful
   ```bash
   curl http://localhost:21009/health
   ```

## Monitoring Checklist (First 24 Hours)

### Hour 1
- [ ] Check error rate (should be < 1%)
- [ ] Check response times (P95 < 1s)
- [ ] Check memory usage (should be stable)
- [ ] Review error logs for unexpected issues
- [ ] Verify all critical workflows running

### Hour 6
- [ ] Review error trends
- [ ] Check for memory leaks
- [ ] Verify database performance
- [ ] Review alert history
- [ ] Check worker health

### Hour 24
- [ ] Generate daily metrics report
- [ ] Compare with previous day
- [ ] Review all alerts triggered
- [ ] Check for any degradation
- [ ] Document any issues

## Production Readiness Assessment

| Category | Status | Notes |
|----------|--------|-------|
| Error Handling | ✅ | Comprehensive error boundaries, retries, monitoring |
| Database Performance | ✅ | Indexes optimized, query performance monitored |
| Observability | ✅ | Prometheus metrics, Grafana dashboards, tracing |
| Security | ✅ | Rate limiting, input validation, SQL injection prevention |
| Load Testing | ✅ | 50 concurrent workflows, P95 < 1s, no memory leaks |
| Documentation | ✅ | Deployment checklist, runbooks, architecture docs |

## Contact Information

**On-Call Engineer**: [Your Name]
**Email**: [your-email@example.com]
**Slack Channel**: #martha-production

## Additional Resources

- [Error Handling Documentation](./ERROR-HANDLING.md)
- [Database Optimization Report](./DATABASE-OPTIMIZATION.md)
- [Observability Setup Guide](./OBSERVABILITY.md)
- [Security Audit Report](./SECURITY-AUDIT.md)
- [Load Test Report](../load-test-report.md)
