/**
 * Issue Filtering Utilities
 * Memoized filtering functions for performance (MTH-052)
 */

import { type Issue } from '../api/tracker';
import { type FilterState } from '../components/tracker/shared/FilterBar';

/**
 * Filter issues based on filter state
 * This function is designed to be used with useMemo for performance
 */
export function filterIssues(
  allIssues: Issue[],
  filters: FilterState
): Issue[] {
  let filtered = [...allIssues];

  // Text search with debounced value
  if (filters.searchText) {
    const searchLower = filters.searchText.toLowerCase();
    filtered = filtered.filter((issue) => {
      // Search in title and description
      const matchesText =
        issue.title.toLowerCase().includes(searchLower) ||
        issue.description?.toLowerCase().includes(searchLower);

      // Check for special syntax (type:, priority:, status:)
      if (searchLower.includes(':')) {
        const [key, value] = searchLower.split(':', 2);
        if (key === 'type' && value) return issue.type === value.trim();
        if (key === 'priority' && value) return issue.priority === value.trim();
        if (key === 'status' && value) return issue.status === value.trim();
      }

      return matchesText;
    });
  }

  // Type filter
  if (filters.types.length > 0) {
    filtered = filtered.filter((issue) => filters.types.includes(issue.type));
  }

  // Priority filter
  if (filters.priorities.length > 0) {
    filtered = filtered.filter((issue) =>
      filters.priorities.includes(issue.priority)
    );
  }

  // My issues filter
  if (filters.showMyIssues) {
    filtered = filtered.filter((issue) => issue.assignee !== null);
  }

  // Unassigned filter
  if (filters.showUnassigned) {
    filtered = filtered.filter((issue) => issue.assignee === null);
  }

  // Initiative filter
  if (filters.initiatives.length > 0) {
    filtered = filtered.filter(
      (issue) =>
        issue.initiative_id && filters.initiatives.includes(issue.initiative_id)
    );
  }

  // Team filter
  if (filters.teams.length > 0) {
    filtered = filtered.filter(
      (issue) =>
        issue.team_ids &&
        issue.team_ids.some((teamId: string) => filters.teams.includes(teamId))
    );
  }

  // Assignee filter
  if (filters.assignees.length > 0) {
    filtered = filtered.filter(
      (issue) => issue.assignee && filters.assignees.includes(issue.assignee.id)
    );
  }

  // Label filter
  if (filters.labels.length > 0) {
    filtered = filtered.filter((issue) =>
      issue.labels.some((label) => filters.labels.includes(label))
    );
  }

  // Date range filters
  if (filters.startDateRange) {
    const { from, to } = filters.startDateRange;
    filtered = filtered.filter((issue) => {
      if (!issue.start_date) return false;
      const startDate = new Date(issue.start_date);
      return startDate >= from && startDate <= to;
    });
  }

  if (filters.dueDateRange) {
    const { from, to } = filters.dueDateRange;
    filtered = filtered.filter((issue) => {
      if (!issue.due_date) return false;
      const dueDate = new Date(issue.due_date);
      return dueDate >= from && dueDate <= to;
    });
  }

  return filtered;
}

/**
 * Convert issues array to Record for backward compatibility
 */
export function issuesToRecord(issues: Issue[]): Record<string, Issue> {
  const record: Record<string, Issue> = {};
  issues.forEach((issue) => {
    record[issue.id] = issue;
  });
  return record;
}

/**
 * Calculate issue statistics
 * Memoized for performance
 */
export function calculateIssueStats(issues: Issue[]) {
  return {
    epics: issues.filter((i) => i.type === 'epic').length,
    stories: issues.filter((i) => i.type === 'story').length,
    tasks: issues.filter((i) => i.type === 'task').length,
    bugs: issues.filter((i) => i.type === 'bug').length,
    total: issues.length,
  };
}
