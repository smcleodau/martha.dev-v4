/**
 * ViewSwitcher Component
 * Allows users to switch between different tracker views (Kanban, List, Timeline, Gantt)
 */

import { type ViewMode } from '../../../utils/preferences';

interface ViewSwitcherProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
}

export function ViewSwitcher({ currentView, onViewChange }: ViewSwitcherProps) {
  const views: { value: ViewMode; label: string; icon: string }[] = [
    { value: 'kanban', label: 'Kanban', icon: 'M4 6h16M4 12h16M4 18h16' },
    { value: 'list', label: 'List', icon: 'M4 6h16M4 12h16M4 18h16' },
    { value: 'timeline', label: 'Timeline', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { value: 'gantt', label: 'Gantt', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
  ];

  return (
    <div
      className="flex items-center border rounded-lg p-1"
      style={{
        backgroundColor: '#F5F1EC',
        borderColor: '#E8E0D5',
      }}
    >
      {views.map((view) => (
        <button
          key={view.value}
          onClick={() => onViewChange(view.value)}
          className={`px-3 py-1.5 text-sm font-medium rounded transition-all flex items-center gap-2 ${
            currentView === view.value
              ? 'shadow-sm'
              : 'hover:bg-opacity-50'
          }`}
          style={{
            backgroundColor: currentView === view.value ? '#FFFFFF' : 'transparent',
            color: currentView === view.value ? '#2F241B' : '#6B5D52',
          }}
          title={view.label}
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d={view.icon} />
          </svg>
          <span>{view.label}</span>
        </button>
      ))}
    </div>
  );
}
