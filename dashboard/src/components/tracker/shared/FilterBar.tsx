/**
 * Filter Bar Component - Search and filter controls for issues
 */

import { useState } from 'react';

export interface FilterState {
  searchText: string;
  types: string[];
  priorities: string[];
  assignees: string[];
  labels: string[];
  showMyIssues: boolean;
  showUnassigned: boolean;
}

interface FilterBarProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
}

export function FilterBar({ filters, onFiltersChange }: FilterBarProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

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
      assignees: [],
      labels: [],
      showMyIssues: false,
      showUnassigned: false
    });
  };

  const hasActiveFilters = filters.searchText ||
    filters.types.length > 0 ||
    filters.priorities.length > 0 ||
    filters.showMyIssues ||
    filters.showUnassigned;

  return (
    <div className="px-6 py-3 border-b border-gray-200 bg-white space-y-3">
      {/* Search and Quick Filters Row */}
      <div className="flex items-center gap-3">
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

        {/* Advanced Filter Toggle */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={`px-3 py-2 border rounded-lg text-sm font-medium transition-colors ${
            showAdvanced
              ? 'bg-blue-50 border-blue-300 text-blue-700'
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

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Quick Filter Chips */}
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

      {/* Advanced Filters Panel */}
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
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
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
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 capitalize">{priority}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
