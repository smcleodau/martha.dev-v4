/**
 * OpenTelemetry Distributed Tracing
 * TASK-7.4.3: Add distributed tracing for production observability
 */

import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { createLogger } from '../utils/logger.js';

const logger = createLogger({ module: 'opentelemetry' });

let sdk: NodeSDK | null = null;

/**
 * Initialize OpenTelemetry SDK
 * Note: In production, configure exporters for Jaeger, Zipkin, or cloud providers
 */
export function initializeTracing(serviceName: string = 'martha-orchestration'): void {
  if (sdk) {
    logger.warn('OpenTelemetry already initialized');
    return;
  }

  try {
    sdk = new NodeSDK({
      resource: new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
        [SemanticResourceAttributes.SERVICE_VERSION]: '3.0.0',
        [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]:
          process.env.NODE_ENV || 'development',
      }),
      instrumentations: [
        getNodeAutoInstrumentations({
          // Disable unnecessary instrumentations
          '@opentelemetry/instrumentation-fs': {
            enabled: false,
          },
        }),
      ],
      // In production, add exporters here:
      // traceExporter: new JaegerExporter({ ... }),
      // OR
      // traceExporter: new OTLPTraceExporter({ ... }),
    });

    sdk.start();
    logger.info('OpenTelemetry tracing initialized', { serviceName });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      await sdk?.shutdown();
      logger.info('OpenTelemetry tracing shut down');
    });
  } catch (error) {
    logger.error('Failed to initialize OpenTelemetry', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Shutdown tracing
 */
export async function shutdownTracing(): Promise<void> {
  if (sdk) {
    await sdk.shutdown();
    sdk = null;
    logger.info('OpenTelemetry tracing shut down');
  }
}

/**
 * Custom tracing utilities (for manual instrumentation)
 */
import { trace, SpanStatusCode } from '@opentelemetry/api';

const tracer = trace.getTracer('martha-orchestration', '3.0.0');

/**
 * Trace a workflow execution
 */
export function traceWorkflow<T>(
  workflowId: string,
  workflowType: string,
  fn: () => Promise<T>
): Promise<T> {
  return tracer.startActiveSpan(
    `workflow.${workflowType}`,
    {
      attributes: {
        'workflow.id': workflowId,
        'workflow.type': workflowType,
      },
    },
    async (span) => {
      try {
        const result = await fn();
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error instanceof Error ? error.message : 'Unknown error',
        });
        span.recordException(error as Error);
        throw error;
      } finally {
        span.end();
      }
    }
  );
}

/**
 * Trace an activity execution
 */
export function traceActivity<T>(
  activityName: string,
  attributes: Record<string, string>,
  fn: () => Promise<T>
): Promise<T> {
  return tracer.startActiveSpan(
    `activity.${activityName}`,
    {
      attributes: {
        'activity.name': activityName,
        ...attributes,
      },
    },
    async (span) => {
      try {
        const result = await fn();
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error instanceof Error ? error.message : 'Unknown error',
        });
        span.recordException(error as Error);
        throw error;
      } finally {
        span.end();
      }
    }
  );
}

/**
 * Trace a database query
 */
export function traceDatabaseQuery<T>(
  queryType: string,
  fn: () => Promise<T>
): Promise<T> {
  return tracer.startActiveSpan(
    `db.query.${queryType}`,
    {
      attributes: {
        'db.system': 'postgresql',
        'db.operation': queryType,
      },
    },
    async (span) => {
      try {
        const result = await fn();
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error instanceof Error ? error.message : 'Unknown error',
        });
        span.recordException(error as Error);
        throw error;
      } finally {
        span.end();
      }
    }
  );
}
