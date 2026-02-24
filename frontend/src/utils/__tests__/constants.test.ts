import { describe, it, expect } from 'vitest';
import {
  MODEL_PARSE_ERRORS,
  CONFIDENCE_THRESHOLDS,
  REVIEW_STATUS,
  PR_STATE,
  IMPROVEMENT_TYPE,
  IMPROVEMENT_CATEGORY,
  type ReviewStatusType,
  type PRStateType,
} from '../constants';

describe('constants', () => {
  describe('MODEL_PARSE_ERRORS', () => {
    it('has correct error messages', () => {
      expect(MODEL_PARSE_ERRORS.PULL_REQUEST).toBe('Failed to parse PullRequest data');
      expect(MODEL_PARSE_ERRORS.REVIEW).toBe('Failed to parse Review data');
      expect(MODEL_PARSE_ERRORS.IMPROVEMENT).toBe('Failed to parse Improvement data');
      expect(MODEL_PARSE_ERRORS.REVIEW_STATUS).toBe('Failed to parse ReviewStatus data');
    });
  });

  describe('CONFIDENCE_THRESHOLDS', () => {
    it('has correct threshold values', () => {
      expect(CONFIDENCE_THRESHOLDS.AUTO_APPLY).toBe(0.85);
      expect(CONFIDENCE_THRESHOLDS.HIGH).toBe(0.9);
      expect(CONFIDENCE_THRESHOLDS.MEDIUM).toBe(0.75);
    });

    it('has thresholds in descending order', () => {
      expect(CONFIDENCE_THRESHOLDS.HIGH).toBeGreaterThan(CONFIDENCE_THRESHOLDS.AUTO_APPLY);
      expect(CONFIDENCE_THRESHOLDS.AUTO_APPLY).toBeGreaterThan(CONFIDENCE_THRESHOLDS.MEDIUM);
    });
  });

  describe('REVIEW_STATUS', () => {
    it('has correct status values', () => {
      expect(REVIEW_STATUS.COMPLETED).toBe('completed');
      expect(REVIEW_STATUS.FAILED).toBe('failed');
      expect(REVIEW_STATUS.PENDING).toBe('pending');
      expect(REVIEW_STATUS.PROCESSING).toBe('processing');
      expect(REVIEW_STATUS.QUEUED).toBe('queued');
    });

    it('type matches actual values', () => {
      const status: ReviewStatusType = 'completed';
      expect(REVIEW_STATUS.COMPLETED).toBe(status);
    });
  });

  describe('PR_STATE', () => {
    it('has correct state values', () => {
      expect(PR_STATE.OPEN).toBe('open');
      expect(PR_STATE.CLOSED).toBe('closed');
      expect(PR_STATE.MERGED).toBe('merged');
    });

    it('type matches actual values', () => {
      const state: PRStateType = 'open';
      expect(PR_STATE.OPEN).toBe(state);
    });
  });

  describe('IMPROVEMENT_TYPE', () => {
    it('has all improvement types', () => {
      expect(IMPROVEMENT_TYPE.REMOVE_UNUSED_IMPORT).toBe('remove_unused_import');
      expect(IMPROVEMENT_TYPE.FIX_TYPO).toBe('fix_typo');
      expect(IMPROVEMENT_TYPE.REMOVE_DEBUG).toBe('remove_debug');
      expect(IMPROVEMENT_TYPE.REFACTOR).toBe('refactor');
      expect(IMPROVEMENT_TYPE.ARCHITECTURE).toBe('architecture');
      expect(IMPROVEMENT_TYPE.OTHER).toBe('other');
    });
  });

  describe('IMPROVEMENT_CATEGORY', () => {
    it('has all improvement categories', () => {
      expect(IMPROVEMENT_CATEGORY.DUMMY).toBe('dummy');
      expect(IMPROVEMENT_CATEGORY.MEDIUM).toBe('medium');
      expect(IMPROVEMENT_CATEGORY.EXPERIMENTAL).toBe('experimental');
    });
  });
});
