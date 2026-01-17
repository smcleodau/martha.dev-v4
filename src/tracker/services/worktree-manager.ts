/**
 * Worktree Manager Service
 * Manages tracker worktree configurations (separate from Martha's main worktree system)
 * Stores configs in .martha/worktrees/{worktreeId}/config.json
 */

import * as path from 'node:path';
import type { WorktreeConfig } from '../types.js';
import {
  readJsonSync,
  writeJsonSync,
  fileExists,
  ensureDir,
  listFiles,
  getWorktreePath,
  getTrackerPath,
  deleteFile,
} from './file-storage.js';

/**
 * Load worktree configuration from filesystem
 * @param worktreeId Worktree identifier
 * @returns Worktree configuration
 * @throws Error if worktree not found
 */
export function loadWorktree(worktreeId: string): WorktreeConfig {
  const configPath = getWorktreePath(worktreeId, 'config.json');

  if (!fileExists(configPath)) {
    throw new Error(`Worktree not found: ${worktreeId}`);
  }

  return readJsonSync<WorktreeConfig>(configPath);
}

/**
 * Save worktree configuration to filesystem
 * @param config Worktree configuration to save
 */
export function saveWorktree(config: WorktreeConfig): void {
  const configPath = getWorktreePath(config.id, 'config.json');
  config.updated_at = new Date().toISOString();
  writeJsonSync(configPath, config);
}

/**
 * Create a new worktree
 * @param data Worktree creation data
 * @returns Created worktree configuration
 */
export function createWorktree(data: {
  id: string;
  name: string;
  display_name: string;
  description: string;
  path: string;
  github_repo?: string;
}): WorktreeConfig {
  // Use provided human-readable ID
  const worktreeId = data.id;
  const configPath = getWorktreePath(worktreeId, 'config.json');

  const config: WorktreeConfig = {
    id: worktreeId,
    name: data.name,
    display_name: data.display_name,
    description: data.description,
    path: data.path,
    github_repo: data.github_repo,
    boards: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Create worktree directory structure
  ensureDir(getWorktreePath(worktreeId, 'boards'));
  ensureDir(getWorktreePath(worktreeId, 'comments'));
  ensureDir(getWorktreePath(worktreeId, 'documentation'));
  ensureDir(getWorktreePath(worktreeId, 'agents'));
  ensureDir(getWorktreePath(worktreeId, 'activity'));

  // Save config
  saveWorktree(config);

  // Create empty index
  const indexPath = getWorktreePath(worktreeId, 'index.json');
  writeJsonSync(indexPath, {
    $schema: 'https://martha.dev/schemas/tracker/index.json',
    worktree_id: worktreeId,
    version: 1,
    count: 0,
    next_id: 1,
    issues: {},
    by_status: {},
    by_parent: {},
    by_type: {},
    by_board: {},
    updated_at: new Date().toISOString(),
  });

  return config;
}

/**
 * List all worktrees
 * @returns Array of worktree configurations
 */
export function listWorktrees(): WorktreeConfig[] {
  const worktreesDir = getTrackerPath('worktrees');

  if (!fileExists(worktreesDir)) {
    return [];
  }

  const worktreeIds = listFiles(worktreesDir).filter((name) => {
    const configPath = getWorktreePath(name, 'config.json');
    return fileExists(configPath);
  });

  return worktreeIds.map((id) => loadWorktree(id));
}

/**
 * Delete a worktree and all its data
 * @param worktreeId Worktree identifier
 * @returns true if deleted, false if not found
 */
export function deleteWorktree(worktreeId: string): boolean {
  const configPath = getWorktreePath(worktreeId, 'config.json');

  if (!fileExists(configPath)) {
    return false;
  }

  // Delete config file
  deleteFile(configPath);

  // Note: We don't recursively delete the entire directory to avoid data loss
  // The directory can be cleaned up manually if needed
  // TODO: Consider adding a "force" parameter to delete all data

  return true;
}

/**
 * Add a board to a worktree
 * @param worktreeId Worktree identifier
 * @param boardId Board identifier to add
 */
export function addBoardToWorktree(worktreeId: string, boardId: string): void {
  const config = loadWorktree(worktreeId);

  if (config.boards.includes(boardId)) {
    return; // Already added
  }

  config.boards.push(boardId);
  saveWorktree(config);
}

/**
 * Remove a board from a worktree
 * @param worktreeId Worktree identifier
 * @param boardId Board identifier to remove
 */
export function removeBoardFromWorktree(worktreeId: string, boardId: string): void {
  const config = loadWorktree(worktreeId);

  const index = config.boards.indexOf(boardId);
  if (index === -1) {
    return; // Not found
  }

  config.boards.splice(index, 1);
  saveWorktree(config);
}

/**
 * Check if a worktree exists
 * @param worktreeId Worktree identifier
 * @returns true if worktree exists
 */
export function worktreeExists(worktreeId: string): boolean {
  const configPath = getWorktreePath(worktreeId, 'config.json');
  return fileExists(configPath);
}

/**
 * Update worktree metadata
 * @param worktreeId Worktree identifier
 * @param updates Partial worktree configuration updates
 * @returns Updated worktree configuration
 */
export function updateWorktree(
  worktreeId: string,
  updates: Partial<Omit<WorktreeConfig, 'id' | 'created_at' | 'updated_at'>>
): WorktreeConfig {
  const config = loadWorktree(worktreeId);

  // Apply updates
  if (updates.name !== undefined) config.name = updates.name;
  if (updates.display_name !== undefined) config.display_name = updates.display_name;
  if (updates.description !== undefined) config.description = updates.description;
  if (updates.path !== undefined) config.path = updates.path;
  if (updates.github_repo !== undefined) config.github_repo = updates.github_repo;
  if (updates.boards !== undefined) config.boards = updates.boards;

  saveWorktree(config);
  return config;
}
