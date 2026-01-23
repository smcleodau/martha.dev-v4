/**
 * Temporal Worker
 *
 * Runs Temporal workflows and activities.
 * Can be started standalone or integrated into the main application.
 */

import { config } from 'dotenv';

// Load environment variables first
config({ path: '.env.local' });

import { Worker, NativeConnection } from '@temporalio/worker';
import { loadTemporalConfig } from './config.js';
import logger from '../utils/logger.js';
import * as issueActivities from '../activities/issue-activities.js';
import * as gateActivities from '../activities/gate-activities.js';
import * as fs from 'fs';
import { sinks } from './telemetry-sink.js';

let worker: Worker | null = null;

/**
 * Create and start a Temporal worker
 */
export async function startWorker(): Promise<Worker> {
  if (worker) {
    logger.warn('Worker already running');
    return worker;
  }

  try {
    // Load config after dotenv has run
    const temporalConfig = loadTemporalConfig();

    logger.info(
      {
        address: temporalConfig.address,
        namespace: temporalConfig.namespace,
        taskQueue: temporalConfig.taskQueue,
      },
      'Starting Temporal worker'
    );

    // Configure connection for Temporal Cloud or local
    const isCloud = temporalConfig.address.includes('.tmprl.cloud') ||
                    temporalConfig.address.includes('.api.temporal.io');
    const connectionOptions: any = {
      address: temporalConfig.address,
    };

    if (isCloud && process.env.TEMPORAL_API_KEY) {
      // Temporal Cloud with API key authentication (regional endpoint)
      logger.info('Connecting to Temporal Cloud with API key');
      connectionOptions.apiKey = process.env.TEMPORAL_API_KEY;
      connectionOptions.tls = {}; // Enable TLS for API key authentication
    }

    const connection = await NativeConnection.connect(connectionOptions);

    worker = await Worker.create({
      connection,
      namespace: temporalConfig.namespace,
      taskQueue: temporalConfig.taskQueue,
      workflowsPath: new URL('../workflows', import.meta.url).pathname,
      activities: { ...issueActivities, ...gateActivities },
      maxConcurrentWorkflowTaskExecutions:
        temporalConfig.maxConcurrentWorkflowExecutions,
      maxConcurrentActivityTaskExecutions:
        temporalConfig.maxConcurrentActivityExecutions,
      // Register telemetry interceptor for automatic event capture
      interceptors: {
        workflowModules: [new URL('./telemetry-interceptor.js', import.meta.url).pathname],
      },
      // Register telemetry sinks for workflow-safe event writing
      sinks,
    });

    logger.info('Temporal worker created, starting run loop');
    await worker.run();

    return worker;
  } catch (error: any) {
    logger.error(
      {
        error: error.message,
        stack: error.stack,
        code: error.code,
        details: error.details
      },
      'Failed to start Temporal worker'
    );
    console.error('Worker connection error:', error);
    throw error;
  }
}

/**
 * Stop the Temporal worker
 */
export async function stopWorker(): Promise<void> {
  if (!worker) {
    logger.warn('No worker running');
    return;
  }

  try {
    logger.info('Stopping Temporal worker');
    worker.shutdown();
    worker = null;
    logger.info('Temporal worker stopped');
  } catch (error) {
    logger.error({ error }, 'Error stopping Temporal worker');
    throw error;
  }
}

/**
 * Main function for standalone worker execution
 */
async function main() {
  try {
    await startWorker();
  } catch (error) {
    logger.error({ error }, 'Worker failed');
    process.exit(1);
  }
}

// Run worker if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    logger.error({ error }, 'Fatal error in worker');
    process.exit(1);
  });
}
