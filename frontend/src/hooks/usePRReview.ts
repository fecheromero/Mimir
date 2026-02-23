import { useState, useCallback } from 'react'
import { prReviewService } from '@services'
import { Review } from '@models'

interface UsePRReviewResult {
  review: Review | null
  loading: boolean
  error: string | null
  generateReview: (prId: string) => Promise<Review>
  loadReview: (prId: string, reviewId: string) => Promise<Review>
  deleteReview: (prId: string, reviewId: string) => Promise<void>
  approveSuggestion: (prId: string, reviewId: string, editedSuggestion?: string) => Promise<void>
  rejectSuggestion: (prId: string, reviewId: string, reason?: string) => Promise<void>
  reset: () => void
}

export function usePRReview(): UsePRReviewResult {
  const [review, setReview] = useState<Review | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generateReview = useCallback(async (prId: string): Promise<Review> => {
    try {
      setLoading(true)
      setError(null)

      const newReview = await prReviewService.triggerReview(prId)
      setReview(newReview)
      return newReview
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to generate review'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const loadReview = useCallback(async (prId: string, reviewId: string): Promise<Review> => {
    try {
      setLoading(true)
      setError(null)

      const loadedReview = await prReviewService.getReview(prId, reviewId)
      setReview(loadedReview)
      return loadedReview
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to load review'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const deleteReview = useCallback(async (prId: string, reviewId: string): Promise<void> => {
    try {
      setError(null)

      await prReviewService.deleteReview(prId, reviewId)

      if (review?.reviewId === reviewId) {
        setReview(null)
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to delete review'
      setError(errorMessage)
      throw err
    }
  }, [review])

  const approveSuggestion = useCallback(async (
    prId: string,
    reviewId: string,
    editedSuggestion?: string
  ): Promise<void> => {
    try {
      setError(null)

      await prReviewService.approveSuggestion(prId, reviewId, editedSuggestion)
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to approve suggestion'
      setError(errorMessage)
      throw err
    }
  }, [])

  const rejectSuggestion = useCallback(async (
    prId: string,
    reviewId: string,
    reason?: string
  ): Promise<void> => {
    try {
      setError(null)

      await prReviewService.rejectSuggestion(prId, reviewId, reason)
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to reject suggestion'
      setError(errorMessage)
      throw err
    }
  }, [])

  const reset = useCallback(() => {
    setReview(null)
    setError(null)
    setLoading(false)
  }, [])

  return {
    review,
    loading,
    error,
    generateReview,
    loadReview,
    deleteReview,
    approveSuggestion,
    rejectSuggestion,
    reset
  }
}
