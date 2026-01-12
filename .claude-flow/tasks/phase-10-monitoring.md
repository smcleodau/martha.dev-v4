# Phase 10: Monitoring & Metrics

## Goal
Implement Prometheus metrics export and Grafana dashboards.

## Tasks

### 1. Implement Prometheus Metrics (`src/integrations/prometheus/metrics.ts`)

**Metrics to Export:**

**Service Metrics:**
- `martha_http_requests_total` (counter) - Total HTTP requests by endpoint, method, status
- `martha_http_request_duration_seconds` (histogram) - Request latency
- `martha_websocket_connections_total` (gauge) - Active WebSocket connections
- `martha_redis_operations_total` (counter) - Redis operations by type
- `martha_database_queries_total` (counter) - Database queries by type

**Worktree Metrics:**
- `martha_worktrees_total` (gauge) - Total worktrees by status
- `martha_worktree_events_total` (counter) - Events by worktree and type
- `martha_worktree_agent_health` (gauge) - Agent health status (0=offline, 1=online)
- `martha_container_health` (gauge) - Container health by worktree

**Swarm Metrics:**
- `martha_swarms_active` (gauge) - Active swarms by status
- `martha_swarm_agent_count` (gauge) - Number of agents per swarm
- `martha_swarm_task_count` (gauge) - Number of tasks per swarm
- `martha_swarm_resource_usage` (gauge) - CPU/memory by swarm

**MCP Metrics:**
- `martha_mcp_tool_calls_total` (counter) - Tool calls by tool name
- `martha_mcp_tool_duration_seconds` (histogram) - Tool execution time
- `martha_mcp_tool_errors_total` (counter) - Tool errors by tool name

**Implementation:**
```typescript
import { Registry, Counter, Histogram, Gauge } from 'prom-client';

export class PrometheusMetrics {
  private registry: Registry;
  private httpRequests: Counter;
  private httpDuration: Histogram;
  // ... other metrics

  constructor() {
    this.registry = new Registry();

    this.httpRequests = new Counter({
      name: 'martha_http_requests_total',
      help: 'Total HTTP requests',
      labelNames: ['method', 'endpoint', 'status'],
      registers: [this.registry]
    });

    this.httpDuration = new Histogram({
      name: 'martha_http_request_duration_seconds',
      help: 'HTTP request latency',
      labelNames: ['method', 'endpoint'],
      buckets: [0.1, 0.5, 1, 2, 5],
      registers: [this.registry]
    });
  }

  // Increment methods
  incrementHttpRequests(method: string, endpoint: string, status: number) {
    this.httpRequests.inc({ method, endpoint, status });
  }

  // Observe methods
  observeHttpDuration(method: string, endpoint: string, duration: number) {
    this.httpDuration.observe({ method, endpoint }, duration);
  }

  // Export metrics
  async getMetrics(): Promise<string> {
    return await this.registry.metrics();
  }
}
```

### 2. Create Prometheus Config (`monitoring/prometheus.yml`)

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'martha-service'
    static_configs:
      - targets: ['localhost:21003']
        labels:
          service: 'martha-service'
          environment: 'development'

  - job_name: 'worktree-agents'
    file_sd_configs:
      - files:
        - '/home/archiedev/.martha/prometheus/targets/*.json'
    refresh_interval: 30s

rule_files:
  - 'alerts.yml'

alerting:
  alertmanagers:
    - static_configs:
      - targets: ['localhost:9093']
```

### 3. Create Alert Rules (`monitoring/alerts.yml`)

```yaml
groups:
  - name: martha
    interval: 30s
    rules:
      - alert: SwarmCrashed
        expr: martha_swarms_active{status="crashed"} > 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Claude-flow swarm crashed"

      - alert: SwarmResourceExhaustion
        expr: martha_swarm_resource_usage{resource="memory"} > 3.5e9
        for: 5m
        labels:
          severity: warning

      - alert: ContainerUnhealthy
        expr: martha_container_health == 0
        for: 5m
        labels:
          severity: warning

      - alert: MCPToolHighErrorRate
        expr: rate(martha_mcp_tool_errors_total[5m]) > 0.1
        for: 2m
        labels:
          severity: warning
```

### 4. Create Grafana Dashboards

**Dashboard 1: Martha Overview** (`monitoring/grafana/dashboards/martha-overview.json`)

Panels:
- Service health uptime gauge
- Request rate graph
- Error rate graph
- P95/P99 latency
- Active worktrees count
- Active swarms count
- MCP tool usage

**Dashboard 2: Swarm Telemetry** (`monitoring/grafana/dashboards/swarm-telemetry.json`)

Panels:
- Swarm lifecycle timeline
- Active swarms table
- Resource usage (CPU, memory)
- Task completion rate
- Task failure rate

**Dashboard 3: Epic Progress** (`monitoring/grafana/dashboards/epic-progress.json`)

Panels:
- Active epics list
- Completion percentage gauges
- Test coverage per worktree
- Evidence validation success rate

### 5. Add Metrics Endpoint

In `src/server/fastify.ts`:
```typescript
fastify.get('/metrics', async (request, reply) => {
  reply.header('Content-Type', 'text/plain');
  return await prometheusMetrics.getMetrics();
});
```

## Dependencies

```bash
npm install prom-client --save
```

## Success Criteria
- [ ] Metrics endpoint returns Prometheus format
- [ ] All key metrics exported
- [ ] Prometheus scrapes successfully
- [ ] Grafana dashboards display data
- [ ] Alerts trigger correctly

## Files: ~1,000 lines total
