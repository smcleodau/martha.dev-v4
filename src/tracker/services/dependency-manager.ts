/**
 * Dependency Manager Service
 * Manages issue dependencies and validates dependency graphs
 */

import * as path from 'node:path';
import {
  readJsonSync,
  writeJsonSync,
  getWorktreePath,
  ensureDir,
  fileExists,
} from './file-storage.js';

export interface IssueDependencies {
  issue_id: string;
  blocks: string[];       // Issues this blocks
  blocked_by: string[];   // Issues blocking this
  related: string[];      // Related issues
}

interface DependenciesFile {
  worktree_id: string;
  dependencies: Record<string, IssueDependencies>;
  updated_at: string;
}

/**
 * Get dependencies file path for a worktree
 * @param worktreeId Worktree ID
 * @returns Path to dependencies file
 */
function getDependenciesFilePath(worktreeId: string): string {
  const dependenciesDir = getWorktreePath(worktreeId, 'dependencies');
  ensureDir(dependenciesDir);
  return path.join(dependenciesDir, 'index.json');
}

/**
 * Load dependencies file for a worktree
 * @param worktreeId Worktree ID
 * @returns Dependencies file data
 */
function loadDependenciesFile(worktreeId: string): DependenciesFile {
  const filePath = getDependenciesFilePath(worktreeId);
  try {
    return readJsonSync<DependenciesFile>(filePath);
  } catch (error) {
    // File doesn't exist yet, return empty
    return {
      worktree_id: worktreeId,
      dependencies: {},
      updated_at: new Date().toISOString()
    };
  }
}

/**
 * Save dependencies file for a worktree
 * @param worktreeId Worktree ID
 * @param data Dependencies file data
 */
function saveDependenciesFile(worktreeId: string, data: DependenciesFile): void {
  data.updated_at = new Date().toISOString();
  const filePath = getDependenciesFilePath(worktreeId);
  writeJsonSync(filePath, data);
}

/**
 * Get dependencies for an issue
 * @param worktreeId Worktree ID
 * @param issueId Issue ID
 * @returns Issue dependencies
 */
export function getDependencies(
  worktreeId: string,
  issueId: string
): IssueDependencies {
  const data = loadDependenciesFile(worktreeId);
  return data.dependencies[issueId] || {
    issue_id: issueId,
    blocks: [],
    blocked_by: [],
    related: []
  };
}

/**
 * Check if there is a cycle in the dependency graph using the "blocks" relationship
 * Uses depth-first search to detect cycles
 * @param worktreeId Worktree ID
 * @param fromIssueId Starting issue (the one that would block)
 * @param toIssueId Target issue (the one that would be blocked)
 * @returns true if adding this dependency would create a cycle
 */
export function hasCycle(
  worktreeId: string,
  fromIssueId: string,
  toIssueId: string
): boolean {
  const data = loadDependenciesFile(worktreeId);

  // If fromIssue blocks toIssue, and toIssue (directly or transitively) blocks fromIssue,
  // we have a cycle

  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function dfs(currentIssueId: string): boolean {
    if (recursionStack.has(currentIssueId)) {
      // Found a cycle
      return true;
    }

    if (visited.has(currentIssueId)) {
      // Already explored this path, no cycle found
      return false;
    }

    visited.add(currentIssueId);
    recursionStack.add(currentIssueId);

    const deps = data.dependencies[currentIssueId];
    if (deps) {
      // Follow the "blocks" relationship
      for (const blockedIssue of deps.blocks) {
        if (dfs(blockedIssue)) {
          return true;
        }
      }
    }

    recursionStack.delete(currentIssueId);
    return false;
  }

  // Temporarily add the new dependency to check for cycle
  const tempData = JSON.parse(JSON.stringify(data)) as DependenciesFile;

  if (!tempData.dependencies[fromIssueId]) {
    tempData.dependencies[fromIssueId] = {
      issue_id: fromIssueId,
      blocks: [],
      blocked_by: [],
      related: []
    };
  }

  tempData.dependencies[fromIssueId].blocks.push(toIssueId);

  // Now check if we can reach fromIssueId starting from toIssueId
  // by following the "blocks" edges
  data.dependencies = tempData.dependencies;

  // Start DFS from toIssueId and see if we can reach fromIssueId
  visited.clear();
  recursionStack.clear();

  function canReach(current: string, target: string): boolean {
    if (current === target) {
      return true;
    }

    if (visited.has(current)) {
      return false;
    }

    visited.add(current);

    const deps = data.dependencies[current];
    if (deps) {
      for (const blockedIssue of deps.blocks) {
        if (canReach(blockedIssue, target)) {
          return true;
        }
      }
    }

    return false;
  }

  return canReach(toIssueId, fromIssueId);
}

