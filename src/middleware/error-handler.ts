/**
 * Comprehensive Error Handling Middleware
 * TASK-7.4.1: Production-grade error handling
 */

import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { createLogger } from '../utils/logger.js';
import { pool } from '../database/client.js';

const errorLogger = createLogger({ module: 'error-handler' });

/**
 * Error types for classification
 */
export enum ErrorType {
  VALIDATION = 'VALIDATION_ERROR',
  DATABASE = 'DATABASE_ERROR',
  TEMPORAL = 'TEMPORAL_ERROR',
  AUTHENTICATION = 'AUTHENTICATION_ERROR',
  AUTHORIZATION = 'AUTHORIZATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  RATE_LIMIT = 'RATE_LIMIT',
  EXTERNAL_SERVICE = 'EXTERNAL_SERVICE_ERROR',
  INTERNAL = 'INTERNAL_SERVER_ERROR',
}

/**
 * Custom application error class
 */
export class AppError extends Error {
  constructor(
    public type: ErrorType,
    public message: string,
    public statusCode: number,
    public details?: any,
    public isOperational: boolean = true
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * HTTP status code mapping
 */
const ERROR_STATUS_CODES: Record<ErrorType, number> = {
  [ErrorType.VALIDATION]: 400,
  [ErrorType.AUTHENTICATION]: 401,
  [ErrorType.AUTHORIZATION]: 403,
  [ErrorType.NOT_FOUND]: 404,
  [ErrorType.CONFLICT]: 409,
  [ErrorType.RATE_LIMIT]: 429,
  [ErrorType.DATABASE]: 500,
  [ErrorType.TEMPORAL]: 500,
  [ErrorType.EXTERNAL_SERVICE]: 502,
  [ErrorType.INTERNAL]: 500,
};

/**
 * Log error to database for monitoring
 */
async function logErrorToDatabase(
  error: Error | AppError,
  request: FastifyRequest,
  context?: any
): Promise<void> {
  try {
    const isAppError = error instanceof AppError;
    const errorType = isAppError ? error.type : ErrorType.INTERNAL;
    const statusCode = isAppError ? error.statusCode : 500;

    await pool.query(
      `
      INSERT INTO ts_martha.exceptions (
        exception_type,
        severity,
        workflow_id,
        title,
        description,
        context,
        detected_value,
        workflow_type
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `,
      [
        errorType,
        statusCode >= 500 ? 'high' : 'medium',
        context?.workflowId || 'unknown',
        error.message.substring(0, 255),
        error.stack || error.message,
        JSON.stringify({
          method: request.method,
          url: request.url,
          ip: request.ip,
          userAgent: request.headers['user-agent'],
          details: isAppError ? (error as AppError).details : undefined,
          ...context,
        }),
        statusCode,
        'api_error',
      ]
    );
  } catch (dbError) {
    // Don't throw - we don't want error logging to crash the app
    errorLogger.error('Failed to log error to database', {
      error: dbError instanceof Error ? dbError.message : 'Unknown error',
      originalError: error.message,
    });
  }
}

/**
 * Determine if error is operational (expected) or programmer error
 */
function isOperationalError(error: Error | AppError): boolean {
  if (error instanceof AppError) {
    return error.isOperational;
  }

  // Check for known operational error patterns
  const operationalPatterns = [
    /ECONNREFUSED/,
    /ETIMEDOUT/,
    /ENOTFOUND/,
    /validation failed/i,
    /duplicate key/i,
    /foreign key constraint/i,
  ];

  return operationalPatterns.some((pattern) =>
    pattern.test(error.message)
  );
}

/**
 * Extract relevant error information
 */
function extractErrorInfo(error: Error | FastifyError | AppError): {
  type: ErrorType;
  message: string;
  statusCode: number;
  details?: any;
  isOperational: boolean;
} {
  // Handle AppError
  if (error instanceof AppError) {
    return {
      type: error.type,
      message: error.message,
      statusCode: error.statusCode,
      details: error.details,
      isOperational: error.isOperational,
    };
  }

  // Handle Fastify validation errors
  if ('validation' in error) {
    return {
      type: ErrorType.VALIDATION,
      message: 'Validation failed',
      statusCode: 400,
      details: (error as FastifyError).validation,
      isOperational: true,
    };
  }

  // Handle database errors
  if (error.message.includes('postgres') || error.message.includes('database')) {
    return {
      type: ErrorType.DATABASE,
      message: 'Database operation failed',
      statusCode: 500,
      details: process.env.NODE_ENV === 'production' ? undefined : error.message,
      isOperational: true,
    };
  }

  // Handle Temporal errors
  if (error.message.includes('temporal') || error.message.includes('workflow')) {
    return {
      type: ErrorType.TEMPORAL,
      message: 'Workflow orchestration failed',
      statusCode: 500,
      details: process.env.NODE_ENV === 'production' ? undefined : error.message,
      isOperational: true,
    };
  }

  // Default to internal server error
  return {
    type: ErrorType.INTERNAL,
    message: process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred'
      : error.message,
    statusCode: 500,
    details: process.env.NODE_ENV === 'production' ? undefined : error.stack,
    isOperational: isOperationalError(error),
  };
}

/**
 * Format error response for client
 */
function formatErrorResponse(
  errorInfo: ReturnType<typeof extractErrorInfo>,
  requestId?: string
) {
  const response: any = {
    error: {
      type: errorInfo.type,
      message: errorInfo.message,
      statusCode: errorInfo.statusCode,
    },
  };

  if (requestId) {
    response.error.requestId = requestId;
  }

  if (errorInfo.details) {
    response.error.details = errorInfo.details;
  }

  if (process.env.NODE_ENV === 'development') {
    response.timestamp = new Date().toISOString();
  }

  return response;
}

/**
 * Main error handler middleware
 */
export async function errorHandler(
  error: Error | FastifyError | AppError,
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const errorInfo = extractErrorInfo(error);
  const requestId = request.id;

  // Log error with appropriate level
  if (errorInfo.statusCode >= 500) {
    errorLogger.error('Server error occurred', {
      type: errorInfo.type,
      message: errorInfo.message,
      statusCode: errorInfo.statusCode,
      requestId,
      method: request.method,
      url: request.url,
      ip: request.ip,
      stack: error.stack,
      details: errorInfo.details,
    });
  } else {
    errorLogger.warn('Client error occurred', {
      type: errorInfo.type,
      message: errorInfo.message,
      statusCode: errorInfo.statusCode,
      requestId,
      method: request.method,
      url: request.url,
    });
  }

  // Log to database for monitoring (async, non-blocking)
  void logErrorToDatabase(error, request, {
    errorType: errorInfo.type,
    statusCode: errorInfo.statusCode,
    requestId,
  });

  // Send error response
  const response = formatErrorResponse(errorInfo, requestId);
  await reply.status(errorInfo.statusCode).send(response);

  // For non-operational errors, we might want to restart the process
  // This is handled at the application level, not here
  if (!errorInfo.isOperational) {
    errorLogger.fatal('Non-operational error detected', {
      error: error.message,
      stack: error.stack,
    });
  }
}

/**
 * Async error wrapper for route handlers
 */
export function asyncHandler<T>(
  handler: (request: FastifyRequest, reply: FastifyReply) => Promise<T>
) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<T | void> => {
    try {
      return await handler(request, reply);
    } catch (error) {
      await errorHandler(
        error instanceof Error ? error : new Error(String(error)),
        request,
        reply
      );
    }
  };
}

/**
 * Create specific error factories
 */
export const ErrorFactory = {
  validation: (message: string, details?: any) =>
    new AppError(ErrorType.VALIDATION, message, 400, details),

  notFound: (resource: string, id?: string) =>
    new AppError(
      ErrorType.NOT_FOUND,
      `${resource}${id ? ` with id ${id}` : ''} not found`,
      404
    ),

  conflict: (message: string, details?: any) =>
    new AppError(ErrorType.CONFLICT, message, 409, details),

  unauthorized: (message = 'Unauthorized access') =>
    new AppError(ErrorType.AUTHENTICATION, message, 401),

  forbidden: (message = 'Insufficient permissions') =>
    new AppError(ErrorType.AUTHORIZATION, message, 403),

  rateLimit: (message = 'Too many requests') =>
    new AppError(ErrorType.RATE_LIMIT, message, 429),

  database: (message: string, details?: any) =>
    new AppError(ErrorType.DATABASE, message, 500, details),

  temporal: (message: string, details?: any) =>
    new AppError(ErrorType.TEMPORAL, message, 500, details),

  externalService: (service: string, details?: any) =>
    new AppError(
      ErrorType.EXTERNAL_SERVICE,
      `External service ${service} failed`,
      502,
      details
    ),

  internal: (message: string, details?: any) =>
    new AppError(ErrorType.INTERNAL, message, 500, details, false),
};
