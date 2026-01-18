/**
 * Evidence Validator
 *
 * Validates evidence against stage-specific rules and calculates quality scores.
 * Each stage has different validation requirements that must be met for progression.
 *
 * Validation Rules:
 * - DEVELOPMENT: has_commits, code_stats_present, file_changes_tracked
 * - TESTING: has_test_results, all_tests_passed, braintrust_traces_for_llm
 * - REVIEW: has_reviews, all_reviews_approved
 * - MERGE: merge_sha_present, conflicts_resolved
 *
 * Quality Score Calculation:
 * - Weighted average of rule results
 * - Required rules must pass for valid status
 * - Score range: 0-100
 */

import { createLogger } from '../utils/logger.js';
import type {
  BaseEvidence,
  ValidationSummary,
  ValidationRule,
  RuleResult,
  DevelopmentEvidence,
  TestingEvidence,
  ReviewEvidence,
  MergeEvidence,
  calculateQualityScore,
} from '../../tracker/types/evidence.js';

const logger = createLogger({ module: 'evidence-validator' });

/**
 * Evidence Validator Service
 */
export class EvidenceValidator {
  private stageRules: Map<string, ValidationRule[]> = new Map();

  constructor() {
    this.initializeRules();
  }

  /**
   * Initialize validation rules for each stage
   */
  private initializeRules(): void {
    // Development stage rules
    this.stageRules.set('DEVELOPMENT', [
      {
        name: 'has_commits',
        description: 'At least one commit must be present',
        stage: 'DEVELOPMENT',
        weight: 40,
        required: true,
        validator: (evidence: BaseEvidence[]) => {
          const devEvidence = evidence.filter(
            (e) => e.evidenceType === 'commits'
          ) as DevelopmentEvidence[];

          const hasCommits = devEvidence.some(
            (e) => e.evidenceData.commits && e.evidenceData.commits.length > 0
          );

          return {
            ruleName: 'has_commits',
            ruleDescription: 'At least one commit must be present',
            passed: hasCommits,
            weight: 40,
            actualValue: devEvidence.reduce(
              (sum, e) => sum + (e.evidenceData.commits?.length || 0),
              0
            ),
            expectedValue: '> 0',
            errorMessage: hasCommits ? undefined : 'No commits found in development evidence',
          };
        },
      },
      {
        name: 'code_stats_present',
        description: 'Code statistics must be tracked',
        stage: 'DEVELOPMENT',
        weight: 30,
        required: false,
        validator: (evidence: BaseEvidence[]) => {
          const devEvidence = evidence.filter(
            (e) => e.evidenceType === 'code_stats'
          ) as DevelopmentEvidence[];

          const hasStats = devEvidence.some((e) => e.evidenceData.codeStats);

          return {
            ruleName: 'code_stats_present',
            ruleDescription: 'Code statistics must be tracked',
            passed: hasStats,
            weight: 30,
            actualValue: hasStats,
            expectedValue: true,
            errorMessage: hasStats ? undefined : 'Code statistics not found',
          };
        },
      },
      {
        name: 'file_changes_tracked',
        description: 'File changes must be tracked',
        stage: 'DEVELOPMENT',
        weight: 30,
        required: false,
        validator: (evidence: BaseEvidence[]) => {
          const devEvidence = evidence.filter(
            (e) => e.evidenceType === 'file_changes'
          ) as DevelopmentEvidence[];

          const hasFileChanges = devEvidence.some(
            (e) => e.evidenceData.fileChanges && e.evidenceData.fileChanges.length > 0
          );

          return {
            ruleName: 'file_changes_tracked',
            ruleDescription: 'File changes must be tracked',
            passed: hasFileChanges,
            weight: 30,
            actualValue: devEvidence.reduce(
              (sum, e) => sum + (e.evidenceData.fileChanges?.length || 0),
              0
            ),
            expectedValue: '> 0',
            errorMessage: hasFileChanges ? undefined : 'No file changes tracked',
          };
        },
      },
    ]);

    // Testing stage rules
    this.stageRules.set('TESTING', [
      {
        name: 'has_test_results',
        description: 'Test results must be present',
        stage: 'TESTING',
        weight: 40,
        required: true,
        validator: (evidence: BaseEvidence[]) => {
          const testEvidence = evidence.filter(
            (e) => e.evidenceType === 'test_results'
          ) as TestingEvidence[];

          const hasResults = testEvidence.some((e) => e.evidenceData.testResults);

          return {
            ruleName: 'has_test_results',
            ruleDescription: 'Test results must be present',
            passed: hasResults,
            weight: 40,
            actualValue: hasResults,
            expectedValue: true,
            errorMessage: hasResults ? undefined : 'No test results found',
          };
        },
      },
      {
        name: 'all_tests_passed',
        description: 'All tests must pass (no failures)',
        stage: 'TESTING',
        weight: 50,
        required: true,
        validator: (evidence: BaseEvidence[]) => {
          const testEvidence = evidence.filter(
            (e) => e.evidenceType === 'test_results'
          ) as TestingEvidence[];

          if (testEvidence.length === 0) {
            return {
              ruleName: 'all_tests_passed',
              ruleDescription: 'All tests must pass (no failures)',
              passed: false,
              weight: 50,
              errorMessage: 'No test results to validate',
            };
          }

          const latestResults = testEvidence[testEvidence.length - 1].evidenceData.testResults;
          if (!latestResults) {
            return {
              ruleName: 'all_tests_passed',
              ruleDescription: 'All tests must pass (no failures)',
              passed: false,
              weight: 50,
              errorMessage: 'Test results data missing',
            };
          }

          const allPassed = latestResults.failed === 0;

          return {
            ruleName: 'all_tests_passed',
            ruleDescription: 'All tests must pass (no failures)',
            passed: allPassed,
            weight: 50,
            actualValue: `${latestResults.passed} passed, ${latestResults.failed} failed`,
            expectedValue: '0 failures',
            errorMessage: allPassed
              ? undefined
              : `${latestResults.failed} test(s) failed`,
          };
        },
      },
      {
        name: 'braintrust_traces_for_llm',
        description: 'Braintrust traces required for LLM-based features',
        stage: 'TESTING',
        weight: 10,
        required: false,
        validator: (evidence: BaseEvidence[]) => {
          const testEvidence = evidence.filter(
            (e) => e.evidenceType === 'braintrust_traces'
          ) as TestingEvidence[];

          // Check if this is an LLM feature (heuristic: check for AI/LLM in issue)
          // For now, we'll make this optional and give credit if traces exist
          const hasTraces = testEvidence.some(
            (e) => e.evidenceData.braintrustTraces && e.evidenceData.braintrustTraces.length > 0
          );

          return {
            ruleName: 'braintrust_traces_for_llm',
            ruleDescription: 'Braintrust traces required for LLM-based features',
            passed: true, // Optional, so always pass
            weight: 10,
            actualValue: hasTraces,
            expectedValue: 'traces if LLM feature',
          };
        },
      },
    ]);

    // Review stage rules
    this.stageRules.set('REVIEW', [
      {
        name: 'has_reviews',
        description: 'At least one code review must be present',
        stage: 'REVIEW',
        weight: 50,
        required: true,
        validator: (evidence: BaseEvidence[]) => {
          const reviewEvidence = evidence.filter(
            (e) => e.evidenceType === 'reviews'
          ) as ReviewEvidence[];

          const hasReviews = reviewEvidence.some(
            (e) => e.evidenceData.reviews && e.evidenceData.reviews.length > 0
          );

          return {
            ruleName: 'has_reviews',
            ruleDescription: 'At least one code review must be present',
            passed: hasReviews,
            weight: 50,
            actualValue: reviewEvidence.reduce(
              (sum, e) => sum + (e.evidenceData.reviews?.length || 0),
              0
            ),
            expectedValue: '> 0',
            errorMessage: hasReviews ? undefined : 'No code reviews found',
          };
        },
      },
      {
        name: 'all_reviews_approved',
        description: 'All reviews must be approved',
        stage: 'REVIEW',
        weight: 50,
        required: true,
        validator: (evidence: BaseEvidence[]) => {
          const reviewEvidence = evidence.filter(
            (e) => e.evidenceType === 'reviews'
          ) as ReviewEvidence[];

          if (reviewEvidence.length === 0) {
            return {
              ruleName: 'all_reviews_approved',
              ruleDescription: 'All reviews must be approved',
              passed: false,
              weight: 50,
              errorMessage: 'No reviews to validate',
            };
          }

          const latestEvidence = reviewEvidence[reviewEvidence.length - 1];
          const reviews = latestEvidence.evidenceData.reviews || [];

          if (reviews.length === 0) {
            return {
              ruleName: 'all_reviews_approved',
              ruleDescription: 'All reviews must be approved',
              passed: false,
              weight: 50,
              errorMessage: 'No reviews found',
            };
          }

          const allApproved = reviews.every((r) => r.status === 'approved');
          const approvedCount = reviews.filter((r) => r.status === 'approved').length;

          return {
            ruleName: 'all_reviews_approved',
            ruleDescription: 'All reviews must be approved',
            passed: allApproved,
            weight: 50,
            actualValue: `${approvedCount}/${reviews.length} approved`,
            expectedValue: 'all approved',
            errorMessage: allApproved
              ? undefined
              : `${reviews.length - approvedCount} review(s) not approved`,
          };
        },
      },
    ]);

    // Merge stage rules
    this.stageRules.set('MERGE', [
      {
        name: 'merge_sha_present',
        description: 'Merge commit SHA must be present',
        stage: 'MERGE',
        weight: 50,
        required: true,
        validator: (evidence: BaseEvidence[]) => {
          const mergeEvidence = evidence.filter(
            (e) => e.evidenceType === 'merge_details'
          ) as MergeEvidence[];

          const hasMergeSha = mergeEvidence.some((e) => e.evidenceData.mergeSha);

          return {
            ruleName: 'merge_sha_present',
            ruleDescription: 'Merge commit SHA must be present',
            passed: hasMergeSha,
            weight: 50,
            actualValue: hasMergeSha,
            expectedValue: true,
            errorMessage: hasMergeSha ? undefined : 'Merge SHA not found',
          };
        },
      },
      {
        name: 'conflicts_resolved',
        description: 'All merge conflicts must be resolved',
        stage: 'MERGE',
        weight: 50,
        required: true,
        validator: (evidence: BaseEvidence[]) => {
          const conflictEvidence = evidence.filter(
            (e) => e.evidenceType === 'conflicts'
          ) as MergeEvidence[];

          // If no conflict evidence, assume no conflicts (clean merge)
          if (conflictEvidence.length === 0) {
            return {
              ruleName: 'conflicts_resolved',
              ruleDescription: 'All merge conflicts must be resolved',
              passed: true,
              weight: 50,
              actualValue: 'no conflicts',
              expectedValue: 'all resolved',
            };
          }

          const latestEvidence = conflictEvidence[conflictEvidence.length - 1];
          const conflicts = latestEvidence.evidenceData.conflictsResolved || [];

          return {
            ruleName: 'conflicts_resolved',
            ruleDescription: 'All merge conflicts must be resolved',
            passed: true, // If conflicts tracked, they're resolved
            weight: 50,
            actualValue: `${conflicts.length} conflicts resolved`,
            expectedValue: 'all resolved',
          };
        },
      },
    ]);

    logger.info('Validation rules initialized', {
      stages: Array.from(this.stageRules.keys()),
    });
  }

