import { useState, useEffect, useCallback } from 'react'
import { prReviewService } from '@services'
import { PullRequest } from '@models'
import { withRetry } from '../utils/retry'
import { errorService } from '@services/ErrorService'

interface UsePRListResult {
  prs: PullRequest[]
  loading: boolean
  error: string | null
  retrying: boolean
  watchPR: (prUrl: string) => Promise<void>
  unwatchPR: (prId: string) => Promise<void>
  refresh: () => Promise<void>
  retry: () => Promise<void>
}

export function usePRList(): UsePRListResult {
  const [prs, setPRs] = useState<PullRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retrying, setRetrying] = useState(false)

  const loadPRs = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const watchedPRs = await withRetry(
        () => prReviewService.getWatchedPRs(),
        {
          maxRetries: 2,
          onRetry: (attempt) => {
            console.log(`Retrying to load PRs (attempt ${attempt})...`)
            setRetrying(true)
          }
        }
      )

      setPRs(watchedPRs)
      setRetrying(false)
    } catch (err: any) {
      const errorMessage = errorService.handleError(err, {
        title: 'Failed to load PRs',
        logToConsole: true
      })
      setError(errorMessage)
      setPRs([])
      setRetrying(false)
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

  const retry = useCallback(async () => {
    await loadPRs()
  }, [loadPRs])

  return {
    prs,
    loading,
    error,
    retrying,
    watchPR,
    unwatchPR,
    refresh: loadPRs,
    retry
  }
}
