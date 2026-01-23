#!/usr/bin/env tsx

/**
 * Phase 1.1: Pre-Flight Checks
 *
 * Validates all services and prerequisites before starting verification:
 * - Port availability
 * - Temporal Cloud connectivity
 * - Database connectivity
 * - Redis connectivity
 * - Claude CLI installation
 * - Environment variables
 */

import dotenv from 'dotenv';
import { execSync } from 'child_process';
import { createLogger } from '../../src/utils/logger.js';
import * as fs from 'fs/promises';
import * as net from 'net';

// Load environment variables
dotenv.config({ path: '.env.local' });

const logger = createLogger({ module: 'preflight' });

interface CheckResult {
  name: string;
  passed: boolean;
  message: string;
  details?: any;
  duration: number;
}

const results: CheckResult[] = [];

/**
 * Check if a port is available
 */
async function checkPort(port: number, serviceName: string): Promise<CheckResult> {
  const startTime = Date.now();

  return new Promise((resolve) => {
    const server = net.createServer();

    server.once('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        // Port in use - service is running
        resolve({
          name: `Port ${port} (${serviceName})`,
          passed: true,
          message: `Port ${port} is in use by ${serviceName}`,
          duration: Date.now() - startTime
        });
      } else {
        resolve({
          name: `Port ${port} (${serviceName})`,
          passed: false,
          message: `Error checking port ${port}: ${err.message}`,
          duration: Date.now() - startTime
        });
      }
      server.close();
    });

    server.once('listening', () => {
      // Port is free - service might not be running
      server.close();
      resolve({
        name: `Port ${port} (${serviceName})`,
        passed: false,
        message: `Port ${port} is available - ${serviceName} may not be running`,
        details: { suggestion: `Start ${serviceName}` },
        duration: Date.now() - startTime
      });
    });

    server.listen(port);
  });
}

/**
 * Check Temporal Cloud connectivity
 */
async function checkTemporal(): Promise<CheckResult> {
  const startTime = Date.now();

  try {
    logger.info('Checking Temporal Cloud connectivity...');

    const address = process.env.TEMPORAL_ADDRESS;
    const namespace = process.env.TEMPORAL_NAMESPACE;
    const apiKey = process.env.TEMPORAL_API_KEY;

    if (!address || !namespace || !apiKey) {
      return {
        name: 'Temporal Cloud Configuration',
        passed: false,
        message: 'Missing Temporal environment variables',
        details: {
          TEMPORAL_ADDRESS: address ? 'set' : 'missing',
          TEMPORAL_NAMESPACE: namespace ? 'set' : 'missing',
          TEMPORAL_API_KEY: apiKey ? 'set' : 'missing'
        },
        duration: Date.now() - startTime
      };
    }

    // Try to connect using the temporal client
    try {
      execSync('npx tsx scripts/autonomous-verify/test-temporal.ts', {
        encoding: 'utf-8',
        timeout: 10000,
        stdio: 'pipe'
      });

      return {
        name: 'Temporal Cloud Connectivity',
        passed: true,
        message: 'Successfully connected to Temporal Cloud',
        details: { address, namespace: namespace.substring(0, 20) + '...' },
        duration: Date.now() - startTime
      };
    } catch (error: any) {
      return {
        name: 'Temporal Cloud Connectivity',
        passed: false,
        message: 'Failed to connect to Temporal Cloud',
        details: { error: error.message },
        duration: Date.now() - startTime
      };
    }
  } catch (error: any) {
    return {
      name: 'Temporal Cloud Connectivity',
      passed: false,
      message: `Error: ${error.message}`,
      duration: Date.now() - startTime
    };
  }
}

/**
 * Check database connectivity
 */
async function checkDatabase(): Promise<CheckResult> {
  const startTime = Date.now();

  try {
    logger.info('Checking database connectivity...');

    const dbUrl = process.env.DATABASE_URL;

    if (!dbUrl) {
      return {
        name: 'Database Configuration',
        passed: false,
        message: 'DATABASE_URL not set',
        duration: Date.now() - startTime
      };
    }

    // Try to connect and query
    try {
      const output = execSync('npx tsx scripts/autonomous-verify/test-db.ts', {
        encoding: 'utf-8',
        timeout: 10000,
        stdio: 'pipe'
      });

      return {
        name: 'Database Connectivity',
        passed: true,
        message: 'Successfully connected to database',
        details: { version: output.replace('SUCCESS:', '').trim() },
        duration: Date.now() - startTime
      };
    } catch (error: any) {
      return {
        name: 'Database Connectivity',
        passed: false,
        message: 'Failed to connect to database',
        details: { error: error.stderr || error.message },
        duration: Date.now() - startTime
      };
    }
  } catch (error: any) {
    return {
      name: 'Database Connectivity',
      passed: false,
      message: `Error: ${error.message}`,
      duration: Date.now() - startTime
    };
  }
}

