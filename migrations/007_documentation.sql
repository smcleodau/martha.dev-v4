-- Migration: Documentation Hub (Phase 6)
-- Auto-generated documentation system with DocuFlow-style features
-- Date: 2026-01-17

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm; -- Fuzzy text search

-- ============================================================================
-- DOCUMENTATION PAGES
-- ============================================================================

CREATE TABLE IF NOT EXISTS ts_martha.documentation_pages (
  id BIGSERIAL PRIMARY KEY,

  -- Page metadata
  page_id VARCHAR(255) UNIQUE NOT NULL, -- e.g., "schema:telemetry_events", "api:IssueLifecycleWorkflow"
  page_type VARCHAR(50) NOT NULL, -- 'schema', 'api', 'workflow', 'guide', 'epic', 'task'
  title TEXT NOT NULL,
  subtitle TEXT,

  -- Content
  content TEXT NOT NULL, -- Markdown content
  summary TEXT, -- Brief summary for search results

  -- Auto-generation metadata
  auto_generated BOOLEAN DEFAULT false,
  source_file VARCHAR(500), -- e.g., "migrations/003_telemetry.sql", "src/workflows/IssueLifecycleWorkflow.ts"
  source_type VARCHAR(50), -- 'sql', 'typescript', 'markdown', 'manual'
  generation_method VARCHAR(100), -- 'SchemaDocGenerator', 'ApiDocGenerator', 'manual'

  -- Categorization
  category VARCHAR(100), -- 'database', 'api', 'workflows', 'guides', 'epics'
  tags VARCHAR(100)[],

  -- Visibility & Status
  published BOOLEAN DEFAULT true,
  version VARCHAR(50) DEFAULT '1.0.0',

  -- Search optimization
  search_vector tsvector,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_validated_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_documentation_pages_type ON ts_martha.documentation_pages(page_type);
CREATE INDEX idx_documentation_pages_category ON ts_martha.documentation_pages(category);
CREATE INDEX idx_documentation_pages_tags ON ts_martha.documentation_pages USING GIN(tags);
CREATE INDEX idx_documentation_pages_published ON ts_martha.documentation_pages(published) WHERE published = true;
CREATE INDEX idx_documentation_pages_auto_generated ON ts_martha.documentation_pages(auto_generated, source_type);

-- Full-text search index
CREATE INDEX idx_documentation_pages_search ON ts_martha.documentation_pages USING GIN(search_vector);

-- Fuzzy search index (for typo tolerance)
CREATE INDEX idx_documentation_pages_title_trgm ON ts_martha.documentation_pages USING GIN(title gin_trgm_ops);
CREATE INDEX idx_documentation_pages_summary_trgm ON ts_martha.documentation_pages USING GIN(summary gin_trgm_ops);

-- ============================================================================
-- DOCUMENTATION LINKS
-- ============================================================================

CREATE TABLE IF NOT EXISTS ts_martha.documentation_links (
  id BIGSERIAL PRIMARY KEY,

  -- Source page
  source_page_id VARCHAR(255) NOT NULL REFERENCES ts_martha.documentation_pages(page_id) ON DELETE CASCADE,

  -- Target reference
  target_reference VARCHAR(500) NOT NULL, -- e.g., "EPIC-1.1", "schema:agent_performance", "file:src/workflows/..."
  target_type VARCHAR(50) NOT NULL, -- 'epic', 'task', 'schema', 'api', 'file', 'external'
  target_page_id VARCHAR(255), -- Resolved page_id if target is a doc page

  -- Link metadata
  link_context TEXT, -- Surrounding text where link appears
  auto_detected BOOLEAN DEFAULT true,
  validated BOOLEAN DEFAULT false,
  is_broken BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  validated_at TIMESTAMPTZ,

  UNIQUE(source_page_id, target_reference)
);

-- Indexes
CREATE INDEX idx_documentation_links_source ON ts_martha.documentation_links(source_page_id);
CREATE INDEX idx_documentation_links_target_ref ON ts_martha.documentation_links(target_reference, target_type);
CREATE INDEX idx_documentation_links_target_page ON ts_martha.documentation_links(target_page_id) WHERE target_page_id IS NOT NULL;
CREATE INDEX idx_documentation_links_broken ON ts_martha.documentation_links(is_broken) WHERE is_broken = true;

-- ============================================================================
-- DOCUMENTATION ACTIVITY
-- ============================================================================

CREATE TABLE IF NOT EXISTS ts_martha.documentation_activity (
  id BIGSERIAL PRIMARY KEY,

  -- Page reference
  page_id VARCHAR(255) NOT NULL REFERENCES ts_martha.documentation_pages(page_id) ON DELETE CASCADE,

  -- Activity type
  activity_type VARCHAR(50) NOT NULL, -- 'created', 'updated', 'viewed', 'validated', 'linked', 'search_result'

  -- Activity metadata
  user_id VARCHAR(100), -- Agent or user who triggered activity
  user_type VARCHAR(50), -- 'agent', 'human', 'system'

  -- Context
  context JSONB, -- Additional data (e.g., search query, validation result)

  -- Timestamp
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_documentation_activity_page ON ts_martha.documentation_activity(page_id, timestamp DESC);
CREATE INDEX idx_documentation_activity_type ON ts_martha.documentation_activity(activity_type, timestamp DESC);
CREATE INDEX idx_documentation_activity_user ON ts_martha.documentation_activity(user_id, timestamp DESC) WHERE user_id IS NOT NULL;

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function: Update search_vector on insert/update
CREATE OR REPLACE FUNCTION ts_martha.update_documentation_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.subtitle, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.summary, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.content, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(array_to_string(NEW.tags, ' '), '')), 'B');

  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_documentation_search_vector
  BEFORE INSERT OR UPDATE ON ts_martha.documentation_pages
  FOR EACH ROW
  EXECUTE FUNCTION ts_martha.update_documentation_search_vector();

