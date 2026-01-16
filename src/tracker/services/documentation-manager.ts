/**
 * Documentation Manager Service
 * Manages documentation with linking to issues, epics, boards, and other docs
 */

import * as path from 'node:path';
import {
  readJsonSync,
  writeJsonSync,
  getWorktreePath,
  listFiles,
  deleteFile,
  ensureDir,
  fileExists,
} from './file-storage.js';
import type { Documentation } from '../types.js';

/**
 * Get documentation directory for a worktree
 * @param worktreeId Worktree identifier
 * @returns Path to documentation directory
 */
function getDocumentationDir(worktreeId: string): string {
  return getWorktreePath(worktreeId, 'documentation');
}

/**
 * Get documentation file path
 * @param worktreeId Worktree identifier
 * @param docId Documentation ID
 * @returns Path to documentation file
 */
function getDocumentationPath(worktreeId: string, docId: string): string {
  return path.join(getDocumentationDir(worktreeId), `${docId}.json`);
}

/**
 * Generate unique documentation ID
 * @returns Documentation ID
 */
function generateDocId(): string {
  return `doc-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Create documentation
 * @param worktreeId Worktree identifier
 * @param data Documentation data
 * @returns Created documentation
 */
export function createDocumentation(
  worktreeId: string,
  data: {
    issue_id?: string;
    epic_id?: string;
    board_id?: string;
    type: Documentation['type'];
    title: string;
    content: string;
    tags?: string[];
    links?: {
      related_issues?: string[];
      related_docs?: string[];
      external_links?: string[];
    };
    author: string;
  }
): Documentation {
  const docId = generateDocId();
  const now = new Date().toISOString();

  const doc: Documentation = {
    id: docId,
    worktree_id: worktreeId,
    issue_id: data.issue_id,
    epic_id: data.epic_id,
    board_id: data.board_id,
    type: data.type,
    title: data.title,
    content: data.content,
    tags: data.tags || [],
    links: {
      related_issues: data.links?.related_issues || [],
      related_docs: data.links?.related_docs || [],
      external_links: data.links?.external_links || [],
    },
    metadata: {
      created_at: now,
      updated_at: now,
      author: data.author,
      version: 1,
    },
  };

  const docDir = getDocumentationDir(worktreeId);
  ensureDir(docDir);

  const docPath = getDocumentationPath(worktreeId, docId);
  writeJsonSync(docPath, doc);

  return doc;
}

/**
 * Get documentation by ID
 * @param worktreeId Worktree identifier
 * @param docId Documentation ID
 * @returns Documentation or null if not found
 */
export function getDocumentation(worktreeId: string, docId: string): Documentation | null {
  try {
    const docPath = getDocumentationPath(worktreeId, docId);
    if (!fileExists(docPath)) {
      return null;
    }
    return readJsonSync<Documentation>(docPath);
  } catch {
    return null;
  }
}

/**
 * List all documentation in a worktree with optional filters
 * @param worktreeId Worktree identifier
 * @param filters Optional filters
 * @returns Array of documentation
 */
export function listDocumentation(
  worktreeId: string,
  filters?: {
    type?: Documentation['type'];
    issue_id?: string;
    epic_id?: string;
    board_id?: string;
    tags?: string[];
  }
): Documentation[] {
  const docDir = getDocumentationDir(worktreeId);

  if (!fileExists(docDir)) {
    return [];
  }

  const files = listFiles(docDir, '.json');

  let docs = files.map((file) => {
    const docPath = path.join(docDir, file);
    return readJsonSync<Documentation>(docPath);
  });

  // Apply filters
  if (filters?.type) {
    docs = docs.filter((doc) => doc.type === filters.type);
  }
  if (filters?.issue_id) {
    docs = docs.filter((doc) => doc.issue_id === filters.issue_id);
  }
  if (filters?.epic_id) {
    docs = docs.filter((doc) => doc.epic_id === filters.epic_id);
  }
  if (filters?.board_id) {
    docs = docs.filter((doc) => doc.board_id === filters.board_id);
  }
  if (filters?.tags && filters.tags.length > 0) {
    docs = docs.filter((doc) =>
      filters.tags!.some(tag => doc.tags.includes(tag))
    );
  }

  // Sort by updated_at descending
  return docs.sort((a, b) => {
    return new Date(b.metadata.updated_at).getTime() - new Date(a.metadata.updated_at).getTime();
  });
}

/**
 * Update documentation
 * @param worktreeId Worktree identifier
 * @param docId Documentation ID
 * @param updates Partial documentation updates
 * @returns Updated documentation or null if not found
 */
export function updateDocumentation(
  worktreeId: string,
  docId: string,
  updates: {
    title?: string;
    content?: string;
    tags?: string[];
    links?: {
      related_issues?: string[];
      related_docs?: string[];
      external_links?: string[];
    };
  }
): Documentation | null {
  const doc = getDocumentation(worktreeId, docId);
  if (!doc) return null;

  // Apply updates
  if (updates.title !== undefined) doc.title = updates.title;
  if (updates.content !== undefined) doc.content = updates.content;
  if (updates.tags !== undefined) doc.tags = updates.tags;
  if (updates.links !== undefined) {
    doc.links = {
      related_issues: updates.links.related_issues || doc.links.related_issues,
      related_docs: updates.links.related_docs || doc.links.related_docs,
      external_links: updates.links.external_links || doc.links.external_links,
    };
  }

  // Update metadata
  doc.metadata.updated_at = new Date().toISOString();
  doc.metadata.version++;

  const docPath = getDocumentationPath(worktreeId, docId);
  writeJsonSync(docPath, doc);

  return doc;
}

/**
 * Delete documentation
 * @param worktreeId Worktree identifier
 * @param docId Documentation ID
 * @returns true if deleted, false if not found
 */
export function deleteDocumentation(worktreeId: string, docId: string): boolean {
  const docPath = getDocumentationPath(worktreeId, docId);

  if (!fileExists(docPath)) {
    return false;
  }

  deleteFile(docPath);
  return true;
}

/**
 * Link documentation to another document
 * @param worktreeId Worktree identifier
 * @param sourceDocId Source documentation ID
 * @param targetDocId Target documentation ID to link to
 * @returns Updated documentation or null if not found
 */
export function linkDocumentation(
  worktreeId: string,
  sourceDocId: string,
  targetDocId: string
): Documentation | null {
  const doc = getDocumentation(worktreeId, sourceDocId);
  if (!doc) return null;

  // Add to related_docs if not already present
  if (!doc.links.related_docs.includes(targetDocId)) {
    doc.links.related_docs.push(targetDocId);
  }

  const docPath = getDocumentationPath(worktreeId, sourceDocId);
  writeJsonSync(docPath, doc);

  return doc;
}

/**
 * Link documentation to an issue
 * @param worktreeId Worktree identifier
 * @param docId Documentation ID
 * @param issueId Issue ID to link to
 * @returns Updated documentation or null if not found
 */
export function linkDocumentationToIssue(
  worktreeId: string,
  docId: string,
  issueId: string
): Documentation | null {
  const doc = getDocumentation(worktreeId, docId);
  if (!doc) return null;

  // Add to related_issues if not already present
  if (!doc.links.related_issues.includes(issueId)) {
    doc.links.related_issues.push(issueId);
  }

  const docPath = getDocumentationPath(worktreeId, docId);
  writeJsonSync(docPath, doc);

  return doc;
}

/**
 * Get all documentation linked to an issue
 * @param worktreeId Worktree identifier
 * @param issueId Issue ID
 * @returns Array of documentation
 */
export function getDocumentationForIssue(
  worktreeId: string,
  issueId: string
): Documentation[] {
  const allDocs = listDocumentation(worktreeId);

  // Find docs that:
  // 1. Have issue_id matching
  // 2. Have issueId in related_issues
  return allDocs.filter(
    (doc) => doc.issue_id === issueId || doc.links.related_issues.includes(issueId)
  );
}

/**
 * Search documentation by keyword
 * @param worktreeId Worktree identifier
 * @param keyword Search keyword
 * @returns Array of matching documentation
 */
export function searchDocumentation(worktreeId: string, keyword: string): Documentation[] {
  const allDocs = listDocumentation(worktreeId);
  const lowerKeyword = keyword.toLowerCase();

  return allDocs.filter((doc) => {
    return (
      doc.title.toLowerCase().includes(lowerKeyword) ||
      doc.content.toLowerCase().includes(lowerKeyword) ||
      doc.tags.some(tag => tag.toLowerCase().includes(lowerKeyword))
    );
  });
}
