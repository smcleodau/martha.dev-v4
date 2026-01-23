/**
 * Evidence Store Service
 *
 * Handles storage and retrieval of evidence events in TimescaleDB.
 * Provides methods for querying evidence by issue, stage, and filters.
 *
 * Features:
 * - Store evidence with automatic timestamping
 * - Query latest evidence by issue/stage
 * - Get complete evidence timeline
 * - Filter evidence by validation status and quality
 * - Efficient time-series queries using TimescaleDB
 */

import { query } from '../database/client.js';
import { createLogger } from '../utils/logger.js';
import type {
  BaseEvidence,
  EvidenceQueryFilters,
  ValidationSummary,
} from '../../tracker/types/evidence.js';

const logger = createLogger({ module: 'evidence-store' });

/**
 * Evidence Store Service
 */
export class EvidenceStore {
  /**
   * Store evidence event
   */
  async storeEvidence(evidence: BaseEvidence): Promise<number> {
    const startTime = Date.now();

    logger.info('Storing evidence', {
      issueId: evidence.issueId,
      stage: evidence.stage,
      evidenceType: evidence.evidenceType,
      qualityScore: evidence.qualityScore,
    });

    try {
      const result = await query(
        `INSERT INTO evidence_events (
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
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id`,
        [
          evidence.eventId,
          evidence.issueId,
          evidence.stage,
          evidence.evidenceType,
          evidence.timestamp || new Date().toISOString(),
          JSON.stringify((evidence as any).evidenceData || {}),
          evidence.qualityScore || null,
          evidence.validationStatus || 'pending',
          evidence.validationErrors || null,
          evidence.workflowId || null,
          evidence.agentId || null,
        ]
      );

      const id = result.rows[0].id;
      const duration = Date.now() - startTime;

      logger.info('Evidence stored successfully', {
        id,
        issueId: evidence.issueId,
        stage: evidence.stage,
        duration,
      });

      return id;
    } catch (error: any) {
      logger.error('Failed to store evidence', {
        issueId: evidence.issueId,
        stage: evidence.stage,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get latest evidence for an issue and stage
   */
  async getLatestEvidence(
    issueId: string,
    stage: string
  ): Promise<BaseEvidence | null> {
    logger.debug('Getting latest evidence', { issueId, stage });

    try {
      const result = await query(
        `SELECT
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
        WHERE issue_id = $1 AND stage = $2
        ORDER BY timestamp DESC
        LIMIT 1`,
        [issueId, stage]
      );

      if (result.rows.length === 0) {
        logger.debug('No evidence found', { issueId, stage });
        return null;
      }

      const row = result.rows[0];
      const evidence: BaseEvidence = {
        eventId: row.event_id,
        issueId: row.issue_id,
        stage: row.stage,
        evidenceType: row.evidence_type,
        timestamp: row.timestamp,
        qualityScore: row.quality_score,
        validationStatus: row.validation_status,
        validationErrors: row.validation_errors,
        workflowId: row.workflow_id,
        agentId: row.agent_id,
        ...(row.evidence_data || {}),
      };

      logger.debug('Latest evidence retrieved', {
        issueId,
        stage,
        evidenceType: evidence.evidenceType,
      });

      return evidence;
    } catch (error: any) {
      logger.error('Failed to get latest evidence', {
        issueId,
        stage,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get evidence timeline for an issue (all stages)
   */
  async getEvidenceTimeline(issueId: string): Promise<BaseEvidence[]> {
    logger.debug('Getting evidence timeline', { issueId });

    try {
      const result = await query(
        `SELECT
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
        WHERE issue_id = $1
        ORDER BY timestamp ASC`,
        [issueId]
      );

      const timeline: BaseEvidence[] = result.rows.map((row) => ({
        eventId: row.event_id,
        issueId: row.issue_id,
        stage: row.stage,
        evidenceType: row.evidence_type,
        timestamp: row.timestamp,
        qualityScore: row.quality_score,
        validationStatus: row.validation_status,
        validationErrors: row.validation_errors,
        workflowId: row.workflow_id,
        agentId: row.agent_id,
        ...(row.evidence_data || {}),
      }));

      logger.debug('Evidence timeline retrieved', {
        issueId,
        eventCount: timeline.length,
      });

      return timeline;
    } catch (error: any) {
      logger.error('Failed to get evidence timeline', {
        issueId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Query evidence with filters
   */
  async queryEvidence(filters: EvidenceQueryFilters): Promise<BaseEvidence[]> {
    logger.debug('Querying evidence', { filters });

    try {
      const whereClauses: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      // Build WHERE clause dynamically based on filters
      if (filters.issueId) {
        whereClauses.push(`issue_id = $${paramIndex++}`);
        params.push(filters.issueId);
      }

      if (filters.stage) {
        whereClauses.push(`stage = $${paramIndex++}`);
        params.push(filters.stage);
      }

      if (filters.evidenceType) {
        whereClauses.push(`evidence_type = $${paramIndex++}`);
        params.push(filters.evidenceType);
      }

      if (filters.validationStatus) {
        whereClauses.push(`validation_status = $${paramIndex++}`);
        params.push(filters.validationStatus);
      }

      if (filters.minQualityScore !== undefined) {
        whereClauses.push(`quality_score >= $${paramIndex++}`);
        params.push(filters.minQualityScore);
      }

      if (filters.maxQualityScore !== undefined) {
        whereClauses.push(`quality_score <= $${paramIndex++}`);
        params.push(filters.maxQualityScore);
      }

      if (filters.workflowId) {
        whereClauses.push(`workflow_id = $${paramIndex++}`);
        params.push(filters.workflowId);
      }

      if (filters.agentId) {
        whereClauses.push(`agent_id = $${paramIndex++}`);
        params.push(filters.agentId);
      }

      if (filters.startTime) {
        whereClauses.push(`timestamp >= $${paramIndex++}`);
        params.push(filters.startTime);
      }

      if (filters.endTime) {
        whereClauses.push(`timestamp <= $${paramIndex++}`);
        params.push(filters.endTime);
      }

      const whereClause =
        whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

      // Build query
      const limit = filters.limit || 100;
      const offset = filters.offset || 0;

      const sql = `
        SELECT
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
        ${whereClause}
        ORDER BY timestamp DESC
        LIMIT $${paramIndex++}
        OFFSET $${paramIndex++}
      `;

      params.push(limit, offset);

      const result = await query(sql, params);

      const evidence: BaseEvidence[] = result.rows.map((row) => ({
        eventId: row.event_id,
        issueId: row.issue_id,
        stage: row.stage,
        evidenceType: row.evidence_type,
        timestamp: row.timestamp,
        qualityScore: row.quality_score,
        validationStatus: row.validation_status,
        validationErrors: row.validation_errors,
        workflowId: row.workflow_id,
        agentId: row.agent_id,
        evidenceData: row.evidence_data || {},
      }));

      logger.debug('Evidence query complete', {
        filters,
        resultCount: evidence.length,
      });

      return evidence;
    } catch (error: any) {
      logger.error('Failed to query evidence', {
        filters,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get all evidence for an issue and stage
   */
  async getStageEvidence(issueId: string, stage: string): Promise<BaseEvidence[]> {
    return this.queryEvidence({ issueId, stage });
  }

  /**
   * Get validation summary for an issue and stage
   */
  async getValidationSummary(
    issueId: string,
    stage: string
  ): Promise<{
    totalEvidence: number;
    validCount: number;
    invalidCount: number;
    pendingCount: number;
    avgQualityScore: number;
  } | null> {
    logger.debug('Getting validation summary', { issueId, stage });

    try {
      const result = await query(
        `SELECT
          COUNT(*) AS total_evidence,
          COUNT(*) FILTER (WHERE validation_status = 'valid') AS valid_count,
          COUNT(*) FILTER (WHERE validation_status = 'invalid') AS invalid_count,
          COUNT(*) FILTER (WHERE validation_status = 'pending') AS pending_count,
          AVG(quality_score) AS avg_quality_score
        FROM evidence_events
        WHERE issue_id = $1 AND stage = $2`,
        [issueId, stage]
      );

      if (result.rows.length === 0 || result.rows[0].total_evidence === '0') {
        return null;
      }

      const row = result.rows[0];
      return {
        totalEvidence: parseInt(row.total_evidence, 10),
        validCount: parseInt(row.valid_count, 10),
        invalidCount: parseInt(row.invalid_count, 10),
        pendingCount: parseInt(row.pending_count, 10),
        avgQualityScore: parseFloat(row.avg_quality_score || '0'),
      };
    } catch (error: any) {
      logger.error('Failed to get validation summary', {
        issueId,
        stage,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Update evidence validation status
   */
  async updateValidationStatus(
    eventId: string,
    validationStatus: 'valid' | 'invalid' | 'pending' | 'error',
    qualityScore?: number,
    validationErrors?: string[]
  ): Promise<void> {
    logger.debug('Updating validation status', {
      eventId,
      validationStatus,
      qualityScore,
    });

    try {
      await query(
        `UPDATE evidence_events
        SET
          validation_status = $1,
          quality_score = COALESCE($2, quality_score),
          validation_errors = COALESCE($3, validation_errors)
        WHERE event_id = $4`,
        [validationStatus, qualityScore, validationErrors, eventId]
      );

      logger.debug('Validation status updated', { eventId, validationStatus });
    } catch (error: any) {
      logger.error('Failed to update validation status', {
        eventId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Delete evidence for an issue (for cleanup/testing)
   */
  async deleteIssueEvidence(issueId: string): Promise<number> {
    logger.warn('Deleting all evidence for issue', { issueId });

    try {
      const result = await query(
        `DELETE FROM evidence_events WHERE issue_id = $1`,
        [issueId]
      );

      const deletedCount = result.rowCount || 0;

      logger.warn('Evidence deleted', { issueId, deletedCount });

      return deletedCount;
    } catch (error: any) {
      logger.error('Failed to delete evidence', {
        issueId,
        error: error.message,
      });
      throw error;
    }
  }
}

/**
 * Singleton instance
 */
export const evidenceStore = new EvidenceStore();
