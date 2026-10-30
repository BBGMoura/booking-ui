import { AxiosError, isAxiosError } from 'axios';
import { UseFormSetError, FieldValues, Path } from 'react-hook-form';

export const UNEXPECTED_ERROR =
  'An unexpected error occurred. Please contact an administrator if the problem persists.';

/**
 * Represents a single validation error returned by the backend.
 * Note: the naming is backwards — "message" is the field name and "error" is the human-readable message.
 * This is a backend naming issue we are not changing.
 */
interface ApiErrorItem {
  error: string;
  message: string;
}

/**
 * Turns any error into a human-readable string.
 * Used for network errors, server errors, and single error objects.
 *
 * Does NOT handle arrays of field validation errors — use isFieldValidationError
 * and setFieldErrors for those.
 */
export function parseApiError(error: unknown): string {
  if (!isAxiosError(error)) return UNEXPECTED_ERROR;
  if (!error.response)
    return 'Unable to connect. Please try again or contact an administrator if the problem persists.';
  if (error.response.status >= 500)
    return 'Something went wrong on our end. Please contact an administrator.';
  return error.response.data?.error ?? UNEXPECTED_ERROR;
}

/**
 * Checks if the exception is a backend field validation error array.
 *
 * The backend returns an array for validation errors like:
 * [{ error: "must not be blank", message: "password" }]
 *
 */
export function isFieldValidationError(
  exception: unknown
): exception is AxiosError<ApiErrorItem[]> {
  return isAxiosError(exception) && Array.isArray(exception.response?.data);
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
 * @param errors - Array of error objects from the backend
 * @param setError - react-hook-form's setError function from the form instance
 * @param validFields - Field names that exist in this form
 */
export function setFieldErrors<T extends FieldValues>(
  errors: ApiErrorItem[],
  setError: UseFormSetError<T>,
  validFields: Path<T>[]
): void {
  errors.forEach(({ error, message: fieldName }) => {
    if (validFields.includes(fieldName as Path<T>)) {
      setError(fieldName as Path<T>, { type: 'server', message: error });
    } else {
      setError('root', { message: error });
    }
  });
}
