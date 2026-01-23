/**
 * Timeline Event Component
 * Custom event component for React Big Calendar
 * Displays issue information with warm color palette
 */

import { type Issue } from '../../../api/tracker';
import { generateAvatarGradient } from '../shared/utils';

interface TimelineEventProps {
  event: {
    id: string;
    title: string;
    start: Date;
    end: Date;
    resource: Issue;
  };
  isSingleDay?: boolean;
}

export function TimelineEvent({ event, isSingleDay = false }: TimelineEventProps) {
  const issue = event.resource;

  // Type colors (warm palette)
  const typeColors = {
    epic: '#8B7AA8',
    story: '#D97F6F',
    task: '#A39686',
    bug: '#C0392B',
  };

  // Priority border configuration
  const priorityBorder = {
    critical: { width: '4px', color: '#C0392B' },
    high: { width: '4px', color: '#E8A93A' },
    medium: { width: '4px', color: '#E0B666' },
    low: { width: '2px', color: '#D4CBBD' },
  };

  const bgColor = typeColors[issue.type];
  const border = priorityBorder[issue.priority];

  return (
    <div
      className={isSingleDay ? 'timeline-event-single' : 'timeline-event-multi'}
      style={{
        backgroundColor: bgColor,
        color: 'white',
        borderLeft: `${border.width} solid ${border.color}`,
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: isSingleDay ? '4px' : '8px',
      }}
      title={`${issue.id}: ${issue.title}\nType: ${issue.type}\nPriority: ${issue.priority}${issue.assignee ? `\nAssignee: ${issue.assignee.name}` : ''}`}
    >
      {/* Issue ID */}
      <span className="timeline-event-id">
        {issue.id}
      </span>

      {/* Title */}
      <span className="timeline-event-title">
        {issue.title}
      </span>

      {/* Assignee Avatar (only for multi-day or if space allows) */}
      {!isSingleDay && issue.assignee && (
        <div
          className="timeline-event-avatar"
          style={{
            background: generateAvatarGradient(issue.assignee.name),
          }}
        >
          {issue.assignee.name.charAt(0).toUpperCase()}
        </div>
      )}
    </div>
  );
}
