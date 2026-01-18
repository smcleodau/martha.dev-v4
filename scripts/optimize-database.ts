/**
 * Database Optimization Script
 * TASK-7.4.2: Analyze queries and optimize indexes
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { pool } from '../src/database/client.js';
import { createLogger } from '../src/utils/logger.js';

const logger = createLogger({ module: 'db-optimize' });

interface QueryPlan {
  query: string;
  plan: string;
  usesIndex: boolean;
  seqScans: number;
  indexScans: number;
  estimatedCost: number;
}

/**
 * Critical queries to analyze
 */
const CRITICAL_QUERIES = [
  {
    name: 'Recent telemetry events by workflow',
    query: `
      SELECT * FROM ts_martha.telemetry_events
      WHERE workflow_id = 'test-workflow-123'
        AND timestamp > NOW() - INTERVAL '1 hour'
      ORDER BY timestamp DESC
      LIMIT 100
    `,
  },
  {
    name: 'Error events in last 24 hours',
    query: `
      SELECT * FROM ts_martha.telemetry_events
      WHERE severity IN ('error', 'critical')
        AND timestamp > NOW() - INTERVAL '24 hours'
      ORDER BY timestamp DESC
    `,
  },
  {
    name: 'Agent performance metrics',
    query: `
      SELECT * FROM ts_martha.agent_performance
      WHERE agent_id = 'test-agent'
        AND timestamp > NOW() - INTERVAL '1 hour'
      ORDER BY timestamp DESC
    `,
  },
  {
    name: 'Open exceptions by severity',
    query: `
      SELECT * FROM ts_martha.exceptions
      WHERE resolved = FALSE
        AND severity = 'critical'
      ORDER BY detected_at DESC
    `,
  },
  {
    name: 'Learning feedback for agent',
    query: `
      SELECT * FROM ts_martha.learning_feedback
      WHERE agent_id = 'test-agent'
        AND created_at > NOW() - INTERVAL '7 days'
      ORDER BY created_at DESC
    `,
  },
  {
    name: 'Documentation pages by worktree',
    query: `
      SELECT * FROM ts_martha.documentation_pages
      WHERE worktree_id = 'test-worktree'
        AND category = 'TASK'
      ORDER BY updated_at DESC
    `,
  },
];

/**
 * Analyze a query with EXPLAIN ANALYZE
 */
