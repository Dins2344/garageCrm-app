import { describe, it, expect } from '@jest/globals';
import { getErrorMessage } from './errors';

describe('getErrorMessage', () => {
  it('extracts a backend error message from an Axios-shaped error', () => {
    const error = { response: { data: { message: 'Phone already in use' } } };
    expect(getErrorMessage(error, 'fallback')).toBe('Phone already in use');
  });

  it('returns the fallback when the error has no usable message', () => {
    expect(getErrorMessage(new Error('network error'), 'fallback')).toBe('fallback');
    expect(getErrorMessage(null, 'fallback')).toBe('fallback');
    expect(getErrorMessage(undefined, 'fallback')).toBe('fallback');
  });
});
