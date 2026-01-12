import { useEffect, useState } from 'react';
import axios from 'axios';

interface WorktreeStatus {
  name: string;
  status: 'online' | 'offline';
  lastSeen: string;
  agentVersion: string;
  ports: Record<string, number>;
  health: Record<string, string>;
  path: string;
}

interface ServiceHealth {
  status: string;
  service: string;
  version: string;
  worktree: string;
  timestamp: string;
}

const OverviewPage = () => {
  const [serviceHealth, setServiceHealth] = useState<ServiceHealth | null>(null);
  const [worktrees, setWorktrees] = useState<WorktreeStatus[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [healthRes, worktreesRes] = await Promise.all([
        axios.get<ServiceHealth>('/health'),
        axios.get<{ worktrees: WorktreeStatus[] }>('/api/v1/worktrees'),
      ]);

      setServiceHealth(healthRes.data);
      setWorktrees(worktreesRes.data.worktrees);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-neutral-900">Martha Dashboard</h1>
        <p className="mt-2 text-neutral-600">
          Multi-Agent Parallel Development System - TypeScript Service
        </p>
      </div>

      {/* Service Status */}
      <div className="card">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold mb-2">Service Status</h2>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${
                  serviceHealth?.status === 'healthy' ? 'bg-green-500' : 'bg-red-500'
                } animate-pulse`}></div>
                <span className="text-sm text-neutral-600">
                  {serviceHealth?.status === 'healthy' ? 'Healthy' : 'Unhealthy'}
                </span>
              </div>
              <div className="text-sm text-neutral-500">
                Version: {serviceHealth?.version}
              </div>
              <div className="text-sm text-neutral-500">
                Worktree: {serviceHealth?.worktree}
              </div>
            </div>
          </div>
          <div className="text-right text-sm text-neutral-500">
            Last updated: {serviceHealth?.timestamp ? new Date(serviceHealth.timestamp).toLocaleTimeString() : 'N/A'}
          </div>
        </div>
      </div>

      {/* Worktrees Status */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold">Active Worktrees</h2>
          <span className="badge badge-info">
            {worktrees.filter(w => w.status === 'online').length} online
          </span>
        </div>

        {worktrees.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-neutral-500">No worktrees found</p>
            <p className="text-sm text-neutral-400 mt-2">
              Start a worktree agent to see it here
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {worktrees.map((worktree) => (
              <div key={worktree.name} className="card">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">{worktree.name}</h3>
                      <span className={`badge ${
                        worktree.status === 'online' ? 'badge-success' : 'badge-error'
                      }`}>
                        {worktree.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm text-neutral-600">
                      <div>
                        <span className="text-neutral-500">Agent Version:</span>{' '}
                        {worktree.agentVersion || 'N/A'}
                      </div>
                      <div>
                        <span className="text-neutral-500">Last Seen:</span>{' '}
                        {worktree.lastSeen ? new Date(worktree.lastSeen).toLocaleString() : 'N/A'}
                      </div>
                    </div>
                    <div className="mt-2 text-sm text-neutral-600">
                      <span className="text-neutral-500">Directory:</span>{' '}
                      <span className="font-mono text-xs">{worktree.path}</span>
                    </div>
                    {Object.keys(worktree.ports).length > 0 && (
                      <div className="mt-3 pt-3 border-t border-neutral-200">
                        <div className="text-xs text-neutral-500 mb-2">Ports:</div>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(worktree.ports).map(([service, port]) => (
                            <span key={service} className="badge badge-info">
                              {service}: {port}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Links */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">Quick Links</h2>
        <div className="grid grid-cols-2 gap-4">
          <a
            href="/health"
            target="_blank"
            rel="noopener noreferrer"
            className="p-4 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors"
          >
            <div className="text-sm font-medium text-neutral-900">Health Endpoint</div>
            <div className="text-xs text-neutral-500 mt-1">Service health check</div>
          </a>
          <a
            href="/api/v1/worktrees"
            target="_blank"
            rel="noopener noreferrer"
            className="p-4 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors"
          >
            <div className="text-sm font-medium text-neutral-900">Worktrees API</div>
            <div className="text-xs text-neutral-500 mt-1">List all worktrees</div>
          </a>
        </div>
      </div>
    </div>
  );
};

export default OverviewPage;
