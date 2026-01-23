/**
 * useDebounce Hook Tests
 * Tests for debounce hooks
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebouncedValue, useDebounce } from '../useDebounce';

describe('useDebouncedValue', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns initial value immediately', () => {
    const { result } = renderHook(() => useDebouncedValue('initial'));
    expect(result.current).toBe('initial');
  });

  it('debounces value updates', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 300),
      { initialProps: { value: 'initial' } }
    );

    expect(result.current).toBe('initial');

    // Update value
    rerender({ value: 'updated' });

    // Value should not update immediately
    expect(result.current).toBe('initial');

    // Fast-forward time by 300ms
    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Value should now be updated
    expect(result.current).toBe('updated');
  });

  it('cancels previous timeout on rapid updates', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 300),
      { initialProps: { value: 'initial' } }
    );

    // First update
    rerender({ value: 'update1' });
    act(() => {
      vi.advanceTimersByTime(100);
    });

    // Second update before first completes
    rerender({ value: 'update2' });
    act(() => {
      vi.advanceTimersByTime(100);
    });

    // Third update
    rerender({ value: 'final' });

    // Complete the debounce
    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Should only have the final value
    expect(result.current).toBe('final');
  });

  it('uses default delay of 300ms', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value),
      { initialProps: { value: 'initial' } }
    );

    rerender({ value: 'updated' });

    // Should not update before 300ms
    act(() => {
      vi.advanceTimersByTime(299);
    });
    expect(result.current).toBe('initial');

    // Should update after 300ms
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe('updated');
  });

  it('handles custom delay', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 500),
      { initialProps: { value: 'initial' } }
    );

    rerender({ value: 'updated' });

    // Should not update before 500ms
    act(() => {
      vi.advanceTimersByTime(499);
    });
    expect(result.current).toBe('initial');

    // Should update after 500ms
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe('updated');
  });

  it('works with different data types', () => {
    // Number
    const { result: numberResult, rerender: numberRerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 100),
      { initialProps: { value: 0 } }
    );

    numberRerender({ value: 42 });
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(numberResult.current).toBe(42);

    // Boolean
    const { result: boolResult, rerender: boolRerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 100),
      { initialProps: { value: false } }
    );

    boolRerender({ value: true });
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(boolResult.current).toBe(true);

    // Object
    const { result: objResult, rerender: objRerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 100),
      { initialProps: { value: { key: 'initial' } } }
    );

    objRerender({ value: { key: 'updated' } });
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(objResult.current).toEqual({ key: 'updated' });
  });

  it('cleans up timeout on unmount', () => {
    const { unmount, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 300),
      { initialProps: { value: 'initial' } }
    );

    rerender({ value: 'updated' });

    // Unmount before debounce completes
    unmount();

    // Should not throw error when trying to update after unmount
    expect(() => {
      act(() => {
        vi.advanceTimersByTime(300);
      });
    }).not.toThrow();
  });
});

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns value, setValue, and debouncedValue', () => {
    const { result } = renderHook(() => useDebounce('initial'));

    expect(result.current).toHaveProperty('value');
    expect(result.current).toHaveProperty('setValue');
    expect(result.current).toHaveProperty('debouncedValue');
  });

  it('initializes with provided value', () => {
    const { result } = renderHook(() => useDebounce('initial'));

    expect(result.current.value).toBe('initial');
    expect(result.current.debouncedValue).toBe('initial');
  });

  it('updates value immediately but debounces debouncedValue', () => {
    const { result } = renderHook(() => useDebounce('initial', 300));

    // Update value
    act(() => {
      result.current.setValue('updated');
    });

    // Value updates immediately
    expect(result.current.value).toBe('updated');

    // Debounced value still has old value
    expect(result.current.debouncedValue).toBe('initial');

    // Fast-forward time
    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Debounced value now updated
    expect(result.current.debouncedValue).toBe('updated');
  });

  it('allows multiple rapid updates', () => {
    const { result } = renderHook(() => useDebounce('initial', 300));

    act(() => {
      result.current.setValue('update1');
    });
    act(() => {
      vi.advanceTimersByTime(100);
    });

    act(() => {
      result.current.setValue('update2');
    });
    act(() => {
      vi.advanceTimersByTime(100);
    });

    act(() => {
      result.current.setValue('final');
    });

    // Current value should be final
    expect(result.current.value).toBe('final');
    // Debounced value should still be initial
    expect(result.current.debouncedValue).toBe('initial');

    // Complete debounce
    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Both should now be final
    expect(result.current.value).toBe('final');
    expect(result.current.debouncedValue).toBe('final');
  });

  it('uses default delay of 300ms', () => {
    const { result } = renderHook(() => useDebounce('initial'));

    act(() => {
      result.current.setValue('updated');
    });

    act(() => {
      vi.advanceTimersByTime(299);
    });
    expect(result.current.debouncedValue).toBe('initial');

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current.debouncedValue).toBe('updated');
  });

  it('handles custom delay', () => {
    const { result } = renderHook(() => useDebounce('initial', 500));

    act(() => {
      result.current.setValue('updated');
    });

    act(() => {
      vi.advanceTimersByTime(499);
    });
    expect(result.current.debouncedValue).toBe('initial');

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current.debouncedValue).toBe('updated');
  });

  describe('Real-world usage scenarios', () => {
    it('simulates search input debouncing', () => {
      const { result } = renderHook(() => useDebounce('', 300));

      // User types quickly
      act(() => {
        result.current.setValue('r');
      });
      act(() => {
        vi.advanceTimersByTime(50);
      });

      act(() => {
        result.current.setValue('re');
      });
      act(() => {
        vi.advanceTimersByTime(50);
      });

      act(() => {
        result.current.setValue('rea');
      });
      act(() => {
        vi.advanceTimersByTime(50);
      });

      act(() => {
        result.current.setValue('react');
      });

      // Current value shows full search term
      expect(result.current.value).toBe('react');
      // Debounced value still empty (no API call yet)
      expect(result.current.debouncedValue).toBe('');

      // User stops typing, debounce completes
      act(() => {
        vi.advanceTimersByTime(300);
      });

      // Now API call would be triggered with 'react'
      expect(result.current.debouncedValue).toBe('react');
    });
  });
});