/**
 * Validate the entire dependency graph
 * @param worktreeId Worktree ID
 * @returns Object with validation results
 */
export function validateDependencyGraph(worktreeId: string): {
  valid: boolean;
  cycles: Array<{ from: string; to: string }>;
  orphans: string[];
} {
  const data = loadDependenciesFile(worktreeId);
  const cycles: Array<{ from: string; to: string }> = [];
  const allIssues = new Set<string>(Object.keys(data.dependencies));

  // Check for cycles
  for (const issueId in data.dependencies) {
    const deps = data.dependencies[issueId];
    for (const blockedIssue of deps.blocks) {
      // Temporarily remove this edge and check if adding it creates a cycle
      const originalBlocks = [...deps.blocks];
      deps.blocks = deps.blocks.filter(id => id !== blockedIssue);

      if (hasCycle(worktreeId, issueId, blockedIssue)) {
        cycles.push({ from: issueId, to: blockedIssue });
      }

      // Restore the edge
      deps.blocks = originalBlocks;
    }
  }

  // Check for orphaned references (dependencies to non-existent issues)
  const orphans: string[] = [];
  for (const issueId in data.dependencies) {
    const deps = data.dependencies[issueId];
    [...deps.blocks, ...deps.blocked_by, ...deps.related].forEach(refId => {
      if (!allIssues.has(refId)) {
        orphans.push(refId);
      }
    });
  }

  return {
    valid: cycles.length === 0 && orphans.length === 0,
    cycles,
    orphans
  };
}

/**
 * Add a dependency between issues
 * @param worktreeId Worktree ID
 * @param fromIssueId Issue that blocks/relates
 * @param toIssueId Issue that is blocked/related
 * @param type Dependency type
 * @returns Object with success status and optional error message
 */
export function addDependency(
  worktreeId: string,
  fromIssueId: string,
  toIssueId: string,
  type: 'blocks' | 'blocked_by' | 'related'
): { success: boolean; error?: string } {
  // Prevent self-references
  if (fromIssueId === toIssueId) {
    return { success: false, error: 'Issue cannot depend on itself' };
  }

  // Check for cycles only for blocking relationships
  if (type === 'blocks' && hasCycle(worktreeId, fromIssueId, toIssueId)) {
    return { success: false, error: 'Adding this dependency would create a circular dependency' };
  }

  const data = loadDependenciesFile(worktreeId);

  // Ensure both issues have entries
  if (!data.dependencies[fromIssueId]) {
    data.dependencies[fromIssueId] = {
      issue_id: fromIssueId,
      blocks: [],
      blocked_by: [],
      related: []
    };
  }

  if (!data.dependencies[toIssueId]) {
    data.dependencies[toIssueId] = {
      issue_id: toIssueId,
      blocks: [],
      blocked_by: [],
      related: []
    };
  }

  const fromDeps = data.dependencies[fromIssueId];
  const toDeps = data.dependencies[toIssueId];

  // Add the dependency
  if (type === 'blocks') {
    if (!fromDeps.blocks.includes(toIssueId)) {
      fromDeps.blocks.push(toIssueId);
    }
    // Also add the reverse relationship
    if (!toDeps.blocked_by.includes(fromIssueId)) {
      toDeps.blocked_by.push(fromIssueId);
    }
  } else if (type === 'blocked_by') {
    if (!fromDeps.blocked_by.includes(toIssueId)) {
      fromDeps.blocked_by.push(toIssueId);
    }
    // Also add the reverse relationship
    if (!toDeps.blocks.includes(fromIssueId)) {
      toDeps.blocks.push(fromIssueId);
    }
  } else if (type === 'related') {
    if (!fromDeps.related.includes(toIssueId)) {
      fromDeps.related.push(toIssueId);
    }
    // Related is bidirectional
    if (!toDeps.related.includes(fromIssueId)) {
      toDeps.related.push(fromIssueId);
    }
  }

  saveDependenciesFile(worktreeId, data);
  return { success: true };
}

