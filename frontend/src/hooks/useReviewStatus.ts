import { useState, useEffect } from 'react'
import { prReviewService } from '../services'
import { ReviewStatus } from '../models'

interface UseReviewStatusResult {
  status: ReviewStatus | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

export function useReviewStatus(
  prId: string | null | undefined,
  reviewId: string | null | undefined
): UseReviewStatusResult {
  const [status, setStatus] = useState<ReviewStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchStatus = async () => {
    if (!prId || !reviewId) {
      setStatus(null)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const reviewStatus = await prReviewService.getReviewStatus(prId, reviewId)
      setStatus(reviewStatus)
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.detail || err.message || 'Failed to fetch review status'
      setError(errorMessage)
      setStatus(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()
  }, [prId, reviewId])

  return {
    status,
    loading,
    error,
    refresh: fetchStatus
  }
}
