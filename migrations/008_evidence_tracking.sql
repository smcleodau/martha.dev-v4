-- Migration 008: Evidence Tracking System
-- Creates TimescaleDB hypertable for storing evidence events at each stage of issue lifecycle
-- Enables comprehensive validation and audit trails

-- Evidence Events Hypertable
-- Stores all evidence collected during issue lifecycle
CREATE TABLE IF NOT EXISTS evidence_events (
    id                  BIGSERIAL,
    event_id            UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    issue_id            VARCHAR(50) NOT NULL,
    stage               VARCHAR(50) NOT NULL,
    evidence_type       VARCHAR(50) NOT NULL,
    timestamp           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    evidence_data       JSONB NOT NULL,
    quality_score       INTEGER CHECK (quality_score BETWEEN 0 AND 100),
    validation_status   VARCHAR(20) CHECK (validation_status IN ('valid', 'invalid', 'pending', 'error')),
    validation_errors   TEXT[],
    workflow_id         VARCHAR(255),
    agent_id            VARCHAR(100),
    PRIMARY KEY (id, timestamp)
);

-- Create hypertable for time-series optimization
-- Chunks data by day for efficient querying and retention
SELECT create_hypertable('evidence_events', 'timestamp',
    chunk_time_interval => INTERVAL '1 day',
    if_not_exists => TRUE
);

-- Indexes for common query patterns

-- Index for querying evidence by issue and stage (most common query)
CREATE INDEX IF NOT EXISTS idx_evidence_issue_stage
ON evidence_events (issue_id, stage, timestamp DESC);

-- Index for querying evidence by issue across all stages
CREATE INDEX IF NOT EXISTS idx_evidence_issue
ON evidence_events (issue_id, timestamp DESC);

-- Index for querying evidence by stage (for analytics)
CREATE INDEX IF NOT EXISTS idx_evidence_stage
ON evidence_events (stage, timestamp DESC);

-- Index for querying evidence by workflow
CREATE INDEX IF NOT EXISTS idx_evidence_workflow
ON evidence_events (workflow_id, timestamp DESC);

-- Index for querying evidence by agent
CREATE INDEX IF NOT EXISTS idx_evidence_agent
ON evidence_events (agent_id, timestamp DESC);

-- GIN index for JSONB evidence data (enables fast JSON queries)
CREATE INDEX IF NOT EXISTS idx_evidence_data
ON evidence_events USING gin(evidence_data jsonb_path_ops);

-- Index for validation status queries
CREATE INDEX IF NOT EXISTS idx_evidence_validation
ON evidence_events (validation_status, timestamp DESC);

-- Index for quality score queries
CREATE INDEX IF NOT EXISTS idx_evidence_quality
ON evidence_events (quality_score DESC, timestamp DESC);

-- Composite index for issue + validation status (gate checks)
CREATE INDEX IF NOT EXISTS idx_evidence_issue_validation
ON evidence_events (issue_id, stage, validation_status, timestamp DESC);

-- Comments for documentation
COMMENT ON TABLE evidence_events IS 'Stores all evidence events collected during issue lifecycle for validation and audit trails';
COMMENT ON COLUMN evidence_events.event_id IS 'Unique identifier for this evidence event';
COMMENT ON COLUMN evidence_events.issue_id IS 'Issue ID this evidence relates to (e.g., TASK-1.2.3)';
COMMENT ON COLUMN evidence_events.stage IS 'Lifecycle stage: DEVELOPMENT, TESTING, REVIEW, MERGE, COMPLETION';
COMMENT ON COLUMN evidence_events.evidence_type IS 'Type of evidence: commits, tests, reviews, merge, code_stats, etc.';
COMMENT ON COLUMN evidence_events.evidence_data IS 'JSON data containing the actual evidence details';
COMMENT ON COLUMN evidence_events.quality_score IS 'Quality score 0-100 based on validation rules';
COMMENT ON COLUMN evidence_events.validation_status IS 'Validation status: valid, invalid, pending, error';
COMMENT ON COLUMN evidence_events.validation_errors IS 'Array of validation error messages if invalid';
COMMENT ON COLUMN evidence_events.workflow_id IS 'Temporal workflow ID that generated this evidence';
COMMENT ON COLUMN evidence_events.agent_id IS 'Agent ID that generated this evidence';

