/**
 * Gantt Controls Component
 * View-specific filter controls for Gantt view
 * Includes: Show Critical Path toggle, Group by Epic toggle, Resource filter, Expand/Collapse All
 */

import { type Issue } from '../../../api/tracker';
import { ResourceFilterControls } from './ResourceFilterControls';

export interface GanttControlsProps {
  issues: Issue[];
  showCriticalPath: boolean;
  onShowCriticalPathChange: (show: boolean) => void;
  groupByEpic: boolean;
  onGroupByEpicChange: (group: boolean) => void;
  selectedAssignee: string | null;
  onSelectAssignee: (userId: string | null) => void;
  allExpanded: boolean;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  className?: string;
}

export function GanttControls({
  issues,
  showCriticalPath,
  onShowCriticalPathChange,
  groupByEpic,
  onGroupByEpicChange,
  selectedAssignee,
  onSelectAssignee,
  allExpanded,
  onExpandAll,
  onCollapseAll,
  className = '',
}: GanttControlsProps) {
  return (
    <div className={`gantt-controls flex items-center gap-3 ${className}`}>
      {/* Show Critical Path Toggle */}
      <button
        onClick={() => onShowCriticalPathChange(!showCriticalPath)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
          showCriticalPath ? '' : 'hover:bg-opacity-50'
        }`}
        style={{
          backgroundColor: showCriticalPath ? '#FDF5F3' : '#FDFBF8',
          borderColor: showCriticalPath ? '#D97F6F' : '#E8E0D5',
          color: '#2F241B',
        }}
      >
        <div
          className={`w-4 h-4 rounded border flex items-center justify-center ${
            showCriticalPath ? 'border-transparent' : ''
          }`}
          style={{
            backgroundColor: showCriticalPath ? '#D97F6F' : 'transparent',
            borderColor: showCriticalPath ? '#D97F6F' : '#A39686',
          }}
        >
          {showCriticalPath && (
            <svg className="w-3 h-3" style={{ color: '#FFFFFF' }} fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </div>
        <span className="text-sm font-medium">Critical Path</span>
      </button>

      {/* Group by Epic Toggle */}
      <button
        onClick={() => onGroupByEpicChange(!groupByEpic)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
          groupByEpic ? '' : 'hover:bg-opacity-50'
        }`}
        style={{
          backgroundColor: groupByEpic ? '#F3F1F7' : '#FDFBF8',
          borderColor: groupByEpic ? '#8B7AA8' : '#E8E0D5',
          color: '#2F241B',
        }}
      >
        <div
          className={`w-4 h-4 rounded border flex items-center justify-center ${
            groupByEpic ? 'border-transparent' : ''
          }`}
          style={{
            backgroundColor: groupByEpic ? '#8B7AA8' : 'transparent',
            borderColor: groupByEpic ? '#8B7AA8' : '#A39686',
          }}
        >
          {groupByEpic && (
            <svg className="w-3 h-3" style={{ color: '#FFFFFF' }} fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </div>
        <span className="text-sm font-medium">Group by Epic</span>
      </button>

      {/* Divider */}
      <div className="h-6 w-px" style={{ backgroundColor: '#E8E0D5' }} />

      {/* Resource Filter */}
      <ResourceFilterControls
        issues={issues}
        selectedAssignee={selectedAssignee}
        onSelectAssignee={onSelectAssignee}
      />

      {/* Divider */}
      <div className="h-6 w-px" style={{ backgroundColor: '#E8E0D5' }} />

      {/* Expand/Collapse All Button */}
      <button
        onClick={allExpanded ? onCollapseAll : onExpandAll}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors hover:bg-opacity-50"
        style={{
          backgroundColor: '#FDFBF8',
          borderColor: '#E8E0D5',
          color: '#2F241B',
        }}
      >
        {allExpanded ? (
          <>
            <svg
              className="w-4 h-4"
              style={{ color: '#6B5D52' }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
            <span className="text-sm font-medium">Collapse All</span>
          </>
        ) : (
          <>
            <svg
              className="w-4 h-4"
              style={{ color: '#6B5D52' }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
            <span className="text-sm font-medium">Expand All</span>
          </>
        )}
      </button>
    </div>
  );
}
