/**
 * Board Manager Service
 * Manages the Kanban board state
 * Extracted from martha-workflow/tracker/mcp-server/src/index.ts
 */

import { readJsonSync, writeJsonSync, getTrackerPath } from './file-storage.js';
import type { BoardState } from '../types.js';

const BOARD_PATH = getTrackerPath('board', 'state.json');

/**
 * Load the board state from disk
 * @returns Board state
 */
export function loadBoard(): BoardState {
  return readJsonSync<BoardState>(BOARD_PATH);
}

/**
 * Save the board state to disk
 * @param board Board state to save
 */
export function saveBoard(board: BoardState): void {
  board.version = Date.now();
  board.updated_at = new Date().toISOString();
  writeJsonSync(BOARD_PATH, board);
}

/**
 * Add issue to board column
 * @param board Board state
 * @param issueId Issue ID to add
 * @param status Status/column ID
 */
export function addToBoard(board: BoardState, issueId: string, status: string): void {
  const column = board.columns.find((c) => c.id === status);
  if (column && !column.issue_ids.includes(issueId)) {
    column.issue_ids.push(issueId);
  }
}

/**
 * Remove issue from board column
 * @param board Board state
 * @param issueId Issue ID to remove
 * @param status Status/column ID
 */
export function removeFromBoard(board: BoardState, issueId: string, status: string): void {
  const column = board.columns.find((c) => c.id === status);
  if (column) {
    const idx = column.issue_ids.indexOf(issueId);
    if (idx !== -1) column.issue_ids.splice(idx, 1);
  }
}

/**
 * Move issue between columns
 * @param board Board state
 * @param issueId Issue ID to move
 * @param fromStatus Source column ID
 * @param toStatus Destination column ID
 */
export function moveOnBoard(
  board: BoardState,
  issueId: string,
  fromStatus: string,
  toStatus: string
): void {
  removeFromBoard(board, issueId, fromStatus);
  addToBoard(board, issueId, toStatus);
}

/**
 * Reorder issue within a column
 * @param board Board state
 * @param issueId Issue ID to reorder
 * @param status Column ID
 * @param newIndex New position in column
 */
export function reorderInColumn(
  board: BoardState,
  issueId: string,
  status: string,
  newIndex: number
): void {
  const column = board.columns.find((c) => c.id === status);
  if (!column) return;

  const currentIndex = column.issue_ids.indexOf(issueId);
  if (currentIndex === -1) return;

  // Remove from current position
  column.issue_ids.splice(currentIndex, 1);

  // Insert at new position
  column.issue_ids.splice(newIndex, 0, issueId);
}

/**
 * Get column by ID
 * @param board Board state
 * @param columnId Column ID
 * @returns Column or undefined
 */
export function getColumn(board: BoardState, columnId: string) {
  return board.columns.find((c) => c.id === columnId);
}

/**
 * Check if WIP limit is exceeded for column
 * @param board Board state
 * @param columnId Column ID
 * @returns true if WIP limit exceeded
 */
export function isWipLimitExceeded(board: BoardState, columnId: string): boolean {
  const column = getColumn(board, columnId);
  if (!column || column.wip_limit === null) return false;
  return column.issue_ids.length >= column.wip_limit;
}
