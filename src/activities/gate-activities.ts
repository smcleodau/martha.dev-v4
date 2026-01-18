/**
 * Gate Check Activities
 *
 * Temporal activities for stage gate validation.
 * Checks if an issue has valid evidence to progress to the next stage.
 */

import { v4 as uuidv4 } from 'uuid';
import { Context } from '@temporalio/activity';
import { createLogger } from '../utils/logger.js';
import { telemetryWriter } from '../services/TelemetryWriter.js';
import { stageGate } from '../workflows/gates/stage-gates.js';
import type { GateResult } from '../workflows/gates/stage-gates.js';

const logger = createLogger({ module: 'gate-activities' });

/**
 * Check gate input
 */
export interface CheckGateInput {
  issueId: string;
  currentStage: string;
  epicId?: string;
}

/**
 * Check gate result
 */
export interface CheckGateResult {
  allowed: boolean;
  reason: string;
  qualityScore?: number;
  missingRequirements: string[];
}

/**
 * Check Stage Gate Activity
 * Validates evidence before allowing stage transition
 */
export async function checkStageGate(input: CheckGateInput): Promise<CheckGateResult> {
  const activityId = uuidv4();
  const startTime = Date.now();
  const info = Context.current().info;
  const workflowId = info.workflowExecution.workflowId;

  logger.info('Checking stage gate', {
    activityId,
    issueId: input.issueId,
    currentStage: input.currentStage,
  });

  // Telemetry: Activity started
  await telemetryWriter.writeEvent({
    workflowId,
    workflowType: 'IssueLifecycleWorkflow',
    eventType: 'activity_started',
    eventCategory: 'activity',
    severity: 'info',
    activityName: 'checkStageGate',
    activityId,
    issueId: input.issueId,
    epicId: input.epicId,
    payload: { currentStage: input.currentStage },
    source: 'temporal',
    retryAttempt: info.attempt,
  });

  try {
    // Check gate based on current stage
    const gateResult: GateResult = await stageGate.canProgress(
      input.issueId,
      input.currentStage
    );

    const durationMs = Date.now() - startTime;

    const result: CheckGateResult = {
      allowed: gateResult.allowed,
      reason: gateResult.reason,
      qualityScore: gateResult.qualityScore,
      missingRequirements: gateResult.missingRequirements,
    };

    logger.info('Gate check complete', {
      activityId,
      issueId: input.issueId,
      currentStage: input.currentStage,
      allowed: result.allowed,
      qualityScore: result.qualityScore,
    });

    // Telemetry: Activity completed
    await telemetryWriter.writeEvent({
      workflowId,
      workflowType: 'IssueLifecycleWorkflow',
      eventType: gateResult.allowed ? 'gate_check_passed' : 'gate_check_failed',
      eventCategory: 'validation',
      severity: gateResult.allowed ? 'info' : 'warning',
      activityName: 'checkStageGate',
      activityId,
      issueId: input.issueId,
      epicId: input.epicId,
      payload: result,
      durationMs,
      source: 'temporal',
    });

    return result;
  } catch (error: any) {
    const durationMs = Date.now() - startTime;

    logger.error('Gate check failed', {
      activityId,
      issueId: input.issueId,
      currentStage: input.currentStage,
      error: error.message,
    });

    // Telemetry: Activity failed
    await telemetryWriter.writeEvent({
      workflowId,
      workflowType: 'IssueLifecycleWorkflow',
      eventType: 'activity_failed',
      eventCategory: 'activity',
      severity: 'error',
      activityName: 'checkStageGate',
      activityId,
      issueId: input.issueId,
      epicId: input.epicId,
      durationMs,
      errorMessage: error.message,
      errorStack: error.stack,
      source: 'temporal',
    });

    throw error;
  }
}
