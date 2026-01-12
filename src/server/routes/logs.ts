import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { promises as fs } from 'fs';
import { watch } from 'fs';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger({ module: 'logs' });

/**
 * Log streaming routes using Server-Sent Events
 */
export async function logsRoutes(fastify: FastifyInstance) {
  /**
   * Stream logs for a specific worktree using SSE
   */
  fastify.get(
    '/api/v1/logs/:worktree',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { worktree } = request.params as { worktree: string };
      const { lines } = request.query as { lines?: string };

      const logFile = `/tmp/agent-${worktree}.log`;
      const tailLines = lines ? parseInt(lines, 10) : 100;

      logger.info(`Streaming logs for ${worktree}`);

      // Set SSE headers
      reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      });

      // Function to send SSE message
      const sendEvent = (data: Record<string, unknown>) => {
        reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
      };

      try {
        // Check if log file exists
        try {
          await fs.access(logFile);
        } catch {
          sendEvent({
            type: 'error',
            message: `Log file not found for worktree: ${worktree}`,
          });
          reply.raw.end();
          return;
        }

        // Read initial tail of log file
        const content = await fs.readFile(logFile, 'utf-8');
        const allLines = content.split('\n').filter((line) => line.trim());
        const initialLines = allLines.slice(-tailLines);

        // Send initial logs
        sendEvent({
          type: 'initial',
          lines: initialLines,
          worktree,
        });

        // Track current file size
        let lastSize = (await fs.stat(logFile)).size;

        // Watch for file changes
        const watcher = watch(logFile, async (eventType) => {
          if (eventType === 'change') {
            try {
              const stats = await fs.stat(logFile);
              const currentSize = stats.size;

              // Only read if file has grown
              if (currentSize > lastSize) {
                const stream = await fs.open(logFile, 'r');
                const buffer = Buffer.alloc(currentSize - lastSize);
                await stream.read(buffer, 0, buffer.length, lastSize);
                await stream.close();

                const newContent = buffer.toString('utf-8');
                const newLines = newContent
                  .split('\n')
                  .filter((line) => line.trim());

                if (newLines.length > 0) {
                  sendEvent({
                    type: 'update',
                    lines: newLines,
                    worktree,
                  });
                }

                lastSize = currentSize;
              } else if (currentSize < lastSize) {
                // File was truncated or rotated
                lastSize = currentSize;
                sendEvent({
                  type: 'info',
                  message: 'Log file was rotated',
                });
              }
            } catch (error) {
              logger.error('Error reading log file', {
                error: error instanceof Error ? error.message : 'Unknown error',
              });
            }
          }
        });

        // Clean up on client disconnect
        request.raw.on('close', () => {
          watcher.close();
          logger.info(`Client disconnected from logs stream: ${worktree}`);
        });

        // Keep connection alive with periodic heartbeat
        const heartbeat = setInterval(() => {
          reply.raw.write(': heartbeat\n\n');
        }, 30000);

        request.raw.on('close', () => {
          clearInterval(heartbeat);
        });
      } catch (error) {
        logger.error('Error setting up log stream', {
          error: error instanceof Error ? error.message : 'Unknown error',
          worktree,
        });

        sendEvent({
          type: 'error',
          message: 'Failed to stream logs',
        });

        reply.raw.end();
      }
    }
  );

  /**
   * Get list of available log files
   */
  fastify.get('/api/v1/logs', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const files = await fs.readdir('/tmp');
      const logFiles = files
        .filter((file) => file.startsWith('agent-') && file.endsWith('.log'))
        .map((file) => {
          const worktree = file.replace('agent-', '').replace('.log', '');
          return {
            worktree,
            file: `/tmp/${file}`,
          };
        });

      return reply.send({
        logs: logFiles,
        count: logFiles.length,
      });
    } catch (error) {
      logger.error('Failed to list log files', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return reply.code(500).send({
        error: 'Failed to list log files',
      });
    }
  });
}
