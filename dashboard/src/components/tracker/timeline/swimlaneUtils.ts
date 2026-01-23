/**
 * Swimlane Utility Functions
 * Helper functions for grouping and sorting issues in timeline swimlanes
 */

import { type Issue } from '../../../api/tracker';

export type SwimlaneMode = 'none' | 'assignee' | 'type' | 'priority' | 'status';

export interface SwimlaneGroup {
  id: string;
  name: string;
  issues: Issue[];
  sortOrder: number;
}

/**
 * Group issues by swimlane mode
 */
export function groupIssuesForSwimlanes(
  issues: Issue[],
  mode: SwimlaneMode
): SwimlaneGroup[] {
  if (mode === 'none') {
    return [{
      id: 'all',
      name: 'All Issues',
      issues,
      sortOrder: 0
    }];
  }

  const groups: Record<string, Issue[]> = {};

  // Group issues based on mode
  issues.forEach(issue => {
    let key: string;

    switch (mode) {
      case 'assignee':
        key = issue.assignee?.name || 'Unassigned';
        break;
      case 'type':
        key = issue.type.charAt(0).toUpperCase() + issue.type.slice(1);
        break;
      case 'priority':
        key = issue.priority.charAt(0).toUpperCase() + issue.priority.slice(1);
        break;
      case 'status':
        key = issue.status;
        break;
      default:
        key = 'Other';
    }

    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(issue);
  });

  // Convert to array and add sort order
  const swimlanes: SwimlaneGroup[] = Object.entries(groups).map(([name, issues]) => ({
    id: `${mode}-${name.toLowerCase().replace(/\s+/g, '-')}`,
    name,
    issues,
    sortOrder: getSortOrder(mode, name)
  }));

  // Sort swimlanes
  return swimlanes.sort((a, b) => a.sortOrder - b.sortOrder);
}

/**
 * Get sort order for a swimlane group
 */
function getSortOrder(mode: SwimlaneMode, name: string): number {
  const lowerName = name.toLowerCase();

  switch (mode) {
    case 'priority':
      // Critical → High → Medium → Low
      if (lowerName === 'critical') return 0;
      if (lowerName === 'high') return 1;
      if (lowerName === 'medium') return 2;
      if (lowerName === 'low') return 3;
      return 4;

    case 'status':
      // Todo → In Progress → Review → Done
      if (lowerName === 'todo' || lowerName === 'to do') return 0;
      if (lowerName === 'in progress' || lowerName === 'in_progress') return 1;
      if (lowerName === 'review' || lowerName === 'in review') return 2;
      if (lowerName === 'done' || lowerName === 'completed' || lowerName === 'closed') return 3;
      return 4;

    case 'type':
      // Epic → Story → Task → Bug
      if (lowerName === 'epic') return 0;
      if (lowerName === 'story') return 1;
      if (lowerName === 'task') return 2;
      if (lowerName === 'bug') return 3;
      return 4;

    case 'assignee':
      // Alphabetical, with Unassigned at bottom
      if (lowerName === 'unassigned') return 1000;
      return name.charCodeAt(0);

    default:
      return 0;
  }
}

/**
 * Convert issues to calendar events
 */
export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: Issue;
  resourceId?: string;
  allDay?: boolean;
}

export function issuesToCalendarEvents(
  issues: Issue[],
  swimlaneMode: SwimlaneMode = 'none'
): CalendarEvent[] {
  return issues
    .filter(issue => issue.start_date || issue.due_date)
    .map(issue => {
      // Default to today if start_date is missing
      const startDate = issue.start_date
        ? new Date(issue.start_date)
        : new Date();

      // Default to start_date if due_date is missing
      const endDate = issue.due_date
        ? new Date(issue.due_date)
        : startDate;

      // Calculate resource ID based on swimlane mode
      let resourceId: string | undefined;
      if (swimlaneMode !== 'none') {
        switch (swimlaneMode) {
          case 'assignee':
            resourceId = `assignee-${(issue.assignee?.name || 'unassigned').toLowerCase().replace(/\s+/g, '-')}`;
            break;
          case 'type':
            resourceId = `type-${issue.type}`;
            break;
          case 'priority':
            resourceId = `priority-${issue.priority}`;
            break;
          case 'status':
            resourceId = `status-${issue.status.toLowerCase().replace(/\s+/g, '-')}`;
            break;
        }
      }

      return {
        id: issue.id,
        title: `${issue.id}: ${issue.title}`,
        start: startDate,
        end: endDate,
        resource: issue,
        resourceId,
        allDay: true // Timeline events are typically all-day
      };
    });
}

/**
 * Convert swimlane groups to React Big Calendar resources
 */
export interface CalendarResource {
  resourceId: string;
  resourceTitle: string;
  issues: Issue[];
}

export function swimlanesToResources(swimlanes: SwimlaneGroup[]): CalendarResource[] {
  return swimlanes.map(swimlane => ({
    resourceId: swimlane.id,
    resourceTitle: swimlane.name,
    issues: swimlane.issues
  }));
}

/**
 * Get color for issue based on type
 */
export function getIssueColor(issue: Issue): { bg: string; border: string; text: string } {
  const colors = {
    epic: { bg: '#F3F1F7', border: '#8B7AA8', text: '#2F241B' },
    story: { bg: '#FDF5F3', border: '#D97F6F', text: '#2F241B' },
    task: { bg: '#F5F4F2', border: '#A39686', text: '#2F241B' },
    bug: { bg: '#FCEEEB', border: '#C0392B', text: '#2F241B' }
  };

  return colors[issue.type] || colors.task;
}

/**
 * Filter issues with valid dates for timeline display
 */
export function filterIssuesWithDates(issues: Issue[]): Issue[] {
  return issues.filter(issue => issue.start_date || issue.due_date);
}

/**
 * Calculate statistics for a group of issues
 */
export interface GroupStatistics {
  totalIssues: number;
  totalStoryPoints: number;
  completedCount: number;
  completionPercentage: number;
  criticalCount: number;
  highCount: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
}

export function calculateGroupStatistics(issues: Issue[]): GroupStatistics {
  const totalIssues = issues.length;
  const totalStoryPoints = issues.reduce((sum, issue) => sum + (issue.story_points || 0), 0);

  const completedStatuses = ['done', 'closed', 'completed'];
  const completedCount = issues.filter(issue =>
    completedStatuses.includes(issue.status.toLowerCase())
  ).length;

  const completionPercentage = totalIssues > 0
    ? Math.round((completedCount / totalIssues) * 100)
    : 0;

  const criticalCount = issues.filter(issue => issue.priority === 'critical').length;
  const highCount = issues.filter(issue => issue.priority === 'high').length;

  // Count by status
  const byStatus: Record<string, number> = {};
  issues.forEach(issue => {
    byStatus[issue.status] = (byStatus[issue.status] || 0) + 1;
  });

  // Count by type
  const byType: Record<string, number> = {};
  issues.forEach(issue => {
    byType[issue.type] = (byType[issue.type] || 0) + 1;
  });

  return {
    totalIssues,
    totalStoryPoints,
    completedCount,
    completionPercentage,
    criticalCount,
    highCount,
    byStatus,
    byType
  };
}
