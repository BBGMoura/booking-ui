import { AxiosError } from 'axios';
import { parseApiError } from '@/lib/utils/errorUtils';

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
    it('returns joined error messages for array of validation errors', () => {
      const data = [
        { error: 'must not be blank', message: 'lastName', status: 400, timestamp: '' },
        {
          error: 'Invalid phone number format',
          message: 'phoneNumber',
          status: 400,
          timestamp: '',
        },
      ];

      expect(parseApiError(mockAxiosError(400, data))).toBe(
        'must not be blank, Invalid phone number format'
      );
    });

    it('returns single error message for single error object', () => {
      const data = {
        error: 'Invalid username or password.',
        message: 'Bad credentials',
        status: 403,
        timestamp: '',
      };

      expect(parseApiError(mockAxiosError(403, data))).toBe('Invalid username or password.');
    });

    it('returns unexpected error when single error object has no error field', () => {
      expect(parseApiError(mockAxiosError(400, {}))).toBe(UNEXPECTED_ERROR);
    });
  });
});
