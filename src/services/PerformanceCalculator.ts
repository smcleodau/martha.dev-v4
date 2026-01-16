/**
 * PerformanceCalculator Service
 * Phase 3: Epic 3.2 - Performance Calculator (13 SP)
 *
 * Calculates agent performance metrics, trends, and specializations
 * for ML-driven agent selection and performance monitoring.
 */

import { query } from '../database/client.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger({ module: 'performance-calculator' });

/**
 * Agent performance metrics
 */
export interface AgentPerformance {
  agentId: string;
  agentType: string;
  issueId: string;
  epicId?: string;
  batchId?: string;
  issueComplexity?: number;
  issueType?: string;
  issueTags?: string[];
  durationMs: number;
  commitCount?: number;
  testPassRate?: number;
  reworkCount?: number;
  codeQualityScore?: number;
  documentationComplete?: boolean;
  testsIncluded?: boolean;
  success: boolean;
  failureReason?: string;
  peakMemoryMb?: number;
  avgCpuPercent?: number;
  epicPhase?: string;
  dependenciesCount?: number;
}

/**
 * Agent performance summary
 */
export interface AgentPerformanceSummary {
  totalIssues: number;
  successfulIssues: number;
  successRate: number;
  avgDurationMs: number;
  avgQualityScore: number;
  bestIssueType?: string;
  totalCommits: number;
  avgComplexity: number;
}

/**
 * Agent specialization metrics
 */
export interface AgentSpecialization {
  agentId: string;
  agentType: string;
  issueType: string;
  totalIssues: number;
  successfulIssues: number;
  successRate: number;
  avgDurationMs: number;
  medianDurationMs: number;
  p95DurationMs: number;
  avgQualityScore: number;
  avgTestPassRate: number;
  docsCompletionRate: number;
  avgComplexityHandled: number;
  maxComplexityHandled: number;
  lastCompletedAt: Date;
}

/**
 * Agent trend data point
 */
export interface AgentTrendPoint {
  date: Date;
  dailyIssues: number;
  dailySuccesses: number;
  avgDurationMs: number;
  ma7DayDurationMs?: number;
  ma30DayDurationMs?: number;
}

/**
 * Top agent ranking
 */
export interface TopAgent {
  agentId: string;
  agentType: string;
  successRate: number;
  avgDurationMs: number;
  totalIssues: number;
}

/**
 * PerformanceCalculator service
 */
export class PerformanceCalculator {
  /**
   * Record agent performance for a completed issue
   * Called by recordCompletion activity
   */
  async recordPerformance(performance: AgentPerformance): Promise<void> {
    const start = Date.now();

    try {
      await query(
        `
        INSERT INTO agent_performance (
          agent_id,
          agent_type,
          issue_id,
          epic_id,
          batch_id,
          issue_complexity,
          issue_type,
          issue_tags,
          duration_ms,
          commit_count,
          test_pass_rate,
          rework_count,
          code_quality_score,
          documentation_complete,
          tests_included,
          success,
          failure_reason,
          peak_memory_mb,
          avg_cpu_percent,
          epic_phase,
          dependencies_count
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
        )
        ON CONFLICT (agent_id, issue_id) DO UPDATE SET
          duration_ms = EXCLUDED.duration_ms,
          commit_count = EXCLUDED.commit_count,
          test_pass_rate = EXCLUDED.test_pass_rate,
          rework_count = EXCLUDED.rework_count,
          code_quality_score = EXCLUDED.code_quality_score,
          documentation_complete = EXCLUDED.documentation_complete,
          tests_included = EXCLUDED.tests_included,
          success = EXCLUDED.success,
          failure_reason = EXCLUDED.failure_reason,
          completed_at = NOW()
        `,
        [
          performance.agentId,
          performance.agentType,
          performance.issueId,
          performance.epicId,
          performance.batchId,
          performance.issueComplexity,
          performance.issueType || 'feature',
          performance.issueTags,
          performance.durationMs,
          performance.commitCount ?? 0,
          performance.testPassRate,
          performance.reworkCount ?? 0,
          performance.codeQualityScore,
          performance.documentationComplete ?? false,
          performance.testsIncluded ?? false,
          performance.success,
          performance.failureReason,
          performance.peakMemoryMb,
          performance.avgCpuPercent,
          performance.epicPhase,
          performance.dependenciesCount ?? 0,
        ]
      );

      const duration = Date.now() - start;

      logger.info('Agent performance recorded', {
        agentId: performance.agentId,
        issueId: performance.issueId,
        success: performance.success,
        duration,
      });

      // Refresh materialized views asynchronously
      void this.refreshViews();
    } catch (error) {
      logger.error('Failed to record agent performance', {
        error: error instanceof Error ? error.message : 'Unknown error',
        agentId: performance.agentId,
        issueId: performance.issueId,
      });
      throw error;
    }
  }

