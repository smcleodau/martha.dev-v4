/**
 * Tracker API Client
 * Handles all communication with the tracker backend
 */

// API base URL - tracker routes are at /api/tracker
const API_BASE = '/api/tracker';

class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include', // Include cookies for auth
  });

  if (!response.ok) {
    const error = await response.text();
    throw new ApiError(response.status, error || response.statusText);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return null as T;
  }

  return response.json();
}

// Type definitions
export interface Issue {
  id: string;
  type: 'epic' | 'story' | 'task' | 'bug';
  title: string;
  description: string;
  status: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  parent_id: string | null;
  assignee: {
    id: string;
    name: string;
    avatar: string;
  } | null;
  labels: string[];
  metadata: {
    created_at: string;
    updated_at: string;
    version: number;
  };
}

export interface BoardColumn {
  id: string;
  name: string;
  color: string;
  wip_limit: number | null;
  issue_ids: string[];
}

export interface Board {
  $schema: string;
  version: number;
  sprint: {
    id: string;
    name: string;
    start_date: string;
    end_date: string;
  };
  columns: BoardColumn[];
  updated_at: string;
}

export interface Comment {
  id: string;
  issue_id: string;
  author: {
    id: string;
    name: string;
    avatar: string;
  };
  content: string;
  created_at: string;
  updated_at: string;
}

export interface AgentSession {
  session_id: string;
  agent_type: 'coder' | 'tester' | 'reviewer' | 'researcher' | 'architect';
  issue_id: string;
  worktree: string;
  started_at: string;
  ended_at?: string;
  status: 'active' | 'paused' | 'completed' | 'failed';
  progress: number;
  current_task: string;
  logs: Array<{
    timestamp: string;
    level: 'info' | 'warn' | 'error' | 'debug';
    message: string;
  }>;
  summary?: string;
}

// Issues API
export const issuesApi = {
  list: async (params?: {
    status?: string;
    type?: string;
    parent_id?: string;
    assignee?: string;
  }): Promise<Issue[]> => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value) searchParams.append(key, value);
      });
    }
    const query = searchParams.toString();
    const response = await request<{ issues: Issue[]; count: number }>(
      `/issues${query ? `?${query}` : ''}`
    );
    return response.issues || [];
  },

  get: (id: string): Promise<Issue> => {
    return request<Issue>(`/issues/${id}`);
  },

  create: (data: {
    title: string;
    type?: 'epic' | 'story' | 'task' | 'bug';
    status?: string;
    parent_id?: string | null;
    description?: string;
    labels?: string[];
    priority?: 'critical' | 'high' | 'medium' | 'low';
  }): Promise<Issue> => {
    return request<Issue>('/issues', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: (id: string, data: Partial<Issue>): Promise<Issue> => {
    return request<Issue>(`/issues/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  updateStatus: (id: string, status: string): Promise<Issue> => {
    return request<Issue>(`/issues/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  delete: (id: string): Promise<void> => {
    return request<void>(`/issues/${id}`, {
      method: 'DELETE',
    });
  },

  move: (id: string, status: string, index?: number): Promise<Issue> => {
    return request<Issue>(`/issues/${id}/move`, {
      method: 'POST',
      body: JSON.stringify({ status, index }),
    });
  },

  getAgents: async (id: string): Promise<AgentSession[]> => {
    const response = await request<{ sessions: AgentSession[]; count: number }>(
      `/issues/${id}/agents`
    );
    return response.sessions || [];
  },
};

// Board API
export const boardApi = {
  get: (boardId?: string): Promise<Board> => {
    const endpoint = boardId ? `/board/${boardId}` : '/board/default';
    return request<Board>(endpoint);
  },
};

// Comments API
export const commentsApi = {
  list: async (issueId: string): Promise<Comment[]> => {
    const response = await request<{ comments: Comment[]; count: number }>(
      `/issues/${issueId}/comments`
    );
    return response.comments || [];
  },

  create: (issueId: string, text: string, author: { id: string; name: string; avatar: string }): Promise<Comment> => {
    return request<Comment>(`/issues/${issueId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ text, author }),
    });
  },

  update: (commentId: string, issueId: string, text: string): Promise<Comment> => {
    return request<Comment>(`/comments/${commentId}?issue_id=${issueId}`, {
      method: 'PATCH',
      body: JSON.stringify({ text }),
    });
  },

  delete: (commentId: string, issueId: string): Promise<void> => {
    return request<void>(`/comments/${commentId}?issue_id=${issueId}`, {
      method: 'DELETE',
    });
  },
};

// Agents API
export const agentsApi = {
  listActive: async (): Promise<AgentSession[]> => {
    const response = await request<{ sessions: AgentSession[]; count: number }>(
      '/agents/sessions'
    );
    return response.sessions || [];
  },

  get: (sessionId: string): Promise<AgentSession> => {
    return request<AgentSession>(`/agents/sessions/${sessionId}`);
  },

  start: (data: {
    agent_type: 'coder' | 'tester' | 'reviewer' | 'researcher' | 'architect';
    issue_id: string;
    worktree: string;
    initial_task: string;
  }): Promise<AgentSession> => {
    return request<AgentSession>('/agents/sessions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: (sessionId: string, data: {
    progress?: number;
    current_task?: string;
    status?: 'active' | 'paused';
  }): Promise<AgentSession> => {
    return request<AgentSession>(`/agents/sessions/${sessionId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  end: (sessionId: string, status: 'completed' | 'failed', summary?: string): Promise<AgentSession> => {
    return request<AgentSession>(`/agents/sessions/${sessionId}/end`, {
      method: 'POST',
      body: JSON.stringify({ status, summary }),
    });
  },
};

// Auth API
export const authApi = {
  getStatus: (): Promise<{
    authenticated: boolean;
    user?: {
      id: string;
      name: string;
      avatar: string;
    };
  }> => {
    return request<any>('/auth/status');
  },

  logout: (): Promise<void> => {
    return request<void>('/auth/logout', {
      method: 'POST',
    });
  },
};

export { ApiError };
