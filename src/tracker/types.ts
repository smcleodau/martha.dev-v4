/**
 * Martha Tracker Type Definitions
 * Ported from martha-workflow/tracker/mcp-server
 */

export interface Assignee {
  id: string;
  name: string;
  avatar: string;
}

export interface QualityInfo {
  coverage: number;
  checklist: string[];
}

export interface TimeTracking {
  estimated_hours: number | null;
  logged_hours: number;
}

export interface Links {
  pr: string | null;
  related_issues: string[];
  external: string[];
}

export interface GitHubSync {
  issue_number: number | null;
  last_synced: string | null;
  dirty: boolean;
}

export interface IssueMetadata {
  created_at: string;
  updated_at: string;
  version: number;
}

export interface DocumentationLinks {
  overview: string | null;
  technical_spec: string | null;
  related_docs: string[];
}

export interface Issue {
  id: string;
  worktree_id: string;                    // NEW: Which worktree owns this issue
  board_id: string;                       // NEW: Which board it's on
  type: "epic" | "story" | "task" | "bug";
  title: string;
  description: string;
  status: string;
  priority: "critical" | "high" | "medium" | "low";
  parent_id: string | null;
  assignee: Assignee | null;
  labels: string[];
  quality: QualityInfo;
  time_tracking: TimeTracking;
  links: Links;
  documentation: DocumentationLinks;      // NEW: Links to documentation
  github_sync: GitHubSync;
  metadata: IssueMetadata;

  // Phase 1.1: Data Model Extensions
  initiative_id: string | null;           // Link to initiative
  team_ids: string[];                     // Multiple teams per issue
  story_points: number | null;            // Estimation points
  epic_id: string | null;                 // Direct epic reference (separate from parent_id)
  release_id: string | null;              // Target release
  start_date: string | null;              // For Timeline/Gantt (ISO 8601)
  due_date: string | null;                // For Timeline/Gantt (ISO 8601)
  estimated_duration: number | null;      // Hours, for Gantt resource planning
  dependencies: {
    blocks: string[];                     // Issues this blocks
    blocked_by: string[];                 // Issues blocking this
    related: string[];                    // Related issues
  };
  watchers: string[];                     // User IDs watching this
  policy_compliance: PolicyCompliance | null;  // Security, testing, docs, code review
  engagement: {
    views: number;
    total_read_time: number;              // seconds
    view_history: ViewEntry[];
  };
}

export interface IndexEntry {
  id: string;
  title: string;
  type: string;
  status: string;
  priority: string;
  parent_id: string | null;
  board_id: string;                       // NEW: Board this issue belongs to
  updated_at: string;
}

export interface IssueIndex {
  $schema: string;
  worktree_id: string;                    // NEW: Which worktree this index belongs to
  version: number;
  count: number;
  next_id: number;
  issues: Record<string, IndexEntry>;
  by_status: Record<string, string[]>;
  by_parent: Record<string, string[]>;
  by_type: Record<string, string[]>;
  by_board: Record<string, string[]>;     // NEW: Issues grouped by board
  updated_at: string;

  // Phase 1.1: New index groupings
  by_initiative: Record<string, string[]>;
  by_team: Record<string, string[]>;
  by_epic: Record<string, string[]>;
  by_release: Record<string, string[]>;
  by_start_date: Record<string, string[]>;
  by_due_date: Record<string, string[]>;
  by_assignee: Record<string, string[]>;
}

export interface BoardColumn {
  id: string;
  name: string;
  color: string;
  wip_limit: number | null;
  issue_ids: string[];
}

export interface BoardState {
  $schema: string;
  id: string;                             // NEW: Board identifier
  worktree_id: string;                    // NEW: Which worktree owns this board
  name: string;                           // NEW: Display name
  description: string;                    // NEW: Board description
  version: number;
  sprint: {
    id: string;
    name: string;
    start_date: string;
    end_date: string;
  } | null;                               // Allow null sprint
  columns: BoardColumn[];
  created_at: string;                     // NEW: Creation timestamp
  updated_at: string;
}

