import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { exec } from 'child_process';
import { promisify } from 'util';
import { config } from '../../config/index.js';

const execAsync = promisify(exec);

export default async function dashboardRoutes(fastify: FastifyInstance) {
  // API endpoint for changelog
  fastify.get('/api/v1/changelog', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { stdout } = await execAsync(
        'git log -20 --format="%h|%an|%ar|%s"',
        { cwd: '/mnt/data/martha.dev-v4' }
      );

      const commits = stdout
        .trim()
        .split('\n')
        .filter(line => line)
        .map(line => {
          const [hash, author, time, ...messageParts] = line.split('|');
          return {
            hash: hash.trim(),
            author: author.trim(),
            time: time.trim(),
            message: messageParts.join('|').trim()
          };
        });

      return reply.send({ commits });
    } catch (error) {
      return reply.status(500).send({
        error: 'Failed to fetch changelog',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Legacy dashboard route - now served via static files
  // Root route - Dashboard UI (DISABLED - using React dashboard instead)
  /*
  fastify.get('/', async (_request: FastifyRequest, reply: FastifyReply) => {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Martha MAPDS - Monitoring Dashboard</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: #0f1419;
      color: #e6edf3;
      line-height: 1.6;
    }

    .container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 20px;
    }

    header {
      background: linear-gradient(135deg, #1a1f2e 0%, #0f1419 100%);
      border-bottom: 1px solid #30363d;
      padding: 20px 0;
      margin-bottom: 30px;
    }

    h1 {
      font-size: 2.5rem;
      font-weight: 700;
      background: linear-gradient(135deg, #58a6ff 0%, #bc8cff 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 10px;
    }

    .subtitle {
      color: #8b949e;
      font-size: 1.1rem;
    }

    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 0.875rem;
      font-weight: 600;
      margin-left: 10px;
    }

    .status-healthy {
      background: rgba(46, 160, 67, 0.2);
      color: #3fb950;
      border: 1px solid #3fb950;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }

    .card {
      background: #161b22;
      border: 1px solid #30363d;
      border-radius: 8px;
      padding: 20px;
      transition: border-color 0.2s, transform 0.2s;
    }

    .card:hover {
      border-color: #58a6ff;
      transform: translateY(-2px);
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;
    }

    .card-title {
      font-size: 1.25rem;
      font-weight: 600;
      color: #e6edf3;
    }

    .card-value {
      font-size: 2rem;
      font-weight: 700;
      color: #58a6ff;
    }

    .section {
      background: #161b22;
      border: 1px solid #30363d;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 20px;
    }

    .section-title {
      font-size: 1.5rem;
      font-weight: 600;
      margin-bottom: 15px;
      color: #e6edf3;
    }

    .event-stream {
      background: #0d1117;
      border: 1px solid #30363d;
      border-radius: 6px;
      padding: 15px;
      max-height: 400px;
      overflow-y: auto;
      font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
      font-size: 0.875rem;
    }

    .event {
      padding: 8px 0;
      border-bottom: 1px solid #21262d;
    }

    .event:last-child {
      border-bottom: none;
    }

    .event-time {
      color: #8b949e;
      margin-right: 10px;
    }

    .event-type {
      color: #58a6ff;
      margin-right: 10px;
    }

    .event-worktree {
      color: #bc8cff;
      margin-right: 10px;
    }

    .list-item {
      background: #0d1117;
      border: 1px solid #30363d;
      border-radius: 6px;
      padding: 15px;
      margin-bottom: 10px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .list-item-name {
      font-weight: 600;
      color: #e6edf3;
    }

    .list-item-detail {
      color: #8b949e;
      font-size: 0.875rem;
    }

    .api-link {
      display: inline-block;
      padding: 8px 16px;
      background: #21262d;
      border: 1px solid #30363d;
      border-radius: 6px;
      color: #58a6ff;
      text-decoration: none;
      margin: 5px;
      transition: background 0.2s, border-color 0.2s;
    }

    .api-link:hover {
      background: #30363d;
      border-color: #58a6ff;
    }

    .loading {
      text-align: center;
      color: #8b949e;
      padding: 20px;
    }

    .connection-status {
      position: fixed;
      bottom: 20px;
      right: 20px;
      padding: 10px 20px;
      border-radius: 6px;
      font-size: 0.875rem;
      font-weight: 600;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }

    .connection-connected {
      background: rgba(46, 160, 67, 0.2);
      color: #3fb950;
      border: 1px solid #3fb950;
    }

    .connection-disconnected {
      background: rgba(248, 81, 73, 0.2);
      color: #f85149;
      border: 1px solid #f85149;
    }

    ::-webkit-scrollbar {
      width: 8px;
    }

    ::-webkit-scrollbar-track {
      background: #0d1117;
    }

    ::-webkit-scrollbar-thumb {
      background: #30363d;
      border-radius: 4px;
    }

    ::-webkit-scrollbar-thumb:hover {
      background: #484f58;
    }

    .commit-item {
      background: #0d1117;
      border: 1px solid #30363d;
      border-radius: 6px;
      padding: 12px;
      margin-bottom: 8px;
      display: flex;
      gap: 12px;
      align-items: flex-start;
    }

    .commit-hash {
      font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
      font-size: 0.875rem;
      color: #58a6ff;
      font-weight: 600;
      min-width: 60px;
    }

    .commit-info {
      flex: 1;
    }

    .commit-message {
      color: #e6edf3;
      margin-bottom: 4px;
      line-height: 1.4;
    }

    .commit-meta {
      color: #8b949e;
      font-size: 0.75rem;
    }

    .commit-author {
      color: #bc8cff;
    }
  </style>
</head>
<body>
  <header>
    <div class="container">
      <h1>Martha MAPDS</h1>
      <p class="subtitle">
        Multi-Agent Project Development System
        <span class="status-badge status-healthy" id="service-status">Loading...</span>
      </p>
    </div>
  </header>

  <div class="container">
    <!-- Stats Grid -->
    <div class="grid">
      <div class="card">
        <div class="card-header">
          <div class="card-title">Active Worktrees</div>
        </div>
        <div class="card-value" id="worktree-count">-</div>
      </div>

      <div class="card">
        <div class="card-header">
          <div class="card-title">Active Swarms</div>
        </div>
        <div class="card-value" id="swarm-count">-</div>
      </div>

      <div class="card">
        <div class="card-header">
          <div class="card-title">Recent Events</div>
        </div>
        <div class="card-value" id="event-count">0</div>
      </div>
    </div>

    <!-- Worktrees Section -->
    <div class="section">
      <h2 class="section-title">Worktrees</h2>
      <div id="worktree-list" class="loading">Loading worktrees...</div>
    </div>

    <!-- Swarms Section -->
    <div class="section">
      <h2 class="section-title">Active Swarms</h2>
      <div id="swarm-list" class="loading">Loading swarms...</div>
    </div>

    <!-- Event Stream -->
    <div class="section">
      <h2 class="section-title">Live Event Stream</h2>
      <div class="event-stream" id="event-stream">
        <div class="loading">Connecting to event stream...</div>
      </div>
    </div>

    <!-- API Endpoints -->
    <div class="section">
      <h2 class="section-title">API Endpoints</h2>
      <div>
        <a href="/health" class="api-link" target="_blank">Health Check</a>
        <a href="/api/v1/worktrees" class="api-link" target="_blank">Worktrees API</a>
        <a href="/api/v1/swarms" class="api-link" target="_blank">Swarms API</a>
        <a href="/api/v1/changelog" class="api-link" target="_blank">Changelog API</a>
      </div>
    </div>

    <!-- Recent Changes -->
    <div class="section">
      <h2 class="section-title">Recent Changes</h2>
      <div id="changelog-list" class="loading">Loading recent commits...</div>
    </div>
  </div>

  <div class="connection-status connection-disconnected" id="ws-status">
    Disconnected
  </div>

  <script>
    let ws = null;
    let eventCount = 0;
    const maxEvents = 50;
    const events = [];

    // Fetch service health
    async function fetchHealth() {
      try {
        const response = await fetch('/health');
        const data = await response.json();
        document.getElementById('service-status').textContent = data.status === 'healthy' ? 'Healthy' : 'Unhealthy';
        document.getElementById('service-status').className = 'status-badge ' +
          (data.status === 'healthy' ? 'status-healthy' : 'status-unhealthy');
      } catch (error) {
        console.error('Failed to fetch health:', error);
      }
    }

    // Fetch worktrees
    async function fetchWorktrees() {
      try {
        const response = await fetch('/api/v1/worktrees');
        const data = await response.json();
        const worktrees = data.worktrees || [];

        document.getElementById('worktree-count').textContent = worktrees.length;

        const listHtml = worktrees.length === 0
          ? '<div class="loading">No worktrees registered</div>'
          : worktrees.map(wt => \`
            <div class="list-item">
              <div>
                <div class="list-item-name">\${wt.name}</div>
                <div class="list-item-detail">\${wt.branch} • \${wt.path}</div>
              </div>
              <div class="list-item-detail">
                Index: \${wt.index} • Ports: \${wt.ports?.service || 'N/A'}
              </div>
            </div>
          \`).join('');

        document.getElementById('worktree-list').innerHTML = listHtml;
      } catch (error) {
        console.error('Failed to fetch worktrees:', error);
        document.getElementById('worktree-list').innerHTML = '<div class="loading">Error loading worktrees</div>';
      }
    }

    // Fetch swarms
    async function fetchSwarms() {
      try {
        const response = await fetch('/api/v1/swarms');
        const data = await response.json();
        const swarms = data.swarms || [];

        document.getElementById('swarm-count').textContent = swarms.length;

        const listHtml = swarms.length === 0
          ? '<div class="loading">No active swarms</div>'
          : swarms.map(swarm => \`
            <div class="list-item">
              <div>
                <div class="list-item-name">Swarm \${swarm.id}</div>
                <div class="list-item-detail">Epic: \${swarm.epic_id || 'N/A'} • Status: \${swarm.status}</div>
              </div>
              <div class="list-item-detail">
                Agents: \${swarm.agent_count || 0} • Tasks: \${swarm.task_count || 0}
              </div>
            </div>
          \`).join('');

        document.getElementById('swarm-list').innerHTML = listHtml;
      } catch (error) {
        console.error('Failed to fetch swarms:', error);
        document.getElementById('swarm-list').innerHTML = '<div class="loading">Error loading swarms</div>';
      }
    }

    // Fetch changelog
    async function fetchChangelog() {
      try {
        const response = await fetch('/api/v1/changelog');
        const data = await response.json();
        const commits = data.commits || [];

        const listHtml = commits.length === 0
          ? '<div class="loading">No commits found</div>'
          : commits.map(commit => \`
            <div class="commit-item">
              <div class="commit-hash">\${commit.hash}</div>
              <div class="commit-info">
                <div class="commit-message">\${commit.message}</div>
                <div class="commit-meta">
                  <span class="commit-author">\${commit.author}</span> • \${commit.time}
                </div>
              </div>
            </div>
          \`).join('');

        document.getElementById('changelog-list').innerHTML = listHtml;
      } catch (error) {
        console.error('Failed to fetch changelog:', error);
        document.getElementById('changelog-list').innerHTML = '<div class="loading">Error loading changelog</div>';
      }
    }

    // Connect to WebSocket for live events
    function connectWebSocket() {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = \`\${protocol}//\${window.location.host}/ws\`;

      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('WebSocket connected');
        document.getElementById('ws-status').textContent = 'Connected';
        document.getElementById('ws-status').className = 'connection-status connection-connected';
        document.getElementById('event-stream').innerHTML = '<div class="loading">Listening for events...</div>';
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type && data.type !== 'pong') {
            addEvent(data);
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        document.getElementById('ws-status').textContent = 'Disconnected';
        document.getElementById('ws-status').className = 'connection-status connection-disconnected';

        // Attempt to reconnect after 3 seconds
        setTimeout(connectWebSocket, 3000);
      };

      // Send ping every 30 seconds to keep connection alive
      setInterval(() => {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }));
        }
      }, 30000);
    }

    // Add event to stream
    function addEvent(data) {
      eventCount++;
      document.getElementById('event-count').textContent = eventCount;

      const time = new Date().toLocaleTimeString();
      const eventHtml = \`
        <div class="event">
          <span class="event-time">\${time}</span>
          <span class="event-type">\${data.type || 'event'}</span>
          \${data.worktree ? \`<span class="event-worktree">[\${data.worktree}]</span>\` : ''}
          <span>\${data.message || JSON.stringify(data)}</span>
        </div>
      \`;

      events.unshift(eventHtml);
      if (events.length > maxEvents) {
        events.pop();
      }

      const streamEl = document.getElementById('event-stream');
      streamEl.innerHTML = events.join('');
    }

    // Initialize
    fetchHealth();
    fetchWorktrees();
    fetchSwarms();
    fetchChangelog();
    connectWebSocket();

    // Refresh data every 30 seconds
    setInterval(() => {
      fetchHealth();
      fetchWorktrees();
      fetchSwarms();
      fetchChangelog();
    }, 30000);
  </script>
</body>
</html>
    `;

    reply.type('text/html');
    return reply.send(html);
  });
  */
}
