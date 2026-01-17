/**
 * Shared hooks for tracker components
 */

import { useState, type DragEvent } from 'react';

// Drag and drop state management
export function useDragAndDrop() {
  const [draggedIssueId, setDraggedIssueId] = useState<string | null>(null);
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null);

  const handleDragStart = (issueId: string) => (e: DragEvent) => {
    setDraggedIssueId(issueId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', issueId);

    // Make the drag preview slightly transparent
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5';
    }
  };

  const handleDragEnd = () => (e: DragEvent) => {
    setDraggedIssueId(null);
    setDragOverColumnId(null);

    // Reset opacity
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1';
    }
  };

  const handleDragOver = (columnId: string) => (e: DragEvent) => {
    e.preventDefault(); // Required to allow drop
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumnId(columnId);
  };

  const handleDragLeave = () => (_e: DragEvent) => {
    setDragOverColumnId(null);
  };

  const handleDrop = (columnId: string, onMove: (issueId: string, newStatus: string) => void) => (e: DragEvent) => {
    e.preventDefault();
    const issueId = e.dataTransfer.getData('text/plain');

    if (issueId && issueId !== draggedIssueId) {
      console.warn('Dragged issue ID mismatch');
      return;
    }

    if (issueId) {
      onMove(issueId, columnId);
    }

    setDraggedIssueId(null);
    setDragOverColumnId(null);
  };

  return {
    draggedIssueId,
    dragOverColumnId,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  };
}
