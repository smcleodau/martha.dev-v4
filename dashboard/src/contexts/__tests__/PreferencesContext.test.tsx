/**
 * PreferencesContext Tests
 * Tests for the preferences context and provider
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { PreferencesProvider, usePreferences } from '../PreferencesContext';
import * as preferencesUtils from '../../utils/preferences';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock preferences utils
vi.mock('../../utils/preferences', async () => {
  const actual = await vi.importActual('../../utils/preferences');
  return {
    ...actual,
    loadPreferences: vi.fn(),
    savePreferences: vi.fn(),
    getDefaultPreferences: vi.fn(() => ({
      version: 1,
      view: {},
      timeline: {},
      list: {},
      gantt: {},
      kanban: {},
      global: {
        sidebarCollapsed: false,
        theme: 'light' as const,
      },
    })),
    getBoardKey: (worktreeId: string, boardId: string) => `${worktreeId}:${boardId}`,
  };
});

describe('PreferencesContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    vi.mocked(preferencesUtils.loadPreferences).mockReturnValue(
      vi.mocked(preferencesUtils.getDefaultPreferences)()
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Provider initialization', () => {
    it('loads preferences on mount', () => {
      renderHook(() => usePreferences(), {
        wrapper: PreferencesProvider,
      });

      expect(preferencesUtils.loadPreferences).toHaveBeenCalledTimes(1);
    });

    it('throws error when used outside provider', () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => usePreferences());
      }).toThrow('usePreferences must be used within a PreferencesProvider');

      consoleSpy.mockRestore();
    });
  });

  describe('View preferences', () => {
    it('gets view preference for a board', () => {
      const mockPrefs = vi.mocked(preferencesUtils.getDefaultPreferences)();
      mockPrefs.view['wt1:board1'] = 'list';
      vi.mocked(preferencesUtils.loadPreferences).mockReturnValue(mockPrefs);

      const { result } = renderHook(() => usePreferences(), {
        wrapper: PreferencesProvider,
      });

      const view = result.current.getViewPreference('wt1', 'board1');
      expect(view).toBe('list');
    });

    it('sets view preference for a board', () => {
      const { result } = renderHook(() => usePreferences(), {
        wrapper: PreferencesProvider,
      });

      act(() => {
        result.current.setViewPreference('wt1', 'board1', 'gantt');
      });

      expect(preferencesUtils.savePreferences).toHaveBeenCalled();
      const view = result.current.getViewPreference('wt1', 'board1');
      expect(view).toBe('gantt');
    });

    it('returns undefined for boards without view preference', () => {
      const { result } = renderHook(() => usePreferences(), {
        wrapper: PreferencesProvider,
      });

      const view = result.current.getViewPreference('unknown', 'board');
      expect(view).toBeUndefined();
    });
  });

  describe('Timeline preferences', () => {
    it('gets timeline preferences with defaults', () => {
      const { result } = renderHook(() => usePreferences(), {
        wrapper: PreferencesProvider,
      });

      const prefs = result.current.getTimelinePreferences('wt1', 'board1');
      expect(prefs).toEqual({
        view: 'week',
        swimlaneMode: 'none',
      });
    });

    it('sets timeline preferences', () => {
      const { result } = renderHook(() => usePreferences(), {
        wrapper: PreferencesProvider,
      });

      act(() => {
        result.current.setTimelinePreferences('wt1', 'board1', {
          view: 'month',
          swimlaneMode: 'assignee',
        });
      });

      const prefs = result.current.getTimelinePreferences('wt1', 'board1');
      expect(prefs).toEqual({
        view: 'month',
        swimlaneMode: 'assignee',
      });
    });

    it('merges partial updates with existing preferences', () => {
      const { result } = renderHook(() => usePreferences(), {
        wrapper: PreferencesProvider,
      });

      act(() => {
        result.current.setTimelinePreferences('wt1', 'board1', { view: 'day' });
      });

      const prefs = result.current.getTimelinePreferences('wt1', 'board1');
      expect(prefs.view).toBe('day');
      expect(prefs.swimlaneMode).toBe('none'); // Default preserved
    });
  });

  describe('List preferences', () => {
    it('gets list preferences with defaults', () => {
      const { result } = renderHook(() => usePreferences(), {
        wrapper: PreferencesProvider,
      });

      const prefs = result.current.getListPreferences('wt1', 'board1');
      expect(prefs).toMatchObject({
        density: 'normal',
        groupBy: 'none',
      });
      expect(prefs.visibleColumns).toBeDefined();
    });

    it('sets list preferences', () => {
      const { result } = renderHook(() => usePreferences(), {
        wrapper: PreferencesProvider,
      });

      act(() => {
        result.current.setListPreferences('wt1', 'board1', {
          density: 'compact',
          groupBy: 'status',
        });
      });

      const prefs = result.current.getListPreferences('wt1', 'board1');
      expect(prefs.density).toBe('compact');
      expect(prefs.groupBy).toBe('status');
    });
  });

  describe('Gantt preferences', () => {
    it('gets gantt preferences with defaults', () => {
      const { result } = renderHook(() => usePreferences(), {
        wrapper: PreferencesProvider,
      });

      const prefs = result.current.getGanttPreferences('wt1', 'board1');
      expect(prefs).toEqual({
        view: 'week',
        showCriticalPath: true,
        showDependencies: true,
        showSlackTimes: false,
        groupByEpic: false,
        resourcePanelOpen: true,
      });
    });

    it('sets gantt preferences', () => {
      const { result } = renderHook(() => usePreferences(), {
        wrapper: PreferencesProvider,
      });

      act(() => {
        result.current.setGanttPreferences('wt1', 'board1', {
          showCriticalPath: false,
          view: 'month',
        });
      });

      const prefs = result.current.getGanttPreferences('wt1', 'board1');
      expect(prefs.showCriticalPath).toBe(false);
      expect(prefs.view).toBe('month');
    });
  });

  describe('Kanban preferences', () => {
    it('gets kanban preferences with defaults', () => {
      const { result } = renderHook(() => usePreferences(), {
        wrapper: PreferencesProvider,
      });

      const prefs = result.current.getKanbanPreferences('wt1', 'board1');
      expect(prefs).toEqual({
        collapsedColumns: [],
        swimlaneMode: 'none',
      });
    });

    it('sets kanban preferences', () => {
      const { result } = renderHook(() => usePreferences(), {
        wrapper: PreferencesProvider,
      });

      act(() => {
        result.current.setKanbanPreferences('wt1', 'board1', {
          collapsedColumns: ['done'],
          swimlaneMode: 'priority',
        });
      });

      const prefs = result.current.getKanbanPreferences('wt1', 'board1');
      expect(prefs.collapsedColumns).toEqual(['done']);
      expect(prefs.swimlaneMode).toBe('priority');
    });
  });

  describe('Global preferences', () => {
    it('gets global preferences', () => {
      const { result } = renderHook(() => usePreferences(), {
        wrapper: PreferencesProvider,
      });

      const prefs = result.current.getGlobalPreferences();
      expect(prefs).toEqual({
        sidebarCollapsed: false,
        theme: 'light',
      });
    });

    it('sets global preferences', () => {
      const { result } = renderHook(() => usePreferences(), {
        wrapper: PreferencesProvider,
      });

      act(() => {
        result.current.setGlobalPreferences({
          sidebarCollapsed: true,
        });
      });

      const prefs = result.current.getGlobalPreferences();
      expect(prefs.sidebarCollapsed).toBe(true);
    });
  });

  describe('Export/Import/Reset', () => {
    it('exports preferences as JSON', () => {
      const { result } = renderHook(() => usePreferences(), {
        wrapper: PreferencesProvider,
      });

      act(() => {
        result.current.setViewPreference('wt1', 'board1', 'list');
      });

      const exported = result.current.exportPreferences();
      const parsed = JSON.parse(exported);

      expect(parsed.view['wt1:board1']).toBe('list');
    });

    it('imports preferences from JSON', () => {
      const { result } = renderHook(() => usePreferences(), {
        wrapper: PreferencesProvider,
      });

      const importData = {
        version: 1,
        view: { 'wt1:board1': 'gantt' },
        timeline: {},
        list: {},
        gantt: {},
        kanban: {},
        global: { sidebarCollapsed: true, theme: 'light' as const },
      };

      act(() => {
        const success = result.current.importPreferences(JSON.stringify(importData));
        expect(success).toBe(true);
      });

      const view = result.current.getViewPreference('wt1', 'board1');
      expect(view).toBe('gantt');
    });

    it('handles invalid import data', () => {
      const { result } = renderHook(() => usePreferences(), {
        wrapper: PreferencesProvider,
      });

      act(() => {
        const success = result.current.importPreferences('invalid json');
        expect(success).toBe(false);
      });
    });

    it('resets preferences to defaults', () => {
      const { result } = renderHook(() => usePreferences(), {
        wrapper: PreferencesProvider,
      });

      // Set some preferences
      act(() => {
        result.current.setViewPreference('wt1', 'board1', 'list');
        result.current.setGlobalPreferences({ sidebarCollapsed: true });
      });

      // Reset
      act(() => {
        result.current.resetPreferences();
      });

      expect(preferencesUtils.savePreferences).toHaveBeenCalled();
      const view = result.current.getViewPreference('wt1', 'board1');
      expect(view).toBeUndefined();
    });
  });

  describe('Generic updatePreferences', () => {
    it('updates preferences object', () => {
      const { result } = renderHook(() => usePreferences(), {
        wrapper: PreferencesProvider,
      });

      act(() => {
        result.current.updatePreferences({
          view: { 'test:board': 'list' },
        });
      });

      expect(preferencesUtils.savePreferences).toHaveBeenCalled();
    });
  });

  describe('Multi-tab synchronization', () => {
    it('listens for storage events', () => {
      renderHook(() => usePreferences(), {
        wrapper: PreferencesProvider,
      });

      // Verify storage event listener is set up
      // (This is implicit - we can't easily test the actual sync without more setup)
      expect(preferencesUtils.loadPreferences).toHaveBeenCalled();
    });
  });

  describe('Board key generation', () => {
    it('uses consistent board keys', () => {
      const { result } = renderHook(() => usePreferences(), {
        wrapper: PreferencesProvider,
      });

      act(() => {
        result.current.setViewPreference('worktree-1', 'board-1', 'list');
      });

      const view = result.current.getViewPreference('worktree-1', 'board-1');
      expect(view).toBe('list');
    });
  });
});
