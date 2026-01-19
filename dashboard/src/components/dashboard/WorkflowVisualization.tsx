import { useEffect, useState } from 'react';
import axios from 'axios';

interface Workflow {
  workflowId: string;
  workflowType: string;
  issueId?: string;
  epicId?: string;
  status: 'running' | 'completed' | 'failed';
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  eventCount: number;
}

interface WorkflowVisualizationProps {
  compact?: boolean;
}

export default function WorkflowVisualization({ compact = false }: WorkflowVisualizationProps) {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    status: 'running',
    type: '',
  });

  useEffect(() => {
    loadWorkflows();
    const interval = setInterval(loadWorkflows, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, [filter]);

  const loadWorkflows = async () => {
    try {
      const response = await axios.get('/api/v1/telemetry/workflows', {
        params: {
          limit: compact ? 5 : 20,
          status: filter.status || undefined,
          type: filter.type || undefined,
        },
      });
      setWorkflows(response.data.workflows || []);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load workflows:', error);
      // Use mock data for development
      setWorkflows(generateMockWorkflows());
      setLoading(false);
    }
  };

  const generateMockWorkflows = (): Workflow[] => {
    return [
      {
        workflowId: 'wf-issue-lifecycle-001',
        workflowType: 'IssueLifecycle',
        issueId: 'TASK-1234',
        epicId: 'EPIC-45',
        status: 'running',
        startedAt: new Date(Date.now() - 15 * 60000).toISOString(),
        eventCount: 47,
      },
      {
        workflowId: 'wf-batch-processing-002',
        workflowType: 'BatchProcessor',
        epicId: 'EPIC-46',
        status: 'running',
        startedAt: new Date(Date.now() - 8 * 60000).toISOString(),
        eventCount: 23,
      },
      {
        workflowId: 'wf-code-analysis-003',
        workflowType: 'CodeAnalysis',
        issueId: 'TASK-1235',
        status: 'completed',
        startedAt: new Date(Date.now() - 45 * 60000).toISOString(),
        completedAt: new Date(Date.now() - 30 * 60000).toISOString(),
        durationMs: 900000,
        eventCount: 156,
      },
      {
        workflowId: 'wf-test-execution-004',
        workflowType: 'TestExecution',
        issueId: 'BUG-567',
        status: 'failed',
        startedAt: new Date(Date.now() - 60 * 60000).toISOString(),
        completedAt: new Date(Date.now() - 55 * 60000).toISOString(),
        durationMs: 300000,
        eventCount: 89,
      },
      {
        workflowId: 'wf-doc-generation-005',
        workflowType: 'DocumentGeneration',
        status: 'running',
        startedAt: new Date(Date.now() - 3 * 60000).toISOString(),
        eventCount: 12,
      },
    ];
  };

  const statusColors = {
    running: 'bg-blue-900/20 text-blue-400 border-blue-500/30',
    completed: 'bg-green-900/20 text-green-400 border-green-500/30',
    failed: 'bg-red-900/20 text-red-400 border-red-500/30',
  };

  const statusIcons = {
    running: '🔄',
    completed: '✅',
    failed: '❌',
  };

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  const getRunningDuration = (startedAt: string) => {
    const ms = Date.now() - new Date(startedAt).getTime();
    return formatDuration(ms);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-400">Loading workflows...</div>
      </div>
    );
  }

  const runningCount = workflows.filter((w) => w.status === 'running').length;
  const completedCount = workflows.filter((w) => w.status === 'completed').length;
  const failedCount = workflows.filter((w) => w.status === 'failed').length;

  return (
    <div className={`flex flex-col h-full ${compact ? 'p-4' : 'space-y-4'}`}>
      {!compact && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold text-gray-100 mb-4">Workflow Visualization</h2>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">🔄</span>
                <span className="text-sm text-blue-400 font-medium">Running</span>
              </div>
              <div className="text-3xl font-bold text-blue-400">{runningCount}</div>
            </div>
            <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">✅</span>
                <span className="text-sm text-green-400 font-medium">Completed</span>
              </div>
              <div className="text-3xl font-bold text-green-400">{completedCount}</div>
            </div>
            <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">❌</span>
                <span className="text-sm text-red-400 font-medium">Failed</span>
              </div>
              <div className="text-3xl font-bold text-red-400">{failedCount}</div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-4">
            <select
              value={filter.status}
              onChange={(e) => setFilter({ ...filter, status: e.target.value })}
              className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-300 focus:outline-none focus:border-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="running">Running</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
            </select>

            <button
              onClick={loadWorkflows}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>
      )}

      {/* Workflows List */}
      <div className={`bg-gray-900 border border-gray-800 rounded-lg overflow-hidden flex-1 ${compact ? '' : 'min-h-96'}`}>
        <div className="overflow-auto h-full">
          {workflows.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-400">
              No workflows found
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {workflows.map((workflow) => (
                <div
                  key={workflow.workflowId}
                  className={`border rounded-lg p-4 transition-all ${
                    statusColors[workflow.status]
                  } hover:border-gray-600`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">{statusIcons[workflow.status]}</span>
                        <span className="font-medium">{workflow.workflowType}</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          statusColors[workflow.status]
                        }`}>
                          {workflow.status}
                        </span>
                      </div>

                      <div className="space-y-1 text-sm">
                        <div className="flex items-center gap-2 text-gray-400">
                          <span className="font-mono text-xs">{workflow.workflowId}</span>
                        </div>

                        {!compact && (
                          <div className="flex flex-wrap gap-3 text-xs">
                            {workflow.issueId && (
                              <span className="text-purple-400">{workflow.issueId}</span>
                            )}
                            {workflow.epicId && (
                              <span className="text-blue-400">{workflow.epicId}</span>
                            )}
                            <span className="text-gray-500">Events: {workflow.eventCount}</span>
                          </div>
                        )}

                        <div className="text-xs text-gray-400">
                          {workflow.status === 'running' ? (
                            <span>Running for {getRunningDuration(workflow.startedAt)}</span>
                          ) : workflow.durationMs ? (
                            <span>Completed in {formatDuration(workflow.durationMs)}</span>
                          ) : (
                            <span>Started {new Date(workflow.startedAt).toLocaleString()}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {workflow.status === 'running' && (
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                        <span className="text-xs text-blue-400">Live</span>
                      </div>
                    )}
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
              Showing {workflows.length} workflows
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
