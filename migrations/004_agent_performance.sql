-- Migration 004: Agent Performance Tracking
-- Phase 3: Epic 3.1 - Agent Performance Schema (5 SP)
-- Tracks agent performance metrics for ML-driven selection

-- Agent Performance Table
-- Stores comprehensive performance metrics for each agent-issue pairing
CREATE TABLE IF NOT EXISTS ts_martha.agent_performance (
  id BIGSERIAL PRIMARY KEY,

  -- Agent identification
  agent_id VARCHAR(100) NOT NULL,
  agent_type VARCHAR(100) NOT NULL,

  -- Issue/Epic context
  issue_id VARCHAR(100) NOT NULL,
  epic_id VARCHAR(100),
  batch_id VARCHAR(100),

  -- Issue characteristics
  issue_complexity INTEGER, -- 1-10 complexity score
  issue_type VARCHAR(50), -- feature, bug, refactor, docs, test
  issue_tags VARCHAR(100)[],

  -- Performance metrics
  duration_ms BIGINT NOT NULL, -- Total time to completion
  commit_count INTEGER DEFAULT 0,
  test_pass_rate DECIMAL(5, 2), -- 0-100%
  rework_count INTEGER DEFAULT 0, -- Number of retry attempts

  -- Quality metrics
  code_quality_score DECIMAL(5, 2), -- 0-100
  documentation_complete BOOLEAN DEFAULT FALSE,
  tests_included BOOLEAN DEFAULT FALSE,

  -- Outcome
  success BOOLEAN NOT NULL,
  failure_reason TEXT,

  -- Resource usage
  peak_memory_mb DECIMAL(10, 2),
  avg_cpu_percent DECIMAL(5, 2),

  -- Epic-specific metrics
  epic_phase VARCHAR(50), -- Which phase of epic
  dependencies_count INTEGER DEFAULT 0, -- Number of dependent issues

  -- Metadata
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Indexes for common queries
  CONSTRAINT agent_performance_issue_unique UNIQUE (agent_id, issue_id)
);

-- Index 1: Agent-centric queries
CREATE INDEX IF NOT EXISTS idx_agent_performance_agent
  ON ts_martha.agent_performance (agent_id, completed_at DESC);

-- Index 2: Success rate queries
CREATE INDEX IF NOT EXISTS idx_agent_performance_success
  ON ts_martha.agent_performance (agent_id, success, completed_at DESC);

-- Index 3: Epic performance
CREATE INDEX IF NOT EXISTS idx_agent_performance_epic
  ON ts_martha.agent_performance (epic_id, completed_at DESC)
  WHERE epic_id IS NOT NULL;

-- Index 4: Complexity-based queries (for ML training)
CREATE INDEX IF NOT EXISTS idx_agent_performance_complexity
  ON ts_martha.agent_performance (issue_complexity, agent_type);

-- Index 5: Issue type specialization
CREATE INDEX IF NOT EXISTS idx_agent_performance_type
  ON ts_martha.agent_performance (agent_type, issue_type);

-- Agent Specialization View
-- Pre-aggregated view for quick specialization queries
CREATE MATERIALIZED VIEW IF NOT EXISTS ts_martha.agent_specialization AS
SELECT
  agent_id,
  agent_type,
  issue_type,

  -- Performance statistics
  COUNT(*) AS total_issues,
  COUNT(*) FILTER (WHERE success = TRUE) AS successful_issues,
  ROUND(COUNT(*) FILTER (WHERE success = TRUE)::NUMERIC / COUNT(*) * 100, 2) AS success_rate,

  -- Time statistics
  AVG(duration_ms) AS avg_duration_ms,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY duration_ms) AS median_duration_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms) AS p95_duration_ms,

  -- Quality statistics
  AVG(code_quality_score) AS avg_quality_score,
  AVG(test_pass_rate) AS avg_test_pass_rate,
  COUNT(*) FILTER (WHERE documentation_complete = TRUE)::NUMERIC / COUNT(*) * 100 AS docs_completion_rate,

  -- Complexity statistics
  AVG(issue_complexity) AS avg_complexity_handled,
  MAX(issue_complexity) AS max_complexity_handled,

  -- Most recent performance
  MAX(completed_at) AS last_completed_at

FROM ts_martha.agent_performance
GROUP BY agent_id, agent_type, issue_type;

-- Index on materialized view
CREATE INDEX IF NOT EXISTS idx_agent_specialization_agent
  ON ts_martha.agent_specialization (agent_id, issue_type);

