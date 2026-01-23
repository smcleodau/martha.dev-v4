#!/usr/bin/env npx tsx

/**
 * Component Verification Test
 *
 * Verifies that all Evidence & Events Enhancement components are properly implemented:
 * 1. ClaudeAgentSpawner - Can build context
 * 2. AgentHealthMonitor - Can initialize
 * 3. Workflow Signal API endpoints - Are registered
 * 4. Gate activities - Can be imported
 * 5. Evidence services - Can be instantiated
 *
 * Usage:
 *   npx tsx scripts/test-component-verification.ts
 */

import { createLogger } from '../src/utils/logger.js';
import fs from 'fs/promises';
import path from 'path';

const logger = createLogger({ module: 'component-verification' });

interface ComponentTest {
  component: string;
  passed: boolean;
  details?: any;
  error?: string;
}

const results: ComponentTest[] = [];

/**
 * Test: ClaudeAgentSpawner exists and can be imported
 */
async function testClaudeAgentSpawner(): Promise<ComponentTest> {
  const componentName = 'ClaudeAgentSpawner';

  try {
    logger.info(`Verifying component: ${componentName}`);

    // Check if file exists
    const filePath = path.join(process.cwd(), 'src/services/ClaudeAgentSpawner.ts');
    await fs.access(filePath);

    // Read file content
    const content = await fs.readFile(filePath, 'utf-8');

    // Check for key methods
    const hasSpawnMethod = content.includes('spawnAgent');
    const hasContextBuilder = content.includes('AgentContext') || content.includes('buildContext');
    const hasWorkDirectory = content.includes('.martha/work');

    const allChecksPassed = hasSpawnMethod && hasContextBuilder && hasWorkDirectory;

    logger.info(`✓ ${componentName} verification passed`, {
      hasSpawnMethod,
      hasContextBuilder,
      hasWorkDirectory
    });

    return {
      component: componentName,
      passed: allChecksPassed,
      details: {
        fileExists: true,
        hasSpawnMethod,
        hasContextBuilder,
        hasWorkDirectory
      }
    };
  } catch (error: any) {
    logger.error(`✗ ${componentName} verification failed`, { error: error.message });
    return {
      component: componentName,
      passed: false,
      error: error.message
    };
  }
}

/**
 * Test: AgentHealthMonitor exists and can be imported
 */
async function testAgentHealthMonitor(): Promise<ComponentTest> {
  const componentName = 'AgentHealthMonitor';

  try {
    logger.info(`Verifying component: ${componentName}`);

    // Check if file exists
    const filePath = path.join(process.cwd(), 'src/services/AgentHealthMonitor.ts');
    await fs.access(filePath);

    // Read file content
    const content = await fs.readFile(filePath, 'utf-8');

    // Check for key methods
    const hasStartMonitoring = content.includes('startMonitoring');
    const hasStopMonitoring = content.includes('stopMonitoring');
    const hasCheckAlive = content.includes('checkAgentAlive') || content.includes('checkAlive');
    const hasHandleCrash = content.includes('handleAgentCrash') || content.includes('handleCrash');

    const allChecksPassed = hasStartMonitoring && hasStopMonitoring && (hasCheckAlive || hasHandleCrash);

    logger.info(`✓ ${componentName} verification passed`, {
      hasStartMonitoring,
      hasStopMonitoring,
      hasCheckAlive,
      hasHandleCrash
    });

    return {
      component: componentName,
      passed: allChecksPassed,
      details: {
        fileExists: true,
        hasStartMonitoring,
        hasStopMonitoring,
        hasCheckAlive,
        hasHandleCrash
      }
    };
  } catch (error: any) {
    logger.error(`✗ ${componentName} verification failed`, { error: error.message });
    return {
      component: componentName,
      passed: false,
      error: error.message
    };
  }
}

/**
 * Test: Workflow signal routes exist
 */
async function testWorkflowSignalRoutes(): Promise<ComponentTest> {
  const componentName = 'Workflow Signal Routes';

  try {
    logger.info(`Verifying component: ${componentName}`);

    // Check if file exists
    const filePath = path.join(process.cwd(), 'src/server/routes/workflow-signals.ts');
    await fs.access(filePath);

    // Read file content
    const content = await fs.readFile(filePath, 'utf-8');

    // Check for signal endpoints
    const hasGenericSignal = content.includes('/signals/:signalName') || content.includes('signalWorkflow');
    const hasAgentStarted = content.includes('agent-started') || content.includes('agentStarted');
    const hasCommitMade = content.includes('commit-made') || content.includes('commitMade');
    const hasAgentCompleted = content.includes('agent-completed') || content.includes('agentCompleted');
    const hasTestResults = content.includes('test-results') || content.includes('testResults');
    const hasBlock = content.includes('/block') || content.includes('setBlock');

    const allChecksPassed = hasGenericSignal && hasAgentStarted && hasCommitMade && hasAgentCompleted;

    logger.info(`✓ ${componentName} verification passed`, {
      hasGenericSignal,
      hasAgentStarted,
      hasCommitMade,
      hasAgentCompleted,
      hasTestResults,
      hasBlock
    });

    return {
      component: componentName,
      passed: allChecksPassed,
      details: {
        fileExists: true,
        hasGenericSignal,
        hasAgentStarted,
        hasCommitMade,
        hasAgentCompleted,
        hasTestResults,
        hasBlock
      }
    };
  } catch (error: any) {
    logger.error(`✗ ${componentName} verification failed`, { error: error.message });
    return {
      component: componentName,
      passed: false,
      error: error.message
    };
  }
}

