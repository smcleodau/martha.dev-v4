/**
 * DependencyControls Component - Toggle controls for Gantt dependency visualization
 * Provides switches for showing dependencies, critical path, and slack times
 */

import React from 'react';

interface DependencyControlsProps {
  showDependencies: boolean;
  onToggleDependencies: (show: boolean) => void;
  showCriticalPath: boolean;
  onToggleCriticalPath: (show: boolean) => void;
  showSlackTimes: boolean;
  onToggleSlackTimes: (show: boolean) => void;
  className?: string;
}

export function DependencyControls({
  showDependencies,
  onToggleDependencies,
  showCriticalPath,
  onToggleCriticalPath,
  showSlackTimes,
  onToggleSlackTimes,
  className = ''
}: DependencyControlsProps) {
  return (
    <div className={`flex items-center gap-4 ${className}`}>
      {/* Show Dependencies Toggle */}
      <ToggleSwitch
        id="show-dependencies"
        label="Dependencies"
        checked={showDependencies}
        onChange={onToggleDependencies}
        icon={
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
          </svg>
        }
      />

      {/* Highlight Critical Path Toggle */}
      <ToggleSwitch
        id="show-critical-path"
        label="Critical Path"
        checked={showCriticalPath}
        onChange={onToggleCriticalPath}
        disabled={!showDependencies}
        icon={
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z"
              clipRule="evenodd"
            />
          </svg>
        }
      />

      {/* Show Slack Times Toggle */}
      <ToggleSwitch
        id="show-slack-times"
        label="Slack Times"
        checked={showSlackTimes}
        onChange={onToggleSlackTimes}
        disabled={!showCriticalPath}
        icon={
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
              clipRule="evenodd"
            />
          </svg>
        }
      />
    </div>
  );
}

/**
 * ToggleSwitch - Reusable toggle switch component with warm colors
 */
interface ToggleSwitchProps {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  icon?: React.ReactNode;
}

function ToggleSwitch({ id, label, checked, onChange, disabled = false, icon }: ToggleSwitchProps) {
  const handleClick = () => {
    if (!disabled) {
      onChange(!checked);
    }
  };

  return (
    <label
      htmlFor={id}
      className={`flex items-center gap-2 cursor-pointer select-none group ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      }`}
    >
      {/* Icon */}
      {icon && (
        <span
          className="transition-colors"
          style={{
            color: disabled ? '#A39686' : checked ? '#D97F6F' : '#6B5D52'
          }}
        >
          {icon}
        </span>
      )}

      {/* Label */}
      <span
        className="text-sm font-medium transition-colors"
        style={{
          color: disabled ? '#A39686' : checked ? '#2F241B' : '#6B5D52'
        }}
      >
        {label}
      </span>

      {/* Toggle Switch */}
      <div className="relative">
        <input
          type="checkbox"
          id={id}
          checked={checked}
          onChange={e => onChange(e.target.checked)}
          disabled={disabled}
          className="sr-only"
        />
        <div
          onClick={handleClick}
          className={`w-11 h-6 rounded-full transition-all duration-300 ${
            disabled ? 'cursor-not-allowed' : 'cursor-pointer'
          }`}
          style={{
            backgroundColor: checked && !disabled ? '#D97F6F' : '#E8E0D5'
          }}
        >
          <div
            className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-md transition-transform duration-300 ${
              checked ? 'transform translate-x-5' : ''
            }`}
          />
        </div>
      </div>
    </label>
  );
}

/**
 * DependencyLegend - Shows legend for dependency line colors
 */
export function DependencyLegend({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-6 text-xs ${className}`}>
      <div className="flex items-center gap-2">
        <div
          className="w-8 h-0.5"
          style={{ backgroundColor: '#A39686' }}
        />
        <span style={{ color: '#6B5D52' }}>Normal Dependency</span>
      </div>

      <div className="flex items-center gap-2">
        <div
          className="w-8 h-0.5"
          style={{ backgroundColor: '#C0392B' }}
        />
        <span style={{ color: '#6B5D52' }}>Critical Path</span>
      </div>

      <div className="flex items-center gap-2">
        <div
          className="w-8 h-0.5 border-dashed"
          style={{
            borderTop: '2px dashed #E8A93A',
            backgroundColor: 'transparent',
            height: '2px'
          }}
        />
        <span style={{ color: '#6B5D52' }}>Blocked</span>
      </div>
    </div>
  );
}

/**
 * GanttToolbar - Complete toolbar with dependency controls
 */
interface GanttToolbarProps {
  showDependencies: boolean;
  onToggleDependencies: (show: boolean) => void;
  showCriticalPath: boolean;
  onToggleCriticalPath: (show: boolean) => void;
  showSlackTimes: boolean;
  onToggleSlackTimes: (show: boolean) => void;
  viewMode: 'Day' | 'Week' | 'Month' | 'Quarter';
  onViewModeChange: (mode: 'Day' | 'Week' | 'Month' | 'Quarter') => void;
}

export function GanttToolbar({
  showDependencies,
  onToggleDependencies,
  showCriticalPath,
  onToggleCriticalPath,
  showSlackTimes,
  onToggleSlackTimes,
  viewMode,
  onViewModeChange
}: GanttToolbarProps) {
  return (
    <div
      className="flex items-center justify-between p-4 border-b"
      style={{
        backgroundColor: '#FDFCFA',
        borderColor: '#E8E0D5'
      }}
    >
      {/* Left side: Dependency controls */}
      <DependencyControls
        showDependencies={showDependencies}
        onToggleDependencies={onToggleDependencies}
        showCriticalPath={showCriticalPath}
        onToggleCriticalPath={onToggleCriticalPath}
        showSlackTimes={showSlackTimes}
        onToggleSlackTimes={onToggleSlackTimes}
      />

      {/* Right side: View mode selector */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium mr-2" style={{ color: '#6B5D52' }}>
          View:
        </span>
        {(['Day', 'Week', 'Month', 'Quarter'] as const).map(mode => (
          <button
            key={mode}
            onClick={() => onViewModeChange(mode)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              viewMode === mode ? 'shadow-sm' : ''
            }`}
            style={{
              backgroundColor: viewMode === mode ? '#D97F6F' : '#F5F1EC',
              color: viewMode === mode ? 'white' : '#6B5D52'
            }}
          >
            {mode}
          </button>
        ))}
      </div>
    </div>
  );
}
