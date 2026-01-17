/**
 * Board Manager Service
 * Manages the Kanban board state with multi-board support
 * Extracted from martha-workflow/tracker/mcp-server/src/index.ts
 */

import {
  readJsonSync,
  writeJsonSync,
  getBoardPath,
  getWorktreePath,
  fileExists,
  ensureDir,
  listFiles,
  deleteFile,
} from './file-storage.js';
import type { BoardState, BoardColumn } from '../types.js';
import { addBoardToWorktree, removeBoardFromWorktree } from './worktree-manager.js';
import { generateBoardId } from './id-generator.js';

/**
 * Load the board state from disk
 * @param worktreeId Worktree identifier
 * @param boardId Board identifier
 * @returns Board state
 */
export function loadBoard(worktreeId: string, boardId: string): BoardState {
  const boardPath = getBoardPath(worktreeId, boardId, 'state.json');

  if (!fileExists(boardPath)) {
    throw new Error(`Board not found: ${worktreeId}/${boardId}`);
  }

  return readJsonSync<BoardState>(boardPath);
}

/**
 * Save the board state to disk
 * @param worktreeId Worktree identifier
 * @param boardId Board identifier
 * @param board Board state to save
 */
export function saveBoard(worktreeId: string, boardId: string, board: BoardState): void {
  const boardPath = getBoardPath(worktreeId, boardId, 'state.json');
  board.version = Date.now();
  board.updated_at = new Date().toISOString();
  writeJsonSync(boardPath, board);
}

/**
 * Create a new board
 * @param worktreeId Worktree identifier
 * @param data Board creation data
 * @returns Created board state
 */
export function createBoard(
  worktreeId: string,
  data: {
    name: string;
    description: string;
    columns?: BoardColumn[];
  }
): BoardState {
  // Generate random board ID
  const boardId = generateBoardId();
  const boardPath = getBoardPath(worktreeId, boardId, 'state.json');

  // Create board directory structure
  ensureDir(getBoardPath(worktreeId, boardId, 'issues'));

  // Default columns if not provided
  const defaultColumns: BoardColumn[] = [
    { id: 'backlog', name: 'Backlog', color: '#6B7280', wip_limit: null, issue_ids: [] },
    { id: 'todo', name: 'To Do', color: '#3B82F6', wip_limit: null, issue_ids: [] },
    { id: 'in_progress', name: 'In Progress', color: '#F59E0B', wip_limit: 3, issue_ids: [] },
    { id: 'review', name: 'Review', color: '#8B5CF6', wip_limit: null, issue_ids: [] },
    { id: 'done', name: 'Done', color: '#10B981', wip_limit: null, issue_ids: [] },
  ];

  const board: BoardState = {
    $schema: 'https://martha.dev/schemas/tracker/board.json',
    id: boardId,
    worktree_id: worktreeId,
    name: data.name,
    description: data.description,
    version: 1,
    sprint: null,
    columns: data.columns || defaultColumns,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Save board
  saveBoard(worktreeId, boardId, board);

  // Add board to worktree's board list
  addBoardToWorktree(worktreeId, boardId);

  return board;
}

/**
 * List all boards in a worktree
 * @param worktreeId Worktree identifier
 * @returns Array of board states
 */
export function listBoards(worktreeId: string): BoardState[] {
  const boardsDir = getWorktreePath(worktreeId, 'boards');

  if (!fileExists(boardsDir)) {
    return [];
  }

  const boardIds = listFiles(boardsDir).filter((name) => {
    const statePath = getBoardPath(worktreeId, name, 'state.json');
    return fileExists(statePath);
  });

  return boardIds.map((id) => loadBoard(worktreeId, id));
}

/**
 * Delete a board
 * @param worktreeId Worktree identifier
 * @param boardId Board identifier
 * @returns true if deleted, false if not found
 */
export function deleteBoard(worktreeId: string, boardId: string): boolean {
  const boardPath = getBoardPath(worktreeId, boardId, 'state.json');

  if (!fileExists(boardPath)) {
    return false;
  }

  // Delete board state file
  deleteFile(boardPath);

  // Remove from worktree's board list
  removeBoardFromWorktree(worktreeId, boardId);

  // Note: We don't delete the entire board directory to avoid data loss
  // The directory can be cleaned up manually if needed

  return true;
}

/**
 * Check if a board exists
 * @param worktreeId Worktree identifier
 * @param boardId Board identifier
 * @returns true if board exists
 */
export function boardExists(worktreeId: string, boardId: string): boolean {
  const boardPath = getBoardPath(worktreeId, boardId, 'state.json');
  return fileExists(boardPath);
}

/**
 * Update board metadata
 * @param worktreeId Worktree identifier
 * @param boardId Board identifier
 * @param updates Partial board state updates
 * @returns Updated board state
 */
export function updateBoard(
  worktreeId: string,
  boardId: string,
  updates: Partial<Pick<BoardState, 'name' | 'description' | 'sprint' | 'columns'>>
): BoardState {
  const board = loadBoard(worktreeId, boardId);

  // Apply updates
  if (updates.name !== undefined) board.name = updates.name;
  if (updates.description !== undefined) board.description = updates.description;
  if (updates.sprint !== undefined) board.sprint = updates.sprint;
  if (updates.columns !== undefined) board.columns = updates.columns;

  saveBoard(worktreeId, boardId, board);
  return board;
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