-- Compression policy: compress chunks older than 7 days
SELECT add_compression_policy('evidence_events', INTERVAL '7 days', if_not_exists => TRUE);

-- Retention policy: keep evidence for 90 days
SELECT add_retention_policy('evidence_events', INTERVAL '90 days', if_not_exists => TRUE);

-- Continuous aggregate for daily evidence summaries
CREATE MATERIALIZED VIEW IF NOT EXISTS evidence_daily_summary
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 day', timestamp) AS day,
    issue_id,
    stage,
    evidence_type,
    validation_status,
    COUNT(*) AS evidence_count,
    AVG(quality_score) AS avg_quality_score,
    MIN(quality_score) AS min_quality_score,
    MAX(quality_score) AS max_quality_score
FROM evidence_events
GROUP BY day, issue_id, stage, evidence_type, validation_status;

-- Refresh policy for continuous aggregate (refresh every hour)
SELECT add_continuous_aggregate_policy('evidence_daily_summary',
    start_offset => INTERVAL '3 days',
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '1 hour',
    if_not_exists => TRUE
);

-- View for latest evidence by issue and stage
CREATE OR REPLACE VIEW latest_evidence_by_stage AS
SELECT DISTINCT ON (issue_id, stage, evidence_type)
    event_id,
    issue_id,
    stage,
    evidence_type,
    timestamp,
    evidence_data,
    quality_score,
    validation_status,
    validation_errors,
    workflow_id,
    agent_id
FROM evidence_events
ORDER BY issue_id, stage, evidence_type, timestamp DESC;

COMMENT ON VIEW latest_evidence_by_stage IS 'Latest evidence for each issue/stage/type combination';

-- View for validation summary by issue
CREATE OR REPLACE VIEW issue_validation_summary AS
SELECT
    issue_id,
    stage,
    COUNT(*) AS total_evidence,
    COUNT(*) FILTER (WHERE validation_status = 'valid') AS valid_count,
    COUNT(*) FILTER (WHERE validation_status = 'invalid') AS invalid_count,
    COUNT(*) FILTER (WHERE validation_status = 'pending') AS pending_count,
    AVG(quality_score) AS avg_quality_score,
    MAX(timestamp) AS last_evidence_time
FROM evidence_events
GROUP BY issue_id, stage;

COMMENT ON VIEW issue_validation_summary IS 'Validation summary statistics for each issue and stage';

-- Function to get latest evidence for an issue and stage
CREATE OR REPLACE FUNCTION get_latest_evidence(
    p_issue_id VARCHAR(50),
    p_stage VARCHAR(50)
)
RETURNS TABLE (
    event_id UUID,
    evidence_type VARCHAR(50),
    timestamp TIMESTAMPTZ,
    evidence_data JSONB,
    quality_score INTEGER,
    validation_status VARCHAR(20)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        e.event_id,
        e.evidence_type,
        e.timestamp,
        e.evidence_data,
        e.quality_score,
        e.validation_status
    FROM latest_evidence_by_stage e
    WHERE e.issue_id = p_issue_id
      AND e.stage = p_stage
    ORDER BY e.timestamp DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_latest_evidence IS 'Get latest evidence events for a specific issue and stage';

-- Function to check if stage has valid evidence
CREATE OR REPLACE FUNCTION has_valid_evidence(
    p_issue_id VARCHAR(50),
    p_stage VARCHAR(50),
    p_min_quality_score INTEGER DEFAULT 70
)
RETURNS BOOLEAN AS $$
DECLARE
    v_has_valid BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM evidence_events
        WHERE issue_id = p_issue_id
          AND stage = p_stage
          AND validation_status = 'valid'
          AND quality_score >= p_min_quality_score
    ) INTO v_has_valid;

    RETURN v_has_valid;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION has_valid_evidence IS 'Check if an issue has valid evidence for a stage with minimum quality score';

-- Migration complete
SELECT format('Migration 008 complete: Evidence tracking system created at %s', NOW());
