import { isAxiosError } from 'axios';

/**
 * Represents a single error item returned by the backend.
 * Note: field name is in `message`, error description is in `error` (backend naming convention).
 *
 * @property error - The human-readable error description
 * @property message - The field name the error relates to
 * @property status - HTTP status code
 * @property timestamp - When the error occurred
 */
interface ApiErrorItem {
  error: string;
  message: string;
  status: number;
  timestamp: string;
}

const UNEXPECTED_ERROR =
  'An unexpected error occurred. Please contact an administrator if the problem persists.';

/**
 * Parses an unknown error from an API call into a human-readable string.
 * Handles four distinct failure scenarios:
 * - Unexpected code error (not from Axios)
 * - Network error (no response) — backend unreachable or timed out
 * - Server error (500+) — something crashed on the backend
 * - Client error (400/403) — validation or auth failure with descriptive message
 *
 * @param error - The unknown error caught in a try/catch block
 * @returns A human-readable error message safe to display to the user
 */
export function parseApiError(error: unknown): string {
  if (!isAxiosError(error)) return UNEXPECTED_ERROR;

  if (!error.response) {
    return 'Unable to connect. Please try again or contact an administrator if the problem persists.';
  }

  if (error.response.status >= 500) {
    return 'Something went wrong on our end. Please contact an administrator.';
  }

  // TODO [BMS-8]: Array of errors joined here is fine for login but not for register
  // register needs field-level error mapping via mapApiErrorsToForm()
  if (Array.isArray(error.response.data))
    return error.response.data.map((e: ApiErrorItem) => e.error).join(', ');

  return error.response.data?.error ?? UNEXPECTED_ERROR;
}
