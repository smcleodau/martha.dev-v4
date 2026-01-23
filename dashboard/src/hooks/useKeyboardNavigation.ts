/**
 * Keyboard Navigation Hook
 *
 * Provides keyboard shortcuts and navigation patterns for the tracker.
 * Enables power users to navigate efficiently without a mouse.
 *
 * WCAG 2.1 AA Compliance:
 * - 2.1.1 Keyboard (Level A) - All functionality available via keyboard
 * - 2.4.3 Focus Order (Level A) - Logical keyboard navigation
 */

import { useEffect, useCallback, useRef } from 'react';

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  meta?: boolean;
  description: string;
  action: () => void;
}

interface UseKeyboardNavigationOptions {
  enabled?: boolean;
  shortcuts?: KeyboardShortcut[];
  preventDefault?: boolean;
}

/**
 * Hook for registering keyboard shortcuts
 *
 * @example
 * useKeyboardNavigation({
 *   shortcuts: [
 *     { key: 'n', ctrl: true, description: 'New issue', action: handleNewIssue },
 *     { key: 'k', description: 'Search', action: focusSearch }
 *   ]
 * });
 */
export function useKeyboardNavigation(options: UseKeyboardNavigationOptions = {}) {
  const { enabled = true, shortcuts = [], preventDefault = true } = options;

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Don't trigger shortcuts when typing in inputs
      const target = event.target as HTMLElement;
      const isTyping =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      if (isTyping && !event.ctrlKey && !event.metaKey) {
        return;
      }

      for (const shortcut of shortcuts) {
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatch = !shortcut.ctrl || event.ctrlKey || event.metaKey;
        const altMatch = !shortcut.alt || event.altKey;
        const shiftMatch = !shortcut.shift || event.shiftKey;

        if (keyMatch && ctrlMatch && altMatch && shiftMatch) {
          if (preventDefault) {
            event.preventDefault();
          }
          shortcut.action();
          break;
        }
      }
    },
    [enabled, shortcuts, preventDefault]
  );

  useEffect(() => {
    if (enabled) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [enabled, handleKeyDown]);
}

/**
 * Hook for arrow key navigation in grids/lists
 *
 * @example
 * const { handleKeyDown, currentIndex, setCurrentIndex } = useArrowNavigation({
 *   itemCount: issues.length,
 *   columns: 4,
 *   onEnter: (index) => openIssue(issues[index])
 * });
 */
export function useArrowNavigation(options: {
  itemCount: number;
  columns?: number;
  onEnter?: (index: number) => void;
  onEscape?: () => void;
  enabled?: boolean;
}) {
  const {
    itemCount,
    columns = 1,
    onEnter,
    onEscape,
    enabled = true,
  } = options;

  const currentIndexRef = useRef<number>(0);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled || itemCount === 0) return;

      let newIndex = currentIndexRef.current;
      let handled = false;

      switch (event.key) {
        case 'ArrowDown':
          newIndex = Math.min(currentIndexRef.current + columns, itemCount - 1);
          handled = true;
          break;

        case 'ArrowUp':
          newIndex = Math.max(currentIndexRef.current - columns, 0);
          handled = true;
          break;

        case 'ArrowRight':
          if (columns > 1) {
            newIndex = Math.min(currentIndexRef.current + 1, itemCount - 1);
            handled = true;
          }
          break;

        case 'ArrowLeft':
          if (columns > 1) {
            newIndex = Math.max(currentIndexRef.current - 1, 0);
            handled = true;
          }
          break;

        case 'Home':
          newIndex = 0;
          handled = true;
          break;

        case 'End':
          newIndex = itemCount - 1;
          handled = true;
          break;

        case 'Enter':
          if (onEnter) {
            onEnter(currentIndexRef.current);
            handled = true;
          }
          break;

        case 'Escape':
          if (onEscape) {
            onEscape();
            handled = true;
          }
          break;
      }

      if (handled) {
        event.preventDefault();
        currentIndexRef.current = newIndex;
      }
    },
    [enabled, itemCount, columns, onEnter, onEscape]
  );

  useEffect(() => {
    if (enabled) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [enabled, handleKeyDown]);

  return {
    currentIndex: currentIndexRef.current,
    setCurrentIndex: (index: number) => {
      currentIndexRef.current = index;
    },
    handleKeyDown,
  };
}

/**
 * Standard keyboard shortcuts for the tracker application
 */
