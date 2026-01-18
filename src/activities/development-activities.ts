/**
 * Development Activities
 *
 * Temporal activities for capturing development evidence.
 * Uses simple-git to analyze commits, file changes, and code statistics.
 *
 * Features:
 * - Capture all commits on feature branch
 * - Track file changes (additions, modifications, deletions)
 * - Calculate code statistics (lines added/deleted, languages)
 * - Build comprehensive DevelopmentEvidence
 * - Store evidence with validation
 */

import { v4 as uuidv4 } from 'uuid';
import { Context } from '@temporalio/activity';
import simpleGit, { SimpleGit, DiffResult } from 'simple-git';
import * as fs from 'fs/promises';
import * as path from 'path';
import { createLogger } from '../utils/logger.js';
import { telemetryWriter } from '../services/TelemetryWriter.js';
import { evidenceStore } from '../evidence/evidence-store.js';
import { evidenceValidator } from '../validation/evidence-validator.js';
import type {
  DevelopmentEvidence,
  CommitInfo,
  CodeStats,
  FileChange,
} from '../../tracker/types/evidence.js';

const logger = createLogger({ module: 'development-activities' });

/**
 * Capture development evidence input
 */
export interface CaptureDevelopmentEvidenceInput {
  issueId: string;
  branch: string;
  baseBranch: string;
  worktreePath: string;
  epicId?: string;
}

/**
 * Capture development evidence result
 */
export interface CaptureDevelopmentEvidenceResult {
  commitCount: number;
  filesChanged: number;
  linesAdded: number;
  linesDeleted: number;
  qualityScore: number;
  evidenceStored: boolean;
  validationStatus: string;
}

/**
 * Capture Development Evidence Activity
 * Analyzes git commits and builds development evidence
 */
