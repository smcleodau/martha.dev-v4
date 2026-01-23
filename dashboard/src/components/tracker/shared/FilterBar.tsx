/**
 * Filter Bar Component - Search and filter controls for issues
 * Responsive: Full layout on desktop, stacked on tablet, modal on mobile
 */

import { useState, useEffect } from 'react';
import { InitiativeFilter } from './InitiativeFilter';
import { TeamFilter } from './TeamFilter';
import { ActiveFilterChips } from './ActiveFilterChips';
import { AdvancedFiltersPanel } from './AdvancedFiltersPanel';
import { useIsMobile } from '../../../hooks/useMediaQuery';

export interface FilterState {
  searchText: string;
  types: string[];
  priorities: string[];
  initiatives: string[];
  teams: string[];
  assignees: string[];
  labels: string[];
  showMyIssues: boolean;
  showUnassigned: boolean;
  startDateRange?: { from: Date; to: Date };
  dueDateRange?: { from: Date; to: Date };
}

interface FilterBarProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  worktreeId?: string;
}

export function FilterBar({ filters, onFiltersChange, worktreeId }: FilterBarProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [showMobileModal, setShowMobileModal] = useState(false);
  const [initiativeNames, setInitiativeNames] = useState<Map<string, string>>(new Map());
  const [teamNames, setTeamNames] = useState<Map<string, string>>(new Map());
  const isMobile = useIsMobile();

  // Load initiative and team names for display in chips
  useEffect(() => {
    if (worktreeId) {
      loadFilterMetadata();
    }
  }, [worktreeId]);

  const loadFilterMetadata = async () => {
    if (!worktreeId) return;

    try {
      // Load initiatives
      const initiativesResponse = await fetch(
        `/api/tracker/worktrees/${worktreeId}/initiatives`,
        { credentials: 'include' }
      );
      if (initiativesResponse.ok) {
        const data = await initiativesResponse.json();
        const names = new Map<string, string>(
          (data.initiatives || []).map((i: any) => [i.id as string, i.name as string])
        );
        setInitiativeNames(names);
      }

      // Load teams
      const teamsResponse = await fetch(
        `/api/tracker/worktrees/${worktreeId}/teams`,
        { credentials: 'include' }
      );
      if (teamsResponse.ok) {
        const data = await teamsResponse.json();
        const names = new Map<string, string>(
          (data.teams || []).map((t: any) => [t.id as string, t.name as string])
        );
        setTeamNames(names);
      }
    } catch (error) {
      console.error('Error loading filter metadata:', error);
    }
  };

  const handleSearchChange = (searchText: string) => {
    onFiltersChange({ ...filters, searchText });
  };

  const toggleQuickFilter = (filter: 'myIssues' | 'unassigned') => {
    if (filter === 'myIssues') {
      onFiltersChange({ ...filters, showMyIssues: !filters.showMyIssues, showUnassigned: false });
    } else {
      onFiltersChange({ ...filters, showUnassigned: !filters.showUnassigned, showMyIssues: false });
    }
  };

  const toggleTypeFilter = (type: string) => {
    const types = filters.types.includes(type)
      ? filters.types.filter(t => t !== type)
      : [...filters.types, type];
    onFiltersChange({ ...filters, types });
  };

  const togglePriorityFilter = (priority: string) => {
    const priorities = filters.priorities.includes(priority)
      ? filters.priorities.filter(p => p !== priority)
      : [...filters.priorities, priority];
    onFiltersChange({ ...filters, priorities });
  };

  const clearFilters = () => {
    onFiltersChange({
      searchText: '',
      types: [],
      priorities: [],
      initiatives: [],
      teams: [],
      assignees: [],
      labels: [],
      showMyIssues: false,
      showUnassigned: false,
      startDateRange: undefined,
      dueDateRange: undefined,
    });
    setShowAdvanced(false);
    setShowMoreFilters(false);
  };

  const removeFilter = (filterType: keyof FilterState, value?: string) => {
    const newFilters = { ...filters };

    if (filterType === 'showMyIssues' || filterType === 'showUnassigned') {
      newFilters[filterType] = false;
    } else if (filterType === 'startDateRange' || filterType === 'dueDateRange') {
      newFilters[filterType] = undefined;
    } else if (value && Array.isArray(newFilters[filterType])) {
      (newFilters[filterType] as string[]) = (newFilters[filterType] as string[]).filter(
        (v) => v !== value
      );
    }

    onFiltersChange(newFilters);
  };

  const hasActiveFilters =
    filters.searchText ||
    filters.types.length > 0 ||
    filters.priorities.length > 0 ||
    filters.initiatives.length > 0 ||
    filters.teams.length > 0 ||
    filters.assignees.length > 0 ||
    filters.labels.length > 0 ||
    filters.showMyIssues ||
    filters.showUnassigned ||
    filters.startDateRange ||
    filters.dueDateRange;

  // Mobile modal filter component
  const renderMobileModal = () => (
    <>
      {/* Backdrop */}
      {showMobileModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50"
          onClick={() => setShowMobileModal(false)}
          aria-hidden="true"
        />
      )}

      {/* Full-screen modal */}
      <div
        className={`fixed inset-0 z-50 bg-white transition-transform duration-300 ease-in-out ${
          showMobileModal ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        {/* Modal header */}
        <div
          className="flex items-center justify-between px-4 py-4 border-b"
          style={{ borderBottomColor: '#E8E0D5' }}
        >
          <h2 className="text-lg font-semibold" style={{ color: '#2F241B' }}>
            Filters
          </h2>
          <button
            onClick={() => setShowMobileModal(false)}
            className="p-2 rounded-lg transition-colors touch-manipulation"
            style={{ minWidth: '44px', minHeight: '44px' }}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal content */}
        <div className="overflow-y-auto p-4 space-y-4" style={{ height: 'calc(100vh - 140px)' }}>
          {/* Search */}
          <div>
            <label className="text-sm font-semibold block mb-2" style={{ color: '#6B5D52' }}>
              Search
            </label>
            <input
              type="text"
              value={filters.searchText}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search issues..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
              style={{ minHeight: '44px' }}
            />
          </div>

          {/* Type Filter */}
          <div>
            <label className="text-sm font-semibold block mb-2" style={{ color: '#6B5D52' }}>
              Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              {['epic', 'story', 'task', 'bug'].map((type) => (
                <button
                  key={type}
                  onClick={() => toggleTypeFilter(type)}
                  className={`px-4 py-3 border rounded-lg text-sm font-medium transition-colors touch-manipulation ${
                    filters.types.includes(type)
                      ? 'bg-coral-50 border-coral-300 text-coral-700'
                      : 'bg-white border-gray-300 text-gray-700'
                  }`}
                  style={{ minHeight: '44px' }}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Priority Filter */}
          <div>
            <label className="text-sm font-semibold block mb-2" style={{ color: '#6B5D52' }}>
              Priority
            </label>
            <div className="grid grid-cols-2 gap-2">
              {['critical', 'high', 'medium', 'low'].map((priority) => (
                <button
                  key={priority}
                  onClick={() => togglePriorityFilter(priority)}
                  className={`px-4 py-3 border rounded-lg text-sm font-medium transition-colors touch-manipulation ${
                    filters.priorities.includes(priority)
                      ? 'bg-coral-50 border-coral-300 text-coral-700'
                      : 'bg-white border-gray-300 text-gray-700'
                  }`}
                  style={{ minHeight: '44px' }}
                >
                  {priority.charAt(0).toUpperCase() + priority.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Filters */}
          <div>
            <label className="text-sm font-semibold block mb-2" style={{ color: '#6B5D52' }}>
              Quick Filters
            </label>
            <div className="space-y-2">
              <button
                onClick={() => toggleQuickFilter('myIssues')}
                className={`w-full px-4 py-3 border rounded-lg text-sm font-medium transition-colors touch-manipulation ${
                  filters.showMyIssues
                    ? 'bg-blue-50 border-blue-300 text-blue-700'
                    : 'bg-white border-gray-300 text-gray-700'
                }`}
                style={{ minHeight: '44px' }}
              >
                My Issues
              </button>
              <button
                onClick={() => toggleQuickFilter('unassigned')}
                className={`w-full px-4 py-3 border rounded-lg text-sm font-medium transition-colors touch-manipulation ${
                  filters.showUnassigned
                    ? 'bg-blue-50 border-blue-300 text-blue-700'
                    : 'bg-white border-gray-300 text-gray-700'
                }`}
                style={{ minHeight: '44px' }}
              >
                Unassigned
              </button>
            </div>
          </div>
        </div>

        {/* Modal footer */}
        <div
          className="absolute bottom-0 left-0 right-0 px-4 py-4 border-t bg-white flex gap-3"
          style={{ borderTopColor: '#E8E0D5' }}
        >
          <button
            onClick={clearFilters}
            className="flex-1 px-4 py-3 border rounded-lg text-sm font-medium transition-colors touch-manipulation"
            style={{
              borderColor: '#E8E0D5',
              color: '#6B5D52',
              minHeight: '44px'
            }}
          >
            Clear All
          </button>
          <button
            onClick={() => setShowMobileModal(false)}
            className="flex-1 px-4 py-3 rounded-lg text-white text-sm font-medium transition-colors touch-manipulation"
            style={{
              backgroundColor: '#D97F6F',
              minHeight: '44px'
            }}
          >
            Apply Filters
          </button>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile: Compact filter bar with modal trigger */}
      {isMobile ? (
        <>
          <div className="px-4 py-3 border-b border-gray-200 bg-white space-y-3">
            <div className="flex items-center gap-2">
              {/* Search Input */}
              <div className="flex-1 relative">
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <input
                  type="text"
                  value={filters.searchText}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Search..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  style={{ minHeight: '44px' }}
                />
              </div>

              {/* Filter Button */}
              <button
                onClick={() => setShowMobileModal(true)}
                className="px-4 py-2 border rounded-lg text-sm font-medium transition-colors bg-white border-gray-300 text-gray-700 touch-manipulation relative"
                style={{ minWidth: '44px', minHeight: '44px' }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                  />
                </svg>
                {hasActiveFilters && (
                  <span
                    className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs text-white font-semibold"
                    style={{ backgroundColor: '#D97F6F' }}
                  >
                    {filters.types.length + filters.priorities.length + (filters.showMyIssues ? 1 : 0) + (filters.showUnassigned ? 1 : 0)}
                  </span>
                )}
              </button>
            </div>

            {/* Active Filter Chips */}
            {hasActiveFilters && (
              <ActiveFilterChips
                filters={filters}
                onRemoveFilter={removeFilter}
                onClearAll={clearFilters}
                initiativeNames={initiativeNames}
                teamNames={teamNames}
              />
            )}
          </div>
          {renderMobileModal()}
        </>
      ) : (
        /* Desktop/Tablet: Full filter bar */
        <div className="px-4 md:px-6 py-3 border-b border-gray-200 bg-white space-y-3">
          {/* Search and Filter Controls Row */}
          <div className="flex flex-wrap md:flex-nowrap items-center gap-2 md:gap-3">
            {/* Search Input */}
            <div className="flex-1 min-w-full md:min-w-0 relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                value={filters.searchText}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search issues... (type:epic, priority:high, status:todo)"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
              {filters.searchText && (
                <button
                  onClick={() => handleSearchChange('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Initiative Filter */}
            {worktreeId && (
              <InitiativeFilter
                worktreeId={worktreeId}
                selectedInitiatives={filters.initiatives}
                onSelectionChange={(initiatives) =>
                  onFiltersChange({ ...filters, initiatives })
                }
              />
            )}

            {/* Team Filter */}
            {worktreeId && (
              <TeamFilter
                worktreeId={worktreeId}
                selectedTeams={filters.teams}
                onSelectionChange={(teams) =>
                  onFiltersChange({ ...filters, teams })
                }
              />
            )}

            {/* Advanced Filter Toggle */}
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className={`px-3 py-2 border rounded-lg text-sm font-medium transition-colors ${
                showAdvanced
                  ? 'bg-coral-50 border-coral-300 text-coral-700'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                />
              </svg>
              Filters
            </button>

            {/* More Filters Toggle */}
            <button
              onClick={() => setShowMoreFilters(!showMoreFilters)}
              className={`px-3 py-2 border rounded-lg text-sm font-medium transition-colors ${
                showMoreFilters
                  ? 'bg-coral-50 border-coral-300 text-coral-700'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              More Filters
            </button>

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900"
              >
                Clear all
              </button>
            )}
          </div>

      {/* Active Filter Chips */}
      {hasActiveFilters && (
        <ActiveFilterChips
          filters={filters}
          onRemoveFilter={removeFilter}
          onClearAll={clearFilters}
          initiativeNames={initiativeNames}
          teamNames={teamNames}
        />
      )}

      {/* Quick Filter Chips */}
      {!hasActiveFilters && (
        <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-gray-500 font-medium">Quick filters:</span>

        <button
          onClick={() => toggleQuickFilter('myIssues')}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
            filters.showMyIssues
              ? 'bg-blue-100 text-blue-700 border border-blue-300'
              : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
          }`}
        >
          My Issues
        </button>

        <button
          onClick={() => toggleQuickFilter('unassigned')}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
            filters.showUnassigned
              ? 'bg-blue-100 text-blue-700 border border-blue-300'
              : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
          }`}
        >
          Unassigned
        </button>

          <button
            onClick={() => togglePriorityFilter('high')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              filters.priorities.includes('high')
                ? 'bg-orange-100 text-orange-700 border border-orange-300'
                : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
            }`}
          >
            High Priority
          </button>

          <button
            onClick={() => togglePriorityFilter('critical')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              filters.priorities.includes('critical')
                ? 'bg-red-100 text-red-700 border border-red-300'
                : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
            }`}
          >
            Critical
          </button>

          <button
            onClick={() => toggleTypeFilter('bug')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              filters.types.includes('bug')
                ? 'bg-red-100 text-red-700 border border-red-300'
                : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
            }`}
          >
            Bugs
          </button>

          <button
            onClick={() => toggleTypeFilter('epic')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              filters.types.includes('epic')
                ? 'bg-purple-100 text-purple-700 border border-purple-300'
                : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
            }`}
          >
            Epics
          </button>
        </div>
      )}

      {/* Standard Filters Panel (Type & Priority) */}
      {showAdvanced && (
        <div className="p-4 border border-gray-200 rounded-lg bg-gray-50 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Type Filter */}
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-2">Type</label>
              <div className="space-y-2">
                {['epic', 'story', 'task', 'bug'].map((type) => (
                  <label key={type} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.types.includes(type)}
                      onChange={() => toggleTypeFilter(type)}
                      className="rounded border-gray-300 text-coral-600 focus:ring-coral-500"
                    />
                    <span className="text-sm text-gray-700 capitalize">{type}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Priority Filter */}
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-2">Priority</label>
              <div className="space-y-2">
                {['critical', 'high', 'medium', 'low'].map((priority) => (
                  <label key={priority} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.priorities.includes(priority)}
                      onChange={() => togglePriorityFilter(priority)}
                      className="rounded border-gray-300 text-coral-600 focus:ring-coral-500"
                    />
                    <span className="text-sm text-gray-700 capitalize">{priority}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

          {/* Advanced Filters Panel (Date Ranges & Custom Fields) */}
          {showMoreFilters && (
            <AdvancedFiltersPanel
              filters={filters}
              onFiltersChange={onFiltersChange}
            />
          )}
        </div>
      )}
    </>
  );
}
