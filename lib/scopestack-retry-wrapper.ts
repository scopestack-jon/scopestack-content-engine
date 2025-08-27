interface RetryOptions {
  maxAttempts?: number
  delayMs?: number
  backoff?: boolean
  onRetry?: (attempt: number, error: any) => void
}

export class RetryableError extends Error {
  constructor(message: string, public originalError?: any) {
    super(message)
    this.name = 'RetryableError'
  }
}

export class NonRetryableError extends Error {
  constructor(message: string, public originalError?: any) {
    super(message)
    this.name = 'NonRetryableError'
  }
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    delayMs = 1000,
    backoff = true,
    onRetry = () => {},
  } = options

  let lastError: any

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error

      // Don't retry non-retryable errors
      if (error instanceof NonRetryableError) {
        throw error
      }

      // Check if it's a network or timeout error (retryable)
      const isRetryable = 
        error instanceof RetryableError ||
        (error instanceof Error && (
          error.message.includes('ECONNREFUSED') ||
          error.message.includes('ETIMEDOUT') ||
          error.message.includes('ENOTFOUND') ||
          error.message.includes('socket hang up') ||
          error.message.includes('Network request failed')
        )) ||
        (error?.response?.status && [429, 500, 502, 503, 504].includes(error.response.status))

      if (!isRetryable || attempt === maxAttempts) {
        throw error
      }

      // Calculate delay with optional exponential backoff
      const delay = backoff ? delayMs * Math.pow(2, attempt - 1) : delayMs

      // Call retry callback
      onRetry(attempt, error)

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError
}

export function createRetryableApiCall<T extends (...args: any[]) => Promise<any>>(
  apiCall: T,
  defaultOptions?: RetryOptions
): T {
  return (async (...args: Parameters<T>) => {
    return withRetry(() => apiCall(...args), defaultOptions)
  }) as T
}