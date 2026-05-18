import { AxiosError } from 'axios';
import { parseApiError, isFieldValidationError, setFieldErrors } from '@/lib/utils/errorUtils';
import { UseFormSetError } from 'react-hook-form';

function mockAxiosError(status: number, data: unknown): AxiosError {
  return {
    isAxiosError: true,
    response: { status, data, headers: {}, config: {} as never, statusText: '' },
    message: 'Request failed',
    name: 'AxiosError',
    config: {} as never,
    toJSON: () => ({}),
  } as AxiosError;
}

function mockNetworkError(): AxiosError {
  return {
    isAxiosError: true,
    response: undefined,
    message: 'Network Error',
    name: 'AxiosError',
    config: {} as never,
    toJSON: () => ({}),
  } as AxiosError;
}

const UNEXPECTED_ERROR =
  'An unexpected error occurred. Please contact an administrator if the problem persists.';
const UNABLE_TO_CONNECT =
  'Unable to connect. Please try again or contact an administrator if the problem persists.';
const SERVER_ERROR = 'Something went wrong on our end. Please contact an administrator.';

describe('parseApiError()', () => {
  describe('non-Axios errors', () => {
    it('returns unexpected error for a plain JS error', () => {
      expect(parseApiError(new Error('Some JS error'))).toBe(UNEXPECTED_ERROR);
    });

    it('returns unexpected error for a string', () => {
      expect(parseApiError('a string error')).toBe(UNEXPECTED_ERROR);
    });

    it('returns unexpected error for null', () => {
      expect(parseApiError(null)).toBe(UNEXPECTED_ERROR);
    });
  });

  describe('network errors', () => {
    it('returns unable to connect when there is no response', () => {
      expect(parseApiError(mockNetworkError())).toBe(UNABLE_TO_CONNECT);
    });
  });

  describe('server errors', () => {
    it('returns server error message for 500 status', () => {
      expect(parseApiError(mockAxiosError(500, {}))).toBe(SERVER_ERROR);
    });

    it('returns server error message for 503 status', () => {
      expect(parseApiError(mockAxiosError(503, {}))).toBe(SERVER_ERROR);
    });
  });

  describe('client errors', () => {
    it('returns the human-readable message field from the error response', () => {
      const data = {
        status: 403,
        error: 'INVALID_CREDENTIALS',
        message: 'Invalid username or password.',
        details: [],
      };
      expect(parseApiError(mockAxiosError(403, data))).toBe('Invalid username or password.');
    });

    it('returns unexpected error when response has no message field', () => {
      expect(parseApiError(mockAxiosError(400, {}))).toBe(UNEXPECTED_ERROR);
    });
  });
});

describe('isFieldValidationError()', () => {
  it('returns true for axios error with non-empty details array', () => {
    const data = {
      status: 400,
      error: 'VALIDATION_ERROR',
      message: 'Validation failed',
      details: [{ field: 'email', message: 'must not be blank' }],
    };
    expect(isFieldValidationError(mockAxiosError(400, data))).toBe(true);
  });

  it('returns false for axios error with empty details array', () => {
    const data = {
      status: 400,
      error: 'VALIDATION_ERROR',
      message: 'Validation failed',
      details: [],
    };
    expect(isFieldValidationError(mockAxiosError(400, data))).toBe(false);
  });

  it('returns false for axios error with no details field', () => {
    const error = mockAxiosError(403, { status: 403, error: 'INVALID_CREDENTIALS', message: 'Invalid credentials' });
    expect(isFieldValidationError(error)).toBe(false);
  });

  it('returns false for network error with no response', () => {
    expect(isFieldValidationError(mockNetworkError())).toBe(false);
  });

  it('returns false for a plain JS error', () => {
    expect(isFieldValidationError(new Error('something'))).toBe(false);
  });

  it('returns false for null', () => {
    expect(isFieldValidationError(null)).toBe(false);
  });
});

describe('setFieldErrors()', () => {
  it('calls setError for each field that exists in validFields', () => {
    const setError = jest.fn() as unknown as UseFormSetError<{ email: string; password: string }>;

    setFieldErrors([{ field: 'email', message: 'must not be blank' }], setError, [
      'email',
      'password',
    ]);

    expect(setError).toHaveBeenCalledWith('email', {
      type: 'server',
      message: 'must not be blank',
    });
  });

  it('calls setError with root for fields not in validFields', () => {
    const setError = jest.fn() as unknown as UseFormSetError<{ email: string }>;

    setFieldErrors([{ field: 'unknownField', message: 'something went wrong' }], setError, [
      'email',
    ]);

    expect(setError).toHaveBeenCalledWith('root', { message: 'something went wrong' });
  });

  it('handles multiple errors across multiple fields', () => {
    const setError = jest.fn() as unknown as UseFormSetError<{
      email: string;
      password: string;
    }>;

    setFieldErrors(
      [
        { field: 'email', message: 'must not be blank' },
        { field: 'password', message: 'must not be blank' },
      ],
      setError,
      ['email', 'password']
    );

    expect(setError).toHaveBeenCalledTimes(2);
    expect(setError).toHaveBeenCalledWith('email', {
      type: 'server',
      message: 'must not be blank',
    });
    expect(setError).toHaveBeenCalledWith('password', {
      type: 'server',
      message: 'must not be blank',
    });
  });

  it('maps known fields correctly and falls back to root for unknown fields', () => {
    const setError = jest.fn() as unknown as UseFormSetError<{ email: string }>;

    setFieldErrors(
      [
        { field: 'email', message: 'must not be blank' },
        { field: 'unknownField', message: 'unexpected error' },
      ],
      setError,
      ['email']
    );

    expect(setError).toHaveBeenCalledWith('email', {
      type: 'server',
      message: 'must not be blank',
    });
    expect(setError).toHaveBeenCalledWith('root', { message: 'unexpected error' });
  });
});
