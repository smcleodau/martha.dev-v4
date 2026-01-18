/**
 * Stage Gate Implementation
 *
 * Enforces evidence requirements before allowing stage transitions.
 * Acts as quality gates to ensure each stage has valid evidence before progression.
 *
 * Gates:
 * - canMoveToTesting: Development -> Testing (requires commits)
 * - canMoveToReview: Testing -> Review (requires passing tests)
 * - canMoveToMerge: Review -> Merge (requires approved reviews)
 * - canMoveToCompletion: Merge -> Completion (requires merge evidence)
 *
 * Gate Check Process:
 * 1. Retrieve evidence for current stage
 * 2. Validate evidence against rules
 * 3. Check quality score threshold
 * 4. Return allowed/blocked with details
 */

import { createLogger } from '../../utils/logger.js';
import { evidenceStore } from '../../evidence/evidence-store.js';
import { evidenceValidator } from '../../validation/evidence-validator.js';
import type { ValidationSummary } from '../../../tracker/types/evidence.js';

const logger = createLogger({ module: 'stage-gates' });

/**
 * Gate check result
 */
export interface GateResult {
  allowed: boolean;
  reason: string;
  stage: string;
  targetStage: string;
  qualityScore?: number;
  missingRequirements: string[];
  validationSummary?: ValidationSummary;
  timestamp: string;
}

/**
 * Quality score thresholds for different stages
 */
const QUALITY_THRESHOLDS = {
  DEVELOPMENT: 70, // Must have commits and basic code tracking
  TESTING: 80, // Must have passing tests
  REVIEW: 75, // Must have approved reviews
  MERGE: 70, // Must have merge evidence
};

/**
 * Stage Gate Service
 */
