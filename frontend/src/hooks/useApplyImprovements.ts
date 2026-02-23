import { useState, useCallback } from 'react'
import { prReviewsApi } from '../services/api'

interface Improvement {
  id: string
  title: string
  file_path: string
  diff: string
  confidence: number
}

interface ApplyResult {
  success: boolean
  commit_sha?: string
  commit_url?: string
  files_changed?: number
  improvements_applied?: number
  message?: string
}

interface UseApplyImprovementsResult {
  applying: boolean
  error: string | null
  result: ApplyResult | null
  applyImprovements: (
    prId: string,
    improvements: Improvement[],
    commitMessage?: string,
    reviewId?: string
  ) => Promise<void>
  reset: () => void
}

export function useApplyImprovements(): UseApplyImprovementsResult {
  const [applying, setApplying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ApplyResult | null>(null)

  const applyImprovements = useCallback(
    async (
      prId: string,
      improvements: Improvement[],
      commitMessage?: string,
      reviewId?: string
    ) => {
      try {
        setApplying(true)
        setError(null)
        setResult(null)

        const response = await prReviewsApi.applyImprovements(
          prId,
          improvements,
          commitMessage,
          reviewId
        )

        setResult(response)
      } catch (err: any) {
        const errorMessage =
          err.response?.data?.detail || err.message || 'Failed to apply improvements'
        setError(errorMessage)
        setResult({ success: false })
      } finally {
        setApplying(false)
      }
    },
    []
  )

  const reset = useCallback(() => {
    setApplying(false)
    setError(null)
    setResult(null)
  }, [])

  return {
    applying,
    error,
    result,
    applyImprovements,
    reset
  }
}
