/**
 * Extracts a backend-provided error message from an Axios error caught as
 * `unknown` (no `any` at the catch site), falling back to a caller-supplied
 * default when the shape doesn't match.
 */
export function getErrorMessage(error: unknown, fallback: string): string {
  if (
    error &&
    typeof error === 'object' &&
    'response' in error &&
    error.response &&
    typeof error.response === 'object' &&
    'data' in error.response &&
    error.response.data &&
    typeof error.response.data === 'object' &&
    'message' in error.response.data &&
    typeof error.response.data.message === 'string'
  ) {
    return error.response.data.message;
  }
  return fallback;
}
