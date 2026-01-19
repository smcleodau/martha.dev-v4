import { useEffect, useState } from 'react';
import axios from 'axios';

interface AgentMetrics {
  agentId: string;
  agentType: string;
  totalEvents: number;
  avgDurationMs: number;
  errorCount: number;
  successRate: number;
  lastActive: string;
}

interface AgentPerformanceMetricsProps {
  compact?: boolean;
}

export default function AgentPerformanceMetrics({ compact = false }: AgentPerformanceMetricsProps) {
  const [metrics, setMetrics] = useState<AgentMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('1h');

  useEffect(() => {
    loadMetrics();
    const interval = setInterval(loadMetrics, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, [timeRange]);

  const loadMetrics = async () => {
    try {
      const response = await axios.get('/api/v1/telemetry/agent-metrics', {
        params: {
          timeRange,
          limit: compact ? 5 : 20,
        },
      });
      setMetrics(response.data.metrics || []);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load agent metrics:', error);
      // Use mock data for development
      setMetrics(generateMockMetrics());
      setLoading(false);
    }
  };

  const generateMockMetrics = (): AgentMetrics[] => {
    return [
      {
        agentId: 'agent-001',
        agentType: 'IssueProcessor',
        totalEvents: 1247,
        avgDurationMs: 342,
        errorCount: 3,
        successRate: 99.76,
        lastActive: new Date(Date.now() - 5 * 60000).toISOString(),
      },
      {
        agentId: 'agent-002',
        agentType: 'CodeAnalyzer',
        totalEvents: 856,
        avgDurationMs: 1205,
        errorCount: 12,
        successRate: 98.60,
        lastActive: new Date(Date.now() - 2 * 60000).toISOString(),
      },
      {
        agentId: 'agent-003',
        agentType: 'DocumentGenerator',
        totalEvents: 423,
        avgDurationMs: 678,
        errorCount: 0,
        successRate: 100,
        lastActive: new Date(Date.now() - 15 * 60000).toISOString(),
      },
      {
        agentId: 'agent-004',
        agentType: 'TestRunner',
        totalEvents: 2134,
        avgDurationMs: 4567,
        errorCount: 45,
        successRate: 97.89,
        lastActive: new Date(Date.now() - 1 * 60000).toISOString(),
      },
      {
        agentId: 'agent-005',
        agentType: 'ExceptionDetector',
        totalEvents: 567,
        avgDurationMs: 123,
        errorCount: 2,
        successRate: 99.65,
        lastActive: new Date(Date.now() - 8 * 60000).toISOString(),
      },
    ];
  };

  const getSuccessRateColor = (rate: number) => {
    if (rate >= 99) return 'text-green-400';
    if (rate >= 95) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getActivityStatus = (lastActive: string) => {
    const minutesAgo = Math.floor((Date.now() - new Date(lastActive).getTime()) / 60000);
    if (minutesAgo < 5) return { status: 'Active', color: 'bg-green-500' };
    if (minutesAgo < 15) return { status: 'Idle', color: 'bg-yellow-500' };
    return { status: 'Inactive', color: 'bg-gray-500' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-400">Loading agent metrics...</div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full ${compact ? 'p-4' : 'space-y-4'}`}>
      {!compact && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-100">Agent Performance Metrics</h2>

            <div className="flex gap-2">
              {['15m', '1h', '6h', '24h'].map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                    timeRange === range
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-800/50 rounded-lg p-4">
              <div className="text-sm text-gray-400 mb-1">Total Agents</div>
              <div className="text-2xl font-bold text-gray-100">{metrics.length}</div>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-4">
              <div className="text-sm text-gray-400 mb-1">Active Agents</div>
              <div className="text-2xl font-bold text-green-400">
                {metrics.filter((m) => getActivityStatus(m.lastActive).status === 'Active').length}
              </div>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-4">
              <div className="text-sm text-gray-400 mb-1">Total Events</div>
              <div className="text-2xl font-bold text-blue-400">
                {metrics.reduce((sum, m) => sum + m.totalEvents, 0).toLocaleString()}
              </div>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-4">
              <div className="text-sm text-gray-400 mb-1">Avg Success Rate</div>
              <div className="text-2xl font-bold text-green-400">
                {(metrics.reduce((sum, m) => sum + m.successRate, 0) / metrics.length).toFixed(2)}%
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Metrics Table */}
      <div className={`bg-gray-900 border border-gray-800 rounded-lg overflow-hidden flex-1 ${compact ? '' : 'min-h-96'}`}>
        <div className="overflow-auto h-full">
          {metrics.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-400">
              No agent metrics available
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-800/50 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Agent Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Agent ID
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Events
                  </th>
                  {!compact && (
                    <>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Avg Duration
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Errors
                      </th>
                    </>
                  )}
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Success Rate
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {metrics.map((metric) => {
                  const activityStatus = getActivityStatus(metric.lastActive);
                  return (
                    <tr key={metric.agentId} className="hover:bg-gray-800/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${activityStatus.color}`} />
                          <span className="text-sm text-gray-400">{activityStatus.status}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300 font-medium">
                        {metric.agentType}
                      </td>
                      <td className="px-4 py-3 text-sm text-blue-400 font-mono">
                        {metric.agentId}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300 text-right">
                        {metric.totalEvents.toLocaleString()}
                      </td>
                      {!compact && (
                        <>
                          <td className="px-4 py-3 text-sm text-gray-400 text-right">
                            {metric.avgDurationMs}ms
                          </td>
                          <td className="px-4 py-3 text-sm text-red-400 text-right">
                            {metric.errorCount}
                          </td>
                        </>
                      )}
                      <td className="px-4 py-3 text-sm text-right">
                        <span className={`font-medium ${getSuccessRateColor(metric.successRate)}`}>
                          {metric.successRate.toFixed(2)}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {!compact && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">
              Showing {metrics.length} agents
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
