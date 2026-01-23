/**
 * View Switcher Component - Switch between Kanban, List, Timeline, and Gantt views
 * MTH-050: Phase 7 - View Switcher Implementation
 */

import { useEffect } from 'react';
import { Columns, List, Calendar, GanttChart } from 'lucide-react';

export type ViewMode = 'kanban' | 'list' | 'timeline' | 'gantt';

export interface ViewSwitcherProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
}

interface ViewConfig {
  id: ViewMode;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  shortcut: string;
}

const views: ViewConfig[] = [
  {
    id: 'kanban',
    label: 'Kanban',
    shortLabel: 'Board',
    icon: Columns,
    shortcut: 'Ctrl+1',
  },
  {
    id: 'list',
    label: 'List',
    shortLabel: 'List',
    icon: List,
    shortcut: 'Ctrl+2',
  },
  {
    id: 'timeline',
    label: 'Timeline',
    shortLabel: 'Time',
    icon: Calendar,
    shortcut: 'Ctrl+3',
  },
  {
    id: 'gantt',
    label: 'Gantt',
    shortLabel: 'Gantt',
    icon: GanttChart,
    shortcut: 'Ctrl+4',
  },
];

export function ViewSwitcher({ currentView, onViewChange }: ViewSwitcherProps) {
  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      // Check for Ctrl (or Cmd on Mac)
      if (!event.ctrlKey && !event.metaKey) return;

      // Prevent default browser behavior
      let handled = false;

      switch (event.key) {
        case '1':
          onViewChange('kanban');
          handled = true;
          break;
        case '2':
          onViewChange('list');
          handled = true;
          break;
        case '3':
          onViewChange('timeline');
          handled = true;
          break;
        case '4':
          onViewChange('gantt');
          handled = true;
          break;
      }

      if (handled) {
        event.preventDefault();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onViewChange]);

  return (
    <div
      className="inline-flex rounded-lg border overflow-hidden"
      style={{
        backgroundColor: 'white',
        borderColor: '#E8E0D5',
      }}
      role="group"
      aria-label="View switcher"
    >
      {views.map((view, index) => {
        const isActive = currentView === view.id;
        const Icon = view.icon;

        return (
          <button
            key={view.id}
            onClick={() => onViewChange(view.id)}
            className={`
              relative px-4 py-2 text-sm font-medium transition-all duration-150
              focus:outline-none focus:z-10
              ${index > 0 ? 'border-l' : ''}
            `}
            style={{
              backgroundColor: isActive ? '#D97F6F' : 'white',
              color: isActive ? 'white' : '#2F241B',
              borderLeftColor: index > 0 ? '#E8E0D5' : 'transparent',
              boxShadow: isActive ? '0 1px 3px rgba(47, 36, 27, 0.08)' : 'none',
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                e.currentTarget.style.backgroundColor = '#F5F1EC';
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.backgroundColor = 'white';
              }
            }}
            aria-label={`Switch to ${view.label} view (${view.shortcut})`}
            aria-current={isActive ? 'page' : undefined}
            title={`${view.label} (${view.shortcut})`}
          >
            <span className="flex items-center space-x-2">
              {/* Icon - always visible */}
              <Icon size={16} className="flex-shrink-0" />

              {/* Full label - desktop only */}
              <span className="hidden lg:inline">
                {view.label}
              </span>

              {/* Short label - tablet only */}
              <span className="hidden md:inline lg:hidden">
                {view.shortLabel}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
