/**
 * Policy Compliance Component - Shows compliance status across different areas
 */

import { type Issue } from '../../../api/tracker';
import { useState } from 'react';

type ComplianceStatus = 'compliant' | 'non_compliant' | 'partial' | 'n/a';

interface ComplianceCheck {
  id: string;
  name: string;
  status: 'pass' | 'fail' | 'n/a';
  details?: string;
}

interface ComplianceArea {
  id: string;
  name: string;
  status: ComplianceStatus;
  checks: ComplianceCheck[];
  last_checked?: string;
}

interface PolicyComplianceData {
  security: ComplianceArea;
  testing: ComplianceArea;
  code_review: ComplianceArea;
  documentation: ComplianceArea;
}

interface PolicyComplianceProps {
  issue: Issue;
}

const API_BASE = '/api/tracker';

async function updatePolicyCompliance(
  worktreeId: string,
  boardId: string,
  issueId: string,
  policyCompliance: Partial<PolicyComplianceData>
): Promise<void> {
  const response = await fetch(
    `${API_BASE}/worktrees/${worktreeId}/boards/${boardId}/issues/${issueId}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ policy_compliance: policyCompliance }),
    }
  );

  if (!response.ok) {
    throw new Error('Failed to update policy compliance');
  }
}

export function PolicyCompliance({ issue }: PolicyComplianceProps) {
  // Get policy compliance data from issue (or use defaults)
  const defaultCompliance: PolicyComplianceData = {
    security: {
      id: 'security',
      name: 'Security',
      status: 'n/a',
      checks: [
        { id: 'sec-1', name: 'No hardcoded secrets', status: 'n/a' },
        { id: 'sec-2', name: 'Dependencies scanned', status: 'n/a' },
        { id: 'sec-3', name: 'Authentication implemented', status: 'n/a' },
        { id: 'sec-4', name: 'Input validation', status: 'n/a' },
      ],
    },
    testing: {
      id: 'testing',
      name: 'Testing',
      status: 'n/a',
      checks: [
        { id: 'test-1', name: 'Unit tests written', status: 'n/a' },
        { id: 'test-2', name: 'Integration tests pass', status: 'n/a' },
        { id: 'test-3', name: 'Code coverage >= 80%', status: 'n/a' },
        { id: 'test-4', name: 'E2E tests pass', status: 'n/a' },
      ],
    },
    code_review: {
      id: 'code_review',
      name: 'Code Review',
      status: 'n/a',
      checks: [
        { id: 'review-1', name: 'PR approved by 2+ reviewers', status: 'n/a' },
        { id: 'review-2', name: 'No unresolved comments', status: 'n/a' },
        { id: 'review-3', name: 'Follows code style guide', status: 'n/a' },
        { id: 'review-4', name: 'No critical issues flagged', status: 'n/a' },
      ],
    },
    documentation: {
      id: 'documentation',
      name: 'Documentation',
      status: 'n/a',
      checks: [
        { id: 'doc-1', name: 'API documented', status: 'n/a' },
        { id: 'doc-2', name: 'README updated', status: 'n/a' },
        { id: 'doc-3', name: 'Inline comments added', status: 'n/a' },
        { id: 'doc-4', name: 'Changelog updated', status: 'n/a' },
      ],
    },
  };

  const [compliance, setCompliance] = useState<PolicyComplianceData>(
    (issue as any).policy_compliance || defaultCompliance
  );

  const [expandedAreas, setExpandedAreas] = useState<Set<string>>(
    new Set(['security', 'testing', 'code_review', 'documentation'])
  );

  const toggleArea = (areaId: string) => {
    setExpandedAreas((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(areaId)) {
        newSet.delete(areaId);
      } else {
        newSet.add(areaId);
      }
      return newSet;
    });
  };

  const handleCheckStatusChange = async (
    areaId: keyof PolicyComplianceData,
    checkId: string,
    newStatus: ComplianceCheck['status']
  ) => {
    const updatedArea = { ...compliance[areaId] };
    const checkIndex = updatedArea.checks.findIndex((c) => c.id === checkId);

    if (checkIndex === -1) return;

    updatedArea.checks[checkIndex].status = newStatus;

    // Recalculate area status
    const checks = updatedArea.checks;
    const passCount = checks.filter((c) => c.status === 'pass').length;
    const failCount = checks.filter((c) => c.status === 'fail').length;
    const naCount = checks.filter((c) => c.status === 'n/a').length;

    if (naCount === checks.length) {
      updatedArea.status = 'n/a';
    } else if (failCount > 0) {
      if (passCount > 0) {
        updatedArea.status = 'partial';
      } else {
        updatedArea.status = 'non_compliant';
      }
    } else if (passCount === checks.length) {
      updatedArea.status = 'compliant';
    } else {
      updatedArea.status = 'partial';
    }

    updatedArea.last_checked = new Date().toISOString();

    const updatedCompliance = {
      ...compliance,
      [areaId]: updatedArea,
    };

    setCompliance(updatedCompliance);

    // Update via API
    try {
      await updatePolicyCompliance(
        issue.worktree_id,
        issue.board_id,
        issue.id,
        updatedCompliance
      );
    } catch (err) {
      console.error('Failed to update policy compliance:', err);
      alert('Failed to update compliance status');
    }
  };

  const getStatusBadgeColor = (status: ComplianceStatus) => {
    switch (status) {
      case 'compliant':
        return { bg: '#E8F5E9', text: '#4CAF50' }; // green
      case 'non_compliant':
        return { bg: '#FFEBEE', text: '#F44336' }; // red
      case 'partial':
        return { bg: '#FFF9C4', text: '#FFA000' }; // yellow
      case 'n/a':
        return { bg: '#F5F5F5', text: '#9E9E9E' }; // gray
      default:
        return { bg: '#F5F1EC', text: '#A39686' };
    }
  };

  const getCheckStatusColor = (status: ComplianceCheck['status']) => {
    switch (status) {
      case 'pass':
        return '#4CAF50'; // green
      case 'fail':
        return '#F44336'; // red
      case 'n/a':
        return '#9E9E9E'; // gray
      default:
        return '#A39686';
    }
  };

  const getCheckIcon = (status: ComplianceCheck['status']) => {
    switch (status) {
      case 'pass':
        return '✓';
      case 'fail':
        return '✗';
      case 'n/a':
        return '−';
      default:
        return '?';
    }
  };

  const areas: Array<keyof PolicyComplianceData> = [
    'security',
    'testing',
    'code_review',
    'documentation',
  ];

  return (
    <div
      className="bg-white rounded-lg p-6 shadow-warm-md"
      style={{
        borderColor: '#E8E0D5',
        borderWidth: '1px',
        borderStyle: 'solid',
      }}
    >
      <h3 className="text-lg font-semibold mb-4" style={{ color: '#2F241B' }}>
        Policy Compliance
      </h3>

      <div className="space-y-3">
        {areas.map((areaId) => {
          const area = compliance[areaId];
          const isExpanded = expandedAreas.has(areaId);
          const colors = getStatusBadgeColor(area.status);

          return (
            <div
              key={areaId}
              className="border rounded-lg overflow-hidden"
              style={{ borderColor: '#E8E0D5' }}
            >
              {/* Area header */}
              <div
                className="p-4 cursor-pointer select-none hover:bg-opacity-75 transition-colors"
                style={{ backgroundColor: '#FAFAF8' }}
                onClick={() => toggleArea(areaId)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold" style={{ color: '#2F241B' }}>
                      {area.name}
                    </span>
                    <span
                      className="text-xs px-2 py-1 rounded font-medium"
                      style={{
                        backgroundColor: colors.bg,
                        color: colors.text,
                      }}
                    >
                      {area.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    {area.last_checked && (
                      <span className="text-xs" style={{ color: '#A39686' }}>
                        Last checked: {new Date(area.last_checked).toLocaleString()}
                      </span>
                    )}
                    <span
                      className="text-lg transition-transform duration-200"
                      style={{
                        transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                        display: 'inline-block',
                      }}
                    >
                      ▼
                    </span>
                  </div>
                </div>
              </div>

              {/* Area checks */}
              {isExpanded && (
                <div className="p-4 space-y-2 border-t" style={{ borderColor: '#E8E0D5' }}>
                  {area.checks.map((check) => (
                    <div
                      key={check.id}
                      className="flex items-center justify-between gap-3 p-2 rounded hover:bg-opacity-50"
                      style={{ backgroundColor: '#FAFAF8' }}
                    >
                      <div className="flex items-center gap-2 flex-1">
                        <div
                          className="w-5 h-5 rounded flex items-center justify-center text-xs font-bold flex-shrink-0"
                          style={{
                            backgroundColor: `${getCheckStatusColor(check.status)}20`,
                            color: getCheckStatusColor(check.status),
                          }}
                        >
                          {getCheckIcon(check.status)}
                        </div>
                        <span className="text-sm" style={{ color: '#2F241B' }}>
                          {check.name}
                        </span>
                      </div>
                      <select
                        value={check.status}
                        onChange={(e) =>
                          handleCheckStatusChange(
                            areaId,
                            check.id,
                            e.target.value as ComplianceCheck['status']
                          )
                        }
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs px-2 py-1 border rounded focus:outline-none focus-coral"
                        style={{ borderColor: '#E8E0D5', color: '#2F241B' }}
                      >
                        <option value="n/a">N/A</option>
                        <option value="pass">Pass</option>
                        <option value="fail">Fail</option>
                      </select>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
