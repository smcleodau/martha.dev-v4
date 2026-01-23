/**
 * GroupBy Controls Component
 * Dropdown control for selecting issue grouping mode
 */

import { useState, useRef, useEffect } from 'react';

export type GroupByOption = 'none' | 'status' | 'type' | 'assignee' | 'priority';

interface GroupByControlsProps {
  value: GroupByOption;
  onChange: (value: GroupByOption) => void;
}

export function GroupByControls({ value, onChange }: GroupByControlsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const options: { value: GroupByOption; label: string; icon: string }[] = [
    { value: 'none', label: 'No Grouping', icon: '▪️' },
    { value: 'status', label: 'Group by Status', icon: '📊' },
    { value: 'type', label: 'Group by Type', icon: '🏷️' },
    { value: 'assignee', label: 'Group by Assignee', icon: '👤' },
    { value: 'priority', label: 'Group by Priority', icon: '🔥' },
  ];

  const currentOption = options.find(opt => opt.value === value) || options[0];

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-sm transition-all"
        style={{
          backgroundColor: value !== 'none' ? '#FDF5F3' : '#F5F4F2',
          color: value !== 'none' ? '#D97F6F' : '#6B5D52',
          borderWidth: '1px',
          borderStyle: 'solid',
          borderColor: value !== 'none' ? '#F9D0C8' : '#E8E0D5',
        }}
      >
        <span className="text-base">{currentOption.icon}</span>
        <span>{currentOption.label}</span>
        <svg
          className="w-4 h-4 transition-transform"
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
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

      {isOpen && (
        <div
          className="absolute top-full mt-2 left-0 rounded-lg shadow-lg overflow-hidden z-50 min-w-[200px]"
          style={{
            backgroundColor: '#FFFFFF',
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: '#E8E0D5',
            boxShadow: '0 4px 12px rgba(47, 36, 27, 0.12)',
          }}
        >
          {options.map((option) => (
            <button
              key={option.value}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors text-left"
              style={{
                backgroundColor: value === option.value ? '#FDF5F3' : 'transparent',
                color: value === option.value ? '#D97F6F' : '#2F241B',
              }}
              onMouseEnter={(e) => {
                if (value !== option.value) {
                  e.currentTarget.style.backgroundColor = '#F5F4F2';
                }
              }}
              onMouseLeave={(e) => {
                if (value !== option.value) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              <span className="text-base">{option.icon}</span>
              <span>{option.label}</span>
              {value === option.value && (
                <svg
                  className="w-4 h-4 ml-auto"
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
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
