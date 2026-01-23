/**
 * Custom hooks for view-specific preferences
 * Provides convenient access to preferences for each view type
 */

import { useCallback } from 'react';
import { usePreferences } from '../contexts/PreferencesContext';
import { TrackerPreferences } from './preferences';

/**
 * Hook for Timeline view preferences
 */
export function useTimelinePreferences(worktreeId: string, boardId: string) {
  const { getTimelinePreferences, setTimelinePreferences } = usePreferences();

  const prefs = getTimelinePreferences(worktreeId, boardId);

  const setView = useCallback(
    (view: 'day' | 'week' | 'month') => {
      setTimelinePreferences(worktreeId, boardId, { view });
    },
    [worktreeId, boardId, setTimelinePreferences]
  );

  const setSwimlaneMode = useCallback(
    (mode: 'none' | 'assignee' | 'type' | 'priority' | 'status') => {
      setTimelinePreferences(worktreeId, boardId, { swimlaneMode: mode });
    },
    [worktreeId, boardId, setTimelinePreferences]
  );

  const updatePreferences = useCallback(
    (updates: Partial<TrackerPreferences['timeline'][string]>) => {
      setTimelinePreferences(worktreeId, boardId, updates);
    },
    [worktreeId, boardId, setTimelinePreferences]
  );

  return {
    view: prefs.view,
    swimlaneMode: prefs.swimlaneMode,
    setView,
    setSwimlaneMode,
    updatePreferences,
  };
}

/**
 * Hook for List view preferences
 */
export function useListPreferences(worktreeId: string, boardId: string) {
  const { getListPreferences, setListPreferences } = usePreferences();

  const prefs = getListPreferences(worktreeId, boardId);

  const setDensity = useCallback(
    (density: 'compact' | 'normal' | 'comfortable') => {
      setListPreferences(worktreeId, boardId, { density });
    },
    [worktreeId, boardId, setListPreferences]
  );

  const setVisibleColumns = useCallback(
    (columns: string[]) => {
      setListPreferences(worktreeId, boardId, { visibleColumns: columns });
    },
    [worktreeId, boardId, setListPreferences]
  );

  const setGroupBy = useCallback(
    (groupBy: 'none' | 'status' | 'type' | 'assignee' | 'priority') => {
      setListPreferences(worktreeId, boardId, { groupBy });
    },
    [worktreeId, boardId, setListPreferences]
  );

  const updatePreferences = useCallback(
    (updates: Partial<TrackerPreferences['list'][string]>) => {
      setListPreferences(worktreeId, boardId, updates);
    },
    [worktreeId, boardId, setListPreferences]
  );

  return {
    density: prefs.density,
    visibleColumns: prefs.visibleColumns,
    groupBy: prefs.groupBy,
    setDensity,
    setVisibleColumns,
    setGroupBy,
    updatePreferences,
  };
}

/**
 * Hook for Gantt view preferences
 */
