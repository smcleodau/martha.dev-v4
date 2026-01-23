/**
 * Release Manager Service
 * Manages releases with quality gates and issue tracking
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

export type ReleaseGateType =
  | 'security'
  | 'testing'
  | 'documentation'
  | 'review'
  | 'deployment'
  | 'custom';

export type ReleaseGateStatus = 'passed' | 'failed' | 'pending' | 'skipped';

export interface ReleaseGate {
  id: string;
  name: string;
  type: ReleaseGateType;
  status: ReleaseGateStatus;
  required: boolean;
  description: string;
  metadata?: Record<string, any>;
}

export interface Release {
  id: string;
  worktree_id: string;
  name: string;
  version: string;
  target_date: string;
  description: string;
  gates: ReleaseGate[];
  issue_ids: string[];
  status: 'planning' | 'in_progress' | 'testing' | 'released' | 'cancelled';
  created_at: string;
  updated_at: string;
  version_number: number;
}

/**
 * Get path to releases directory
 */
function getReleasesDir(worktreeId: string): string {
  return getWorktreePath(worktreeId, 'releases');
}

/**
 * Get path to specific release file
 */
function getReleasePath(worktreeId: string, releaseId: string): string {
  return getWorktreePath(worktreeId, 'releases', `${releaseId}.json`);
}

/**
 * Create default release gates
 */
function createDefaultGates(): ReleaseGate[] {
  return [
    {
      id: 'security',
      name: 'Security Review',
      type: 'security',
      status: 'pending',
      required: true,
      description: 'Security vulnerabilities checked and resolved',
    },
    {
      id: 'testing',
      name: 'Testing Complete',
      type: 'testing',
      status: 'pending',
      required: true,
      description: 'All tests passing with adequate coverage',
    },
    {
      id: 'documentation',
      name: 'Documentation Updated',
      type: 'documentation',
      status: 'pending',
      required: true,
      description: 'User-facing documentation updated',
    },
    {
      id: 'code-review',
      name: 'Code Review',
      type: 'review',
      status: 'pending',
      required: true,
      description: 'All code reviewed and approved',
    },
  ];
}

/**
 * Create a new release
 */
export function createRelease(
  worktreeId: string,
  data: {
    name: string;
    version: string;
    target_date: string;
    description: string;
    gates?: ReleaseGate[];
    status?: Release['status'];
  }
): Release {
  // Ensure releases directory exists
  ensureDir(getReleasesDir(worktreeId));

  // Generate release ID
  const releaseId = `REL-${generateRandomId(6, true)}`;

  const release: Release = {
    id: releaseId,
    worktree_id: worktreeId,
    name: data.name,
    version: data.version,
    target_date: data.target_date,
    description: data.description,
    gates: data.gates || createDefaultGates(),
    issue_ids: [],
    status: data.status || 'planning',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    version_number: 1,
  };

  const releasePath = getReleasePath(worktreeId, releaseId);
  writeJsonSync(releasePath, release);

  return release;
}

/**
 * Get a release by ID
 */
export function getRelease(worktreeId: string, releaseId: string): Release {
  const releasePath = getReleasePath(worktreeId, releaseId);

  if (!fileExists(releasePath)) {
    throw new Error(`Release not found: ${releaseId}`);
  }

  return readJsonSync<Release>(releasePath);
}

/**
 * List all releases in a worktree
 */
export function listReleases(worktreeId: string): Release[] {
  const releasesDir = getReleasesDir(worktreeId);

  if (!fileExists(releasesDir)) {
    return [];
  }

  const files = listFiles(releasesDir, '.json');
  const releases: Release[] = [];

  for (const file of files) {
    const releaseId = file.replace('.json', '');
    try {
      const release = getRelease(worktreeId, releaseId);
      releases.push(release);
    } catch (error) {
      // Skip invalid files
      console.warn(`Failed to load release ${releaseId}:`, error);
    }
  }

  // Sort by target_date descending (most recent first)
  return releases.sort(
    (a, b) => new Date(b.target_date).getTime() - new Date(a.target_date).getTime()
  );
}

/**
 * Update a release
 */
export function updateRelease(
  worktreeId: string,
  releaseId: string,
  updates: Partial<
    Pick<Release, 'name' | 'version' | 'target_date' | 'description' | 'status' | 'gates'>
  >
): Release {
  const release = getRelease(worktreeId, releaseId);

  // Apply updates
  if (updates.name !== undefined) release.name = updates.name;
  if (updates.version !== undefined) release.version = updates.version;
  if (updates.target_date !== undefined) release.target_date = updates.target_date;
  if (updates.description !== undefined) release.description = updates.description;
  if (updates.status !== undefined) release.status = updates.status;
  if (updates.gates !== undefined) release.gates = updates.gates;

  release.updated_at = new Date().toISOString();
  release.version_number += 1;

  const releasePath = getReleasePath(worktreeId, releaseId);
  writeJsonSync(releasePath, release);

  return release;
}

/**
 * Delete a release
 */
export function deleteRelease(worktreeId: string, releaseId: string): boolean {
  const releasePath = getReleasePath(worktreeId, releaseId);

  if (!fileExists(releasePath)) {
    return false;
  }

  deleteFile(releasePath);
  return true;
}

