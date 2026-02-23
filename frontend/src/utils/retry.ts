/**
 * Retry utility with exponential backoff
 */

export interface RetryOptions {
  maxRetries?: number
  initialDelay?: number
  maxDelay?: number
  backoffMultiplier?: number
  onRetry?: (attempt: number, error: unknown) => void
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2,
  onRetry: () => {}
}

/**
 * Execute a function with retry logic and exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  let lastError: unknown

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      // Don't retry on last attempt
      if (attempt === opts.maxRetries) {
        break
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        opts.initialDelay * Math.pow(opts.backoffMultiplier, attempt),
        opts.maxDelay
      )

      // Notify about retry
      opts.onRetry(attempt + 1, error)

      // Wait before retrying
      await sleep(delay)
    }
  }

  throw lastError
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Check if error is retryable (network errors, 5xx, timeouts)
 */
export function isRetryableError(error: unknown): boolean {
  // Axios error with retryable status
  if (isAxiosError(error)) {
    const status = error.response?.status

    // Retry on network errors
    if (!status) return true

    // Retry on server errors (5xx)
    if (status >= 500 && status < 600) return true

    // Retry on rate limits
    if (status === 429) return true

    return false
  }

  // Network errors
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    return (
      message.includes('network') ||
      message.includes('timeout') ||
      message.includes('fetch failed')
    )
  }

  return false
}

function isAxiosError(error: any): error is { response?: { status?: number } } {
  return error && typeof error === 'object' && 'response' in error
}
