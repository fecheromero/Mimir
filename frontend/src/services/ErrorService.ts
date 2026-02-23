/**
 * Centralized error handling service
 * Provides consistent error messages and optional error reporting
 */

export interface ErrorOptions {
  title?: string
  showToast?: boolean
  logToConsole?: boolean
  reportToMonitoring?: boolean
}

export class ErrorService {
  private static instance: ErrorService

  private constructor() {}

  static getInstance(): ErrorService {
    if (!ErrorService.instance) {
      ErrorService.instance = new ErrorService()
    }
    return ErrorService.instance
  }

  /**
   * Handle an error with consistent messaging
   */
  handleError(error: unknown, options: ErrorOptions = {}): string {
    const {
      title = 'Error',
      showToast = false,
      logToConsole = true,
      reportToMonitoring = false
    } = options

    const errorMessage = this.extractErrorMessage(error)
    const fullMessage = title ? `${title}: ${errorMessage}` : errorMessage

    if (logToConsole) {
      console.error(fullMessage, error)
    }

    if (showToast) {
      // TODO: Integrate with toast notification system
      // For now, we'll use the existing error state pattern
      console.warn('Toast notification not yet implemented')
    }

    if (reportToMonitoring) {
      // TODO: Integrate with error monitoring service (e.g., Sentry)
      console.warn('Error monitoring not yet implemented')
    }

    return errorMessage
  }

  /**
   * Extract user-friendly error message from various error types
   */
  private extractErrorMessage(error: unknown): string {
    // Axios error
    if (this.isAxiosError(error)) {
      return error.response?.data?.detail || error.message || 'Network request failed'
    }

    // Standard Error
    if (error instanceof Error) {
      return error.message
    }

    // String error
    if (typeof error === 'string') {
      return error
    }

    // Unknown error
    return 'An unexpected error occurred'
  }

  /**
   * Type guard for Axios errors
   */
  private isAxiosError(error: any): error is { response?: { data?: { detail?: string } }; message?: string } {
    return error && typeof error === 'object' && ('response' in error || 'message' in error)
  }

  /**
   * Create a user-friendly error message for common scenarios
   */
  getStandardMessage(scenario: 'network' | 'permission' | 'notfound' | 'validation' | 'unknown'): string {
    const messages = {
      network: 'Network error. Please check your connection and try again.',
      permission: 'You don\'t have permission to perform this action.',
      notfound: 'The requested resource was not found.',
      validation: 'Please check your input and try again.',
      unknown: 'Something went wrong. Please try again.'
    }

    return messages[scenario]
  }
}

// Export singleton instance
export const errorService = ErrorService.getInstance()
