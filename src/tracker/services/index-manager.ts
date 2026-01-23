/**
 * Index Manager Service
 * Manages the issues index for fast lookups with multi-board support
 * Extracted from martha-workflow/tracker/mcp-server/src/index.ts
 */

import * as path from 'node:path';
import { readJsonSync, writeJsonSync, getTrackerPath, getWorktreePath, fileExists } from './file-storage.js';
import type { Issue, IssueIndex } from '../types.js';

/**
 * Load the issue index from disk
 * @param worktreeId Worktree identifier
 * @returns Issue index
 */
export function loadIndex(worktreeId: string): IssueIndex {
  const indexPath = getWorktreePath(worktreeId, 'index.json');

  if (!fileExists(indexPath)) {
    throw new Error(`Index not found for worktree: ${worktreeId}`);
  }

  return readJsonSync<IssueIndex>(indexPath);
}

/**
 * Save the issue index to disk
 * @param worktreeId Worktree identifier
 * @param index Issue index to save
 */
export function saveIndex(worktreeId: string, index: IssueIndex): void {
  const indexPath = getWorktreePath(worktreeId, 'index.json');
  index.version = Date.now();
  index.updated_at = new Date().toISOString();
  writeJsonSync(indexPath, index);
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
    board_id: issue.board_id,  // NEW: Include board_id
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

  // Add to by_board (NEW)
  if (!index.by_board[issue.board_id]) {
    index.by_board[issue.board_id] = [];
  }
  if (!index.by_board[issue.board_id].includes(issue.id)) {
    index.by_board[issue.board_id].push(issue.id);
  }

  // Add to by_initiative
  if (issue.initiative_id) {
    if (!index.by_initiative[issue.initiative_id]) {
      index.by_initiative[issue.initiative_id] = [];
    }
    if (!index.by_initiative[issue.initiative_id].includes(issue.id)) {
      index.by_initiative[issue.initiative_id].push(issue.id);
    }
  }

  // Add to by_team (issue can have multiple teams)
  if (issue.team_ids && issue.team_ids.length > 0) {
    for (const teamId of issue.team_ids) {
      if (!index.by_team[teamId]) {
        index.by_team[teamId] = [];
      }
      if (!index.by_team[teamId].includes(issue.id)) {
        index.by_team[teamId].push(issue.id);
      }
    }
  }

  // Add to by_epic
  if (issue.epic_id) {
    if (!index.by_epic[issue.epic_id]) {
      index.by_epic[issue.epic_id] = [];
    }
    if (!index.by_epic[issue.epic_id].includes(issue.id)) {
      index.by_epic[issue.epic_id].push(issue.id);
    }
  }

  // Add to by_release
  if (issue.release_id) {
    if (!index.by_release[issue.release_id]) {
      index.by_release[issue.release_id] = [];
    }
    if (!index.by_release[issue.release_id].includes(issue.id)) {
      index.by_release[issue.release_id].push(issue.id);
    }
  }

  // Add to by_start_date
  if (issue.start_date) {
    if (!index.by_start_date[issue.start_date]) {
      index.by_start_date[issue.start_date] = [];
    }
    if (!index.by_start_date[issue.start_date].includes(issue.id)) {
      index.by_start_date[issue.start_date].push(issue.id);
    }
  }

  // Add to by_due_date
  if (issue.due_date) {
    if (!index.by_due_date[issue.due_date]) {
      index.by_due_date[issue.due_date] = [];
    }
    if (!index.by_due_date[issue.due_date].includes(issue.id)) {
      index.by_due_date[issue.due_date].push(issue.id);
    }
  }

  // Add to by_assignee
  if (issue.assignee) {
    const assigneeId = issue.assignee.id;
    if (!index.by_assignee[assigneeId]) {
      index.by_assignee[assigneeId] = [];
    }
    if (!index.by_assignee[assigneeId].includes(issue.id)) {
      index.by_assignee[assigneeId].push(issue.id);
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

  // Remove from by_board (NEW)
  const boardArr = index.by_board[issue.board_id];
  if (boardArr) {
    const idx = boardArr.indexOf(issue.id);
    if (idx !== -1) boardArr.splice(idx, 1);
  }

  // Remove from by_initiative
  if (issue.initiative_id) {
    const initiativeArr = index.by_initiative[issue.initiative_id];
    if (initiativeArr) {
      const idx = initiativeArr.indexOf(issue.id);
      if (idx !== -1) initiativeArr.splice(idx, 1);
    }
  }

  // Remove from by_team (issue can have multiple teams)
  if (issue.team_ids && issue.team_ids.length > 0) {
    for (const teamId of issue.team_ids) {
      const teamArr = index.by_team[teamId];
      if (teamArr) {
        const idx = teamArr.indexOf(issue.id);
        if (idx !== -1) teamArr.splice(idx, 1);
      }
    }
  }

  // Remove from by_epic
  if (issue.epic_id) {
    const epicArr = index.by_epic[issue.epic_id];
    if (epicArr) {
      const idx = epicArr.indexOf(issue.id);
      if (idx !== -1) epicArr.splice(idx, 1);
    }
  }

  // Remove from by_release
  if (issue.release_id) {
    const releaseArr = index.by_release[issue.release_id];
    if (releaseArr) {
      const idx = releaseArr.indexOf(issue.id);
      if (idx !== -1) releaseArr.splice(idx, 1);
    }
  }

  // Remove from by_start_date
  if (issue.start_date) {
    const startDateArr = index.by_start_date[issue.start_date];
    if (startDateArr) {
      const idx = startDateArr.indexOf(issue.id);
      if (idx !== -1) startDateArr.splice(idx, 1);
    }
  }

  // Remove from by_due_date
  if (issue.due_date) {
    const dueDateArr = index.by_due_date[issue.due_date];
    if (dueDateArr) {
      const idx = dueDateArr.indexOf(issue.id);
      if (idx !== -1) dueDateArr.splice(idx, 1);
    }
  }

  // Remove from by_assignee
  if (issue.assignee) {
    const assigneeId = issue.assignee.id;
    const assigneeArr = index.by_assignee[assigneeId];
    if (assigneeArr) {
      const idx = assigneeArr.indexOf(issue.id);
      if (idx !== -1) assigneeArr.splice(idx, 1);
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
 * Get all issues on a board (NEW)
 * @param index Issue index
 * @param boardId Board ID to filter by
 * @returns Array of issue IDs
 */
export function getIssuesByBoard(index: IssueIndex, boardId: string): string[] {
  return index.by_board[boardId] || [];
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

/**
 * Get all issues by initiative
 * @param index Issue index
 * @param initiativeId Initiative ID to filter by
 * @returns Array of issue IDs
 */
export function getIssuesByInitiative(index: IssueIndex, initiativeId: string): string[] {
  return index.by_initiative[initiativeId] || [];
}

/**
 * Get all issues by team
 * @param index Issue index
 * @param teamId Team ID to filter by
 * @returns Array of issue IDs
 */
export function getIssuesByTeam(index: IssueIndex, teamId: string): string[] {
  return index.by_team[teamId] || [];
}

/**
 * Get all issues by epic
 * @param index Issue index
 * @param epicId Epic ID to filter by
 * @returns Array of issue IDs
 */
export function getIssuesByEpic(index: IssueIndex, epicId: string): string[] {
  return index.by_epic[epicId] || [];
}

/**
 * Get all issues by release
 * @param index Issue index
 * @param releaseId Release ID to filter by
 * @returns Array of issue IDs
 */
export function getIssuesByRelease(index: IssueIndex, releaseId: string): string[] {
  return index.by_release[releaseId] || [];
}

/**
 * Get all issues by start date
 * @param index Issue index
 * @param startDate Start date to filter by (ISO 8601 format)
 * @returns Array of issue IDs
 */
export function getIssuesByStartDate(index: IssueIndex, startDate: string): string[] {
  return index.by_start_date[startDate] || [];
}

/**
 * Get all issues by due date
 * @param index Issue index
 * @param dueDate Due date to filter by (ISO 8601 format)
 * @returns Array of issue IDs
 */
export function getIssuesByDueDate(index: IssueIndex, dueDate: string): string[] {
  return index.by_due_date[dueDate] || [];
}

/**
 * Get all issues by assignee
 * @param index Issue index
 * @param assigneeId Assignee ID to filter by
 * @returns Array of issue IDs
 */
export function getIssuesByAssignee(index: IssueIndex, assigneeId: string): string[] {
  return index.by_assignee[assigneeId] || [];
}
