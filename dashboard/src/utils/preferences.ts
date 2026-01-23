/**
 * User Preferences Management for Martha Tracker
 * Handles localStorage persistence for user preferences across views and boards
 */

export type ViewMode = 'kanban' | 'list' | 'timeline' | 'gantt';

export interface TrackerPreferences {
  version: number;

  // View preferences per board
  view: {
    [boardKey: string]: ViewMode;
  };

  // Timeline preferences per board
  timeline: {
    [boardKey: string]: {
      view: 'day' | 'week' | 'month';
      swimlaneMode: 'none' | 'assignee' | 'type' | 'priority' | 'status';
    };
  };

  // List preferences per board
  list: {
    [boardKey: string]: {
      density: 'compact' | 'normal' | 'comfortable';
      visibleColumns: string[];
      groupBy: 'none' | 'status' | 'type' | 'assignee' | 'priority';
    };
  };

  // Gantt preferences per board
  gantt: {
    [boardKey: string]: {
      view: 'day' | 'week' | 'month' | 'year';
      showCriticalPath: boolean;
      showDependencies: boolean;
      showSlackTimes: boolean;
      groupByEpic: boolean;
      resourcePanelOpen: boolean;
    };
  };

  // Kanban preferences per board
  kanban: {
    [boardKey: string]: {
      collapsedColumns: string[];
      swimlaneMode?: 'none' | 'assignee' | 'priority' | 'epic';
    };
  };

  // Global preferences
  global: {
    sidebarCollapsed: boolean;
    theme: 'light' | 'dark'; // for future
  };
}

const STORAGE_KEY = 'martha.tracker.preferences';
const CURRENT_VERSION = 1;

// Default preferences
export function getDefaultPreferences(): TrackerPreferences {
  return {
    version: CURRENT_VERSION,
    view: {},
    timeline: {},
    list: {},
    gantt: {},
    kanban: {},
    global: {
      sidebarCollapsed: false,
      theme: 'light',
    },
  };
}

// Load preferences from localStorage
export function loadPreferences(): TrackerPreferences {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as TrackerPreferences;

      // Version migration if needed
      if (!parsed.version || parsed.version < CURRENT_VERSION) {
        return migratePreferences(parsed);
      }

      // Merge with defaults to ensure all fields exist
      return mergeWithDefaults(parsed);
    }
  } catch (e) {
    console.error('Failed to parse preferences:', e);
    // Clear corrupted data
    localStorage.removeItem(STORAGE_KEY);
  }

  // Migrate old format if exists
  const migrated = migrateOldPreferences();
  if (migrated) {
    return migrated;
  }

  return getDefaultPreferences();
}

// Save preferences to localStorage
export function savePreferences(prefs: TrackerPreferences): void {
  try {
    // Check localStorage quota
    const serialized = JSON.stringify(prefs);

    // Warn if size is getting large (>500KB)
    if (serialized.length > 500000) {
      console.warn('Preferences size is large:', serialized.length, 'bytes');
    }

    localStorage.setItem(STORAGE_KEY, serialized);
  } catch (e) {
    if (e instanceof Error && e.name === 'QuotaExceededError') {
      console.error('localStorage quota exceeded. Clearing old preferences.');
      // Keep only global preferences and reset others
      const minimal: TrackerPreferences = {
        ...getDefaultPreferences(),
        global: prefs.global,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(minimal));
    } else {
      console.error('Failed to save preferences:', e);
    }
  }
}

// Merge preferences with defaults to ensure all fields exist
function mergeWithDefaults(prefs: Partial<TrackerPreferences>): TrackerPreferences {
  const defaults = getDefaultPreferences();
  return {
    version: CURRENT_VERSION,
    view: prefs.view || {},
    timeline: prefs.timeline || {},
    list: prefs.list || {},
    gantt: prefs.gantt || {},
    kanban: prefs.kanban || {},
    global: { ...defaults.global, ...prefs.global },
  };
}

// Migrate old version of preferences
function migratePreferences(oldPrefs: any): TrackerPreferences {
  console.log('Migrating preferences from version', oldPrefs.version, 'to', CURRENT_VERSION);

  // Currently only version 1, but this is where we'd handle migrations
  const migrated = mergeWithDefaults(oldPrefs);
  migrated.version = CURRENT_VERSION;

  return migrated;
}

