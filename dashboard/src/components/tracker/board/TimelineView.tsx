/**
 * Timeline View Component
 * Main timeline view for the tracker using React Big Calendar
 * Displays issues on a calendar based on their start_date and due_date
 */

import { type Issue } from '../../../api/tracker';
import { TimelineCalendar, convertIssuesToEvents, type CalendarEvent } from '../timeline/TimelineCalendar';
import { useMemo } from 'react';

interface TimelineViewProps {
  issues: Issue[];
  onIssueClick: (issueId: string) => void;
  worktreeId: string;
  boardId: string;
}

export function TimelineView({ issues, onIssueClick, worktreeId, boardId }: TimelineViewProps) {
  // Convert issues to calendar events, filtering out those without dates
  const events = useMemo(() => {
    return convertIssuesToEvents(issues);
  }, [issues]);

  // Handle event selection
  const handleSelectEvent = (event: CalendarEvent) => {
    onIssueClick(event.resource.id);
  };

  // Count issues without dates (for informational purposes)
  const issuesWithoutDates = useMemo(() => {
    return issues.filter(issue => !issue.due_date).length;
  }, [issues]);

  return (
    <div className="timeline-view">
      {/* Info banner if there are issues without dates */}
      {issuesWithoutDates > 0 && (
        <div
          className="mb-4 p-3 rounded-lg flex items-center gap-2"
          style={{
            backgroundColor: '#FDF6EC',
            border: '1px solid #E8A93A',
          }}
        >
          <svg
            className="w-5 h-5 flex-shrink-0"
            style={{ color: '#E8A93A' }}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <span className="text-sm" style={{ color: '#6B5D52' }}>
            <strong>{issuesWithoutDates}</strong> issue{issuesWithoutDates !== 1 ? 's' : ''} without dates are not shown in the timeline.
            They will appear in the backlog view.
          </span>
        </div>
      )}

      {/* Calendar */}
      {events.length > 0 ? (
        <TimelineCalendar
          events={events}
          onSelectEvent={handleSelectEvent}
          defaultView="week"
          worktreeId={worktreeId}
          boardId={boardId}
        />
      ) : (
        <div
          className="flex flex-col items-center justify-center p-12 rounded-lg"
          style={{
            backgroundColor: '#FFFBF7',
            border: '1px solid #E8E0D5',
            minHeight: '400px',
          }}
        >
          <svg
            className="w-16 h-16 mb-4"
            style={{ color: '#D4CBBD' }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <h3
            className="text-lg font-semibold mb-2"
            style={{ color: '#6B5D52' }}
          >
            No Scheduled Issues
          </h3>
          <p
            className="text-sm text-center max-w-md"
            style={{ color: '#A39686' }}
          >
            Issues with start dates or due dates will appear in the timeline.
            Add dates to your issues to see them on the calendar.
          </p>
        </div>
      )}
    </div>
  );
}
