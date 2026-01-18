-- Migration 008: Database Index Optimization
-- TASK-7.4.2: Add missing indexes for production performance
-- Epic 7.4: Production Hardening

-- Add composite index for telemetry queries with multiple filters
-- Optimizes: Error queries filtered by workflow and severity
CREATE INDEX IF NOT EXISTS idx_telemetry_events_workflow_time_severity
  ON ts_martha.telemetry_events (workflow_id, timestamp DESC, severity)
  WHERE severity IN ('error', 'critical');

-- Add index for agent performance time-series queries
-- Optimizes: Agent performance monitoring dashboards
CREATE INDEX IF NOT EXISTS idx_agent_performance_agent_time
  ON ts_martha.agent_performance (agent_id, timestamp DESC);

-- Add index for exception resolution tracking
-- Optimizes: Open exception queries by severity
CREATE INDEX IF NOT EXISTS idx_exceptions_resolution_tracking
  ON ts_martha.exceptions (resolved, severity, detected_at DESC);

-- Add index for learning feedback queries by context
-- Optimizes: Learning feedback retrieval by agent and type
CREATE INDEX IF NOT EXISTS idx_learning_feedback_context
  ON ts_martha.learning_feedback (agent_id, feedback_type, created_at DESC);

-- Add index for documentation full-text search
-- Optimizes: Full-text search on documentation content
CREATE INDEX IF NOT EXISTS idx_documentation_pages_search
  ON ts_martha.documentation_pages USING GIN (to_tsvector('english', title || ' ' || COALESCE(content, '')));

-- Add index for documentation category queries
-- Optimizes: Documentation listing by worktree and category
CREATE INDEX IF NOT EXISTS idx_documentation_pages_worktree_category
  ON ts_martha.documentation_pages (worktree_id, category, updated_at DESC);

-- Add covering index for telemetry event counts
-- Optimizes: Workflow telemetry aggregations (includes commonly accessed columns)
CREATE INDEX IF NOT EXISTS idx_telemetry_events_count_covering
  ON ts_martha.telemetry_events (workflow_id, event_type, timestamp DESC)
  INCLUDE (duration_ms, severity);

-- Add index for exception type analysis
-- Optimizes: Exception monitoring and alerting queries
CREATE INDEX IF NOT EXISTS idx_exceptions_type_time_resolved
  ON ts_martha.exceptions (exception_type, detected_at DESC)
  WHERE resolved = FALSE;

-- Add index for telemetry trace queries
-- Optimizes: Distributed tracing lookups
CREATE INDEX IF NOT EXISTS idx_telemetry_trace_id
  ON ts_martha.telemetry_events (trace_id, timestamp DESC)
  WHERE trace_id IS NOT NULL;

-- Add index for telemetry parent-child relationships
-- Optimizes: Hierarchical event queries
CREATE INDEX IF NOT EXISTS idx_telemetry_parent_id
  ON ts_martha.telemetry_events (parent_id, timestamp DESC)
  WHERE parent_id IS NOT NULL;

-- Add index for agent performance by workflow type
-- Optimizes: Performance analysis by workflow type
CREATE INDEX IF NOT EXISTS idx_agent_performance_workflow_type
  ON ts_martha.agent_performance (workflow_type, timestamp DESC);

-- Add index for exception workflow context
-- Optimizes: Exception queries filtered by workflow context
CREATE INDEX IF NOT EXISTS idx_exceptions_workflow_context
  ON ts_martha.exceptions (workflow_id, issue_id, detected_at DESC);

-- Add index for learning feedback with rating
-- Optimizes: Learning feedback quality analysis
CREATE INDEX IF NOT EXISTS idx_learning_feedback_rating
  ON ts_martha.learning_feedback (agent_id, rating, created_at DESC)
  WHERE rating IS NOT NULL;

-- Add BRIN index for time-series data (very large tables)
-- BRIN indexes are space-efficient for chronologically ordered data
CREATE INDEX IF NOT EXISTS idx_telemetry_events_timestamp_brin
  ON ts_martha.telemetry_events USING BRIN (timestamp)
  WITH (pages_per_range = 128);

-- Statistics update to help query planner make better decisions
ANALYZE ts_martha.telemetry_events;
ANALYZE ts_martha.agent_performance;
ANALYZE ts_martha.exceptions;
ANALYZE ts_martha.learning_feedback;
ANALYZE ts_martha.documentation_pages;

-- Set statistics targets for better query planning on high-cardinality columns
ALTER TABLE ts_martha.telemetry_events ALTER COLUMN workflow_id SET STATISTICS 1000;
ALTER TABLE ts_martha.telemetry_events ALTER COLUMN event_type SET STATISTICS 500;
ALTER TABLE ts_martha.exceptions ALTER COLUMN exception_type SET STATISTICS 500;

-- Enable parallel query execution for large scans
ALTER TABLE ts_martha.telemetry_events SET (parallel_workers = 4);
ALTER TABLE ts_martha.agent_performance SET (parallel_workers = 2);

-- Comments for documentation
COMMENT ON INDEX ts_martha.idx_telemetry_events_workflow_time_severity IS 'Optimized for error queries filtered by workflow and severity';
COMMENT ON INDEX ts_martha.idx_agent_performance_agent_time IS 'Optimized for agent performance time-series queries';
COMMENT ON INDEX ts_martha.idx_exceptions_resolution_tracking IS 'Optimized for open exception queries by severity';
COMMENT ON INDEX ts_martha.idx_learning_feedback_context IS 'Optimized for learning feedback retrieval by agent and type';
COMMENT ON INDEX ts_martha.idx_documentation_pages_search IS 'Full-text search on documentation content';
COMMENT ON INDEX ts_martha.idx_documentation_pages_worktree_category IS 'Optimized for documentation listing by worktree and category';
COMMENT ON INDEX ts_martha.idx_telemetry_events_count_covering IS 'Covering index for workflow event aggregations';
COMMENT ON INDEX ts_martha.idx_exceptions_type_time_resolved IS 'Optimized for exception monitoring by type';
COMMENT ON INDEX ts_martha.idx_telemetry_trace_id IS 'Optimized for distributed tracing queries';
COMMENT ON INDEX ts_martha.idx_telemetry_parent_id IS 'Optimized for hierarchical event relationships';
COMMENT ON INDEX ts_martha.idx_telemetry_events_timestamp_brin IS 'Space-efficient BRIN index for time-series data';

-- Performance monitoring views
-- View: Slow queries that need optimization
CREATE OR REPLACE VIEW ts_martha.slow_query_monitor AS
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size,
  CASE
    WHEN idx_scan = 0 THEN 'UNUSED'
    WHEN idx_tup_fetch < idx_tup_read * 0.1 THEN 'LOW_EFFICIENCY'
    ELSE 'HEALTHY'
  END AS status
FROM pg_stat_user_indexes
WHERE schemaname = 'ts_martha'
ORDER BY idx_scan DESC;

COMMENT ON VIEW ts_martha.slow_query_monitor IS 'Monitor index usage and identify optimization opportunities';

-- Migration complete
-- Phase 7.4.2: Database Optimization ✅
