-- Migration 003: Telemetry System with TimescaleDB
-- Phase 2: Epic 2.1 - Database Schema (21 SP)
-- Enable comprehensive telemetry tracking for workflow orchestration

-- Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Telemetry Events Hypertable
-- Stores all workflow, activity, and signal events with full context
CREATE TABLE IF NOT EXISTS ts_martha.telemetry_events (
  -- Primary identification
  id BIGSERIAL NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Event classification
  event_type VARCHAR(100) NOT NULL, -- workflow_started, activity_started, signal_received, etc.
  event_category VARCHAR(50) NOT NULL, -- workflow, activity, signal, query, exception
  severity VARCHAR(20) NOT NULL DEFAULT 'info', -- debug, info, warning, error, critical

  -- Workflow context
  workflow_id VARCHAR(255) NOT NULL,
  workflow_type VARCHAR(100) NOT NULL, -- IssueLifecycleWorkflow, BatchCoordinatorWorkflow
  run_id VARCHAR(255),

  -- Issue/Epic context
  issue_id VARCHAR(100),
  epic_id VARCHAR(100),
  batch_id VARCHAR(100),

  -- Agent context
  agent_id VARCHAR(100),
  agent_type VARCHAR(100),

  -- Activity context
  activity_name VARCHAR(100),
  activity_id VARCHAR(255),
  retry_attempt INTEGER DEFAULT 0,

  -- Event data (flexible JSONB for extensibility)
  payload JSONB NOT NULL DEFAULT '{}',

  -- Performance metrics
  duration_ms INTEGER, -- Duration for completed events
  memory_mb DECIMAL(10, 2), -- Memory usage snapshot
  cpu_percent DECIMAL(5, 2), -- CPU usage snapshot

  -- Error tracking
  error_message TEXT,
  error_stack TEXT,
  error_code VARCHAR(100),

  -- Metadata
  tags VARCHAR(100)[], -- Searchable tags
  source VARCHAR(100) NOT NULL, -- temporal, hook, dashboard, ml
  trace_id VARCHAR(100), -- Distributed tracing
  parent_id BIGINT, -- For hierarchical events

  -- Constraints
  CONSTRAINT telemetry_events_pkey PRIMARY KEY (timestamp, id)
);

-- Convert to TimescaleDB hypertable
-- Partition by time (timestamp) with 1-day chunks
SELECT create_hypertable(
  'ts_martha.telemetry_events',
  'timestamp',
  chunk_time_interval => INTERVAL '1 day',
  if_not_exists => TRUE
);

-- Indexes for multi-dimensional queries
-- Index 1: Workflow-centric queries
CREATE INDEX IF NOT EXISTS idx_telemetry_workflow
  ON ts_martha.telemetry_events (workflow_id, timestamp DESC);

-- Index 2: Issue-centric queries
CREATE INDEX IF NOT EXISTS idx_telemetry_issue
  ON ts_martha.telemetry_events (issue_id, timestamp DESC)
  WHERE issue_id IS NOT NULL;

-- Index 3: Epic/Batch-centric queries
CREATE INDEX IF NOT EXISTS idx_telemetry_epic_batch
  ON ts_martha.telemetry_events (epic_id, batch_id, timestamp DESC)
  WHERE epic_id IS NOT NULL OR batch_id IS NOT NULL;

-- Index 4: Agent performance queries
CREATE INDEX IF NOT EXISTS idx_telemetry_agent
  ON ts_martha.telemetry_events (agent_id, timestamp DESC)
  WHERE agent_id IS NOT NULL;

-- Index 5: Event type queries
CREATE INDEX IF NOT EXISTS idx_telemetry_event_type
  ON ts_martha.telemetry_events (event_type, timestamp DESC);

-- Index 6: Error tracking queries
CREATE INDEX IF NOT EXISTS idx_telemetry_errors
  ON ts_martha.telemetry_events (severity, timestamp DESC)
  WHERE severity IN ('error', 'critical');

-- Index 7: Activity tracking
CREATE INDEX IF NOT EXISTS idx_telemetry_activity
  ON ts_martha.telemetry_events (activity_name, timestamp DESC)
  WHERE activity_name IS NOT NULL;

-- Index 8: Tag-based search
CREATE INDEX IF NOT EXISTS idx_telemetry_tags
  ON ts_martha.telemetry_events USING GIN (tags)
  WHERE tags IS NOT NULL;

-- Index 9: JSONB payload search
CREATE INDEX IF NOT EXISTS idx_telemetry_payload
  ON ts_martha.telemetry_events USING GIN (payload);