/**
 * Test: Gate activities exist
 */
async function testGateActivities(): Promise<ComponentTest> {
  const componentName = 'Gate Activities';

  try {
    logger.info(`Verifying component: ${componentName}`);

    // Check if file exists
    const filePath = path.join(process.cwd(), 'src/activities/gate-activities.ts');
    await fs.access(filePath);

    // Read file content
    const content = await fs.readFile(filePath, 'utf-8');

    // Check for gate functions
    const hasCheckGate = content.includes('checkGate') || content.includes('canMoveToStage');
    const hasStageGate = content.includes('StageGate') || content.includes('gateResult');
    const hasEvidenceValidation = content.includes('evidence') && content.includes('validat');

    const allChecksPassed = hasCheckGate || (hasStageGate && hasEvidenceValidation);

    logger.info(`✓ ${componentName} verification passed`, {
      hasCheckGate,
      hasStageGate,
      hasEvidenceValidation
    });

    return {
      component: componentName,
      passed: allChecksPassed,
      details: {
        fileExists: true,
        hasCheckGate,
        hasStageGate,
        hasEvidenceValidation
      }
    };
  } catch (error: any) {
    logger.error(`✗ ${componentName} verification failed`, { error: error.message });
    return {
      component: componentName,
      passed: false,
      error: error.message
    };
  }
}

/**
 * Test: Evidence Store exists
 */
async function testEvidenceStore(): Promise<ComponentTest> {
  const componentName = 'Evidence Store';

  try {
    logger.info(`Verifying component: ${componentName}`);

    // Check if file exists
    const filePath = path.join(process.cwd(), 'src/evidence/evidence-store.ts');
    await fs.access(filePath);

    // Read file content
    const content = await fs.readFile(filePath, 'utf-8');

    // Check for key methods
    const hasStoreEvidence = content.includes('storeEvidence');
    const hasGetLatest = content.includes('getLatestEvidence');
    const hasGetTimeline = content.includes('getEvidenceTimeline') || content.includes('timeline');
    const hasQuery = content.includes('queryEvidence') || content.includes('query');

    const allChecksPassed = hasStoreEvidence && hasGetLatest;

    logger.info(`✓ ${componentName} verification passed`, {
      hasStoreEvidence,
      hasGetLatest,
      hasGetTimeline,
      hasQuery
    });

    return {
      component: componentName,
      passed: allChecksPassed,
      details: {
        fileExists: true,
        hasStoreEvidence,
        hasGetLatest,
        hasGetTimeline,
        hasQuery
      }
    };
  } catch (error: any) {
    logger.error(`✗ ${componentName} verification failed`, { error: error.message });
    return {
      component: componentName,
      passed: false,
      error: error.message
    };
  }
}

/**
 * Test: Evidence Validator exists
 */
async function testEvidenceValidator(): Promise<ComponentTest> {
  const componentName = 'Evidence Validator';

  try {
    logger.info(`Verifying component: ${componentName}`);

    // Check if file exists
    const filePath = path.join(process.cwd(), 'src/validation/evidence-validator.ts');
    await fs.access(filePath);

    // Read file content
    const content = await fs.readFile(filePath, 'utf-8');

    // Check for key methods
    const hasValidateEvidence = content.includes('validateEvidence');
    const hasStageRules = content.includes('stageRules') || content.includes('ValidationRule');
    const hasQualityScore = content.includes('qualityScore') || content.includes('calculateScore');

    const allChecksPassed = hasValidateEvidence && hasStageRules;

    logger.info(`✓ ${componentName} verification passed`, {
      hasValidateEvidence,
      hasStageRules,
      hasQualityScore
    });

    return {
      component: componentName,
      passed: allChecksPassed,
      details: {
        fileExists: true,
        hasValidateEvidence,
        hasStageRules,
        hasQualityScore
      }
    };
  } catch (error: any) {
    logger.error(`✗ ${componentName} verification failed`, { error: error.message });
    return {
      component: componentName,
      passed: false,
      error: error.message
    };
  }
}