/**
 * Update a specific gate's status
 */
export function updateGateStatus(
  worktreeId: string,
  releaseId: string,
  gateId: string,
  status: ReleaseGateStatus,
  metadata?: Record<string, any>
): Release {
  const release = getRelease(worktreeId, releaseId);

  const gate = release.gates.find((g) => g.id === gateId);
  if (!gate) {
    throw new Error(`Gate not found: ${gateId}`);
  }

  gate.status = status;
  if (metadata !== undefined) {
    gate.metadata = metadata;
  }

  release.updated_at = new Date().toISOString();
  release.version_number += 1;

  const releasePath = getReleasePath(worktreeId, releaseId);
  writeJsonSync(releasePath, release);

  return release;
}

/**
 * Add an issue to a release
 */
export function addIssueToRelease(
  worktreeId: string,
  releaseId: string,
  issueId: string
): Release {
  const release = getRelease(worktreeId, releaseId);

  if (!release.issue_ids.includes(issueId)) {
    release.issue_ids.push(issueId);
    release.updated_at = new Date().toISOString();
    release.version_number += 1;

    const releasePath = getReleasePath(worktreeId, releaseId);
    writeJsonSync(releasePath, release);
  }

  return release;
}

/**
 * Remove an issue from a release
 */
export function removeIssueFromRelease(
  worktreeId: string,
  releaseId: string,
  issueId: string
): Release {
  const release = getRelease(worktreeId, releaseId);

  const index = release.issue_ids.indexOf(issueId);
  if (index !== -1) {
    release.issue_ids.splice(index, 1);
    release.updated_at = new Date().toISOString();
    release.version_number += 1;

    const releasePath = getReleasePath(worktreeId, releaseId);
    writeJsonSync(releasePath, release);
  }

  return release;
}

/**
 * Check if a release exists
 */
export function releaseExists(worktreeId: string, releaseId: string): boolean {
  const releasePath = getReleasePath(worktreeId, releaseId);
  return fileExists(releasePath);
}

/**
 * Get release statistics
 */
export function getReleaseStats(
  worktreeId: string,
  releaseId: string,
  issues: Array<{ id: string; status: string; type: string }>
): {
  total_issues: number;
  completed_issues: number;
  in_progress_issues: number;
  pending_issues: number;
  completion_percentage: number;
  gates_passed: number;
  gates_failed: number;
  gates_pending: number;
  gates_total: number;
  required_gates_passed: number;
  required_gates_total: number;
  ready_for_release: boolean;
} {
  const release = getRelease(worktreeId, releaseId);

  // Filter issues in this release
  const releaseIssues = issues.filter((issue) => release.issue_ids.includes(issue.id));

  const completedCount = releaseIssues.filter((i) => i.status === 'done').length;
  const inProgressCount = releaseIssues.filter((i) => i.status === 'in_progress').length;
  const pendingCount = releaseIssues.length - completedCount - inProgressCount;

  // Gate statistics
  const gatesPassed = release.gates.filter((g) => g.status === 'passed').length;
  const gatesFailed = release.gates.filter((g) => g.status === 'failed').length;
  const gatesPending = release.gates.filter((g) => g.status === 'pending').length;

  const requiredGates = release.gates.filter((g) => g.required);
  const requiredGatesPassed = requiredGates.filter((g) => g.status === 'passed').length;

  // Ready for release if all required gates passed and all issues completed
  const readyForRelease =
    requiredGatesPassed === requiredGates.length && completedCount === releaseIssues.length;

  return {
    total_issues: releaseIssues.length,
    completed_issues: completedCount,
    in_progress_issues: inProgressCount,
    pending_issues: pendingCount,
    completion_percentage:
      releaseIssues.length > 0 ? Math.round((completedCount / releaseIssues.length) * 100) : 0,
    gates_passed: gatesPassed,
    gates_failed: gatesFailed,
    gates_pending: gatesPending,
    gates_total: release.gates.length,
    required_gates_passed: requiredGatesPassed,
    required_gates_total: requiredGates.length,
    ready_for_release: readyForRelease,
  };
}

/**
 * Add a custom gate to a release
 */
export function addGate(
  worktreeId: string,
  releaseId: string,
  gate: Omit<ReleaseGate, 'id'>
): Release {
  const release = getRelease(worktreeId, releaseId);

  const newGate: ReleaseGate = {
    id: `gate-${generateRandomId(6, false)}`,
    ...gate,
  };

  release.gates.push(newGate);
  release.updated_at = new Date().toISOString();
  release.version_number += 1;

  const releasePath = getReleasePath(worktreeId, releaseId);
  writeJsonSync(releasePath, release);

  return release;
}

/**
 * Remove a gate from a release
 */
export function removeGate(worktreeId: string, releaseId: string, gateId: string): Release {
  const release = getRelease(worktreeId, releaseId);

  const index = release.gates.findIndex((g) => g.id === gateId);
  if (index !== -1) {
    release.gates.splice(index, 1);
    release.updated_at = new Date().toISOString();
    release.version_number += 1;

    const releasePath = getReleasePath(worktreeId, releaseId);
    writeJsonSync(releasePath, release);
  }

  return release;
}