-- Continuous Aggregate: 1-minute rollups
-- Pre-aggregate metrics for faster dashboard queries
CREATE MATERIALIZED VIEW IF NOT EXISTS ts_martha.telemetry_1min
WITH (timescaledb.continuous) AS
SELECT
  time_bucket('1 minute', timestamp) AS bucket,
  workflow_type,
  event_category,
  event_type,
  severity,
  agent_type,

  -- Counts
  COUNT(*) AS event_count,
  COUNT(DISTINCT workflow_id) AS workflow_count,
  COUNT(DISTINCT issue_id) AS issue_count,
  COUNT(DISTINCT agent_id) AS agent_count,

  -- Error metrics
  COUNT(*) FILTER (WHERE severity = 'error') AS error_count,
  COUNT(*) FILTER (WHERE severity = 'critical') AS critical_count,

  -- Performance metrics
  AVG(duration_ms) AS avg_duration_ms,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY duration_ms) AS p50_duration_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms) AS p95_duration_ms,
  PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY duration_ms) AS p99_duration_ms,
  MAX(duration_ms) AS max_duration_ms,

  -- Resource usage
  AVG(memory_mb) AS avg_memory_mb,
  MAX(memory_mb) AS max_memory_mb,
  AVG(cpu_percent) AS avg_cpu_percent,
  MAX(cpu_percent) AS max_cpu_percent,

  -- Retry analysis
  AVG(retry_attempt) AS avg_retry_attempt,
  MAX(retry_attempt) AS max_retry_attempt
FROM ts_martha.telemetry_events
GROUP BY bucket, workflow_type, event_category, event_type, severity, agent_type
WITH NO DATA;

-- Continuous Aggregate: 1-hour rollups
CREATE MATERIALIZED VIEW IF NOT EXISTS ts_martha.telemetry_1hour
WITH (timescaledb.continuous) AS
SELECT
  time_bucket('1 hour', timestamp) AS bucket,
  workflow_type,
  event_category,
  severity,

  -- Counts
  COUNT(*) AS event_count,
  COUNT(DISTINCT workflow_id) AS workflow_count,
  COUNT(DISTINCT issue_id) AS issue_count,
  COUNT(DISTINCT epic_id) AS epic_count,
  COUNT(DISTINCT agent_id) AS agent_count,

  -- Error metrics
  COUNT(*) FILTER (WHERE severity = 'error') AS error_count,
  COUNT(*) FILTER (WHERE severity = 'critical') AS critical_count,

  -- Performance metrics
  AVG(duration_ms) AS avg_duration_ms,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY duration_ms) AS p50_duration_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms) AS p95_duration_ms,
  MAX(duration_ms) AS max_duration_ms,

  -- Resource usage
  AVG(memory_mb) AS avg_memory_mb,
  MAX(memory_mb) AS max_memory_mb
FROM ts_martha.telemetry_events
GROUP BY bucket, workflow_type, event_category, severity
WITH NO DATA;

-- Continuous Aggregate: 1-day rollups
CREATE MATERIALIZED VIEW IF NOT EXISTS ts_martha.telemetry_1day
WITH (timescaledb.continuous) AS
SELECT
  time_bucket('1 day', timestamp) AS bucket,
  workflow_type,

  -- Daily counts
  COUNT(*) AS event_count,
  COUNT(DISTINCT workflow_id) AS workflow_count,
  COUNT(DISTINCT issue_id) AS issue_count,
  COUNT(DISTINCT epic_id) AS epic_count,
  COUNT(DISTINCT batch_id) AS batch_count,
  COUNT(DISTINCT agent_id) AS agent_count,

  -- Success/failure rates
  COUNT(*) FILTER (WHERE event_type = 'workflow_completed') AS workflows_completed,
  COUNT(*) FILTER (WHERE event_type = 'workflow_failed') AS workflows_failed,
  COUNT(*) FILTER (WHERE severity = 'error') AS error_count,
  COUNT(*) FILTER (WHERE severity = 'critical') AS critical_count,

  -- Performance metrics
  AVG(duration_ms) AS avg_duration_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms) AS p95_duration_ms,
  MAX(duration_ms) AS max_duration_ms,

  -- Resource usage
  AVG(memory_mb) AS avg_memory_mb,
  MAX(memory_mb) AS max_memory_mb
FROM ts_martha.telemetry_events
GROUP BY bucket, workflow_type
WITH NO DATA;

-- Refresh policies for continuous aggregates
-- Refresh every 30 seconds for 1-minute aggregate
SELECT add_continuous_aggregate_policy('ts_martha.telemetry_1min',
  start_offset => INTERVAL '1 hour',
  end_offset => INTERVAL '30 seconds',
  schedule_interval => INTERVAL '30 seconds',
  if_not_exists => TRUE
);

-- Refresh every 5 minutes for 1-hour aggregate
SELECT add_continuous_aggregate_policy('ts_martha.telemetry_1hour',
  start_offset => INTERVAL '1 day',
  end_offset => INTERVAL '5 minutes',
  schedule_interval => INTERVAL '5 minutes',
  if_not_exists => TRUE
);

