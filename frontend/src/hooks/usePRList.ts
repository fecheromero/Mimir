import { useState, useEffect, useCallback } from 'react'
import { prReviewService } from '@services'
import { PullRequest } from '@models'

interface UsePRListResult {
  prs: PullRequest[]
  loading: boolean
  error: string | null
  watchPR: (prUrl: string) => Promise<void>
  unwatchPR: (prId: string) => Promise<void>
  refresh: () => Promise<void>
}

export function usePRList(): UsePRListResult {
  const [prs, setPRs] = useState<PullRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadPRs = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const watchedPRs = await prReviewService.getWatchedPRs()
      setPRs(watchedPRs)
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to load PRs'
      setError(errorMessage)
      setPRs([])
    } finally {
      setLoading(false)
    }
  }, [])

  const watchPR = useCallback(async (prUrl: string) => {
    setError(null)

    try {
      const newPR = await prReviewService.watchPR(prUrl)
      setPRs(prev => [newPR, ...prev])
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to watch PR'
      setError(errorMessage)
      throw err
    }
  }, [])

  const unwatchPR = useCallback(async (prId: string) => {
    setError(null)

    try {
      await prReviewService.unwatchPR(prId)
      setPRs(prev => prev.filter(pr => pr.id !== prId))
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to unwatch PR'
      setError(errorMessage)
      throw err
    }
  }, [])

  useEffect(() => {
    loadPRs()
  }, [loadPRs])

  return {
    prs,
    loading,
    error,
    watchPR,
    unwatchPR,
    refresh: loadPRs
  }
}
