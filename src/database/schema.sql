-- Martha TypeScript Database Schema
-- Schema: ts_martha (separate from Python version)

CREATE SCHEMA IF NOT EXISTS ts_martha;

-- Epic tracking
CREATE TABLE IF NOT EXISTS ts_martha.epics (
  id SERIAL PRIMARY KEY,
  epic_number INTEGER UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  state VARCHAR(50) NOT NULL, -- created, in_progress, testing, ready_for_merge, merged
  repository VARCHAR(255) NOT NULL,
  worktree_name VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Sub-issues linked to epics
CREATE TABLE IF NOT EXISTS ts_martha.issues (
  id SERIAL PRIMARY KEY,
  issue_number INTEGER NOT NULL,
  epic_id INTEGER REFERENCES ts_martha.epics(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  state VARCHAR(50) NOT NULL,
  assignee VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(issue_number, epic_id)
);

-- Worktree registry
CREATE TABLE IF NOT EXISTS ts_martha.worktrees (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  epic_id INTEGER REFERENCES ts_martha.epics(id) ON DELETE SET NULL,
  path TEXT NOT NULL,
  branch_name VARCHAR(255) NOT NULL,
  index INTEGER NOT NULL,
  ports JSONB NOT NULL,
  containers JSONB,
  database JSONB,
  status VARCHAR(50) NOT NULL, -- provisioning, active, paused, destroyed
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Swarm tracking
CREATE TABLE IF NOT EXISTS ts_martha.swarms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  epic_id INTEGER REFERENCES ts_martha.epics(id) ON DELETE SET NULL,
  worktree_id INTEGER REFERENCES ts_martha.worktrees(id) ON DELETE CASCADE,
  pid INTEGER,
  status VARCHAR(50) NOT NULL, -- spawning, running, paused, completed, crashed
  config JSONB,
  resource_usage JSONB,
  agent_count INTEGER DEFAULT 0,
  task_count INTEGER DEFAULT 0,
  last_heartbeat TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Test executions
CREATE TABLE IF NOT EXISTS ts_martha.test_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worktree_id INTEGER REFERENCES ts_martha.worktrees(id) ON DELETE CASCADE,
  issue_number INTEGER,
  suites TEXT[] NOT NULL,
  status VARCHAR(50) NOT NULL, -- running, passed, failed
  results JSONB,
  coverage_percent DECIMAL(5, 2),
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- Evidence tracking
CREATE TABLE IF NOT EXISTS ts_martha.evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_number INTEGER NOT NULL,
  test_execution_id UUID REFERENCES ts_martha.test_executions(id) ON DELETE SET NULL,
  braintrust_trace_ids TEXT[],
  braintrust_urls TEXT[],
  browserbase_session_ids TEXT[],
  browserbase_urls TEXT[],
  commit_hashes TEXT[],
  github_comment_url TEXT,
  validation_status VARCHAR(50), -- valid, invalid
  validation_errors TEXT[],
  created_at TIMESTAMP DEFAULT NOW()
);

-- Event log (optional - Redis is primary)
CREATE TABLE IF NOT EXISTS ts_martha.events (
  id BIGSERIAL PRIMARY KEY,
  worktree_name VARCHAR(255) NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  data JSONB,
  timestamp TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_epics_epic_number ON ts_martha.epics(epic_number);
CREATE INDEX IF NOT EXISTS idx_issues_epic_id ON ts_martha.issues(epic_id);
CREATE INDEX IF NOT EXISTS idx_issues_issue_number ON ts_martha.issues(issue_number);
CREATE INDEX IF NOT EXISTS idx_worktrees_name ON ts_martha.worktrees(name);
CREATE INDEX IF NOT EXISTS idx_worktrees_epic_id ON ts_martha.worktrees(epic_id);
CREATE INDEX IF NOT EXISTS idx_swarms_epic_id ON ts_martha.swarms(epic_id);
CREATE INDEX IF NOT EXISTS idx_swarms_worktree_id ON ts_martha.swarms(worktree_id);
CREATE INDEX IF NOT EXISTS idx_swarms_status ON ts_martha.swarms(status);
CREATE INDEX IF NOT EXISTS idx_test_executions_worktree_id ON ts_martha.test_executions(worktree_id);
CREATE INDEX IF NOT EXISTS idx_test_executions_issue_number ON ts_martha.test_executions(issue_number);
CREATE INDEX IF NOT EXISTS idx_evidence_issue_number ON ts_martha.evidence(issue_number);
CREATE INDEX IF NOT EXISTS idx_events_worktree ON ts_martha.events(worktree_name);
CREATE INDEX IF NOT EXISTS idx_events_type ON ts_martha.events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON ts_martha.events(timestamp DESC);

-- Update trigger for updated_at timestamps
CREATE OR REPLACE FUNCTION ts_martha.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update_updated_at trigger to relevant tables
CREATE TRIGGER update_epics_updated_at BEFORE UPDATE ON ts_martha.epics
  FOR EACH ROW EXECUTE FUNCTION ts_martha.update_updated_at_column();

CREATE TRIGGER update_issues_updated_at BEFORE UPDATE ON ts_martha.issues
  FOR EACH ROW EXECUTE FUNCTION ts_martha.update_updated_at_column();

CREATE TRIGGER update_worktrees_updated_at BEFORE UPDATE ON ts_martha.worktrees
  FOR EACH ROW EXECUTE FUNCTION ts_martha.update_updated_at_column();

CREATE TRIGGER update_swarms_updated_at BEFORE UPDATE ON ts_martha.swarms
  FOR EACH ROW EXECUTE FUNCTION ts_martha.update_updated_at_column();

-- Comments for documentation
COMMENT ON SCHEMA ts_martha IS 'Martha TypeScript migration schema - separate from Python version';
COMMENT ON TABLE ts_martha.epics IS 'GitHub epics (parent issues) being tracked';
COMMENT ON TABLE ts_martha.issues IS 'Sub-issues within epics';
COMMENT ON TABLE ts_martha.worktrees IS 'Git worktree registry with port allocations';
COMMENT ON TABLE ts_martha.swarms IS 'Claude-flow swarm instances and their state';
COMMENT ON TABLE ts_martha.test_executions IS 'Test run history with results';
COMMENT ON TABLE ts_martha.evidence IS 'Evidence bundles for completed issues';
COMMENT ON TABLE ts_martha.events IS 'Event log (Redis is primary, this is backup)';
