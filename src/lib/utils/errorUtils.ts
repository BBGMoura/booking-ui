import { AxiosError, isAxiosError } from 'axios';
import { UseFormSetError, FieldValues, Path } from 'react-hook-form';

export const UNEXPECTED_ERROR =
  'An unexpected error occurred. Please contact an administrator if the problem persists.';

/**
 * A single field-level validation error from the backend's `details` array.
 */
export interface ApiErrorDetail {
  field: string;
  message: string;
}

/**
 * The backend's error body (`ErrorModel`).
 * `error` is a machine-readable code (e.g. "INVALID_TOKEN"); `message` is human-readable.
 */
export interface ApiErrorBody {
  status?: number;
  error?: string;
  message?: string;
  details?: ApiErrorDetail[];
}

/**
 * Turns any error into a human-readable string.
 * Used for network errors, server errors, and backend error bodies (uses `message`).
 *
 * Does NOT handle field validation `details` — use isFieldValidationError
 * and setFieldErrors for those.
 */
export function parseApiError(error: unknown): string {
  if (!isAxiosError(error)) return UNEXPECTED_ERROR;
  if (!error.response)
    return 'Unable to connect. Please try again or contact an administrator if the problem persists.';
  if (error.response.status >= 500)
    return 'Something went wrong on our end. Please contact an administrator.';
  return error.response.data?.message ?? UNEXPECTED_ERROR;
}

/**
 * Checks if the exception is a backend error carrying field-level `details`, e.g.
 * { status: 400, error: "VALIDATION_ERROR", message: "...", details: [{ field: "password", message: "must not be blank" }] }
 */
export function isFieldValidationError(
  exception: unknown
): exception is AxiosError<ApiErrorBody & { details: ApiErrorDetail[] }> {
  if (!isAxiosError(exception)) return false;
  const details = (exception.response?.data as ApiErrorBody | undefined)?.details;
  return Array.isArray(details) && details.length > 0;
}

/**
 * Checks if the exception is a 403 Forbidden response.
 *
 * Used where a specific error (e.g. an invalid/expired token) needs its own
 * UI state rather than the generic root-error alert.
 */
export function isForbiddenError(exception: unknown): exception is AxiosError {
  return isAxiosError(exception) && exception.response?.status === 403;
}

/**
 * Maps backend field validation errors onto react-hook-form fields.
 *
 * For each error in the array:
 * - If the field name exists in validFields → sets error under that specific field
 * - If the field name doesn't exist in validFields → sets it as a root error for the alert box
 *
 * @param errors - The `details` array from the backend error body
 * @param setError - react-hook-form's setError function from the form instance
 * @param validFields - Field names that exist in this form
 */
export function setFieldErrors<T extends FieldValues>(
  errors: ApiErrorDetail[],
  setError: UseFormSetError<T>,
  validFields: Path<T>[]
): void {
  errors.forEach(({ field: fieldName, message }) => {
    if (validFields.includes(fieldName as Path<T>)) {
      setError(fieldName as Path<T>, { type: 'server', message });
    } else {
      setError('root', { message });
    }
  });
}

/**
 * Reads the machine-readable `error` code (e.g. "BOOKING_CONFLICT") and the HTTP
 * status from a backend error response, so callers can react to a specific failure.
 */
export function getApiErrorInfo(exception: unknown): { status?: number; code?: string } {
  if (!isAxiosError(exception)) return {};
  return {
    status: exception.response?.status,
    code: (exception.response?.data as ApiErrorBody | undefined)?.error,
  };
}
