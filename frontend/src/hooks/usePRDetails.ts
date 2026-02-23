import { useState, useEffect, useCallback } from 'react'
import { prReviewService } from '@services'
import { PullRequest, Review } from '@models'
import { errorService } from '@services/ErrorService'

interface ReviewListItem {
  review_id: string
  status: string
  created_at: string
  progress?: number
}

interface UsePRDetailsResult {
  pr: PullRequest | null
  reviews: ReviewListItem[]
  selectedReview: Review | null
  loading: boolean
  error: string | null
  retrying: boolean
  loadPRDetails: () => Promise<void>
  loadReviewContent: (reviewId: string) => Promise<void>
  generateReview: () => Promise<Review>
  deleteReview: (reviewId: string) => Promise<void>
  approveSuggestion: (editedSuggestion?: string) => Promise<void>
  rejectSuggestion: (reason?: string) => Promise<void>
  retry: () => Promise<void>
}

export function usePRDetails(prId: string): UsePRDetailsResult {
  const [pr, setPR] = useState<PullRequest | null>(null)
  const [reviews, setReviews] = useState<ReviewListItem[]>([])
  const [selectedReview, setSelectedReview] = useState<Review | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retrying, setRetrying] = useState(false)

  const loadPRDetails = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const data = await prReviewService.getPRDetails(prId)
      setPR(data.pr)
      setReviews(data.reviews || [])

      // Auto-select most recent review
      if (data.reviews && data.reviews.length > 0) {
        await loadReviewContent(data.reviews[0].review_id)
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to load PR details'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [prId])

  const loadReviewContent = useCallback(async (reviewId: string) => {
    try {
      const review = await prReviewService.getReview(prId, reviewId)
      setSelectedReview(review)
    } catch (err: any) {
      console.error('Error loading review content:', err)
    }
  }, [prId])

  const generateReview = useCallback(async (): Promise<Review> => {
    try {
      setError(null)

      const result = await prReviewService.triggerReview(prId)

      // Reload PR details to show new review
      await loadPRDetails()

      // Auto-select the new review
      if (result.reviewId) {
        await loadReviewContent(result.reviewId)
      }

      return result
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to generate review'
      setError(errorMessage)
      throw err
    }
  }, [prId, loadPRDetails, loadReviewContent])

  const deleteReview = useCallback(async (reviewId: string) => {
    // Optimistic update - remove review immediately
    const previousReviews = [...reviews]
    const previousSelectedReview = selectedReview

    try {
      // Update UI optimistically
      setReviews(prev => prev.filter(r => r.review_id !== reviewId))
      if (selectedReview?.reviewId === reviewId) {
        setSelectedReview(null)
      }

      // Make API call
      await prReviewService.deleteReview(prId, reviewId)
    } catch (err: any) {
      // Rollback on failure
      setReviews(previousReviews)
      setSelectedReview(previousSelectedReview)

      const errorMessage = errorService.handleError(err, {
        title: 'Failed to delete review',
        logToConsole: true
      })
      setError(errorMessage)
      throw err
    }
  }, [prId, reviews, selectedReview])

  const approveSuggestion = useCallback(async (editedSuggestion?: string) => {
    if (!selectedReview) {
      throw new Error('No review selected')
    }

    try {
      await prReviewService.approveSuggestion(prId, selectedReview.reviewId, editedSuggestion)

      // Reload review to update suggestion status
      await loadReviewContent(selectedReview.reviewId)
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to approve suggestion'
      throw new Error(errorMessage)
    }
  }, [prId, selectedReview, loadReviewContent])

  const rejectSuggestion = useCallback(async (reason?: string) => {
    if (!selectedReview) {
      throw new Error('No review selected')
    }

    try {
      await prReviewService.rejectSuggestion(prId, selectedReview.reviewId, reason)

      // Reload review to update suggestion status
      await loadReviewContent(selectedReview.reviewId)
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to reject suggestion'
      throw new Error(errorMessage)
    }
  }, [prId, selectedReview, loadReviewContent])

  useEffect(() => {
    loadPRDetails()
  }, [loadPRDetails])

  const retry = useCallback(async () => {
    setRetrying(true)
    try {
      await loadPRDetails()
    } finally {
      setRetrying(false)
    }
  }, [loadPRDetails])

  return {
    pr,
    reviews,
    selectedReview,
    loading,
    error,
    retrying,
    loadPRDetails,
    loadReviewContent,
    generateReview,
    deleteReview,
    approveSuggestion,
    rejectSuggestion,
    retry
  }
}