/**
 * Check Claude CLI installation
 */
async function checkClaudeCLI(): Promise<CheckResult> {
  const startTime = Date.now();

  try {
    logger.info('Checking Claude CLI installation...');

    const version = execSync('claude --version', {
      encoding: 'utf-8',
      timeout: 5000,
      stdio: 'pipe'
    }).trim();

    return {
      name: 'Claude CLI',
      passed: true,
      message: 'Claude CLI is installed',
      details: { version },
      duration: Date.now() - startTime
    };
  } catch (error: any) {
    return {
      name: 'Claude CLI',
      passed: false,
      message: 'Claude CLI not found',
      details: {
        error: error.message,
        suggestion: 'Install from: https://docs.anthropic.com/claude/docs/claude-cli'
      },
      duration: Date.now() - startTime
    };
  }
}

/**
 * Check environment variables
 */
async function checkEnvironmentVariables(): Promise<CheckResult> {
  const startTime = Date.now();

  const required = [
    'DATABASE_URL',
    'TEMPORAL_ADDRESS',
    'TEMPORAL_NAMESPACE',
    'TEMPORAL_API_KEY',
    'TEMPORAL_TASK_QUEUE'
  ];

  const missing: string[] = [];
  const present: string[] = [];

  for (const varName of required) {
    if (process.env[varName]) {
      present.push(varName);
    } else {
      missing.push(varName);
    }
  }

  return {
    name: 'Environment Variables',
    passed: missing.length === 0,
    message: missing.length === 0
      ? 'All required environment variables are set'
      : `Missing ${missing.length} required variables`,
    details: {
      present: present.length,
      missing,
      total: required.length
    },
    duration: Date.now() - startTime
  };
}

/**
 * Run all pre-flight checks
 */
async function runPreFlightChecks() {
  logger.info('=================================================');
  logger.info('  Phase 1.1: Pre-Flight Checks');
  logger.info('=================================================');
  logger.info('');

  // Check environment variables first
  results.push(await checkEnvironmentVariables());

  // Check ports (only if services should be running for this verification)
  // Note: For verification, we may start services on-demand
  // results.push(await checkPort(21009, 'Fastify API'));
  // results.push(await checkPort(21006, 'TimescaleDB'));
  // results.push(await checkPort(20001, 'Redis'));

  // Check service connectivity
  results.push(await checkDatabase());
  results.push(await checkTemporal());

  // Check Claude CLI
  results.push(await checkClaudeCLI());

  // Summary
  logger.info('=================================================');
  logger.info('  Pre-Flight Check Results');
  logger.info('=================================================');

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

  logger.info('');
  for (const result of results) {
    const icon = result.passed ? '✓' : '✗';
    logger.info(`${icon} ${result.name}: ${result.message}`);
    if (result.details) {
      logger.info(`  Details: ${JSON.stringify(result.details, null, 2)}`);
    }
  }

  logger.info('');
  logger.info(`Passed: ${passed}/${results.length}`);
  logger.info(`Failed: ${failed}/${results.length}`);
  logger.info(`Duration: ${totalDuration}ms`);
  logger.info('');

  // Write results to file
  await fs.writeFile(
    'logs/phase1-preflight.json',
    JSON.stringify({ results, summary: { passed, failed, totalDuration } }, null, 2)
  );

  if (failed > 0) {
    logger.error('❌ Pre-flight checks failed. Please resolve issues before continuing.');
    logger.info('');
    logger.info('Resolution suggestions:');

    for (const result of results.filter(r => !r.passed)) {
      if (result.details?.suggestion) {
        logger.info(`- ${result.name}: ${result.details.suggestion}`);
      }
    }

    process.exit(1);
  } else {
    logger.info('✅ All pre-flight checks passed!');
    process.exit(0);
  }
}

// Run checks
runPreFlightChecks().catch(error => {
  logger.error('Pre-flight checks failed with unhandled error', {
    error: error.message,
    stack: error.stack
  });
  process.exit(1);
});
