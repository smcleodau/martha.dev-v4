/**
 * useBacklogDrag Hook
 * Manages drag-and-drop logic for moving issues from backlog to calendar
 */

import { useState, useCallback } from 'react';
import { type Issue, hierarchicalIssuesApi } from '../../../../api/tracker';

interface UseBacklogDragOptions {
  worktreeId: string;
  boardId: string;
  onIssueUpdate?: (issue: Issue) => void;
  onError?: (error: string) => void;
}

interface DragState {
  isDragging: boolean;
  draggedIssue: Issue | null;
}

export function useBacklogDrag({
  worktreeId,
  boardId,
  onIssueUpdate,
  onError,
}: UseBacklogDragOptions) {
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    draggedIssue: null,
  });

  /**
   * Handle drag start - store issue data in drag event
   */
  const handleDragStart = useCallback((issue: Issue, e: React.DragEvent) => {
    setDragState({
      isDragging: true,
      draggedIssue: issue,
    });

    // Store issue data in dataTransfer for compatibility
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/json', JSON.stringify(issue));
    e.dataTransfer.setData('text/plain', issue.id);

    // Optional: Set custom drag image
    if (e.dataTransfer.setDragImage) {
      const dragImage = document.createElement('div');
      dragImage.innerHTML = `
        <div style="
          background: white;
          border: 2px solid #D97F6F;
          border-radius: 8px;
          padding: 8px 12px;
          font-size: 14px;
          font-weight: 600;
          color: #2F241B;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        ">
          ${issue.id}: ${issue.title.substring(0, 30)}...
        </div>
      `;
      dragImage.style.position = 'absolute';
      dragImage.style.top = '-1000px';
      document.body.appendChild(dragImage);
      e.dataTransfer.setDragImage(dragImage, 0, 0);
      setTimeout(() => document.body.removeChild(dragImage), 0);
    }
  }, []);

  /**
   * Handle drag end
   */
  const handleDragEnd = useCallback(() => {
    setDragState({
      isDragging: false,
      draggedIssue: null,
    });
  }, []);

  /**
   * Handle drop on calendar - update issue with new date
   */
  const handleDrop = useCallback(
    async (dropDate: Date, issue: Issue) => {
      try {
        // Validate date (don't allow drops on past dates - optional)
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (dropDate < today) {
          const allowPast = confirm(
            'This date is in the past. Do you want to schedule the issue for this date anyway?'
          );
          if (!allowPast) {
            setDragState({ isDragging: false, draggedIssue: null });
            return;
          }
        }

        // Format date as ISO string (YYYY-MM-DD)
        const dueDate = dropDate.toISOString().split('T')[0];

        // Calculate start date (1 day before due date by default)
        const startDate = new Date(dropDate);
        startDate.setDate(startDate.getDate() - 1);
        const startDateStr = startDate.toISOString().split('T')[0];

        // Optimistic update
        const optimisticIssue = {
          ...issue,
          due_date: dueDate,
          start_date: startDateStr,
        };

        // Notify parent immediately (optimistic)
        onIssueUpdate?.(optimisticIssue);

        // Make API call
        const updatedIssue = await hierarchicalIssuesApi.update(
          worktreeId,
          boardId,
          issue.id,
          {
            due_date: dueDate,
            start_date: startDateStr,
          }
        );

        // Update with actual response
        onIssueUpdate?.(updatedIssue);

        setDragState({ isDragging: false, draggedIssue: null });
      } catch (error) {
        console.error('Failed to update issue date:', error);

        // Rollback optimistic update
        onIssueUpdate?.(issue);

        const errorMessage =
          error instanceof Error ? error.message : 'Failed to schedule issue';
        onError?.(errorMessage);

        alert(`Failed to schedule issue: ${errorMessage}`);

        setDragState({ isDragging: false, draggedIssue: null });
      }
    },
    [worktreeId, boardId, onIssueUpdate, onError]
  );

  /**
   * Parse drop date from calendar event
   * Used by calendar components to extract the date from drop position
   */
  const parseDateFromEvent = useCallback((e: React.DragEvent, slotInfo?: any): Date | null => {
    // If calendar provides slot info (react-big-calendar does this)
    if (slotInfo?.start) {
      return slotInfo.start;
    }

    // Otherwise, try to parse from data attribute or other sources
    const target = e.target as HTMLElement;
    const dateAttr = target.closest('[data-date]')?.getAttribute('data-date');

    if (dateAttr) {
      return new Date(dateAttr);
    }

    return null;
  }, []);

  return {
    dragState,
    handleDragStart,
    handleDragEnd,
    handleDrop,
    parseDateFromEvent,
  };
}
