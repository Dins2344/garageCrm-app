/**
 * Extracts a backend-provided error message from an Axios error caught as
 * `unknown` (no `any` at the catch site), falling back to a caller-supplied
 * default when the shape doesn't match.
 */
export function getErrorMessage(error: unknown, fallback: string): string {
  const message = (error as { response?: { data?: { message?: unknown } } } | null)?.response?.data?.message;
  return typeof message === 'string' ? message : fallback;
}
