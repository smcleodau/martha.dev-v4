/**
 * Temporal Client
 *
 * Provides a singleton Temporal client for triggering workflows
 * and sending signals/queries from the Martha.dev API.
 */

import { Connection, Client, WorkflowHandle } from '@temporalio/client';
import { temporalConfig } from './config.js';
import logger from '../utils/logger.js';
import * as fs from 'fs';

let client: Client | null = null;
let connection: Connection | null = null;

/**
 * Get or create Temporal client (singleton)
 */
export async function getTemporalClient(): Promise<Client> {
  if (client) {
    return client;
  }

  try {
    logger.info(
      { address: temporalConfig.address, namespace: temporalConfig.namespace },
      'Connecting to Temporal server'
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

    connection = await Connection.connect(connectionOptions);

    client = new Client({
      connection,
      namespace: temporalConfig.namespace,
    });

    logger.info('Successfully connected to Temporal server');
    return client;
  } catch (error) {
    logger.error({ error }, 'Failed to connect to Temporal server');
    throw error;
  }
}

/**
 * Start a workflow execution
 */
export async function startWorkflow<T = any>(
  workflowType: string,
  workflowId: string,
  args: any[],
  options: {
    taskQueue?: string;
    workflowExecutionTimeout?: number;
    searchAttributes?: Record<string, any>;
  } = {}
): Promise<WorkflowHandle<T>> {
  const temporalClient = await getTemporalClient();

  const handle = await temporalClient.workflow.start(workflowType, {
    workflowId,
    taskQueue: options.taskQueue || temporalConfig.taskQueue,
    args,
    workflowExecutionTimeout: options.workflowExecutionTimeout || temporalConfig.workflowExecutionTimeout,
    searchAttributes: options.searchAttributes,
  });

  logger.info(
    { workflowId, workflowType, runId: handle.firstExecutionRunId },
    'Started workflow'
  );

  return handle;
}

/**
 * Get a handle to an existing workflow
 */
export async function getWorkflowHandle<T = any>(
  workflowId: string,
  runId?: string
): Promise<WorkflowHandle<T>> {
  const temporalClient = await getTemporalClient();
  return temporalClient.workflow.getHandle(workflowId, runId);
}

/**
 * Signal a workflow
 */
export async function signalWorkflow(
  workflowId: string,
  signalName: string,
  args: any[] = []
): Promise<void> {
  const handle = await getWorkflowHandle(workflowId);
  await handle.signal(signalName, ...args);

  logger.info(
    { workflowId, signalName },
    'Sent signal to workflow'
  );
}

/**
 * Query a workflow
 */
export async function queryWorkflow<T = any>(
  workflowId: string,
  queryName: string,
  args: any[] = []
): Promise<T> {
  const handle = await getWorkflowHandle<T>(workflowId);
  const result = await handle.query(queryName, ...args);

  logger.debug(
    { workflowId, queryName },
    'Queried workflow'
  );

  return result;
}

/**
 * Cancel a workflow
 */
export async function cancelWorkflow(workflowId: string): Promise<void> {
  const handle = await getWorkflowHandle(workflowId);
  await handle.cancel();

  logger.info({ workflowId }, 'Cancelled workflow');
}

/**
 * Terminate a workflow
 */
export async function terminateWorkflow(
  workflowId: string,
  reason: string
): Promise<void> {
  const handle = await getWorkflowHandle(workflowId);
  await handle.terminate(reason);

  logger.info({ workflowId, reason }, 'Terminated workflow');
}

/**
 * Close the Temporal client connection
 */
export async function closeTemporalClient(): Promise<void> {
  if (connection) {
    await connection.close();
    connection = null;
    client = null;
    logger.info('Closed Temporal client connection');
  }
}
