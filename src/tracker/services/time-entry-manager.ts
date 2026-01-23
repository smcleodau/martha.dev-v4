/**
 * Time Entry Manager Service
 * Manages time tracking entries for issues
 */

import * as path from 'node:path';
import {
  readJsonSync,
  writeJsonSync,
  getWorktreePath,
  ensureDir,
  listFiles,
  deleteFile,
} from './file-storage.js';
import { v4 as uuidv4 } from 'uuid';

export interface TimeEntry {
  id: string;
  issue_id: string;
  user_id: string;
  user_name: string;
  hours: number;
  description: string;
  date: string;       // ISO date when work was done
  logged_at: string;  // ISO timestamp when entry was created
}

interface TimeEntriesFile {
  issue_id: string;
  entries: TimeEntry[];
}

/**
 * Get time entries file path for an issue
 * @param worktreeId Worktree ID
 * @param issueId Issue ID
 * @returns Path to time entries file
 */
function getTimeEntriesFilePath(worktreeId: string, issueId: string): string {
  const timeTrackingDir = getWorktreePath(worktreeId, 'time-tracking');
  ensureDir(timeTrackingDir);
  return path.join(timeTrackingDir, `${issueId}.json`);
}

/**
 * Load time entries file for an issue
 * @param worktreeId Worktree ID
 * @param issueId Issue ID
 * @returns Time entries file data
 */
function loadTimeEntriesFile(worktreeId: string, issueId: string): TimeEntriesFile {
  const filePath = getTimeEntriesFilePath(worktreeId, issueId);
  try {
    return readJsonSync<TimeEntriesFile>(filePath);
  } catch (error) {
    // File doesn't exist yet, return empty
    return {
      issue_id: issueId,
      entries: []
    };
  }
}

/**
 * Save time entries file for an issue
 * @param worktreeId Worktree ID
 * @param issueId Issue ID
 * @param data Time entries file data
 */
function saveTimeEntriesFile(worktreeId: string, issueId: string, data: TimeEntriesFile): void {
  const filePath = getTimeEntriesFilePath(worktreeId, issueId);
  writeJsonSync(filePath, data);
}

/**
 * Log a time entry for an issue
 * @param worktreeId Worktree ID
 * @param issueId Issue ID
 * @param userId User ID
 * @param userName User name
 * @param hours Hours worked
 * @param description Description of work done
 * @param date Date when work was done (ISO date string)
 * @returns The created time entry
 */
export function logTimeEntry(
  worktreeId: string,
  issueId: string,
  userId: string,
  userName: string,
  hours: number,
  description: string,
  date?: string
): TimeEntry {
  const data = loadTimeEntriesFile(worktreeId, issueId);

  const newEntry: TimeEntry = {
    id: uuidv4(),
    issue_id: issueId,
    user_id: userId,
    user_name: userName,
    hours,
    description,
    date: date || new Date().toISOString().split('T')[0], // Default to today
    logged_at: new Date().toISOString()
  };

  data.entries.push(newEntry);
  saveTimeEntriesFile(worktreeId, issueId, data);

  return newEntry;
}

/**
 * Get time entries for an issue
 * @param worktreeId Worktree ID
 * @param issueId Issue ID
 * @returns Array of time entries, sorted by date (most recent first)
 */
export function getTimeEntries(
  worktreeId: string,
  issueId: string
): TimeEntry[] {
  const data = loadTimeEntriesFile(worktreeId, issueId);
  return data.entries.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

/**
 * Delete a time entry
 * @param worktreeId Worktree ID
 * @param issueId Issue ID
 * @param entryId Time entry ID
 * @returns true if deleted, false if not found
 */
export function deleteTimeEntry(
  worktreeId: string,
  issueId: string,
  entryId: string
): boolean {
  const data = loadTimeEntriesFile(worktreeId, issueId);
  const initialLength = data.entries.length;

  data.entries = data.entries.filter(entry => entry.id !== entryId);

  if (data.entries.length === initialLength) {
    return false; // Entry not found
  }

  saveTimeEntriesFile(worktreeId, issueId, data);
  return true;
}

/**
 * Recalculate total logged hours for an issue
 * @param worktreeId Worktree ID
 * @param issueId Issue ID
 * @returns Total logged hours
 */
export function recalculateLoggedHours(
  worktreeId: string,
  issueId: string
): number {
  const data = loadTimeEntriesFile(worktreeId, issueId);
  return data.entries.reduce((total, entry) => total + entry.hours, 0);
}

/**
 * Get time entries for a user across all issues
 * @param worktreeId Worktree ID
 * @param userId User ID
 * @returns Array of time entries for the user
 */
export function getUserTimeEntries(
  worktreeId: string,
  userId: string
): TimeEntry[] {
  const timeTrackingDir = getWorktreePath(worktreeId, 'time-tracking');
  const files = listFiles(timeTrackingDir, '.json');

  const entries: TimeEntry[] = [];

  files.forEach((file) => {
    const filePath = path.join(timeTrackingDir, file);
    try {
      const data = readJsonSync<TimeEntriesFile>(filePath);
      const userEntries = data.entries.filter(entry => entry.user_id === userId);
      entries.push(...userEntries);
    } catch (error) {
      // Skip invalid files
    }
  });

  return entries.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

/**
 * Delete all time entries for an issue
 * @param worktreeId Worktree ID
 * @param issueId Issue ID
 */
export function deleteAllTimeEntries(
  worktreeId: string,
  issueId: string
): void {
  const filePath = getTimeEntriesFilePath(worktreeId, issueId);
  deleteFile(filePath);
}
