/**
 * useDragReschedule Hook
 * Custom hook for handling drag-to-reschedule functionality in timeline view
 * Manages optimistic updates, API calls, and error handling with rollback
 */

import { useState, useCallback } from 'react';
import { hierarchicalIssuesApi, type Issue } from '../../../../api/tracker';

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: Issue;
  resourceId?: string;
}

export interface DragEventData {
  event: CalendarEvent;
  start: Date;
  end: Date;
  resourceId?: string;
  isAllDay?: boolean;
}

export interface UseDragRescheduleOptions {
  worktreeId: string;
  boardId: string;
  onSuccess?: (updatedIssue: Issue) => void;
  onError?: (error: Error, originalIssue: Issue) => void;
}

export interface UseDragRescheduleReturn {
  handleEventDrop: (data: DragEventData) => Promise<void>;
  handleEventResize: (data: DragEventData) => Promise<void>;
  isUpdating: boolean;
  error: Error | null;
}

/**
 * Custom hook for drag-to-reschedule functionality
 */
export function useDragReschedule({
  worktreeId,
  boardId,
  onSuccess,
  onError
}: UseDragRescheduleOptions): UseDragRescheduleReturn {
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Format date to ISO date string (YYYY-MM-DD)
   */
  const formatDateToISO = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  /**
   * Validate date changes
   */
  const validateDates = (startDate: string, dueDate: string): { valid: boolean; error?: string } => {
    const start = new Date(startDate);
    const due = new Date(dueDate);

    if (due < start) {
      return {
        valid: false,
        error: 'Due date cannot be before start date'
      };
    }

    return { valid: true };
  };

  /**
   * Calculate new dates preserving duration
   */
  const calculateNewDates = (
    issue: Issue,
    newStart: Date,
    newEnd: Date
  ): { start_date: string; due_date: string } => {
    // Calculate original duration (in milliseconds)
    const originalDuration = issue.due_date && issue.start_date
      ? new Date(issue.due_date).getTime() - new Date(issue.start_date).getTime()
      : 0;

    const newStartDate = formatDateToISO(newStart);

    // If there was an original duration, preserve it
    // Otherwise, use the dropped end date
    const newDueDate = originalDuration > 0
      ? formatDateToISO(new Date(newStart.getTime() + originalDuration))
      : formatDateToISO(newEnd);

    return {
      start_date: newStartDate,
      due_date: newDueDate
    };
  };

  /**
   * Handle event drop (move)
   */
  const handleEventDrop = useCallback(async ({
    event,
    start,
    end,
    resourceId
  }: DragEventData) => {
    const issue = event.resource;
    setIsUpdating(true);
    setError(null);

    try {
      // Calculate new dates
      const { start_date, due_date } = calculateNewDates(issue, start, end);

      // Validate dates
      const validation = validateDates(start_date, due_date);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // Prepare update data
      const updateData: Partial<Issue> = {
        start_date,
        due_date
      };

      // If resourceId changed and we're in swimlane mode, update the corresponding field
      // This is handled by the parent component based on swimlane mode
      // For now, we just update the dates

      // Make API call to update issue
      const updatedIssue = await hierarchicalIssuesApi.update(
        worktreeId,
        boardId,
        issue.id,
        updateData
      );

      // Call success callback
      if (onSuccess) {
        onSuccess(updatedIssue);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update issue dates');
      setError(error);

      // Call error callback with original issue for rollback
      if (onError) {
        onError(error, issue);
      }

      // Re-throw to allow parent component to handle
      throw error;
    } finally {
      setIsUpdating(false);
    }
  }, [worktreeId, boardId, onSuccess, onError]);

  /**
   * Handle event resize (change duration)
   */
  const handleEventResize = useCallback(async ({
    event,
    start,
    end
  }: DragEventData) => {
    const issue = event.resource;
    setIsUpdating(true);
    setError(null);

    try {
      // For resize, we update both start and end to exactly what the user specified
      const start_date = formatDateToISO(start);
      const due_date = formatDateToISO(end);

      // Validate dates
      const validation = validateDates(start_date, due_date);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // Calculate estimated duration in days (optional enhancement)
      const durationMs = end.getTime() - start.getTime();
      const durationDays = Math.ceil(durationMs / (1000 * 60 * 60 * 24));

      // Make API call to update issue
      const updatedIssue = await hierarchicalIssuesApi.update(
        worktreeId,
        boardId,
        issue.id,
        {
          start_date,
          due_date,
          estimated_duration: durationDays
        }
      );

      // Call success callback
      if (onSuccess) {
        onSuccess(updatedIssue);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to resize issue');
      setError(error);

      // Call error callback with original issue for rollback
      if (onError) {
        onError(error, issue);
      }

      // Re-throw to allow parent component to handle
      throw error;
    } finally {
      setIsUpdating(false);
    }
  }, [worktreeId, boardId, onSuccess, onError]);

  return {
    handleEventDrop,
    handleEventResize,
    isUpdating,
    error
  };
}
