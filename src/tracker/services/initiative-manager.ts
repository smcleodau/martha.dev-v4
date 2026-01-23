/**
 * Initiative Manager Service
 * Manages initiatives (collections of epics) for strategic planning
 */

import {
  readJsonSync,
  writeJsonSync,
  fileExists,
  ensureDir,
  listFiles,
  getWorktreePath,
  deleteFile,
} from './file-storage.js';
import { generateRandomId } from './id-generator.js';
import type { Assignee } from '../types.js';

export interface Initiative {
  id: string;
  worktree_id: string;
  name: string;
  description: string;
  color: string;
  status: 'planning' | 'active' | 'completed' | 'archived';
  owner: Assignee | null;
  epic_ids: string[];
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Get path to initiatives directory
 */
function getInitiativesDir(worktreeId: string): string {
  return getWorktreePath(worktreeId, 'initiatives');
}

/**
 * Get path to specific initiative file
 */
function getInitiativePath(worktreeId: string, initiativeId: string): string {
  return getWorktreePath(worktreeId, 'initiatives', `${initiativeId}.json`);
}

/**
 * Create a new initiative
 */
export function createInitiative(
  worktreeId: string,
  data: {
    name: string;
    description: string;
    color?: string;
    status?: Initiative['status'];
    owner?: Assignee | null;
    start_date?: string | null;
    end_date?: string | null;
  }
): Initiative {
  // Ensure initiatives directory exists
  ensureDir(getInitiativesDir(worktreeId));

  // Generate initiative ID
  const initiativeId = `INIT-${generateRandomId(6, true)}`;

  const initiative: Initiative = {
    id: initiativeId,
    worktree_id: worktreeId,
    name: data.name,
    description: data.description,
    color: data.color || '#8B7AA8',
    status: data.status || 'planning',
    owner: data.owner || null,
    epic_ids: [],
    start_date: data.start_date || null,
    end_date: data.end_date || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const initiativePath = getInitiativePath(worktreeId, initiativeId);
  writeJsonSync(initiativePath, initiative);

  return initiative;
}

/**
 * Get an initiative by ID
 */
export function getInitiative(worktreeId: string, initiativeId: string): Initiative {
  const initiativePath = getInitiativePath(worktreeId, initiativeId);

  if (!fileExists(initiativePath)) {
    throw new Error(`Initiative not found: ${initiativeId}`);
  }

  return readJsonSync<Initiative>(initiativePath);
}

/**
 * List all initiatives in a worktree
 */
export function listInitiatives(worktreeId: string): Initiative[] {
  const initiativesDir = getInitiativesDir(worktreeId);

  if (!fileExists(initiativesDir)) {
    return [];
  }

  const files = listFiles(initiativesDir, '.json');
  const initiatives: Initiative[] = [];

  for (const file of files) {
    const initiativeId = file.replace('.json', '');
    try {
      const initiative = getInitiative(worktreeId, initiativeId);
      initiatives.push(initiative);
    } catch (error) {
      // Skip invalid files
      console.warn(`Failed to load initiative ${initiativeId}:`, error);
    }
  }

  // Sort by created_at descending (newest first)
  return initiatives.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

/**
 * Update an initiative
 */
export function updateInitiative(
  worktreeId: string,
  initiativeId: string,
  updates: Partial<
    Pick<Initiative, 'name' | 'description' | 'color' | 'status' | 'owner' | 'start_date' | 'end_date'>
  >
): Initiative {
  const initiative = getInitiative(worktreeId, initiativeId);

  // Apply updates
  if (updates.name !== undefined) initiative.name = updates.name;
  if (updates.description !== undefined) initiative.description = updates.description;
  if (updates.color !== undefined) initiative.color = updates.color;
  if (updates.status !== undefined) initiative.status = updates.status;
  if (updates.owner !== undefined) initiative.owner = updates.owner;
  if (updates.start_date !== undefined) initiative.start_date = updates.start_date;
  if (updates.end_date !== undefined) initiative.end_date = updates.end_date;

  initiative.updated_at = new Date().toISOString();

  const initiativePath = getInitiativePath(worktreeId, initiativeId);
  writeJsonSync(initiativePath, initiative);

  return initiative;
}

/**
 * Delete an initiative
 */
export function deleteInitiative(worktreeId: string, initiativeId: string): boolean {
  const initiativePath = getInitiativePath(worktreeId, initiativeId);

  if (!fileExists(initiativePath)) {
    return false;
  }

  deleteFile(initiativePath);
  return true;
}

/**
 * Link an epic to an initiative
 */
export function linkEpicToInitiative(
  worktreeId: string,
  initiativeId: string,
  epicId: string
): Initiative {
  const initiative = getInitiative(worktreeId, initiativeId);

  if (!initiative.epic_ids.includes(epicId)) {
    initiative.epic_ids.push(epicId);
    initiative.updated_at = new Date().toISOString();

    const initiativePath = getInitiativePath(worktreeId, initiativeId);
    writeJsonSync(initiativePath, initiative);
  }

  return initiative;
}

/**
 * Unlink an epic from an initiative
 */
export function unlinkEpicFromInitiative(
  worktreeId: string,
  initiativeId: string,
  epicId: string
): Initiative {
  const initiative = getInitiative(worktreeId, initiativeId);

  const index = initiative.epic_ids.indexOf(epicId);
  if (index !== -1) {
    initiative.epic_ids.splice(index, 1);
    initiative.updated_at = new Date().toISOString();

    const initiativePath = getInitiativePath(worktreeId, initiativeId);
    writeJsonSync(initiativePath, initiative);
  }

  return initiative;
}

/**
 * Get statistics for an initiative
 * Note: This requires loading issues to compute stats
 */
export function getInitiativeStats(
  worktreeId: string,
  initiativeId: string,
  issues: Array<{ id: string; type: string; status: string; epic_id?: string | null }>
): {
  epic_count: number;
  story_count: number;
  task_count: number;
  bug_count: number;
  completed_count: number;
  in_progress_count: number;
  total_count: number;
  completion_percentage: number;
} {
  const initiative = getInitiative(worktreeId, initiativeId);

  // Filter issues that belong to this initiative's epics
  const initiativeIssues = issues.filter(
    (issue) =>
      initiative.epic_ids.includes(issue.id) ||
      (issue.epic_id && initiative.epic_ids.includes(issue.epic_id))
  );

  const stats = {
    epic_count: initiative.epic_ids.length,
    story_count: initiativeIssues.filter((i) => i.type === 'story').length,
    task_count: initiativeIssues.filter((i) => i.type === 'task').length,
    bug_count: initiativeIssues.filter((i) => i.type === 'bug').length,
    completed_count: initiativeIssues.filter((i) => i.status === 'done').length,
    in_progress_count: initiativeIssues.filter((i) => i.status === 'in_progress').length,
    total_count: initiativeIssues.length,
    completion_percentage: 0,
  };

  if (stats.total_count > 0) {
    stats.completion_percentage = Math.round((stats.completed_count / stats.total_count) * 100);
  }

  return stats;
}

/**
 * Check if an initiative exists
 */
export function initiativeExists(worktreeId: string, initiativeId: string): boolean {
  const initiativePath = getInitiativePath(worktreeId, initiativeId);
  return fileExists(initiativePath);
}