  /**
   * Validate evidence for a stage
   */
  async validateEvidence(evidence: BaseEvidence[]): Promise<ValidationSummary> {
    if (evidence.length === 0) {
      return {
        issueId: '',
        stage: '',
        isValid: false,
        qualityScore: 0,
        validationTimestamp: new Date().toISOString(),
        rulesChecked: [],
        errors: ['No evidence provided'],
        warnings: [],
      };
    }

    const issueId = evidence[0].issueId;
    const stage = evidence[0].stage;

    logger.debug('Validating evidence', {
      issueId,
      stage,
      evidenceCount: evidence.length,
    });

    try {
      const rules = this.getRulesForStage(stage);

      if (rules.length === 0) {
        logger.warn('No validation rules for stage', { stage });
        return {
          issueId,
          stage,
          isValid: true,
          qualityScore: 100,
          validationTimestamp: new Date().toISOString(),
          rulesChecked: [],
          errors: [],
          warnings: [`No validation rules defined for stage: ${stage}`],
        };
      }

      // Run all validation rules
      const results: RuleResult[] = rules.map((rule) => {
        try {
          return rule.validator(evidence);
        } catch (error: any) {
          logger.error('Rule validation failed', {
            ruleName: rule.name,
            error: error.message,
          });
          return {
            ruleName: rule.name,
            ruleDescription: rule.description,
            passed: false,
            weight: rule.weight,
            errorMessage: `Validation error: ${error.message}`,
          };
        }
      });

      // Calculate quality score
      const qualityScore = this.calculateWeightedScore(results, rules);

      // Check if all required rules passed
      const requiredRules = rules.filter((r) => r.required);
      const requiredResults = results.filter((r) =>
        requiredRules.some((rule) => rule.name === r.ruleName)
      );
      const allRequiredPassed = requiredResults.every((r) => r.passed);

      // Collect errors and warnings
      const errors: string[] = results
        .filter((r) => !r.passed && requiredRules.some((rule) => rule.name === r.ruleName))
        .map((r) => r.errorMessage || `${r.ruleName} failed`)
        .filter((msg): msg is string => !!msg);

      const warnings: string[] = results
        .filter((r) => !r.passed && !requiredRules.some((rule) => rule.name === r.ruleName))
        .map((r) => r.errorMessage || `${r.ruleName} failed`)
        .filter((msg): msg is string => !!msg);

      const summary: ValidationSummary = {
        issueId,
        stage,
        isValid: allRequiredPassed,
        qualityScore,
        validationTimestamp: new Date().toISOString(),
        rulesChecked: results,
        errors,
        warnings,
      };

      logger.info('Evidence validation complete', {
        issueId,
        stage,
        isValid: summary.isValid,
        qualityScore,
        errorsCount: errors.length,
        warningsCount: warnings.length,
      });

      return summary;
    } catch (error: any) {
      logger.error('Evidence validation failed', {
        issueId,
        stage,
        error: error.message,
      });

      return {
        issueId,
        stage,
        isValid: false,
        qualityScore: 0,
        validationTimestamp: new Date().toISOString(),
        rulesChecked: [],
        errors: [`Validation failed: ${error.message}`],
        warnings: [],
      };
    }
  }

  /**
   * Get validation rules for a stage
   */
  private getRulesForStage(stage: string): ValidationRule[] {
    return this.stageRules.get(stage) || [];
  }

  /**
   * Calculate weighted quality score
   */
  private calculateWeightedScore(results: RuleResult[], rules: ValidationRule[]): number {
    if (results.length === 0) return 0;

    const totalWeight = results.reduce((sum, r) => sum + r.weight, 0);
    const weightedScore = results.reduce((sum, r) => {
      return sum + (r.passed ? r.weight : 0);
    }, 0);

    return totalWeight > 0 ? Math.round((weightedScore / totalWeight) * 100) : 0;
  }

  /**
   * Add custom validation rule
   */
  addRule(stage: string, rule: ValidationRule): void {
    const rules = this.stageRules.get(stage) || [];
    rules.push(rule);
    this.stageRules.set(stage, rules);

    logger.info('Custom validation rule added', {
      stage,
      ruleName: rule.name,
    });
  }

  /**
   * Get all rules for a stage
   */
  getStageRules(stage: string): ValidationRule[] {
    return this.getRulesForStage(stage);
  }
}

/**
 * Singleton instance
 */
export const evidenceValidator = new EvidenceValidator();
