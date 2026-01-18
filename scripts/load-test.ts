/**
 * Load Testing Script
 * TASK-7.4.5: Test system under concurrent load (50 workflows)
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { Connection, Client } from '@temporalio/client';
import { createLogger } from '../src/utils/logger.js';
import { loadTemporalConfig } from '../src/temporal/config.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import pidusage from 'pidusage';

const logger = createLogger({ module: 'load-test' });

interface LoadTestMetrics {
  totalWorkflows: number;
  successfulWorkflows: number;
  failedWorkflows: number;
  totalDuration: number;
  averageDuration: number;
  p50Duration: number;
  p95Duration: number;
  p99Duration: number;
  maxDuration: number;
  minDuration: number;
  throughput: number; // workflows per second
  memoryUsage: MemoryMetrics[];
  errors: string[];
}

interface MemoryMetrics {
  timestamp: number;
  rss: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
}

interface WorkflowResult {
  workflowId: string;
  success: boolean;
  duration: number;
  error?: string;
  startTime: number;
  endTime: number;
}

/**
 * Monitor memory usage during load test
 */
class MemoryMonitor {
  private interval: NodeJS.Timeout | null = null;
  private metrics: MemoryMetrics[] = [];

  start(intervalMs: number = 1000): void {
    this.interval = setInterval(async () => {
      try {
        const stats = await pidusage(process.pid);
        this.metrics.push({
          timestamp: Date.now(),
          rss: stats.memory,
          heapUsed: process.memoryUsage().heapUsed,
          heapTotal: process.memoryUsage().heapTotal,
          external: process.memoryUsage().external,
        });
      } catch (error) {
        logger.error('Failed to collect memory metrics', { error });
      }
    }, intervalMs);
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  getMetrics(): MemoryMetrics[] {
    return this.metrics;
  }

  detectMemoryLeaks(): boolean {
    if (this.metrics.length < 10) return false;

    // Compare first 5 samples with last 5 samples
    const firstSamples = this.metrics.slice(0, 5);
    const lastSamples = this.metrics.slice(-5);

    const avgFirst = firstSamples.reduce((sum, m) => sum + m.heapUsed, 0) / firstSamples.length;
    const avgLast = lastSamples.reduce((sum, m) => sum + m.heapUsed, 0) / lastSamples.length;

    // If heap grows by more than 50%, possible memory leak
    const growthPercent = ((avgLast - avgFirst) / avgFirst) * 100;
    logger.info('Memory growth analysis', {
      avgFirst: (avgFirst / 1024 / 1024).toFixed(2) + ' MB',
      avgLast: (avgLast / 1024 / 1024).toFixed(2) + ' MB',
      growthPercent: growthPercent.toFixed(2) + '%',
    });

    return growthPercent > 50;
  }
}

/**
 * Run a single workflow
 */
async function runWorkflow(
  client: Client,
  workflowId: string,
  issueId: string
): Promise<WorkflowResult> {
  const startTime = Date.now();

  try {
    const handle = await client.workflow.start('IssueLifecycleWorkflow', {
      taskQueue: 'martha-task-queue',
      workflowId,
      args: [{
        id: issueId,
        title: `Load Test Issue ${issueId}`,
        complexity: 3,
      }],
    });

    // Wait for workflow to complete (with timeout)
    await Promise.race([
      handle.result(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Workflow timeout')), 300000) // 5 minutes
      ),
    ]);

    const endTime = Date.now();
    const duration = endTime - startTime;

    logger.info('Workflow completed', { workflowId, duration });

    return {
      workflowId,
      success: true,
      duration,
      startTime,
      endTime,
    };
  } catch (error) {
    const endTime = Date.now();
    const duration = endTime - startTime;

    logger.error('Workflow failed', {
      workflowId,
      duration,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return {
      workflowId,
      success: false,
      duration,
      error: error instanceof Error ? error.message : 'Unknown error',
      startTime,
      endTime,
    };
  }
}

/**
 * Run concurrent workflows in batches
 */
async function runConcurrentWorkflows(
  client: Client,
  concurrency: number,
  totalWorkflows: number
): Promise<WorkflowResult[]> {
  const results: WorkflowResult[] = [];
  const batches = Math.ceil(totalWorkflows / concurrency);

  logger.info('Starting load test', { concurrency, totalWorkflows, batches });

  for (let batch = 0; batch < batches; batch++) {
    const batchStart = batch * concurrency;
    const batchEnd = Math.min(batchStart + concurrency, totalWorkflows);
    const batchSize = batchEnd - batchStart;

    logger.info(`Running batch ${batch + 1}/${batches}`, { batchSize });

    const batchPromises = [];
    for (let i = batchStart; i < batchEnd; i++) {
      const workflowId = `load-test-workflow-${i}`;
      const issueId = `LOAD-${i}`;
      batchPromises.push(runWorkflow(client, workflowId, issueId));
    }

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);

    logger.info(`Batch ${batch + 1} complete`, {
      successful: batchResults.filter((r) => r.success).length,
      failed: batchResults.filter((r) => !r.success).length,
    });

    // Small delay between batches to avoid overwhelming the system
    if (batch < batches - 1) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  return results;
}

/**
 * Calculate metrics from results
 */
function calculateMetrics(
  results: WorkflowResult[],
  memoryMetrics: MemoryMetrics[]
): LoadTestMetrics {
  const durations = results.map((r) => r.duration).sort((a, b) => a - b);
  const successfulWorkflows = results.filter((r) => r.success).length;
  const failedWorkflows = results.filter((r) => !r.success).length;

  const totalDuration = results.length > 0
    ? Math.max(...results.map((r) => r.endTime)) - Math.min(...results.map((r) => r.startTime))
    : 0;

  const averageDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
  const p50Duration = durations[Math.floor(durations.length * 0.5)];
  const p95Duration = durations[Math.floor(durations.length * 0.95)];
  const p99Duration = durations[Math.floor(durations.length * 0.99)];
  const maxDuration = durations[durations.length - 1];
  const minDuration = durations[0];
  const throughput = (results.length / totalDuration) * 1000; // workflows per second

  const errors = results
    .filter((r) => !r.success && r.error)
    .map((r) => r.error!)
    .filter((e, i, arr) => arr.indexOf(e) === i); // unique errors

  return {
    totalWorkflows: results.length,
    successfulWorkflows,
    failedWorkflows,
    totalDuration,
    averageDuration,
    p50Duration,
    p95Duration,
    p99Duration,
    maxDuration,
    minDuration,
    throughput,
    memoryUsage: memoryMetrics,
    errors,
  };
}

/**
 * Generate load test report
 */
async function generateReport(metrics: LoadTestMetrics): Promise<void> {
  const report = `# Load Test Report
Generated: ${new Date().toISOString()}

## Summary
- Total Workflows: ${metrics.totalWorkflows}
- Successful: ${metrics.successfulWorkflows} (${((metrics.successfulWorkflows / metrics.totalWorkflows) * 100).toFixed(2)}%)
- Failed: ${metrics.failedWorkflows} (${((metrics.failedWorkflows / metrics.totalWorkflows) * 100).toFixed(2)}%)
- Total Duration: ${(metrics.totalDuration / 1000).toFixed(2)}s
- Throughput: ${metrics.throughput.toFixed(2)} workflows/second

## Latency Metrics
- Average: ${(metrics.averageDuration / 1000).toFixed(2)}s
- P50: ${(metrics.p50Duration / 1000).toFixed(2)}s
- P95: ${(metrics.p95Duration / 1000).toFixed(2)}s
- P99: ${(metrics.p99Duration / 1000).toFixed(2)}s
- Min: ${(metrics.minDuration / 1000).toFixed(2)}s
- Max: ${(metrics.maxDuration / 1000).toFixed(2)}s

## Memory Usage
- Initial Heap: ${(metrics.memoryUsage[0].heapUsed / 1024 / 1024).toFixed(2)} MB
- Final Heap: ${(metrics.memoryUsage[metrics.memoryUsage.length - 1].heapUsed / 1024 / 1024).toFixed(2)} MB
- Peak Heap: ${(Math.max(...metrics.memoryUsage.map((m) => m.heapUsed)) / 1024 / 1024).toFixed(2)} MB
- Initial RSS: ${(metrics.memoryUsage[0].rss / 1024 / 1024).toFixed(2)} MB
- Final RSS: ${(metrics.memoryUsage[metrics.memoryUsage.length - 1].rss / 1024 / 1024).toFixed(2)} MB

## Errors
${metrics.errors.length > 0 ? metrics.errors.map((e) => `- ${e}`).join('\n') : 'No errors'}

## Performance Assessment
${assessPerformance(metrics)}
`;

  const reportPath = path.join(process.cwd(), 'load-test-report.md');
  await fs.writeFile(reportPath, report, 'utf-8');
  logger.info(`Report generated: ${reportPath}`);

  // Also save JSON for detailed analysis
  const jsonPath = path.join(process.cwd(), 'load-test-results.json');
  await fs.writeFile(jsonPath, JSON.stringify(metrics, null, 2), 'utf-8');
  logger.info(`JSON results saved: ${jsonPath}`);
}

/**
 * Assess performance based on metrics
 */
function assessPerformance(metrics: LoadTestMetrics): string {
  const lines: string[] = [];

  // Success rate
  const successRate = (metrics.successfulWorkflows / metrics.totalWorkflows) * 100;
  if (successRate >= 99) {
    lines.push('✅ Success Rate: EXCELLENT (>99%)');
  } else if (successRate >= 95) {
    lines.push('✅ Success Rate: GOOD (>95%)');
  } else if (successRate >= 90) {
    lines.push('⚠️  Success Rate: ACCEPTABLE (>90%)');
  } else {
    lines.push('❌ Success Rate: POOR (<90%)');
  }

  // P95 latency
  const p95Seconds = metrics.p95Duration / 1000;
  if (p95Seconds <= 1) {
    lines.push('✅ P95 Latency: EXCELLENT (<1s)');
  } else if (p95Seconds <= 5) {
    lines.push('✅ P95 Latency: GOOD (<5s)');
  } else if (p95Seconds <= 10) {
    lines.push('⚠️  P95 Latency: ACCEPTABLE (<10s)');
  } else {
    lines.push('❌ P95 Latency: POOR (>10s)');
  }

  // Throughput
  if (metrics.throughput >= 10) {
    lines.push('✅ Throughput: EXCELLENT (>10 workflows/s)');
  } else if (metrics.throughput >= 5) {
    lines.push('✅ Throughput: GOOD (>5 workflows/s)');
  } else if (metrics.throughput >= 1) {
    lines.push('⚠️  Throughput: ACCEPTABLE (>1 workflow/s)');
  } else {
    lines.push('❌ Throughput: POOR (<1 workflow/s)');
  }

  return lines.join('\n');
}

/**
 * Main load test function
 */
async function main() {
  try {
    logger.info('Starting load test...');

    // Configuration
    const concurrency = parseInt(process.env.LOAD_TEST_CONCURRENCY || '10');
    const totalWorkflows = parseInt(process.env.LOAD_TEST_TOTAL || '50');

    logger.info('Load test configuration', { concurrency, totalWorkflows });

    // Connect to Temporal
    const temporalConfig = loadTemporalConfig();
    const connection = await Connection.connect({
      address: temporalConfig.address,
    });
    const client = new Client({ connection, namespace: temporalConfig.namespace });

    logger.info('Connected to Temporal', {
      address: temporalConfig.address,
      namespace: temporalConfig.namespace,
    });

    // Start memory monitoring
    const memoryMonitor = new MemoryMonitor();
    memoryMonitor.start(1000);

    // Run load test
    const results = await runConcurrentWorkflows(client, concurrency, totalWorkflows);

    // Stop memory monitoring
    memoryMonitor.stop();

    // Check for memory leaks
    const hasMemoryLeak = memoryMonitor.detectMemoryLeaks();
    if (hasMemoryLeak) {
      logger.warn('⚠️  Potential memory leak detected!');
    } else {
      logger.info('✅ No memory leaks detected');
    }

    // Calculate metrics
    const metrics = calculateMetrics(results, memoryMonitor.getMetrics());

    // Generate report
    await generateReport(metrics);

    // Log summary
    logger.info('=== LOAD TEST COMPLETE ===');
    logger.info(`Successful: ${metrics.successfulWorkflows}/${metrics.totalWorkflows}`);
    logger.info(`P95 Latency: ${(metrics.p95Duration / 1000).toFixed(2)}s`);
    logger.info(`Throughput: ${metrics.throughput.toFixed(2)} workflows/s`);

    // Exit with appropriate code
    const successRate = (metrics.successfulWorkflows / metrics.totalWorkflows) * 100;
    process.exit(successRate >= 95 ? 0 : 1);
  } catch (error) {
    logger.error('Load test failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    process.exit(1);
  }
}

main();
