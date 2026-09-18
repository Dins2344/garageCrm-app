import { useState, useEffect } from 'react';

/**
 * Delays updating the returned value until the input value
 * has stopped changing for `delay` milliseconds.
 *
 * @param value  - The value to debounce (typically a search string)
 * @param delay - Debounce delay in ms (default: 400ms)
 * @returns Debounced value
 */
export function useDebounce<T>(value: T, delay = 400): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Cancel the timer if value changes before delay elapses
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
