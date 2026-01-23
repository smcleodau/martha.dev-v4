/**
 * Resource Filter Controls Component
 * Dropdown to filter Gantt view by team member assignee
 */

import { useState, useRef, useEffect } from 'react';
import { type Issue } from '../../../api/tracker';
import { useResourceAllocation } from './hooks/useResourceAllocation';
import { generateAvatarGradient } from '../shared/utils';

interface ResourceFilterControlsProps {
  issues: Issue[];
  selectedAssignee: string | null;
  onSelectAssignee: (userId: string | null) => void;
}

export function ResourceFilterControls({
  issues,
  selectedAssignee,
  onSelectAssignee,
}: ResourceFilterControlsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { allocations } = useResourceAllocation(issues);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const selectedAllocation = allocations.find(a => a.userId === selectedAssignee);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Filter Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors"
        style={{
          backgroundColor: selectedAssignee ? '#F5F4F2' : '#FFFFFF',
          borderWidth: '1px',
          borderStyle: 'solid',
          borderColor: selectedAssignee ? '#D97F6F' : '#E8E0D5',
          color: '#2F241B',
        }}
      >
        {/* Icon */}
        <svg className="w-4 h-4" style={{ color: '#6B5D52' }} fill="currentColor" viewBox="0 0 20 20">
          <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/>
        </svg>

        {/* Label */}
        <span className="text-sm font-medium">
          {selectedAllocation ? selectedAllocation.userName : 'All Team Members'}
        </span>

        {/* Task count badge */}
        {selectedAllocation && (
          <span
            className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{
              backgroundColor: '#E8E0D5',
              color: '#6B5D52',
            }}
          >
            {selectedAllocation.taskCount}
          </span>
        )}

        {/* Over-allocation warning */}
        {selectedAllocation?.isOverAllocated && (
          <svg
            className="w-4 h-4"
            style={{ color: '#C0392B' }}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        )}

        {/* Dropdown arrow */}
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          style={{ color: '#A39686' }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="absolute top-full left-0 mt-2 w-72 rounded-lg shadow-lg z-50 overflow-hidden"
          style={{
            backgroundColor: '#FFFFFF',
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: '#E8E0D5',
          }}
        >
          {/* Header */}
          <div
            className="px-3 py-2"
            style={{
              backgroundColor: '#F5F4F2',
              borderBottomWidth: '1px',
              borderBottomStyle: 'solid',
              borderBottomColor: '#E8E0D5',
            }}
          >
            <div className="text-xs font-semibold" style={{ color: '#2F241B' }}>
              Filter by Assignee
            </div>
            <div className="text-xs" style={{ color: '#A39686' }}>
              {allocations.length} team {allocations.length === 1 ? 'member' : 'members'}
            </div>
          </div>

          {/* Options list */}
          <div className="max-h-80 overflow-y-auto">
            {/* All team members option */}
            <button
              onClick={() => {
                onSelectAssignee(null);
                setIsOpen(false);
              }}
              className={`w-full px-3 py-2.5 flex items-center gap-3 hover:bg-opacity-50 transition-colors ${
                !selectedAssignee ? 'bg-opacity-100' : ''
              }`}
              style={{
                backgroundColor: !selectedAssignee ? '#F5F4F2' : 'transparent',
              }}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: '#E8E0D5' }}
              >
                <svg className="w-4 h-4" style={{ color: '#6B5D52' }} fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/>
                </svg>
              </div>
              <div className="flex-1 text-left">
                <div className="text-sm font-medium" style={{ color: '#2F241B' }}>
                  All Team Members
                </div>
                <div className="text-xs" style={{ color: '#A39686' }}>
                  Show all tasks
                </div>
              </div>
              {!selectedAssignee && (
                <svg
                  className="w-5 h-5 flex-shrink-0"
                  style={{ color: '#D97F6F' }}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </button>

            {/* Divider */}
            <div
              className="h-px mx-3"
              style={{ backgroundColor: '#E8E0D5' }}
            />

            {/* Team member options */}
            {allocations.map(allocation => (
              <button
                key={allocation.userId}
                onClick={() => {
                  onSelectAssignee(allocation.userId);
                  setIsOpen(false);
                }}
                className={`w-full px-3 py-2.5 flex items-center gap-3 hover:bg-opacity-50 transition-colors ${
                  selectedAssignee === allocation.userId ? 'bg-opacity-100' : ''
                }`}
                style={{
                  backgroundColor: selectedAssignee === allocation.userId ? '#F5F4F2' : 'transparent',
                }}
              >
                {/* Avatar */}
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold text-white flex-shrink-0"
                  style={{
                    background: allocation.userId === 'unassigned'
                      ? '#E8E0D5'
                      : generateAvatarGradient(allocation.userName),
                  }}
                >
                  {allocation.userId === 'unassigned' ? (
                    <svg className="w-4 h-4" style={{ color: '#A39686' }} fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"/>
                    </svg>
                  ) : (
                    allocation.userName.charAt(0).toUpperCase()
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 text-left min-w-0">
                  <div className="text-sm font-medium truncate" style={{ color: '#2F241B' }}>
                    {allocation.userName}
                  </div>
                  <div className="text-xs flex items-center gap-2" style={{ color: '#A39686' }}>
                    <span>
                      {allocation.taskCount} {allocation.taskCount === 1 ? 'task' : 'tasks'}
                    </span>
                    <span>•</span>
                    <span className={allocation.isOverAllocated ? 'font-semibold' : ''} style={{
                      color: allocation.isOverAllocated ? '#C0392B' : '#A39686'
                    }}>
                      {Math.round(allocation.utilizationPercent)}%
                    </span>
                  </div>
                </div>

                {/* Warning icon */}
                {allocation.isOverAllocated && (
                  <svg
                    className="w-4 h-4 flex-shrink-0"
                    style={{ color: '#C0392B' }}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}

                {/* Selection indicator */}
                {selectedAssignee === allocation.userId && (
                  <svg
                    className="w-5 h-5 flex-shrink-0"
                    style={{ color: '#D97F6F' }}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </button>
            ))}

            {allocations.length === 0 && (
              <div className="px-3 py-8 text-center" style={{ color: '#A39686' }}>
                <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/>
                </svg>
                <p className="text-sm">No team members</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
