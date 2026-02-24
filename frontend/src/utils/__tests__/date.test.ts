import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { formatDate, formatShortDate, formatRelativeTime } from '../date';

describe('date utilities', () => {
  describe('formatDate', () => {
    it('formats Date object correctly', () => {
      const date = new Date('2024-01-15T10:30:00');
      const result = formatDate(date);
      expect(result).toMatch(/Jan 15, 2024/);
    });

    it('formats date string correctly', () => {
      const result = formatDate('2024-01-15T10:30:00');
      expect(result).toMatch(/Jan 15, 2024/);
    });

    it('includes time in output', () => {
      const date = new Date('2024-01-15T10:30:00');
      const result = formatDate(date);
      expect(result).toMatch(/10:30/);
    });
  });

  describe('formatShortDate', () => {
    it('formats Date object without time', () => {
      const date = new Date('2024-01-15T10:30:00');
      const result = formatShortDate(date);
      expect(result).toBe('Jan 15, 2024');
      expect(result).not.toMatch(/10:30/);
    });

    it('formats date string correctly', () => {
      const result = formatShortDate('2024-01-15T10:30:00');
      expect(result).toBe('Jan 15, 2024');
    });
  });

  describe('formatRelativeTime', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('returns "just now" for very recent dates', () => {
      const now = new Date('2024-01-15T10:30:00');
      vi.setSystemTime(now);

      const date = new Date('2024-01-15T10:29:30'); // 30 seconds ago
      const result = formatRelativeTime(date);
      expect(result).toBe('just now');
    });

    it('returns minutes for recent dates', () => {
      const now = new Date('2024-01-15T10:30:00');
      vi.setSystemTime(now);

      const date = new Date('2024-01-15T10:15:00'); // 15 minutes ago
      const result = formatRelativeTime(date);
      expect(result).toBe('15m ago');
    });

    it('returns hours for dates within 24 hours', () => {
      const now = new Date('2024-01-15T10:30:00');
      vi.setSystemTime(now);

      const date = new Date('2024-01-15T07:30:00'); // 3 hours ago
      const result = formatRelativeTime(date);
      expect(result).toBe('3h ago');
    });

    it('returns days for dates within 30 days', () => {
      const now = new Date('2024-01-15T10:30:00');
      vi.setSystemTime(now);

      const date = new Date('2024-01-10T10:30:00'); // 5 days ago
      const result = formatRelativeTime(date);
      expect(result).toBe('5d ago');
    });

    it('returns formatted date for dates older than 30 days', () => {
      const now = new Date('2024-03-15T10:30:00');
      vi.setSystemTime(now);

      const date = new Date('2024-01-15T10:30:00'); // 60 days ago
      const result = formatRelativeTime(date);
      expect(result).toBe('Jan 15, 2024');
    });

    it('handles string dates', () => {
      const now = new Date('2024-01-15T10:30:00');
      vi.setSystemTime(now);

      const result = formatRelativeTime('2024-01-15T10:15:00');
      expect(result).toBe('15m ago');
    });
  });
});
