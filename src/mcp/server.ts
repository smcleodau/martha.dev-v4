#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { createLogger } from '../utils/logger.js';
import { EpicTools } from './tools/epic-tools.js';
import { WorktreeTools } from './tools/worktree-tools.js';
import { EventTools } from './tools/event-tools.js';
import { TunnelTools } from './tools/tunnel-tools.js';
import { SwarmTools } from './tools/swarm-tools.js';

const logger = createLogger({ module: 'mcp-server' });

const MCP_VERSION = '3.0.0';

/**
 * Martha MCP Server
 * Provides 23 tools for Claude Code integration
 */
class MarthaServer {
  private server: Server;
  private epicTools: EpicTools;
  private worktreeTools: WorktreeTools;
  private eventTools: EventTools;
  private tunnelTools: TunnelTools;
  private swarmTools: SwarmTools;

  constructor() {
    this.server = new Server(
      {
        name: 'martha-dev',
        version: MCP_VERSION,
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Initialize tool handlers
    this.epicTools = new EpicTools();
    this.worktreeTools = new WorktreeTools();
    this.eventTools = new EventTools();
    this.tunnelTools = new TunnelTools();
    this.swarmTools = new SwarmTools();

    this.setupHandlers();
  }

  private setupHandlers() {
    // List all available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools: Tool[] = [
        // Epic Management Tools (3)
        {
          name: 'martha__epic__start',
          description:
            'Start tracking a GitHub epic and provision a worktree for development',
          inputSchema: {
            type: 'object',
            properties: {
              epic_number: {
                type: 'number',
                description: 'GitHub epic/issue number',
              },
              branch_name: {
                type: 'string',
                description: 'Optional branch name (defaults to epic-{number})',
              },
            },
            required: ['epic_number'],
          },
        },
        {
          name: 'martha__epic__get_context',
          description: 'Get context and metadata for an epic',
          inputSchema: {
            type: 'object',
            properties: {
              worktree_name: {
                type: 'string',
                description: 'Name of the worktree',
              },
            },
            required: ['worktree_name'],
          },
        },
        {
          name: 'martha__epic__get_status',
          description: 'Get current status of an epic',
          inputSchema: {
            type: 'object',
            properties: {
              epic_number: {
                type: 'number',
                description: 'GitHub epic/issue number',
              },
            },
            required: ['epic_number'],
          },
        },

        // Worktree Management Tools (4)
        {
          name: 'martha__worktree__create',
          description:
            'Create a new git worktree with Docker environment and Cloudflare tunnels',
          inputSchema: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'Worktree name',
              },
              branch_name: {
                type: 'string',
                description: 'Git branch name',
              },
              epic_number: {
                type: 'number',
                description: 'Optional GitHub epic number to associate',
              },
            },
            required: ['name', 'branch_name'],
          },
        },
        {
          name: 'martha__worktree__get_status',
          description: 'Get current status of a worktree',
          inputSchema: {
            type: 'object',
            properties: {
              worktree_name: {
                type: 'string',
                description: 'Name of the worktree',
              },
            },
            required: ['worktree_name'],
          },
        },
        {
          name: 'martha__worktree__destroy',
          description:
            'Destroy a worktree (stops containers, removes tunnels, deletes worktree)',
          inputSchema: {
            type: 'object',
            properties: {
              worktree_name: {
                type: 'string',
                description: 'Name of the worktree',
              },
            },
            required: ['worktree_name'],
          },
        },
        {
          name: 'martha__worktree__list_all',
          description: 'List all registered worktrees with their status',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },

