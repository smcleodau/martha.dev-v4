/**
 * Kanban Board Component
 *
 * Main kanban board container that displays issues in columns organized by status.
 * Supports drag-and-drop for moving issues between columns.
 *
 * @component
 * @example
 * ```tsx
 * <KanbanBoard
 *   board={boardData}
 *   issues={issuesMap}
 *   onIssueClick={(id) => setSelectedIssue(id)}
 *   onIssueMove={(id, status) => updateIssueStatus(id, status)}
 * />
 * ```
 */

import { type Issue, type Board } from '../../../api/tracker';
import { KanbanColumn } from './KanbanColumn';
import { useDragAndDrop } from '../shared/hooks';

/**
 * Props for the KanbanBoard component
 */
interface KanbanBoardProps {
  /** Board configuration including columns and metadata */
  board: Board;
  /** Map of issue IDs to issue objects */
  issues: Record<string, Issue>;
  /** Callback when an issue card is clicked */
  onIssueClick: (issueId: string) => void;
  /** Callback when an issue is moved to a new status */
  onIssueMove: (issueId: string, newStatus: string) => void;
}

/**
 * Renders a kanban board with draggable issue cards organized by status columns.
 *
 * Features:
 * - Horizontal scrolling for many columns
 * - Drag and drop between columns
 * - Visual feedback during drag operations
 * - Accessible keyboard navigation
 * - Responsive card layout
 *
 * @param props - Component props
 * @returns Kanban board JSX element
 */
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
    <div
      className="flex-1 overflow-x-auto kanban-scrollbar-subtle"
      style={{ backgroundColor: '#F5F1EC' }}
      role="region"
      aria-label="Kanban board"
    >
      <div
        className="flex h-full p-6 space-x-4 min-w-min"
        role="list"
        aria-label="Kanban columns"
      >
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
