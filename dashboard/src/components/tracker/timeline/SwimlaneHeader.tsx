/**
 * Swimlane Header Component
 * Header component for each swimlane row in timeline view
 * Shows group name, issue count, and aggregate statistics
 */

import { type Issue } from '../../../api/tracker';

export interface SwimlaneHeaderProps {
  groupName: string;
  issues: Issue[];
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function SwimlaneHeader({
  groupName,
  issues,
  collapsed = false,
  onToggleCollapse
}: SwimlaneHeaderProps) {
  // Calculate aggregate statistics
  const totalIssues = issues.length;
  const totalStoryPoints = issues.reduce((sum, issue) => sum + (issue.story_points || 0), 0);

  // Status distribution
  const statusCounts = issues.reduce((acc, issue) => {
    acc[issue.status] = (acc[issue.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const completedStatuses = ['done', 'closed', 'completed'];
  const completedCount = issues.filter(issue =>
    completedStatuses.includes(issue.status.toLowerCase())
  ).length;

  const completionPercentage = totalIssues > 0
    ? Math.round((completedCount / totalIssues) * 100)
    : 0;

  // Priority distribution
  const criticalCount = issues.filter(issue => issue.priority === 'critical').length;
  const highCount = issues.filter(issue => issue.priority === 'high').length;

  return (
    <div
      className="swimlane-header flex items-center justify-between px-4 py-3 border-r"
      style={{
        backgroundColor: '#FDFBF8',
        borderColor: '#E8E0D5',
        minHeight: '60px'
      }}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {/* Toggle collapse button (future enhancement) */}
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded hover:bg-opacity-10 hover:bg-gray-500 transition-colors"
            style={{ color: '#6B5D52' }}
            aria-label={collapsed ? 'Expand swimlane' : 'Collapse swimlane'}
          >
            <svg
              className="w-4 h-4 transition-transform duration-200"
              style={{ transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        )}

        {/* Group Name */}
        <div className="flex flex-col flex-1 min-w-0">
          <h3
            className="font-semibold text-sm truncate"
            style={{ color: '#2F241B' }}
            title={groupName}
          >
            {groupName}
          </h3>

          {/* Issue count */}
          <span
            className="text-xs font-medium mt-0.5"
            style={{ color: '#A39686' }}
          >
            {totalIssues} {totalIssues === 1 ? 'issue' : 'issues'}
          </span>
        </div>
      </div>

      {/* Aggregate Statistics */}
      <div className="flex items-center gap-4 flex-shrink-0">
        {/* Story Points (if any) */}
        {totalStoryPoints > 0 && (
          <div className="flex items-center gap-1.5">
            <svg
              className="w-3.5 h-3.5"
              style={{ color: '#8B7AA8' }}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span
              className="text-xs font-semibold"
              style={{ color: '#6B5D52' }}
            >
              {totalStoryPoints} pts
            </span>
          </div>
        )}

        {/* Completion Progress Bar */}
        {totalIssues > 0 && (
          <div className="flex items-center gap-2">
            <div
              className="w-16 h-1.5 rounded-full overflow-hidden"
              style={{ backgroundColor: '#F5F1EC' }}
            >
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${completionPercentage}%`,
                  background: 'linear-gradient(90deg, #52A560 0%, #6B9BD1 100%)'
                }}
              />
            </div>
            <span
              className="text-xs font-medium tabular-nums"
              style={{ color: '#6B5D52' }}
            >
              {completionPercentage}%
            </span>
          </div>
        )}

        {/* Priority Indicators */}
        <div className="flex items-center gap-1.5">
          {criticalCount > 0 && (
            <div
              className="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium"
              style={{
                backgroundColor: '#FCEEEB',
                color: '#C0392B'
              }}
            >
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              {criticalCount}
            </div>
          )}
          {highCount > 0 && (
            <div
              className="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium"
              style={{
                backgroundColor: '#FDF6EC',
                color: '#E8A93A'
              }}
            >
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              {highCount}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
