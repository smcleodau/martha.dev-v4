/**
 * Time Tracking Component - Comprehensive time tracking for issues
 */

import { useState, useEffect } from 'react';
import { type Issue } from '../../../api/tracker';
import { Avatar } from '../shared/Avatar';

interface TimeEntry {
  id: string;
  issue_id: string;
  user_id: string;
  user_name: string;
  hours: number;
  description: string;
  date: string;
  logged_at: string;
}

interface TimeTrackingProps {
  issue: Issue;
  worktreeId: string;
  boardId: string;
}

export function TimeTracking({ issue, worktreeId, boardId }: TimeTrackingProps) {
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showLogForm, setShowLogForm] = useState(false);

  // Form state
  const [hours, setHours] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState<string>('');

  // Load time entries on mount
  useEffect(() => {
    loadTimeEntries();
  }, [issue.id]);

  const loadTimeEntries = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/tracker/worktrees/${worktreeId}/boards/${boardId}/issues/${issue.id}/time-entries`,
        {
          credentials: 'include',
        }
      );

      if (!response.ok) {
        throw new Error('Failed to load time entries');
      }

      const data = await response.json();
      // Sort by date (most recent first)
      const sortedEntries = (data.entries || []).sort(
        (a: TimeEntry, b: TimeEntry) => new Date(b.logged_at).getTime() - new Date(a.logged_at).getTime()
      );
      setTimeEntries(sortedEntries);
    } catch (error) {
      console.error('Failed to load time entries:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogTime = async () => {
    const hoursNum = parseFloat(hours);
    if (isNaN(hoursNum) || hoursNum <= 0) {
      alert('Please enter a valid number of hours');
      return;
    }

    if (!description.trim()) {
      alert('Please enter a description');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(
        `/api/tracker/worktrees/${worktreeId}/boards/${boardId}/issues/${issue.id}/time-entries`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            user_id: 'current-user',
            user_name: 'Current User',
            hours: hoursNum,
            description: description.trim(),
            date: date,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to log time');
      }

      // Reset form
      setHours('');
      setDescription('');
      setDate(new Date().toISOString().split('T')[0]);
      setShowLogForm(false);

      // Reload time entries
      await loadTimeEntries();

      // Reload page to update issue's logged_hours
      window.location.reload();
    } catch (error) {
      console.error('Failed to log time:', error);
      alert('Failed to log time. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (!confirm('Are you sure you want to delete this time entry?')) {
      return;
    }

    try {
      const response = await fetch(
        `/api/tracker/worktrees/${worktreeId}/boards/${boardId}/issues/${issue.id}/time-entries/${entryId}`,
        {
          method: 'DELETE',
          credentials: 'include',
        }
      );

      if (!response.ok) {
        throw new Error('Failed to delete time entry');
      }

      // Reload time entries
      await loadTimeEntries();

      // Reload page to update issue's logged_hours
      window.location.reload();
    } catch (error) {
      console.error('Failed to delete time entry:', error);
      alert('Failed to delete time entry. Please try again.');
    }
  };

  const estimatedHours = issue.time_tracking?.estimated_hours || 0;
  const loggedHours = issue.time_tracking?.logged_hours || 0;
  const remainingHours = estimatedHours > 0 ? estimatedHours - loggedHours : 0;
  const progressPercentage = estimatedHours > 0 ? Math.min((loggedHours / estimatedHours) * 100, 100) : 0;
  const isOverEstimate = loggedHours > estimatedHours && estimatedHours > 0;

  return (
    <div
      className="bg-white rounded-lg p-6 shadow-warm-md"
      style={{
        borderColor: '#E8E0D5',
        borderWidth: '1px',
        borderStyle: 'solid',
      }}
    >
      <h3 className="text-lg font-semibold mb-4" style={{ color: '#2F241B' }}>
        Time Tracking
      </h3>

      {/* Summary Section */}
      <div className="mb-6">
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <label className="text-xs font-semibold block mb-1" style={{ color: '#A39686' }}>
              Estimated
            </label>
            <p className="text-2xl font-bold" style={{ color: '#2F241B' }}>
              {estimatedHours > 0 ? `${estimatedHours}h` : '—'}
            </p>
          </div>
          <div>
            <label className="text-xs font-semibold block mb-1" style={{ color: '#A39686' }}>
              Logged
            </label>
            <p className="text-2xl font-bold" style={{ color: '#2F241B' }}>
              {loggedHours}h
            </p>
          </div>
          <div>
            <label className="text-xs font-semibold block mb-1" style={{ color: '#A39686' }}>
              Remaining
            </label>
            <p
              className="text-2xl font-bold"
              style={{ color: isOverEstimate ? '#D84315' : '#2F241B' }}
            >
              {estimatedHours > 0 ? `${Math.abs(remainingHours).toFixed(1)}h` : '—'}
            </p>
            {isOverEstimate && (
              <p className="text-xs font-medium mt-1" style={{ color: '#D84315' }}>
                Over estimate
              </p>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        {estimatedHours > 0 && (
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span style={{ color: '#6B5D52' }}>Progress</span>
              <span className="font-semibold" style={{ color: '#2F241B' }}>
                {progressPercentage.toFixed(0)}%
              </span>
            </div>
            <div className="w-full h-2 rounded-full" style={{ backgroundColor: '#F5F1EC' }}>
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(progressPercentage, 100)}%`,
                  backgroundColor: isOverEstimate ? '#D84315' : '#D97F6F',
                }}
              />
            </div>
            {isOverEstimate && (
              <p className="text-xs mt-2 font-medium" style={{ color: '#D84315' }}>
                ⚠️ Time logged exceeds estimate by {(loggedHours - estimatedHours).toFixed(1)} hours
              </p>
            )}
          </div>
        )}
      </div>

      {/* Log Time Button */}
      {!showLogForm && (
        <button
          onClick={() => setShowLogForm(true)}
          className="w-full py-2 px-4 rounded-md text-white font-medium mb-4 transition-colors"
          style={{ backgroundColor: '#D97F6F' }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#C96E5F')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#D97F6F')}
        >
          + Log Time
        </button>
      )}

      {/* Log Time Form */}
      {showLogForm && (
        <div
          className="p-4 rounded-lg mb-4"
          style={{
            backgroundColor: '#FFF8F3',
            borderColor: '#E8E0D5',
            borderWidth: '1px',
            borderStyle: 'solid',
          }}
        >
          <h4 className="text-sm font-semibold mb-3" style={{ color: '#2F241B' }}>
            Log Time Entry
          </h4>

          <div className="space-y-3">
            {/* Hours Input */}
            <div>
              <label className="text-xs font-semibold block mb-1" style={{ color: '#6B5D52' }}>
                Hours
              </label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus-coral"
                style={{ borderColor: '#E8E0D5', color: '#2F241B' }}
                placeholder="e.g., 2.5"
                disabled={isSubmitting}
              />
            </div>

            {/* Date Input */}
            <div>
              <label className="text-xs font-semibold block mb-1" style={{ color: '#6B5D52' }}>
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus-coral"
                style={{ borderColor: '#E8E0D5', color: '#2F241B' }}
                disabled={isSubmitting}
              />
            </div>

            {/* Description Input */}
            <div>
              <label className="text-xs font-semibold block mb-1" style={{ color: '#6B5D52' }}>
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus-coral"
                style={{ borderColor: '#E8E0D5', color: '#2F241B' }}
                placeholder="What did you work on?"
                disabled={isSubmitting}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                onClick={handleLogTime}
                disabled={isSubmitting}
                className="flex-1 py-2 px-4 rounded-md text-white font-medium transition-colors disabled:opacity-50"
                style={{ backgroundColor: '#D97F6F' }}
                onMouseEnter={(e) =>
                  !isSubmitting && (e.currentTarget.style.backgroundColor = '#C96E5F')
                }
                onMouseLeave={(e) =>
                  !isSubmitting && (e.currentTarget.style.backgroundColor = '#D97F6F')
                }
              >
                {isSubmitting ? 'Logging...' : 'Log Time'}
              </button>
              <button
                onClick={() => {
                  setShowLogForm(false);
                  setHours('');
                  setDescription('');
                  setDate(new Date().toISOString().split('T')[0]);
                }}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-md font-medium transition-colors"
                style={{ backgroundColor: '#F5F1EC', color: '#6B5D52' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Time Entry Log */}
      <div>
        <h4 className="text-sm font-semibold mb-3" style={{ color: '#6B5D52' }}>
          Time Log ({timeEntries.length} {timeEntries.length === 1 ? 'entry' : 'entries'})
        </h4>

        {isLoading ? (
          <div className="text-center py-8" style={{ color: '#A39686' }}>
            <p className="text-sm">Loading time entries...</p>
          </div>
        ) : timeEntries.length === 0 ? (
          <div className="text-center py-8" style={{ color: '#A39686' }}>
            <p className="text-sm">No time entries yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {timeEntries.map((entry) => (
              <div
                key={entry.id}
                className="p-3 rounded-lg flex items-start gap-3"
                style={{
                  backgroundColor: '#FFF8F3',
                  borderColor: '#E8E0D5',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                }}
              >
                <Avatar name={entry.user_name} size="sm" />

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm" style={{ color: '#2F241B' }}>
                          {entry.user_name}
                        </span>
                        <span className="text-sm font-bold" style={{ color: '#D97F6F' }}>
                          {entry.hours}h
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs" style={{ color: '#A39686' }}>
                          {new Date(entry.date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                        <span className="text-xs" style={{ color: '#A39686' }}>
                          •
                        </span>
                        <span className="text-xs" style={{ color: '#A39686' }}>
                          Logged {new Date(entry.logged_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteEntry(entry.id)}
                      className="text-xs font-medium transition-colors"
                      style={{ color: '#D84315' }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = '#B71C1C')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = '#D84315')}
                      title="Delete entry"
                    >
                      Delete
                    </button>
                  </div>

                  <p className="text-sm mt-2" style={{ color: '#6B5D52' }}>
                    {entry.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
