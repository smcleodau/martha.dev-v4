/**
 * Timeline Controls Component
 * View-specific filter controls for Timeline view
 * Includes: Date range picker, Reset to Today button, Swimlane selector
 */

import { useState, useRef, useEffect } from 'react';
import { SwimlaneModeSelector, type SwimlaneMode } from './SwimlaneModeSelector';

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface TimelineControlsProps {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  swimlaneMode: SwimlaneMode;
  onSwimlaneModeChange: (mode: SwimlaneMode) => void;
  className?: string;
}

export function TimelineControls({
  dateRange,
  onDateRangeChange,
  swimlaneMode,
  onSwimlaneModeChange,
  className = '',
}: TimelineControlsProps) {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const datePickerRef = useRef<HTMLDivElement>(null);

  // Close date picker when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setShowDatePicker(false);
      }
    }

    if (showDatePicker) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showDatePicker]);

  const handleResetToToday = () => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay()); // Sunday
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 13); // 2 weeks

    onDateRangeChange({
      startDate: startOfWeek,
      endDate: endOfWeek,
    });
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStart = new Date(e.target.value);
    if (!isNaN(newStart.getTime())) {
      onDateRangeChange({
        startDate: newStart,
        endDate: dateRange.endDate,
      });
    }
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEnd = new Date(e.target.value);
    if (!isNaN(newEnd.getTime())) {
      onDateRangeChange({
        startDate: dateRange.startDate,
        endDate: newEnd,
      });
    }
  };

  const toDateInputValue = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  return (
    <div className={`timeline-controls flex items-center gap-3 ${className}`}>
      {/* Date Range Picker */}
      <div className="relative" ref={datePickerRef}>
        <button
          onClick={() => setShowDatePicker(!showDatePicker)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors"
          style={{
            backgroundColor: '#FDFBF8',
            borderColor: '#E8E0D5',
            color: '#2F241B',
          }}
        >
          <svg
            className="w-4 h-4"
            style={{ color: '#6B5D52' }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <span className="text-sm font-medium">
            {formatDate(dateRange.startDate)} - {formatDate(dateRange.endDate)}
          </span>
          <svg
            className={`w-4 h-4 transition-transform ${showDatePicker ? 'rotate-180' : ''}`}
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

        {/* Date Picker Dropdown */}
        {showDatePicker && (
          <div
            className="absolute top-full left-0 mt-2 p-4 rounded-lg shadow-lg z-50 min-w-[280px]"
            style={{
              backgroundColor: '#FFFFFF',
              borderColor: '#E8E0D5',
              borderWidth: '1px',
              boxShadow: '0 10px 25px rgba(47, 36, 27, 0.15)',
            }}
          >
            <div className="space-y-3">
              {/* Start Date */}
              <div>
                <label
                  className="block text-xs font-semibold mb-1.5"
                  style={{ color: '#6B5D52' }}
                >
                  Start Date
                </label>
                <input
                  type="date"
                  value={toDateInputValue(dateRange.startDate)}
                  onChange={handleStartDateChange}
                  className="w-full px-3 py-2 rounded-lg border text-sm"
                  style={{
                    backgroundColor: '#FDFBF8',
                    borderColor: '#E8E0D5',
                    color: '#2F241B',
                  }}
                />
              </div>

              {/* End Date */}
              <div>
                <label
                  className="block text-xs font-semibold mb-1.5"
                  style={{ color: '#6B5D52' }}
                >
                  End Date
                </label>
                <input
                  type="date"
                  value={toDateInputValue(dateRange.endDate)}
                  onChange={handleEndDateChange}
                  className="w-full px-3 py-2 rounded-lg border text-sm"
                  style={{
                    backgroundColor: '#FDFBF8',
                    borderColor: '#E8E0D5',
                    color: '#2F241B',
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Reset to Today Button */}
      <button
        onClick={handleResetToToday}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors hover:bg-opacity-50"
        style={{
          backgroundColor: '#FDFBF8',
          borderColor: '#E8E0D5',
          color: '#2F241B',
        }}
        title="Reset to current week"
      >
        <svg
          className="w-4 h-4"
          style={{ color: '#6B5D52' }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
        <span className="text-sm font-medium">Today</span>
      </button>

      {/* Swimlane Mode Selector */}
      <SwimlaneModeSelector mode={swimlaneMode} onChange={onSwimlaneModeChange} />
    </div>
  );
}
