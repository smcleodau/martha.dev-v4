import { useEffect, useState } from 'react';
import axios from 'axios';

interface Exception {
  id: number;
  timestamp: string;
  workflowId: string;
  issueId?: string;
  errorMessage: string;
  errorStack?: string;
  errorCode?: string;
  severity: string;
  resolved: boolean;
  occurrenceCount: number;
}

interface ExceptionDashboardProps {
  compact?: boolean;
}

export default function ExceptionDashboard({ compact = false }: ExceptionDashboardProps) {
  const [exceptions, setExceptions] = useState<Exception[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    severity: '',
    resolved: 'false',
  });
  const [selectedEx, setSelectedEx] = useState<Exception | null>(null);

  useEffect(() => {
    loadExceptions();
    const interval = setInterval(loadExceptions, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, [filter]);

  const loadExceptions = async () => {
    try {
      const response = await axios.get('/api/v1/telemetry/exceptions', {
        params: {
          limit: compact ? 5 : 30,
          resolved: filter.resolved === 'all' ? undefined : filter.resolved === 'true',
          severity: filter.severity || undefined,
        },
      });
      setExceptions(response.data.exceptions || []);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load exceptions:', error);
      // Use mock data for development
      setExceptions(generateMockExceptions());
      setLoading(false);
    }
  };

  const generateMockExceptions = (): Exception[] => {
    return [
      {
        id: 1,
        timestamp: new Date(Date.now() - 10 * 60000).toISOString(),
        workflowId: 'wf-abc123def456',
        issueId: 'TASK-1234',
        errorMessage: 'Database connection timeout',
        errorCode: 'ETIMEDOUT',
        severity: 'error',
        resolved: false,
        occurrenceCount: 3,
      },
      {
        id: 2,
        timestamp: new Date(Date.now() - 25 * 60000).toISOString(),
        workflowId: 'wf-xyz789ghi012',
        issueId: 'TASK-1235',
        errorMessage: 'Rate limit exceeded for GitHub API',
        errorCode: 'RATE_LIMIT',
        severity: 'warning',
        resolved: false,
        occurrenceCount: 12,
      },
      {
        id: 3,
        timestamp: new Date(Date.now() - 45 * 60000).toISOString(),
        workflowId: 'wf-mno345pqr678',
        issueId: 'BUG-567',
        errorMessage: 'Null pointer exception in activity processor',
        errorCode: 'NULL_REF',
        severity: 'critical',
        resolved: false,
        occurrenceCount: 1,
      },
      {
        id: 4,
        timestamp: new Date(Date.now() - 2 * 3600000).toISOString(),
        workflowId: 'wf-stu901vwx234',
        errorMessage: 'Invalid JSON in response payload',
        errorCode: 'PARSE_ERROR',
        severity: 'error',
        resolved: true,
        occurrenceCount: 5,
      },
      {
        id: 5,
        timestamp: new Date(Date.now() - 3 * 3600000).toISOString(),
        workflowId: 'wf-yza567bcd890',
        issueId: 'TASK-1236',
        errorMessage: 'Memory allocation failed',
        errorCode: 'OUT_OF_MEMORY',
        severity: 'critical',
        resolved: true,
        occurrenceCount: 2,
      },
    ];
  };

  const severityColors = {
    warning: 'bg-yellow-900/20 text-yellow-400 border-yellow-500/30',
    error: 'bg-red-900/20 text-red-400 border-red-500/30',
    critical: 'bg-red-900/40 text-red-500 border-red-500/50',
  };

  const severityIcons = {
    warning: '⚠️',
    error: '❌',
    critical: '🔥',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-400">Loading exceptions...</div>
      </div>
    );
  }

  const activeExceptions = exceptions.filter((ex) => !ex.resolved);
  const criticalCount = activeExceptions.filter((ex) => ex.severity === 'critical').length;
  const errorCount = activeExceptions.filter((ex) => ex.severity === 'error').length;
  const warningCount = activeExceptions.filter((ex) => ex.severity === 'warning').length;

  return (
    <div className={`flex flex-col h-full ${compact ? 'p-4' : 'space-y-4'}`}>
      {!compact && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold text-gray-100 mb-4">Exception Dashboard</h2>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">🔥</span>
                <span className="text-sm text-red-400 font-medium">Critical</span>
              </div>
              <div className="text-3xl font-bold text-red-500">{criticalCount}</div>
            </div>
            <div className="bg-red-900/10 border border-red-500/20 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">❌</span>
                <span className="text-sm text-red-400 font-medium">Errors</span>
              </div>
              <div className="text-3xl font-bold text-red-400">{errorCount}</div>
            </div>
            <div className="bg-yellow-900/10 border border-yellow-500/20 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">⚠️</span>
                <span className="text-sm text-yellow-400 font-medium">Warnings</span>
              </div>
              <div className="text-3xl font-bold text-yellow-400">{warningCount}</div>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">✅</span>
                <span className="text-sm text-gray-400 font-medium">Resolved</span>
              </div>
              <div className="text-3xl font-bold text-green-400">
                {exceptions.filter((ex) => ex.resolved).length}
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-4">
            <select
              value={filter.severity}
              onChange={(e) => setFilter({ ...filter, severity: e.target.value })}
              className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-300 focus:outline-none focus:border-blue-500"
            >
              <option value="">All Severities</option>
              <option value="warning">Warning</option>
              <option value="error">Error</option>
              <option value="critical">Critical</option>
            </select>

            <select
              value={filter.resolved}
              onChange={(e) => setFilter({ ...filter, resolved: e.target.value })}
              className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-300 focus:outline-none focus:border-blue-500"
            >
              <option value="false">Active Only</option>
              <option value="true">Resolved Only</option>
              <option value="all">All Exceptions</option>
            </select>

            <button
              onClick={loadExceptions}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>
      )}

      {/* Exceptions List */}
      <div className={`bg-gray-900 border border-gray-800 rounded-lg overflow-hidden flex-1 ${compact ? '' : 'min-h-96'}`}>
        <div className="overflow-auto h-full">
          {exceptions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 p-8">
              <div className="text-4xl mb-4">🎉</div>
              <div className="text-lg font-medium mb-2">No exceptions found</div>
              <div className="text-sm">System running smoothly!</div>
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {exceptions.map((exception) => (
                <div
                  key={exception.id}
                  onClick={() => setSelectedEx(exception)}
                  className={`border rounded-lg p-4 cursor-pointer transition-all ${
                    severityColors[exception.severity as keyof typeof severityColors]
                  } ${selectedEx?.id === exception.id ? 'ring-2 ring-blue-500' : 'hover:border-gray-600'}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">
                          {severityIcons[exception.severity as keyof typeof severityIcons]}
                        </span>
                        <span className="text-xs font-mono text-gray-400">
                          {new Date(exception.timestamp).toLocaleString()}
                        </span>
                        {exception.occurrenceCount > 1 && (
                          <span className="px-2 py-0.5 bg-gray-700 rounded text-xs text-gray-300">
                            {exception.occurrenceCount}x
                          </span>
                        )}
                        {exception.resolved && (
                          <span className="px-2 py-0.5 bg-green-900/30 border border-green-500/30 rounded text-xs text-green-400">
                            Resolved
                          </span>
                        )}
                      </div>
                      <div className="font-medium mb-2">{exception.errorMessage}</div>
                      {!compact && (
                        <div className="flex flex-wrap gap-3 text-xs text-gray-400">
                          <span className="font-mono">{exception.workflowId}</span>
                          {exception.issueId && <span className="text-purple-400">{exception.issueId}</span>}
                          {exception.errorCode && (
                            <span className="px-2 py-0.5 bg-gray-800 rounded">{exception.errorCode}</span>
                          )}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // Handle resolve action
                      }}
                      className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                        exception.resolved
                          ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                          : 'bg-green-600 hover:bg-green-700 text-white'
                      }`}
                      disabled={exception.resolved}
                    >
                      {exception.resolved ? 'Resolved' : 'Mark Resolved'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {!compact && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">
              Showing {exceptions.length} exceptions
            </span>
            <span className="text-gray-500">
              Last updated: {new Date().toLocaleTimeString()}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
