import { useEffect, useState } from 'react';
import axios from 'axios';

interface TelemetryEvent {
  id?: number;
  timestamp: string;
  eventType: string;
  eventCategory: string;
  severity: string;
  workflowId: string;
  workflowType: string;
  issueId?: string;
  epicId?: string;
  agentId?: string;
  durationMs?: number;
  errorMessage?: string;
  tags?: string[];
}

interface TelemetryExplorerProps {
  compact?: boolean;
}

export default function TelemetryExplorer({ compact = false }: TelemetryExplorerProps) {
  const [events, setEvents] = useState<TelemetryEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    category: '',
    severity: '',
    searchTerm: '',
  });

  useEffect(() => {
    loadEvents();
    const interval = setInterval(loadEvents, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, [filter]);

  const loadEvents = async () => {
    try {
      const response = await axios.get('/api/v1/telemetry/events', {
        params: {
          limit: compact ? 10 : 50,
          category: filter.category || undefined,
          severity: filter.severity || undefined,
        },
      });
      setEvents(response.data.events || []);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load telemetry events:', error);
      setLoading(false);
    }
  };

  const severityColors = {
    debug: 'text-gray-400 bg-gray-800/50',
    info: 'text-blue-400 bg-blue-900/20',
    warning: 'text-yellow-400 bg-yellow-900/20',
    error: 'text-red-400 bg-red-900/20',
    critical: 'text-red-500 bg-red-900/40',
  };

  const categoryIcons = {
    workflow: '🔄',
    activity: '⚙️',
    signal: '📡',
    query: '❓',
    exception: '⚠️',
    hook: '🪝',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-400">Loading telemetry events...</div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full ${compact ? 'p-4' : 'space-y-4'}`}>
      {!compact && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold text-gray-100 mb-4">Telemetry Explorer</h2>

          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-6">
            <select
              value={filter.category}
              onChange={(e) => setFilter({ ...filter, category: e.target.value })}
              className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-300 focus:outline-none focus:border-blue-500"
            >
              <option value="">All Categories</option>
              <option value="workflow">Workflows</option>
              <option value="activity">Activities</option>
              <option value="signal">Signals</option>
              <option value="query">Queries</option>
              <option value="exception">Exceptions</option>
              <option value="hook">Hooks</option>
            </select>

            <select
              value={filter.severity}
              onChange={(e) => setFilter({ ...filter, severity: e.target.value })}
              className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-300 focus:outline-none focus:border-blue-500"
            >
              <option value="">All Severities</option>
              <option value="debug">Debug</option>
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="error">Error</option>
              <option value="critical">Critical</option>
            </select>

            <input
              type="text"
              placeholder="Search events..."
              value={filter.searchTerm}
              onChange={(e) => setFilter({ ...filter, searchTerm: e.target.value })}
              className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-300 placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />

            <button
              onClick={loadEvents}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>
      )}

      {/* Events List */}
      <div className={`bg-gray-900 border border-gray-800 rounded-lg overflow-hidden flex-1 ${compact ? '' : 'min-h-96'}`}>
        <div className="overflow-auto h-full">
          {events.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-400">
              No telemetry events found
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-800/50 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Event Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Workflow
                  </th>
                  {!compact && (
                    <>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Issue
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Duration
                      </th>
                    </>
                  )}
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Severity
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {events.map((event, index) => (
                  <tr key={event.id || index} className="hover:bg-gray-800/30 transition-colors">
                    <td className="px-4 py-3 text-sm text-gray-400 font-mono whitespace-nowrap">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-2">
                        <span>{categoryIcons[event.eventCategory as keyof typeof categoryIcons] || '📄'}</span>
                        <span className="text-gray-300">{event.eventCategory}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-300 font-medium">
                      {event.eventType}
                    </td>
                    <td className="px-4 py-3 text-sm text-blue-400 font-mono">
                      {event.workflowId.substring(0, 12)}...
                    </td>
                    {!compact && (
                      <>
                        <td className="px-4 py-3 text-sm text-purple-400">
                          {event.issueId || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-400">
                          {event.durationMs ? `${event.durationMs}ms` : '-'}
                        </td>
                      </>
                    )}
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${severityColors[event.severity as keyof typeof severityColors] || severityColors.info}`}>
                        {event.severity}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {!compact && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">
              Showing {events.length} events
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
