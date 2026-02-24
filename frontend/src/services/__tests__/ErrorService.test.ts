import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ErrorService, errorService } from '../ErrorService';

describe('ErrorService', () => {
  let consoleErrorSpy: any;
  let consoleWarnSpy: any;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  describe('singleton pattern', () => {
    it('returns the same instance', () => {
      const instance1 = ErrorService.getInstance();
      const instance2 = ErrorService.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('exports singleton as errorService', () => {
      expect(errorService).toBeInstanceOf(ErrorService);
    });
  });

  describe('handleError', () => {
    it('handles Error instance', () => {
      const error = new Error('Test error');
      const message = errorService.handleError(error);

      expect(message).toBe('Test error');
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error: Test error', error);
    });

    it('handles string error', () => {
      const message = errorService.handleError('String error');

      expect(message).toBe('String error');
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('handles Axios error with response data', () => {
      const axiosError = {
        response: {
          data: {
            detail: 'API error message',
          },
        },
        message: 'Request failed',
      };

      const message = errorService.handleError(axiosError);
      expect(message).toBe('API error message');
    });

    it('handles Axios error without response', () => {
      const axiosError = {
        message: 'Network error',
      };

      const message = errorService.handleError(axiosError);
      expect(message).toBe('Network error');
    });

    it('handles Axios error with no message or response', () => {
      const axiosError = {
        response: {},
      };

      const message = errorService.handleError(axiosError);
      expect(message).toBe('Network request failed');
    });

    it('handles unknown error type', () => {
      const message = errorService.handleError({ weird: 'object' });
      expect(message).toBe('An unexpected error occurred');
    });

    it('uses custom title', () => {
      const error = new Error('Test error');
      errorService.handleError(error, { title: 'Custom Title' });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Custom Title: Test error',
        error
      );
    });

    it('respects logToConsole = false', () => {
      const error = new Error('Test error');
      errorService.handleError(error, { logToConsole: false });

      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('shows toast warning when showToast = true', () => {
      const error = new Error('Test error');
      errorService.handleError(error, { showToast: true });

      expect(consoleWarnSpy).toHaveBeenCalledWith('Toast notification not yet implemented');
    });

    it('shows monitoring warning when reportToMonitoring = true', () => {
      const error = new Error('Test error');
      errorService.handleError(error, { reportToMonitoring: true });

      expect(consoleWarnSpy).toHaveBeenCalledWith('Error monitoring not yet implemented');
    });
  });

  describe('getStandardMessage', () => {
    it('returns network error message', () => {
      const message = errorService.getStandardMessage('network');
      expect(message).toBe('Network error. Please check your connection and try again.');
    });

    it('returns permission error message', () => {
      const message = errorService.getStandardMessage('permission');
      expect(message).toBe("You don't have permission to perform this action.");
    });

    it('returns not found error message', () => {
      const message = errorService.getStandardMessage('notfound');
      expect(message).toBe('The requested resource was not found.');
    });

    it('returns validation error message', () => {
      const message = errorService.getStandardMessage('validation');
      expect(message).toBe('Please check your input and try again.');
    });

    it('returns unknown error message', () => {
      const message = errorService.getStandardMessage('unknown');
      expect(message).toBe('Something went wrong. Please try again.');
    });
  });
});
