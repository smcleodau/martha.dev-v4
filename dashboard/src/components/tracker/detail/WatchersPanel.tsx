/**
 * Watchers Panel Component - Manages issue watchers
 */

import { type Issue } from '../../../api/tracker';
import { useState, useMemo } from 'react';
import { Avatar } from '../shared/Avatar';

interface WatchersPanelProps {
  issue: Issue;
  worktreeId: string;
  boardId: string;
  currentUser: {
    id: string;
    name: string;
    avatar?: string;
  };
}

interface Watcher {
  id: string;
  name: string;
  avatar?: string;
}

export function WatchersPanel({ issue, worktreeId, boardId, currentUser }: WatchersPanelProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mock available users - in production, this would come from an API
  const availableUsers: Watcher[] = useMemo(() => [
    { id: 'user-1', name: 'Stuart Chen', avatar: '' },
    { id: 'user-2', name: 'Emma Wilson', avatar: '' },
    { id: 'user-3', name: 'Alex Martinez', avatar: '' },
    { id: 'user-4', name: 'Sarah Johnson', avatar: '' },
    { id: 'user-5', name: 'Michael Brown', avatar: '' },
    { id: 'user-6', name: 'Lisa Anderson', avatar: '' },
    { id: 'user-7', name: 'David Lee', avatar: '' },
    { id: 'user-8', name: 'Rachel Green', avatar: '' },
  ], []);

  // Get current watchers - convert from string array to Watcher objects
  const watchers: Watcher[] = useMemo(() => {
    const watcherIds = issue.watchers || [];
    return watcherIds.map(id => {
      // Try to find user in available users
      const user = availableUsers.find(u => u.id === id);
      if (user) return user;

      // Fallback for users not in the mock list
      return {
        id,
        name: id.replace('user-', 'User '),
        avatar: ''
      };
    });
  }, [issue.watchers, availableUsers]);

  // Check if current user is watching
  const isWatching = useMemo(() => {
    return watchers.some(w => w.id === currentUser.id);
  }, [watchers, currentUser.id]);

  // Filter users for autocomplete (exclude current watchers)
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return [];

    const query = searchQuery.toLowerCase();
    const watcherIds = new Set(watchers.map(w => w.id));

    return availableUsers
      .filter(u =>
        !watcherIds.has(u.id) &&
        u.name.toLowerCase().includes(query)
      )
      .slice(0, 10);
  }, [searchQuery, availableUsers, watchers]);

  const handleToggleWatch = async () => {
    setError(null);
    setIsSubmitting(true);

    try {
      if (isWatching) {
        // Unwatch
        const response = await fetch(
          `/api/tracker/worktrees/${worktreeId}/boards/${boardId}/issues/${issue.id}/watchers/${currentUser.id}`,
          {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include'
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText || 'Failed to unwatch issue');
        }
      } else {
        // Watch
        const response = await fetch(
          `/api/tracker/worktrees/${worktreeId}/boards/${boardId}/issues/${issue.id}/watchers`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              user_id: currentUser.id,
              user_name: currentUser.name
            })
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText || 'Failed to watch issue');
        }
      }

      // Reload the page to refresh data
      window.location.reload();
    } catch (err: any) {
      setError(err.message || 'Failed to update watch status');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddWatcher = async (user: Watcher) => {
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(
        `/api/tracker/worktrees/${worktreeId}/boards/${boardId}/issues/${issue.id}/watchers`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            user_id: user.id,
            user_name: user.name
          })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to add watcher');
      }

      // Reload the page to refresh data
      window.location.reload();
    } catch (err: any) {
      setError(err.message || 'Failed to add watcher');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveWatcher = async (userId: string) => {
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(
        `/api/tracker/worktrees/${worktreeId}/boards/${boardId}/issues/${issue.id}/watchers/${userId}`,
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include'
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to remove watcher');
      }

      // Reload the page to refresh data
      window.location.reload();
    } catch (err: any) {
      setError(err.message || 'Failed to remove watcher');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="bg-white rounded-lg p-6 shadow-warm-md"
      style={{
        borderColor: '#E8E0D5',
        borderWidth: '1px',
        borderStyle: 'solid'
      }}
    >
      <h3 className="text-lg font-semibold mb-4" style={{ color: '#2F241B' }}>
        Watchers
      </h3>

      {/* Error message */}
      {error && (
        <div
          className="mb-4 p-3 rounded-lg border"
          style={{
            backgroundColor: '#FCEEEB',
            borderColor: '#F5B1A4',
            color: '#C0392B'
          }}
        >
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span className="text-sm font-medium">{error}</span>
          </div>
        </div>
      )}

      {/* Quick toggle for current user */}
      <div className="mb-4">
        <button
          onClick={handleToggleWatch}
          disabled={isSubmitting}
          className="w-full py-2.5 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2"
          style={{
            backgroundColor: isWatching ? '#F5F1EC' : '#D97F6F',
            color: isWatching ? '#6B5D52' : 'white',
            border: isWatching ? '1px solid #E8E0D5' : 'none'
          }}
        >
          <svg className="w-4 h-4" fill={isWatching ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 20 20">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          {isWatching ? 'Unwatch this issue' : 'Watch this issue'}
        </button>
      </div>

      {/* Watchers list */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-semibold" style={{ color: '#6B5D52' }}>
            Current Watchers
          </label>
          <span className="text-xs font-medium px-2 py-1 rounded-full" style={{ backgroundColor: '#F5F1EC', color: '#A39686' }}>
            {watchers.length}
          </span>
        </div>

        {watchers.length > 0 ? (
          <div className="space-y-2">
            {watchers.map(watcher => (
              <div
                key={watcher.id}
                className="flex items-center justify-between p-2 rounded-lg border transition-all hover:shadow-sm group"
                style={{
                  borderColor: '#E8E0D5',
                  backgroundColor: 'white'
                }}
              >
                <div className="flex items-center gap-3">
                  <Avatar name={watcher.name} avatar={watcher.avatar} size="sm" />
                  <div>
                    <p className="text-sm font-medium" style={{ color: '#2F241B' }}>
                      {watcher.name}
                    </p>
                    {watcher.id === currentUser.id && (
                      <p className="text-xs" style={{ color: '#A39686' }}>
                        (You)
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveWatcher(watcher.id)}
                  disabled={isSubmitting}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-50"
                  style={{ color: '#C0392B' }}
                  title="Remove watcher"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm italic" style={{ color: '#A39686' }}>
            No watchers yet
          </p>
        )}
      </div>

      {/* Add watcher section */}
      {!isAdding ? (
        <button
          onClick={() => setIsAdding(true)}
          className="w-full py-2 border border-dashed rounded-lg text-sm font-medium transition-colors hover:bg-orange-50"
          style={{
            borderColor: '#E8E0D5',
            color: '#D97F6F'
          }}
        >
          + Add Watcher
        </button>
      ) : (
        <div
          className="p-4 rounded-lg border"
          style={{
            backgroundColor: '#FDFCFA',
            borderColor: '#E8E0D5'
          }}
        >
          <div className="mb-3">
            <label className="text-sm font-semibold block mb-2" style={{ color: '#6B5D52' }}>
              Search User
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Type user name..."
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus-coral"
              style={{ borderColor: '#E8E0D5', color: '#2F241B' }}
            />
          </div>

          {/* Autocomplete results */}
          {searchQuery && filteredUsers.length > 0 && (
            <div
              className="mb-3 max-h-48 overflow-y-auto rounded-lg border"
              style={{ borderColor: '#E8E0D5' }}
            >
              {filteredUsers.map(user => (
                <button
                  key={user.id}
                  onClick={() => {
                    handleAddWatcher(user);
                    setSearchQuery('');
                    setIsAdding(false);
                  }}
                  disabled={isSubmitting}
                  className="w-full text-left p-3 hover:bg-orange-50 transition-colors border-b last:border-b-0 flex items-center gap-3"
                  style={{ borderColor: '#F5F1EC' }}
                >
                  <Avatar name={user.name} avatar={user.avatar} size="sm" />
                  <span className="text-sm font-medium" style={{ color: '#2F241B' }}>
                    {user.name}
                  </span>
                </button>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => {
                setIsAdding(false);
                setSearchQuery('');
                setError(null);
              }}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 rounded-md text-sm font-medium"
              style={{ backgroundColor: '#F5F1EC', color: '#6B5D52' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
