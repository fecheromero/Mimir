import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { testCasesApi, jobsApi, prReviewsApi } from '../api';

// Use vi.hoisted to ensure mockApi is available during mock hoisting
const { mockApi } = vi.hoisted(() => {
  return {
    mockApi: {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    },
  };
});

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => mockApi),
  },
}));

describe('API services', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('testCasesApi', () => {
    describe('generate', () => {
      it('sends POST request with ticket description', async () => {
        const mockResponse = { data: { job_id: '123' } };
        mockApi.post.mockResolvedValue(mockResponse);

        const result = await testCasesApi.generate('Test ticket');

        expect(mockApi.post).toHaveBeenCalledWith(
          '/api/test-cases/generate',
          { ticket_description: 'Test ticket' }
        );
        expect(result).toEqual({ job_id: '123' });
      });
    });

    describe('execute', () => {
      it('sends POST request with test case and URL', async () => {
        const mockResponse = { data: { job_id: '456' } };
        mockApi.post.mockResolvedValue(mockResponse);

        await testCasesApi.execute(
          'Test case text',
          'https://example.com',
          null,
          null,
          true
        );

        expect(mockApi.post).toHaveBeenCalledWith(
          '/api/test-cases/execute',
          {
            test_case_text: 'Test case text',
            url: 'https://example.com',
            user_email: null,
            user_password: null,
            browser_mode: 'new',
            headless: true,
          }
        );
      });

      it('includes credentials when provided', async () => {
        const mockResponse = { data: { job_id: '456' } };
        mockApi.post.mockResolvedValue(mockResponse);

        await testCasesApi.execute(
          'Test case',
          'https://example.com',
          'user@test.com',
          'password123',
          false
        );

        expect(mockApi.post).toHaveBeenCalledWith(
          '/api/test-cases/execute',
          expect.objectContaining({
            user_email: 'user@test.com',
            user_password: 'password123',
            headless: false,
          })
        );
      });
    });

    describe('uploadAndExecute', () => {
      it('sends FormData with file', async () => {
        const mockFile = new File(['content'], 'test.json', {
          type: 'application/json',
        });
        const mockResponse = { data: { job_id: '789' } };
        mockApi.post.mockResolvedValue(mockResponse);

        await testCasesApi.uploadAndExecute(
          mockFile,
          'https://example.com',
          null,
          null,
          true
        );

        const callArgs = mockApi.post.mock.calls[0];
        const formData = callArgs[1];

        expect(callArgs[0]).toBe('/api/test-cases/upload-and-execute');
        expect(formData).toBeInstanceOf(FormData);
        expect(callArgs[2]).toEqual({
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      });
    });

    describe('replayActions', () => {
      it('sends POST request with actions and parameters', async () => {
        const mockActions = [{ type: 'click', selector: '#btn' }];
        const mockResponse = { data: { job_id: '999' } };
        mockApi.post.mockResolvedValue(mockResponse);

        await testCasesApi.replayActions(
          mockActions,
          'https://example.com',
          null,
          null,
          'Test case',
          'Expectations',
          'Expected result',
          false
        );

        expect(mockApi.post).toHaveBeenCalledWith(
          '/api/test-cases/replay-actions',
          {
            actions: mockActions,
            url: 'https://example.com',
            user_email: null,
            user_password: null,
            test_case_text: 'Test case',
            test_expectations: 'Expectations',
            expected_outcome: 'Expected result',
            browser_mode: 'new',
            headless: false,
          }
        );
      });
    });
  });

  describe('jobsApi', () => {
    describe('getStatus', () => {
      it('sends GET request for job status', async () => {
        const mockResponse = { data: { status: 'completed' } };
        mockApi.get.mockResolvedValue(mockResponse);

        const result = await jobsApi.getStatus('job123');

        expect(mockApi.get).toHaveBeenCalledWith('/api/jobs/job123/status');
        expect(result).toEqual({ status: 'completed' });
      });
    });

    describe('getTestCases', () => {
      it('sends GET request for test cases', async () => {
        const mockResponse = { data: { test_cases: [] } };
        mockApi.get.mockResolvedValue(mockResponse);

        await jobsApi.getTestCases('job123');

        expect(mockApi.get).toHaveBeenCalledWith('/api/jobs/job123/test-cases');
      });
    });

    describe('downloadFile', () => {
      it('returns download URL', () => {
        const url = jobsApi.downloadFile('job123', 'results');
        expect(url).toContain('/api/jobs/job123/download/results');
      });
    });
  });

  describe('prReviewsApi', () => {
    describe('watchPR', () => {
      it('sends POST request to watch PR', async () => {
        const mockResponse = { data: { success: true } };
        mockApi.post.mockResolvedValue(mockResponse);

        await prReviewsApi.watchPR('https://github.com/owner/repo/pull/1');

        expect(mockApi.post).toHaveBeenCalledWith('/api/pr-reviews/watch', {
          pr_url: 'https://github.com/owner/repo/pull/1',
        });
      });
    });

    describe('getPRDetails', () => {
      it('encodes PR ID in URL', async () => {
        const mockResponse = { data: { pr: {} } };
        mockApi.get.mockResolvedValue(mockResponse);

        await prReviewsApi.getPRDetails('owner/repo/123');

        expect(mockApi.get).toHaveBeenCalledWith(
          '/api/pr-reviews/owner%2Frepo%2F123'
        );
      });
    });

    describe('triggerReview', () => {
      it('sends POST request to trigger review', async () => {
        const mockResponse = { data: { review_id: 'abc' } };
        mockApi.post.mockResolvedValue(mockResponse);

        await prReviewsApi.triggerReview('owner/repo/123');

        expect(mockApi.post).toHaveBeenCalledWith(
          '/api/pr-reviews/owner%2Frepo%2F123/review',
          {
            pr_id: 'owner/repo/123',
            sync: true,
          }
        );
      });
    });

    describe('applyImprovements', () => {
      it('sends improvements with correct format', async () => {
        const improvements = [
          {
            id: 'imp1',
            file_path: 'src/file.ts',
            diff: '- old\n+ new',
            title: 'Fix typo',
            confidence: 'high',
          },
        ];
        const mockResponse = { data: { success: true } };
        mockApi.post.mockResolvedValue(mockResponse);

        await prReviewsApi.applyImprovements(
          'owner/repo/123',
          improvements,
          'Apply improvements',
          'review123'
        );

        expect(mockApi.post).toHaveBeenCalledWith(
          '/api/pr-reviews/owner%2Frepo%2F123/improvements/apply',
          {
            improvement_ids: ['imp1'],
            improvements: [
              {
                id: 'imp1',
                file_path: 'src/file.ts',
                diff: '- old\n+ new',
                title: 'Fix typo',
                confidence: 'high',
              },
            ],
            commit_message: 'Apply improvements',
            review_id: 'review123',
          }
        );
      });
    });

    describe('deleteReview', () => {
      it('sends DELETE request with encoded IDs', async () => {
        const mockResponse = { data: { success: true } };
        mockApi.delete.mockResolvedValue(mockResponse);

        await prReviewsApi.deleteReview('owner/repo/123', 'review456');

        expect(mockApi.delete).toHaveBeenCalledWith(
          '/api/pr-reviews/owner%2Frepo%2F123/reviews/review456'
        );
      });
    });
  });
});
