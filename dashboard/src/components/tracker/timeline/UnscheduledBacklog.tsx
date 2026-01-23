/**
 * UnscheduledBacklog Component
 * Vertical panel showing issues without due dates
 * Issues can be dragged from here to the calendar to schedule them
 */

import { useMemo } from 'react';
import { type Issue } from '../../../api/tracker';
import { BacklogIssueCard } from './BacklogIssueCard';

interface UnscheduledBacklogProps {
  issues: Record<string, Issue>;
  onDragStart: (issue: Issue, e: React.DragEvent) => void;
  onIssueClick?: (issueId: string) => void;
}

export function UnscheduledBacklog({
  issues,
  onDragStart,
  onIssueClick,
}: UnscheduledBacklogProps) {
  // Filter to only unscheduled issues (no due_date)
  const unscheduledIssues = useMemo(() => {
    return Object.values(issues).filter((issue) => !issue.due_date);
  }, [issues]);

  // Group by priority for better organization
  const issuesByPriority = useMemo(() => {
    const groups = {
      critical: [] as Issue[],
      high: [] as Issue[],
      medium: [] as Issue[],
      low: [] as Issue[],
    };

    unscheduledIssues.forEach((issue) => {
      if (issue.priority in groups) {
        groups[issue.priority as keyof typeof groups].push(issue);
      } else {
        groups.medium.push(issue);
      }
    });

    return groups;
  }, [unscheduledIssues]);

  const getPriorityLabel = (priority: string) => {
    return priority.charAt(0).toUpperCase() + priority.slice(1);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return '#DC2626';
      case 'high':
        return '#D97F6F';
      case 'medium':
        return '#E0B666';
      case 'low':
        return '#52A560';
      default:
        return '#A39686';
    }
  };

  return (
    <div
      className="h-full border-r flex flex-col"
      style={{
        width: '240px',
        backgroundColor: '#FDFCFA',
        borderRightColor: '#E8E0D5',
      }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 border-b"
        style={{
          backgroundColor: 'white',
          borderBottomColor: '#E8E0D5',
        }}
      >
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-semibold" style={{ color: '#2F241B' }}>
            Unscheduled
          </h3>
          <span
            className="px-2 py-0.5 rounded-full text-xs font-semibold"
            style={{
              backgroundColor: '#D97F6F',
              color: 'white',
            }}
          >
            {unscheduledIssues.length}
          </span>
        </div>
        <p className="text-xs" style={{ color: '#6B5D52' }}>
          Drag issues to calendar to schedule
        </p>
      </div>

      {/* Issues List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {unscheduledIssues.length === 0 ? (
          <div className="text-center py-8">
            <svg
              className="w-12 h-12 mx-auto mb-3"
              style={{ color: '#E8E0D5' }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-sm font-medium" style={{ color: '#6B5D52' }}>
              All issues scheduled
            </p>
            <p className="text-xs mt-1" style={{ color: '#A39686' }}>
              Great work!
            </p>
          </div>
        ) : (
          <>
            {/* Group by Priority */}
            {(['critical', 'high', 'medium', 'low'] as const).map((priority) => {
              const priorityIssues = issuesByPriority[priority];
              if (priorityIssues.length === 0) return null;

              return (
                <div key={priority} className="space-y-2">
                  {/* Priority Header */}
                  <div className="flex items-center gap-2 px-2">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: getPriorityColor(priority) }}
                    />
                    <span
                      className="text-xs font-semibold uppercase tracking-wide"
                      style={{ color: '#6B5D52' }}
                    >
                      {getPriorityLabel(priority)}
                    </span>
                    <span
                      className="text-xs"
                      style={{ color: '#A39686' }}
                    >
                      ({priorityIssues.length})
                    </span>
                  </div>

                  {/* Issues in this priority */}
                  {priorityIssues.map((issue) => (
                    <BacklogIssueCard
                      key={issue.id}
                      issue={issue}
                      onDragStart={onDragStart}
                      onClick={() => onIssueClick?.(issue.id)}
                    />
                  ))}
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* Footer with Instructions */}
      <div
        className="px-4 py-3 border-t"
        style={{
          backgroundColor: '#FEF7F5',
          borderTopColor: '#E8E0D5',
        }}
      >
        <div className="flex items-start gap-2">
          <svg
            className="w-4 h-4 mt-0.5 flex-shrink-0"
            style={{ color: '#D97F6F' }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-xs" style={{ color: '#6B5D52' }}>
            Click to view details, drag to schedule on calendar
          </p>
        </div>
      </div>
    </div>
  );
}
