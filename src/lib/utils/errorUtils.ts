import { AxiosError, isAxiosError } from 'axios';
import { UseFormSetError, FieldValues, Path } from 'react-hook-form';

export const UNEXPECTED_ERROR =
  'An unexpected error occurred. Please contact an administrator if the problem persists.';

interface ApiError {
  status: number;
  error: string;
  message: string;
  details: { field: string; message: string }[];
}

export function parseApiError(error: unknown): string {
  if (!isAxiosError(error)) return UNEXPECTED_ERROR;
  if (!error.response)
    return 'Unable to connect. Please try again or contact an administrator if the problem persists.';
  if (error.response.status >= 500)
    return 'Something went wrong on our end. Please contact an administrator.';
  return error.response.data?.message ?? UNEXPECTED_ERROR;
}

export function isFieldValidationError(
  exception: unknown
): exception is AxiosError<ApiError> {
  return (
    isAxiosError(exception) &&
    Array.isArray(exception.response?.data?.details) &&
    exception.response.data.details.length > 0
  );
}

/**
 * Maps backend field validation errors onto react-hook-form fields.
 *
 * For each item in details:
 * - If field exists in validFields → sets error under that specific field
 * - Otherwise → sets it as a root error for the alert box
 */
export function setFieldErrors<T extends FieldValues>(
  details: { field: string; message: string }[],
  setError: UseFormSetError<T>,
  validFields: Path<T>[]
): void {
  details.forEach(({ field, message }) => {
    if (validFields.includes(field as Path<T>)) {
      setError(field as Path<T>, { type: 'server', message });
    } else {
      setError('root', { message });
    }
  });
}