-- Agent Trend View
-- 30-day moving average for trend analysis
CREATE MATERIALIZED VIEW IF NOT EXISTS ts_martha.agent_trends AS
SELECT
  agent_id,
  agent_type,
  DATE_TRUNC('day', completed_at) AS date,

  -- Daily metrics
  COUNT(*) AS daily_issues,
  COUNT(*) FILTER (WHERE success = TRUE) AS daily_successes,
  AVG(duration_ms) AS avg_duration_ms,
  AVG(code_quality_score) AS avg_quality_score,

  -- 7-day moving averages
  AVG(COUNT(*)) OVER (
    PARTITION BY agent_id
    ORDER BY DATE_TRUNC('day', completed_at)
    ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
  ) AS ma_7day_issues,

  AVG(AVG(duration_ms)) OVER (
    PARTITION BY agent_id
    ORDER BY DATE_TRUNC('day', completed_at)
    ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
  ) AS ma_7day_duration_ms,

  -- 30-day moving averages
  AVG(COUNT(*)) OVER (
    PARTITION BY agent_id
    ORDER BY DATE_TRUNC('day', completed_at)
    ROWS BETWEEN 29 PRECEDING AND CURRENT ROW
  ) AS ma_30day_issues,

  AVG(AVG(duration_ms)) OVER (
    PARTITION BY agent_id
    ORDER BY DATE_TRUNC('day', completed_at)
    ROWS BETWEEN 29 PRECEDING AND CURRENT ROW
  ) AS ma_30day_duration_ms

FROM ts_martha.agent_performance
GROUP BY agent_id, agent_type, DATE_TRUNC('day', completed_at);

-- Index on trend view
CREATE INDEX IF NOT EXISTS idx_agent_trends_agent_date
  ON ts_martha.agent_trends (agent_id, date DESC);

-- Helper function: Get agent performance summary
CREATE OR REPLACE FUNCTION ts_martha.get_agent_performance_summary(p_agent_id VARCHAR)
RETURNS TABLE (
  total_issues BIGINT,
  successful_issues BIGINT,
  success_rate NUMERIC,
  avg_duration_ms NUMERIC,
  avg_quality_score NUMERIC,
  best_issue_type VARCHAR,
  total_commits BIGINT,
  avg_complexity NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) AS total_issues,
    COUNT(*) FILTER (WHERE success = TRUE) AS successful_issues,
    ROUND(COUNT(*) FILTER (WHERE success = TRUE)::NUMERIC / COUNT(*) * 100, 2) AS success_rate,
    ROUND(AVG(duration_ms), 2) AS avg_duration_ms,
    ROUND(AVG(code_quality_score), 2) AS avg_quality_score,
    MODE() WITHIN GROUP (ORDER BY issue_type) AS best_issue_type,
    SUM(commit_count) AS total_commits,
    ROUND(AVG(issue_complexity), 2) AS avg_complexity
  FROM ts_martha.agent_performance
  WHERE agent_id = p_agent_id;
END;
$$ LANGUAGE plpgsql;

-- Helper function: Get top performing agents by issue type
CREATE OR REPLACE FUNCTION ts_martha.get_top_agents_by_type(
  p_issue_type VARCHAR,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  agent_id VARCHAR,
  agent_type VARCHAR,
  success_rate NUMERIC,
  avg_duration_ms NUMERIC,
  total_issues BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.agent_id,
    s.agent_type,
    s.success_rate,
    s.avg_duration_ms,
    s.total_issues
  FROM ts_martha.agent_specialization s
  WHERE s.issue_type = p_issue_type
    AND s.total_issues >= 3 -- Minimum sample size
  ORDER BY s.success_rate DESC, s.avg_duration_ms ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Helper function: Get agent trend analysis
CREATE OR REPLACE FUNCTION ts_martha.get_agent_trend(
  p_agent_id VARCHAR,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  date DATE,
  daily_issues BIGINT,
  daily_successes BIGINT,
  avg_duration_ms NUMERIC,
  ma_7day_duration_ms NUMERIC,
  ma_30day_duration_ms NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.date::DATE,
    t.daily_issues,
    t.daily_successes,
    ROUND(t.avg_duration_ms, 2) AS avg_duration_ms,
    ROUND(t.ma_7day_duration_ms, 2) AS ma_7day_duration_ms,
    ROUND(t.ma_30day_duration_ms, 2) AS ma_30day_duration_ms
  FROM ts_martha.agent_trends t
  WHERE t.agent_id = p_agent_id
    AND t.date >= CURRENT_DATE - p_days
  ORDER BY t.date DESC;
END;
$$ LANGUAGE plpgsql;

-- Refresh policies for materialized views
-- Refresh every 5 minutes (agents complete tasks)
CREATE OR REPLACE FUNCTION ts_martha.refresh_agent_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY ts_martha.agent_specialization;
  REFRESH MATERIALIZED VIEW CONCURRENTLY ts_martha.agent_trends;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE ts_martha.agent_performance IS 'Comprehensive agent performance metrics for ML-driven selection';
COMMENT ON MATERIALIZED VIEW ts_martha.agent_specialization IS 'Pre-aggregated agent specialization by issue type';
COMMENT ON MATERIALIZED VIEW ts_martha.agent_trends IS 'Agent performance trends with moving averages';
COMMENT ON FUNCTION ts_martha.get_agent_performance_summary IS 'Get overall performance summary for a specific agent';
COMMENT ON FUNCTION ts_martha.get_top_agents_by_type IS 'Get top performing agents for a specific issue type';
COMMENT ON FUNCTION ts_martha.get_agent_trend IS 'Get agent performance trend over time';

-- Migration complete
-- Phase 3.1 (5 SP) ✅