export interface Comment {
  id: string;
  issue_id: string;
  author: Assignee;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface Config {
  project: {
    prefix: string;
  };
  workflow: {
    statuses: Array<{ id: string; name: string }>;
    types: Array<{ id: string; name: string }>;
    priorities: Array<{ id: string; name: string }>;
  };
  sync?: {
    enabled: boolean;
    github_enabled: boolean;
    bidirectional: boolean;
  };
  github?: {
    owner: string;
    repo: string;
    default_labels: string[];
  };
}

// Worktree Configuration
export interface WorktreeConfig {
  id: string;
  name: string;
  display_name: string;
  description: string;
  path: string;                            // File system path
  github_repo?: string;
  boards: string[];                        // Board IDs in this worktree
  created_at: string;
  updated_at: string;
}

// Documentation
export interface Documentation {
  id: string;
  worktree_id: string;
  issue_id?: string;                       // Optional: issue-specific doc
  epic_id?: string;                        // Optional: epic-specific doc
  board_id?: string;                       // Optional: board-specific doc
  type: 'overview' | 'technical_spec' | 'api_reference' | 'guide' | 'troubleshooting';
  title: string;
  content: string;                         // Markdown content
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

// Agent Session Types
export type AgentType = "coder" | "tester" | "reviewer" | "researcher" | "architect";
export type SessionStatus = "active" | "paused" | "completed" | "failed";

export interface AgentLogEntry {
  timestamp: string;
  level: "info" | "warn" | "error" | "debug";
  message: string;
  metadata?: Record<string, unknown>;
}

export interface AgentSession {
  session_id: string;
  agent_type: AgentType;
  issue_id: string;
  worktree: string;
  started_at: string;
  ended_at?: string;
  status: SessionStatus;
  progress: number;
  current_task: string;
  logs: AgentLogEntry[];
  summary?: string;
}

export interface AgentSessionIndex {
  $schema: string;
  version: number;
  active_sessions: string[];
  completed_sessions: string[];
  stats: {
    total_sessions: number;
    sessions_by_type: Record<AgentType, number>;
    sessions_by_status: Record<SessionStatus, number>;
  };
  updated_at: string;
}

// Phase 1.1: New Models
export interface Initiative {
  id: string;
  worktree_id: string;
  name: string;
  description: string;
  color: string;                          // Hex color for UI
  status: 'planning' | 'active' | 'completed' | 'archived';
  owner: Assignee | null;
  epic_ids: string[];
  metadata: {
    created_at: string;
    updated_at: string;
    start_date: string | null;
    end_date: string | null;
  };
}

export interface Team {
  id: string;
  worktree_id: string;
  name: string;
  description: string;
  color: string;
  members: Assignee[];
  metadata: {
    created_at: string;
    updated_at: string;
  };
}

export interface Release {
  id: string;
  worktree_id: string;
  name: string;
  version: string;
  target_date: string;
  description: string;
  gates: ReleaseGate[];
  issue_ids: string[];
  status: 'planning' | 'in_progress' | 'testing' | 'released' | 'cancelled';
  metadata: {
    created_at: string;
    updated_at: string;
    version: number;
  };
}

export interface ReleaseGate {
  id: string;
  name: string;
  type: 'security' | 'testing' | 'documentation' | 'review' | 'deployment' | 'custom';
  status: 'passed' | 'failed' | 'pending' | 'skipped';
  required: boolean;
  description: string;
  metadata?: Record<string, any>;
}

export interface PolicyCompliance {
  security: {
    status: 'compliant' | 'non_compliant' | 'partial' | 'n/a';
    checks: Array<{
      name: string;
      passed: boolean;
      details?: string;
    }>;
    last_checked: string | null;
  };
  testing: {
    status: 'compliant' | 'non_compliant' | 'partial' | 'n/a';
    checks: Array<{
      name: string;
      passed: boolean;
      details?: string;
    }>;
    last_checked: string | null;
  };
  code_review: {
    status: 'compliant' | 'non_compliant' | 'partial' | 'n/a';
    checks: Array<{
      name: string;
      passed: boolean;
      details?: string;
    }>;
    last_checked: string | null;
  };
  documentation: {
    status: 'compliant' | 'non_compliant' | 'partial' | 'n/a';
    checks: Array<{
      name: string;
      passed: boolean;
      details?: string;
    }>;
    last_checked: string | null;
  };
}

export interface ViewEntry {
  user_id: string;
  user_name: string;
  timestamp: string;
  read_time: number;  // seconds
  session_id: string;
}

export interface TimeEntry {
  id: string;
  issue_id: string;
  user_id: string;
  user_name: string;
  hours: number;
  description: string;
  date: string;       // ISO date when work was done
  logged_at: string;  // ISO timestamp when entry was created
}

export interface PRMetadata {
  url: string;
  status: 'draft' | 'open' | 'approved' | 'merged' | 'closed';
  commits: number;
  authors: number;
  reviews_requested: number;
  approvals: number;
  ci_status: 'passing' | 'failing' | 'pending' | 'unknown';
  test_coverage: number | null;
  last_updated: string;
}

// Tracker Events
export type TrackerEvent =
  | { type: 'tracker:issue_created'; data: { issue_id: string; issue: Issue } }
  | { type: 'tracker:issue_updated'; data: { issue_id: string; issue: Issue } }
  | { type: 'tracker:issue_deleted'; data: { issue_id: string } }
  | { type: 'tracker:board_updated'; data: { path: string } }
  | { type: 'tracker:comment_added'; data: { issue_id: string; comment: Comment } }
  | { type: 'tracker:agent_started'; data: { session_id: string; session: AgentSession } }
  | { type: 'tracker:agent_progress'; data: { session_id: string; progress: number } }
  | { type: 'tracker:agent_completed'; data: { session_id: string } };
