/**
 * Swimlane Mode Selector Component
 * Dropdown to select swimlane grouping mode for timeline view
 * Options: None, By Assignee, By Type, By Priority, By Status
 */

import React, { useState, useRef, useEffect } from 'react';

export type SwimlaneMode = 'none' | 'assignee' | 'type' | 'priority' | 'status';

export interface SwimlaneModeOption {
  value: SwimlaneMode;
  label: string;
  description: string;
  icon: React.ReactElement;
}

export interface SwimlaneModeSelectorProps {
  mode: SwimlaneMode;
  onChange: (mode: SwimlaneMode) => void;
  className?: string;
}

const SWIMLANE_OPTIONS: SwimlaneModeOption[] = [
  {
    value: 'none',
    label: 'No Swimlanes',
    description: 'All events in single view',
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h12a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6z" />
      </svg>
    )
  },
  {
    value: 'assignee',
    label: 'By Assignee',
    description: 'Group by team member',
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
      </svg>
    )
  },
  {
    value: 'type',
    label: 'By Type',
    description: 'Group by Epic/Story/Task/Bug',
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
          clipRule="evenodd"
        />
      </svg>
    )
  },
  {
    value: 'priority',
    label: 'By Priority',
    description: 'Group by Critical/High/Medium/Low',
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11 4a1 1 0 10-2 0v4a1 1 0 102 0V7zm-3 1a1 1 0 10-2 0v3a1 1 0 102 0V8zM8 9a1 1 0 00-2 0v2a1 1 0 102 0V9z"
          clipRule="evenodd"
        />
      </svg>
    )
  },
  {
    value: 'status',
    label: 'By Status',
    description: 'Group by workflow status',
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
          clipRule="evenodd"
        />
      </svg>
    )
  }
];

export function SwimlaneModeSelector({ mode, onChange, className = '' }: SwimlaneModeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const currentOption = SWIMLANE_OPTIONS.find(opt => opt.value === mode) || SWIMLANE_OPTIONS[0];

  const handleSelect = (selectedMode: SwimlaneMode) => {
    onChange(selectedMode);
    setIsOpen(false);
  };

  return (
    <div className={`swimlane-mode-selector relative ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors hover:bg-opacity-50"
        style={{
          backgroundColor: '#FDFBF8',
          borderColor: '#E8E0D5',
          color: '#2F241B'
        }}
        aria-label="Select swimlane grouping mode"
        aria-expanded={isOpen}
      >
        <div style={{ color: '#6B5D52' }}>
          {currentOption.icon}
        </div>
        <span className="text-sm font-medium">
          {currentOption.label}
        </span>
        <svg
          className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          style={{ color: '#A39686' }}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="absolute top-full left-0 mt-2 min-w-[240px] rounded-lg border shadow-lg z-50 overflow-hidden"
          style={{
            backgroundColor: '#FFFFFF',
            borderColor: '#E8E0D5',
            boxShadow: '0 10px 25px rgba(47, 36, 27, 0.15)'
          }}
        >
          {SWIMLANE_OPTIONS.map((option) => {
            const isSelected = option.value === mode;

            return (
              <button
                key={option.value}
                onClick={() => handleSelect(option.value)}
                className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors ${
                  isSelected ? '' : 'hover:bg-opacity-50'
                }`}
                style={{
                  backgroundColor: isSelected ? '#FDF5F3' : 'transparent',
                  borderBottom: '1px solid #F5F1EC'
                }}
              >
                <div
                  className="flex-shrink-0 mt-0.5"
                  style={{ color: isSelected ? '#D97F6F' : '#6B5D52' }}
                >
                  {option.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className="text-sm font-medium"
                      style={{ color: isSelected ? '#D97F6F' : '#2F241B' }}
                    >
                      {option.label}
                    </span>
                    {isSelected && (
                      <svg
                        className="w-4 h-4 flex-shrink-0"
                        style={{ color: '#D97F6F' }}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>
                  <p
                    className="text-xs"
                    style={{ color: '#A39686' }}
                  >
                    {option.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