export function useGanttPreferences(worktreeId: string, boardId: string) {
  const { getGanttPreferences, setGanttPreferences } = usePreferences();

  const prefs = getGanttPreferences(worktreeId, boardId);

  const setView = useCallback(
    (view: 'day' | 'week' | 'month' | 'year') => {
      setGanttPreferences(worktreeId, boardId, { view });
    },
    [worktreeId, boardId, setGanttPreferences]
  );

  const setShowCriticalPath = useCallback(
    (show: boolean) => {
      setGanttPreferences(worktreeId, boardId, { showCriticalPath: show });
    },
    [worktreeId, boardId, setGanttPreferences]
  );

  const setShowDependencies = useCallback(
    (show: boolean) => {
      setGanttPreferences(worktreeId, boardId, { showDependencies: show });
    },
    [worktreeId, boardId, setGanttPreferences]
  );

  const setShowSlackTimes = useCallback(
    (show: boolean) => {
      setGanttPreferences(worktreeId, boardId, { showSlackTimes: show });
    },
    [worktreeId, boardId, setGanttPreferences]
  );

  const setGroupByEpic = useCallback(
    (group: boolean) => {
      setGanttPreferences(worktreeId, boardId, { groupByEpic: group });
    },
    [worktreeId, boardId, setGanttPreferences]
  );

  const setResourcePanelOpen = useCallback(
    (open: boolean) => {
      setGanttPreferences(worktreeId, boardId, { resourcePanelOpen: open });
    },
    [worktreeId, boardId, setGanttPreferences]
  );

  const updatePreferences = useCallback(
    (updates: Partial<TrackerPreferences['gantt'][string]>) => {
      setGanttPreferences(worktreeId, boardId, updates);
    },
    [worktreeId, boardId, setGanttPreferences]
  );

  return {
    view: prefs.view,
    showCriticalPath: prefs.showCriticalPath,
    showDependencies: prefs.showDependencies,
    showSlackTimes: prefs.showSlackTimes,
    groupByEpic: prefs.groupByEpic,
    resourcePanelOpen: prefs.resourcePanelOpen,
    setView,
    setShowCriticalPath,
    setShowDependencies,
    setShowSlackTimes,
    setGroupByEpic,
    setResourcePanelOpen,
    updatePreferences,
  };
}

/**
 * Hook for Kanban view preferences
 */
export function useKanbanPreferences(worktreeId: string, boardId: string) {
  const { getKanbanPreferences, setKanbanPreferences } = usePreferences();

  const prefs = getKanbanPreferences(worktreeId, boardId);

  const setCollapsedColumns = useCallback(
    (columns: string[]) => {
      setKanbanPreferences(worktreeId, boardId, { collapsedColumns: columns });
    },
    [worktreeId, boardId, setKanbanPreferences]
  );

  const toggleColumnCollapse = useCallback(
    (columnId: string) => {
      const current = prefs.collapsedColumns;
      const isCollapsed = current.includes(columnId);

      const updated = isCollapsed
        ? current.filter(id => id !== columnId)
        : [...current, columnId];

      setKanbanPreferences(worktreeId, boardId, { collapsedColumns: updated });
    },
    [worktreeId, boardId, prefs.collapsedColumns, setKanbanPreferences]
  );

  const setSwimlaneMode = useCallback(
    (mode: 'none' | 'assignee' | 'priority' | 'epic') => {
      setKanbanPreferences(worktreeId, boardId, { swimlaneMode: mode });
    },
    [worktreeId, boardId, setKanbanPreferences]
  );

  const updatePreferences = useCallback(
    (updates: Partial<TrackerPreferences['kanban'][string]>) => {
      setKanbanPreferences(worktreeId, boardId, updates);
    },
    [worktreeId, boardId, setKanbanPreferences]
  );

  return {
    collapsedColumns: prefs.collapsedColumns,
    swimlaneMode: prefs.swimlaneMode,
    setCollapsedColumns,
    toggleColumnCollapse,
    setSwimlaneMode,
    updatePreferences,
  };
}

/**
 * Hook for global preferences
 */
export function useGlobalPreferences() {
  const { getGlobalPreferences, setGlobalPreferences } = usePreferences();

  const prefs = getGlobalPreferences();

  const setSidebarCollapsed = useCallback(
    (collapsed: boolean) => {
      setGlobalPreferences({ sidebarCollapsed: collapsed });
    },
    [setGlobalPreferences]
  );

  const setTheme = useCallback(
    (theme: 'light' | 'dark') => {
      setGlobalPreferences({ theme });
    },
    [setGlobalPreferences]
  );

  const updatePreferences = useCallback(
    (updates: Partial<TrackerPreferences['global']>) => {
      setGlobalPreferences(updates);
    },
    [setGlobalPreferences]
  );

  return {
    sidebarCollapsed: prefs.sidebarCollapsed,
    theme: prefs.theme,
    setSidebarCollapsed,
    setTheme,
    updatePreferences,
  };
}