// Migrate from old localStorage format (if it exists)
function migrateOldPreferences(): TrackerPreferences | null {
  try {
    const oldKeys = Object.keys(localStorage).filter(k =>
      k.startsWith('martha.timeline.') ||
      k.startsWith('martha.list.') ||
      k.startsWith('martha.view.')
    );

    if (oldKeys.length === 0) {
      return null;
    }

    console.log('Migrating old localStorage format:', oldKeys.length, 'keys');

    const prefs = getDefaultPreferences();

    oldKeys.forEach(key => {
      try {
        const value = localStorage.getItem(key);
        if (!value) return;

        // Parse old format: martha.{view}.{field}.{worktreeId}.{boardId}
        if (key.startsWith('martha.timeline.view.')) {
          const boardKey = key.replace('martha.timeline.view.', '');
          if (!prefs.timeline[boardKey]) {
            prefs.timeline[boardKey] = {
              view: value as any || 'week',
              swimlaneMode: 'none',
            };
          } else {
            prefs.timeline[boardKey].view = value as any;
          }
        } else if (key.startsWith('martha.timeline.swimlane.')) {
          const boardKey = key.replace('martha.timeline.swimlane.', '');
          if (!prefs.timeline[boardKey]) {
            prefs.timeline[boardKey] = {
              view: 'week',
              swimlaneMode: value as any || 'none',
            };
          } else {
            prefs.timeline[boardKey].swimlaneMode = value as any;
          }
        } else if (key.startsWith('martha.view.')) {
          const boardKey = key.replace('martha.view.', '');
          prefs.view[boardKey] = value as ViewMode;
        }

        // Remove old key
        localStorage.removeItem(key);
      } catch (e) {
        console.error('Failed to migrate key:', key, e);
      }
    });

    // Save migrated preferences
    savePreferences(prefs);

    return prefs;
  } catch (e) {
    console.error('Failed to migrate old preferences:', e);
    return null;
  }
}

// Helper: Generate board key from worktree and board IDs
export function getBoardKey(worktreeId: string, boardId: string): string {
  return `${worktreeId}.${boardId}`;
}

// Update view preference for a board
export function updateViewPreference(
  worktreeId: string,
  boardId: string,
  view: ViewMode
): void {
  const prefs = loadPreferences();
  const key = getBoardKey(worktreeId, boardId);
  prefs.view[key] = view;
  savePreferences(prefs);
}

// Get view preference for a board
export function getViewPreference(
  worktreeId: string,
  boardId: string
): ViewMode | undefined {
  const prefs = loadPreferences();
  const key = getBoardKey(worktreeId, boardId);
  return prefs.view[key];
}

// Update timeline preferences for a board
export function updateTimelinePreferences(
  worktreeId: string,
  boardId: string,
  updates: Partial<TrackerPreferences['timeline'][string]>
): void {
  const prefs = loadPreferences();
  const key = getBoardKey(worktreeId, boardId);
  prefs.timeline[key] = {
    view: 'week',
    swimlaneMode: 'none',
    ...prefs.timeline[key],
    ...updates,
  };
  savePreferences(prefs);
}

// Get timeline preferences for a board
export function getTimelinePreferences(
  worktreeId: string,
  boardId: string
): TrackerPreferences['timeline'][string] {
  const prefs = loadPreferences();
  const key = getBoardKey(worktreeId, boardId);
  return prefs.timeline[key] || { view: 'week', swimlaneMode: 'none' };
}

// Update list preferences for a board
export function updateListPreferences(
  worktreeId: string,
  boardId: string,
  updates: Partial<TrackerPreferences['list'][string]>
): void {
  const prefs = loadPreferences();
  const key = getBoardKey(worktreeId, boardId);
  prefs.list[key] = {
    density: 'normal',
    visibleColumns: ['id', 'title', 'type', 'status', 'assignee', 'priority', 'labels', 'progress'],
    groupBy: 'none',
    ...prefs.list[key],
    ...updates,
  };
  savePreferences(prefs);
}

// Get list preferences for a board
export function getListPreferences(
  worktreeId: string,
  boardId: string
): TrackerPreferences['list'][string] {
  const prefs = loadPreferences();
  const key = getBoardKey(worktreeId, boardId);
  return prefs.list[key] || {
    density: 'normal',
    visibleColumns: ['id', 'title', 'type', 'status', 'assignee', 'priority', 'labels', 'progress'],
    groupBy: 'none',
  };
}

