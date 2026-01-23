/**
 * BacklogIssueCard Component
 * Compact draggable card for unscheduled issues in the backlog panel
 */

import { type Issue } from '../../../api/tracker';
import { Avatar } from '../shared/Avatar';

interface BacklogIssueCardProps {
  issue: Issue;
  onDragStart: (issue: Issue, e: React.DragEvent) => void;
  onClick?: (issue: Issue) => void;
}

export function BacklogIssueCard({ issue, onDragStart, onClick }: BacklogIssueCardProps) {
  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'epic':
        return { bg: '#8B7AA8', text: 'white' };
      case 'story':
        return { bg: '#6B9BD1', text: 'white' };
      case 'task':
        return { bg: '#52A560', text: 'white' };
      case 'bug':
        return { bg: '#D97F6F', text: 'white' };
      default:
        return { bg: '#A39686', text: 'white' };
    }
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

  const typeColor = getTypeBadgeColor(issue.type);
  const priorityColor = getPriorityColor(issue.priority);

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(issue, e)}
      onClick={() => onClick?.(issue)}
      className="p-3 border rounded-lg cursor-move hover:shadow-md transition-all duration-200 group"
      style={{
        backgroundColor: 'white',
        borderColor: '#E8E0D5',
      }}
    >
      {/* Header: ID and Type Badge */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {/* Priority Dot */}
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: priorityColor }}
            title={`Priority: ${issue.priority}`}
          />

          {/* Issue ID */}
          <span
            className="text-xs font-semibold"
            style={{ color: '#6B5D52' }}
          >
            {issue.id}
          </span>
        </div>

        {/* Type Badge */}
        <span
          className="px-2 py-0.5 text-xs font-semibold rounded"
          style={{
            backgroundColor: typeColor.bg,
            color: typeColor.text,
          }}
        >
          {issue.type}
        </span>
      </div>

      {/* Title */}
      <p
        className="text-sm font-medium line-clamp-2 mb-2"
        style={{ color: '#2F241B' }}
        title={issue.title}
      >
        {issue.title}
      </p>

      {/* Footer: Assignee and Labels */}
      <div className="flex items-center justify-between">
        {/* Assignee */}
        {issue.assignee ? (
          <Avatar
            name={issue.assignee.name}
            avatar={issue.assignee.avatar}
            size="xs"
          />
        ) : (
          <div
            className="w-5 h-5 rounded-full border-2 border-dashed flex items-center justify-center"
            style={{ borderColor: '#E8E0D5' }}
            title="Unassigned"
          >
            <svg className="w-3 h-3" style={{ color: '#A39686' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
        )}

        {/* Labels Count */}
        {issue.labels.length > 0 && (
          <div
            className="flex items-center gap-1 text-xs"
            style={{ color: '#6B5D52' }}
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            <span>{issue.labels.length}</span>
          </div>
        )}
      </div>

      {/* Drag hint (visible on hover) */}
      <div
        className="mt-2 text-xs text-center py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
        style={{
          backgroundColor: '#FEF7F5',
          color: '#D97F6F',
        }}
      >
        Drag to schedule
      </div>
    </div>
  );
}
