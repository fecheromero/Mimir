// Model parsing error messages
export const MODEL_PARSE_ERRORS = {
  PULL_REQUEST: 'Failed to parse PullRequest data',
  REVIEW: 'Failed to parse Review data',
  IMPROVEMENT: 'Failed to parse Improvement data',
  REVIEW_STATUS: 'Failed to parse ReviewStatus data'
}

// Improvement confidence thresholds
export const CONFIDENCE_THRESHOLDS = {
  AUTO_APPLY: 0.85,
  HIGH: 0.9,
  MEDIUM: 0.75
}

// Review statuses
export const REVIEW_STATUS = {
  COMPLETED: 'completed',
  FAILED: 'failed',
  PENDING: 'pending',
  PROCESSING: 'processing',
  QUEUED: 'queued'
} as const

export type ReviewStatusType = typeof REVIEW_STATUS[keyof typeof REVIEW_STATUS]

// PR states
export const PR_STATE = {
  OPEN: 'open',
  CLOSED: 'closed',
  MERGED: 'merged'
} as const

export type PRStateType = typeof PR_STATE[keyof typeof PR_STATE]

// Improvement types
export const IMPROVEMENT_TYPE = {
  REMOVE_UNUSED_IMPORT: 'remove_unused_import',
  FIX_TYPO: 'fix_typo',
  REMOVE_DEBUG: 'remove_debug',
  REFACTOR: 'refactor',
  ARCHITECTURE: 'architecture',
  OTHER: 'other'
} as const

// Improvement categories
export const IMPROVEMENT_CATEGORY = {
  DUMMY: 'dummy',
  MEDIUM: 'medium',
  EXPERIMENTAL: 'experimental'
} as const
