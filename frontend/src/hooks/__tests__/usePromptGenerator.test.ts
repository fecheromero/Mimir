import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePromptGenerator } from '../usePromptGenerator';

describe('usePromptGenerator', () => {
  const mockImprovement = {
    id: 'imp1',
    title: 'Fix typo in comment',
    description: 'Correct spelling error in function documentation',
    file_path: 'src/utils/helper.ts',
    line_start: 10,
    line_end: 15,
    type: 'typo',
    rationale: 'Improves code readability',
  };

  const mockPR = {
    title: 'Add new feature',
    repo: 'owner/repo',
    number: 123,
    author: 'developer',
    url: 'https://github.com/owner/repo/pull/123',
    base_branch: 'main',
    head_branch: 'feature/new-thing',
    body: 'This PR adds a new feature',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('generates prompt with PR context', () => {
    const { result } = renderHook(() =>
      usePromptGenerator(mockImprovement, mockPR, 'medium')
    );

    expect(result.current.prompt).toContain('PR Code Improvement Task');
    expect(result.current.prompt).toContain('owner/repo');
    expect(result.current.prompt).toContain('PR #123');
    expect(result.current.prompt).toContain('Add new feature');
    expect(result.current.prompt).toContain('developer');
  });

  it('includes improvement details', () => {
    const { result } = renderHook(() =>
      usePromptGenerator(mockImprovement, mockPR, 'medium')
    );

    expect(result.current.prompt).toContain('Fix typo in comment');
    expect(result.current.prompt).toContain('Correct spelling error');
    expect(result.current.prompt).toContain('src/utils/helper.ts:10-15');
  });

  it('includes rationale when provided', () => {
    const { result } = renderHook(() =>
      usePromptGenerator(mockImprovement, mockPR, 'medium')
    );

    expect(result.current.prompt).toContain('Rationale');
    expect(result.current.prompt).toContain('Improves code readability');
  });

  it('handles improvement without rationale', () => {
    const improvementNoRationale = { ...mockImprovement, rationale: undefined };

    const { result } = renderHook(() =>
      usePromptGenerator(improvementNoRationale, mockPR, 'medium')
    );

    expect(result.current.prompt).not.toContain('**Rationale**:');
  });

  it('formats multiple files correctly', () => {
    const improvementMultiFiles = {
      ...mockImprovement,
      files: ['src/file1.ts', 'src/file2.ts', 'src/file3.ts'],
    };

    const { result } = renderHook(() =>
      usePromptGenerator(improvementMultiFiles, mockPR, 'medium')
    );

    expect(result.current.prompt).toContain('src/file1.ts');
    expect(result.current.prompt).toContain('src/file2.ts');
    expect(result.current.prompt).toContain('src/file3.ts');
  });

  it('shows line range when available', () => {
    const { result } = renderHook(() =>
      usePromptGenerator(mockImprovement, mockPR, 'medium')
    );

    expect(result.current.prompt).toContain(':10-15');
  });

  it('handles improvement without line numbers', () => {
    const improvementNoLines = {
      ...mockImprovement,
      line_start: undefined,
      line_end: undefined,
    };

    const { result } = renderHook(() =>
      usePromptGenerator(improvementNoLines, mockPR, 'medium')
    );

    expect(result.current.prompt).toContain('src/utils/helper.ts');
    expect(result.current.prompt).not.toMatch(/:\d+-\d+/);
  });

  it('sets category label for medium complexity', () => {
    const { result } = renderHook(() =>
      usePromptGenerator(mockImprovement, mockPR, 'medium')
    );

    expect(result.current.prompt).toContain('Medium Complexity');
    expect(result.current.prompt).toContain('Moderate');
  });

  it('sets category label for experimental', () => {
    const { result } = renderHook(() =>
      usePromptGenerator(mockImprovement, mockPR, 'experimental')
    );

    expect(result.current.prompt).toContain('Experimental');
    expect(result.current.prompt).toContain('High');
  });

  it('includes current and suggested content when provided', () => {
    const improvementWithContent = {
      ...mockImprovement,
      current_content: 'const x = 1;',
      suggested_content: 'const x = 2;',
    };

    const { result } = renderHook(() =>
      usePromptGenerator(improvementWithContent, mockPR, 'medium')
    );

    expect(result.current.prompt).toContain('Current Implementation');
    expect(result.current.prompt).toContain('const x = 1;');
    expect(result.current.prompt).toContain('Suggested Implementation');
    expect(result.current.prompt).toContain('const x = 2;');
  });

  it('adds additional context when set', () => {
    const { result } = renderHook(() =>
      usePromptGenerator(mockImprovement, mockPR, 'medium')
    );

    act(() => {
      result.current.setAdditionalContext('This is custom context');
    });

    expect(result.current.additionalContext).toBe('This is custom context');
    expect(result.current.prompt).toContain('Additional Context');
    expect(result.current.prompt).toContain('This is custom context');
  });

  it('regenerates prompt when additional context changes', () => {
    const { result } = renderHook(() =>
      usePromptGenerator(mockImprovement, mockPR, 'medium')
    );

    const promptBefore = result.current.prompt;

    act(() => {
      result.current.setAdditionalContext('New context');
    });

    const promptAfter = result.current.prompt;

    expect(promptBefore).not.toEqual(promptAfter);
    expect(promptAfter).toContain('New context');
  });

  describe('copyToClipboard', () => {
    it('copies prompt to clipboard', async () => {
      const mockWriteText = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: {
          writeText: mockWriteText,
        },
      });

      const { result } = renderHook(() =>
        usePromptGenerator(mockImprovement, mockPR, 'medium')
      );

      expect(result.current.copied).toBe(false);

      await act(async () => {
        await result.current.copyToClipboard();
      });

      expect(mockWriteText).toHaveBeenCalledWith(result.current.prompt);
      expect(result.current.copied).toBe(true);
    });

    it('resets copied state after 2 seconds', async () => {
      vi.useFakeTimers();

      const mockWriteText = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: {
          writeText: mockWriteText,
        },
      });

      const { result } = renderHook(() =>
        usePromptGenerator(mockImprovement, mockPR, 'medium')
      );

      await act(async () => {
        await result.current.copyToClipboard();
      });

      expect(result.current.copied).toBe(true);

      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(result.current.copied).toBe(false);

      vi.useRealTimers();
    });

    it('handles clipboard API failure with fallback', async () => {
      const mockExecCommand = vi.fn().mockReturnValue(true);
      document.execCommand = mockExecCommand;

      Object.assign(navigator, {
        clipboard: {
          writeText: vi.fn().mockRejectedValue(new Error('Clipboard denied')),
        },
      });

      const { result } = renderHook(() =>
        usePromptGenerator(mockImprovement, mockPR, 'medium')
      );

      await act(async () => {
        await result.current.copyToClipboard();
      });

      expect(mockExecCommand).toHaveBeenCalledWith('copy');
      expect(result.current.copied).toBe(true);
    });
  });
});
