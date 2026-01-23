/**
 * Engagement Panel Component - Shows analytics about issue engagement
 * Tracks views, read time, and recent viewers with privacy-aware user attribution
 */

import { useState, useEffect, useRef } from 'react';
import { Avatar } from '../shared/Avatar';

interface EngagementData {
  total_views: number;
  average_read_time: number;
  recent_viewers: Array<{
    user_id: string;
    user_name: string;
    read_time: number;
    viewed_at: string;
  }>;
}

interface EngagementPanelProps {
  worktreeId: string;
  boardId: string;
  issueId: string;
}

// Generate a session ID for tracking
function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// Mock user info - in production, this would come from auth context
const CURRENT_USER = {
  id: 'user_001',
  name: 'Current User'
};

export function EngagementPanel({ worktreeId, boardId, issueId }: EngagementPanelProps) {
  const [engagement, setEngagement] = useState<EngagementData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const sessionId = useRef(generateSessionId());
  const startTime = useRef(Date.now());
  const hasRecordedView = useRef(false);

  // Fetch engagement data
  useEffect(() => {
    fetchEngagementData();
  }, [worktreeId, boardId, issueId]);

  // Record view on mount
  useEffect(() => {
    if (!hasRecordedView.current) {
      recordView();
      hasRecordedView.current = true;
    }

    // Record time spent on unmount
    return () => {
      recordTimeSpent();
    };
  }, []);

  const fetchEngagementData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/tracker/worktrees/${worktreeId}/boards/${boardId}/issues/${issueId}/engagement`,
        {
          credentials: 'include'
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch engagement data');
      }

      const data = await response.json();
      setEngagement(data);
    } catch (err) {
      console.error('Failed to fetch engagement data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load engagement data');

      // Set mock data for development
      setEngagement({
        total_views: 42,
        average_read_time: 127,
        recent_viewers: [
          {
            user_id: 'user_001',
            user_name: 'Alice Johnson',
            read_time: 145,
            viewed_at: new Date(Date.now() - 3600000).toISOString()
          },
          {
            user_id: 'user_002',
            user_name: 'Bob Smith',
            read_time: 89,
            viewed_at: new Date(Date.now() - 7200000).toISOString()
          },
          {
            user_id: 'user_003',
            user_name: 'Carol Davis',
            read_time: 203,
            viewed_at: new Date(Date.now() - 10800000).toISOString()
          },
          {
            user_id: 'user_004',
            user_name: 'David Wilson',
            read_time: 56,
            viewed_at: new Date(Date.now() - 14400000).toISOString()
          }
        ]
      });
    } finally {
      setLoading(false);
    }
  };

  const recordView = async () => {
    try {
      await fetch(
        `/api/tracker/worktrees/${worktreeId}/boards/${boardId}/issues/${issueId}/engagement/record-view`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({
            user_id: CURRENT_USER.id,
            user_name: CURRENT_USER.name,
            read_time: 0,
            session_id: sessionId.current
          })
        }
      );
    } catch (err) {
      console.error('Failed to record view:', err);
    }
  };

  const recordTimeSpent = async () => {
    const readTime = Math.floor((Date.now() - startTime.current) / 1000);

    try {
      await fetch(
        `/api/tracker/worktrees/${worktreeId}/boards/${boardId}/issues/${issueId}/engagement/record-view`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({
            user_id: CURRENT_USER.id,
            user_name: CURRENT_USER.name,
            read_time: readTime,
            session_id: sessionId.current
          })
        }
      );
    } catch (err) {
      console.error('Failed to record time spent:', err);
    }
  };

  const formatReadTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  };

  const formatRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div
        className="bg-white rounded-lg p-6 shadow-warm-md animate-pulse"
        style={{
          borderColor: '#E8E0D5',
          borderWidth: '1px',
          borderStyle: 'solid'
        }}
      >
        <div className="h-6 w-48 rounded mb-4" style={{ backgroundColor: '#F5F1EC' }} />
        <div className="space-y-3">
          <div className="h-4 w-full rounded" style={{ backgroundColor: '#F5F1EC' }} />
          <div className="h-4 w-3/4 rounded" style={{ backgroundColor: '#F5F1EC' }} />
          <div className="h-4 w-5/6 rounded" style={{ backgroundColor: '#F5F1EC' }} />
        </div>
      </div>
    );
  }

  if (!engagement) {
    return null;
  }

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
        Engagement Analytics
      </h3>

      {error && (
        <div
          className="mb-4 p-3 rounded-lg text-sm"
          style={{ backgroundColor: '#FFF4ED', color: '#D97F6F' }}
        >
          Using demo data - API not available
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div
          className="p-4 rounded-lg"
          style={{ backgroundColor: '#F5F1EC' }}
        >
          <div className="text-2xl font-bold mb-1" style={{ color: '#D97F6F' }}>
            {engagement.total_views}
          </div>
          <div className="text-sm font-medium" style={{ color: '#6B5D52' }}>
            Total Views
          </div>
        </div>
        <div
          className="p-4 rounded-lg"
          style={{ backgroundColor: '#F5F1EC' }}
        >
          <div className="text-2xl font-bold mb-1" style={{ color: '#6B9BD1' }}>
            {formatReadTime(engagement.average_read_time)}
          </div>
          <div className="text-sm font-medium" style={{ color: '#6B5D52' }}>
            Avg. Read Time
          </div>
        </div>
      </div>

      {/* Recent Viewers */}
      {engagement.recent_viewers.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-3" style={{ color: '#6B5D52' }}>
            Recent Viewers (Last 10)
          </h4>
          <div className="space-y-3">
            {engagement.recent_viewers.slice(0, 10).map((viewer) => (
              <div
                key={`${viewer.user_id}-${viewer.viewed_at}`}
                className="flex items-center gap-3 p-3 rounded-lg transition-colors hover:shadow-sm"
                style={{ backgroundColor: '#F5F1EC' }}
              >
                <Avatar name={viewer.user_name} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate" style={{ color: '#2F241B' }}>
                    {viewer.user_name}
                  </div>
                  <div className="text-xs" style={{ color: '#A39686' }}>
                    {formatRelativeTime(viewer.viewed_at)}
                  </div>
                </div>
                <div className="text-sm font-medium" style={{ color: '#6B9BD1' }}>
                  {formatReadTime(viewer.read_time)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {engagement.recent_viewers.length === 0 && (
        <div className="text-center py-6" style={{ color: '#A39686' }}>
          <p className="text-sm">No viewers yet</p>
        </div>
      )}

      {/* Privacy Notice */}
      <div className="mt-4 pt-4 border-t text-xs" style={{ borderColor: '#E8E0D5', color: '#A39686' }}>
        User-attributed engagement tracking. All viewers are shown with their names.
      </div>
    </div>
  );
}
