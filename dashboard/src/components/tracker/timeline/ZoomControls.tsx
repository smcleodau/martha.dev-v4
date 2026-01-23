/**
 * ZoomControls Component
 * Provides Day/Week/Month view switching for the timeline calendar
 */

import React, { useEffect } from 'react';

type ViewType = 'day' | 'week' | 'month';

interface ZoomControlsProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  worktreeId: string;
  boardId: string;
}

export function ZoomControls({ currentView, onViewChange, worktreeId, boardId }: ZoomControlsProps) {
  // Persist view selection to localStorage
  useEffect(() => {
    const storageKey = `martha.timeline.view.${worktreeId}.${boardId}`;
    localStorage.setItem(storageKey, currentView);
  }, [currentView, worktreeId, boardId]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Only trigger if not in an input field
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key) {
        case '1':
          onViewChange('day');
          break;
        case '2':
          onViewChange('week');
          break;
        case '3':
          onViewChange('month');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [onViewChange]);

  const views: Array<{ type: ViewType; label: string; icon: React.ReactElement; shortcut: string }> = [
    {
      type: 'day',
      label: 'Day',
      shortcut: '1',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          <line x1="16" y1="2" x2="16" y2="6" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          <line x1="8" y1="2" x2="8" y2="6" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          <line x1="3" y1="10" x2="21" y2="10" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      type: 'week',
      label: 'Week',
      shortcut: '2',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          <line x1="16" y1="2" x2="16" y2="6" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          <line x1="8" y1="2" x2="8" y2="6" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          <line x1="3" y1="10" x2="21" y2="10" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          <line x1="8" y1="14" x2="8" y2="18" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          <line x1="12" y1="14" x2="12" y2="18" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          <line x1="16" y1="14" x2="16" y2="18" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      type: 'month',
      label: 'Month',
      shortcut: '3',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          <line x1="16" y1="2" x2="16" y2="6" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          <line x1="8" y1="2" x2="8" y2="6" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          <line x1="3" y1="10" x2="21" y2="10" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          <line x1="3" y1="14" x2="21" y2="14" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          <line x1="3" y1="18" x2="21" y2="18" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          <line x1="8" y1="10" x2="8" y2="22" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          <line x1="16" y1="10" x2="16" y2="22" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
  ];

  return (
    <div
      className="inline-flex items-center border rounded-lg overflow-hidden shadow-sm"
      style={{
        backgroundColor: 'white',
        borderColor: '#E8E0D5',
      }}
    >
      {views.map((view, index) => {
        const isActive = currentView === view.type;
        return (
          <button
            key={view.type}
            onClick={() => onViewChange(view.type)}
            className={`
              px-4 py-2 text-sm font-medium transition-all duration-200
              flex items-center gap-2 relative
              ${index > 0 ? 'border-l' : ''}
              ${isActive ? 'text-white' : 'hover:bg-opacity-50'}
            `}
            style={{
              backgroundColor: isActive ? '#D97F6F' : 'transparent',
              color: isActive ? 'white' : '#2F241B',
              borderLeftColor: index > 0 ? '#E8E0D5' : 'transparent',
            }}
            title={`${view.label} view (press ${view.shortcut})`}
          >
            {view.icon}
            <span>{view.label}</span>
            {isActive && (
              <span className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 rounded-full bg-white" />
            )}
          </button>
        );
      })}
    </div>
  );
}
