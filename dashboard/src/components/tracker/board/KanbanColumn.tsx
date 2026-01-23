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
  const issueCount = column.issue_ids.length;
  const wipLimitExceeded = column.wip_limit && issueCount > column.wip_limit;

  return (
    <div
      className={`flex-shrink-0 w-80 bg-white rounded-lg shadow-warm-md flex flex-col transition-all ${
        isDragOver ? 'shadow-coral-glow' : ''
      }`}
      style={{
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: isDragOver ? '#D97F6F' : '#E8E0D5'
      }}
      onDragOver={onDragOver ? onDragOver(column.id) : undefined}
      onDragLeave={onDragLeave}
      onDrop={onDrop ? onDrop(column.id) : undefined}
      role="listitem"
      aria-label={`${column.name} column with ${issueCount} ${issueCount === 1 ? 'issue' : 'issues'}${wipLimitExceeded ? ', WIP limit exceeded' : ''}`}
    >
      {/* Column Header */}
      <div
        className="px-4 py-3.5 border-b"
        style={{
          backgroundColor: '#FDFCFA',
          borderBottomColor: '#E8E0D5'
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{
                backgroundColor: column.color,
                boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
              }}
              aria-hidden="true"
            />
            <h3
              className="font-semibold text-sm"
              style={{ color: '#2F241B' }}
              id={`column-header-${column.id}`}
            >
              {column.name}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="px-2 py-0.5 text-xs font-semibold rounded-full"
              style={{
                backgroundColor: '#F5F1EC',
                color: '#6B5D52'
              }}
              aria-label={`${issueCount} issues`}
            >
              {issueCount}
            </span>
            {wipLimitExceeded && (
              <span
                className="text-xs font-semibold"
                style={{ color: '#C0392B' }}
                aria-label="WIP limit exceeded"
                role="status"
              >
                ⚠
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Issues - Hidden scrollbar */}
      <div
        className="flex-1 overflow-y-auto kanban-scrollbar-hidden p-4 space-y-4"
        role="list"
        aria-labelledby={`column-header-${column.id}`}
      >
        {column.issue_ids.map((issueId) => {
          const issue = issues[issueId];
          if (!issue) return null;

          const parentIssue = issue.parent_id ? issues[issue.parent_id] : null;

          return (
            <IssueCard
              key={issueId}
              issue={issue}
              parentIssue={parentIssue}
              allIssues={issues}  // NEW: Pass all issues for progress calculation
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
