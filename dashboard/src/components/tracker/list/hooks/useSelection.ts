/**
 * useSelection Hook
 * Custom hook for managing row selection state in list view
 */

import { useState, useCallback } from 'react';

interface UseSelectionOptions {
  onSelectionChange?: (selectedIds: string[]) => void;
}

export function useSelection(options: UseSelectionOptions = {}) {
  const [selectedIssues, setSelectedIssues] = useState<Set<string>>(new Set());

  const toggleSelection = useCallback((issueId: string) => {
    setSelectedIssues(prev => {
      const next = new Set(prev);
      if (next.has(issueId)) {
        next.delete(issueId);
      } else {
        next.add(issueId);
      }

      if (options.onSelectionChange) {
        options.onSelectionChange(Array.from(next));
      }

      return next;
    });
  }, [options]);

  const selectAll = useCallback((issueIds: string[]) => {
    const next = new Set(issueIds);
    setSelectedIssues(next);

    if (options.onSelectionChange) {
      options.onSelectionChange(Array.from(next));
    }
  }, [options]);

  const clearSelection = useCallback(() => {
    setSelectedIssues(new Set());

    if (options.onSelectionChange) {
      options.onSelectionChange([]);
    }
  }, [options]);

  const isSelected = useCallback((issueId: string): boolean => {
    return selectedIssues.has(issueId);
  }, [selectedIssues]);

  const isAllSelected = useCallback((issueIds: string[]): boolean => {
    if (issueIds.length === 0) return false;
    return issueIds.every(id => selectedIssues.has(id));
  }, [selectedIssues]);

  const toggleSelectAll = useCallback((issueIds: string[]) => {
    if (isAllSelected(issueIds)) {
      clearSelection();
    } else {
      selectAll(issueIds);
    }
  }, [isAllSelected, clearSelection, selectAll]);

  return {
    selectedIssues: Array.from(selectedIssues),
    selectedCount: selectedIssues.size,
    toggleSelection,
    selectAll,
    clearSelection,
    isSelected,
    isAllSelected,
    toggleSelectAll
  };
}
