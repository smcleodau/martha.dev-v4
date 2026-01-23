/**
 * Team Manager Service
 * Manages team definitions and memberships
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
import type { Assignee } from '../types.js';

export interface Team {
  id: string;
  worktree_id: string;
  name: string;
  description: string;
  color: string;
  members: Assignee[];
  created_at: string;
  updated_at: string;
}

/**
 * Get path to teams directory
 */
function getTeamsDir(worktreeId: string): string {
  return getWorktreePath(worktreeId, 'teams');
}

/**
 * Get path to specific team file
 */
function getTeamPath(worktreeId: string, teamId: string): string {
  return getWorktreePath(worktreeId, 'teams', `${teamId}.json`);
}

/**
 * Create a new team
 */
export function createTeam(
  worktreeId: string,
  data: {
    name: string;
    description: string;
    color?: string;
    members?: Assignee[];
  }
): Team {
  // Ensure teams directory exists
  ensureDir(getTeamsDir(worktreeId));

  // Generate team ID
  const teamId = `TEAM-${generateRandomId(6, true)}`;

  const team: Team = {
    id: teamId,
    worktree_id: worktreeId,
    name: data.name,
    description: data.description,
    color: data.color || '#3B82F6',
    members: data.members || [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const teamPath = getTeamPath(worktreeId, teamId);
  writeJsonSync(teamPath, team);

  return team;
}

/**
 * Get a team by ID
 */
export function getTeam(worktreeId: string, teamId: string): Team {
  const teamPath = getTeamPath(worktreeId, teamId);

  if (!fileExists(teamPath)) {
    throw new Error(`Team not found: ${teamId}`);
  }

  return readJsonSync<Team>(teamPath);
}

/**
 * List all teams in a worktree
 */
export function listTeams(worktreeId: string): Team[] {
  const teamsDir = getTeamsDir(worktreeId);

  if (!fileExists(teamsDir)) {
    return [];
  }

  const files = listFiles(teamsDir, '.json');
  const teams: Team[] = [];

  for (const file of files) {
    const teamId = file.replace('.json', '');
    try {
      const team = getTeam(worktreeId, teamId);
      teams.push(team);
    } catch (error) {
      // Skip invalid files
      console.warn(`Failed to load team ${teamId}:`, error);
    }
  }

  // Sort by name alphabetically
  return teams.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Update a team
 */
export function updateTeam(
  worktreeId: string,
  teamId: string,
  updates: Partial<Pick<Team, 'name' | 'description' | 'color' | 'members'>>
): Team {
  const team = getTeam(worktreeId, teamId);

  // Apply updates
  if (updates.name !== undefined) team.name = updates.name;
  if (updates.description !== undefined) team.description = updates.description;
  if (updates.color !== undefined) team.color = updates.color;
  if (updates.members !== undefined) team.members = updates.members;

  team.updated_at = new Date().toISOString();

  const teamPath = getTeamPath(worktreeId, teamId);
  writeJsonSync(teamPath, team);

  return team;
}

/**
 * Delete a team
 */
export function deleteTeam(worktreeId: string, teamId: string): boolean {
  const teamPath = getTeamPath(worktreeId, teamId);

  if (!fileExists(teamPath)) {
    return false;
  }

  deleteFile(teamPath);
  return true;
}

/**
 * Add a member to a team
 */
export function addTeamMember(
  worktreeId: string,
  teamId: string,
  member: Assignee
): Team {
  const team = getTeam(worktreeId, teamId);

  // Check if member already exists
  const exists = team.members.some((m) => m.id === member.id);
  if (!exists) {
    team.members.push(member);
    team.updated_at = new Date().toISOString();

    const teamPath = getTeamPath(worktreeId, teamId);
    writeJsonSync(teamPath, team);
  }

  return team;
}

/**
 * Remove a member from a team
 */
export function removeTeamMember(
  worktreeId: string,
  teamId: string,
  memberId: string
): Team {
  const team = getTeam(worktreeId, teamId);

  const index = team.members.findIndex((m) => m.id === memberId);
  if (index !== -1) {
    team.members.splice(index, 1);
    team.updated_at = new Date().toISOString();

    const teamPath = getTeamPath(worktreeId, teamId);
    writeJsonSync(teamPath, team);
  }

  return team;
}

/**
 * Check if a team exists
 */
export function teamExists(worktreeId: string, teamId: string): boolean {
  const teamPath = getTeamPath(worktreeId, teamId);
  return fileExists(teamPath);
}

/**
 * Get team statistics
 */
export function getTeamStats(
  worktreeId: string,
  teamId: string,
  issues: Array<{ id: string; assignee: Assignee | null; status: string }>
): {
  member_count: number;
  assigned_issues: number;
  completed_issues: number;
  in_progress_issues: number;
  members_with_assignments: number;
} {
  const team = getTeam(worktreeId, teamId);
  const memberIds = new Set(team.members.map((m) => m.id));

  // Find issues assigned to team members
  const teamIssues = issues.filter(
    (issue) => issue.assignee && memberIds.has(issue.assignee.id)
  );

  const membersWithWork = new Set(
    teamIssues.map((issue) => issue.assignee?.id).filter(Boolean)
  );

  return {
    member_count: team.members.length,
    assigned_issues: teamIssues.length,
    completed_issues: teamIssues.filter((i) => i.status === 'done').length,
    in_progress_issues: teamIssues.filter((i) => i.status === 'in_progress').length,
    members_with_assignments: membersWithWork.size,
  };
}
