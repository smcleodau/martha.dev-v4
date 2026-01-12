import axios from 'axios';
import { createLogger } from '../../utils/logger.js';
import { appConfig } from '../../config/index.js';
import type { ToolResponse, EventItem } from '../types.js';

const logger = createLogger({ module: 'event-tools' });

/**
 * Event query tools
 */
export class EventTools {
  private serviceUrl: string;

  constructor() {
    this.serviceUrl = `http://localhost:${appConfig.servicePort}`;
  }

  async handle(toolName: string, args: Record<string, unknown>): Promise<ToolResponse> {
    switch (toolName) {
      case 'martha__events__get_recent':
        return await this.getRecent(args);
      case 'martha__events__get_by_issue':
        return await this.getByIssue(args);
      default:
        throw new Error(`Unknown event tool: ${toolName}`);
    }
  }

  /**
   * Get recent events for a worktree
   */
  private async getRecent(args: Record<string, unknown>): Promise<ToolResponse> {
    const { worktree_name, limit, event_type } = args;

    if (typeof worktree_name !== 'string') {
      throw new Error('worktree_name must be a string');
    }

    const queryLimit = typeof limit === 'number' ? limit : 100;
    const typeFilter = typeof event_type === 'string' ? event_type : undefined;

    logger.info('Getting recent events', { worktree_name, limit: queryLimit, event_type: typeFilter });

    try {
      const params = new URLSearchParams({
        limit: String(queryLimit),
        ...(typeFilter && { type: typeFilter }),
      });

      const response = await axios.get<{
        worktree: string;
        events: EventItem[];
        total: number;
      }>(`${this.serviceUrl}/api/v1/worktrees/${worktree_name}/events?${params}`);

      const { events, total } = response.data;

      // Group events by type for better readability
      const eventsByType: Record<string, EventItem[]> = {};
      for (const event of events) {
        if (!eventsByType[event.type]) {
          eventsByType[event.type] = [];
        }
        const typeArray = eventsByType[event.type];
        if (typeArray) {
          typeArray.push(event);
        }
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                worktree: worktree_name,
                summary: {
                  total_events: total,
                  event_types: Object.keys(eventsByType).length,
                  latest_event: events[0]
                    ? {
                        type: events[0].type,
                        timestamp: events[0].timestamp,
                      }
                    : null,
                },
                events_by_type: Object.entries(eventsByType).map(([type, typeEvents]) => ({
                  type,
                  count: typeEvents.length,
                  latest: typeEvents[0],
                })),
                recent_events: events.slice(0, 10).map((e) => ({
                  type: e.type,
                  timestamp: e.timestamp,
                  data: e.data,
                })),
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  error: 'No events found',
                  worktree_name,
                  suggestion: 'The worktree may not have any events yet, or the agent is not running',
                },
                null,
                2
              ),
            },
          ],
        };
      }

      logger.error('Failed to get recent events', {
        worktree_name,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get events tagged with an issue number
   */
  private async getByIssue(args: Record<string, unknown>): Promise<ToolResponse> {
    const { issue_number } = args;

    if (typeof issue_number !== 'number') {
      throw new Error('issue_number must be a number');
    }

    logger.info('Getting events by issue', { issue_number });

    // Placeholder implementation
    // In the future, this will query Redis for events tagged with issue number
    // Events get tagged when agents/swarms work on specific issues

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              issue_number,
              message: 'Issue-tagged event querying not yet implemented',
              info: 'This will return all events (commits, tests, deployments) related to a specific GitHub issue',
              future_features: [
                'Chronological timeline of work on an issue',
                'Evidence collection for issue completion',
                'Cross-worktree event aggregation',
              ],
            },
            null,
            2
          ),
        },
      ],
    };
  }
}
