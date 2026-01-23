#!/usr/bin/env tsx

/**
 * Report Generator
 *
 * Generates comprehensive test reports in multiple formats:
 * - HTML (visual dashboard)
 * - JSON (machine-readable for CI/CD)
 * - Markdown (human-readable documentation)
 */

import { writeFileSync } from 'fs';
import { join } from 'path';
import { formatDuration } from './test-helpers.js';

export interface PhaseResult {
  phase: string;
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  tests: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
  };
  duration: number;
  errors?: string[];
}

export interface VerificationReport {
  summary: {
    totalTests: number;
    passed: number;
    failed: number;
    skipped: number;
    duration: number;
    successRate: number;
    timestamp: string;
  };
  phases: PhaseResult[];
  errors: Array<{ phase: string; error: string }>;
}

export class ReportGenerator {
  /**
   * Generate all report formats
   */
  async generateAll(
    report: VerificationReport,
    outputDir: string = 'test-results'
  ): Promise<void> {
    this.generateJSON(report, join(outputDir, 'autonomous-verify-report.json'));
    this.generateMarkdown(report, join(outputDir, 'VERIFICATION-SUMMARY.md'));
    this.generateHTML(report, join(outputDir, 'autonomous-verify-report.html'));
  }

  /**
   * Generate JSON report
   */
  generateJSON(report: VerificationReport, outputPath: string): void {
    writeFileSync(outputPath, JSON.stringify(report, null, 2));
  }

  /**
   * Generate Markdown report
   */
  generateMarkdown(report: VerificationReport, outputPath: string): void {
    const { summary, phases, errors } = report;

    let md = '# Autonomous Verification Report\n\n';

    // Executive Summary
    md += '## Executive Summary\n\n';
    md += `**Date**: ${summary.timestamp}\n\n`;
    md += `**Duration**: ${formatDuration(summary.duration)}\n\n`;
    md += `**Success Rate**: ${summary.successRate}%\n\n`;
    md += `**Total Tests**: ${summary.totalTests}\n`;
    md += `- ✅ Passed: ${summary.passed}\n`;
    md += `- ❌ Failed: ${summary.failed}\n`;
    md += `- ⏭️  Skipped: ${summary.skipped}\n\n`;

    // Phase Results
    md += '## Phase Results\n\n';
    md += '| Phase | Status | Tests | Duration |\n';
    md += '|-------|--------|-------|----------|\n';

    for (const phase of phases) {
      const status = phase.status === 'passed' ? '✅' : phase.status === 'failed' ? '❌' : '⏭️';
      const testSummary = `${phase.tests.passed}/${phase.tests.total}`;
      const duration = formatDuration(phase.duration);

      md += `| ${phase.name} | ${status} ${phase.status} | ${testSummary} | ${duration} |\n`;
    }

    md += '\n';

    // Errors
    if (errors.length > 0) {
      md += '## Errors\n\n';
      for (const error of errors) {
        md += `### ${error.phase}\n\n`;
        md += '```\n';
        md += error.error;
        md += '\n```\n\n';
      }
    } else {
      md += '## ✅ No Errors\n\n';
      md += 'All phases completed successfully!\n\n';
    }

    // Recommendations
    md += '## Recommendations\n\n';
    if (summary.successRate >= 90) {
      md += '✅ System is healthy and ready for production use.\n\n';
    } else if (summary.successRate >= 70) {
      md += '⚠️  System is partially functional but has some issues that need attention.\n\n';
    } else {
      md += '❌ System has significant issues that must be resolved before production use.\n\n';
    }

    writeFileSync(outputPath, md);
  }

  /**
   * Generate HTML report
   */
  generateHTML(report: VerificationReport, outputPath: string): void {
    const { summary, phases, errors } = report;

    let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Autonomous Verification Report</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      background: #f5f5f5;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      border-radius: 10px;
      margin-bottom: 20px;
    }
    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
      margin-bottom: 20px;
    }
    .card {
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .card h3 {
      margin: 0 0 10px 0;
      font-size: 14px;
      color: #666;
    }
    .card .value {
      font-size: 32px;
      font-weight: bold;
      color: #333;
    }
    .passed { color: #10b981; }
    .failed { color: #ef4444; }
    .skipped { color: #f59e0b; }
    .phase {
      background: white;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 15px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .phase-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }
    .status-badge {
      padding: 5px 15px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: bold;
    }
    .status-passed {
      background: #d1fae5;
      color: #065f46;
    }
    .status-failed {
      background: #fee2e2;
      color: #991b1b;
    }
    .status-skipped {
      background: #fef3c7;
      color: #92400e;
    }
    .progress-bar {
      height: 8px;
      background: #e5e7eb;
      border-radius: 4px;
      overflow: hidden;
      margin-top: 10px;
    }
    .progress-fill {
      height: 100%;
      background: #10b981;
      transition: width 0.3s;
    }
    .error {
      background: #fee2e2;
      border-left: 4px solid #ef4444;
      padding: 15px;
      margin-bottom: 15px;
      border-radius: 4px;
    }
    .error pre {
      margin: 10px 0 0 0;
      font-size: 12px;
      overflow-x: auto;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Autonomous Verification Report</h1>
    <p>${summary.timestamp}</p>
  </div>

  <div class="summary">
    <div class="card">
      <h3>Success Rate</h3>
      <div class="value">${summary.successRate}%</div>
    </div>
    <div class="card">
      <h3>Total Tests</h3>
      <div class="value">${summary.totalTests}</div>
    </div>
    <div class="card">
      <h3>Passed</h3>
      <div class="value passed">${summary.passed}</div>
    </div>
    <div class="card">
      <h3>Failed</h3>
      <div class="value failed">${summary.failed}</div>
    </div>
    <div class="card">
      <h3>Duration</h3>
      <div class="value">${formatDuration(summary.duration)}</div>
    </div>
  </div>

  <h2>Phase Results</h2>
`;

    for (const phase of phases) {
      const statusClass =
        phase.status === 'passed' ? 'status-passed' : phase.status === 'failed' ? 'status-failed' : 'status-skipped';
      const percentage = phase.tests.total > 0 ? (phase.tests.passed / phase.tests.total) * 100 : 0;

      html += `
  <div class="phase">
    <div class="phase-header">
      <h3>${phase.name}</h3>
      <span class="status-badge ${statusClass}">${phase.status.toUpperCase()}</span>
    </div>
    <p>
      Tests: ${phase.tests.passed}/${phase.tests.total} passed
      | Duration: ${formatDuration(phase.duration)}
    </p>
    <div class="progress-bar">
      <div class="progress-fill" style="width: ${percentage}%"></div>
    </div>
  </div>
`;
    }

    if (errors.length > 0) {
      html += '<h2>Errors</h2>';
      for (const error of errors) {
        html += `
  <div class="error">
    <strong>${error.phase}</strong>
    <pre>${error.error}</pre>
  </div>
`;
      }
    }

    html += `
</body>
</html>
`;

    writeFileSync(outputPath, html);
  }
}