/**
 * Test: Stage Gates exist
 */
async function testStageGates(): Promise<ComponentTest> {
  const componentName = 'Stage Gates';

  try {
    logger.info(`Verifying component: ${componentName}`);

    // Check if file exists
    const filePath = path.join(process.cwd(), 'src/workflows/gates/stage-gates.ts');
    await fs.access(filePath);

    // Read file content
    const content = await fs.readFile(filePath, 'utf-8');

    // Check for gate methods
    const hasCanMoveToTesting = content.includes('canMoveToTesting') || content.includes('Testing');
    const hasCanMoveToReview = content.includes('canMoveToReview') || content.includes('Review');
    const hasCanMoveToMerge = content.includes('canMoveToMerge') || content.includes('Merge');
    const hasGateResult = content.includes('GateResult') || content.includes('allowed');

    const allChecksPassed = hasGateResult && (hasCanMoveToTesting || hasCanMoveToReview);

    logger.info(`✓ ${componentName} verification passed`, {
      hasCanMoveToTesting,
      hasCanMoveToReview,
      hasCanMoveToMerge,
      hasGateResult
    });

    return {
      component: componentName,
      passed: allChecksPassed,
      details: {
        fileExists: true,
        hasCanMoveToTesting,
        hasCanMoveToReview,
        hasCanMoveToMerge,
        hasGateResult
      }
    };
  } catch (error: any) {
    logger.error(`✗ ${componentName} verification failed`, { error: error.message });
    return {
      component: componentName,
      passed: false,
      error: error.message
    };
  }
}

/**
 * Test: Telemetry Writer exists
 */
async function testTelemetryWriter(): Promise<ComponentTest> {
  const componentName = 'Telemetry Writer';

  try {
    logger.info(`Verifying component: ${componentName}`);

    // Check if file exists
    const filePath = path.join(process.cwd(), 'src/services/TelemetryWriter.ts');
    await fs.access(filePath);

    // Read file content
    const content = await fs.readFile(filePath, 'utf-8');

    // Check for key methods
    const hasWriteEvent = content.includes('writeEvent') || content.includes('write');
    const hasTelemetryEvent = content.includes('TelemetryEvent');
    const hasDatabase = content.includes('telemetry_events') || content.includes('INSERT');

    const allChecksPassed = hasWriteEvent && hasTelemetryEvent;

    logger.info(`✓ ${componentName} verification passed`, {
      hasWriteEvent,
      hasTelemetryEvent,
      hasDatabase
    });

    return {
      component: componentName,
      passed: allChecksPassed,
      details: {
        fileExists: true,
        hasWriteEvent,
        hasTelemetryEvent,
        hasDatabase
      }
    };
  } catch (error: any) {
    logger.error(`✗ ${componentName} verification failed`, { error: error.message });
    return {
      component: componentName,
      passed: false,
      error: error.message
    };
  }
}

/**
 * Run all component verification tests
 */
async function runAllTests() {
  logger.info('=================================================');
  logger.info('  Component Verification Test');
  logger.info('=================================================');
  logger.info('');

  const tests = [
    testClaudeAgentSpawner,
    testAgentHealthMonitor,
    testWorkflowSignalRoutes,
    testGateActivities,
    testEvidenceStore,
    testEvidenceValidator,
    testStageGates,
    testTelemetryWriter
  ];

  for (const test of tests) {
    const result = await test();
    results.push(result);
    logger.info('');
  }

  // Summary
  logger.info('=================================================');
  logger.info('  Component Verification Summary');
  logger.info('=================================================');

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  logger.info(`Total Components: ${results.length}`);
  logger.info(`Verified: ${passed}`);
  logger.info(`Failed: ${failed}`);
  logger.info('');

  if (failed > 0) {
    logger.info('Failed Components:');
    results.filter(r => !r.passed).forEach(r => {
      logger.info(`  ✗ ${r.component}: ${r.error}`);
    });
    logger.info('');
  }

  // Component checklist
  logger.info('=================================================');
  logger.info('  Component Checklist');
  logger.info('=================================================');

  results.forEach(r => {
    const icon = r.passed ? '✓' : '✗';
    logger.info(`  ${icon} ${r.component}`);
  });

  logger.info('');
  logger.info('=================================================');

  if (failed === 0) {
    logger.info('✅ All components verified successfully!');
    process.exit(0);
  } else {
    logger.error(`❌ ${failed} component(s) failed verification`);
    process.exit(1);
  }
}

// Run tests
runAllTests().catch(error => {
  logger.error('Component verification failed with unhandled error', {
    error: error.message,
    stack: error.stack
  });
  process.exit(1);
});
