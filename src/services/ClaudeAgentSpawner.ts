/**
 * Claude Agent Spawner Service
 *
 * Handles spawning Claude CLI processes with full agent context.
 *
 * Features:
 * - Builds comprehensive agent prompts from context
 * - Spawns Claude CLI subprocess with proper env vars
 * - Monitors agent output for errors
 * - Detached process execution for autonomous operation
 * - Process ID tracking for health monitoring
 */

import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import { createLogger } from '../utils/logger.js';
import type { AgentContext } from '../types/agent-context.js';

const logger = createLogger({ module: 'agent-spawner' });

// Constants
const CLAUDE_CLI_PATH = '/home/archiedev/.local/bin/claude';
const MARTHA_WORKFLOW_ROOT = '/mnt/data/martha-workflow';

/**
 * Agent spawn result
 */
export interface AgentSpawnResult {
  agentId: string;
  processId: number;
  contextPath: string;
  workDirectory: string;
}

/**
 * Claude Agent Spawner
 */
export class ClaudeAgentSpawner {
  /**
   * Spawn a Claude agent with full context
   */
  async spawnAgent(context: AgentContext): Promise<AgentSpawnResult> {
    const startTime = Date.now();

    logger.info('Spawning Claude agent', {
      agentId: context.agentId,
      issueId: context.issue.id,
      worktree: context.worktree.name,
    });

    try {
      // Create work directory
      const workDir = path.join(
        MARTHA_WORKFLOW_ROOT,
        '.martha/work',
        context.agentId
      );
      await fs.mkdir(workDir, { recursive: true });

      // Write context to file
      const contextPath = path.join(workDir, 'context.json');
      await fs.writeFile(contextPath, JSON.stringify(context, null, 2), 'utf-8');

      logger.debug('Agent context written', { contextPath });

      // Build agent prompt
      const prompt = this.buildAgentPrompt(context);

      // Write prompt to file for debugging
      const promptPath = path.join(workDir, 'prompt.txt');
      await fs.writeFile(promptPath, prompt, 'utf-8');

      // Spawn Claude CLI process
      const process = await this.spawnClaudeProcess(
        context,
        prompt,
        workDir,
        contextPath
      );

      const duration = Date.now() - startTime;

      logger.info('Claude agent spawned successfully', {
        agentId: context.agentId,
        processId: process.pid,
        duration,
      });

      return {
        agentId: context.agentId,
        processId: process.pid!,
        contextPath,
        workDirectory: workDir,
      };
    } catch (error) {
      logger.error('Failed to spawn Claude agent', {
        error: error instanceof Error ? error.message : 'Unknown error',
        agentId: context.agentId,
      });
      throw error;
    }
  }

  /**
   * Build comprehensive agent prompt
   */
  private buildAgentPrompt(context: AgentContext): string {
    const { issue, worktree, git, work, signals } = context;

    return `# Task Assignment: ${issue.id}

## Issue Details
- **Title**: ${issue.title}
- **Type**: ${issue.type}
- **Complexity**: ${issue.complexity} story points
- **Priority**: ${issue.priority || 'medium'}

## Description
${issue.description}

## Acceptance Criteria
${issue.acceptanceCriteria.map((ac, i) => `${i + 1}. ${ac}`).join('\n')}

## Technical Specification
${work.technicalSpec || 'Use your best judgment based on the issue description.'}

## Exit Criteria
${work.exitCriteria.map((ec, i) => `${i + 1}. ${ec}`).join('\n')}

## Work Environment
- **Repository**: ${git.repoPath}
- **Branch**: ${git.branch} (based on ${git.baseBranch})
- **Worktree**: ${worktree.name}
- **Time Budget**: ${work.timeBudgetMinutes} minutes

## Related Files
${work.relatedFiles.length > 0 ? work.relatedFiles.map((f) => `- ${f}`).join('\n') : 'No specific files identified. Search the codebase as needed.'}

## Test Requirements
${work.testRequirements.map((tr, i) => `${i + 1}. ${tr}`).join('\n')}

## Signal Protocol
You must send signals to report progress. Use curl or similar to POST JSON to these endpoints:

**1. Agent Started (send IMMEDIATELY after reading this)**
\`\`\`bash
curl -X POST ${signals.endpoints.agentStarted} \\
  -H "Content-Type: application/json" \\
  -d '{"agentId":"${context.agentId}","startTime":${Date.now()}}'
\`\`\`

**2. Commit Made (send after EACH commit)**
\`\`\`bash
curl -X POST ${signals.endpoints.commitMade} \\
  -H "Content-Type: application/json" \\
  -d '{"sha":"<commit_sha>","message":"<commit_message>","files":["<file1>","<file2>"]}'
\`\`\`

**3. Agent Completed (send when DONE)**
\`\`\`bash
curl -X POST ${signals.endpoints.agentCompleted} \\
  -H "Content-Type: application/json" \\
  -d '{"agentId":"${context.agentId}","duration":<duration_ms>}'
\`\`\`

**4. Block (send if you encounter blockers)**
\`\`\`bash
curl -X POST ${signals.endpoints.block} \\
  -H "Content-Type: application/json" \\
  -d '{"reason":"<blocker_description>","blockType":"error","agentId":"${context.agentId}"}'
\`\`\`

## Instructions
1. **Send agentStarted signal IMMEDIATELY**
2. Read the issue description and acceptance criteria carefully
3. Explore the codebase to understand the context
4. Implement the required changes
5. Write comprehensive tests
6. Run tests to verify functionality
7. **Send commitMade signal after EACH commit**
8. Ensure all acceptance criteria are met
9. **Send agentCompleted signal when done**

## Important Notes
- Work in the ${git.branch} branch (already created)
- Follow existing code patterns and style
- Include meaningful commit messages
- Don't push to remote (merging is handled separately)
- If you encounter any blockers, send a block signal immediately

## Context File
Full context available at: ${context.metadata.workDirectory}/context.json

---

**Ready to start? Send the agentStarted signal now!**
`;
  }

