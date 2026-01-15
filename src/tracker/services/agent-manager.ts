/**
 * Agent Manager Service
 * Manages agent sessions for issue work tracking
 */

import * as path from 'node:path';
import {
  readJsonSync,
  writeJsonSync,
  getTrackerPath,
  deleteFile,
  ensureDir,
} from './file-storage.js';
import type { AgentSession, AgentSessionIndex, AgentType, SessionStatus } from '../types.js';

const AGENT_SESSIONS_DIR = getTrackerPath('agents', 'sessions');
const AGENT_INDEX_PATH = path.join(AGENT_SESSIONS_DIR, 'index.json');

/**
 * Get agent session file path
 * @param sessionId Session ID
 * @returns Path to session file
 */
function getSessionPath(sessionId: string): string {
  return path.join(AGENT_SESSIONS_DIR, `${sessionId}.json`);
}

/**
 * Generate unique session ID
 * @returns Session ID
 */
function generateSessionId(): string {
  return `ses-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Load agent session index
 * @returns Agent session index
 */
export function loadAgentIndex(): AgentSessionIndex {
  ensureDir(AGENT_SESSIONS_DIR);
  try {
    return readJsonSync<AgentSessionIndex>(AGENT_INDEX_PATH);
  } catch {
    // Create default index if doesn't exist
    const defaultIndex: AgentSessionIndex = {
      $schema: 'agent-session-index-v1',
      version: Date.now(),
      active_sessions: [],
      completed_sessions: [],
      stats: {
        total_sessions: 0,
        sessions_by_type: {
          coder: 0,
          tester: 0,
          reviewer: 0,
          researcher: 0,
          architect: 0,
        },
        sessions_by_status: {
          active: 0,
          paused: 0,
          completed: 0,
          failed: 0,
        },
      },
      updated_at: new Date().toISOString(),
    };
    writeJsonSync(AGENT_INDEX_PATH, defaultIndex);
    return defaultIndex;
  }
}

/**
 * Save agent session index
 * @param index Agent session index
 */
export function saveAgentIndex(index: AgentSessionIndex): void {
  index.version = Date.now();
  index.updated_at = new Date().toISOString();
  writeJsonSync(AGENT_INDEX_PATH, index);
}

/**
 * Create a new agent session
 * @param agentType Type of agent
 * @param issueId Issue ID
 * @param worktree Worktree name
 * @param initialTask Initial task description
 * @returns Created session
 */
export function createSession(
  agentType: AgentType,
  issueId: string,
  worktree: string,
  initialTask: string
): AgentSession {
  const sessionId = generateSessionId();
  const now = new Date().toISOString();

  const session: AgentSession = {
    session_id: sessionId,
    agent_type: agentType,
    issue_id: issueId,
    worktree,
    started_at: now,
    status: 'active',
    progress: 0,
    current_task: initialTask,
    logs: [],
  };

  // Save session
  const sessionPath = getSessionPath(sessionId);
  writeJsonSync(sessionPath, session);

  // Update index
  const index = loadAgentIndex();
  index.active_sessions.push(sessionId);
  index.stats.total_sessions++;
  index.stats.sessions_by_type[agentType]++;
  index.stats.sessions_by_status.active++;
  saveAgentIndex(index);

  return session;
}

/**
 * Get agent session
 * @param sessionId Session ID
 * @returns Session or null if not found
 */
export function getSession(sessionId: string): AgentSession | null {
  try {
    const sessionPath = getSessionPath(sessionId);
    return readJsonSync<AgentSession>(sessionPath);
  } catch {
    return null;
  }
}

/**
 * Update agent session
 * @param sessionId Session ID
 * @param updates Partial updates to apply
 * @returns Updated session or null if not found
 */
export function updateSession(
  sessionId: string,
  updates: Partial<AgentSession>
): AgentSession | null {
  const session = getSession(sessionId);
  if (!session) return null;

  Object.assign(session, updates);

  const sessionPath = getSessionPath(sessionId);
  writeJsonSync(sessionPath, session);

  return session;
}

/**
 * End agent session
 * @param sessionId Session ID
 * @param status Final status (completed or failed)
 * @param summary Optional summary
 * @returns Updated session or null if not found
 */
export function endSession(
  sessionId: string,
  status: 'completed' | 'failed',
  summary?: string
): AgentSession | null {
  const session = getSession(sessionId);
  if (!session) return null;

  const oldStatus = session.status;
  session.status = status;
  session.ended_at = new Date().toISOString();
  if (summary) {
    session.summary = summary;
  }

  // Save session
  const sessionPath = getSessionPath(sessionId);
  writeJsonSync(sessionPath, session);

  // Update index
  const index = loadAgentIndex();

  // Remove from active, add to completed
  const activeIdx = index.active_sessions.indexOf(sessionId);
  if (activeIdx !== -1) {
    index.active_sessions.splice(activeIdx, 1);
  }
  if (!index.completed_sessions.includes(sessionId)) {
    index.completed_sessions.push(sessionId);
  }

  // Update stats
  index.stats.sessions_by_status[oldStatus]--;
  index.stats.sessions_by_status[status]++;

  saveAgentIndex(index);

  return session;
}

/**
 * List active agent sessions
 * @returns Array of active sessions
 */
export function listActiveSessions(): AgentSession[] {
  const index = loadAgentIndex();
  return index.active_sessions
    .map((sessionId) => getSession(sessionId))
    .filter((s): s is AgentSession => s !== null);
}

/**
 * List all sessions for an issue
 * @param issueId Issue ID
 * @returns Array of sessions
 */
export function listSessionsForIssue(issueId: string): AgentSession[] {
  const index = loadAgentIndex();
  const allSessionIds = [...index.active_sessions, ...index.completed_sessions];

  return allSessionIds
    .map((sessionId) => getSession(sessionId))
    .filter((s): s is AgentSession => s !== null && s.issue_id === issueId)
    .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());
}

/**
 * Add log entry to session
 * @param sessionId Session ID
 * @param level Log level
 * @param message Log message
 * @param metadata Optional metadata
 * @returns Updated session or null if not found
 */
export function addLogEntry(
  sessionId: string,
  level: 'info' | 'warn' | 'error' | 'debug',
  message: string,
  metadata?: Record<string, unknown>
): AgentSession | null {
  const session = getSession(sessionId);
  if (!session) return null;

  session.logs.push({
    timestamp: new Date().toISOString(),
    level,
    message,
    metadata,
  });

  const sessionPath = getSessionPath(sessionId);
  writeJsonSync(sessionPath, session);

  return session;
}
