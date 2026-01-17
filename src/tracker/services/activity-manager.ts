/**
 * Activity Manager Service
 * Manages activity/change history for issues
 */

import * as path from 'node:path';
import {
  readJsonSync,
  writeJsonSync,
  getWorktreePath,
  ensureDir,
} from './file-storage.js';
import { v4 as uuidv4 } from 'uuid';

export interface ActivityEntry {
  id: string;
  issue_id: string;
  timestamp: string;
  actor: {
    id: string;
    name: string;
  };
  action: 'created' | 'updated' | 'commented' | 'linked' | 'status_changed' | 'assigned';
  changes?: Array<{
    field: string;
    old_value: any;
    new_value: any;
  }>;
  metadata?: Record<string, any>;
}

interface ActivityFile {
  issue_id: string;
  entries: ActivityEntry[];
}

/**
 * Get activity file path for an issue
 * @param worktreeId Worktree ID
 * @param issueId Issue ID
 * @returns Path to activity file
 */
function getActivityFilePath(worktreeId: string, issueId: string): string {
  const activityDir = getWorktreePath(worktreeId, 'activity');
  ensureDir(activityDir);
  return path.join(activityDir, `${issueId}.json`);
}

/**
 * Load activity file for an issue
 * @param worktreeId Worktree ID
 * @param issueId Issue ID
 * @returns Activity file data
 */
function loadActivityFile(worktreeId: string, issueId: string): ActivityFile {
  const filePath = getActivityFilePath(worktreeId, issueId);
  try {
    return readJsonSync<ActivityFile>(filePath);
  } catch (error) {
    // File doesn't exist yet, return empty
    return {
      issue_id: issueId,
      entries: []
    };
  }
}

/**
 * Save activity file for an issue
 * @param worktreeId Worktree ID
 * @param issueId Issue ID
 * @param data Activity file data
 */
function saveActivityFile(worktreeId: string, issueId: string, data: ActivityFile): void {
  const filePath = getActivityFilePath(worktreeId, issueId);
  writeJsonSync(filePath, data);
}

/**
 * Log an activity entry
 * @param worktreeId Worktree ID
 * @param issueId Issue ID
 * @param entry Activity entry (without id and timestamp)
 * @returns The created activity entry
 */
export function logActivity(
  worktreeId: string,
  issueId: string,
  entry: Omit<ActivityEntry, 'id' | 'timestamp'>
): ActivityEntry {
  const data = loadActivityFile(worktreeId, issueId);

  const newEntry: ActivityEntry = {
    ...entry,
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    issue_id: issueId
  };

  data.entries.push(newEntry);
  saveActivityFile(worktreeId, issueId, data);

  return newEntry;
}

/**
 * Get activity entries for an issue
 * @param worktreeId Worktree ID
 * @param issueId Issue ID
 * @param limit Optional limit on number of entries to return
 * @returns Array of activity entries, sorted by timestamp (most recent first)
 */
export function getActivity(
  worktreeId: string,
  issueId: string,
  limit?: number
): ActivityEntry[] {
  const data = loadActivityFile(worktreeId, issueId);
  const sorted = data.entries.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  return limit ? sorted.slice(0, limit) : sorted;
}

/**
 * Get activity entries since a specific timestamp
 * @param worktreeId Worktree ID
 * @param issueId Issue ID
 * @param since ISO timestamp string
 * @returns Array of activity entries since the given timestamp
 */
export function getActivitySince(
  worktreeId: string,
  issueId: string,
  since: string
): ActivityEntry[] {
  const data = loadActivityFile(worktreeId, issueId);
  const sinceDate = new Date(since).getTime();
  return data.entries
    .filter(entry => new Date(entry.timestamp).getTime() > sinceDate)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}