  /**
   * Spawn Claude CLI process
   */
  private async spawnClaudeProcess(
    context: AgentContext,
    prompt: string,
    workDir: string,
    contextPath: string
  ): Promise<ChildProcess> {
    // Create stdout/stderr log files
    const stdoutPath = path.join(workDir, 'stdout.log');
    const stderrPath = path.join(workDir, 'stderr.log');

    const stdoutStream = await fs.open(stdoutPath, 'w');
    const stderrStream = await fs.open(stderrPath, 'w');

    // Spawn Claude CLI
    const process = spawn(
      CLAUDE_CLI_PATH,
      [
        '--print',
        '--output-format', 'stream-json',
        '--add-dir', context.git.repoPath,
        '--agent', 'developer',
        prompt,
      ],
      {
        cwd: context.git.repoPath,
        env: {
          ...process.env,
          AGENT_ID: context.agentId,
          WORKFLOW_ID: context.workflowId,
          CONTEXT_PATH: contextPath,
          SIGNAL_API_URL: context.signals.apiUrl,
          ISSUE_ID: context.issue.id,
          BRANCH: context.git.branch,
        },
        detached: true,
        stdio: ['ignore', stdoutStream.fd, stderrStream.fd],
      }
    );

    // Handle process errors
    process.on('error', (error) => {
      logger.error('Agent process error', {
        agentId: context.agentId,
        error: error.message,
      });
    });

    // Log process exit
    process.on('exit', (code, signal) => {
      logger.info('Agent process exited', {
        agentId: context.agentId,
        code,
        signal,
      });

      // Close log streams
      stdoutStream.close();
      stderrStream.close();
    });

    // Unref to allow parent to exit
    process.unref();

    return process;
  }

  /**
   * Monitor agent output for errors
   */
  private monitorAgentOutput(
    process: ChildProcess,
    context: AgentContext
  ): void {
    // Monitor stdout for critical errors
    process.stdout?.on('data', (data: Buffer) => {
      const output = data.toString();

      // Check for common error patterns
      if (output.includes('ERROR') || output.includes('FATAL')) {
        logger.warn('Agent encountered error in stdout', {
          agentId: context.agentId,
          snippet: output.substring(0, 200),
        });
      }
    });

    // Monitor stderr
    process.stderr?.on('data', (data: Buffer) => {
      const output = data.toString();

      logger.debug('Agent stderr output', {
        agentId: context.agentId,
        snippet: output.substring(0, 200),
      });
    });
  }

  /**
   * Check if Claude CLI is available
   */
  async checkClaudeCLI(): Promise<boolean> {
    try {
      await fs.access(CLAUDE_CLI_PATH);
      return true;
    } catch {
      logger.error('Claude CLI not found', { path: CLAUDE_CLI_PATH });
      return false;
    }
  }
}

/**
 * Singleton instance
 */
export const claudeAgentSpawner = new ClaudeAgentSpawner();
