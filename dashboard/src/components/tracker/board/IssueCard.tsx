/**
 * Issue Card Component
 *
 * Individual issue card displayed in kanban columns. Shows issue metadata,
 * progress, assignees, labels, and provides drag-and-drop functionality.
 *
 * Features:
 * - Rich visual design with warm color palette
 * - Progress bars for epics and stories
 * - Parent issue context display
 * - Team member avatars
 * - Priority and type badges
 * - Due date warnings
 * - Dependency indicators
 * - Keyboard accessible
 *
 * @component
 * @example
 * ```tsx
 * <IssueCard
 *   issue={issue}
 *   parentIssue={parentIssue}
 *   allIssues={allIssuesMap}
 *   onClick={() => openDetailPanel(issue.id)}
 *   onDragStart={handleDragStart}
 *   onDragEnd={handleDragEnd}
 *   isDragging={draggedId === issue.id}
 * />
 * ```
 */

import { type Issue } from '../../../api/tracker';
import { type DragEvent, useMemo } from 'react';
import { calculateProgress, getTeamMembers, generateAvatarGradient } from '../shared/utils';

/**
 * Props for the IssueCard component
 */
interface IssueCardProps {
  /** Issue to display */
  issue: Issue;
  /** Parent issue if this is a child (for showing context) */
  parentIssue?: Issue | null;
  /** All issues in the board (for progress calculation) */
  allIssues: Record<string, Issue>;
  /** Callback when card is clicked */
  onClick: () => void;
  /** Callback when drag starts (optional) */
  onDragStart?: (e: DragEvent) => void;
  /** Callback when drag ends (optional) */
  onDragEnd?: (e: DragEvent) => void;
  /** Whether this card is currently being dragged */
  isDragging?: boolean;
}