  /**
   * Get agent performance summary
   */
  async getAgentSummary(agentId: string): Promise<AgentPerformanceSummary | null> {
    try {
      const result = await query<{
        total_issues: string;
        successful_issues: string;
        success_rate: string;
        avg_duration_ms: string;
        avg_quality_score: string;
        best_issue_type: string;
        total_commits: string;
        avg_complexity: string;
      }>(
        'SELECT * FROM get_agent_performance_summary($1)',
        [agentId]
      );

      const row = result.rows[0];
      if (!row) {
        return null;
      }

      return {
        totalIssues: parseInt(row.total_issues, 10),
        successfulIssues: parseInt(row.successful_issues, 10),
        successRate: parseFloat(row.success_rate),
        avgDurationMs: parseFloat(row.avg_duration_ms),
        avgQualityScore: parseFloat(row.avg_quality_score),
        bestIssueType: row.best_issue_type,
        totalCommits: parseInt(row.total_commits, 10),
        avgComplexity: parseFloat(row.avg_complexity),
      };
    } catch (error) {
      logger.error('Failed to get agent summary', {
        error: error instanceof Error ? error.message : 'Unknown error',
        agentId,
      });
      throw error;
    }
  }

  /**
   * Get agent specialization by issue type
   */
  async getSpecialization(agentId: string): Promise<AgentSpecialization[]> {
    try {
      const result = await query<{
        agent_id: string;
        agent_type: string;
        issue_type: string;
        total_issues: string;
        successful_issues: string;
        success_rate: string;
        avg_duration_ms: string;
        median_duration_ms: string;
        p95_duration_ms: string;
        avg_quality_score: string;
        avg_test_pass_rate: string;
        docs_completion_rate: string;
        avg_complexity_handled: string;
        max_complexity_handled: string;
        last_completed_at: Date;
      }>(
        `
        SELECT *
        FROM agent_specialization
        WHERE agent_id = $1
        ORDER BY total_issues DESC
        `,
        [agentId]
      );

      return result.rows.map((row) => ({
        agentId: row.agent_id,
        agentType: row.agent_type,
        issueType: row.issue_type,
        totalIssues: parseInt(row.total_issues, 10),
        successfulIssues: parseInt(row.successful_issues, 10),
        successRate: parseFloat(row.success_rate),
        avgDurationMs: parseFloat(row.avg_duration_ms),
        medianDurationMs: parseFloat(row.median_duration_ms),
        p95DurationMs: parseFloat(row.p95_duration_ms),
        avgQualityScore: parseFloat(row.avg_quality_score),
        avgTestPassRate: parseFloat(row.avg_test_pass_rate),
        docsCompletionRate: parseFloat(row.docs_completion_rate),
        avgComplexityHandled: parseFloat(row.avg_complexity_handled),
        maxComplexityHandled: parseInt(row.max_complexity_handled, 10),
        lastCompletedAt: row.last_completed_at,
      }));
    } catch (error) {
      logger.error('Failed to get agent specialization', {
        error: error instanceof Error ? error.message : 'Unknown error',
        agentId,
      });
      throw error;
    }
  }