-- Function: Search documentation (full-text + fuzzy)
CREATE OR REPLACE FUNCTION ts_martha.search_documentation(
  p_query TEXT,
  p_limit INTEGER DEFAULT 20,
  p_category VARCHAR DEFAULT NULL,
  p_page_type VARCHAR DEFAULT NULL
)
RETURNS TABLE (
  page_id VARCHAR,
  title TEXT,
  subtitle TEXT,
  summary TEXT,
  category VARCHAR,
  page_type VARCHAR,
  rank REAL,
  match_type VARCHAR -- 'exact', 'fuzzy', 'full_text'
) AS $$
BEGIN
  RETURN QUERY
  WITH search_query AS (
    SELECT
      plainto_tsquery('english', p_query) AS ts_query,
      LOWER(p_query) AS query_lower
  ),
  full_text_matches AS (
    SELECT
      dp.page_id,
      dp.title,
      dp.subtitle,
      dp.summary,
      dp.category,
      dp.page_type,
      ts_rank(dp.search_vector, sq.ts_query) AS rank,
      'full_text'::VARCHAR AS match_type
    FROM ts_martha.documentation_pages dp, search_query sq
    WHERE
      dp.search_vector @@ sq.ts_query
      AND dp.published = true
      AND (p_category IS NULL OR dp.category = p_category)
      AND (p_page_type IS NULL OR dp.page_type = p_page_type)
  ),
  fuzzy_matches AS (
    SELECT
      dp.page_id,
      dp.title,
      dp.subtitle,
      dp.summary,
      dp.category,
      dp.page_type,
      similarity(dp.title, sq.query_lower) AS rank,
      'fuzzy'::VARCHAR AS match_type
    FROM ts_martha.documentation_pages dp, search_query sq
    WHERE
      (dp.title ILIKE '%' || p_query || '%' OR similarity(dp.title, sq.query_lower) > 0.3)
      AND dp.published = true
      AND (p_category IS NULL OR dp.category = p_category)
      AND (p_page_type IS NULL OR dp.page_type = p_page_type)
      AND NOT EXISTS (SELECT 1 FROM full_text_matches WHERE page_id = dp.page_id)
  )
  SELECT * FROM full_text_matches
  UNION ALL
  SELECT * FROM fuzzy_matches
  ORDER BY rank DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function: Get page with links
