import { describe, it, expect, vi, beforeEach } from 'vitest';
import { withRetry, isRetryableError } from '../retry';

describe('retry utilities', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  describe('withRetry', () => {
    it('succeeds on first attempt', async () => {
      const fn = vi.fn().mockResolvedValue('success');

      const result = await withRetry(fn);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('retries on failure and eventually succeeds', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error('fail 1'))
        .mockRejectedValueOnce(new Error('fail 2'))
        .mockResolvedValue('success');

      const promise = withRetry(fn);

      // Fast-forward through retries
      await vi.runAllTimersAsync();

      const result = await promise;

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('throws after max retries exceeded', async () => {
      const error = new Error('persistent failure');
      const fn = vi.fn().mockRejectedValue(error);

      const promise = withRetry(fn, { maxRetries: 2 });

      // Catch the rejection to prevent unhandled promise rejection warning
      promise.catch(() => {});

      // Fast-forward through retries
      await vi.runAllTimersAsync();

      await expect(promise).rejects.toThrow('persistent failure');
      expect(fn).toHaveBeenCalledTimes(3); // initial + 2 retries
    });

    it('uses exponential backoff', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('fail'));

      const promise = withRetry(fn, {
        maxRetries: 3,
        initialDelay: 1000,
        backoffMultiplier: 2,
      });

      // Catch the rejection to prevent unhandled promise rejection warning
      promise.catch(() => {});

      // Don't wait, just verify timing
      await vi.advanceTimersByTimeAsync(1000); // 1st retry after 1s
      await vi.advanceTimersByTimeAsync(2000); // 2nd retry after 2s
      await vi.advanceTimersByTimeAsync(4000); // 3rd retry after 4s

      await expect(promise).rejects.toThrow();
      expect(fn).toHaveBeenCalledTimes(4); // initial + 3 retries
    });

    it('respects maxDelay', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('fail'));

      withRetry(fn, {
        maxRetries: 5,
        initialDelay: 1000,
        backoffMultiplier: 10,
        maxDelay: 3000,
      });

      await vi.advanceTimersByTimeAsync(1000); // 1st: 1s
      await vi.advanceTimersByTimeAsync(3000); // 2nd: capped at 3s (not 10s)
      await vi.advanceTimersByTimeAsync(3000); // 3rd: capped at 3s

      expect(fn).toHaveBeenCalledTimes(4);
    });

    it('calls onRetry callback', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error('fail 1'))
        .mockResolvedValue('success');

      const onRetry = vi.fn();

      const promise = withRetry(fn, { onRetry });

      await vi.runAllTimersAsync();
      await promise;

      expect(onRetry).toHaveBeenCalledTimes(1);
      expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error));
    });
  });

  describe('isRetryableError', () => {
    it('identifies 500 errors as retryable', () => {
      const error = { response: { status: 500 } };
      expect(isRetryableError(error)).toBe(true);
    });

    it('identifies 503 errors as retryable', () => {
      const error = { response: { status: 503 } };
      expect(isRetryableError(error)).toBe(true);
    });

    it('identifies 429 rate limit as retryable', () => {
      const error = { response: { status: 429 } };
      expect(isRetryableError(error)).toBe(true);
    });

    it('identifies network errors as retryable', () => {
      const error = { response: undefined };
      expect(isRetryableError(error)).toBe(true);
    });

    it('identifies 400 errors as non-retryable', () => {
      const error = { response: { status: 400 } };
      expect(isRetryableError(error)).toBe(false);
    });

    it('identifies 404 errors as non-retryable', () => {
      const error = { response: { status: 404 } };
      expect(isRetryableError(error)).toBe(false);
    });

    it('identifies timeout errors by message', () => {
      const error = new Error('Request timeout');
      expect(isRetryableError(error)).toBe(true);
    });

    it('identifies network failure by message', () => {
      const error = new Error('Network request failed');
      expect(isRetryableError(error)).toBe(true);
    });

    it('identifies fetch failed by message', () => {
      const error = new Error('fetch failed');
      expect(isRetryableError(error)).toBe(true);
    });

    it('returns false for generic errors', () => {
      const error = new Error('Something went wrong');
      expect(isRetryableError(error)).toBe(false);
    });

    it('returns false for non-error values', () => {
      expect(isRetryableError('string error')).toBe(false);
      expect(isRetryableError(null)).toBe(false);
      expect(isRetryableError(undefined)).toBe(false);
    });
  });
});