  /**
   * Get agent trend analysis (30-day moving average)
   */
  async getTrendAnalysis(agentId: string, days: number = 30): Promise<AgentTrendPoint[]> {
    try {
      const result = await query<{
        date: Date;
        daily_issues: string;
        daily_successes: string;
        avg_duration_ms: string;
        ma_7day_duration_ms: string;
        ma_30day_duration_ms: string;
      }>(
        'SELECT * FROM get_agent_trend($1, $2)',
        [agentId, days]
      );

      return result.rows.map((row) => ({
        date: row.date,
        dailyIssues: parseInt(row.daily_issues, 10),
        dailySuccesses: parseInt(row.daily_successes, 10),
        avgDurationMs: parseFloat(row.avg_duration_ms),
        ma7DayDurationMs: row.ma_7day_duration_ms ? parseFloat(row.ma_7day_duration_ms) : undefined,
        ma30DayDurationMs: row.ma_30day_duration_ms ? parseFloat(row.ma_30day_duration_ms) : undefined,
      }));
    } catch (error) {
      logger.error('Failed to get agent trend', {
        error: error instanceof Error ? error.message : 'Unknown error',
        agentId,
        days,
      });
      throw error;
    }
  }

  /**
   * Get top performing agents for a specific issue type
   */
  async getTopAgentsByType(issueType: string, limit: number = 10): Promise<TopAgent[]> {
    try {
      const result = await query<{
        agent_id: string;
        agent_type: string;
        success_rate: string;
        avg_duration_ms: string;
        total_issues: string;
      }>(
        'SELECT * FROM get_top_agents_by_type($1, $2)',
        [issueType, limit]
      );

      return result.rows.map((row) => ({
        agentId: row.agent_id,
        agentType: row.agent_type,
        successRate: parseFloat(row.success_rate),
        avgDurationMs: parseFloat(row.avg_duration_ms),
        totalIssues: parseInt(row.total_issues, 10),
      }));
    } catch (error) {
      logger.error('Failed to get top agents by type', {
        error: error instanceof Error ? error.message : 'Unknown error',
        issueType,
        limit,
      });
      throw error;
    }
  }

  /**
   * Get best agent for a specific issue (ML-lite selection)
   * Uses success rate and average duration to rank agents
   */
  async getBestAgentForIssue(
    issueType: string,
    issueComplexity: number
  ): Promise<TopAgent | null> {
    try {
      // Get top agents for this issue type
      const topAgents = await this.getTopAgentsByType(issueType, 10);

      if (topAgents.length === 0) {
        return null;
      }

      // Filter by complexity capability
      const capableAgents = topAgents.filter((agent) => {
        // Agents should have handled similar complexity before
        // This is a simple heuristic - ML model will be more sophisticated
        return agent.totalIssues >= 3;
      });

      if (capableAgents.length === 0) {
        // Return best agent overall if no complexity match
        return topAgents[0] ?? null;
      }

      // Score agents: balance success rate and speed
      const scoredAgents = capableAgents.map((agent) => {
        // Normalize success rate (0-1) and speed (inverse, 0-1)
        const successScore = agent.successRate / 100;
        const maxDuration = Math.max(...capableAgents.map((a) => a.avgDurationMs));
        const speedScore = 1 - agent.avgDurationMs / maxDuration;

        // Weighted score: 70% success, 30% speed
        const score = successScore * 0.7 + speedScore * 0.3;

        return { ...agent, score };
      });

      // Sort by score descending
      scoredAgents.sort((a, b) => b.score - a.score);

      return scoredAgents[0] ?? null;
    } catch (error) {
      logger.error('Failed to get best agent for issue', {
        error: error instanceof Error ? error.message : 'Unknown error',
        issueType,
        issueComplexity,
      });
      throw error;
    }
  }

  /**
   * Refresh materialized views
   * Called after recording performance
   */
  private async refreshViews(): Promise<void> {
    try {
      await query('SELECT refresh_agent_views()');
      logger.debug('Agent performance views refreshed');
    } catch (error) {
      // Don't throw - view refresh is non-critical
      logger.warn('Failed to refresh agent views', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get comparative analysis for multiple agents
   */
  async getComparativeAnalysis(agentIds: string[]): Promise<AgentPerformanceSummary[]> {
    try {
      const summaries = await Promise.all(
        agentIds.map((agentId) => this.getAgentSummary(agentId))
      );

      return summaries.filter((s): s is AgentPerformanceSummary => s !== null);
    } catch (error) {
      logger.error('Failed to get comparative analysis', {
        error: error instanceof Error ? error.message : 'Unknown error',
        agentIds,
      });
      throw error;
    }
  }
}

/**
 * Singleton instance
 */
export const performanceCalculator = new PerformanceCalculator();