-- Refresh every 1 hour for 1-day aggregate
SELECT add_continuous_aggregate_policy('ts_martha.telemetry_1day',
  start_offset => INTERVAL '7 days',
  end_offset => INTERVAL '1 hour',
  schedule_interval => INTERVAL '1 hour',
  if_not_exists => TRUE
);

-- Retention policy: Keep raw data for 90 days
SELECT add_retention_policy('ts_martha.telemetry_events',
  INTERVAL '90 days',
  if_not_exists => TRUE
);

-- Compression policy: Compress data older than 7 days
-- Significantly reduces storage cost for historical data
ALTER TABLE ts_martha.telemetry_events
  SET (timescaledb.compress,
       timescaledb.compress_segmentby = 'workflow_id, event_category',
       timescaledb.compress_orderby = 'timestamp DESC');

SELECT add_compression_policy('ts_martha.telemetry_events',
  INTERVAL '7 days',
  if_not_exists => TRUE
);

-- Telemetry Metadata Table
-- Track which workflows and issues have telemetry
CREATE TABLE IF NOT EXISTS ts_martha.telemetry_metadata (
  workflow_id VARCHAR(255) PRIMARY KEY,
  workflow_type VARCHAR(100) NOT NULL,
  issue_id VARCHAR(100),
  epic_id VARCHAR(100),
  batch_id VARCHAR(100),

  -- Telemetry stats
  event_count INTEGER DEFAULT 0,
  first_event_at TIMESTAMPTZ,
  last_event_at TIMESTAMPTZ,

  -- Workflow stats
  duration_ms INTEGER,
  status VARCHAR(50), -- running, completed, failed

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_telemetry_metadata_issue
  ON ts_martha.telemetry_metadata (issue_id)
  WHERE issue_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_telemetry_metadata_epic
  ON ts_martha.telemetry_metadata (epic_id)
  WHERE epic_id IS NOT NULL;

-- Update trigger for telemetry_metadata
CREATE TRIGGER update_telemetry_metadata_updated_at
  BEFORE UPDATE ON ts_martha.telemetry_metadata
  FOR EACH ROW EXECUTE FUNCTION ts_martha.update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE ts_martha.telemetry_events IS 'TimescaleDB hypertable storing all workflow telemetry events';
COMMENT ON TABLE ts_martha.telemetry_metadata IS 'Metadata and summary stats for workflows with telemetry';
COMMENT ON MATERIALIZED VIEW ts_martha.telemetry_1min IS 'Continuous aggregate: 1-minute rollups of telemetry metrics';
COMMENT ON MATERIALIZED VIEW ts_martha.telemetry_1hour IS 'Continuous aggregate: 1-hour rollups of telemetry metrics';
COMMENT ON MATERIALIZED VIEW ts_martha.telemetry_1day IS 'Continuous aggregate: 1-day rollups of telemetry metrics';

-- Helper function: Get telemetry summary for a workflow
CREATE OR REPLACE FUNCTION ts_martha.get_workflow_telemetry_summary(p_workflow_id VARCHAR)
RETURNS TABLE (
  total_events BIGINT,
  error_count BIGINT,
  avg_duration_ms NUMERIC,
  max_duration_ms INTEGER,
  event_types JSONB,
  first_event TIMESTAMPTZ,
  last_event TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) AS total_events,
    COUNT(*) FILTER (WHERE severity IN ('error', 'critical')) AS error_count,
    AVG(duration_ms) AS avg_duration_ms,
    MAX(duration_ms) AS max_duration_ms,
    jsonb_object_agg(event_type, cnt) AS event_types,
    MIN(timestamp) AS first_event,
    MAX(timestamp) AS last_event
  FROM (
    SELECT
      event_type,
      severity,
      duration_ms,
      timestamp,
      COUNT(*) OVER (PARTITION BY event_type) AS cnt
    FROM ts_martha.telemetry_events
    WHERE workflow_id = p_workflow_id
  ) sub;
END;
$$ LANGUAGE plpgsql;

-- Helper function: Get recent errors
CREATE OR REPLACE FUNCTION ts_martha.get_recent_errors(p_limit INTEGER DEFAULT 100)
RETURNS TABLE (
  timestamp TIMESTAMPTZ,
  severity VARCHAR,
  workflow_id VARCHAR,
  issue_id VARCHAR,
  event_type VARCHAR,
  error_message TEXT,
  payload JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.timestamp,
    e.severity,
    e.workflow_id,
    e.issue_id,
    e.event_type,
    e.error_message,
    e.payload
  FROM ts_martha.telemetry_events e
  WHERE e.severity IN ('error', 'critical')
  ORDER BY e.timestamp DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Migration complete
-- Phase 2.1 (21 SP) ✅
