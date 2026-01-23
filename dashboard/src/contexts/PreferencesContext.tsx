/**
 * Preferences Context Provider
 * React context for managing user preferences across the tracker application
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import {
  TrackerPreferences,
  ViewMode,
  loadPreferences,
  savePreferences,
  getBoardKey,
  getDefaultPreferences,
} from '../utils/preferences';

interface PreferencesContextValue {
  preferences: TrackerPreferences;
  updatePreferences: (updates: Partial<TrackerPreferences>) => void;

  // View preferences
  getViewPreference: (worktreeId: string, boardId: string) => ViewMode | undefined;
  setViewPreference: (worktreeId: string, boardId: string, view: ViewMode) => void;

  // Timeline preferences
  getTimelinePreferences: (worktreeId: string, boardId: string) => TrackerPreferences['timeline'][string];
  setTimelinePreferences: (
    worktreeId: string,
    boardId: string,
    updates: Partial<TrackerPreferences['timeline'][string]>
  ) => void;

  // List preferences
  getListPreferences: (worktreeId: string, boardId: string) => TrackerPreferences['list'][string];
  setListPreferences: (
    worktreeId: string,
    boardId: string,
    updates: Partial<TrackerPreferences['list'][string]>
  ) => void;

  // Gantt preferences
  getGanttPreferences: (worktreeId: string, boardId: string) => TrackerPreferences['gantt'][string];
  setGanttPreferences: (
    worktreeId: string,
    boardId: string,
    updates: Partial<TrackerPreferences['gantt'][string]>
  ) => void;

  // Kanban preferences
  getKanbanPreferences: (worktreeId: string, boardId: string) => TrackerPreferences['kanban'][string];
  setKanbanPreferences: (
    worktreeId: string,
    boardId: string,
    updates: Partial<TrackerPreferences['kanban'][string]>
  ) => void;

  // Global preferences
  getGlobalPreferences: () => TrackerPreferences['global'];
  setGlobalPreferences: (updates: Partial<TrackerPreferences['global']>) => void;

  // Utility functions
  exportPreferences: () => string;
  importPreferences: (json: string) => boolean;
  resetPreferences: () => void;
}

const PreferencesContext = createContext<PreferencesContextValue | undefined>(undefined);

export const PreferencesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [preferences, setPreferences] = useState<TrackerPreferences>(() => loadPreferences());

  // Listen for storage events (multi-tab sync)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'martha.tracker.preferences' && e.newValue) {
        try {
          const newPrefs = JSON.parse(e.newValue) as TrackerPreferences;
          setPreferences(newPrefs);
          console.log('Preferences synced from another tab');
        } catch (err) {
          console.error('Failed to sync preferences from storage event:', err);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Update preferences (generic)
  const updatePreferences = useCallback((updates: Partial<TrackerPreferences>) => {
    setPreferences(prev => {
      const updated = { ...prev, ...updates };
      savePreferences(updated);
      return updated;
    });
  }, []);

  // View preferences
  const getViewPreference = useCallback(
    (worktreeId: string, boardId: string): ViewMode | undefined => {
      const key = getBoardKey(worktreeId, boardId);
      return preferences.view[key];
    },
    [preferences]
  );

  const setViewPreference = useCallback(
    (worktreeId: string, boardId: string, view: ViewMode) => {
      const key = getBoardKey(worktreeId, boardId);
      setPreferences(prev => {
        const updated = {
          ...prev,
          view: { ...prev.view, [key]: view },
        };
        savePreferences(updated);
        return updated;
      });
    },
    []
  );

  // Timeline preferences
  const getTimelinePreferences = useCallback(
    (worktreeId: string, boardId: string): TrackerPreferences['timeline'][string] => {
      const key = getBoardKey(worktreeId, boardId);
      return preferences.timeline[key] || { view: 'week', swimlaneMode: 'none' };
    },
    [preferences]
  );

  const setTimelinePreferences = useCallback(
    (
      worktreeId: string,
      boardId: string,
      updates: Partial<TrackerPreferences['timeline'][string]>
    ) => {
      const key = getBoardKey(worktreeId, boardId);
      setPreferences(prev => {
        const current = prev.timeline[key] || { view: 'week', swimlaneMode: 'none' };
        const updated = {
          ...prev,
          timeline: {
            ...prev.timeline,
            [key]: { ...current, ...updates },
          },
        };
        savePreferences(updated);
        return updated;
      });
    },
    []
  );

  // List preferences
  const getListPreferences = useCallback(
    (worktreeId: string, boardId: string): TrackerPreferences['list'][string] => {
      const key = getBoardKey(worktreeId, boardId);
      return preferences.list[key] || {
        density: 'normal',
        visibleColumns: ['id', 'title', 'type', 'status', 'assignee', 'priority', 'labels', 'progress'],
        groupBy: 'none',
      };
    },
    [preferences]
  );

  const setListPreferences = useCallback(
    (
      worktreeId: string,
      boardId: string,
      updates: Partial<TrackerPreferences['list'][string]>
    ) => {
      const key = getBoardKey(worktreeId, boardId);
      setPreferences(prev => {
        const current = prev.list[key] || {
          density: 'normal',
          visibleColumns: ['id', 'title', 'type', 'status', 'assignee', 'priority', 'labels', 'progress'],
          groupBy: 'none',
        };
        const updated = {
          ...prev,
          list: {
            ...prev.list,
            [key]: { ...current, ...updates },
          },
        };
        savePreferences(updated);
        return updated;
      });
    },
    []
  );

  // Gantt preferences
  const getGanttPreferences = useCallback(
    (worktreeId: string, boardId: string): TrackerPreferences['gantt'][string] => {
      const key = getBoardKey(worktreeId, boardId);
      return preferences.gantt[key] || {
        view: 'week',
        showCriticalPath: true,
        showDependencies: true,
        showSlackTimes: false,
        groupByEpic: false,
        resourcePanelOpen: true,
      };
    },
    [preferences]
  );

  const setGanttPreferences = useCallback(
    (
      worktreeId: string,
      boardId: string,
      updates: Partial<TrackerPreferences['gantt'][string]>
    ) => {
      const key = getBoardKey(worktreeId, boardId);
      setPreferences(prev => {
        const current = prev.gantt[key] || {
          view: 'week',
          showCriticalPath: true,
          showDependencies: true,
          showSlackTimes: false,
          groupByEpic: false,
          resourcePanelOpen: true,
        };
        const updated = {
          ...prev,
          gantt: {
            ...prev.gantt,
            [key]: { ...current, ...updates },
          },
        };
        savePreferences(updated);
        return updated;
      });
    },
    []
  );

  // Kanban preferences
  const getKanbanPreferences = useCallback(
    (worktreeId: string, boardId: string): TrackerPreferences['kanban'][string] => {
      const key = getBoardKey(worktreeId, boardId);
      return preferences.kanban[key] || {
        collapsedColumns: [],
        swimlaneMode: 'none',
      };
    },
    [preferences]
  );

  const setKanbanPreferences = useCallback(
    (
      worktreeId: string,
      boardId: string,
      updates: Partial<TrackerPreferences['kanban'][string]>
    ) => {
      const key = getBoardKey(worktreeId, boardId);
      setPreferences(prev => {
        const current = prev.kanban[key] || {
          collapsedColumns: [],
          swimlaneMode: 'none',
        };
        const updated = {
          ...prev,
          kanban: {
            ...prev.kanban,
            [key]: { ...current, ...updates },
          },
        };
        savePreferences(updated);
        return updated;
      });
    },
    []
  );

  // Global preferences
  const getGlobalPreferences = useCallback((): TrackerPreferences['global'] => {
    return preferences.global;
  }, [preferences]);

  const setGlobalPreferences = useCallback(
    (updates: Partial<TrackerPreferences['global']>) => {
      setPreferences(prev => {
        const updated = {
          ...prev,
          global: { ...prev.global, ...updates },
        };
        savePreferences(updated);
        return updated;
      });
    },
    []
  );

  // Export/Import/Reset
  const exportPreferences = useCallback((): string => {
    return JSON.stringify(preferences, null, 2);
  }, [preferences]);

  const importPreferences = useCallback((json: string): boolean => {
    try {
      const parsed = JSON.parse(json) as TrackerPreferences;

      // Validate structure
      if (!parsed || typeof parsed !== 'object') {
        throw new Error('Invalid preferences format');
      }

      // Update state and save
      setPreferences(parsed);
      savePreferences(parsed);

      return true;
    } catch (e) {
      console.error('Failed to import preferences:', e);
      return false;
    }
  }, []);

  const resetPreferences = useCallback(() => {
    const defaults = getDefaultPreferences();
    setPreferences(defaults);
    savePreferences(defaults);
  }, []);

  const value: PreferencesContextValue = {
    preferences,
    updatePreferences,
    getViewPreference,
    setViewPreference,
    getTimelinePreferences,
    setTimelinePreferences,
    getListPreferences,
    setListPreferences,
    getGanttPreferences,
    setGanttPreferences,
    getKanbanPreferences,
    setKanbanPreferences,
    getGlobalPreferences,
    setGlobalPreferences,
    exportPreferences,
    importPreferences,
    resetPreferences,
  };

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
};

// Custom hook to use preferences
export const usePreferences = (): PreferencesContextValue => {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error('usePreferences must be used within a PreferencesProvider');
  }
  return context;
};
