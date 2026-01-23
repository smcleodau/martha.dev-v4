/**
 * TrackerNavigationSection Component - Collapsible navigation section
 */

import { useState, type ReactNode } from 'react';

interface TrackerNavigationSectionProps {
  title: string;
  children: ReactNode;
  defaultExpanded?: boolean;
}

export function TrackerNavigationSection({
  title,
  children,
  defaultExpanded = true,
}: TrackerNavigationSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="mb-6">
      {/* Section Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full px-4 py-2 mb-2 text-xs font-bold tracking-wider uppercase transition-colors hover:bg-tracker-bg-subtle rounded-lg"
        style={{ color: '#A39686' }}
      >
        <span>{title}</span>
        <svg
          className={`w-4 h-4 transition-transform duration-200 ${
            isExpanded ? 'transform rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Section Content */}
      {isExpanded && (
        <div className="space-y-1">
          {children}
        </div>
      )}
    </div>
  );
}
