import axios from 'axios';
import { createLogger } from '../../utils/logger.js';
import { appConfig } from '../../config/index.js';
import type { ToolResponse } from '../types.js';

const logger = createLogger({ module: 'test-tools' });

/**
 * Test orchestration tools
 */
export class TestTools {
  private serviceUrl: string;

  constructor() {
    this.serviceUrl = `http://localhost:${appConfig.servicePort}`;
  }

  async handle(toolName: string, args: Record<string, unknown>): Promise<ToolResponse> {
    switch (toolName) {
      case 'martha__test__trigger':
        return await this.triggerTest(args);
      case 'martha__test__get_results':
        return await this.getTestResults(args);
      case 'martha__test__get_history':
        return await this.getTestHistory(args);
      default:
        throw new Error(`Unknown test tool: ${toolName}`);
    }
  }

  /**
   * martha__test__trigger
   *
   * Trigger test execution for a worktree
   */
  private async triggerTest(args: Record<string, unknown>): Promise<ToolResponse> {
    const { worktree_name, suites, issue_number } = args;

    if (typeof worktree_name !== 'string') {
      throw new Error('worktree_name must be a string');
    }

    if (!Array.isArray(suites) || suites.length === 0) {
      throw new Error('suites must be a non-empty array');
    }

    logger.info('Triggering test execution', {
      worktree_name,
      suites,
      issue_number,
    });

    try {
      const response = await axios.post(`${this.serviceUrl}/api/v1/tests/trigger`, {
        worktree_name,
        suites,
        issue_number: typeof issue_number === 'number' ? issue_number : undefined,
      });

      const data = response.data;

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: true,
                test_execution_id: data.test_execution_id,
                worktree_name: data.worktree_name,
                suites: data.suites,
                message: data.message,
                next_steps: [
                  `Use martha__test__get_results with test_execution_id="${data.test_execution_id}" to check status`,
                  'Tests typically take 2-10 minutes depending on suite size',
                ],
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        const errorData = error.response.data;
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  error: errorData.error || 'Failed to trigger test execution',
                  details: errorData.message || errorData.details,
                },
                null,
                2
              ),
            },
          ],
          isError: true,
        };
      }

      logger.error('Failed to trigger test execution', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * martha__test__get_results
   *
   * Get test execution results by ID
   */
  private async getTestResults(args: Record<string, unknown>): Promise<ToolResponse> {
    const { test_execution_id } = args;

    if (typeof test_execution_id !== 'string') {
      throw new Error('test_execution_id must be a string');
    }

    logger.debug('Getting test results', { test_execution_id });

    try {
      const response = await axios.get(`${this.serviceUrl}/api/v1/tests/${test_execution_id}`);

      const data = response.data;

      // Format response based on status
      const formattedResponse: any = {
        test_execution_id: data.test_execution_id,
        worktree_name: data.worktree_name,
        issue_number: data.issue_number,
        suites: data.suites,
        status: data.status,
        started_at: data.started_at,
        completed_at: data.completed_at,
      };

      if (data.status === 'running') {
        formattedResponse.message = data.message;
        formattedResponse.elapsed_time_ms = data.elapsed_time_ms;
        formattedResponse.note = 'Test execution is still in progress';
      } else {
        // Include results
        formattedResponse.summary = data.summary;
        formattedResponse.coverage_percent = data.coverage_percent;

        // Add quality indicators
        if (data.summary) {
          formattedResponse.quality_indicators = {
            all_tests_passed: data.summary.failed === 0,
            coverage_threshold_met:
              data.coverage_percent !== undefined ? data.coverage_percent >= 80 : null,
            test_success_rate: data.summary.success_rate,
          };
        }

        // Include detailed results if available
        if (data.results) {
          formattedResponse.detailed_results = {
            framework: data.results.framework,
            duration_ms: data.results.duration_ms,
            failed_tests: data.results.tests?.filter((t: any) => t.status === 'failed') || [],
          };
        }
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(formattedResponse, null, 2),
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
                  error: 'Test execution not found',
                  test_execution_id,
                  suggestion: 'The test execution ID may be invalid or the test may have been deleted',
                },
                null,
                2
              ),
            },
          ],
        };
      }

      logger.error('Failed to get test results', {
        test_execution_id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * martha__test__get_history
   *
   * Get test execution history
   */
  private async getTestHistory(args: Record<string, unknown>): Promise<ToolResponse> {
    const { worktree_name, issue_number, limit } = args;

    if (worktree_name && issue_number) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                error: 'Cannot specify both worktree_name and issue_number',
                message: 'Please provide only one filter parameter',
              },
              null,
              2
            ),
          },
        ],
        isError: true,
      };
    }

    if (!worktree_name && !issue_number) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                error: 'Missing filter parameter',
                message: 'Please provide either worktree_name or issue_number',
              },
              null,
              2
            ),
          },
        ],
        isError: true,
      };
    }

    const queryLimit = typeof limit === 'number' ? limit : 50;

    logger.debug('Getting test history', {
      worktree_name,
      issue_number,
      limit: queryLimit,
    });

    try {
      let response;

      if (worktree_name && typeof worktree_name === 'string') {
        response = await axios.get(
          `${this.serviceUrl}/api/v1/tests/history/worktree/${worktree_name}?limit=${queryLimit}`
        );
      } else if (issue_number && typeof issue_number === 'number') {
        response = await axios.get(
          `${this.serviceUrl}/api/v1/tests/history/issue/${issue_number}?limit=${queryLimit}`
        );
      } else {
        throw new Error('Invalid filter parameters');
      }

      const data = response.data;

      // Add trend analysis
      const testExecutions = data.test_executions || [];
      const recentTests = testExecutions.slice(0, 5);

      const trend = {
        total_executions: data.count,
        recent_pass_rate:
          recentTests.length > 0
            ? (
                (recentTests.filter((t: any) => t.status === 'passed').length / recentTests.length) *
                100
              ).toFixed(2) + '%'
            : 'N/A',
        latest_execution: testExecutions[0] || null,
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                filter: worktree_name
                  ? { worktree_name }
                  : { issue_number },
                trend,
                count: data.count,
                test_executions: testExecutions,
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
                  error: 'Not found',
                  message: worktree_name
                    ? `Worktree '${worktree_name}' not found`
                    : `No test history found for issue #${issue_number}`,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      logger.error('Failed to get test history', {
        worktree_name,
        issue_number,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }
}
