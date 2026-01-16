-- Migration 005: Exception Detection System
-- Phase 4: Exception detection and alerting
-- Tracks detected exceptions for monitoring and alerting

-- Exceptions Table
-- Stores all detected exceptions with context
CREATE TABLE IF NOT EXISTS ts_martha.exceptions (
  id BIGSERIAL PRIMARY KEY,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Exception classification
  exception_type VARCHAR(100) NOT NULL, -- stage_timeout, high_retry, degraded_performance, agent_stale, test_failures
  severity VARCHAR(20) NOT NULL, -- low, medium, high, critical

  -- Workflow context
  workflow_id VARCHAR(255) NOT NULL,
  workflow_type VARCHAR(100) NOT NULL,
  issue_id VARCHAR(100),
  epic_id VARCHAR(100),
  batch_id VARCHAR(100),

  -- Agent context
  agent_id VARCHAR(100),
  agent_type VARCHAR(100),

  -- Exception details
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  detected_value NUMERIC, -- The actual value that triggered the exception
  threshold_value NUMERIC, -- The threshold that was exceeded

  -- Context data
  context JSONB DEFAULT '{}',

  -- Resolution
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  auto_resolved BOOLEAN DEFAULT FALSE,

  -- Alerting
  alert_sent BOOLEAN DEFAULT FALSE,
  alert_sent_at TIMESTAMPTZ,
  alert_channel VARCHAR(50), -- slack, email, webhook

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for querying exceptions
CREATE INDEX IF NOT EXISTS idx_exceptions_workflow
  ON ts_martha.exceptions (workflow_id, detected_at DESC);

CREATE INDEX IF NOT EXISTS idx_exceptions_type
  ON ts_martha.exceptions (exception_type, detected_at DESC);

CREATE INDEX IF NOT EXISTS idx_exceptions_severity
  ON ts_martha.exceptions (severity, detected_at DESC)
  WHERE resolved = FALSE;

CREATE INDEX IF NOT EXISTS idx_exceptions_unresolved
  ON ts_martha.exceptions (detected_at DESC)
  WHERE resolved = FALSE;

CREATE INDEX IF NOT EXISTS idx_exceptions_issue
  ON ts_martha.exceptions (issue_id, detected_at DESC)
  WHERE issue_id IS NOT NULL;

-- Exception Statistics View
-- Pre-aggregated exception counts by type and severity
CREATE MATERIALIZED VIEW IF NOT EXISTS ts_martha.exception_statistics AS
SELECT
  exception_type,
  severity,
  DATE_TRUNC('hour', detected_at) AS hour,

  -- Counts
  COUNT(*) AS total_count,
  COUNT(*) FILTER (WHERE resolved = TRUE) AS resolved_count,
  COUNT(*) FILTER (WHERE resolved = FALSE) AS open_count,
  COUNT(*) FILTER (WHERE alert_sent = TRUE) AS alerted_count,

  -- Timing
  AVG(EXTRACT(EPOCH FROM (resolved_at - detected_at))) AS avg_resolution_time_seconds,

  -- Unique workflows affected
  COUNT(DISTINCT workflow_id) AS affected_workflows,
  COUNT(DISTINCT issue_id) AS affected_issues

FROM ts_martha.exceptions
GROUP BY exception_type, severity, DATE_TRUNC('hour', detected_at);

CREATE INDEX IF NOT EXISTS idx_exception_statistics_type_hour
  ON ts_martha.exception_statistics (exception_type, hour DESC);

-- Helper function: Get open exceptions by severity
CREATE OR REPLACE FUNCTION ts_martha.get_open_exceptions(
  p_severity VARCHAR DEFAULT NULL,
  p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
  id BIGINT,
  detected_at TIMESTAMPTZ,
  exception_type VARCHAR,
  severity VARCHAR,
  workflow_id VARCHAR,
  issue_id VARCHAR,
  title TEXT,
  description TEXT,
  detected_value NUMERIC,
  threshold_value NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.detected_at,
    e.exception_type,
    e.severity,
    e.workflow_id,
    e.issue_id,
    e.title,
    e.description,
    e.detected_value,
    e.threshold_value
  FROM ts_martha.exceptions e
  WHERE e.resolved = FALSE
    AND (p_severity IS NULL OR e.severity = p_severity)
  ORDER BY
    CASE e.severity
      WHEN 'critical' THEN 1
      WHEN 'high' THEN 2
      WHEN 'medium' THEN 3
      WHEN 'low' THEN 4
    END,
    e.detected_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Helper function: Get exception summary for workflow
CREATE OR REPLACE FUNCTION ts_martha.get_workflow_exceptions(
  p_workflow_id VARCHAR
)
RETURNS TABLE (
  exception_type VARCHAR,
  severity VARCHAR,
  count BIGINT,
  latest_detected_at TIMESTAMPTZ,
  resolved_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.exception_type,
    e.severity,
    COUNT(*) AS count,
    MAX(e.detected_at) AS latest_detected_at,
    COUNT(*) FILTER (WHERE e.resolved = TRUE) AS resolved_count
  FROM ts_martha.exceptions e
  WHERE e.workflow_id = p_workflow_id
  GROUP BY e.exception_type, e.severity
  ORDER BY COUNT(*) DESC;
END;
$$ LANGUAGE plpgsql;

-- Helper function: Mark exception as resolved
CREATE OR REPLACE FUNCTION ts_martha.resolve_exception(
  p_exception_id BIGINT,
  p_resolution_notes TEXT DEFAULT NULL,
  p_auto_resolved BOOLEAN DEFAULT FALSE
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE ts_martha.exceptions
  SET
    resolved = TRUE,
    resolved_at = NOW(),
    resolution_notes = COALESCE(p_resolution_notes, resolution_notes),
    auto_resolved = p_auto_resolved
  WHERE id = p_exception_id
    AND resolved = FALSE;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Alert Throttling Table
-- Prevents alert spam by tracking recent alerts
CREATE TABLE IF NOT EXISTS ts_martha.alert_throttle (
  id BIGSERIAL PRIMARY KEY,
  alert_key VARCHAR(255) UNIQUE NOT NULL, -- e.g., "exception:stage_timeout:issue-123"
  last_alert_sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  alert_count INTEGER DEFAULT 1,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alert_throttle_key
  ON ts_martha.alert_throttle (alert_key, last_alert_sent_at DESC);

-- Helper function: Check if alert should be throttled
CREATE OR REPLACE FUNCTION ts_martha.should_throttle_alert(
  p_alert_key VARCHAR,
  p_throttle_minutes INTEGER DEFAULT 5
)
RETURNS BOOLEAN AS $$
DECLARE
  v_last_sent TIMESTAMPTZ;
BEGIN
  SELECT last_alert_sent_at INTO v_last_sent
  FROM ts_martha.alert_throttle
  WHERE alert_key = p_alert_key;

  -- If no record exists, don't throttle
  IF v_last_sent IS NULL THEN
    -- Create record
    INSERT INTO ts_martha.alert_throttle (alert_key)
    VALUES (p_alert_key)
    ON CONFLICT (alert_key) DO NOTHING;
    RETURN FALSE;
  END IF;

  -- Check if enough time has passed
  IF v_last_sent + (p_throttle_minutes || ' minutes')::INTERVAL < NOW() THEN
    -- Update record
    UPDATE ts_martha.alert_throttle
    SET
      last_alert_sent_at = NOW(),
      alert_count = alert_count + 1
    WHERE alert_key = p_alert_key;
    RETURN FALSE;
  END IF;

  -- Throttle the alert
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE ts_martha.exceptions IS 'Detected exceptions with context and resolution tracking';
COMMENT ON TABLE ts_martha.alert_throttle IS 'Alert throttling to prevent spam (max 1 alert per 5 minutes per key)';
COMMENT ON MATERIALIZED VIEW ts_martha.exception_statistics IS 'Hourly exception statistics by type and severity';
COMMENT ON FUNCTION ts_martha.get_open_exceptions IS 'Get all open exceptions ordered by severity';
COMMENT ON FUNCTION ts_martha.get_workflow_exceptions IS 'Get exception summary for a specific workflow';
COMMENT ON FUNCTION ts_martha.resolve_exception IS 'Mark an exception as resolved';
COMMENT ON FUNCTION ts_martha.should_throttle_alert IS 'Check if alert should be throttled (max 1 per 5 min)';

-- Migration complete
-- Phase 4 Exception Detection ✅
