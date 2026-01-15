/**
 * Comment Manager Service
 * Manages issue comments
 */

import * as path from 'node:path';
import {
  readJsonSync,
  writeJsonSync,
  getTrackerPath,
  listFiles,
  deleteFile,
  ensureDir,
} from './file-storage.js';
import type { Comment, Assignee } from '../types.js';

/**
 * Get comments directory for an issue
 * @param issueId Issue ID
 * @returns Path to comments directory
 */
function getCommentsDir(issueId: string): string {
  return getTrackerPath('comments', issueId);
}

/**
 * Get comment file path
 * @param issueId Issue ID
 * @param commentId Comment ID
 * @returns Path to comment file
 */
function getCommentPath(issueId: string, commentId: string): string {
  return path.join(getCommentsDir(issueId), `${commentId}.json`);
}

/**
 * Generate unique comment ID
 * @returns Comment ID
 */
function generateCommentId(): string {
  return `cmt-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Create a new comment
 * @param issueId Issue ID
 * @param author Comment author
 * @param content Comment content
 * @returns Created comment
 */
export function createComment(issueId: string, author: Assignee, content: string): Comment {
  const commentId = generateCommentId();
  const now = new Date().toISOString();

  const comment: Comment = {
    id: commentId,
    issue_id: issueId,
    author,
    content,
    created_at: now,
    updated_at: now,
  };

  const commentsDir = getCommentsDir(issueId);
  ensureDir(commentsDir);

  const commentPath = getCommentPath(issueId, commentId);
  writeJsonSync(commentPath, comment);

  return comment;
}

/**
 * List all comments for an issue
 * @param issueId Issue ID
 * @returns Array of comments
 */
export function listComments(issueId: string): Comment[] {
  const commentsDir = getCommentsDir(issueId);
  const files = listFiles(commentsDir, '.json');

  const comments = files.map((file) => {
    const commentPath = path.join(commentsDir, file);
    return readJsonSync<Comment>(commentPath);
  });

  // Sort by created_at ascending
  return comments.sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
}

/**
 * Get a single comment
 * @param issueId Issue ID
 * @param commentId Comment ID
 * @returns Comment or null if not found
 */
export function getComment(issueId: string, commentId: string): Comment | null {
  try {
    const commentPath = getCommentPath(issueId, commentId);
    return readJsonSync<Comment>(commentPath);
  } catch {
    return null;
  }
}

/**
 * Update a comment
 * @param issueId Issue ID
 * @param commentId Comment ID
 * @param content New content
 * @returns Updated comment or null if not found
 */
export function updateComment(
  issueId: string,
  commentId: string,
  content: string
): Comment | null {
  const comment = getComment(issueId, commentId);
  if (!comment) return null;

  comment.content = content;
  comment.updated_at = new Date().toISOString();

  const commentPath = getCommentPath(issueId, commentId);
  writeJsonSync(commentPath, comment);

  return comment;
}

/**
 * Delete a comment
 * @param issueId Issue ID
 * @param commentId Comment ID
 * @returns true if deleted, false if not found
 */
export function deleteComment(issueId: string, commentId: string): boolean {
  const commentPath = getCommentPath(issueId, commentId);
  try {
    deleteFile(commentPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Delete all comments for an issue
 * @param issueId Issue ID
 */
export function deleteAllComments(issueId: string): void {
  const commentsDir = getCommentsDir(issueId);
  const files = listFiles(commentsDir, '.json');

  files.forEach((file) => {
    const commentPath = path.join(commentsDir, file);
    deleteFile(commentPath);
  });
}
