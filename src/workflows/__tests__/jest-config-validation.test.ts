/**
 * Jest Configuration Validation Tests
 *
 * These tests verify that the Jest ESM configuration is working correctly.
 * They test the core issues that were causing problems:
 * 1. ESM module imports (uuid)
 * 2. TypeScript transpilation
 * 3. Path resolution
 */

import { v4 as uuidv4, validate as validateUuid } from 'uuid';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { jest } from '@jest/globals';

describe('Jest ESM Configuration', () => {
  describe('ESM Module Support', () => {
    it('should import uuid package correctly', () => {
      // This test verifies that uuid (ESM package) can be imported
      const id = uuidv4();
      expect(id).toBeDefined();
      expect(typeof id).toBe('string');
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    it('should validate UUIDs correctly', () => {
      const validUuid = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      const invalidUuid = 'not-a-uuid';

      expect(validateUuid(validUuid)).toBe(true);
      expect(validateUuid(invalidUuid)).toBe(false);
    });

    it('should generate unique UUIDs', () => {
      const id1 = uuidv4();
      const id2 = uuidv4();

      expect(id1).not.toBe(id2);
    });
  });

  describe('TypeScript Support', () => {
    it('should support TypeScript types', () => {
      interface TestInterface {
        id: string;
        name: string;
        count: number;
      }

      const obj: TestInterface = {
        id: uuidv4(),
        name: 'test',
        count: 42,
      };

      expect(obj.id).toBeDefined();
      expect(obj.name).toBe('test');
      expect(obj.count).toBe(42);
    });

    it('should support TypeScript enums', () => {
      enum Status {
        PENDING = 'pending',
        IN_PROGRESS = 'in_progress',
        COMPLETED = 'completed',
      }

      const status: Status = Status.IN_PROGRESS;
      expect(status).toBe('in_progress');
    });
  });

  describe('Path Resolution', () => {
    it('should resolve import.meta.url correctly', () => {
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = dirname(__filename);

      expect(__filename).toBeDefined();
      expect(__dirname).toBeDefined();
      expect(__filename).toContain('jest-config-validation.test.ts');
      expect(__dirname).toContain('__tests__');
    });
  });

  describe('Async/Await Support', () => {
    it('should handle async functions', async () => {
      const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

      const start = Date.now();
      await delay(10);
      const end = Date.now();

      expect(end - start).toBeGreaterThanOrEqual(10);
    });

    it('should handle Promise.all', async () => {
      const promises = [
        Promise.resolve(1),
        Promise.resolve(2),
        Promise.resolve(3),
      ];

      const results = await Promise.all(promises);
      expect(results).toEqual([1, 2, 3]);
    });
  });

  describe('Module Mocking', () => {
    it('should support module mocking', () => {
      // Test that Jest mocking functions are available
      const mockFn = jest.fn((x: number) => x * 2);

      mockFn(5);
      mockFn(10);

      expect(mockFn).toHaveBeenCalledTimes(2);
      expect(mockFn).toHaveBeenCalledWith(5);
      expect(mockFn).toHaveBeenCalledWith(10);
      expect(mockFn(3)).toBe(6);
    });
  });

  describe('Test Lifecycle Hooks', () => {
    let counter = 0;

    beforeAll(() => {
      counter = 10;
    });

    beforeEach(() => {
      counter += 1;
    });

    afterEach(() => {
      counter -= 1;
    });

    it('should run first test', () => {
      expect(counter).toBe(11);
    });

    it('should run second test', () => {
      expect(counter).toBe(11);
    });
  });
});