        // Event Query Tools (2)
        {
          name: 'martha__events__get_recent',
          description: 'Get recent events for a worktree',
          inputSchema: {
            type: 'object',
            properties: {
              worktree_name: {
                type: 'string',
                description: 'Name of the worktree',
              },
              limit: {
                type: 'number',
                description: 'Number of events to return (default: 100)',
              },
              event_type: {
                type: 'string',
                description: 'Optional filter by event type (e.g., "git.commit")',
              },
            },
            required: ['worktree_name'],
          },
        },
        {
          name: 'martha__events__get_by_issue',
          description: 'Get all events tagged with a specific issue number',
          inputSchema: {
            type: 'object',
            properties: {
              issue_number: {
                type: 'number',
                description: 'GitHub issue number',
              },
            },
            required: ['issue_number'],
          },
        },

        // Tunnel Management Tools (2)
        {
          name: 'martha__tunnel__provision',
          description: 'Provision a Cloudflare tunnel for a worktree',
          inputSchema: {
            type: 'object',
            properties: {
              worktree_name: {
                type: 'string',
                description: 'Name of the worktree',
              },
              port: {
                type: 'number',
                description: 'Local port to expose via tunnel',
              },
              subdomain: {
                type: 'string',
                description: 'Optional custom subdomain (default: worktree_name.martha.arch.ie)',
              },
            },
            required: ['worktree_name', 'port'],
          },
        },
        {
          name: 'martha__tunnel__destroy',
          description: 'Destroy Cloudflare tunnel for a worktree',
          inputSchema: {
            type: 'object',
            properties: {
              worktree_name: {
                type: 'string',
                description: 'Name of the worktree',
              },
            },
            required: ['worktree_name'],
          },
        },

        // Swarm Management Tools (4)
        {
          name: 'martha__swarm__spawn',
          description: 'Spawn a new claude-flow swarm for an epic',
          inputSchema: {
            type: 'object',
            properties: {
              epic_number: {
                type: 'number',
                description: 'Optional GitHub epic number for context',
              },
              worktree_path: {
                type: 'string',
                description: 'Path to worktree where swarm will run',
              },
            },
            required: ['worktree_path'],
          },
        },
        {
          name: 'martha__swarm__status',
          description: 'Get detailed status of a running swarm',
          inputSchema: {
            type: 'object',
            properties: {
              swarm_id: {
                type: 'string',
                description: 'UUID of the swarm',
              },
            },
            required: ['swarm_id'],
          },
        },
        {
          name: 'martha__swarm__terminate',
          description: 'Terminate a running swarm',
          inputSchema: {
            type: 'object',
            properties: {
              swarm_id: {
                type: 'string',
                description: 'UUID of the swarm',
              },
              reason: {
                type: 'string',
                description: 'Optional reason for termination',
              },
            },
            required: ['swarm_id'],
          },
        },
        {
          name: 'martha__swarm__list_active',
          description: 'List all active swarms with resource usage',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
      ];

      return { tools };
    });

    // Handle tool execution
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      const toolArgs = args || {};

      logger.info(`Executing tool: ${name}`, { args: toolArgs });

      try {
        // Route to appropriate tool handler
        if (name.startsWith('martha__epic__')) {
          return await this.epicTools.handle(name, toolArgs);
        } else if (name.startsWith('martha__worktree__')) {
          return await this.worktreeTools.handle(name, toolArgs);
        } else if (name.startsWith('martha__events__')) {
          return await this.eventTools.handle(name, toolArgs);
        } else if (name.startsWith('martha__tunnel__')) {
          return await this.tunnelTools.handle(name, toolArgs);
        } else if (name.startsWith('martha__swarm__')) {
          return await this.swarmTools.handle(name, toolArgs);
        }

        throw new Error(`Unknown tool: ${name}`);
      } catch (error) {
        logger.error(`Tool execution failed: ${name}`, {
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
        };
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);

    logger.info('Martha MCP Server started', {
      version: MCP_VERSION,
      tools: 15, // 3 epic, 4 worktree, 2 event, 2 tunnel, 4 swarm
    });
  }
}

// Start the server
const server = new MarthaServer();
server.run().catch((error) => {
  logger.error('Failed to start MCP server', {
    error: error instanceof Error ? error.message : 'Unknown error',
  });
  process.exit(1);
});
