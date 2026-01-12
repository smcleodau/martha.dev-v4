/**
 * MCP Tool type definitions
 */

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

export type ToolResponse = CallToolResult;

export interface EpicContext {
  epic_number: number;
  title: string;
  description: string;
  state: string;
  sub_issues: Array<{
    number: number;
    title: string;
    state: string;
  }>;
  worktree_name?: string;
}

export interface WorktreeStatus {
  name: string;
  status: 'online' | 'offline';
  lastSeen: string;
  agentVersion?: string;
  ports: Record<string, number>;
  health: Record<string, string>;
  path?: string;
  branch?: string;
}

export interface EventItem {
  type: string;
  worktree: string;
  timestamp: string;
  data: Record<string, unknown>;
}
