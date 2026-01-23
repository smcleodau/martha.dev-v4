/**
 * Bulk Actions Toolbar Component
 * Toolbar that appears when issues are selected for bulk operations
 */

import { useState } from 'react';
import { type Issue } from '../../../api/tracker';

export interface BulkOperation {
  type: 'status' | 'priority' | 'assignee' | 'delete';
  value?: string;
}

interface BulkActionsToolbarProps {
  selectedIssueIds: string[];
  issues: Issue[];
  onBulkUpdate: (operation: BulkOperation) => Promise<void>;
  onClearSelection: () => void;
  className?: string;
}

interface OperationProgress {
  total: number;
  completed: number;
  failed: string[];
  inProgress: boolean;
}

export function BulkActionsToolbar({
  selectedIssueIds,
  issues,
  onBulkUpdate,
  onClearSelection,
  className = ''
}: BulkActionsToolbarProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [progress, setProgress] = useState<OperationProgress | null>(null);

  const selectedCount = selectedIssueIds.length;

  if (selectedCount === 0) return null;

  const handleBulkOperation = async (operation: BulkOperation) => {
    setProgress({
      total: selectedCount,
      completed: 0,
      failed: [],
      inProgress: true
    });

    try {
      await onBulkUpdate(operation);
      setProgress({
        total: selectedCount,
        completed: selectedCount,
        failed: [],
        inProgress: false
      });

      // Clear progress after 2 seconds
      setTimeout(() => {
        setProgress(null);
      }, 2000);
    } catch (error) {
      setProgress(prev => prev ? {
        ...prev,
        inProgress: false,
        failed: [error instanceof Error ? error.message : 'Unknown error']
      } : null);
    }
  };

  const handleDeleteConfirm = async () => {
    await handleBulkOperation({ type: 'delete' });
    setShowDeleteConfirm(false);
    onClearSelection();
  };

  return (
    <>
      {/* Main Toolbar */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 border-t ${className}`}
        style={{
          backgroundColor: '#F5F1EC',
          borderColor: '#E8E0D5',
          boxShadow: '0 -4px 12px rgba(47, 36, 27, 0.08)'
        }}
      >
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            {/* Left: Selection Count */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div
                  className="w-5 h-5 rounded flex items-center justify-center"
                  style={{ backgroundColor: '#D97F6F' }}
                >
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-sm font-semibold" style={{ color: '#2F241B' }}>
                  {selectedCount} {selectedCount === 1 ? 'issue' : 'issues'} selected
                </span>
              </div>
              <button
                onClick={onClearSelection}
                className="text-xs font-medium px-2 py-1 rounded hover:bg-white/50 transition-colors"
                style={{ color: '#6B5D52' }}
              >
                Clear
              </button>
            </div>

            {/* Center: Actions */}
            {!progress?.inProgress && (
              <div className="flex items-center gap-2">
                {/* Change Status */}
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      handleBulkOperation({ type: 'status', value: e.target.value });
                      e.target.value = '';
                    }
                  }}
                  className="px-3 py-1.5 text-sm font-medium rounded-md border transition-colors"
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#E8E0D5',
                    color: '#2F241B'
                  }}
                >
                  <option value="">Change Status</option>
                  <option value="backlog">Backlog</option>
                  <option value="todo">To Do</option>
                  <option value="in-progress">In Progress</option>
                  <option value="in-review">In Review</option>
                  <option value="done">Done</option>
                </select>

                {/* Set Priority */}
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      handleBulkOperation({ type: 'priority', value: e.target.value });
                      e.target.value = '';
                    }
                  }}
                  className="px-3 py-1.5 text-sm font-medium rounded-md border transition-colors"
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#E8E0D5',
                    color: '#2F241B'
                  }}
                >
                  <option value="">Set Priority</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>

                {/* Assign To */}
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      handleBulkOperation({ type: 'assignee', value: e.target.value });
                      e.target.value = '';
                    }
                  }}
                  className="px-3 py-1.5 text-sm font-medium rounded-md border transition-colors"
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#E8E0D5',
                    color: '#2F241B'
                  }}
                >
                  <option value="">Assign To</option>
                  <option value="unassigned">Unassigned</option>
                  <option value="user-1">John Doe</option>
                  <option value="user-2">Jane Smith</option>
                  <option value="user-3">Bob Johnson</option>
                </select>

                {/* Delete */}
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-3 py-1.5 text-sm font-medium rounded-md border transition-colors hover:bg-red-50"
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#E8E0D5',
                    color: '#C0392B'
                  }}
                >
                  Delete
                </button>
              </div>
            )}

            {/* Progress Indicator */}
            {progress?.inProgress && (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"
                    style={{ borderColor: '#D97F6F' }}
                  />
                  <span className="text-sm font-medium" style={{ color: '#6B5D52' }}>
                    Processing {progress.completed} of {progress.total}...
                  </span>
                </div>
                <div
                  className="w-32 h-1.5 rounded-full overflow-hidden"
                  style={{ backgroundColor: '#E8E0D5' }}
                >
                  <div
                    className="h-full transition-all duration-300"
                    style={{
                      width: `${(progress.completed / progress.total) * 100}%`,
                      backgroundColor: '#D97F6F'
                    }}
                  />
                </div>
              </div>
            )}

            {/* Success Message */}
            {progress && !progress.inProgress && progress.failed.length === 0 && (
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" style={{ color: '#52A560' }} fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                </svg>
                <span className="text-sm font-medium" style={{ color: '#52A560' }}>
                  Updated {progress.completed} {progress.completed === 1 ? 'issue' : 'issues'}
                </span>
              </div>
            )}

            {/* Error Message */}
            {progress && !progress.inProgress && progress.failed.length > 0 && (
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" style={{ color: '#C0392B' }} fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
                </svg>
                <span className="text-sm font-medium" style={{ color: '#C0392B' }}>
                  Failed to update {progress.failed.length} {progress.failed.length === 1 ? 'issue' : 'issues'}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-40">
          <div
            className="max-w-md w-full mx-4 rounded-lg shadow-xl p-6"
            style={{ backgroundColor: '#FFFFFF' }}
          >
            <div className="flex items-start gap-3">
              <div
                className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
                style={{ backgroundColor: '#FCEEEB' }}
              >
                <svg className="w-5 h-5" style={{ color: '#C0392B' }} fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-2" style={{ color: '#2F241B' }}>
                  Delete {selectedCount} {selectedCount === 1 ? 'issue' : 'issues'}?
                </h3>
                <p className="text-sm mb-4" style={{ color: '#6B5D52' }}>
                  This action cannot be undone. All selected issues will be permanently deleted.
                </p>
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-4 py-2 text-sm font-medium rounded-md transition-colors"
                    style={{
                      backgroundColor: '#F5F4F2',
                      color: '#6B5D52'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteConfirm}
                    className="px-4 py-2 text-sm font-medium rounded-md transition-colors"
                    style={{
                      backgroundColor: '#C0392B',
                      color: '#FFFFFF'
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
