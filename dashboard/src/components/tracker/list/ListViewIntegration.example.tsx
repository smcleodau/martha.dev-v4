/**
 * List View Integration Example
 * Example of how to integrate inline editing and bulk operations with TanStack Table
 *
 * This is an EXAMPLE file for the other agent creating ListView.tsx
 * It shows how to use the inline editing and bulk operations components
 */

import { useState } from 'react';
import { type Issue } from '../../../api/tracker';
import { hierarchicalIssuesApi } from '../../../api/tracker';
import { BulkActionsToolbar, type BulkOperation } from './BulkActionsToolbar';
import { useInlineEdit, useSelection, useBulkOperations } from './hooks';
import { TitleCell, StatusCell, PriorityCell, AssigneeCell, LabelsCell } from './cells';

interface ListViewIntegrationExampleProps {
  worktreeId: string;
  boardId: string;
  issues: Issue[];
  onIssuesUpdate: () => void;
}

export function ListViewIntegrationExample({
  worktreeId,
  boardId,
  issues,
  onIssuesUpdate
}: ListViewIntegrationExampleProps) {
  // Selection management
  const {
    selectedIssues,
    selectedCount,
    toggleSelection,
    clearSelection,
    isSelected,
    toggleSelectAll,
    isAllSelected
  } = useSelection();

  // Inline editing
  const { handleUpdate } = useInlineEdit({
    worktreeId,
    boardId,
    onUpdate: hierarchicalIssuesApi.update,
    onSuccess: (issue) => {
      console.log('Issue updated:', issue);
      onIssuesUpdate();
    },
    onError: (error) => {
      console.error('Failed to update issue:', error);
      // Show toast notification
    }
  });

  // Bulk operations
  const { executeBulkOperation } = useBulkOperations({
    worktreeId,
    boardId,
    onUpdate: hierarchicalIssuesApi.update,
    onDelete: hierarchicalIssuesApi.delete,
    onSuccess: (successCount, failedCount) => {
      console.log(`Bulk operation: ${successCount} succeeded, ${failedCount} failed`);
      onIssuesUpdate();
    },
    onError: (error, failedIssues) => {
      console.error('Bulk operation failed:', error, failedIssues);
    }
  });

  const handleBulkUpdate = async (operation: BulkOperation) => {
    await executeBulkOperation(selectedIssues, operation);
    clearSelection();
  };

  // Get available statuses from board columns
  const availableStatuses = ['backlog', 'todo', 'in-progress', 'in-review', 'done'];

  // Get available labels (would be fetched from API in production)
  const availableLabels = ['frontend', 'backend', 'bug', 'feature', 'enhancement'];

  return (
    <div className="relative">
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse" style={{ borderColor: '#E8E0D5' }}>
          <thead>
            <tr style={{ backgroundColor: '#FBFAF8', borderBottom: '1px solid #E8E0D5' }}>
              {/* Checkbox Column */}
              <th className="w-12 p-3">
                <input
                  type="checkbox"
                  checked={isAllSelected(issues.map(i => i.id))}
                  onChange={() => toggleSelectAll(issues.map(i => i.id))}
                  className="w-4 h-4 rounded cursor-pointer"
                  style={{ accentColor: '#D97F6F' }}
                />
              </th>
              <th className="text-left p-3 text-sm font-semibold" style={{ color: '#2F241B' }}>
                ID
              </th>
              <th className="text-left p-3 text-sm font-semibold" style={{ color: '#2F241B' }}>
                Title
              </th>
              <th className="text-left p-3 text-sm font-semibold" style={{ color: '#2F241B' }}>
                Status
              </th>
              <th className="text-left p-3 text-sm font-semibold" style={{ color: '#2F241B' }}>
                Priority
              </th>
              <th className="text-left p-3 text-sm font-semibold" style={{ color: '#2F241B' }}>
                Assignee
              </th>
              <th className="text-left p-3 text-sm font-semibold" style={{ color: '#2F241B' }}>
                Labels
              </th>
            </tr>
          </thead>
          <tbody>
            {issues.map((issue) => {
              const selected = isSelected(issue.id);
              return (
                <tr
                  key={issue.id}
                  className="border-b transition-colors"
                  style={{
                    backgroundColor: selected ? 'rgba(217, 127, 111, 0.1)' : '#FFFFFF',
                    borderColor: '#E8E0D5'
                  }}
                >
                  {/* Checkbox */}
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleSelection(issue.id)}
                      className="w-4 h-4 rounded cursor-pointer"
                      style={{ accentColor: '#D97F6F' }}
                    />
                  </td>

                  {/* ID */}
                  <td className="p-3">
                    <span className="text-xs font-mono font-semibold" style={{ color: '#A39686' }}>
                      {issue.id}
                    </span>
                  </td>

                  {/* Title - Editable */}
                  <td className="p-3 min-w-[300px]">
                    <TitleCell issue={issue} onUpdate={handleUpdate} />
                  </td>

                  {/* Status - Editable */}
                  <td className="p-3">
                    <StatusCell
                      issue={issue}
                      availableStatuses={availableStatuses}
                      onUpdate={handleUpdate}
                    />
                  </td>

                  {/* Priority - Editable */}
                  <td className="p-3">
                    <PriorityCell issue={issue} onUpdate={handleUpdate} />
                  </td>

                  {/* Assignee - Editable */}
                  <td className="p-3">
                    <AssigneeCell issue={issue} onUpdate={handleUpdate} />
                  </td>

                  {/* Labels - Editable */}
                  <td className="p-3">
                    <LabelsCell
                      issue={issue}
                      availableLabels={availableLabels}
                      onUpdate={handleUpdate}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Bulk Actions Toolbar */}
      <BulkActionsToolbar
        selectedIssueIds={selectedIssues}
        issues={issues}
        onBulkUpdate={handleBulkUpdate}
        onClearSelection={clearSelection}
      />
    </div>
  );
}
