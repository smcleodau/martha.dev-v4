/**
 * Telemetry Sink Implementation
 *
 * Provides the worker-side implementation of telemetry sinks.
 * Receives events from workflows via the sink protocol and writes them to TimescaleDB.
 *
 * This is registered in the worker configuration and provides a workflow-safe
 * mechanism for writing telemetry events without blocking workflow execution.
 */

import { InjectedSinkFunction } from '@temporalio/worker';
import { telemetryWriter } from '../services/TelemetryWriter.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger({ module: 'telemetry-sink' });

/**
 * Telemetry event interface (matches workflow-side definition)
 */
interface TelemetryEvent {
  eventType: string;
  eventCategory: 'workflow' | 'signal' | 'query';
  workflowId: string;
  workflowType: string;
  runId?: string;
  payload?: Record<string, unknown>;
  timestamp?: Date;
  source: 'temporal';
}

/**
 * Telemetry sink function
 * Called by the Temporal runtime when workflows emit telemetry events
 */
const writeEventSink: InjectedSinkFunction<TelemetryEvent> = {
  fn: async (workflowInfo, event) => {
    try {
      // Write event to TimescaleDB via TelemetryWriter
      await telemetryWriter.writeEvent({
        eventType: event.eventType,
        eventCategory: event.eventCategory,
        workflowId: event.workflowId,
        workflowType: event.workflowType,
        runId: event.runId || workflowInfo.runId,
        payload: event.payload,
        timestamp: event.timestamp,
        source: event.source,
        severity: 'info',
      });

      logger.debug('Telemetry event written from workflow', {
        workflowId: event.workflowId,
        eventType: event.eventType,
      });
    } catch (error) {
      // Log but don't throw - telemetry failures should not disrupt workflows
      logger.error('Failed to write telemetry event from workflow', {
        error: error instanceof Error ? error.message : 'Unknown error',
        workflowId: event.workflowId,
        eventType: event.eventType,
      });
    }
  },
};

/**
 * Export sinks for worker registration
 */
export const sinks = {
  telemetry: {
    writeEvent: writeEventSink,
  },
};
