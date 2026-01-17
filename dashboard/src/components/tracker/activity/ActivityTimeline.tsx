/**
 * ActivityTimeline Component - Display activity history as interactive timeline
 */

import { useState, useEffect } from 'react';
import { type ActivityEntry, activityApi } from '../../../api/tracker';

interface ActivityTimelineProps {
  worktreeId: string;
  issueId: string;
}

export function ActivityTimeline({ worktreeId, issueId }: ActivityTimelineProps) {
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActivity();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadActivity, 30000);
    return () => clearInterval(interval);
  }, [worktreeId, issueId]);

  const loadActivity = async () => {
    try {
      const data = await activityApi.getActivity(worktreeId, issueId);
      setActivity(data);
    } catch (error) {
      console.error('Failed to load activity:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredActivity = filter === 'all'
    ? activity
    : activity.filter(entry => entry.action === filter);

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'created': return '✨';
      case 'updated': return '✏️';
      case 'commented': return '💬';
      case 'status_changed': return '🔄';
      case 'assigned': return '👤';
      case 'linked': return '🔗';
      default: return '•';
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'created': return 'text-green-600 border-green-600';
      case 'updated': return 'text-blue-600 border-blue-600';
      case 'commented': return 'text-purple-600 border-purple-600';
      case 'status_changed': return 'text-orange-600 border-orange-600';
      case 'assigned': return 'text-indigo-600 border-indigo-600';
      case 'linked': return 'text-teal-600 border-teal-600';
      default: return 'text-gray-600 border-gray-600';
    }
  };

  const formatChange = (change: { field: string; old_value: any; new_value: any }) => {
    const formatValue = (val: any) => {
      if (val === null || val === undefined) return 'none';
      if (typeof val === 'object') return JSON.stringify(val);
      return String(val);
    };

    return (
      <div className="text-sm text-gray-600 mt-1 pl-4 border-l-2 border-gray-200">
        <span className="font-medium">{change.field}:</span>{' '}
        <span className="line-through text-gray-400">{formatValue(change.old_value)}</span>
        {' → '}
        <span className="font-medium text-gray-900">{formatValue(change.new_value)}</span>
      </div>
    );
  };

  const formatRelativeTime = (timestamp: string): string => {
    const now = new Date().getTime();
    const then = new Date(timestamp).getTime();
    const diffMs = now - then;

    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return new Date(timestamp).toLocaleDateString();
  };

  const getActionLabel = (action: string) => {
    return action.replace(/_/g, ' ');
  };

  if (loading) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p className="text-sm">Loading activity...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex gap-2 text-xs border-b border-gray-200 pb-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-2 py-1 rounded ${
            filter === 'all' ? 'bg-blue-100 text-blue-700 font-semibold' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          All ({activity.length})
        </button>
        <button
          onClick={() => setFilter('created')}
          className={`px-2 py-1 rounded ${
            filter === 'created' ? 'bg-green-100 text-green-700 font-semibold' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Created
        </button>
        <button
          onClick={() => setFilter('updated')}
          className={`px-2 py-1 rounded ${
            filter === 'updated' ? 'bg-blue-100 text-blue-700 font-semibold' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Updated
        </button>
        <button
          onClick={() => setFilter('status_changed')}
          className={`px-2 py-1 rounded ${
            filter === 'status_changed' ? 'bg-orange-100 text-orange-700 font-semibold' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Status
        </button>
        <button
          onClick={() => setFilter('assigned')}
          className={`px-2 py-1 rounded ${
            filter === 'assigned' ? 'bg-indigo-100 text-indigo-700 font-semibold' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Assigned
        </button>
      </div>

      {/* Timeline */}
      {filteredActivity.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p className="text-sm">
            {filter === 'all' ? 'No activity yet' : `No ${getActionLabel(filter)} activity`}
          </p>
        </div>
      ) : (
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />

          <div className="space-y-4">
            {filteredActivity.map((entry) => (
              <div key={entry.id} className="relative pl-10">
                {/* Icon */}
                <div
                  className={`absolute left-0 w-8 h-8 rounded-full bg-white border-2 flex items-center justify-center ${getActionColor(
                    entry.action
                  )}`}
                >
                  <span className="text-sm">{getActionIcon(entry.action)}</span>
                </div>

                {/* Content */}
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <div className="flex justify-between items-start mb-1">
                    <div>
                      <span className="font-medium text-gray-900">{entry.actor.name}</span>
                      <span className="text-gray-600 mx-2">{getActionLabel(entry.action)}</span>
                    </div>
                    <span
                      className="text-xs text-gray-500"
                      title={new Date(entry.timestamp).toLocaleString()}
                    >
                      {formatRelativeTime(entry.timestamp)}
                    </span>
                  </div>

                  {/* Changes */}
                  {entry.changes && entry.changes.length > 0 && (
                    <div className="space-y-1 mt-2">
                      {entry.changes.map((change, i) => (
                        <div key={i}>{formatChange(change)}</div>
                      ))}
                    </div>
                  )}

                  {/* Metadata */}
                  {entry.metadata && Object.keys(entry.metadata).length > 0 && (
                    <div className="text-xs text-gray-500 mt-2 pt-2 border-t border-gray-200">
                      {Object.entries(entry.metadata).map(([key, value]) => (
                        <div key={key} className="inline-block mr-3">
                          <span className="font-medium">{key}:</span> {String(value)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
