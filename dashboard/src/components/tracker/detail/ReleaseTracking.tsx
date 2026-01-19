/**
 * Release Tracking Component - Shows release information and quality gates
 */

import { type Issue } from '../../../api/tracker';
import { useState, useEffect } from 'react';

interface QualityGate {
  id: string;
  name: string;
  status: 'passed' | 'failed' | 'pending' | 'skipped';
  description?: string;
  required: boolean;
}

interface Release {
  id: string;
  name: string;
  version: string;
  target_date: string | null;
  quality_gates: QualityGate[];
  metadata?: {
    created_at: string;
    updated_at: string;
  };
}

interface ReleaseTrackingProps {
  issue: Issue;
}

const API_BASE = '/api/tracker';

async function fetchRelease(worktreeId: string, releaseId: string): Promise<Release> {
  const response = await fetch(`${API_BASE}/worktrees/${worktreeId}/releases/${releaseId}`, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch release data');
  }

  return response.json();
}

async function updateGateStatus(
  worktreeId: string,
  releaseId: string,
  gateId: string,
  status: QualityGate['status']
): Promise<void> {
  const response = await fetch(
    `${API_BASE}/worktrees/${worktreeId}/releases/${releaseId}/gates/${gateId}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ status }),
    }
  );

  if (!response.ok) {
    throw new Error('Failed to update gate status');
  }
}

export function ReleaseTracking({ issue }: ReleaseTrackingProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [release, setRelease] = useState<Release | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Only render if issue has a release_id
  if (!issue.release_id) {
    return null;
  }

  useEffect(() => {
    loadRelease();
  }, [issue.release_id]);

  const loadRelease = async () => {
    if (!issue.release_id) return;

    setLoading(true);
    setError(null);
    try {
      const data = await fetchRelease(issue.worktree_id, issue.release_id);
      setRelease(data);
    } catch (err) {
      console.error('Failed to load release:', err);
      setError('Failed to load release data');
    } finally {
      setLoading(false);
    }
  };

  const handleGateStatusChange = async (gateId: string, newStatus: QualityGate['status']) => {
    if (!release || !issue.release_id) return;

    try {
      await updateGateStatus(issue.worktree_id, issue.release_id, gateId, newStatus);
      await loadRelease(); // Reload to get updated data
    } catch (err) {
      console.error('Failed to update gate status:', err);
      alert('Failed to update gate status');
    }
  };

  const getStatusIcon = (status: QualityGate['status']) => {
    switch (status) {
      case 'passed':
        return '✓';
      case 'failed':
        return '✗';
      case 'pending':
        return '⏳';
      case 'skipped':
        return '−';
      default:
        return '?';
    }
  };

  const getStatusColor = (status: QualityGate['status']) => {
    switch (status) {
      case 'passed':
        return '#4CAF50'; // green
      case 'failed':
        return '#F44336'; // red
      case 'pending':
        return '#FFC107'; // yellow
      case 'skipped':
        return '#9E9E9E'; // gray
      default:
        return '#A39686';
    }
  };

  const calculateProgress = () => {
    if (!release) return 0;

    const requiredGates = (release.quality_gates || []).filter(g => g.required);
    if (requiredGates.length === 0) return 0;

    const passedGates = requiredGates.filter(g => g.status === 'passed');
    return Math.round((passedGates.length / requiredGates.length) * 100);
  };

  const progress = calculateProgress();

  return (
    <div
      className="bg-white rounded-lg shadow-warm-md"
      style={{
        borderColor: '#E8E0D5',
        borderWidth: '1px',
        borderStyle: 'solid',
      }}
    >
      {/* Header */}
      <div
        className="p-6 cursor-pointer select-none"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold" style={{ color: '#2F241B' }}>
            Release Tracking
          </h3>
          <div className="flex items-center gap-3">
            {release && (
              <span className="text-sm font-medium" style={{ color: '#6B5D52' }}>
                {progress}% Complete
              </span>
            )}
            <span
              className="text-xl transition-transform duration-200"
              style={{
                transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                display: 'inline-block',
              }}
            >
              ▼
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="px-6 pb-6 space-y-4">
          {loading && (
            <div className="text-center py-4" style={{ color: '#A39686' }}>
              <p className="text-sm">Loading release data...</p>
            </div>
          )}

          {error && (
            <div
              className="p-4 rounded-lg text-sm"
              style={{ backgroundColor: '#FEE', color: '#C00' }}
            >
              {error}
            </div>
          )}

          {release && !loading && (
            <>
              {/* Release info */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-semibold block mb-1" style={{ color: '#A39686' }}>
                    Release Name
                  </label>
                  <p className="text-sm font-medium" style={{ color: '#2F241B' }}>
                    {release.name}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-1" style={{ color: '#A39686' }}>
                    Version
                  </label>
                  <p className="text-sm font-medium" style={{ color: '#2F241B' }}>
                    {release.version}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-1" style={{ color: '#A39686' }}>
                    Target Date
                  </label>
                  <p className="text-sm font-medium" style={{ color: '#2F241B' }}>
                    {release.target_date
                      ? new Date(release.target_date).toLocaleDateString()
                      : 'Not set'}
                  </p>
                </div>
              </div>

              {/* Progress bar */}
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span style={{ color: '#6B5D52' }}>Quality Gates Progress</span>
                  <span className="font-semibold" style={{ color: '#2F241B' }}>
                    {progress}%
                  </span>
                </div>
                <div className="w-full h-3 rounded-full" style={{ backgroundColor: '#F5F1EC' }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${progress}%`,
                      background: 'linear-gradient(90deg, #D97F6F 0%, #E0B666 100%)',
                    }}
                  />
                </div>
              </div>

              {/* Quality gates checklist */}
              {release.quality_gates && release.quality_gates.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-3" style={{ color: '#2F241B' }}>
                  Quality Gates
                </h4>
                <div className="space-y-2">
                  {release.quality_gates.map((gate) => (
                    <div
                      key={gate.id}
                      className="flex items-start gap-3 p-3 rounded-lg transition-colors hover:bg-opacity-50"
                      style={{ backgroundColor: '#FAFAF8' }}
                    >
                      <div
                        className="w-6 h-6 rounded flex items-center justify-center font-bold flex-shrink-0 mt-0.5"
                        style={{
                          backgroundColor: `${getStatusColor(gate.status)}20`,
                          color: getStatusColor(gate.status),
                        }}
                      >
                        {getStatusIcon(gate.status)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium" style={{ color: '#2F241B' }}>
                            {gate.name}
                          </span>
                          {gate.required && (
                            <span
                              className="text-xs px-2 py-0.5 rounded"
                              style={{ backgroundColor: '#FFE4E1', color: '#D97F6F' }}
                            >
                              Required
                            </span>
                          )}
                        </div>
                        {gate.description && (
                          <p className="text-xs" style={{ color: '#6B5D52' }}>
                            {gate.description}
                          </p>
                        )}
                      </div>
                      <select
                        value={gate.status}
                        onChange={(e) =>
                          handleGateStatusChange(gate.id, e.target.value as QualityGate['status'])
                        }
                        onClick={(e) => e.stopPropagation()}
                        className="text-sm px-2 py-1 border rounded focus:outline-none focus-coral"
                        style={{ borderColor: '#E8E0D5', color: '#2F241B' }}
                      >
                        <option value="pending">Pending</option>
                        <option value="passed">Passed</option>
                        <option value="failed">Failed</option>
                        <option value="skipped">Skipped</option>
                      </select>
                    </div>
                  ))}
                </div>
              </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
