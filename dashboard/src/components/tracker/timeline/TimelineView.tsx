/**
 * TimelineView Component
 * Main wrapper for timeline view with unscheduled backlog and calendar
 * Integrates drag-and-drop from backlog to calendar
 */

import { useState, useCallback, useMemo } from 'react';
import { type Issue } from '../../../api/tracker';
import { TimelineCalendar, convertIssuesToEvents } from './TimelineCalendar';
import { UnscheduledBacklog } from './UnscheduledBacklog';
import { useBacklogDrag } from './hooks/useBacklogDrag';
import { useTimelinePreferences } from '../../../utils/preferenceHooks';
import { SwimlaneModeSelector, type SwimlaneMode } from './SwimlaneModeSelector';

interface TimelineViewProps {
  issues: Record<string, Issue>;
  worktreeId: string;
  boardId: string;
  onIssueClick?: (issueId: string) => void;
  onIssueUpdate?: (issue: Issue) => void;
}

export function TimelineView({
  issues,
  worktreeId,
  boardId,
  onIssueClick,
  onIssueUpdate,
}: TimelineViewProps) {
  const [localIssues, setLocalIssues] = useState(issues);

  // Load swimlane preference
  const { swimlaneMode, setSwimlaneMode } = useTimelinePreferences(worktreeId, boardId);

  // Update local state when props change
  useMemo(() => {
    setLocalIssues(issues);
  }, [issues]);

  // Handle swimlane mode change
  const handleSwimlaneChange = useCallback((mode: SwimlaneMode) => {
    setSwimlaneMode(mode);
  }, [setSwimlaneMode]);

  // Drag-and-drop hook
  const { dragState, handleDragStart, handleDragEnd, handleDrop } = useBacklogDrag({
    worktreeId,
    boardId,
    onIssueUpdate: (updatedIssue) => {
      // Update local state optimistically
      setLocalIssues((prev) => ({
        ...prev,
        [updatedIssue.id]: updatedIssue,
      }));

      // Notify parent
      onIssueUpdate?.(updatedIssue);
    },
    onError: (error) => {
      console.error('Failed to schedule issue:', error);
    },
  });

  // Convert issues to calendar events (only scheduled issues)
  const events = useMemo(() => {
    const scheduledIssues = Object.values(localIssues).filter((issue) => issue.due_date);
    return convertIssuesToEvents(scheduledIssues);
  }, [localIssues]);

  // Handle event click on calendar
  const handleEventClick = useCallback(
    (event: any) => {
      onIssueClick?.(event.resource.id);
    },
    [onIssueClick]
  );

  // Handle slot selection on calendar (for creating new issues on a date)
  const handleSelectSlot = useCallback(
    (slotInfo: any) => {
      console.log('Selected slot:', slotInfo);
      // TODO: Could open a dialog to create a new issue on this date
    },
    []
  );

  // Handle drag end with calendar drop
  const handleCalendarDragEnd = useCallback(
    (e: React.DragEvent) => {
      handleDragEnd();
    },
    [handleDragEnd]
  );

  // Handle drop on calendar
  const handleCalendarDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();

      if (!dragState.draggedIssue) return;

      // Try to get the date from the drop target
      const target = e.target as HTMLElement;
      const dateCell = target.closest('[data-date]');

      if (dateCell) {
        const dateStr = dateCell.getAttribute('data-date');
        if (dateStr) {
          const dropDate = new Date(dateStr);
          handleDrop(dropDate, dragState.draggedIssue);
        }
      }

      handleDragEnd();
    },
    [dragState.draggedIssue, handleDrop, handleDragEnd]
  );

  // Handle drag over calendar (to allow drop)
  const handleCalendarDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: '#F5F1EC' }}>
      {/* Top: Swimlane Controls */}
      <div
        className="flex items-center justify-between px-4 py-2 border-b"
        style={{
          backgroundColor: 'white',
          borderBottomColor: '#E8E0D5'
        }}
      >
        <h3 className="text-sm font-medium" style={{ color: '#6B5D52' }}>
          Timeline View
        </h3>
        <SwimlaneModeSelector
          mode={swimlaneMode}
          onChange={handleSwimlaneChange}
        />
      </div>

      {/* Main: Backlog and Calendar */}
      <div className="flex-1 flex">
        {/* Left: Unscheduled Backlog */}
        <UnscheduledBacklog
          issues={localIssues}
          onDragStart={handleDragStart}
          onIssueClick={onIssueClick}
        />

        {/* Right: Calendar */}
        <div
          className="flex-1"
          onDrop={handleCalendarDrop}
          onDragOver={handleCalendarDragOver}
          onDragEnd={handleCalendarDragEnd}
        >
          <TimelineCalendar
            events={events}
            onSelectEvent={handleEventClick}
            onSelectSlot={handleSelectSlot}
            worktreeId={worktreeId}
            boardId={boardId}
          />
        </div>
      </div>
    </div>
  );
}