CREATE OR REPLACE FUNCTION ts_martha.get_documentation_page_with_links(p_page_id VARCHAR)
RETURNS TABLE (
  page JSONB,
  outgoing_links JSONB,
  incoming_links JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    row_to_json(dp.*)::JSONB AS page,
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object(
        'target_reference', dl.target_reference,
        'target_type', dl.target_type,
        'target_page_id', dl.target_page_id,
        'is_broken', dl.is_broken
      ))
      FROM ts_martha.documentation_links dl
      WHERE dl.source_page_id = p_page_id),
      '[]'::JSONB
    ) AS outgoing_links,
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object(
        'source_page_id', dl.source_page_id,
        'source_title', dp2.title
      ))
      FROM ts_martha.documentation_links dl
      JOIN ts_martha.documentation_pages dp2 ON dl.source_page_id = dp2.page_id
      WHERE dl.target_page_id = p_page_id),
      '[]'::JSONB
    ) AS incoming_links
  FROM ts_martha.documentation_pages dp
  WHERE dp.page_id = p_page_id;
END;
$$ LANGUAGE plpgsql;

-- Function: Validate links
CREATE OR REPLACE FUNCTION ts_martha.validate_documentation_links()
RETURNS TABLE (
  link_id BIGINT,
  source_page_id VARCHAR,
  target_reference VARCHAR,
  is_broken BOOLEAN,
  error_message TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    dl.id AS link_id,
    dl.source_page_id,
    dl.target_reference,
    CASE
      WHEN dl.target_type = 'schema' AND NOT EXISTS (
        SELECT 1 FROM ts_martha.documentation_pages dp
        WHERE dp.page_id = dl.target_reference AND dp.page_type = 'schema'
      ) THEN true
      WHEN dl.target_type = 'api' AND NOT EXISTS (
        SELECT 1 FROM ts_martha.documentation_pages dp
        WHERE dp.page_id = dl.target_reference AND dp.page_type = 'api'
      ) THEN true
      ELSE false
    END AS is_broken,
    CASE
      WHEN dl.target_type IN ('schema', 'api') AND NOT EXISTS (
        SELECT 1 FROM ts_martha.documentation_pages dp WHERE dp.page_id = dl.target_reference
      ) THEN 'Target page not found: ' || dl.target_reference
      ELSE NULL
    END AS error_message
  FROM ts_martha.documentation_links dl;
END;
$$ LANGUAGE plpgsql;

-- Function: Get popular pages (by activity)
CREATE OR REPLACE FUNCTION ts_martha.get_popular_documentation_pages(
  p_days INTEGER DEFAULT 7,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  page_id VARCHAR,
  title TEXT,
  category VARCHAR,
  view_count BIGINT,
  last_viewed TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    dp.page_id,
    dp.title,
    dp.category,
    COUNT(da.id) AS view_count,
    MAX(da.timestamp) AS last_viewed
  FROM ts_martha.documentation_pages dp
  JOIN ts_martha.documentation_activity da ON dp.page_id = da.page_id
  WHERE
    da.activity_type = 'viewed'
    AND da.timestamp > NOW() - (p_days || ' days')::INTERVAL
    AND dp.published = true
  GROUP BY dp.page_id, dp.title, dp.category
  ORDER BY view_count DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE ts_martha.documentation_pages IS 'Auto-generated and manual documentation pages';
COMMENT ON TABLE ts_martha.documentation_links IS 'Bidirectional links between documentation pages and other entities';
COMMENT ON TABLE ts_martha.documentation_activity IS 'Tracks documentation usage for analytics';

COMMENT ON FUNCTION ts_martha.search_documentation IS 'Full-text and fuzzy search across documentation';
COMMENT ON FUNCTION ts_martha.get_documentation_page_with_links IS 'Retrieve page with all incoming and outgoing links';
COMMENT ON FUNCTION ts_martha.validate_documentation_links IS 'Validate all links and report broken ones';
COMMENT ON FUNCTION ts_martha.get_popular_documentation_pages IS 'Get most viewed pages in the last N days';

-- Migration complete
-- Phase 6.1: Documentation Hub Database Schema (14 SP) ✅