async function analyzeQuery(
  name: string,
  query: string
): Promise<QueryPlan | null> {
  try {
    logger.info(`Analyzing query: ${name}`);

    // Run EXPLAIN (ANALYZE, BUFFERS) to get detailed execution plan
    const result = await pool.query(`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${query}`);
    const plan = result.rows[0]['QUERY PLAN'][0];

    // Extract key metrics
    const planText = JSON.stringify(plan, null, 2);
    const usesIndex = planText.includes('Index Scan') || planText.includes('Index Only Scan');
    const seqScans = (planText.match(/Seq Scan/g) || []).length;
    const indexScans = (planText.match(/Index Scan/g) || []).length;
    const estimatedCost = plan.Plan['Total Cost'];

    logger.info(`Query analysis complete: ${name}`, {
      usesIndex,
      seqScans,
      indexScans,
      estimatedCost,
    });

    return {
      query,
      plan: planText,
      usesIndex,
      seqScans,
      indexScans,
      estimatedCost,
    };
  } catch (error) {
    logger.error(`Failed to analyze query: ${name}`, {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return null;
  }
}

/**
 * Check for missing indexes
 */
async function checkMissingIndexes(): Promise<void> {
  logger.info('Checking for missing indexes...');

  try {
    // Get table sizes
    const tableSizes = await pool.query(`
      SELECT
        schemaname,
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
        pg_total_relation_size(schemaname||'.'||tablename) AS size_bytes
      FROM pg_tables
      WHERE schemaname = 'ts_martha'
      ORDER BY size_bytes DESC
    `);

    logger.info('Table sizes:', {
      tables: tableSizes.rows,
    });

    // Check for unused indexes
    const unusedIndexes = await pool.query(`
      SELECT
        schemaname,
        tablename,
        indexname,
        idx_scan,
        pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
      FROM pg_stat_user_indexes
      WHERE schemaname = 'ts_martha'
        AND idx_scan = 0
      ORDER BY pg_relation_size(indexrelid) DESC
    `);

    if (unusedIndexes.rows.length > 0) {
      logger.warn('Found unused indexes:', {
        indexes: unusedIndexes.rows,
      });
    } else {
      logger.info('No unused indexes found');
    }

    // Check for tables without indexes
    const tablesWithoutIndexes = await pool.query(`
      SELECT
        t.schemaname,
        t.tablename,
        pg_size_pretty(pg_total_relation_size(t.schemaname||'.'||t.tablename)) AS size
      FROM pg_tables t
      LEFT JOIN pg_indexes i ON t.schemaname = i.schemaname AND t.tablename = i.tablename
      WHERE t.schemaname = 'ts_martha'
        AND i.indexname IS NULL
      GROUP BY t.schemaname, t.tablename
    `);

    if (tablesWithoutIndexes.rows.length > 0) {
      logger.warn('Found tables without indexes:', {
        tables: tablesWithoutIndexes.rows,
      });
    }
  } catch (error) {
    logger.error('Failed to check missing indexes', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Get index usage statistics
 */
async function getIndexStatistics(): Promise<void> {
  logger.info('Getting index usage statistics...');

  try {
    const stats = await pool.query(`
      SELECT
        schemaname,
        tablename,
        indexname,
        idx_scan,
        idx_tup_read,
        idx_tup_fetch,
        pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
      FROM pg_stat_user_indexes
      WHERE schemaname = 'ts_martha'
      ORDER BY idx_scan DESC
    `);

    logger.info('Index usage statistics:', {
      indexes: stats.rows,
    });

    // Calculate index efficiency
    for (const row of stats.rows) {
      const efficiency = row.idx_scan > 0
        ? (row.idx_tup_fetch / row.idx_scan).toFixed(2)
        : 0;
      logger.info(`Index ${row.indexname}: scans=${row.idx_scan}, efficiency=${efficiency}`);
    }
  } catch (error) {
    logger.error('Failed to get index statistics', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Create optimization migration
 */
async function createOptimizationMigration(): Promise<void> {
  logger.info('Creating optimization migration...');

  const migration = `-- Migration: Database Index Optimization
-- TASK-7.4.2: Add missing indexes for production performance
-- Generated: ${new Date().toISOString()}

-- Add composite index for telemetry queries with multiple filters
CREATE INDEX IF NOT EXISTS idx_telemetry_events_workflow_time_severity
  ON ts_martha.telemetry_events (workflow_id, timestamp DESC, severity)
  WHERE severity IN ('error', 'critical');

-- Add index for agent performance time-series queries
CREATE INDEX IF NOT EXISTS idx_agent_performance_agent_time
  ON ts_martha.agent_performance (agent_id, timestamp DESC);

-- Add index for exception resolution tracking
CREATE INDEX IF NOT EXISTS idx_exceptions_resolution_tracking
  ON ts_martha.exceptions (resolved, severity, detected_at DESC);

-- Add index for learning feedback queries by context
CREATE INDEX IF NOT EXISTS idx_learning_feedback_context
  ON ts_martha.learning_feedback (agent_id, feedback_type, created_at DESC);

-- Add index for documentation full-text search
CREATE INDEX IF NOT EXISTS idx_documentation_pages_search
  ON ts_martha.documentation_pages USING GIN (to_tsvector('english', title || ' ' || content));

-- Add index for documentation category queries
CREATE INDEX IF NOT EXISTS idx_documentation_pages_worktree_category
  ON ts_martha.documentation_pages (worktree_id, category, updated_at DESC);

-- Add covering index for telemetry event counts
CREATE INDEX IF NOT EXISTS idx_telemetry_events_count_covering
  ON ts_martha.telemetry_events (workflow_id, event_type, timestamp DESC)
  INCLUDE (duration_ms, severity);

-- Add index for exception type analysis
CREATE INDEX IF NOT EXISTS idx_exceptions_type_time_resolved
  ON ts_martha.exceptions (exception_type, detected_at DESC)
  WHERE resolved = FALSE;

-- Statistics update to help query planner
ANALYZE ts_martha.telemetry_events;
ANALYZE ts_martha.agent_performance;
ANALYZE ts_martha.exceptions;
ANALYZE ts_martha.learning_feedback;
ANALYZE ts_martha.documentation_pages;

-- Comments
COMMENT ON INDEX ts_martha.idx_telemetry_events_workflow_time_severity IS 'Optimized for error queries filtered by workflow and severity';
COMMENT ON INDEX ts_martha.idx_agent_performance_agent_time IS 'Optimized for agent performance time-series queries';
COMMENT ON INDEX ts_martha.idx_exceptions_resolution_tracking IS 'Optimized for open exception queries by severity';
COMMENT ON INDEX ts_martha.idx_learning_feedback_context IS 'Optimized for learning feedback retrieval by agent and type';
COMMENT ON INDEX ts_martha.idx_documentation_pages_search IS 'Full-text search on documentation content';
COMMENT ON INDEX ts_martha.idx_documentation_pages_worktree_category IS 'Optimized for documentation listing by worktree and category';
`;

  // Write migration file
  const fs = await import('fs/promises');
  const path = await import('path');
  const migrationPath = path.join(
    process.cwd(),
    'migrations',
    '008_index_optimization.sql'
  );

  await fs.writeFile(migrationPath, migration, 'utf-8');
  logger.info(`Migration created: ${migrationPath}`);
}

/**
 * Main function
 */
async function main() {
  try {
    logger.info('Starting database optimization analysis...');

    // Analyze critical queries
    const results: Array<{ name: string; plan: QueryPlan | null }> = [];
    for (const { name, query } of CRITICAL_QUERIES) {
      const plan = await analyzeQuery(name, query);
      results.push({ name, plan });
    }

    // Check for missing indexes
    await checkMissingIndexes();

    // Get index statistics
    await getIndexStatistics();

    // Create optimization migration
    await createOptimizationMigration();

    // Generate report
    logger.info('=== OPTIMIZATION REPORT ===');
    logger.info('\nQuery Analysis Results:');
    for (const { name, plan } of results) {
      if (plan) {
        logger.info(`\n${name}:`);
        logger.info(`  Uses Index: ${plan.usesIndex}`);
        logger.info(`  Seq Scans: ${plan.seqScans}`);
        logger.info(`  Index Scans: ${plan.indexScans}`);
        logger.info(`  Estimated Cost: ${plan.estimatedCost}`);
        if (!plan.usesIndex && plan.seqScans > 0) {
          logger.warn(`  ⚠️  Query uses sequential scan - consider adding index`);
        }
      }
    }

    logger.info('\n=== RECOMMENDATIONS ===');
    logger.info('1. Review migration file: migrations/008_index_optimization.sql');
    logger.info('2. Run migration: npm run db:migrate');
    logger.info('3. Monitor query performance after index creation');
    logger.info('4. Run VACUUM ANALYZE on tables after adding indexes');

    process.exit(0);
  } catch (error) {
    logger.error('Database optimization failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    process.exit(1);
  }
}

main();
