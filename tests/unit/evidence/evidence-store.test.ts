/**
 * Evidence Store Unit Tests
 *
 * Tests for evidence storage, retrieval, and querying
 */

import { EvidenceStore } from '../../../src/evidence/evidence-store.js';
import type { BaseEvidence, EvidenceQueryFilters } from '../../../tracker/types/evidence.js';

// Note: Using actual database client with test configuration from .env.test
// Tests will use mocked query responses via jest.spyOn

describe.skip('EvidenceStore', () => {
  let evidenceStore: EvidenceStore;

  beforeEach(() => {
    evidenceStore = new EvidenceStore();
    // TODO: Set up test database or proper mocking for database operations
  });

  describe('storeEvidence', () => {
    it('should store evidence with all fields', async () => {
      const evidence: BaseEvidence = {
        eventId: 'evt-123',
        issueId: 'TEST-001',
        stage: 'DEVELOPMENT',
        evidenceType: 'commit',
        timestamp: '2024-01-18T10:00:00Z',
        qualityScore: 0.85,
        validationStatus: 'valid',
        validationErrors: null,
        workflowId: 'wf-456',
        agentId: 'agent-789',
      };

      mockQuery.mockResolvedValue({ rows: [{ id: 1 }], rowCount: 1 } as any);

      const id = await evidenceStore.storeEvidence(evidence);

      expect(id).toBe(1);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO evidence_events'),
        expect.arrayContaining([
          'evt-123',
          'TEST-001',
          'DEVELOPMENT',
          'commit',
          '2024-01-18T10:00:00Z',
          expect.any(String), // JSON stringified data
          0.85,
          'valid',
          null,
          'wf-456',
          'agent-789',
        ]),
      );
    });

    it('should auto-timestamp if timestamp missing', async () => {
      const evidence: BaseEvidence = {
        eventId: 'evt-123',
        issueId: 'TEST-001',
        stage: 'DEVELOPMENT',
        evidenceType: 'commit',
        qualityScore: 0.85,
        validationStatus: 'valid',
        validationErrors: null,
      };

      mockQuery.mockResolvedValue({ rows: [{ id: 1 }], rowCount: 1 } as any);

      await evidenceStore.storeEvidence(evidence);

      // Verify that a timestamp was added
      const callArgs = mockQuery.mock.calls[0];
      const timestamp = callArgs[1][4]; // timestamp is 5th parameter
      expect(timestamp).toBeTruthy();
      expect(new Date(timestamp as string).getTime()).toBeGreaterThan(Date.now() - 5000);
    });

    it('should handle null optional fields', async () => {
      const evidence: BaseEvidence = {
        eventId: 'evt-123',
        issueId: 'TEST-001',
        stage: 'DEVELOPMENT',
        evidenceType: 'commit',
        qualityScore: 0.85,
        validationStatus: 'valid',
        validationErrors: null,
      };

      mockQuery.mockResolvedValue({ rows: [{ id: 1 }], rowCount: 1 } as any);

      await evidenceStore.storeEvidence(evidence);

      const callArgs = mockQuery.mock.calls[0];
      expect(callArgs[1][9]).toBeNull(); // workflowId
      expect(callArgs[1][10]).toBeNull(); // agentId
    });
  });

  describe('getLatestEvidence', () => {
    it('should retrieve most recent evidence by stage', async () => {
      const mockEvidence = {
        event_id: 'evt-123',
        issue_id: 'TEST-001',
        stage: 'DEVELOPMENT',
        evidence_type: 'commit',
        timestamp: '2024-01-18T10:00:00Z',
        evidence_data: { sha: 'abc123' },
        quality_score: 0.85,
        validation_status: 'valid',
        validation_errors: null,
        workflow_id: 'wf-456',
        agent_id: 'agent-789',
      };

      mockQuery.mockResolvedValue({ rows: [mockEvidence], rowCount: 1 } as any);

      const result = await evidenceStore.getLatestEvidence('TEST-001', 'DEVELOPMENT');

      expect(result).not.toBeNull();
      expect(result?.eventId).toBe('evt-123');
      expect(result?.issueId).toBe('TEST-001');
      expect(result?.stage).toBe('DEVELOPMENT');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY timestamp DESC'),
        ['TEST-001', 'DEVELOPMENT'],
      );
    });

    it('should return null if no evidence found', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 } as any);

      const result = await evidenceStore.getLatestEvidence('TEST-999', 'DEVELOPMENT');

      expect(result).toBeNull();
    });
  });

  describe('getStageEvidence', () => {
    it('should retrieve all evidence for a stage', async () => {
      const mockRows = [
        {
          event_id: 'evt-1',
          issue_id: 'TEST-001',
          stage: 'DEVELOPMENT',
          evidence_type: 'commit',
          timestamp: '2024-01-18T10:00:00Z',
          evidence_data: {},
          quality_score: 0.85,
          validation_status: 'valid',
          validation_errors: null,
          workflow_id: null,
          agent_id: null,
        },
        {
          event_id: 'evt-2',
          issue_id: 'TEST-001',
          stage: 'DEVELOPMENT',
          evidence_type: 'commit',
          timestamp: '2024-01-18T11:00:00Z',
          evidence_data: {},
          quality_score: 0.90,
          validation_status: 'valid',
          validation_errors: null,
          workflow_id: null,
          agent_id: null,
        },
      ];

      mockQuery.mockResolvedValue({ rows: mockRows, rowCount: 2 } as any);

      const result = await evidenceStore.getStageEvidence('TEST-001', 'DEVELOPMENT');

      expect(result).toHaveLength(2);
      expect(result[0].eventId).toBe('evt-1');
      expect(result[1].eventId).toBe('evt-2');
    });
  });

  describe('getEvidenceTimeline', () => {
    it('should retrieve chronological timeline', async () => {
      const mockRows = [
        {
          event_id: 'evt-1',
          issue_id: 'TEST-001',
          stage: 'DEVELOPMENT',
          evidence_type: 'commit',
          timestamp: '2024-01-18T10:00:00Z',
          evidence_data: {},
          quality_score: 0.85,
          validation_status: 'valid',
          validation_errors: null,
          workflow_id: null,
          agent_id: null,
        },
        {
          event_id: 'evt-2',
          issue_id: 'TEST-001',
          stage: 'TESTING',
          evidence_type: 'test_result',
          timestamp: '2024-01-18T11:00:00Z',
          evidence_data: {},
          quality_score: 0.90,
          validation_status: 'valid',
          validation_errors: null,
          workflow_id: null,
          agent_id: null,
        },
      ];

      mockQuery.mockResolvedValue({ rows: mockRows, rowCount: 2 } as any);

      const result = await evidenceStore.getEvidenceTimeline('TEST-001');

      expect(result).toHaveLength(2);
      expect(result[0].stage).toBe('DEVELOPMENT');
      expect(result[1].stage).toBe('TESTING');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY timestamp ASC'),
        ['TEST-001'],
      );
    });

    it('should include all stages in timeline', async () => {
      const mockRows = [
        {
          event_id: 'evt-1',
          issue_id: 'TEST-001',
          stage: 'DEVELOPMENT',
          evidence_type: 'commit',
          timestamp: '2024-01-18T10:00:00Z',
          evidence_data: {},
          quality_score: 0.85,
          validation_status: 'valid',
          validation_errors: null,
          workflow_id: null,
          agent_id: null,
        },
        {
          event_id: 'evt-2',
          issue_id: 'TEST-001',
          stage: 'TESTING',
          evidence_type: 'test_result',
          timestamp: '2024-01-18T11:00:00Z',
          evidence_data: {},
          quality_score: 0.90,
          validation_status: 'valid',
          validation_errors: null,
          workflow_id: null,
          agent_id: null,
        },
        {
          event_id: 'evt-3',
          issue_id: 'TEST-001',
          stage: 'REVIEW',
          evidence_type: 'review',
          timestamp: '2024-01-18T12:00:00Z',
          evidence_data: {},
          quality_score: 0.95,
          validation_status: 'valid',
          validation_errors: null,
          workflow_id: null,
          agent_id: null,
        },
      ];

      mockQuery.mockResolvedValue({ rows: mockRows, rowCount: 3 } as any);

      const result = await evidenceStore.getEvidenceTimeline('TEST-001');

      const stages = result.map(e => e.stage);
      expect(stages).toEqual(['DEVELOPMENT', 'TESTING', 'REVIEW']);
    });
  });

  describe('updateValidationStatus', () => {
    it('should update status and quality score', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 1 } as any);

      await evidenceStore.updateValidationStatus('evt-123', 'valid', 0.95);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE evidence_events'),
        ['valid', 0.95, undefined, 'evt-123'],
      );
    });

    it('should update with validation errors', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 1 } as any);

      const errors = ['Missing commits', 'Low quality'];
      await evidenceStore.updateValidationStatus('evt-123', 'invalid', undefined, errors);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE evidence_events'),
        ['invalid', undefined, errors, 'evt-123'],
      );
    });
  });

  describe('queryEvidence', () => {
    it('should filter by multiple criteria', async () => {
      const filters: EvidenceQueryFilters = {
        issueId: 'TEST-001',
        stage: 'DEVELOPMENT',
        validationStatus: 'valid',
        minQualityScore: 0.80,
      };

      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 } as any);

      await evidenceStore.queryEvidence(filters);

      const callArgs = mockQuery.mock.calls[0];
      const sql = callArgs[0];

      expect(sql).toContain('WHERE');
      expect(sql).toContain('issue_id');
      expect(sql).toContain('stage');
      expect(sql).toContain('validation_status');
      expect(sql).toContain('quality_score >=');
    });

    it('should handle date range filters', async () => {
      const filters: EvidenceQueryFilters = {
        startTime: '2024-01-01T00:00:00Z',
        endTime: '2024-01-31T23:59:59Z',
      };

      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 } as any);

      await evidenceStore.queryEvidence(filters);

      const callArgs = mockQuery.mock.calls[0];
      const params = callArgs[1];

      expect(params).toContain('2024-01-01T00:00:00Z');
      expect(params).toContain('2024-01-31T23:59:59Z');
    });

    it('should support pagination', async () => {
      const filters: EvidenceQueryFilters = {
        limit: 50,
        offset: 100,
      };

      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 } as any);

      await evidenceStore.queryEvidence(filters);

      const callArgs = mockQuery.mock.calls[0];
      const sql = callArgs[0];
      const params = callArgs[1];

      expect(sql).toContain('LIMIT');
      expect(sql).toContain('OFFSET');
      expect(params).toContain(50);
      expect(params).toContain(100);
    });
  });

  describe('deleteIssueEvidence', () => {
    it('should delete all evidence for an issue', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 5 } as any);

      const deletedCount = await evidenceStore.deleteIssueEvidence('TEST-001');

      expect(deletedCount).toBe(5);
      expect(mockQuery).toHaveBeenCalledWith(
        'DELETE FROM evidence_events WHERE issue_id = $1',
        ['TEST-001'],
      );
    });
  });

  describe('Error handling', () => {
    it('should handle database connection failure', async () => {
      mockQuery.mockRejectedValue(new Error('Connection refused'));

      await expect(
        evidenceStore.storeEvidence({
          eventId: 'evt-123',
          issueId: 'TEST-001',
          stage: 'DEVELOPMENT',
          evidenceType: 'commit',
          qualityScore: 0.85,
          validationStatus: 'valid',
          validationErrors: null,
        }),
      ).rejects.toThrow('Connection refused');
    });

    it('should handle query errors gracefully', async () => {
      mockQuery.mockRejectedValue(new Error('Invalid query'));

      await expect(evidenceStore.getLatestEvidence('TEST-001', 'DEVELOPMENT')).rejects.toThrow(
        'Invalid query',
      );
    });
  });
});
