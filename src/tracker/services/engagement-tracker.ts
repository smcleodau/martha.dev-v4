/**
 * Engagement Tracker Service
 * Tracks user engagement with issues (views, read time)
 */

import * as path from 'node:path';
import {
  readJsonSync,
  writeJsonSync,
  getWorktreePath,
  ensureDir,
} from './file-storage.js';
import { v4 as uuidv4 } from 'uuid';

export interface ViewEntry {
  user_id: string;
  user_name: string;
  timestamp: string;
  read_time: number;  // seconds
  session_id: string;
}

export interface EngagementData {
  views: number;
  total_read_time: number;  // seconds
  view_history: ViewEntry[];
}

interface EngagementFile {
  issue_id: string;
  engagement: EngagementData;
  updated_at: string;
}

/**
 * Get engagement file path for an issue
 * @param worktreeId Worktree ID
 * @param issueId Issue ID
 * @returns Path to engagement file
 */
function getEngagementFilePath(worktreeId: string, issueId: string): string {
  const engagementDir = getWorktreePath(worktreeId, 'engagement');
  ensureDir(engagementDir);
  return path.join(engagementDir, `${issueId}.json`);
}

/**
 * Load engagement file for an issue
 * @param worktreeId Worktree ID
 * @param issueId Issue ID
 * @returns Engagement file data
 */
function loadEngagementFile(worktreeId: string, issueId: string): EngagementFile {
  const filePath = getEngagementFilePath(worktreeId, issueId);
  try {
    return readJsonSync<EngagementFile>(filePath);
  } catch (error) {
    // File doesn't exist yet, return empty
    return {
      issue_id: issueId,
      engagement: {
        views: 0,
        total_read_time: 0,
        view_history: []
      },
      updated_at: new Date().toISOString()
    };
  }
}

/**
 * Save engagement file for an issue
 * @param worktreeId Worktree ID
 * @param issueId Issue ID
 * @param data Engagement file data
 */
function saveEngagementFile(worktreeId: string, issueId: string, data: EngagementFile): void {
  data.updated_at = new Date().toISOString();
  const filePath = getEngagementFilePath(worktreeId, issueId);
  writeJsonSync(filePath, data);
}

/**
 * Record a view of an issue
 * @param worktreeId Worktree ID
 * @param issueId Issue ID
 * @param userId User ID
 * @param userName User name
 * @param readTime Read time in seconds
 * @param sessionId Optional session ID for tracking
 * @returns The created view entry
 */
export function recordView(
  worktreeId: string,
  issueId: string,
  userId: string,
  userName: string,
  readTime: number = 0,
  sessionId?: string
): ViewEntry {
  const data = loadEngagementFile(worktreeId, issueId);

  const viewEntry: ViewEntry = {
    user_id: userId,
    user_name: userName,
    timestamp: new Date().toISOString(),
    read_time: readTime,
    session_id: sessionId || uuidv4()
  };

  // Update engagement data
  data.engagement.views += 1;
  data.engagement.total_read_time += readTime;
  data.engagement.view_history.push(viewEntry);

  // Keep only the most recent 100 views to avoid file bloat
  if (data.engagement.view_history.length > 100) {
    data.engagement.view_history = data.engagement.view_history.slice(-100);
  }

  saveEngagementFile(worktreeId, issueId, data);

  return viewEntry;
}

/**
 * Get engagement data for an issue
 * @param worktreeId Worktree ID
 * @param issueId Issue ID
 * @param limit Optional limit on number of view history entries to return
 * @returns Engagement data
 */
export function getEngagement(
  worktreeId: string,
  issueId: string,
  limit?: number
): EngagementData {
  const data = loadEngagementFile(worktreeId, issueId);

  if (limit && data.engagement.view_history.length > limit) {
    // Return most recent entries
    return {
      ...data.engagement,
      view_history: data.engagement.view_history
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, limit)
    };
  }

  // Sort view history by timestamp (most recent first)
  return {
    ...data.engagement,
    view_history: data.engagement.view_history
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  };
}

/**
 * Get unique viewers for an issue
 * @param worktreeId Worktree ID
 * @param issueId Issue ID
 * @returns Array of unique user IDs who have viewed the issue
 */
export function getUniqueViewers(
  worktreeId: string,
  issueId: string
): Array<{ user_id: string; user_name: string; view_count: number; total_read_time: number }> {
  const data = loadEngagementFile(worktreeId, issueId);

  const viewerMap = new Map<string, { user_name: string; view_count: number; total_read_time: number }>();

  data.engagement.view_history.forEach(view => {
    const existing = viewerMap.get(view.user_id);
    if (existing) {
      existing.view_count += 1;
      existing.total_read_time += view.read_time;
    } else {
      viewerMap.set(view.user_id, {
        user_name: view.user_name,
        view_count: 1,
        total_read_time: view.read_time
      });
    }
  });

  return Array.from(viewerMap.entries()).map(([user_id, data]) => ({
    user_id,
    ...data
  }));
}

/**
 * Get average read time for an issue
 * @param worktreeId Worktree ID
 * @param issueId Issue ID
 * @returns Average read time in seconds
 */
export function getAverageReadTime(
  worktreeId: string,
  issueId: string
): number {
  const data = loadEngagementFile(worktreeId, issueId);

  if (data.engagement.views === 0) {
    return 0;
  }

  return data.engagement.total_read_time / data.engagement.views;
}

/**
 * Get recent viewers for an issue
 * @param worktreeId Worktree ID
 * @param issueId Issue ID
 * @param limit Number of recent viewers to return (default: 10)
 * @returns Array of recent view entries
 */
export function getRecentViewers(
  worktreeId: string,
  issueId: string,
  limit: number = 10
): ViewEntry[] {
  const data = loadEngagementFile(worktreeId, issueId);

  return data.engagement.view_history
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit);
}

/**
 * Delete all engagement data for an issue
 * @param worktreeId Worktree ID
 * @param issueId Issue ID
 */
export function deleteEngagementData(
  worktreeId: string,
  issueId: string
): void {
  const filePath = getEngagementFilePath(worktreeId, issueId);
  try {
    const fs = require('fs');
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    // Ignore errors
  }
}
