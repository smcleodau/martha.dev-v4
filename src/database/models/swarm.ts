/**
 * Swarm model
 *
 * Represents a claude-flow swarm (multi-agent development session)
 */

export interface Swarm {
  id: string; // UUID
  epic_number: number | null;
  worktree_id: number | null;
  worktree_path: string;
  pid: number;
  status: SwarmStatus;
  config: SwarmConfig;
  resource_usage: ResourceUsage;
  agent_count: number;
  task_count: number;
  last_heartbeat: Date;
  created_at: Date;
  updated_at: Date;
}

export type SwarmStatus = 'spawning' | 'running' | 'paused' | 'completed' | 'crashed' | 'terminated';

export interface SwarmConfig {
  project: string;
  topology: string;
  epic_context?: any;
  reasoning?: {
    enable: boolean;
    database: string;
  };
  telemetry?: {
    braintrust?: {
      enabled: boolean;
      project: string;
      experiment: string;
      tags: string[];
    };
  };
}

export interface ResourceUsage {
  cpu: number; // Percentage
  memory: number; // Bytes
  elapsed: number; // Milliseconds
}

export interface CreateSwarmDTO {
  epicNumber?: number;
  worktreeId?: number;
  worktreePath: string;
  pid: number;
  config: SwarmConfig;
}

export interface UpdateSwarmDTO {
  status?: SwarmStatus;
  resourceUsage?: ResourceUsage;
  agentCount?: number;
  taskCount?: number;
  lastHeartbeat?: Date;
}

export interface SwarmState {
  swarm_id: string;
  status: SwarmStatus;
  pid: number;
  agents: Array<{
    id: string;
    role: string;
    status: string;
    tasks_completed: number;
  }>;
  tasks: Array<{
    id: string;
    description: string;
    status: string;
    assigned_to: string;
  }>;
  phases: Record<string, string>; // phase_name -> status
  started_at: string;
  updated_at: string;
}