export async function captureDevelopmentEvidence(
  input: CaptureDevelopmentEvidenceInput
): Promise<CaptureDevelopmentEvidenceResult> {
  const activityId = uuidv4();
  const startTime = Date.now();
  const info = Context.current().info;
  const workflowId = info.workflowExecution.workflowId;

  logger.info('Capturing development evidence', {
    activityId,
    issueId: input.issueId,
    branch: input.branch,
    worktreePath: input.worktreePath,
  });

  // Telemetry: Activity started
  await telemetryWriter.writeEvent({
    workflowId,
    workflowType: 'IssueLifecycleWorkflow',
    eventType: 'activity_started',
    eventCategory: 'activity',
    severity: 'info',
    activityName: 'captureDevelopmentEvidence',
    activityId,
    issueId: input.issueId,
    epicId: input.epicId,
    source: 'temporal',
    retryAttempt: info.attempt,
  });

  try {
    const git: SimpleGit = simpleGit(input.worktreePath);

    // 1. Get all commits on branch (not in base branch)
    logger.info('Getting commits', {
      branch: input.branch,
      baseBranch: input.baseBranch,
    });

    const commits = await getCommits(git, input.branch, input.baseBranch);

    logger.info('Commits retrieved', {
      issueId: input.issueId,
      commitCount: commits.length,
    });

    // 2. Get diff for each commit and aggregate stats
    logger.info('Analyzing commit diffs');
    const fileChanges = await analyzeCommitDiffs(git, commits);

    // 3. Calculate code statistics
    logger.info('Calculating code statistics');
    const codeStats = calculateCodeStats(fileChanges, commits);

    // 4. Build evidence for commits
    const commitEvidence: DevelopmentEvidence = {
      eventId: uuidv4(),
      issueId: input.issueId,
      stage: 'DEVELOPMENT',
      evidenceType: 'commits',
      timestamp: new Date().toISOString(),
      workflowId,
      evidenceData: {
        commits,
        branch: input.branch,
        baseBranch: input.baseBranch,
        totalCommits: commits.length,
      },
    };

    // 5. Build evidence for code stats
    const codeStatsEvidence: DevelopmentEvidence = {
      eventId: uuidv4(),
      issueId: input.issueId,
      stage: 'DEVELOPMENT',
      evidenceType: 'code_stats',
      timestamp: new Date().toISOString(),
      workflowId,
      evidenceData: {
        codeStats,
      },
    };

    // 6. Build evidence for file changes
    const fileChangesEvidence: DevelopmentEvidence = {
      eventId: uuidv4(),
      issueId: input.issueId,
      stage: 'DEVELOPMENT',
      evidenceType: 'file_changes',
      timestamp: new Date().toISOString(),
      workflowId,
      evidenceData: {
        fileChanges,
        totalFilesChanged: fileChanges.length,
      },
    };

    // 7. Validate all evidence together
    const validation = await evidenceValidator.validateEvidence([
      commitEvidence,
      codeStatsEvidence,
      fileChangesEvidence,
    ]);

    // Update quality scores
    const qualityScore = validation.qualityScore;
    const validationStatus = validation.isValid ? 'valid' : 'invalid';

    commitEvidence.qualityScore = qualityScore;
    commitEvidence.validationStatus = validationStatus;
    commitEvidence.validationErrors = validation.errors;

    codeStatsEvidence.qualityScore = qualityScore;
    codeStatsEvidence.validationStatus = validationStatus;

    fileChangesEvidence.qualityScore = qualityScore;
    fileChangesEvidence.validationStatus = validationStatus;

    // 8. Store all evidence
    await evidenceStore.storeEvidence(commitEvidence);
    await evidenceStore.storeEvidence(codeStatsEvidence);
    await evidenceStore.storeEvidence(fileChangesEvidence);

    const durationMs = Date.now() - startTime;

    const result: CaptureDevelopmentEvidenceResult = {
      commitCount: commits.length,
      filesChanged: fileChanges.length,
      linesAdded: codeStats.linesAdded,
      linesDeleted: codeStats.linesDeleted,
      qualityScore,
      evidenceStored: true,
      validationStatus,
    };

    logger.info('Development evidence captured', {
      activityId,
      issueId: input.issueId,
      ...result,
    });

    // Telemetry: Activity completed
    await telemetryWriter.writeEvent({
      workflowId,
      workflowType: 'IssueLifecycleWorkflow',
      eventType: 'activity_completed',
      eventCategory: 'activity',
      severity: 'info',
      activityName: 'captureDevelopmentEvidence',
      activityId,
      issueId: input.issueId,
      epicId: input.epicId,
      payload: result,
      durationMs,
      source: 'temporal',
    });

    return result;
  } catch (error: any) {
    const durationMs = Date.now() - startTime;

    logger.error('Development evidence capture failed', {
      activityId,
      issueId: input.issueId,
      error: error.message,
    });

    // Telemetry: Activity failed
    await telemetryWriter.writeEvent({
      workflowId,
      workflowType: 'IssueLifecycleWorkflow',
      eventType: 'activity_failed',
      eventCategory: 'activity',
      severity: 'error',
      activityName: 'captureDevelopmentEvidence',
      activityId,
      issueId: input.issueId,
      epicId: input.epicId,
      durationMs,
      errorMessage: error.message,
      errorStack: error.stack,
      source: 'temporal',
    });

    throw error;
  }
}

/**
 * Get commits on branch (not in base branch)
 */
async function getCommits(
  git: SimpleGit,
  branch: string,
  baseBranch: string
): Promise<CommitInfo[]> {
  try {
    // Get log for commits in branch but not in base
    const log = await git.log({
      from: baseBranch,
      to: branch,
    });

    const commits: CommitInfo[] = [];

    for (const commit of log.all) {
      // Get diff stats for this commit
      const diffSummary = await git.diffSummary([`${commit.hash}~1`, commit.hash]);

      commits.push({
        sha: commit.hash,
        message: commit.message,
        author: commit.author_name,
        timestamp: commit.date,
        filesChanged: diffSummary.files.length,
        linesAdded: diffSummary.insertions,
        linesDeleted: diffSummary.deletions,
        files: diffSummary.files.map((f) => f.file),
      });
    }

    return commits;
  } catch (error: any) {
    logger.error('Failed to get commits', {
      error: error.message,
      branch,
      baseBranch,
    });
    return [];
  }
}

