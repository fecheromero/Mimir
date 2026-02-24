import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { usePRList } from '../usePRList';
import { prReviewService } from '@services';

const { mockPRReviewService } = vi.hoisted(() => {
  return {
    mockPRReviewService: {
      getWatchedPRs: vi.fn(),
      watchPR: vi.fn(),
      unwatchPR: vi.fn(),
    },
  };
});

vi.mock('@services', () => ({
  prReviewService: mockPRReviewService,
}));

vi.mock('@services/ErrorService', () => ({
  errorService: {
    handleError: vi.fn((err) => err.message || 'Error occurred'),
  },
}));

describe('usePRList', () => {
  const mockPRs = [
    {
      id: 'owner/repo/1',
      number: 1,
      title: 'Test PR 1',
      state: 'open',
      url: 'https://github.com/owner/repo/pull/1',
    },
    {
      id: 'owner/repo/2',
      number: 2,
      title: 'Test PR 2',
      state: 'open',
      url: 'https://github.com/owner/repo/pull/2',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('loads PRs on mount', async () => {
    mockPRReviewService.getWatchedPRs.mockResolvedValue(mockPRs);

    const { result } = renderHook(() => usePRList());

    expect(result.current.loading).toBe(true);
    expect(result.current.prs).toEqual([]);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.prs).toEqual(mockPRs);
    expect(result.current.error).toBeNull();
  });

  it('handles loading error', async () => {
    mockPRReviewService.getWatchedPRs.mockRejectedValue(
      new Error('Network error')
    );

    const { result } = renderHook(() => usePRList());

    await waitFor(
      () => {
        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBeTruthy();
      },
      { timeout: 10000 }
    );

    expect(result.current.prs).toEqual([]);
  });

  it('retries on failure', async () => {
    mockPRReviewService.getWatchedPRs
      .mockRejectedValueOnce(new Error('Fail 1'))
      .mockResolvedValue(mockPRs);

    const { result } = renderHook(() => usePRList());

    // Wait for initial load and retry
    await waitFor(
      () => {
        expect(result.current.loading).toBe(false);
        expect(result.current.prs).toEqual(mockPRs);
      },
      { timeout: 10000 }
    );

    // Should have been called at least 2 times (initial + retry)
    expect(mockPRReviewService.getWatchedPRs.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('sets retrying state during retry', async () => {
    mockPRReviewService.getWatchedPRs
      .mockRejectedValueOnce(new Error('Fail'))
      .mockResolvedValue(mockPRs);

    const { result } = renderHook(() => usePRList());

    // The retrying state should be set during the retry attempt
    await waitFor(
      () => {
        expect(result.current.retrying).toBe(true);
      },
      { timeout: 1000 }
    );

    // Eventually it should complete and clear the retrying state
    await waitFor(
      () => {
        expect(result.current.retrying).toBe(false);
        expect(result.current.loading).toBe(false);
      },
      { timeout: 3000 }
    );
  });

  describe('watchPR', () => {
    it('adds new PR to list', async () => {
      mockPRReviewService.getWatchedPRs.mockResolvedValue(mockPRs);

      const newPR = {
        id: 'owner/repo/3',
        number: 3,
        title: 'New PR',
        state: 'open',
        url: 'https://github.com/owner/repo/pull/3',
      };
      mockPRReviewService.watchPR.mockResolvedValue(newPR);

      const { result } = renderHook(() => usePRList());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await result.current.watchPR('https://github.com/owner/repo/pull/3');

      await waitFor(() => {
        expect(result.current.prs).toHaveLength(3);
      });
      expect(result.current.prs[0]).toEqual(newPR);
    });

    it('handles watch error', async () => {
      mockPRReviewService.getWatchedPRs.mockResolvedValue(mockPRs);
      mockPRReviewService.watchPR.mockRejectedValue(
        new Error('Failed to watch')
      );

      const { result } = renderHook(() => usePRList());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await expect(
        result.current.watchPR('https://github.com/owner/repo/pull/3')
      ).rejects.toThrow();

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });
      expect(result.current.prs).toHaveLength(2); // Original PRs unchanged
    });
  });

  describe('unwatchPR', () => {
    it('removes PR from list', async () => {
      mockPRReviewService.getWatchedPRs.mockResolvedValue(mockPRs);
      mockPRReviewService.unwatchPR.mockResolvedValue(undefined);

      const { result } = renderHook(() => usePRList());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await result.current.unwatchPR('owner/repo/1');

      await waitFor(() => {
        expect(result.current.prs).toHaveLength(1);
      });
      expect(result.current.prs[0].id).toBe('owner/repo/2');
    });

    it('handles unwatch error', async () => {
      mockPRReviewService.getWatchedPRs.mockResolvedValue(mockPRs);
      mockPRReviewService.unwatchPR.mockRejectedValue(
        new Error('Failed to unwatch')
      );

      const { result } = renderHook(() => usePRList());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await expect(result.current.unwatchPR('owner/repo/1')).rejects.toThrow();

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });
      expect(result.current.prs).toHaveLength(2); // PRs unchanged
    });
  });

  describe('refresh', () => {
    it('reloads PRs', async () => {
      mockPRReviewService.getWatchedPRs.mockResolvedValue(mockPRs);

      const { result } = renderHook(() => usePRList());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const updatedPRs = [...mockPRs, { id: 'owner/repo/3', number: 3 }];
      mockPRReviewService.getWatchedPRs.mockResolvedValue(updatedPRs as any);

      await result.current.refresh();

      await waitFor(() => {
        expect(result.current.prs).toHaveLength(3);
      });
    });
  });
});
