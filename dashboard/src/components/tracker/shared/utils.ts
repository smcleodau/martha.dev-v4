/**
 * Tracker Utility Functions
 * Helper functions for progress calculation, avatar generation, and formatting
 */

import { type Issue } from '../../../api/tracker';

/**
 * Calculate progress for an epic or story based on child issues
 */
export function calculateProgress(
  parentIssue: Issue,
  allIssues: Record<string, Issue>
): { completed: number; total: number; percentage: number } {
  const children = Object.values(allIssues).filter(
    issue => issue.parent_id === parentIssue.id
  );

  const total = children.length;
  const completedStatuses = ['done', 'closed', 'completed'];
  const completed = children.filter(
    issue => completedStatuses.includes(issue.status.toLowerCase())
  ).length;

  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return { completed, total, percentage };
}

/**
 * Generate consistent avatar gradient based on name
 * Uses warm color palette for visual consistency
 */
export function generateAvatarGradient(name: string): string {
  const gradients = [
    'linear-gradient(135deg, #D97F6F 0%, #E0B666 100%)',  // Coral to Gold
    'linear-gradient(135deg, #E0B666 0%, #52A560 100%)',  // Gold to Green
    'linear-gradient(135deg, #6B9BD1 0%, #8B7AA8 100%)',  // Blue to Purple
    'linear-gradient(135deg, #8B7AA8 0%, #D97F6F 100%)',  // Purple to Coral
    'linear-gradient(135deg, #52A560 0%, #6B9BD1 100%)',  // Green to Blue
    'linear-gradient(135deg, #E8A93A 0%, #D97F6F 100%)',  // Orange to Coral
  ];

  // Generate consistent hash from name
  const hash = name.split('').reduce((acc, char) => {
    return acc + char.charCodeAt(0);
  }, 0);

  return gradients[hash % gradients.length];
}

/**
 * Get team members from issue
 * Currently returns assignee, can be extended to include collaborators
 */
export function getTeamMembers(issue: Issue): Array<{ id: string; name: string; avatar: string }> {
  const members: Array<{ id: string; name: string; avatar: string }> = [];

  if (issue.assignee) {
    members.push(issue.assignee);
  }

  // TODO: Future enhancement - extract team members from:
  // - Comments (commenters)
  // - Activity log (recent contributors)
  // - Linked PRs (reviewers, authors)

  return members;
}

/**
 * Format issue count for display
 */
export function formatIssueCount(count: number, type: 'epic' | 'story' | 'task' | 'bug'): string {
  const pluralMap = {
    epic: 'epics',
    story: 'stories',
    task: 'tasks',
    bug: 'bugs'
  };

  return `${count} ${count === 1 ? type : pluralMap[type]}`;
}

/**
 * Get relative time string (e.g., "2 days ago")
 */
export function getRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}

/**
 * Format activity action into human-readable string
 */
export function formatActivityAction(activity: any): string {
  switch (activity.action) {
    case 'created':
      return `created this ${activity.metadata?.issue_type || 'issue'}`;
    case 'status_changed':
      if (activity.changes && activity.changes.length > 0) {
        const change = activity.changes[0];
        return `changed status from "${change.old_value}" to "${change.new_value}"`;
      }
      return 'changed status';
    case 'assigned':
      if (activity.changes && activity.changes.length > 0) {
        const change = activity.changes[0];
        const newAssignee = change.new_value;
        if (newAssignee && typeof newAssignee === 'object') {
          return `assigned to ${newAssignee.name}`;
        }
        return 'unassigned';
      }
      return 'changed assignee';
    case 'updated':
      if (activity.changes && activity.changes.length > 0) {
        const fields = activity.changes.map((c: any) => c.field).join(', ');
        return `updated ${fields}`;
      }
      return 'updated';
    case 'commented':
      return 'commented';
    case 'linked':
      return 'linked an implementation';
    default:
      return activity.action;
  }
}

/**
 * Calculate task progress for Gantt view
 * For epics and stories: Calculate from children
 * For tasks: Binary (0% or 100%)
 */
export function calculateTaskProgress(issue: Issue, allIssues: Issue[]): number {
  // For epics and stories: Calculate from children
  if (issue.type === 'epic' || issue.type === 'story') {
    const children = allIssues.filter(i => i.parent_id === issue.id);
    if (children.length === 0) return 0;

    const completedStatuses = ['done', 'closed', 'completed'];
    const completedChildren = children.filter(i =>
      completedStatuses.includes(i.status.toLowerCase())
    ).length;

    return Math.round((completedChildren / children.length) * 100);
  }

  // For tasks and bugs: Binary (0% or 100%)
  const completedStatuses = ['done', 'closed', 'completed'];
  return completedStatuses.includes(issue.status.toLowerCase()) ? 100 : 0;
}

/**
 * Get progress color based on percentage
 */
export function getProgressColor(percentage: number, baseColor: string): string {
  // Returns a darker shade for progress fill
  const colorMap: Record<string, string> = {
    '#D97F6F': '#C0392B', // Coral -> Dark Red
    '#E0B666': '#B97F1E', // Gold -> Dark Gold
    '#52A560': '#2F6B3C', // Green -> Dark Green
    '#6B9BD1': '#3B6BA5', // Blue -> Dark Blue
    '#8B7AA8': '#6B5D8A', // Purple -> Dark Purple
    '#E8A93A': '#B97F1E', // Orange -> Dark Orange
  };

  return colorMap[baseColor] || baseColor;
}

/**
 * Format duration for display (hours to human-readable)
 */
export function formatDuration(hours: number): string {
  if (hours === 0) return '0h';
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours < 8) return `${hours}h`;

  const days = Math.floor(hours / 8);
  const remainingHours = hours % 8;

  if (remainingHours === 0) {
    return `${days}d`;
  }

  return `${days}d ${remainingHours}h`;
}