/**
 * Remove a dependency between issues
 * @param worktreeId Worktree ID
 * @param fromIssueId Issue that blocks/relates
 * @param toIssueId Issue that is blocked/related
 * @param type Dependency type
 * @returns true if removed, false if not found
 */
export function removeDependency(
  worktreeId: string,
  fromIssueId: string,
  toIssueId: string,
  type: 'blocks' | 'blocked_by' | 'related'
): boolean {
  const data = loadDependenciesFile(worktreeId);

  const fromDeps = data.dependencies[fromIssueId];
  const toDeps = data.dependencies[toIssueId];

  if (!fromDeps || !toDeps) {
    return false;
  }

  let removed = false;

  // Remove the dependency
  if (type === 'blocks') {
    const fromIndex = fromDeps.blocks.indexOf(toIssueId);
    if (fromIndex !== -1) {
      fromDeps.blocks.splice(fromIndex, 1);
      removed = true;
    }
    // Also remove the reverse relationship
    const toIndex = toDeps.blocked_by.indexOf(fromIssueId);
    if (toIndex !== -1) {
      toDeps.blocked_by.splice(toIndex, 1);
    }
  } else if (type === 'blocked_by') {
    const fromIndex = fromDeps.blocked_by.indexOf(toIssueId);
    if (fromIndex !== -1) {
      fromDeps.blocked_by.splice(fromIndex, 1);
      removed = true;
    }
    // Also remove the reverse relationship
    const toIndex = toDeps.blocks.indexOf(fromIssueId);
    if (toIndex !== -1) {
      toDeps.blocks.splice(toIndex, 1);
    }
  } else if (type === 'related') {
    const fromIndex = fromDeps.related.indexOf(toIssueId);
    if (fromIndex !== -1) {
      fromDeps.related.splice(fromIndex, 1);
      removed = true;
    }
    // Related is bidirectional
    const toIndex = toDeps.related.indexOf(fromIssueId);
    if (toIndex !== -1) {
      toDeps.related.splice(toIndex, 1);
    }
  }

  if (removed) {
    saveDependenciesFile(worktreeId, data);
  }

  return removed;
}

/**
 * Delete all dependencies for an issue
 * @param worktreeId Worktree ID
 * @param issueId Issue ID
 */
export function deleteAllDependencies(
  worktreeId: string,
  issueId: string
): void {
  const data = loadDependenciesFile(worktreeId);
  const deps = data.dependencies[issueId];

  if (!deps) {
    return;
  }

  // Remove all outgoing dependencies
  deps.blocks.forEach(blockedId => {
    const blockedDeps = data.dependencies[blockedId];
    if (blockedDeps) {
      blockedDeps.blocked_by = blockedDeps.blocked_by.filter(id => id !== issueId);
    }
  });

  deps.blocked_by.forEach(blockingId => {
    const blockingDeps = data.dependencies[blockingId];
    if (blockingDeps) {
      blockingDeps.blocks = blockingDeps.blocks.filter(id => id !== issueId);
    }
  });

  deps.related.forEach(relatedId => {
    const relatedDeps = data.dependencies[relatedId];
    if (relatedDeps) {
      relatedDeps.related = relatedDeps.related.filter(id => id !== issueId);
    }
  });

  // Remove the issue's dependencies entry
  delete data.dependencies[issueId];

  saveDependenciesFile(worktreeId, data);
}
