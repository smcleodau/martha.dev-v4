/**
 * ActiveFilterChips Component - Display active filters as removable chips
 * Shows applied filters with the ability to remove individual filters or clear all
 */

import type { FilterState } from './FilterBar';

interface ActiveFilterChipsProps {
  filters: FilterState;
  onRemoveFilter: (filterType: keyof FilterState, value?: string) => void;
  onClearAll: () => void;
  initiativeNames?: Map<string, string>;
  teamNames?: Map<string, string>;
}

export function ActiveFilterChips({
  filters,
  onRemoveFilter,
  onClearAll,
  initiativeNames = new Map(),
  teamNames = new Map(),
}: ActiveFilterChipsProps) {
  const chips: Array<{ key: string; label: string; onRemove: () => void }> = [];

  // Add type chips
  filters.types.forEach((type) => {
    chips.push({
      key: `type-${type}`,
      label: `Type: ${type}`,
      onRemove: () => onRemoveFilter('types', type),
    });
  });

  // Add priority chips
  filters.priorities.forEach((priority) => {
    chips.push({
      key: `priority-${priority}`,
      label: `Priority: ${priority}`,
      onRemove: () => onRemoveFilter('priorities', priority),
    });
  });

  // Add initiative chips
  filters.initiatives.forEach((initiative) => {
    const name = initiativeNames.get(initiative) || initiative;
    chips.push({
      key: `initiative-${initiative}`,
      label: `Initiative: ${name}`,
      onRemove: () => onRemoveFilter('initiatives', initiative),
    });
  });

  // Add team chips
  filters.teams.forEach((team) => {
    const name = teamNames.get(team) || team;
    chips.push({
      key: `team-${team}`,
      label: `Team: ${name}`,
      onRemove: () => onRemoveFilter('teams', team),
    });
  });

  // Add assignee chips
  filters.assignees.forEach((assignee) => {
    chips.push({
      key: `assignee-${assignee}`,
      label: `Assignee: ${assignee}`,
      onRemove: () => onRemoveFilter('assignees', assignee),
    });
  });

  // Add label chips
  filters.labels.forEach((label) => {
    chips.push({
      key: `label-${label}`,
      label: `Label: ${label}`,
      onRemove: () => onRemoveFilter('labels', label),
    });
  });

  // Add quick filter chips
  if (filters.showMyIssues) {
    chips.push({
      key: 'my-issues',
      label: 'My Issues',
      onRemove: () => onRemoveFilter('showMyIssues'),
    });
  }

  if (filters.showUnassigned) {
    chips.push({
      key: 'unassigned',
      label: 'Unassigned',
      onRemove: () => onRemoveFilter('showUnassigned'),
    });
  }

  // Add date range chips
  if (filters.startDateRange) {
    const from = new Date(filters.startDateRange.from).toLocaleDateString();
    const to = new Date(filters.startDateRange.to).toLocaleDateString();
    chips.push({
      key: 'start-date-range',
      label: `Start: ${from} - ${to}`,
      onRemove: () => onRemoveFilter('startDateRange'),
    });
  }

  if (filters.dueDateRange) {
    const from = new Date(filters.dueDateRange.from).toLocaleDateString();
    const to = new Date(filters.dueDateRange.to).toLocaleDateString();
    chips.push({
      key: 'due-date-range',
      label: `Due: ${from} - ${to}`,
      onRemove: () => onRemoveFilter('dueDateRange'),
    });
  }

  if (chips.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs text-gray-500 font-medium">Active filters:</span>
      {chips.map((chip) => (
        <button
          key={chip.key}
          onClick={chip.onRemove}
          className="group px-3 py-1 bg-coral-100 text-coral-700 rounded-full text-xs font-medium flex items-center gap-1.5 hover:bg-coral-200 transition-colors"
        >
          <span>{chip.label}</span>
          <svg
            className="w-3.5 h-3.5 text-coral-600 group-hover:text-coral-800"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      ))}
      <button
        onClick={onClearAll}
        className="px-3 py-1 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
      >
        Clear all
      </button>
    </div>
  );
}