export function IssueCard({
  issue,
  parentIssue,
  allIssues,
  onClick,
  onDragStart,
  onDragEnd,
  isDragging
}: IssueCardProps) {
  // Calculate progress for epics and stories
  const progress = useMemo(() => {
    if (issue.type === 'epic' || issue.type === 'story') {
      return calculateProgress(issue, allIssues);
    }
    return null;
  }, [issue, allIssues]);

  // Get team members
  const teamMembers = useMemo(() => getTeamMembers(issue), [issue]);

  // Type badge colors (warm palette)
  const typeBadgeStyle = {
    epic: { bg: '#F3F1F7', text: '#8B7AA8', border: '#D4CEE0' },
    story: { bg: '#FDF5F3', text: '#D97F6F', border: '#F9D0C8' },
    task: { bg: '#F5F4F2', text: '#A39686', border: '#D4CBBD' },
    bug: { bg: '#FCEEEB', text: '#C0392B', border: '#F5B1A4' },
  };

  // Priority badge colors (warm palette)
  const priorityBadgeStyle = {
    critical: { bg: '#FCEEEB', text: '#C0392B' },
    high: { bg: '#FDF6EC', text: '#E8A93A' },
    medium: { bg: '#FDF9EF', text: '#E0B666' },
    low: { bg: '#F5F4F2', text: '#A39686' },
  };

  const typeStyle = typeBadgeStyle[issue.type];
  const priorityStyle = priorityBadgeStyle[issue.priority];

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <div
      draggable={true}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      className={`kanban-card bg-white rounded-lg p-4 cursor-pointer ${
        isDragging ? 'opacity-50' : ''
      }`}
      style={{
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: '#E8E0D5',
        boxShadow: '0 1px 3px rgba(47, 36, 27, 0.08)'
      }}
      role="button"
      tabIndex={0}
      aria-label={`${issue.type} ${issue.id}: ${issue.title}, priority ${issue.priority}${parentIssue ? `, part of ${parentIssue.title}` : ''}`}
    >
      {/* Parent Issue Badge */}
      {parentIssue && (
        <div className="mb-2.5 flex items-center gap-1.5" aria-label={`Part of ${parentIssue.title}`}>
          <svg className="w-3 h-3" style={{ color: '#8B7AA8' }} fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"/>
          </svg>
          <span
            className="text-xs font-medium truncate"
            style={{ color: '#8B7AA8' }}
          >
            {parentIssue.title}
          </span>
        </div>
      )}

      {/* Header: ID + Type + Priority */}
      <div className="flex items-start justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <span
            className="text-xs font-mono font-semibold"
            style={{ color: '#A39686' }}
          >
            {issue.id}
          </span>
          <span
            className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{
              backgroundColor: typeStyle.bg,
              color: typeStyle.text,
              borderWidth: '1px',
              borderStyle: 'solid',
              borderColor: typeStyle.border
            }}
          >
            {issue.type}
          </span>
        </div>
        <span
          className="text-xs px-2 py-1 rounded-md font-semibold"
          style={{
            backgroundColor: priorityStyle.bg,
            color: priorityStyle.text
          }}
        >
          {issue.priority}
        </span>
      </div>

      {/* Title */}
      <h4
        className="text-sm font-semibold mb-3 line-clamp-2"
        style={{ color: '#2F241B' }}
      >
        {issue.title}
      </h4>

      {/* Progress Indicator (NEW - for epics and stories) */}
      {progress && progress.total > 0 && (
        <div className="mb-3" role="progressbar" aria-valuenow={progress.percentage} aria-valuemin={0} aria-valuemax={100} aria-label={`${progress.completed} of ${progress.total} ${issue.type === 'epic' ? 'stories' : 'tasks'} completed`}>
          <div className="flex items-center justify-between mb-1.5">
            <span
              className="text-xs font-medium"
              style={{ color: '#6B5D52' }}
              aria-hidden="true"
            >
              {progress.completed}/{progress.total} {issue.type === 'epic' ? 'stories' : 'tasks'}
            </span>
            <span
              className="text-xs font-semibold"
              style={{ color: '#A39686' }}
              aria-hidden="true"
            >
              {progress.percentage}%
            </span>
          </div>
          <div
            className="w-full h-1.5 rounded-full overflow-hidden"
            style={{ backgroundColor: '#F5F1EC' }}
          >
            <div
              className="h-full rounded-full transition-all duration-300 progress-gradient-coral-gold"
              style={{
                width: `${progress.percentage}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Labels */}
      {issue.labels && issue.labels.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {issue.labels.slice(0, 3).map((label, idx) => (
            <span
              key={idx}
              className="text-xs px-2 py-0.5 rounded-md font-medium"
              style={{
                backgroundColor: '#F5F4F2',
                color: '#6B5D52'
              }}
            >
              {label}
            </span>
          ))}
          {issue.labels.length > 3 && (
            <span
              className="text-xs px-2 py-0.5 rounded-md"
              style={{
                backgroundColor: '#F5F4F2',
                color: '#A39686'
              }}
            >
              +{issue.labels.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Footer: Team Avatars + Metadata */}
      <div
        className="flex items-center justify-between mt-3 pt-3"
        style={{
          borderTopWidth: '1px',
          borderTopStyle: 'solid',
          borderTopColor: '#F5F1EC'
        }}
      >
        {/* Team Avatars - Stacked */}
        {teamMembers.length > 0 ? (
          <div className="flex -space-x-2">
            {teamMembers.slice(0, 3).map((member, idx) => (
              <div
                key={idx}
                className="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-xs font-semibold text-white shadow-sm"
                style={{
                  background: generateAvatarGradient(member.name),
                }}
                title={member.name}
              >
                {member.name.charAt(0).toUpperCase()}
              </div>
            ))}
            {teamMembers.length > 3 && (
              <div
                className="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-xs font-medium shadow-sm"
                style={{
                  backgroundColor: '#E8E0D5',
                  color: '#6B5D52'
                }}
              >
                +{teamMembers.length - 3}
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center"
              style={{ backgroundColor: '#F5F1EC' }}
            >
              <svg className="w-3 h-3" style={{ color: '#A39686' }} fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"/>
              </svg>
            </div>
            <span className="text-xs" style={{ color: '#A39686' }}>Unassigned</span>
          </div>
        )}

        {/* Metadata Icons */}
        <div className="flex items-center gap-2">
          {issue.links?.pr && (
            <span className="flex items-center gap-1" style={{ color: '#6B9BD1' }}>
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd"/>
              </svg>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
