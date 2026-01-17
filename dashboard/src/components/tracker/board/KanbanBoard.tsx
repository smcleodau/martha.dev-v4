/**
 * Kanban Board Component - Main board container
 */

import { type Issue, type Board } from '../../../api/tracker';
import { KanbanColumn } from './KanbanColumn';
import { useDragAndDrop } from '../shared/hooks';

interface KanbanBoardProps {
  board: Board;
  issues: Record<string, Issue>;
  onIssueClick: (issueId: string) => void;
  onIssueMove: (issueId: string, newStatus: string) => void;
}

export function KanbanBoard({ board, issues, onIssueClick, onIssueMove }: KanbanBoardProps) {
  const {
    draggedIssueId,
    dragOverColumnId,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  } = useDragAndDrop();

  return (
    <div className="flex-1 overflow-x-auto" style={{ backgroundColor: '#F5F1ED' }}>
      <div className="flex h-full p-6 space-x-4">
        {board.columns.map((column) => (
          <KanbanColumn
            key={column.id}
            column={column}
            issues={issues}
            onIssueClick={onIssueClick}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={(columnId) => handleDrop(columnId, onIssueMove)}
            draggedIssueId={draggedIssueId}
            isDragOver={dragOverColumnId === column.id}
          />
        ))}
      </div>
    </div>
  );
}
