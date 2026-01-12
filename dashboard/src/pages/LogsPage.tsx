import { useEffect, useState, useRef } from 'react';
import axios from 'axios';

interface LogFile {
  worktree: string;
  file: string;
}

const LogsPage = () => {
  const [worktrees, setWorktrees] = useState<LogFile[]>([]);
  const [selectedWorktree, setSelectedWorktree] = useState<string>('');
  const [logs, setLogs] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Fetch available worktrees
  useEffect(() => {
    const fetchWorktrees = async () => {
      try {
        const response = await axios.get<{ logs: LogFile[] }>('/api/v1/logs');
        setWorktrees(response.data.logs);
        if (response.data.logs.length > 0 && !selectedWorktree) {
          setSelectedWorktree(response.data.logs[0].worktree);
        }
      } catch (error) {
        console.error('Failed to fetch worktrees:', error);
      }
    };

    fetchWorktrees();
  }, []);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  // Connect to SSE endpoint when worktree is selected
  useEffect(() => {
    if (!selectedWorktree) return;

    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    setLogs([]);
    setIsConnected(false);

    // Create new SSE connection
    const eventSource = new EventSource(`/api/v1/logs/${selectedWorktree}?lines=100`);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setIsConnected(true);
      console.log('Connected to log stream');
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'initial') {
          setLogs(data.lines);
        } else if (data.type === 'update') {
          setLogs((prev) => [...prev, ...data.lines]);
        } else if (data.type === 'error') {
          console.error('Log stream error:', data.message);
          setLogs((prev) => [...prev, `ERROR: ${data.message}`]);
        } else if (data.type === 'info') {
          setLogs((prev) => [...prev, `INFO: ${data.message}`]);
        }
      } catch (error) {
        console.error('Failed to parse log event:', error);
      }
    };

    eventSource.onerror = () => {
      setIsConnected(false);
      console.error('SSE connection error');
    };

    // Cleanup on unmount
    return () => {
      eventSource.close();
    };
  }, [selectedWorktree]);

  // Handle worktree selection change
  const handleWorktreeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedWorktree(event.target.value);
  };

  // Clear logs
  const handleClear = () => {
    setLogs([]);
  };

  // Parse JSON logs for better display
  const parseLogLine = (line: string) => {
    try {
      const json = JSON.parse(line);
      const timestamp = new Date(json.time).toLocaleTimeString();
      const level = json.level || 'INFO';
      const module = json.module || '';
      const msg = json.msg || line;

      return {
        timestamp,
        level,
        module,
        msg,
        raw: line,
      };
    } catch {
      return {
        timestamp: '',
        level: 'INFO',
        module: '',
        msg: line,
        raw: line,
      };
    }
  };

  // Get color class for log level
  const getLevelColor = (level: string) => {
    switch (level) {
      case 'ERROR':
        return 'text-red-600';
      case 'WARN':
        return 'text-yellow-600';
      case 'INFO':
        return 'text-blue-600';
      case 'DEBUG':
        return 'text-neutral-500';
      default:
        return 'text-neutral-700';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-neutral-900">Live Logs</h1>
        <p className="mt-2 text-neutral-600">
          Real-time log streaming from worktree agents
        </p>
      </div>

      {/* Controls */}
      <div className="card">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1">
            <label htmlFor="worktree-select" className="text-sm font-medium text-neutral-700">
              Worktree:
            </label>
            <select
              id="worktree-select"
              value={selectedWorktree}
              onChange={handleWorktreeChange}
              className="flex-1 max-w-xs px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              {worktrees.map((wt) => (
                <option key={wt.worktree} value={wt.worktree}>
                  {wt.worktree}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
              <span className="text-sm text-neutral-600">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-sm text-neutral-700">
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
                className="rounded border-neutral-300 focus:ring-2 focus:ring-primary-500"
              />
              Auto-scroll
            </label>

            <button
              onClick={handleClear}
              className="px-4 py-2 text-sm font-medium text-neutral-700 bg-neutral-100 rounded-lg hover:bg-neutral-200 transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Logs Display */}
      <div className="card">
        <div className="bg-neutral-900 rounded-lg p-4 h-[600px] overflow-y-auto font-mono text-sm">
          {logs.length === 0 ? (
            <div className="text-neutral-500 text-center py-12">
              {isConnected ? 'Waiting for logs...' : 'Not connected'}
            </div>
          ) : (
            <div className="space-y-1">
              {logs.map((line, index) => {
                const parsed = parseLogLine(line);
                return (
                  <div key={index} className="flex gap-2 hover:bg-neutral-800 px-2 py-1 rounded">
                    {parsed.timestamp && (
                      <span className="text-neutral-500 shrink-0">[{parsed.timestamp}]</span>
                    )}
                    {parsed.level && (
                      <span className={`${getLevelColor(parsed.level)} font-semibold shrink-0 w-12`}>
                        {parsed.level}
                      </span>
                    )}
                    {parsed.module && (
                      <span className="text-cyan-400 shrink-0">[{parsed.module}]</span>
                    )}
                    <span className="text-neutral-300 break-all">{parsed.msg}</span>
                  </div>
                );
              })}
              <div ref={logsEndRef} />
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="mt-4 flex items-center justify-between text-sm text-neutral-600">
          <div>Total lines: {logs.length}</div>
          <div>Worktree: {selectedWorktree}</div>
        </div>
      </div>
    </div>
  );
};

export default LogsPage;