export const TRACKER_SHORTCUTS = {
  // Navigation
  FOCUS_SEARCH: { key: 'k', ctrl: true, description: 'Focus search' },
  NEXT_ISSUE: { key: 'j', description: 'Next issue' },
  PREV_ISSUE: { key: 'k', description: 'Previous issue' },
  CLOSE_PANEL: { key: 'Escape', description: 'Close panel' },

  // Actions
  NEW_ISSUE: { key: 'n', ctrl: true, description: 'Create new issue' },
  REFRESH: { key: 'r', ctrl: true, description: 'Refresh board' },
  SAVE: { key: 's', ctrl: true, description: 'Save changes' },

  // Views
  KANBAN_VIEW: { key: '1', ctrl: true, description: 'Kanban view' },
  LIST_VIEW: { key: '2', ctrl: true, description: 'List view' },
  TIMELINE_VIEW: { key: '3', ctrl: true, description: 'Timeline view' },
  GANTT_VIEW: { key: '4', ctrl: true, description: 'Gantt view' },

  // Filtering
  TOGGLE_FILTERS: { key: 'f', ctrl: true, description: 'Toggle filters' },
  CLEAR_FILTERS: { key: 'c', shift: true, ctrl: true, description: 'Clear filters' },

  // Help
  SHOW_SHORTCUTS: { key: '?', shift: true, description: 'Show keyboard shortcuts' },
} as const;

/**
 * Hook for managing roving tabindex in a list of items
 * Implements the roving tabindex pattern for accessible keyboard navigation
 *
 * @example
 * const { getItemProps } = useRovingTabIndex(items.length);
 *
 * return items.map((item, index) => (
 *   <button {...getItemProps(index)}>
 *     {item.name}
 *   </button>
 * ));
 */
export function useRovingTabIndex(itemCount: number, defaultIndex: number = 0) {
  const activeIndexRef = useRef(defaultIndex);

  const getItemProps = useCallback(
    (index: number) => ({
      tabIndex: index === activeIndexRef.current ? 0 : -1,
      onFocus: () => {
        activeIndexRef.current = index;
      },
      onKeyDown: (event: React.KeyboardEvent) => {
        let newIndex = activeIndexRef.current;

        switch (event.key) {
          case 'ArrowDown':
          case 'ArrowRight':
            event.preventDefault();
            newIndex = Math.min(activeIndexRef.current + 1, itemCount - 1);
            break;

          case 'ArrowUp':
          case 'ArrowLeft':
            event.preventDefault();
            newIndex = Math.max(activeIndexRef.current - 1, 0);
            break;

          case 'Home':
            event.preventDefault();
            newIndex = 0;
            break;

          case 'End':
            event.preventDefault();
            newIndex = itemCount - 1;
            break;
        }

        if (newIndex !== activeIndexRef.current) {
          activeIndexRef.current = newIndex;
          // Focus the new element
          const target = event.currentTarget as HTMLElement;
          const parent = target.parentElement;
          if (parent) {
            const items = Array.from(parent.children) as HTMLElement[];
            items[newIndex]?.focus();
          }
        }
      },
    }),
    [itemCount]
  );

  return {
    getItemProps,
    activeIndex: activeIndexRef.current,
    setActiveIndex: (index: number) => {
      activeIndexRef.current = index;
    },
  };
}

/**
 * Hook for handling Skip to Content links
 * Provides accessible way to skip repetitive navigation
 *
 * @example
 * const skipProps = useSkipToContent('main-content');
 *
 * return (
 *   <>
 *     <a {...skipProps}>Skip to main content</a>
 *     <nav>...</nav>
 *     <main id="main-content">...</main>
 *   </>
 * );
 */
export function useSkipToContent(targetId: string) {
  const handleClick = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      const target = document.getElementById(targetId);
      if (target) {
        target.focus();
        target.scrollIntoView({ behavior: 'smooth' });
      }
    },
    [targetId]
  );

  return {
    href: `#${targetId}`,
    onClick: handleClick,
    className: 'skip-to-content',
  };
}

/**
 * Hook for managing focus restoration after route changes
 * Ensures focus is properly managed during navigation
 */
export function useFocusRestoration() {
  const previousPathRef = useRef<string>('');

  useEffect(() => {
    const currentPath = window.location.pathname;

    // If path changed, move focus to main content
    if (previousPathRef.current && previousPathRef.current !== currentPath) {
      const main = document.querySelector('main');
      if (main) {
        main.focus();
      }
    }

    previousPathRef.current = currentPath;
  }, []);
}
