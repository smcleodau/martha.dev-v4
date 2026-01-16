/**
 * Temporal Worker
 *
 * Runs Temporal workflows and activities.
 * Can be started standalone or integrated into the main application.
 */

import { Worker, NativeConnection } from '@temporalio/worker';
import { temporalConfig } from './config.js';
import logger from '../utils/logger.js';
import * as activities from '../activities/issue-activities.js';

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
    logger.info(
      {
        address: temporalConfig.address,
        namespace: temporalConfig.namespace,
        taskQueue: temporalConfig.taskQueue,
      },
      'Starting Temporal worker'
    );

    const connection = await NativeConnection.connect({
      address: temporalConfig.address,
    });

    worker = await Worker.create({
      connection,
      namespace: temporalConfig.namespace,
      taskQueue: temporalConfig.taskQueue,
      workflowsPath: new URL('../workflows', import.meta.url).pathname,
      activities,
      maxConcurrentWorkflowTaskExecutions:
        temporalConfig.maxConcurrentWorkflowExecutions,
      maxConcurrentActivityTaskExecutions:
        temporalConfig.maxConcurrentActivityExecutions,
    });

    logger.info('Temporal worker created, starting run loop');
    await worker.run();

    return worker;
  } catch (error) {
    logger.error({ error }, 'Failed to start Temporal worker');
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
