/**
 * Production Error Handler Middleware
 *
 * Comprehensive error handling with logging, metrics, and user-friendly responses
 */

import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger.js';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational: boolean = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public fields?: Record<string, string>) {
    super(400, message, true);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(404, `${resource} not found`, true);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(401, message, true);
  }
}

export class RateLimitError extends AppError {
  constructor(retryAfter: number) {
    super(429, 'Too many requests', true);
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, public originalError?: Error) {
    super(500, `Database error: ${message}`, false);
  }
}

export class TemporalError extends AppError {
  constructor(message: string, public originalError?: Error) {
    super(500, `Workflow error: ${message}`, false);
  }
}

/**
 * Error handling middleware
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Log error
  const errorLog = {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userId: (req as any).user?.id,
  };

  if (err instanceof AppError) {
    if (!err.isOperational) {
      logger.error('Non-operational error', errorLog);
    } else {
      logger.warn('Operational error', errorLog);
    }
  } else {
    logger.error('Unexpected error', errorLog);
  }

  // Prepare response
  if (err instanceof AppError) {
    const response: any = {
      error: {
        message: err.message,
        code: err.statusCode,
      },
    };

    if (err instanceof ValidationError && err.fields) {
      response.error.fields = err.fields;
    }

    res.status(err.statusCode).json(response);
  } else {
    // Unknown error - don't expose internals
    res.status(500).json({
      error: {
        message: 'Internal server error',
        code: 500,
      },
    });
  }
}

/**
 * Async handler wrapper - catches async errors
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Not found handler - 404 for unknown routes
 */
export function notFoundHandler(req: Request, res: Response, next: NextFunction): void {
  next(new NotFoundError(`Route ${req.method} ${req.path}`));
}

/**
 * Validation middleware
 */
export function validateRequest(schema: {
  body?: any;
  query?: any;
  params?: any;
}) {
  return (req: Request, res: Response, next: NextFunction) => {
    const errors: Record<string, string> = {};

    // Validate body
    if (schema.body) {
      const bodyErrors = validateObject(req.body, schema.body);
      Object.assign(errors, bodyErrors);
    }

    // Validate query
    if (schema.query) {
      const queryErrors = validateObject(req.query, schema.query);
      Object.assign(errors, queryErrors);
    }

    // Validate params
    if (schema.params) {
      const paramsErrors = validateObject(req.params, schema.params);
      Object.assign(errors, paramsErrors);
    }

    if (Object.keys(errors).length > 0) {
      next(new ValidationError('Validation failed', errors));
    } else {
      next();
    }
  };
}

/**
 * Simple object validation
 */
function validateObject(obj: any, schema: any): Record<string, string> {
  const errors: Record<string, string> = {};

  for (const [key, rules] of Object.entries(schema)) {
    const value = obj[key];
    const ruleSet = rules as any;

    // Required check
    if (ruleSet.required && (value === undefined || value === null || value === '')) {
      errors[key] = `${key} is required`;
      continue;
    }

    // Skip further validation if not required and not present
    if (!ruleSet.required && (value === undefined || value === null)) {
      continue;
    }

    // Type check
    if (ruleSet.type) {
      const actualType = Array.isArray(value) ? 'array' : typeof value;
      if (actualType !== ruleSet.type) {
        errors[key] = `${key} must be a ${ruleSet.type}`;
        continue;
      }
    }

    // String validations
    if (ruleSet.type === 'string') {
      if (ruleSet.minLength && value.length < ruleSet.minLength) {
        errors[key] = `${key} must be at least ${ruleSet.minLength} characters`;
      }
      if (ruleSet.maxLength && value.length > ruleSet.maxLength) {
        errors[key] = `${key} must be at most ${ruleSet.maxLength} characters`;
      }
      if (ruleSet.pattern && !ruleSet.pattern.test(value)) {
        errors[key] = `${key} has invalid format`;
      }
    }

    // Number validations
    if (ruleSet.type === 'number') {
      if (ruleSet.min !== undefined && value < ruleSet.min) {
        errors[key] = `${key} must be at least ${ruleSet.min}`;
      }
      if (ruleSet.max !== undefined && value > ruleSet.max) {
        errors[key] = `${key} must be at most ${ruleSet.max}`;
      }
    }

    // Array validations
    if (ruleSet.type === 'array') {
      if (ruleSet.minLength && value.length < ruleSet.minLength) {
        errors[key] = `${key} must have at least ${ruleSet.minLength} items`;
      }
      if (ruleSet.maxLength && value.length > ruleSet.maxLength) {
        errors[key] = `${key} must have at most ${ruleSet.maxLength} items`;
      }
    }

    // Enum validation
    if (ruleSet.enum && !ruleSet.enum.includes(value)) {
      errors[key] = `${key} must be one of: ${ruleSet.enum.join(', ')}`;
    }
  }

  return errors;
}
