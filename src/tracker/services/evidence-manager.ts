/**
 * Evidence Manager Service
 * Handles appending evidence events to issue JSON files
 */

import { readJsonSync, writeJsonSync, getIssuePath, fileExists, getWorktreePath, listFiles } from './file-storage.js';
import { loadIndex } from './index-manager.js';
import type { Issue } from '../types.js';
import { createLogger } from '../../utils/logger.js';
import * as path from 'node:path';

const logger = createLogger({ module: 'evidence-manager' });

/**
 * Evidence event structure for issue JSON
 */
export interface IssueEvidenceEvent {
  event_id: string;
  stage: string;
  evidence_type: string;
  timestamp: string;
  evidence_data: any;
  quality_score: number;
  validation_status: string;
  workflow_id: string;
  agent_id: string | null;
}

/**
 * Issue location result
 */
interface IssueLocation {
  worktreeId: string;
  boardId: string;
}

/**
 * Find the worktree and board for an issue ID
 * @param issueId Issue identifier
 * @returns Issue location or null if not found
 */
function findIssueLocation(issueId: string): IssueLocation | null {
  try {
    // Common worktrees to check (prioritized order)
    const worktreesToCheck = ['calculator-app', 'default'];

    for (const worktreeId of worktreesToCheck) {
      try {
        const indexPath = getWorktreePath(worktreeId, 'index.json');
        if (!fileExists(indexPath)) {
          continue;
        }

        const index = loadIndex(worktreeId);
        const issueEntry = index.issues[issueId];

        if (issueEntry) {
          return {
            worktreeId,
            boardId: issueEntry.board_id,
          };
        }
      } catch {
        // Continue to next worktree
        continue;
      }
    }

    // If not found in common worktrees, scan all worktrees
    const marthaRoot = getWorktreePath('..'); // Get parent of worktrees dir
    const worktreesDir = path.join(marthaRoot, 'worktrees');

    if (fileExists(worktreesDir)) {
      const allWorktrees = listFiles(worktreesDir);

      for (const worktreeId of allWorktrees) {
        if (worktreesToCheck.includes(worktreeId)) {
          continue; // Already checked
        }

        try {
          const index = loadIndex(worktreeId);
          const issueEntry = index.issues[issueId];

          if (issueEntry) {
            return {
              worktreeId,
              boardId: issueEntry.board_id,
            };
          }
        } catch {
          continue;
        }
      }
    }

    return null;
  } catch (error: any) {
    logger.error(
      {
        issueId,
        error: error.message,
      },
      '[evidence-manager] Failed to find issue location'
    );
    return null;
  }
}

/**
 * Append evidence event to issue JSON file
 * @param worktreeId Worktree identifier
 * @param boardId Board identifier
 * @param issueId Issue identifier
 * @param evidenceEvent Evidence event to append
 * @returns true if successful, false otherwise
 */
export function appendEvidenceToIssue(
  worktreeId: string,
  boardId: string,
  issueId: string,
  evidenceEvent: IssueEvidenceEvent
): boolean {
  try {
    const issuePath = getIssuePath(worktreeId, boardId, issueId);

    if (!fileExists(issuePath)) {
      logger.warn({ issueId, worktreeId, boardId }, '[evidence-manager] Issue file not found');
      return false;
    }

    // Read current issue
    const issue = readJsonSync<Issue>(issuePath);

    // Initialize evidence array if it doesn't exist
    if (!issue.evidence) {
      (issue as any).evidence = [];
    }

    // Append new evidence event
    (issue as any).evidence.push(evidenceEvent);

    // Update metadata
    issue.metadata.updated_at = new Date().toISOString();
    issue.metadata.version = Date.now();

    // Write updated issue back to file
    writeJsonSync(issuePath, issue);

    logger.info(
      {
        issueId,
        worktreeId,
        boardId,
        evidenceType: evidenceEvent.evidence_type,
        stage: evidenceEvent.stage,
        evidenceCount: (issue as any).evidence.length,
      },
      '[evidence-manager] Evidence appended to issue'
    );

    return true;
  } catch (error: any) {
    logger.error(
      {
        issueId,
        worktreeId,
        boardId,
        error: error.message,
        stack: error.stack,
      },
      '[evidence-manager] Failed to append evidence to issue'
    );
    return false;
  }
}

/**
 * Convenience function to append evidence by issue ID only
 * Automatically looks up the worktree and board for the issue
 * @param issueId Issue identifier
 * @param evidenceEvent Evidence event to append
 * @returns true if successful, false otherwise
 */
export function appendEvidenceByIssueId(
  issueId: string,
  evidenceEvent: IssueEvidenceEvent
): boolean {
  const location = findIssueLocation(issueId);

  if (!location) {
    logger.warn({ issueId }, '[evidence-manager] Could not find issue location');
    return false;
  }

  return appendEvidenceToIssue(
    location.worktreeId,
    location.boardId,
    issueId,
    evidenceEvent
  );
}

/**
 * Get all evidence for an issue
 * @param worktreeId Worktree identifier
 * @param boardId Board identifier
 * @param issueId Issue identifier
 * @returns Array of evidence events, or empty array if none
 */
export function getIssueEvidence(
  worktreeId: string,
  boardId: string,
  issueId: string
): IssueEvidenceEvent[] {
  try {
    const issuePath = getIssuePath(worktreeId, boardId, issueId);

    if (!fileExists(issuePath)) {
      return [];
    }

    const issue = readJsonSync<Issue>(issuePath);
    return (issue as any).evidence || [];
  } catch (error: any) {
    logger.error(
      {
        issueId,
        worktreeId,
        boardId,
        error: error.message,
      },
      '[evidence-manager] Failed to get issue evidence'
    );
    return [];
  }
}
