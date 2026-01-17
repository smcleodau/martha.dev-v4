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
export interface WorktreeConfig {
  id: string;
  name: string;
  display_name: string;
  description: string;
  path: string;
  github_repo?: string;
  boards: string[];
  created_at: string;
  updated_at: string;
}

export interface DocumentationLinks {
  overview: string | null;
  technical_spec: string | null;
  related_docs: string[];
}

export interface Links {
  pr: string | null;
  related_issues: string[];
  external: string[];
}

export interface QualityInfo {
  coverage: number;
  checklist: string[];
}

export interface Issue {
  id: string;
  worktree_id: string;
  board_id: string;
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
  quality: QualityInfo;
  documentation: DocumentationLinks;
  links: Links;
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
  id: string;
  worktree_id: string;
  name: string;
  description: string;
  $schema?: string;
  version: number;
  sprint: {
    id: string;
    name: string;
    start_date: string;
    end_date: string;
  } | null;
  columns: BoardColumn[];
  created_at: string;
  updated_at: string;
}

export interface Documentation {
  id: string;
  worktree_id: string;
  issue_id?: string;
  epic_id?: string;
  board_id?: string;
  type: 'overview' | 'technical_spec' | 'api_reference' | 'guide' | 'troubleshooting';
  title: string;
  content: string;
  tags: string[];
  links: {
    related_issues: string[];
    related_docs: string[];
    external_links: string[];
  };
  metadata: {
    created_at: string;
    updated_at: string;
    author: string;
    version: number;
  };
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

// Worktrees API
export const worktreesApi = {
  list: async (): Promise<WorktreeConfig[]> => {
    const response = await request<{ worktrees: WorktreeConfig[]; count: number }>('/worktrees');
    return response.worktrees || [];
  },

  get: async (worktreeId: string): Promise<WorktreeConfig & { boards_detail?: Board[] }> => {
    return request<WorktreeConfig & { boards_detail?: Board[] }>(`/worktrees/${worktreeId}`);
  },

  create: (data: {
    id: string;
    name: string;
    display_name: string;
    description: string;
    path: string;
    github_repo?: string;
  }): Promise<WorktreeConfig> => {
    return request<WorktreeConfig>('/worktrees', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: (worktreeId: string, data: Partial<WorktreeConfig>): Promise<WorktreeConfig> => {
    return request<WorktreeConfig>(`/worktrees/${worktreeId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  delete: (worktreeId: string): Promise<void> => {
    return request<void>(`/worktrees/${worktreeId}`, {
      method: 'DELETE',
    });
  },
};

// Boards API (hierarchical)
export const boardsApi = {
  list: async (worktreeId: string): Promise<Board[]> => {
    const response = await request<{ boards: Board[]; count: number }>(
      `/worktrees/${worktreeId}/boards`
    );
    return response.boards || [];
  },

  get: (worktreeId: string, boardId: string): Promise<Board> => {
    return request<Board>(`/worktrees/${worktreeId}/boards/${boardId}`);
  },

  create: (worktreeId: string, data: {
    id: string;
    name: string;
    description: string;
    columns?: BoardColumn[];
  }): Promise<Board> => {
    return request<Board>(`/worktrees/${worktreeId}/boards`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: (worktreeId: string, boardId: string, data: Partial<Board>): Promise<Board> => {
    return request<Board>(`/worktrees/${worktreeId}/boards/${boardId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  delete: (worktreeId: string, boardId: string): Promise<void> => {
    return request<void>(`/worktrees/${worktreeId}/boards/${boardId}`, {
      method: 'DELETE',
    });
  },
};

// Board API (legacy - backward compatibility)
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

// Documentation API
export const documentationApi = {
  list: async (worktreeId: string, params?: { search?: string }): Promise<Documentation[]> => {
    const searchParams = new URLSearchParams();
    if (params?.search) {
      searchParams.append('search', params.search);
    }
    const query = searchParams.toString();
    const response = await request<{ documentation: Documentation[]; count: number }>(
      `/worktrees/${worktreeId}/documentation${query ? `?${query}` : ''}`
    );
    return response.documentation || [];
  },

  get: (worktreeId: string, docId: string): Promise<Documentation> => {
    return request<Documentation>(`/worktrees/${worktreeId}/documentation/${docId}`);
  },

  create: (worktreeId: string, data: {
    issue_id?: string;
    epic_id?: string;
    board_id?: string;
    type: Documentation['type'];
    title: string;
    content: string;
    tags?: string[];
    author: string;
  }): Promise<Documentation> => {
    return request<Documentation>(`/worktrees/${worktreeId}/documentation`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: (worktreeId: string, docId: string, data: Partial<Documentation>): Promise<Documentation> => {
    return request<Documentation>(`/worktrees/${worktreeId}/documentation/${docId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  delete: (worktreeId: string, docId: string): Promise<void> => {
    return request<void>(`/worktrees/${worktreeId}/documentation/${docId}`, {
      method: 'DELETE',
    });
  },

  linkToDoc: (worktreeId: string, sourceDocId: string, targetDocId: string): Promise<Documentation> => {
    return request<Documentation>(`/worktrees/${worktreeId}/documentation/${sourceDocId}/link`, {
      method: 'POST',
      body: JSON.stringify({ target_doc_id: targetDocId }),
    });
  },

  linkToIssue: (worktreeId: string, docId: string, issueId: string): Promise<Documentation> => {
    return request<Documentation>(`/worktrees/${worktreeId}/documentation/${docId}/link`, {
      method: 'POST',
      body: JSON.stringify({ issue_id: issueId }),
    });
  },

  // Issue-specific documentation
  getForIssue: async (worktreeId: string, issueId: string): Promise<Documentation[]> => {
    const response = await request<{ documentation: Documentation[]; count: number }>(
      `/worktrees/${worktreeId}/issues/${issueId}/documentation`
    );
    return response.documentation || [];
  },

  createForIssue: (worktreeId: string, issueId: string, data: {
    type: Documentation['type'];
    title: string;
    content: string;
    tags?: string[];
    author: string;
  }): Promise<Documentation> => {
    return request<Documentation>(`/worktrees/${worktreeId}/issues/${issueId}/documentation`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// Hierarchical Issues API (for multi-board support)
export const hierarchicalIssuesApi = {
  list: async (worktreeId: string, boardId: string, params?: {
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
      `/worktrees/${worktreeId}/boards/${boardId}/issues${query ? `?${query}` : ''}`
    );
    return response.issues || [];
  },

  get: (worktreeId: string, boardId: string, issueId: string): Promise<Issue> => {
    return request<Issue>(`/worktrees/${worktreeId}/boards/${boardId}/issues/${issueId}`);
  },

  create: (worktreeId: string, boardId: string, data: {
    title: string;
    type?: 'epic' | 'story' | 'task' | 'bug';
    status?: string;
    parent_id?: string | null;
    description?: string;
    labels?: string[];
    priority?: 'critical' | 'high' | 'medium' | 'low';
  }): Promise<Issue> => {
    return request<Issue>(`/worktrees/${worktreeId}/boards/${boardId}/issues`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: (worktreeId: string, boardId: string, issueId: string, data: Partial<Issue>): Promise<Issue> => {
    return request<Issue>(`/worktrees/${worktreeId}/boards/${boardId}/issues/${issueId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  delete: (worktreeId: string, boardId: string, issueId: string): Promise<void> => {
    return request<void>(`/worktrees/${worktreeId}/boards/${boardId}/issues/${issueId}`, {
      method: 'DELETE',
    });
  },

  move: (worktreeId: string, boardId: string, issueId: string, status: string, index?: number): Promise<Issue> => {
    return request<Issue>(`/worktrees/${worktreeId}/boards/${boardId}/issues/${issueId}/move`, {
      method: 'POST',
      body: JSON.stringify({ status, index }),
    });
  },
};

// Activity API
export interface ActivityEntry {
  id: string;
  issue_id: string;
  timestamp: string;
  actor: {
    id: string;
    name: string;
  };
  action: 'created' | 'updated' | 'commented' | 'linked' | 'status_changed' | 'assigned';
  changes?: Array<{
    field: string;
    old_value: any;
    new_value: any;
  }>;
  metadata?: Record<string, any>;
}

export const activityApi = {
  getActivity: async (
    worktreeId: string,
    issueId: string,
    limit?: number
  ): Promise<ActivityEntry[]> => {
    const params = limit ? `?limit=${limit}` : '';
    return request<ActivityEntry[]>(
      `/worktrees/${worktreeId}/issues/${issueId}/activity${params}`
    );
  },

  getActivitySince: async (
    worktreeId: string,
    issueId: string,
    since: string
  ): Promise<ActivityEntry[]> => {
    return request<ActivityEntry[]>(
      `/worktrees/${worktreeId}/issues/${issueId}/activity?since=${since}`
    );
  },
};

export { ApiError };
