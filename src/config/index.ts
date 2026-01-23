import { config } from 'dotenv';
import { z } from 'zod';

import logger from '../utils/logger.js';

// Load environment variables from appropriate .env file
const envFile = process.env.NODE_ENV === 'test' ? '.env.test' : '.env.local';
config({ path: envFile });

/**
 * Configuration schema with Zod validation
 */
const configSchema = z.object({
  // Service
  worktreeIndex: z.coerce.number().int().positive(),
  worktreeName: z.string().min(1),
  nodeEnv: z.enum(['development', 'production', 'test']).default('development'),

  // Ports
  servicePort: z.coerce.number().int().min(1000).max(65535),
  redisPort: z.coerce.number().int().min(1000).max(65535),
  mcpPort: z.coerce.number().int().min(1000).max(65535).optional(),
  metricsPort: z.coerce.number().int().min(1000).max(65535).optional(),
  dashboardPort: z.coerce.number().int().min(1000).max(65535).optional(),

  // Database
  databaseUrl: z.string().url(),
  databaseSchema: z.string().default('ts_martha'),

  // Redis
  redisUrl: z.string().url(),
  redisKeyPrefix: z.string().default('ts:'),

  // Python Service Integration
  pythonServiceUrl: z.string().url().optional(),

  // GitHub
  githubToken: z.string().optional(),
  githubRepo: z.string().optional(),

  // Cloudflare
  cloudflareApiToken: z.string().optional(),
  cloudflareZoneId: z.string().optional(),
  cloudflareAccountId: z.string().optional(),
  cloudflareDomain: z.string().default('arch.ie'),

  // MCP
  mcpServerName: z.string().default('martha-dev'),
  mcpServerVersion: z.string().default('3.0.0'),

  // Braintrust
  braintrustApiKey: z.string().optional(),

  // Browserbase
  browserbaseApiKey: z.string().optional(),
  browserbaseProjectId: z.string().optional(),

  // Logging
  logLevel: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  logPretty: z.coerce.boolean().default(false),

  // Metrics
  metricsDir: z.string().default('~/.martha/metrics'),

  // Tracker
  tracker: z
    .object({
      marthaDir: z.string().default('/mnt/data/martha-workflow/.martha'),
      enableSync: z.coerce.boolean().default(true),
      githubOwner: z.string().optional(),
      githubRepo: z.string().optional(),
    })
    .optional()
    .default({
      marthaDir: '/mnt/data/martha-workflow/.martha',
      enableSync: true,
    }),
});

/**
 * Parse and validate configuration
 */
function loadConfig() {
  try {
    const rawConfig = {
      worktreeIndex: process.env.WORKTREE_INDEX,
      worktreeName: process.env.WORKTREE_NAME,
      nodeEnv: process.env.NODE_ENV,

      servicePort: process.env.SERVICE_PORT,
      redisPort: process.env.REDIS_PORT,
      mcpPort: process.env.MCP_PORT,
      metricsPort: process.env.METRICS_PORT,
      dashboardPort: process.env.DASHBOARD_PORT,

      databaseUrl: process.env.DATABASE_URL,
      databaseSchema: process.env.DATABASE_SCHEMA,

      redisUrl: process.env.REDIS_URL,
      redisKeyPrefix: process.env.REDIS_KEY_PREFIX,

      pythonServiceUrl: process.env.PYTHON_SERVICE_URL,

      githubToken: process.env.GITHUB_TOKEN,
      githubRepo: process.env.GITHUB_REPO,

      cloudflareApiToken: process.env.CLOUDFLARE_API_TOKEN,
      cloudflareZoneId: process.env.CLOUDFLARE_ZONE_ID,
      cloudflareAccountId: process.env.CLOUDFLARE_ACCOUNT_ID,
      cloudflareDomain: process.env.CLOUDFLARE_DOMAIN,

      mcpServerName: process.env.MCP_SERVER_NAME,
      mcpServerVersion: process.env.MCP_SERVER_VERSION,

      braintrustApiKey: process.env.BRAINTRUST_API_KEY,

      browserbaseApiKey: process.env.BROWSERBASE_API_KEY,
      browserbaseProjectId: process.env.BROWSERBASE_PROJECT_ID,

      logLevel: process.env.LOG_LEVEL,
      logPretty: process.env.LOG_PRETTY,

      metricsDir: process.env.METRICS_DIR,

      tracker: {
        marthaDir: process.env.MARTHA_DIR || '/mnt/data/martha-workflow/.martha',
        enableSync: process.env.TRACKER_SYNC_ENABLED !== 'false',
        githubOwner: process.env.GITHUB_OWNER,
        githubRepo: process.env.GITHUB_REPO,
      },
    };

    const validated = configSchema.parse(rawConfig);

    logger.info('Configuration loaded successfully', {
      worktreeName: validated.worktreeName,
      worktreeIndex: validated.worktreeIndex,
      servicePort: validated.servicePort,
      nodeEnv: validated.nodeEnv,
    });

    return validated;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorDetails = error.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
      }));
      logger.error('Configuration validation failed', {
        errors: errorDetails,
      });
      // Also log to console for test debugging
      console.error('Config validation errors:', JSON.stringify(errorDetails, null, 2));
      throw new Error(`Invalid configuration. Check ${envFile} file. Errors: ${JSON.stringify(errorDetails)}`);
    }
    throw error;
  }
}

/**
 * Export validated configuration
 */
export const appConfig = loadConfig();

/**
 * Export type for use throughout the application
 */
export type AppConfig = z.infer<typeof configSchema>;
