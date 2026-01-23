/**
 * useBulkOperations Hook
 * Custom hook for managing bulk operations on multiple issues
 */

import { useState } from 'react';
import { type Issue } from '../../../../api/tracker';
import { type BulkOperation } from '../BulkActionsToolbar';

interface UseBulkOperationsOptions {
  worktreeId: string;
  boardId: string;
  onUpdate: (worktreeId: string, boardId: string, issueId: string, data: Partial<Issue>) => Promise<Issue>;
  onDelete: (worktreeId: string, boardId: string, issueId: string) => Promise<void>;
  onSuccess?: (successCount: number, failedCount: number) => void;
  onError?: (error: Error, failedIssues: string[]) => void;
}

interface BulkOperationResult {
  success: string[];
  failed: Array<{ issueId: string; error: string }>;
}

export function useBulkOperations({
  worktreeId,
  boardId,
  onUpdate,
  onDelete,
  onSuccess,
  onError
}: UseBulkOperationsOptions) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ completed: 0, total: 0 });

  const executeBulkOperation = async (
    issueIds: string[],
    operation: BulkOperation
  ): Promise<BulkOperationResult> => {
    setIsProcessing(true);
    setProgress({ completed: 0, total: issueIds.length });

    const results: BulkOperationResult = {
      success: [],
      failed: []
    };

    // Process each issue
    for (let i = 0; i < issueIds.length; i++) {
      const issueId = issueIds[i];

      try {
        if (operation.type === 'delete') {
          await onDelete(worktreeId, boardId, issueId);
        } else {
          // Build update data based on operation type
          const updateData: Partial<Issue> = {};

          if (operation.type === 'status' && operation.value) {
            updateData.status = operation.value;
          } else if (operation.type === 'priority' && operation.value) {
            updateData.priority = operation.value as Issue['priority'];
          } else if (operation.type === 'assignee' && operation.value) {
            if (operation.value === 'unassigned') {
              updateData.assignee = null;
            } else {
              // In production, this would lookup the user data
              updateData.assignee = {
                id: operation.value,
                name: 'User', // Would be fetched from API
                avatar: ''
              };
            }
          }

          await onUpdate(worktreeId, boardId, issueId, updateData);
        }

        results.success.push(issueId);
      } catch (error) {
        results.failed.push({
          issueId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }

      // Update progress
      setProgress({ completed: i + 1, total: issueIds.length });
    }

    setIsProcessing(false);

    // Call callbacks
    if (results.failed.length === 0 && onSuccess) {
      onSuccess(results.success.length, 0);
    } else if (results.failed.length > 0 && onError) {
      const failedIds = results.failed.map(f => f.issueId);
      onError(new Error(`Failed to update ${results.failed.length} issues`), failedIds);
    }

    return results;
  };

  return {
    executeBulkOperation,
    isProcessing,
    progress
  };
}
