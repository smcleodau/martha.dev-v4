import pino from 'pino';

/**
 * Configure Pino logger
 * Uses structured JSON logging with optional pretty printing for development
 */
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => {
      return { level: label.toUpperCase() };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  ...(process.env.LOG_PRETTY === 'true' && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    },
  }),
});

/**
 * Create child logger with context
 */
export function createLogger(context: Record<string, unknown>) {
  return logger.child(context);
}

/**
 * Export default logger
 */
export default logger;