/**
 * Analyze commit diffs to extract file changes
 */
async function analyzeCommitDiffs(
  git: SimpleGit,
  commits: CommitInfo[]
): Promise<FileChange[]> {
  const fileChangesMap = new Map<string, FileChange>();

  for (const commit of commits) {
    try {
      // Get diff summary for this commit
      const diffSummary = await git.diffSummary([`${commit.sha}~1`, commit.sha]);

      for (const file of diffSummary.files) {
        const existingChange = fileChangesMap.get(file.file);

        if (existingChange) {
          // Aggregate changes
          existingChange.linesAdded += file.insertions;
          existingChange.linesDeleted += file.deletions;
        } else {
          // New file change
          const status = file.binary
            ? 'modified'
            : file.insertions > 0 && file.deletions === 0
            ? 'added'
            : file.insertions === 0 && file.deletions > 0
            ? 'deleted'
            : 'modified';

          fileChangesMap.set(file.file, {
            path: file.file,
            status,
            linesAdded: file.insertions,
            linesDeleted: file.deletions,
            language: detectLanguage(file.file),
          });
        }
      }
    } catch (error: any) {
      logger.warn('Failed to analyze commit diff', {
        commit: commit.sha,
        error: error.message,
      });
    }
  }

  return Array.from(fileChangesMap.values());
}

/**
 * Calculate aggregate code statistics
 */
function calculateCodeStats(fileChanges: FileChange[], commits: CommitInfo[]): CodeStats {
  const stats: CodeStats = {
    totalLines: 0,
    linesAdded: 0,
    linesDeleted: 0,
    filesAdded: 0,
    filesModified: 0,
    filesDeleted: 0,
    languages: {},
  };

  for (const file of fileChanges) {
    stats.linesAdded += file.linesAdded;
    stats.linesDeleted += file.linesDeleted;

    switch (file.status) {
      case 'added':
        stats.filesAdded++;
        break;
      case 'modified':
        stats.filesModified++;
        break;
      case 'deleted':
        stats.filesDeleted++;
        break;
    }

    // Track by language
    if (file.language) {
      if (!stats.languages[file.language]) {
        stats.languages[file.language] = {
          files: 0,
          lines: 0,
        };
      }

      stats.languages[file.language].files++;
      stats.languages[file.language].lines += file.linesAdded - file.linesDeleted;
    }
  }

  stats.totalLines = stats.linesAdded - stats.linesDeleted;

  return stats;
}

/**
 * Detect programming language from file extension
 */
function detectLanguage(filePath: string): string | undefined {
  const ext = path.extname(filePath).toLowerCase();

  const languageMap: { [key: string]: string } = {
    '.ts': 'TypeScript',
    '.tsx': 'TypeScript',
    '.js': 'JavaScript',
    '.jsx': 'JavaScript',
    '.py': 'Python',
    '.java': 'Java',
    '.cpp': 'C++',
    '.c': 'C',
    '.go': 'Go',
    '.rs': 'Rust',
    '.rb': 'Ruby',
    '.php': 'PHP',
    '.swift': 'Swift',
    '.kt': 'Kotlin',
    '.sql': 'SQL',
    '.sh': 'Shell',
    '.md': 'Markdown',
    '.json': 'JSON',
    '.yaml': 'YAML',
    '.yml': 'YAML',
    '.html': 'HTML',
    '.css': 'CSS',
    '.scss': 'SCSS',
  };

  return languageMap[ext];
}
