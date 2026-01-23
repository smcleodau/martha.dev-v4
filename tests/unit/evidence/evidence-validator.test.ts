/**
 * Evidence Validator Unit Tests
 *
 * Tests validation rules and quality score calculation for all stages:
 * - DEVELOPMENT
 * - TESTING
 * - REVIEW
 * - MERGE
 */

import { EvidenceValidator } from '../../../src/validation/evidence-validator.js';
import type { BaseEvidence, DevelopmentEvidence, TestingEvidence, ReviewEvidence, MergeEvidence } from '../../../tracker/types/evidence.js';

describe('EvidenceValidator', () => {
  let validator: EvidenceValidator;

  beforeEach(() => {
    validator = new EvidenceValidator();
  });

  describe('DEVELOPMENT Stage', () => {
    test('has_commits rule - passes with ≥1 commit', () => {
      const evidence: DevelopmentEvidence[] = [
        {
          stage: 'DEVELOPMENT',
          issueId: 'TEST-1',
          evidenceType: 'commits',
          evidenceData: {
            commits: [
              {
                sha: 'abc123',
                message: 'Initial commit',
                files: ['src/index.ts'],
                linesAdded: 100,
                linesRemoved: 0,
              },
            ],
          },
          timestamp: new Date().toISOString(),
          workflowId: 'wf-1',
          agentId: 'agent-1',
        },
      ];

      const result = validator.validateEvidence('DEVELOPMENT', evidence);

      expect(result.isValid).toBe(true);
      expect(result.passedRules).toContain('has_commits');
    });

    test('has_commits rule - fails with 0 commits', () => {
      const evidence: DevelopmentEvidence[] = [
        {
          stage: 'DEVELOPMENT',
          issueId: 'TEST-1',
          evidenceType: 'commits',
          evidenceData: {
            commits: [],
          },
          timestamp: new Date().toISOString(),
          workflowId: 'wf-1',
          agentId: 'agent-1',
        },
      ];

      const result = validator.validateEvidence('DEVELOPMENT', evidence);

      expect(result.isValid).toBe(false);
      expect(result.failedRules).toContain('has_commits');
    });

    test('quality score calculation', () => {
      const evidence: DevelopmentEvidence[] = [
        {
          stage: 'DEVELOPMENT',
          issueId: 'TEST-1',
          evidenceType: 'commits',
          evidenceData: {
            commits: [
              {
                sha: 'abc123',
                message: 'Implement feature',
                files: ['src/feature.ts'],
                linesAdded: 200,
                linesRemoved: 0,
              },
            ],
          },
          timestamp: new Date().toISOString(),
          workflowId: 'wf-1',
          agentId: 'agent-1',
        },
      ];

      const result = validator.validateEvidence('DEVELOPMENT', evidence);

      expect(result.qualityScore).toBeGreaterThanOrEqual(0);
      expect(result.qualityScore).toBeLessThanOrEqual(100);
    });
  });

  describe('TESTING Stage', () => {
    test('has_test_results rule - passes with test results', () => {
      const evidence: TestingEvidence[] = [
        {
          stage: 'TESTING',
          issueId: 'TEST-1',
          evidenceType: 'test_results',
          evidenceData: {
            framework: 'jest',
            total: 10,
            passed: 10,
            failed: 0,
            skipped: 0,
            duration: 1000,
            coverage: {
              statements: 90,
              branches: 85,
              functions: 95,
              lines: 90,
            },
          },
          timestamp: new Date().toISOString(),
          workflowId: 'wf-1',
          agentId: 'agent-1',
        },
      ];

      const result = validator.validateEvidence('TESTING', evidence);

      expect(result.isValid).toBe(true);
      expect(result.passedRules).toContain('has_test_results');
    });

    test('all_tests_passed rule - passes/fails based on test results', () => {
      const passingEvidence: TestingEvidence[] = [
        {
          stage: 'TESTING',
          issueId: 'TEST-1',
          evidenceType: 'test_results',
          evidenceData: {
            framework: 'jest',
            total: 10,
            passed: 10,
            failed: 0,
            skipped: 0,
            duration: 1000,
          },
          timestamp: new Date().toISOString(),
          workflowId: 'wf-1',
          agentId: 'agent-1',
        },
      ];

      const passingResult = validator.validateEvidence('TESTING', passingEvidence);
      expect(passingResult.passedRules).toContain('all_tests_passed');

      const failingEvidence: TestingEvidence[] = [
        {
          stage: 'TESTING',
          issueId: 'TEST-1',
          evidenceType: 'test_results',
          evidenceData: {
            framework: 'jest',
            total: 10,
            passed: 8,
            failed: 2,
            skipped: 0,
            duration: 1000,
          },
          timestamp: new Date().toISOString(),
          workflowId: 'wf-1',
          agentId: 'agent-1',
        },
      ];

      const failingResult = validator.validateEvidence('TESTING', failingEvidence);
      expect(failingResult.failedRules).toContain('all_tests_passed');
    });
  });

  describe('REVIEW Stage', () => {
    test('has_reviews rule - passes with reviews', () => {
      const evidence: ReviewEvidence[] = [
        {
          stage: 'REVIEW',
          issueId: 'TEST-1',
          evidenceType: 'review',
          evidenceData: {
            reviewer: 'reviewer-1',
            approved: true,
            comments: 'Looks good',
          },
          timestamp: new Date().toISOString(),
          workflowId: 'wf-1',
          agentId: 'agent-1',
        },
      ];

      const result = validator.validateEvidence('REVIEW', evidence);

      expect(result.isValid).toBe(true);
      expect(result.passedRules).toContain('has_reviews');
    });

    test('all_reviews_approved rule - requires approval', () => {
      const approvedEvidence: ReviewEvidence[] = [
        {
          stage: 'REVIEW',
          issueId: 'TEST-1',
          evidenceType: 'review',
          evidenceData: {
            reviewer: 'reviewer-1',
            approved: true,
            comments: 'LGTM',
          },
          timestamp: new Date().toISOString(),
          workflowId: 'wf-1',
          agentId: 'agent-1',
        },
      ];

      const approvedResult = validator.validateEvidence('REVIEW', approvedEvidence);
      expect(approvedResult.passedRules).toContain('all_reviews_approved');

      const unapprovedEvidence: ReviewEvidence[] = [
        {
          stage: 'REVIEW',
          issueId: 'TEST-1',
          evidenceType: 'review',
          evidenceData: {
            reviewer: 'reviewer-1',
            approved: false,
            comments: 'Needs changes',
          },
          timestamp: new Date().toISOString(),
          workflowId: 'wf-1',
          agentId: 'agent-1',
        },
      ];

      const unapprovedResult = validator.validateEvidence('REVIEW', unapprovedEvidence);
      expect(unapprovedResult.failedRules).toContain('all_reviews_approved');
    });
  });

  describe('MERGE Stage', () => {
    test('merge_sha_present rule - passes/fails based on SHA', () => {
      const evidence: MergeEvidence[] = [
        {
          stage: 'MERGE',
          issueId: 'TEST-1',
          evidenceType: 'merge',
          evidenceData: {
            mergeSha: 'abc123def456',
            branch: 'feature/test',
            conflictsResolved: true,
          },
          timestamp: new Date().toISOString(),
          workflowId: 'wf-1',
          agentId: 'agent-1',
        },
      ];

      const result = validator.validateEvidence('MERGE', evidence);

      expect(result.isValid).toBe(true);
      expect(result.passedRules).toContain('merge_sha_present');
    });
  });

  describe('General Validation', () => {
    test('handles empty evidence', () => {
      const result = validator.validateEvidence('DEVELOPMENT', []);

      expect(result.isValid).toBe(false);
      expect(result.qualityScore).toBe(0);
    });
  });
});
