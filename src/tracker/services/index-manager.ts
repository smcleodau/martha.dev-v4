/**
 * Index Manager Service
 * Manages the issues index for fast lookups
 * Extracted from martha-workflow/tracker/mcp-server/src/index.ts
 */

import * as path from 'node:path';
import { readJsonSync, writeJsonSync, getTrackerPath } from './file-storage.js';
import type { Issue, IssueIndex } from '../types.js';

const INDEX_PATH = getTrackerPath('issues', 'index.json');

/**
 * Load the issue index from disk
 * @returns Issue index
 */
export function loadIndex(): IssueIndex {
  return readJsonSync<IssueIndex>(INDEX_PATH);
}

/**
 * Save the issue index to disk
 * @param index Issue index to save
 */
export function saveIndex(index: IssueIndex): void {
  index.version = Date.now();
  writeJsonSync(INDEX_PATH, index);
}

/**
 * Add issue to index
 * @param index Issue index
 * @param issue Issue to add
 */
export function addToIndex(index: IssueIndex, issue: Issue): void {
  // Add to main issues map
  index.issues[issue.id] = {
    id: issue.id,
    title: issue.title,
    type: issue.type,
    status: issue.status,
    priority: issue.priority,
    parent_id: issue.parent_id,
    updated_at: issue.metadata.updated_at,
  };

  // Add to by_status
  if (!index.by_status[issue.status]) {
    index.by_status[issue.status] = [];
  }
  if (!index.by_status[issue.status].includes(issue.id)) {
    index.by_status[issue.status].push(issue.id);
  }

  // Add to by_type
  if (!index.by_type[issue.type]) {
    index.by_type[issue.type] = [];
  }
  if (!index.by_type[issue.type].includes(issue.id)) {
    index.by_type[issue.type].push(issue.id);
  }

  // Add to by_parent
  if (issue.parent_id) {
    if (!index.by_parent[issue.parent_id]) {
      index.by_parent[issue.parent_id] = [];
    }
    if (!index.by_parent[issue.parent_id].includes(issue.id)) {
      index.by_parent[issue.parent_id].push(issue.id);
    }
  }

  index.count = Object.keys(index.issues).length;
}

/**
 * Remove issue from index arrays
 * @param index Issue index
 * @param issue Issue to remove
 */
export function removeFromIndexArrays(index: IssueIndex, issue: Issue): void {
  // Remove from by_status
  const statusArr = index.by_status[issue.status];
  if (statusArr) {
    const idx = statusArr.indexOf(issue.id);
    if (idx !== -1) statusArr.splice(idx, 1);
  }

  // Remove from by_type
  const typeArr = index.by_type[issue.type];
  if (typeArr) {
    const idx = typeArr.indexOf(issue.id);
    if (idx !== -1) typeArr.splice(idx, 1);
  }

  // Remove from by_parent
  if (issue.parent_id) {
    const parentArr = index.by_parent[issue.parent_id];
    if (parentArr) {
      const idx = parentArr.indexOf(issue.id);
      if (idx !== -1) parentArr.splice(idx, 1);
    }
  }
}

/**
 * Update issue in index
 * @param index Issue index
 * @param oldIssue Previous issue state
 * @param newIssue New issue state
 */
export function updateIndex(index: IssueIndex, oldIssue: Issue, newIssue: Issue): void {
  // Remove old references
  removeFromIndexArrays(index, oldIssue);

  // Add new references
  addToIndex(index, newIssue);
}

/**
 * Remove issue from index completely
 * @param index Issue index
 * @param issue Issue to remove
 */
export function removeFromIndex(index: IssueIndex, issue: Issue): void {
  // Remove from arrays
  removeFromIndexArrays(index, issue);

  // Remove from main map
  delete index.issues[issue.id];

  // Update count
  index.count = Object.keys(index.issues).length;
}

/**
 * Get all issues by status
 * @param index Issue index
 * @param status Status to filter by
 * @returns Array of issue IDs
 */
export function getIssuesByStatus(index: IssueIndex, status: string): string[] {
  return index.by_status[status] || [];
}

/**
 * Get all issues by type
 * @param index Issue index
 * @param type Type to filter by
 * @returns Array of issue IDs
 */
export function getIssuesByType(index: IssueIndex, type: string): string[] {
  return index.by_type[type] || [];
}

/**
 * Get child issues of a parent
 * @param index Issue index
 * @param parentId Parent issue ID
 * @returns Array of child issue IDs
 */
export function getChildIssues(index: IssueIndex, parentId: string): string[] {
  return index.by_parent[parentId] || [];
}

/**
 * Get next issue ID
 * @param index Issue index
 * @returns Next issue ID string
 */
export function getNextIssueId(index: IssueIndex): string {
  const config = readJsonSync<{ project: { prefix: string } }>(
    getTrackerPath('config.json')
  );
  const prefix = config.project.prefix;
  const nextId = index.next_id;
  index.next_id = nextId + 1;
  return `${prefix}-${nextId.toString().padStart(3, '0')}`;
}
