/**
 * Kanban Column Component - Column in the kanban board
 */

import { type Issue, type BoardColumn } from '../../../api/tracker';
import { IssueCard } from './IssueCard';
import { type DragEvent } from 'react';

interface KanbanColumnProps {
  column: BoardColumn;
  issues: Record<string, Issue>;
  onIssueClick: (issueId: string) => void;
  onDragStart?: (issueId: string) => (e: DragEvent) => void;
  onDragEnd?: () => (e: DragEvent) => void;
  onDragOver?: (columnId: string) => (e: DragEvent) => void;
  onDragLeave?: () => (e: DragEvent) => void;
  onDrop?: (columnId: string) => (e: DragEvent) => void;
  draggedIssueId?: string | null;
  isDragOver?: boolean;
}

export function KanbanColumn({
  column,
  issues,
  onIssueClick,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
  draggedIssueId,
  isDragOver
}: KanbanColumnProps) {
  return (
    <div
      className={`flex-shrink-0 w-80 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col ${
        isDragOver ? 'border-blue-500 bg-blue-50' : ''
      }`}
      onDragOver={onDragOver ? onDragOver(column.id) : undefined}
      onDragLeave={onDragLeave}
      onDrop={onDrop ? onDrop(column.id) : undefined}
    >
      {/* Column Header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full shadow-sm"
              style={{ backgroundColor: column.color }}
            />
            <h3 className="font-bold text-gray-800 text-sm">{column.name}</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs font-semibold rounded-full">
              {column.issue_ids.length}
            </span>
            {column.wip_limit && column.issue_ids.length > column.wip_limit && (
              <span className="text-xs text-red-600 font-semibold">⚠</span>
            )}
          </div>
        </div>
      </div>

      {/* Issues */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {column.issue_ids.map((issueId) => {
          const issue = issues[issueId];
          if (!issue) return null;

          const parentIssue = issue.parent_id ? issues[issue.parent_id] : null;

          return (
            <IssueCard
              key={issueId}
              issue={issue}
              parentIssue={parentIssue}
              onClick={() => onIssueClick(issueId)}
              onDragStart={onDragStart ? onDragStart(issueId) : undefined}
              onDragEnd={onDragEnd ? onDragEnd() : undefined}
              isDragging={draggedIssueId === issueId}
            />
          );
        })}
      </div>
    </div>
  );
}
