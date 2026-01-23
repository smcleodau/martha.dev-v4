#!/usr/bin/env tsx

/**
 * Test Helpers
 *
 * Shared utility functions for autonomous verification tests.
 * Provides common test data generation, assertion helpers, and cleanup utilities.
 */

import { randomBytes } from 'crypto';
import { execSync } from 'child_process';
import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';

/**
 * Generate a unique test ID with timestamp and random suffix
 */
export function generateTestId(prefix: string = 'TEST'): string {
  const timestamp = Date.now();
  const random = randomBytes(4).toString('hex');
  return `${prefix}-${timestamp}-${random}`;
}

/**
 * Wait for a specified duration
 */
export async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Format duration from milliseconds to human-readable string
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
  if (ms < 3600000) return `${(ms / 60000).toFixed(2)}m`;
  return `${(ms / 3600000).toFixed(2)}h`;
}

/**
 * Create a temporary git repository for testing
 */
export function createTestRepo(name: string): string {
  const repoPath = join('/tmp', `test-repo-${name}-${Date.now()}`);

  try {
    mkdirSync(repoPath, { recursive: true });

    // Initialize git repo
    execSync('git init', { cwd: repoPath, stdio: 'pipe' });
    execSync('git config user.name "Test User"', { cwd: repoPath, stdio: 'pipe' });
    execSync('git config user.email "test@example.com"', { cwd: repoPath, stdio: 'pipe' });

    // Create initial commit
    writeFileSync(join(repoPath, 'README.md'), '# Test Repository\n');
    execSync('git add .', { cwd: repoPath, stdio: 'pipe' });
    execSync('git commit -m "Initial commit"', { cwd: repoPath, stdio: 'pipe' });

    return repoPath;
  } catch (error: any) {
    // Cleanup on error
    try {
      rmSync(repoPath, { recursive: true, force: true });
    } catch {}
    throw error;
  }
}

/**
 * Cleanup test repository
 */
export function cleanupTestRepo(repoPath: string): void {
  try {
    rmSync(repoPath, { recursive: true, force: true });
  } catch (error) {
    console.warn(`Failed to cleanup test repo: ${repoPath}`, error);
  }
}

/**
 * Generate mock evidence data for testing
 */
export function generateMockEvidence(stage: string, issueId: string): any {
  const timestamp = Date.now();

  const baseEvidence = {
    stage,
    issue_id: issueId,
    timestamp: new Date().toISOString(),
    workflow_id: `workflow-${issueId}`,
    agent_id: 'test-agent',
    quality_score: 85,
    validation_status: 'valid' as const,
  };

  switch (stage) {
    case 'DEVELOPMENT':
      return {
        ...baseEvidence,
        evidence_type: 'commits',
        evidence_data: {
          commits: [
            {
              sha: 'abc123',
              message: 'Implement feature',
              files: ['src/feature.ts'],
              lines_added: 100,
              lines_removed: 0,
            },
          ],
          total_commits: 1,
          total_lines_added: 100,
          total_lines_removed: 0,
        },
      };

    case 'TESTING':
      return {
        ...baseEvidence,
        evidence_type: 'test_results',
        evidence_data: {
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
      };

    case 'REVIEW':
      return {
        ...baseEvidence,
        evidence_type: 'review',
        evidence_data: {
          reviewer: 'test-reviewer',
          approved: true,
          comments: 'Looks good',
          timestamp: new Date().toISOString(),
        },
      };

    case 'MERGE':
      return {
        ...baseEvidence,
        evidence_type: 'merge',
        evidence_data: {
          merge_sha: 'def456',
          branch: 'feature/test',
          conflicts_resolved: true,
        },
      };

    default:
      return baseEvidence;
  }
}

/**
 * Calculate success rate from test results
 */
export function calculateSuccessRate(results: Array<{ passed: boolean }>): number {
  if (results.length === 0) return 0;
  const passed = results.filter(r => r.passed).length;
  return Math.round((passed / results.length) * 100 * 100) / 100;
}
