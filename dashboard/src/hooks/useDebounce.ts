/**
 * useDebounce Hook
 * Debounces a value to reduce the frequency of updates
 * Used for search inputs and filter controls
 */

import { useState, useEffect } from 'react';

/**
 * Debounces a value by the specified delay
 * @param value - The value to debounce
 * @param delay - Delay in milliseconds (default: 300ms)
 * @returns The debounced value
 */
export function useDebouncedValue<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Set up the timeout
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Clean up the timeout if value changes before delay
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Alternative hook that returns both current and debounced values
 */
export function useDebounce<T>(initialValue: T, delay: number = 300) {
  const [value, setValue] = useState<T>(initialValue);
  const debouncedValue = useDebouncedValue(value, delay);

  return {
    value,
    setValue,
    debouncedValue,
  };
}
