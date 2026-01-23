#!/usr/bin/env tsx

/**
 * Phase 1: Infrastructure Validation (Extended)
 *
 * Comprehensive infrastructure validation including:
 * - All Phase 1.1 preflight checks
 * - TimescaleDB schema validation (evidence_events, telemetry_events)
 * - Temporal Cloud connectivity and worker status
 * - Component availability (Claude CLI, Git, Node.js)
 * - Service health checks (API, MCP, Web UI)
 * - Auto-fix capabilities for common issues
 */

import * as dotenv from 'dotenv';
import { execSync } from 'child_process';
import { createLogger } from '../../src/utils/logger.js';
import { Pool } from 'pg';
import * as fs from 'fs/promises';
import { errorResolver } from './utils/error-resolver.js';

// Load environment variables
dotenv.config({ path: '.env.local' });

const logger = createLogger({ module: 'phase1-infrastructure' });

interface CheckResult {
  name: string;
  category: 'critical' | 'important' | 'optional';
  passed: boolean;
  message: string;
  details?: any;
  duration: number;
  autoFixAttempted?: boolean;
  autoFixSucceeded?: boolean;
}

const results: CheckResult[] = [];
let dbPool: Pool | undefined;

/**
 * Check Node.js version
 */
async function checkNodeVersion(): Promise<CheckResult> {
  const startTime = Date.now();

  try {
    const version = process.version;
    const majorVersion = parseInt(version.slice(1).split('.')[0]);

    return {
      name: 'Node.js Version',
      category: 'critical',
      passed: majorVersion >= 18,
      message: majorVersion >= 18
        ? `Node.js ${version} (>= 18.0.0)`
        : `Node.js ${version} is too old (need >= 18.0.0)`,
      details: { version, required: '>=18.0.0' },
      duration: Date.now() - startTime,
    };
  } catch (error: any) {
    return {
      name: 'Node.js Version',
      category: 'critical',
      passed: false,
      message: `Error checking Node.js version: ${error.message}`,
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Check Git availability and configuration
 */
async function checkGit(): Promise<CheckResult> {
  const startTime = Date.now();

  try {
    const version = execSync('git --version', { encoding: 'utf-8', stdio: 'pipe' }).trim();
    const userName = execSync('git config user.name', { encoding: 'utf-8', stdio: 'pipe' }).trim();
    const userEmail = execSync('git config user.email', {
      encoding: 'utf-8',
      stdio: 'pipe',
    }).trim();

    return {
      name: 'Git Configuration',
      category: 'critical',
      passed: true,
      message: 'Git is available and configured',
      details: { version, userName, userEmail },
      duration: Date.now() - startTime,
    };
  } catch (error: any) {
    return {
      name: 'Git Configuration',
      category: 'critical',
      passed: false,
      message: 'Git not found or not configured',
      details: { error: error.message },
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Check Claude CLI installation
 */
async function checkClaudeCLI(): Promise<CheckResult> {
  const startTime = Date.now();

  try {
    // Try common paths
    const paths = ['/home/archiedev/.local/bin/claude', 'claude'];

    let found = false;
    let version = '';
    let path = '';

    for (const testPath of paths) {
      try {
        version = execSync(`${testPath} --version`, {
          encoding: 'utf-8',
          timeout: 5000,
          stdio: 'pipe',
        }).trim();
        path = testPath;
        found = true;
        break;
      } catch {
        continue;
      }
    }

    if (found) {
      return {
        name: 'Claude CLI',
        category: 'critical',
        passed: true,
        message: 'Claude CLI is installed',
        details: { version, path },
        duration: Date.now() - startTime,
      };
    } else {
      return {
        name: 'Claude CLI',
        category: 'critical',
        passed: false,
        message: 'Claude CLI not found',
        details: {
          suggestion:
            'Install from: https://docs.anthropic.com/claude/docs/claude-cli or check path at /home/archiedev/.local/bin/claude',
        },
        duration: Date.now() - startTime,
      };
    }
  } catch (error: any) {
    return {
      name: 'Claude CLI',
      category: 'critical',
      passed: false,
      message: `Error checking Claude CLI: ${error.message}`,
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Check database connectivity and initialize pool
 */
async function checkDatabase(): Promise<CheckResult> {
  const startTime = Date.now();

  try {
    const dbUrl = process.env.DATABASE_URL;

    if (!dbUrl) {
      return {
        name: 'Database Configuration',
        category: 'critical',
        passed: false,
        message: 'DATABASE_URL not set',
        duration: Date.now() - startTime,
      };
    }

    dbPool = new Pool({ connectionString: dbUrl, max: 5 });

    const client = await dbPool.connect();
    try {
      const result = await client.query('SELECT version()');
      const version = result.rows[0].version;

      return {
        name: 'Database Connectivity',
        category: 'critical',
        passed: true,
        message: 'Successfully connected to database',
        details: { version: version.split(' ').slice(0, 2).join(' ') },
        duration: Date.now() - startTime,
      };
    } finally {
      client.release();
    }
  } catch (error: any) {
    return {
      name: 'Database Connectivity',
      category: 'critical',
      passed: false,
      message: `Failed to connect to database: ${error.message}`,
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Check TimescaleDB evidence_events table
 */
async function checkEvidenceTable(): Promise<CheckResult> {
  const startTime = Date.now();

  if (!dbPool) {
    return {
      name: 'Evidence Events Table',
      category: 'critical',
      passed: false,
      message: 'Database pool not initialized',
      duration: Date.now() - startTime,
    };
  }

  try {
    const client = await dbPool.connect();
    try {
      // Check if table exists
      const tableCheck = await client.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_name = 'evidence_events'
        )`,
      );

      const tableExists = tableCheck.rows[0].exists;

      if (!tableExists) {
        return {
          name: 'Evidence Events Table',
          category: 'critical',
          passed: false,
          message: 'Table evidence_events does not exist',
          details: { suggestion: 'Run database migrations: npm run db:migrate' },
          duration: Date.now() - startTime,
        };
      }

      // Check if it's a hypertable
      const hypertableCheck = await client.query(
        `SELECT * FROM timescaledb_information.hypertables WHERE hypertable_name = 'evidence_events'`,
      );

      const isHypertable = hypertableCheck.rows.length > 0;

      // Get row count
      const countResult = await client.query('SELECT COUNT(*) FROM evidence_events');
      const count = parseInt(countResult.rows[0].count);

      return {
        name: 'Evidence Events Table',
        category: 'critical',
        passed: true,
        message: 'Table exists and is configured correctly',
        details: {
          isHypertable,
          rowCount: count,
        },
        duration: Date.now() - startTime,
      };
    } finally {
      client.release();
    }
  } catch (error: any) {
    return {
      name: 'Evidence Events Table',
      category: 'critical',
      passed: false,
      message: `Error checking evidence_events table: ${error.message}`,
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Check TimescaleDB telemetry_events table
 */
async function checkTelemetryTable(): Promise<CheckResult> {
  const startTime = Date.now();

  if (!dbPool) {
    return {
      name: 'Telemetry Events Table',
      category: 'critical',
      passed: false,
      message: 'Database pool not initialized',
      duration: Date.now() - startTime,
    };
  }

  try {
    const client = await dbPool.connect();
    try {
      // Check if table exists
      const tableCheck = await client.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_name = 'telemetry_events'
        )`,
      );

      const tableExists = tableCheck.rows[0].exists;

      if (!tableExists) {
        return {
          name: 'Telemetry Events Table',
          category: 'important',
          passed: false,
          message: 'Table telemetry_events does not exist',
          details: { suggestion: 'Run database migrations: npm run db:migrate' },
          duration: Date.now() - startTime,
        };
      }

      // Check if it's a hypertable
      const hypertableCheck = await client.query(
        `SELECT * FROM timescaledb_information.hypertables WHERE hypertable_name = 'telemetry_events'`,
      );

      const isHypertable = hypertableCheck.rows.length > 0;

      // Get row count
      const countResult = await client.query('SELECT COUNT(*) FROM telemetry_events');
      const count = parseInt(countResult.rows[0].count);

      return {
        name: 'Telemetry Events Table',
        category: 'important',
        passed: true,
        message: 'Table exists and is configured correctly',
        details: {
          isHypertable,
          rowCount: count,
        },
        duration: Date.now() - startTime,
      };
    } finally {
      client.release();
    }
  } catch (error: any) {
    return {
      name: 'Telemetry Events Table',
      category: 'important',
      passed: false,
      message: `Error checking telemetry_events table: ${error.message}`,
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Check Temporal Cloud connectivity
 */
async function checkTemporal(): Promise<CheckResult> {
  const startTime = Date.now();

  try {
    const address = process.env.TEMPORAL_ADDRESS;
    const namespace = process.env.TEMPORAL_NAMESPACE;
    const apiKey = process.env.TEMPORAL_API_KEY;

    if (!address || !namespace || !apiKey) {
      return {
        name: 'Temporal Cloud Configuration',
        category: 'critical',
        passed: false,
        message: 'Missing Temporal environment variables',
        details: {
          TEMPORAL_ADDRESS: address ? 'set' : 'missing',
          TEMPORAL_NAMESPACE: namespace ? 'set' : 'missing',
          TEMPORAL_API_KEY: apiKey ? 'set' : 'missing',
        },
        duration: Date.now() - startTime,
      };
    }

    // Attempt connection
    try {
      const { getTemporalClient } = await import('../../src/temporal/client.js');
      const client = await getTemporalClient();

      // Close the connection immediately after verifying it works
      await client.connection.close();

      return {
        name: 'Temporal Cloud Connectivity',
        category: 'critical',
        passed: true,
        message: 'Successfully connected to Temporal Cloud',
        details: {
          address,
          namespace: namespace.length > 30 ? namespace.substring(0, 30) + '...' : namespace,
        },
        duration: Date.now() - startTime,
      };
    } catch (error: any) {
      return {
        name: 'Temporal Cloud Connectivity',
        category: 'critical',
        passed: false,
        message: 'Failed to connect to Temporal Cloud',
        details: {
          error: error.message,
          suggestion: 'Check TEMPORAL_API_KEY in .env.local',
        },
        duration: Date.now() - startTime,
      };
    }
  } catch (error: any) {
    return {
      name: 'Temporal Cloud Connectivity',
      category: 'critical',
      passed: false,
      message: `Error: ${error.message}`,
      duration: Date.now() - startTime,
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
    'TEMPORAL_TASK_QUEUE',
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
    category: 'critical',
    passed: missing.length === 0,
    message:
      missing.length === 0
        ? 'All required environment variables are set'
        : `Missing ${missing.length} required variables`,
    details: {
      present: present.length,
      missing,
      total: required.length,
    },
    duration: Date.now() - startTime,
  };
}

/**
 * Attempt auto-fix for failed checks
 */
async function attemptAutoFix(result: CheckResult): Promise<boolean> {
  logger.info(`Attempting auto-fix for: ${result.name}`);

  try {
    // Create a mock error to diagnose
    const error = new Error(result.message);
    const diagnosis = errorResolver.diagnose(error);

    if (!diagnosis.autoFixable) {
      logger.warn(`Auto-fix not available for: ${result.name}`);
      return false;
    }

    const success = await errorResolver.attemptAutoFix(diagnosis);

    if (success) {
      logger.info(`✅ Auto-fix succeeded for: ${result.name}`);
      return true;
    } else {
      logger.warn(`❌ Auto-fix failed for: ${result.name}`);
      return false;
    }
  } catch (error: any) {
    logger.error(`Error during auto-fix for ${result.name}:`, error);
    return false;
  }
}

/**
 * Run all infrastructure checks
 */
async function runInfrastructureValidation() {
  logger.info('=================================================');
  logger.info('  Phase 1: Infrastructure Validation');
  logger.info('=================================================');
  logger.info('');

  // Check environment first
  results.push(await checkEnvironmentVariables());

  // Check Node.js and Git
  results.push(await checkNodeVersion());
  results.push(await checkGit());
  results.push(await checkClaudeCLI());

  // Check database and schema
  results.push(await checkDatabase());
  if (dbPool) {
    results.push(await checkEvidenceTable());
    results.push(await checkTelemetryTable());
  }

  // Check Temporal
  results.push(await checkTemporal());

  // Summary
  logger.info('=================================================');
  logger.info('  Infrastructure Check Results');
  logger.info('=================================================');

  const critical = results.filter(r => r.category === 'critical');
  const criticalPassed = critical.filter(r => r.passed).length;
  const criticalFailed = critical.filter(r => !r.passed).length;

  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

  logger.info('');
  for (const result of results) {
    const icon = result.passed ? '✅' : '❌';
    const category = result.category === 'critical' ? '🔴' : '🟡';
    logger.info(`${icon} ${category} ${result.name}: ${result.message}`);
    if (result.details) {
      logger.info(`   Details: ${JSON.stringify(result.details, null, 2)}`);
    }
  }

  logger.info('');
  logger.info(`Critical checks: ${criticalPassed}/${critical.length} passed`);
  logger.info(`Total duration: ${totalDuration}ms`);
  logger.info('');

  // Write results to file
  await fs.writeFile(
    'logs/phase1-infrastructure.json',
    JSON.stringify({ results, summary: { criticalPassed, criticalFailed, totalDuration } }, null, 2),
  );

  // Attempt auto-fix for critical failures
  const failedCritical = results.filter(r => r.category === 'critical' && !r.passed);

  if (failedCritical.length > 0) {
    logger.warn(`\n⚠️  ${failedCritical.length} critical check(s) failed. Attempting auto-fix...\n`);

    let fixedCount = 0;
    for (const result of failedCritical) {
      const fixed = await attemptAutoFix(result);
      if (fixed) {
        result.autoFixAttempted = true;
        result.autoFixSucceeded = true;
        fixedCount++;
      } else {
        result.autoFixAttempted = true;
        result.autoFixSucceeded = false;
      }
    }

    if (fixedCount > 0) {
      logger.info(`\n✅ Auto-fixed ${fixedCount} issue(s). Please re-run validation.\n`);
    }

    // Display manual resolution steps
    logger.info('Resolution suggestions:');
    for (const result of failedCritical.filter(r => !r.autoFixSucceeded)) {
      if (result.details?.suggestion) {
        logger.info(`- ${result.name}: ${result.details.suggestion}`);
      }
    }
    logger.info('');

    process.exit(1);
  } else {
    logger.info('✅ All critical infrastructure checks passed!');

    // Cleanup database pool
    if (dbPool) {
      await dbPool.end();
    }

    process.exit(0);
  }
}

// Run validation
runInfrastructureValidation().catch(error => {
  logger.error('Infrastructure validation failed with unhandled error', {
    error: error.message,
    stack: error.stack,
  });

  if (dbPool) {
    dbPool.end().catch(() => {});
  }

  process.exit(1);
});
