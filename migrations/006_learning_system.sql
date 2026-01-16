-- Migration 006: ML Learning System
-- Phase 5: Machine Learning infrastructure for agent selection and prediction
-- Stores training data, model versions, and learning feedback

-- Learning Feedback Table
-- Stores feedback from completed workflows for ML training
CREATE TABLE IF NOT EXISTS ts_martha.learning_feedback (
  id BIGSERIAL PRIMARY KEY,

  -- Workflow context
  workflow_id VARCHAR(255) NOT NULL,
  issue_id VARCHAR(100) NOT NULL,
  epic_id VARCHAR(100),

  -- Agent selection (features and outcome)
  agent_id VARCHAR(100) NOT NULL,
  agent_type VARCHAR(100) NOT NULL,
  agent_selected_by VARCHAR(50) NOT NULL, -- ml_model, round_robin, manual

  -- Issue features (for training)
  issue_complexity INTEGER NOT NULL, -- 1-10
  issue_type VARCHAR(50) NOT NULL, -- feature, bug, refactor, docs, test
  issue_title_embedding VECTOR(384), -- Text embedding for semantic matching (pgvector extension)
  issue_dependencies_count INTEGER DEFAULT 0,
  epic_phase VARCHAR(50),

  -- Agent features (at selection time)
  agent_recent_success_rate DECIMAL(5, 2), -- 0-100
  agent_avg_duration_ms INTEGER,
  agent_specialization_score DECIMAL(5, 2), -- 0-100 for this issue type
  agent_current_load INTEGER, -- Number of active issues

  -- Outcome (labels for ML)
  outcome_success BOOLEAN NOT NULL,
  outcome_duration_ms INTEGER NOT NULL,
  outcome_quality_score DECIMAL(5, 2), -- 0-100
  outcome_test_pass_rate DECIMAL(5, 2), -- 0-100
  outcome_rework_count INTEGER DEFAULT 0,

  -- Model predictions (for validation)
  predicted_success_probability DECIMAL(5, 4), -- 0-1
  predicted_duration_ms INTEGER,
  prediction_model_version VARCHAR(50),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ NOT NULL
);