// Update gantt preferences for a board
export function updateGanttPreferences(
  worktreeId: string,
  boardId: string,
  updates: Partial<TrackerPreferences['gantt'][string]>
): void {
  const prefs = loadPreferences();
  const key = getBoardKey(worktreeId, boardId);
  prefs.gantt[key] = {
    view: 'week',
    showCriticalPath: true,
    showDependencies: true,
    showSlackTimes: false,
    groupByEpic: false,
    resourcePanelOpen: true,
    ...prefs.gantt[key],
    ...updates,
  };
  savePreferences(prefs);
}

// Get gantt preferences for a board
export function getGanttPreferences(
  worktreeId: string,
  boardId: string
): TrackerPreferences['gantt'][string] {
  const prefs = loadPreferences();
  const key = getBoardKey(worktreeId, boardId);
  return prefs.gantt[key] || {
    view: 'week',
    showCriticalPath: true,
    showDependencies: true,
    showSlackTimes: false,
    groupByEpic: false,
    resourcePanelOpen: true,
  };
}

// Update kanban preferences for a board
export function updateKanbanPreferences(
  worktreeId: string,
  boardId: string,
  updates: Partial<TrackerPreferences['kanban'][string]>
): void {
  const prefs = loadPreferences();
  const key = getBoardKey(worktreeId, boardId);
  prefs.kanban[key] = {
    collapsedColumns: [],
    swimlaneMode: 'none',
    ...prefs.kanban[key],
    ...updates,
  };
  savePreferences(prefs);
}

// Get kanban preferences for a board
export function getKanbanPreferences(
  worktreeId: string,
  boardId: string
): TrackerPreferences['kanban'][string] {
  const prefs = loadPreferences();
  const key = getBoardKey(worktreeId, boardId);
  return prefs.kanban[key] || {
    collapsedColumns: [],
    swimlaneMode: 'none',
  };
}

// Update global preferences
export function updateGlobalPreferences(
  updates: Partial<TrackerPreferences['global']>
): void {
  const prefs = loadPreferences();
  prefs.global = { ...prefs.global, ...updates };
  savePreferences(prefs);
}

// Get global preferences
export function getGlobalPreferences(): TrackerPreferences['global'] {
  const prefs = loadPreferences();
  return prefs.global;
}

// Export preferences as JSON
export function exportPreferences(): string {
  const prefs = loadPreferences();
  return JSON.stringify(prefs, null, 2);
}

// Import preferences from JSON
export function importPreferences(json: string): boolean {
  try {
    const parsed = JSON.parse(json) as TrackerPreferences;

    // Validate structure
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Invalid preferences format');
    }

    // Merge with defaults and save
    const merged = mergeWithDefaults(parsed);
    savePreferences(merged);

    return true;
  } catch (e) {
    console.error('Failed to import preferences:', e);
    return false;
  }
}

// Reset all preferences to defaults
export function resetPreferences(): void {
  const defaults = getDefaultPreferences();
  savePreferences(defaults);
}

// Clean up old board preferences (remove boards that no longer exist)
export function cleanupPreferences(validBoardKeys: string[]): void {
  const prefs = loadPreferences();
  const validSet = new Set(validBoardKeys);

  let modified = false;

  // Clean up view preferences
  Object.keys(prefs.view).forEach(key => {
    if (!validSet.has(key)) {
      delete prefs.view[key];
      modified = true;
    }
  });

  // Clean up timeline preferences
  Object.keys(prefs.timeline).forEach(key => {
    if (!validSet.has(key)) {
      delete prefs.timeline[key];
      modified = true;
    }
  });

  // Clean up list preferences
  Object.keys(prefs.list).forEach(key => {
    if (!validSet.has(key)) {
      delete prefs.list[key];
      modified = true;
    }
  });

  // Clean up gantt preferences
  Object.keys(prefs.gantt).forEach(key => {
    if (!validSet.has(key)) {
      delete prefs.gantt[key];
      modified = true;
    }
  });

  // Clean up kanban preferences
  Object.keys(prefs.kanban).forEach(key => {
    if (!validSet.has(key)) {
      delete prefs.kanban[key];
      modified = true;
    }
  });

  if (modified) {
    console.log('Cleaned up preferences for deleted boards');
    savePreferences(prefs);
  }
}