export class StageGate {
  /**
   * Check if issue can move from Development to Testing
   */
  async canMoveToTesting(issueId: string): Promise<GateResult> {
    logger.info('Checking gate: Development -> Testing', { issueId });

    try {
      // Get development evidence
      const evidence = await evidenceStore.getStageEvidence(issueId, 'DEVELOPMENT');

      if (evidence.length === 0) {
        return {
          allowed: false,
          reason: 'No development evidence found',
          stage: 'DEVELOPMENT',
          targetStage: 'TESTING',
          missingRequirements: ['commits', 'code changes'],
          timestamp: new Date().toISOString(),
        };
      }

      // Validate evidence
      const validation = await evidenceValidator.validateEvidence(evidence);

      // Check if valid
      if (!validation.isValid) {
        return {
          allowed: false,
          reason: 'Development evidence validation failed',
          stage: 'DEVELOPMENT',
          targetStage: 'TESTING',
          qualityScore: validation.qualityScore,
          missingRequirements: validation.errors,
          validationSummary: validation,
          timestamp: new Date().toISOString(),
        };
      }

      // Check quality score threshold
      const threshold = QUALITY_THRESHOLDS.DEVELOPMENT;
      if (validation.qualityScore < threshold) {
        return {
          allowed: false,
          reason: `Quality score ${validation.qualityScore} below threshold ${threshold}`,
          stage: 'DEVELOPMENT',
          targetStage: 'TESTING',
          qualityScore: validation.qualityScore,
          missingRequirements: [`Quality score must be >= ${threshold}`],
          validationSummary: validation,
          timestamp: new Date().toISOString(),
        };
      }

      // Gate passed
      logger.info('Gate passed: Development -> Testing', {
        issueId,
        qualityScore: validation.qualityScore,
      });

      return {
        allowed: true,
        reason: 'Development evidence valid',
        stage: 'DEVELOPMENT',
        targetStage: 'TESTING',
        qualityScore: validation.qualityScore,
        missingRequirements: [],
        validationSummary: validation,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      logger.error('Gate check failed', {
        issueId,
        error: error.message,
      });

      return {
        allowed: false,
        reason: `Gate check error: ${error.message}`,
        stage: 'DEVELOPMENT',
        targetStage: 'TESTING',
        missingRequirements: ['Unable to validate evidence'],
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Check if issue can move from Testing to Review
   */
  async canMoveToReview(issueId: string): Promise<GateResult> {
    logger.info('Checking gate: Testing -> Review', { issueId });

    try {
      // Get testing evidence
      const evidence = await evidenceStore.getStageEvidence(issueId, 'TESTING');

      if (evidence.length === 0) {
        return {
          allowed: false,
          reason: 'No testing evidence found',
          stage: 'TESTING',
          targetStage: 'REVIEW',
          missingRequirements: ['test results', 'all tests passing'],
          timestamp: new Date().toISOString(),
        };
      }

      // Validate evidence
      const validation = await evidenceValidator.validateEvidence(evidence);

      // Check if valid (all tests must pass)
      if (!validation.isValid) {
        return {
          allowed: false,
          reason: 'Testing evidence validation failed - tests must pass',
          stage: 'TESTING',
          targetStage: 'REVIEW',
          qualityScore: validation.qualityScore,
          missingRequirements: validation.errors,
          validationSummary: validation,
          timestamp: new Date().toISOString(),
        };
      }

      // Check quality score threshold
      const threshold = QUALITY_THRESHOLDS.TESTING;
      if (validation.qualityScore < threshold) {
        return {
          allowed: false,
          reason: `Quality score ${validation.qualityScore} below threshold ${threshold}`,
          stage: 'TESTING',
          targetStage: 'REVIEW',
          qualityScore: validation.qualityScore,
          missingRequirements: [`Quality score must be >= ${threshold}`],
          validationSummary: validation,
          timestamp: new Date().toISOString(),
        };
      }

      // Gate passed
      logger.info('Gate passed: Testing -> Review', {
        issueId,
        qualityScore: validation.qualityScore,
      });

      return {
        allowed: true,
        reason: 'All tests passed, evidence valid',
        stage: 'TESTING',
        targetStage: 'REVIEW',
        qualityScore: validation.qualityScore,
        missingRequirements: [],
        validationSummary: validation,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      logger.error('Gate check failed', {
        issueId,
        error: error.message,
      });

      return {
        allowed: false,
        reason: `Gate check error: ${error.message}`,
        stage: 'TESTING',
        targetStage: 'REVIEW',
        missingRequirements: ['Unable to validate evidence'],
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Check if issue can move from Review to Merge
   */
  async canMoveToMerge(issueId: string): Promise<GateResult> {
    logger.info('Checking gate: Review -> Merge', { issueId });

    try {
      // Get review evidence
      const evidence = await evidenceStore.getStageEvidence(issueId, 'REVIEW');

      if (evidence.length === 0) {
        return {
          allowed: false,
          reason: 'No review evidence found',
          stage: 'REVIEW',
          targetStage: 'MERGE',
          missingRequirements: ['code reviews', 'approvals'],
          timestamp: new Date().toISOString(),
        };
      }

      // Validate evidence
      const validation = await evidenceValidator.validateEvidence(evidence);

      // Check if valid (all reviews must be approved)
      if (!validation.isValid) {
        return {
          allowed: false,
          reason: 'Review evidence validation failed - reviews must be approved',
          stage: 'REVIEW',
          targetStage: 'MERGE',
          qualityScore: validation.qualityScore,
          missingRequirements: validation.errors,
          validationSummary: validation,
          timestamp: new Date().toISOString(),
        };
      }

      // Check quality score threshold
      const threshold = QUALITY_THRESHOLDS.REVIEW;
      if (validation.qualityScore < threshold) {
        return {
          allowed: false,
          reason: `Quality score ${validation.qualityScore} below threshold ${threshold}`,
          stage: 'REVIEW',
          targetStage: 'MERGE',
          qualityScore: validation.qualityScore,
          missingRequirements: [`Quality score must be >= ${threshold}`],
          validationSummary: validation,
          timestamp: new Date().toISOString(),
        };
      }

      // Gate passed
      logger.info('Gate passed: Review -> Merge', {
        issueId,
        qualityScore: validation.qualityScore,
      });

      return {
        allowed: true,
        reason: 'All reviews approved, evidence valid',
        stage: 'REVIEW',
        targetStage: 'MERGE',
        qualityScore: validation.qualityScore,
        missingRequirements: [],
        validationSummary: validation,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      logger.error('Gate check failed', {
        issueId,
        error: error.message,
      });

      return {
        allowed: false,
        reason: `Gate check error: ${error.message}`,
        stage: 'REVIEW',
        targetStage: 'MERGE',
        missingRequirements: ['Unable to validate evidence'],
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Check if issue can move from Merge to Completion
   */
  async canMoveToCompletion(issueId: string): Promise<GateResult> {
    logger.info('Checking gate: Merge -> Completion', { issueId });

    try {
      // Get merge evidence
      const evidence = await evidenceStore.getStageEvidence(issueId, 'MERGE');

      if (evidence.length === 0) {
        return {
          allowed: false,
          reason: 'No merge evidence found',
          stage: 'MERGE',
          targetStage: 'COMPLETION',
          missingRequirements: ['merge commit SHA', 'conflicts resolved'],
          timestamp: new Date().toISOString(),
        };
      }

      // Validate evidence
      const validation = await evidenceValidator.validateEvidence(evidence);

      // Check if valid
      if (!validation.isValid) {
        return {
          allowed: false,
          reason: 'Merge evidence validation failed',
          stage: 'MERGE',
          targetStage: 'COMPLETION',
          qualityScore: validation.qualityScore,
          missingRequirements: validation.errors,
          validationSummary: validation,
          timestamp: new Date().toISOString(),
        };
      }

      // Check quality score threshold
      const threshold = QUALITY_THRESHOLDS.MERGE;
      if (validation.qualityScore < threshold) {
        return {
          allowed: false,
          reason: `Quality score ${validation.qualityScore} below threshold ${threshold}`,
          stage: 'MERGE',
          targetStage: 'COMPLETION',
          qualityScore: validation.qualityScore,
          missingRequirements: [`Quality score must be >= ${threshold}`],
          validationSummary: validation,
          timestamp: new Date().toISOString(),
        };
      }

      // Gate passed
      logger.info('Gate passed: Merge -> Completion', {
        issueId,
        qualityScore: validation.qualityScore,
      });

      return {
        allowed: true,
        reason: 'Merge completed successfully, evidence valid',
        stage: 'MERGE',
        targetStage: 'COMPLETION',
        qualityScore: validation.qualityScore,
        missingRequirements: [],
        validationSummary: validation,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      logger.error('Gate check failed', {
        issueId,
        error: error.message,
      });

      return {
        allowed: false,
        reason: `Gate check error: ${error.message}`,
        stage: 'MERGE',
        targetStage: 'COMPLETION',
        missingRequirements: ['Unable to validate evidence'],
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Check if issue can progress to any next stage
   * Determines current stage from latest evidence and checks appropriate gate
   */
  async canProgress(issueId: string, currentStage: string): Promise<GateResult> {
    logger.info('Checking if issue can progress', { issueId, currentStage });

    switch (currentStage) {
      case 'DEVELOPMENT':
        return this.canMoveToTesting(issueId);
      case 'TESTING':
        return this.canMoveToReview(issueId);
      case 'REVIEW':
        return this.canMoveToMerge(issueId);
      case 'MERGE':
        return this.canMoveToCompletion(issueId);
      default:
        return {
          allowed: false,
          reason: `Unknown stage: ${currentStage}`,
          stage: currentStage,
          targetStage: 'UNKNOWN',
          missingRequirements: ['Valid stage required'],
          timestamp: new Date().toISOString(),
        };
    }
  }
}

/**
 * Singleton instance
 */
export const stageGate = new StageGate();
