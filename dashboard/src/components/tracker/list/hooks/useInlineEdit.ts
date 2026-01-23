/**
 * useInlineEdit Hook
 * Custom hook for managing inline editing state and API calls
 */

import { useState } from 'react';
import { type Issue } from '../../../../api/tracker';

interface UseInlineEditOptions {
  worktreeId: string;
  boardId: string;
  onUpdate: (worktreeId: string, boardId: string, issueId: string, data: Partial<Issue>) => Promise<Issue>;
  onSuccess?: (issue: Issue) => void;
  onError?: (error: Error) => void;
}

export function useInlineEdit({
  worktreeId,
  boardId,
  onUpdate,
  onSuccess,
  onError
}: UseInlineEditOptions) {
  const [updatingIssues, setUpdatingIssues] = useState<Set<string>>(new Set());

  const handleUpdate = async (
    issueId: string,
    field: keyof Issue,
    value: string | string[] | any
  ): Promise<void> => {
    // Track that this issue is being updated
    setUpdatingIssues(prev => new Set(prev).add(issueId));

    try {
      // Build update data based on field
      const updateData: Partial<Issue> = {
        [field]: value
      };

      // Make API call
      const updatedIssue = await onUpdate(worktreeId, boardId, issueId, updateData);

      // Call success callback
      if (onSuccess) {
        onSuccess(updatedIssue);
      }
    } catch (error) {
      // Call error callback
      if (onError) {
        onError(error instanceof Error ? error : new Error('Failed to update issue'));
      }
      throw error; // Re-throw for component to handle
    } finally {
      // Remove from updating set
      setUpdatingIssues(prev => {
        const next = new Set(prev);
        next.delete(issueId);
        return next;
      });
    }
  };

  const isUpdating = (issueId: string): boolean => {
    return updatingIssues.has(issueId);
  };

  return {
    handleUpdate,
    isUpdating,
    updatingIssues
  };
}
