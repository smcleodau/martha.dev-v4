/**
 * Story Points Field Component
 * Allows users to set story points using Fibonacci sequence for stories and tasks
 */

import { useState } from 'react';
import { hierarchicalIssuesApi, type Issue } from '../../../api/tracker';

interface StoryPointsFieldProps {
  issue: Issue;
  worktreeId: string;
  boardId: string;
  onUpdate?: () => void;
}

const FIBONACCI_VALUES = [1, 2, 3, 5, 8, 13, 21];

export function StoryPointsField({ issue, worktreeId, boardId, onUpdate }: StoryPointsFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Only show for story and task types
  if (issue.type !== 'story' && issue.type !== 'task') {
    return null;
  }

  const handleUpdatePoints = async (points: number | null) => {
    setIsUpdating(true);
    try {
      await hierarchicalIssuesApi.update(worktreeId, boardId, issue.id, {
        story_points: points
      });
      setIsOpen(false);
      if (onUpdate) {
        onUpdate();
      } else {
        // Fallback to page reload if no callback provided
        window.location.reload();
      }
    } catch (error) {
      console.error('Failed to update story points:', error);
      alert('Failed to update story points');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="mb-4">
      <label className="text-sm font-semibold block mb-2" style={{ color: '#6B5D52' }}>
        Story Points
      </label>

      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          disabled={isUpdating}
          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus-coral bg-white text-left flex items-center justify-between disabled:opacity-50"
          style={{ borderColor: '#E8E0D5', color: '#2F241B' }}
        >
          {issue.story_points ? (
            <span
              className="inline-flex items-center justify-center px-3 py-1 rounded-md text-sm font-semibold"
              style={{
                backgroundColor: '#FDF5F3',
                color: '#D97F6F',
                borderWidth: '1px',
                borderStyle: 'solid',
                borderColor: '#F9D0C8'
              }}
            >
              {issue.story_points} points
            </span>
          ) : (
            <span style={{ color: '#A39686' }}>Not estimated</span>
          )}
          <svg
            className="w-4 h-4 transition-transform"
            style={{
              color: '#6B5D52',
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)'
            }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isOpen && (
          <div
            className="absolute z-50 mt-2 w-full bg-white rounded-lg shadow-lg border overflow-hidden"
            style={{ borderColor: '#E8E0D5' }}
          >
            {/* Clear option */}
            <button
              onClick={() => handleUpdatePoints(null)}
              disabled={isUpdating}
              className="w-full px-4 py-2 text-left hover:bg-gray-50 transition-colors text-sm disabled:opacity-50"
              style={{ color: '#A39686' }}
            >
              Not estimated
            </button>

            {/* Fibonacci values */}
            {FIBONACCI_VALUES.map((value) => (
              <button
                key={value}
                onClick={() => handleUpdatePoints(value)}
                disabled={isUpdating}
                className="w-full px-4 py-2 text-left hover:bg-gray-50 transition-colors flex items-center gap-3 disabled:opacity-50"
                style={{
                  backgroundColor: issue.story_points === value ? '#FDF5F3' : 'white',
                  borderTopWidth: '1px',
                  borderTopStyle: 'solid',
                  borderTopColor: '#F5F1ED'
                }}
              >
                <span
                  className="inline-flex items-center justify-center w-8 h-8 rounded-md text-sm font-semibold"
                  style={{
                    backgroundColor: issue.story_points === value ? '#D97F6F' : '#F5F1EC',
                    color: issue.story_points === value ? 'white' : '#6B5D52'
                  }}
                >
                  {value}
                </span>
                <span
                  className="text-sm font-medium"
                  style={{ color: issue.story_points === value ? '#D97F6F' : '#2F241B' }}
                >
                  {value} {value === 1 ? 'point' : 'points'}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Click outside to close */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
