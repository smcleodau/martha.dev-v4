/**
 * Agent type definitions
 */

export interface AgentEvent {
  type: string;
  worktree?: string;
  timestamp?: string;
  data: Record<string, unknown>;
}

export interface WorktreeConfig {
  name: string;
  path: string;
  index: number;
  ports: Record<string, number>;
  enabled: boolean;
}

export interface ContainerStatus {
  status: string;
  health: string | null;
}

export interface Command {
  command: string;
  container?: string;
  request_id?: string;
  params?: Record<string, unknown>;
}