-- Indexes for ML training queries
CREATE INDEX IF NOT EXISTS idx_learning_feedback_outcome
  ON ts_martha.learning_feedback (outcome_success, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_learning_feedback_agent_type
  ON ts_martha.learning_feedback (agent_type, issue_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_learning_feedback_complexity
  ON ts_martha.learning_feedback (issue_complexity, outcome_success);

-- Model Versions Table
-- Tracks deployed ML models and their performance
CREATE TABLE IF NOT EXISTS ts_martha.model_versions (
  id SERIAL PRIMARY KEY,
  model_name VARCHAR(100) NOT NULL, -- complexity_estimator, agent_selector, failure_predictor
  version VARCHAR(50) NOT NULL,

  -- Model metadata
  model_type VARCHAR(50) NOT NULL, -- xgboost, random_forest, neural_network
  training_samples INTEGER NOT NULL,
  training_duration_ms INTEGER,

  -- Performance metrics
  accuracy DECIMAL(5, 4), -- 0-1
  precision_score DECIMAL(5, 4), -- 0-1
  recall DECIMAL(5, 4), -- 0-1
  f1_score DECIMAL(5, 4), -- 0-1
  r2_score DECIMAL(5, 4), -- For regression models

  -- Model artifact
  model_file_path TEXT NOT NULL, -- Path to serialized model
  feature_names TEXT[], -- List of features used

  -- Deployment status
  is_active BOOLEAN DEFAULT FALSE,
  deployed_at TIMESTAMPTZ,
  deprecated_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,

  CONSTRAINT model_versions_unique UNIQUE (model_name, version)
);

CREATE INDEX IF NOT EXISTS idx_model_versions_active
  ON ts_martha.model_versions (model_name, is_active, created_at DESC);

-- Model Predictions Table (optional logging)
-- Stores model predictions for monitoring and debugging
CREATE TABLE IF NOT EXISTS ts_martha.model_predictions (
  id BIGSERIAL PRIMARY KEY,
  predicted_at TIMESTAMPTZ DEFAULT NOW(),

  -- Model identification
  model_name VARCHAR(100) NOT NULL,
  model_version VARCHAR(50) NOT NULL,

  -- Input features
  features JSONB NOT NULL,

  -- Prediction output
  prediction JSONB NOT NULL, -- e.g., {"complexity": 7, "confidence": 0.85}

  -- Actual outcome (filled in later)
  actual_outcome JSONB,
  outcome_recorded_at TIMESTAMPTZ,

  -- Context
  workflow_id VARCHAR(255),
  issue_id VARCHAR(100)
);

CREATE INDEX IF NOT EXISTS idx_model_predictions_model
  ON ts_martha.model_predictions (model_name, predicted_at DESC);

CREATE INDEX IF NOT EXISTS idx_model_predictions_workflow
  ON ts_martha.model_predictions (workflow_id)
  WHERE workflow_id IS NOT NULL;

-- Helper function: Get training data for agent selector
CREATE OR REPLACE FUNCTION ts_martha.get_agent_selector_training_data(
  p_min_samples INTEGER DEFAULT 100,
  p_days_back INTEGER DEFAULT 90
)
RETURNS TABLE (
  -- Features
  issue_complexity INTEGER,
  issue_type VARCHAR,
  agent_type VARCHAR,
  agent_recent_success_rate NUMERIC,
  agent_avg_duration_ms INTEGER,
  agent_specialization_score NUMERIC,
  agent_current_load INTEGER,
  -- Label
  outcome_success BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    lf.issue_complexity,
    lf.issue_type,
    lf.agent_type,
    lf.agent_recent_success_rate,
    lf.agent_avg_duration_ms,
    lf.agent_specialization_score,
    lf.agent_current_load,
    lf.outcome_success
  FROM ts_martha.learning_feedback lf
  WHERE lf.created_at >= NOW() - (p_days_back || ' days')::INTERVAL
  ORDER BY lf.created_at DESC
  LIMIT CASE WHEN COUNT(*) OVER() >= p_min_samples THEN 10000 ELSE 0 END;
END;
$$ LANGUAGE plpgsql;

-- Helper function: Get active model version
CREATE OR REPLACE FUNCTION ts_martha.get_active_model(p_model_name VARCHAR)
RETURNS TABLE (
  version VARCHAR,
  model_file_path TEXT,
  accuracy NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    mv.version,
    mv.model_file_path,
    mv.accuracy
  FROM ts_martha.model_versions mv
  WHERE mv.model_name = p_model_name
    AND mv.is_active = TRUE
  ORDER BY mv.deployed_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Helper function: Deploy new model version
CREATE OR REPLACE FUNCTION ts_martha.deploy_model(
  p_model_name VARCHAR,
  p_new_version VARCHAR
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Deactivate current active model
  UPDATE ts_martha.model_versions
  SET is_active = FALSE, deprecated_at = NOW()
  WHERE model_name = p_model_name
    AND is_active = TRUE;

  -- Activate new model
  UPDATE ts_martha.model_versions
  SET is_active = TRUE, deployed_at = NOW()
  WHERE model_name = p_model_name
    AND version = p_new_version;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE ts_martha.learning_feedback IS 'ML training data from completed workflows';
COMMENT ON TABLE ts_martha.model_versions IS 'ML model version registry with performance metrics';
COMMENT ON TABLE ts_martha.model_predictions IS 'Logged predictions for monitoring and debugging';
COMMENT ON FUNCTION ts_martha.get_agent_selector_training_data IS 'Get training dataset for agent selector model';
COMMENT ON FUNCTION ts_martha.get_active_model IS 'Get currently active model version';
COMMENT ON FUNCTION ts_martha.deploy_model IS 'Deploy a new model version (activates new, deactivates old)';

-- Migration complete
-- Phase 5 ML Learning System ✅
