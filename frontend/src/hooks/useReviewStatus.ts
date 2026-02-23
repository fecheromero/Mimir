import { useState, useEffect } from 'react'
import { prReviewsApi } from '../services/api'

interface ImprovementStatus {
  id: string
  merged: boolean
}

interface ReviewStatus {
  review_id: string
  pr_id: string
  is_outdated: boolean
  review_head_sha: string
  current_head_sha: string
  improvements_status: ImprovementStatus[]
}

interface UseReviewStatusResult {
  status: ReviewStatus | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

export function useReviewStatus(
  prId: string | null,
  reviewId: string | null
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

      const data = await prReviewsApi.getReviewStatus(prId, reviewId)
      setStatus(data)
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
