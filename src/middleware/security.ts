/**
 * Security Middleware
 *
 * Input sanitization, CORS, helmet security headers, and API key authentication
 */

import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { UnauthorizedError } from './errorHandler.js';
import logger from '../utils/logger.js';

/**
 * Configure helmet security headers
 */
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  frameguard: {
    action: 'deny',
  },
  noSniff: true,
  xssFilter: true,
});

/**
 * Configure CORS
 */
export const corsMiddleware = cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);

    // Whitelist of allowed origins
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:5174',
      'https://martha.arch.ie',
      'https://arch.ie',
    ];

    // Allow development origins
    if (
      process.env.NODE_ENV === 'development' ||
      allowedOrigins.includes(origin) ||
      origin.endsWith('.arch.ie')
    ) {
      callback(null, true);
    } else {
      logger.warn('CORS: Origin not allowed', { origin });
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  maxAge: 86400, // 24 hours
});

/**
 * Input sanitization - remove potentially dangerous characters
 */
export function sanitizeInput(req: Request, res: Response, next: NextFunction): void {
  // Sanitize body
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }

  // Sanitize query
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query);
  }

  next();
}

/**
 * Recursively sanitize object
 */
function sanitizeObject(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  if (obj !== null && typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(value);
    }
    return sanitized;
  }

  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }

  return obj;
}

/**
 * Sanitize string - remove/escape dangerous characters
 */
function sanitizeString(str: string): string {
  return str
    .replace(/<script[^>]*>.*?<\/script>/gi, '') // Remove script tags
    .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '') // Remove iframe tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .trim();
}

/**
 * API Key authentication middleware
 */
export function apiKeyAuth(req: Request, res: Response, next: NextFunction): void {
  const apiKey = req.header('X-API-Key') || req.query.apiKey;

  if (!apiKey) {
    return next(new UnauthorizedError('API key required'));
  }

  // Validate API key
  const validApiKeys = process.env.API_KEYS?.split(',') || [];

  if (!validApiKeys.includes(apiKey as string)) {
    logger.warn('Invalid API key attempt', {
      ip: req.ip,
      path: req.path,
    });
    return next(new UnauthorizedError('Invalid API key'));
  }

  // Attach API key info to request
  (req as any).apiKey = apiKey;

  next();
}

/**
 * Optional API key authentication - continues even if no key
 */
export function optionalApiKeyAuth(req: Request, res: Response, next: NextFunction): void {
  const apiKey = req.header('X-API-Key') || req.query.apiKey;

  if (apiKey) {
    const validApiKeys = process.env.API_KEYS?.split(',') || [];
    if (validApiKeys.includes(apiKey as string)) {
      (req as any).apiKey = apiKey;
      (req as any).authenticated = true;
    }
  }

  next();
}

/**
 * Validate Content-Type for POST/PUT/PATCH
 */
export function validateContentType(req: Request, res: Response, next: NextFunction): void {
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    const contentType = req.header('Content-Type');

    if (!contentType || !contentType.includes('application/json')) {
      return res.status(415).json({
        error: {
          message: 'Content-Type must be application/json',
          code: 415,
        },
      });
    }
  }

  next();
}

/**
 * Request logging middleware
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;

    logger.info('HTTP Request', {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration,
      ip: req.ip,
      userAgent: req.header('User-Agent'),
      apiKey: (req as any).apiKey ? 'present' : 'none',
    });
  });

  next();
}

/**
 * SQL injection prevention - validate identifiers
 */
export function isSafeIdentifier(identifier: string): boolean {
  // Only allow alphanumeric, underscore, hyphen, and dot
  return /^[a-zA-Z0-9_.-]+$/.test(identifier);
}

/**
 * Validate SQL identifier middleware
 */
export function validateSqlIdentifier(paramName: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const value = req.params[paramName] || req.query[paramName] || req.body[paramName];

    if (value && !isSafeIdentifier(value as string)) {
      return res.status(400).json({
        error: {
          message: `Invalid ${paramName}: must contain only alphanumeric characters, underscore, hyphen, or dot`,
          code: 400,
        },
      });
    }

    next();
  };
}

/**
 * Prevent parameter pollution
 */
export function preventParameterPollution(req: Request, res: Response, next: NextFunction): void {
  // If query parameter is an array when it shouldn't be, use first value
  if (req.query) {
    for (const [key, value] of Object.entries(req.query)) {
      if (Array.isArray(value) && value.length > 0) {
        // Keep as array for known array parameters
        const arrayParams = ['tags', 'labels', 'epicIds', 'issueIds'];
        if (!arrayParams.includes(key)) {
          (req.query as any)[key] = value[0];
        }
      }
    }
  }

  next();
}

/**
 * Timeout middleware - prevent long-running requests
 */
export function requestTimeout(timeoutMs: number = 30000) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        logger.warn('Request timeout', {
          method: req.method,
          path: req.path,
          timeout: timeoutMs,
        });

        res.status(408).json({
          error: {
            message: 'Request timeout',
            code: 408,
          },
        });
      }
    }, timeoutMs);

    res.on('finish', () => {
      clearTimeout(timeout);
    });

    next();
  };
}
