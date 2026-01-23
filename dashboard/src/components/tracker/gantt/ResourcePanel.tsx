/**
 * Resource Panel Component
 * Side panel showing team resource allocation with utilization metrics
 */

import { useState } from 'react';
import { type Issue } from '../../../api/tracker';
import { useResourceAllocation } from './hooks/useResourceAllocation';
import { ResourceAllocationBar } from './ResourceAllocationBar';
import { generateAvatarGradient } from '../shared/utils';

interface ResourcePanelProps {
  issues: Issue[];
  selectedAssignee: string | null;
  onSelectAssignee: (userId: string | null) => void;
  availableHoursPerWeek?: number;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function ResourcePanel({
  issues,
  selectedAssignee,
  onSelectAssignee,
  availableHoursPerWeek = 40,
  isCollapsed = false,
  onToggleCollapse,
}: ResourcePanelProps) {
  const { allocations, metrics } = useResourceAllocation(issues, availableHoursPerWeek);

  if (isCollapsed) {
    return (
      <div
        className="resource-panel-collapsed h-full flex items-center justify-center p-2"
        style={{
          width: '48px',
          backgroundColor: '#FDFBF9',
          borderLeftWidth: '1px',
          borderLeftStyle: 'solid',
          borderLeftColor: '#E8E0D5',
        }}
      >
        <button
          onClick={onToggleCollapse}
          className="p-2 rounded-lg hover:bg-white transition-colors"
          style={{ color: '#6B5D52' }}
          title="Show resource panel"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div
      className="resource-panel h-full flex flex-col"
      style={{
        width: '300px',
        backgroundColor: '#FDFBF9',
        borderLeftWidth: '1px',
        borderLeftStyle: 'solid',
        borderLeftColor: '#E8E0D5',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{
          borderBottomWidth: '1px',
          borderBottomStyle: 'solid',
          borderBottomColor: '#E8E0D5',
        }}
      >
        <div>
          <h3 className="text-sm font-semibold" style={{ color: '#2F241B' }}>
            Team Resources
          </h3>
          <p className="text-xs" style={{ color: '#A39686' }}>
            {metrics.totalTeamMembers} team {metrics.totalTeamMembers === 1 ? 'member' : 'members'}
          </p>
        </div>

        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="p-1.5 rounded-md hover:bg-white transition-colors"
            style={{ color: '#6B5D52' }}
            title="Hide resource panel"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="px-4 py-3 space-y-2">
        {/* Average Utilization */}
        <div
          className="p-3 rounded-lg"
          style={{
            backgroundColor: '#F5F4F2',
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: '#E8E0D5',
          }}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium" style={{ color: '#6B5D52' }}>
              Average Utilization
            </span>
            <span className="text-sm font-bold" style={{ color: '#2F241B' }}>
              {Math.round(metrics.averageUtilization)}%
            </span>
          </div>
          <div
            className="h-1.5 rounded-full overflow-hidden"
            style={{ backgroundColor: '#E8E0D5' }}
          >
            <div
              className="h-full transition-all duration-300"
              style={{
                width: `${Math.min(metrics.averageUtilization, 100)}%`,
                backgroundColor: metrics.averageUtilization > 100 ? '#E8A93A' : '#52A560',
              }}
            />
          </div>
        </div>

        {/* Over-allocated warning */}
        {metrics.overAllocatedCount > 0 && (
          <div
            className="p-3 rounded-lg flex items-start gap-2"
            style={{
              backgroundColor: '#FCEEEB',
              borderWidth: '1px',
              borderStyle: 'solid',
              borderColor: '#F5B1A4',
            }}
          >
            <svg
              className="w-4 h-4 flex-shrink-0 mt-0.5"
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
            <div className="flex-1">
              <div className="text-xs font-semibold" style={{ color: '#C0392B' }}>
                {metrics.overAllocatedCount} Over-allocated
              </div>
              <div className="text-xs mt-0.5" style={{ color: '#8B2A20' }}>
                Consider reassigning tasks to balance workload
              </div>
            </div>
          </div>
        )}

        {/* Capacity remaining */}
        <div className="flex items-center justify-between text-xs" style={{ color: '#6B5D52' }}>
          <span>Total Capacity</span>
          <span className="font-semibold">
            {Math.round(metrics.totalAllocatedHours)}h / {metrics.totalAvailableHours}h
          </span>
        </div>
      </div>

      {/* Team Members List */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <div className="space-y-2">
          {allocations.map(allocation => (
            <div
              key={allocation.userId}
              className={`group p-3 rounded-lg transition-all cursor-pointer ${
                selectedAssignee === allocation.userId ? 'ring-2' : ''
              }`}
              style={{
                backgroundColor: selectedAssignee === allocation.userId ? '#F5F4F2' : '#FFFFFF',
                borderWidth: '1px',
                borderStyle: 'solid',
                borderColor: selectedAssignee === allocation.userId ? '#D97F6F' : '#E8E0D5',
                ringColor: '#D97F6F',
              }}
              onClick={() => {
                if (selectedAssignee === allocation.userId) {
                  onSelectAssignee(null);
                } else {
                  onSelectAssignee(allocation.userId);
                }
              }}
            >
              {/* Team Member Header */}
              <div className="flex items-center gap-3 mb-3">
                {/* Avatar */}
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold text-white shadow-sm flex-shrink-0"
                  style={{
                    background: allocation.userId === 'unassigned'
                      ? '#E8E0D5'
                      : generateAvatarGradient(allocation.userName),
                  }}
                >
                  {allocation.userId === 'unassigned' ? (
                    <svg className="w-5 h-5" style={{ color: '#A39686' }} fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"/>
                    </svg>
                  ) : (
                    allocation.userName.charAt(0).toUpperCase()
                  )}
                </div>

                {/* Name and task count */}
                <div className="flex-1 min-w-0">
                  <div
                    className="text-sm font-semibold truncate"
                    style={{ color: '#2F241B' }}
                  >
                    {allocation.userName}
                  </div>
                  <div className="text-xs" style={{ color: '#A39686' }}>
                    {allocation.taskCount} {allocation.taskCount === 1 ? 'task' : 'tasks'}
                  </div>
                </div>

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
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </div>

              {/* Allocation Bar */}
              <ResourceAllocationBar
                allocation={allocation}
                showDetails={true}
              />
            </div>
          ))}

          {allocations.length === 0 && (
            <div className="text-center py-8" style={{ color: '#A39686' }}>
              <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/>
              </svg>
              <p className="text-sm">No team members assigned</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer - Filter hint */}
      {selectedAssignee && (
        <div
          className="px-4 py-3 flex items-center justify-between"
          style={{
            backgroundColor: '#F5F4F2',
            borderTopWidth: '1px',
            borderTopStyle: 'solid',
            borderTopColor: '#E8E0D5',
          }}
        >
          <span className="text-xs" style={{ color: '#6B5D52' }}>
            Filtering by assignee
          </span>
          <button
            onClick={() => onSelectAssignee(null)}
            className="text-xs font-medium px-2 py-1 rounded-md hover:bg-white transition-colors"
            style={{ color: '#D97F6F' }}
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
}
