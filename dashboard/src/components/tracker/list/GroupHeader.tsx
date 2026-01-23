/**
 * Group Header Component
 * Expandable/collapsible header for grouped issue sections
 */

import { type Issue } from '../../../api/tracker';

interface GroupHeaderProps {
  name: string;
  count: number;
  isExpanded: boolean;
  onToggle: () => void;
  issues: Issue[];
  groupBy: 'status' | 'type' | 'assignee' | 'priority';
}

export function GroupHeader({
  name,
  count,
  isExpanded,
  onToggle,
  issues,
  groupBy,
}: GroupHeaderProps) {
  // Calculate aggregate stats
  const stats = {
    totalStoryPoints: issues.reduce((sum, issue) => sum + (issue.story_points || 0), 0),
    criticalCount: issues.filter(i => i.priority === 'critical').length,
    highCount: issues.filter(i => i.priority === 'high').length,
    epicCount: issues.filter(i => i.type === 'epic').length,
    storyCount: issues.filter(i => i.type === 'story').length,
    taskCount: issues.filter(i => i.type === 'task').length,
    bugCount: issues.filter(i => i.type === 'bug').length,
  };

  // Get badge color based on group type
  const getBadgeColor = () => {
    if (groupBy === 'priority') {
      switch (name.toLowerCase()) {
        case 'critical':
          return { bg: '#FCEEEB', text: '#C0392B', border: '#F5B1A4' };
        case 'high':
          return { bg: '#FDF6EC', text: '#E8A93A', border: '#F9D9A3' };
        case 'medium':
          return { bg: '#FDF9EF', text: '#E0B666', border: '#F5E5B8' };
        case 'low':
          return { bg: '#F5F4F2', text: '#A39686', border: '#D4CBBD' };
        default:
          return { bg: '#F5F4F2', text: '#6B5D52', border: '#E8E0D5' };
      }
    } else if (groupBy === 'type') {
      switch (name.toLowerCase()) {
        case 'epic':
          return { bg: '#F3F1F7', text: '#8B7AA8', border: '#D4CEE0' };
        case 'story':
          return { bg: '#FDF5F3', text: '#D97F6F', border: '#F9D0C8' };
        case 'task':
          return { bg: '#F5F4F2', text: '#A39686', border: '#D4CBBD' };
        case 'bug':
          return { bg: '#FCEEEB', text: '#C0392B', border: '#F5B1A4' };
        default:
          return { bg: '#F5F4F2', text: '#6B5D52', border: '#E8E0D5' };
      }
    } else if (groupBy === 'status') {
      return { bg: '#F5F1EC', text: '#6B5D52', border: '#E8E0D5' };
    }

    // Default for assignee or others
    return { bg: '#F5F1EC', text: '#6B5D52', border: '#E8E0D5' };
  };

  const badgeColors = getBadgeColor();

  return (
    <div
      className="sticky top-0 z-10 group-header"
      style={{
        backgroundColor: '#F5F1EC',
        borderBottomWidth: '1px',
        borderBottomStyle: 'solid',
        borderBottomColor: '#E8E0D5',
      }}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-6 py-3 text-left hover:bg-opacity-80 transition-all"
      >
        {/* Expand/Collapse Icon */}
        <svg
          className="w-5 h-5 transition-transform flex-shrink-0"
          style={{
            color: '#6B5D52',
            transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
          }}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
            clipRule="evenodd"
          />
        </svg>

        {/* Group Name Badge */}
        <div
          className="px-3 py-1 rounded-md font-semibold text-sm"
          style={{
            backgroundColor: badgeColors.bg,
            color: badgeColors.text,
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: badgeColors.border,
          }}
        >
          {name}
        </div>

        {/* Count */}
        <span
          className="font-medium text-sm"
          style={{ color: '#6B5D52' }}
        >
          ({count} {count === 1 ? 'issue' : 'issues'})
        </span>

        {/* Aggregate Stats */}
        <div className="flex items-center gap-4 ml-auto">
          {/* Story Points (if any) */}
          {stats.totalStoryPoints > 0 && (
            <div className="flex items-center gap-1.5">
              <svg
                className="w-4 h-4"
                style={{ color: '#E0B666' }}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span
                className="text-xs font-semibold"
                style={{ color: '#6B5D52' }}
              >
                {stats.totalStoryPoints} pts
              </span>
            </div>
          )}

          {/* Type breakdown (if not grouping by type) */}
          {groupBy !== 'type' && (
            <div className="flex items-center gap-2">
              {stats.epicCount > 0 && (
                <span className="text-xs font-medium" style={{ color: '#8B7AA8' }}>
                  {stats.epicCount} E
                </span>
              )}
              {stats.storyCount > 0 && (
                <span className="text-xs font-medium" style={{ color: '#D97F6F' }}>
                  {stats.storyCount} S
                </span>
              )}
              {stats.taskCount > 0 && (
                <span className="text-xs font-medium" style={{ color: '#A39686' }}>
                  {stats.taskCount} T
                </span>
              )}
              {stats.bugCount > 0 && (
                <span className="text-xs font-medium" style={{ color: '#C0392B' }}>
                  {stats.bugCount} B
                </span>
              )}
            </div>
          )}

          {/* Priority indicators (if not grouping by priority) */}
          {groupBy !== 'priority' && (stats.criticalCount > 0 || stats.highCount > 0) && (
            <div className="flex items-center gap-1.5">
              {stats.criticalCount > 0 && (
                <div className="flex items-center gap-0.5">
                  <svg className="w-3.5 h-3.5" style={{ color: '#C0392B' }} fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span className="text-xs font-semibold" style={{ color: '#C0392B' }}>
                    {stats.criticalCount}
                  </span>
                </div>
              )}
              {stats.highCount > 0 && (
                <div className="flex items-center gap-0.5">
                  <svg className="w-3.5 h-3.5" style={{ color: '#E8A93A' }} fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-xs font-semibold" style={{ color: '#E8A93A' }}>
                    {stats.highCount}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </button>
    </div>
  );
}
