/**
 * File Storage Service
 * Handles all filesystem I/O operations for the tracker
 * Extracted from martha-workflow/tracker/mcp-server/src/index.ts
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { appConfig } from '../../config/index.js';

/**
 * Synchronously read and parse JSON file
 * @param filePath Absolute path to JSON file
 * @returns Parsed JSON object
 */
export function readJsonSync<T>(filePath: string): T {
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content) as T;
}

/**
 * Synchronously write JSON to file with atomic operation
 * @param filePath Absolute path to write to
 * @param data Data to write
 */
export function writeJsonSync<T>(filePath: string, data: T): void {
  const dir = path.dirname(filePath);
  ensureDir(dir);

  // Atomic write: write to temp file then rename
  const tempPath = `${filePath}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
  fs.renameSync(tempPath, filePath);
}

/**
 * Ensure directory exists, creating it recursively if needed
 * @param dirPath Path to directory
 */
export function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Check if file exists
 * @param filePath Path to check
 * @returns true if file exists
 */
export function fileExists(filePath: string): boolean {
  return fs.existsSync(filePath);
}

/**
 * Read markdown file
 * @param filePath Path to markdown file
 * @returns File contents as string
 */
export function readMarkdown(filePath: string): string {
  return fs.readFileSync(filePath, 'utf-8');
}

/**
 * Write markdown file
 * @param filePath Path to write to
 * @param content Markdown content
 */
export function writeMarkdown(filePath: string, content: string): void {
  const dir = path.dirname(filePath);
  ensureDir(dir);
  fs.writeFileSync(filePath, content, 'utf-8');
}

/**
 * Delete file
 * @param filePath Path to delete
 */
export function deleteFile(filePath: string): void {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

/**
 * List files in directory
 * @param dirPath Directory path
 * @param extension Optional file extension filter (e.g., '.json')
 * @returns Array of filenames
 */
export function listFiles(dirPath: string, extension?: string): string[] {
  if (!fs.existsSync(dirPath)) {
    return [];
  }

  const files = fs.readdirSync(dirPath);

  if (extension) {
    return files.filter((f) => f.endsWith(extension));
  }

  return files;
}

/**
 * Get tracker root directory from config
 * @returns Absolute path to .martha directory
 */
export function getTrackerRoot(): string {
  return appConfig.tracker.marthaDir;
}

/**
 * Build path relative to tracker root
 * @param segments Path segments
 * @returns Absolute path
 */
export function getTrackerPath(...segments: string[]): string {
  return path.join(getTrackerRoot(), ...segments);
}

/**
 * Get worktree directory path
 * @param worktreeId Worktree identifier
 * @param segments Additional path segments
 * @returns Absolute path to worktree directory
 */
export function getWorktreePath(worktreeId: string, ...segments: string[]): string {
  return getTrackerPath('worktrees', worktreeId, ...segments);
}

/**
 * Get board directory path
 * @param worktreeId Worktree identifier
 * @param boardId Board identifier
 * @param segments Additional path segments
 * @returns Absolute path to board directory
 */
export function getBoardPath(worktreeId: string, boardId: string, ...segments: string[]): string {
  return getWorktreePath(worktreeId, 'boards', boardId, ...segments);
}

/**
 * Get issue file path
 * @param worktreeId Worktree identifier
 * @param boardId Board identifier
 * @param issueId Issue identifier
 * @returns Absolute path to issue JSON file
 */
export function getIssuePath(worktreeId: string, boardId: string, issueId: string): string {
  return getBoardPath(worktreeId, boardId, 'issues', `${issueId}.json`);
}
