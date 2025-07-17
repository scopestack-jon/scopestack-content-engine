import { isRetryableError, logError, ScopeStackError, ErrorCode } from './errors';

export interface RetryOptions {
  maxAttempts?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  timeout?: number;
  retryCondition?: (error: unknown) => boolean;
  onRetry?: (attempt: number, error: unknown) => void;
}

export interface RetryState {
  attempt: number;
  totalAttempts: number;
  lastError: unknown;
  timeElapsed: number;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffFactor: 2,
  timeout: 60000, // 60 seconds
  retryCondition: isRetryableError,
  onRetry: () => {}
};

/**
 * Retry a function with exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const startTime = Date.now();
  let lastError: unknown;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      // Check timeout
      if (Date.now() - startTime > opts.timeout) {
        throw new ScopeStackError(
          ErrorCode.API_TIMEOUT,
          `Operation timed out after ${opts.timeout}ms`,
          { attempt, timeElapsed: Date.now() - startTime }
        );
      }

      return await fn();
    } catch (error) {
      lastError = error;
      
      // Log the error
      logError(error, {
        attempt,
        totalAttempts: opts.maxAttempts,
        timeElapsed: Date.now() - startTime
      });

      // Don't retry if this is the last attempt
      if (attempt === opts.maxAttempts) {
        break;
      }

      // Don't retry if the error is not retryable
      if (!opts.retryCondition(error)) {
        break;
      }

      // Call retry callback
      opts.onRetry(attempt, error);

      // Calculate delay with exponential backoff
      const delay = Math.min(
        opts.baseDelay * Math.pow(opts.backoffFactor, attempt - 1),
        opts.maxDelay
      );

      // Add jitter to prevent thundering herd
      const jitteredDelay = delay + Math.random() * delay * 0.1;

      await sleep(jitteredDelay);
    }
  }

  throw lastError;
}

/**
 * Retry specifically for API calls with intelligent error handling
 */
export async function retryAPICall<T>(
  fn: () => Promise<T>,
  stepName?: string,
  model?: string
): Promise<T> {
  return withRetry(fn, {
    maxAttempts: 3,
    baseDelay: 2000,
    maxDelay: 8000,
    retryCondition: (error) => {
      // Retry on network errors, timeouts, and 5xx responses
      if (error instanceof ScopeStackError) {
        return error.isRetryable;
      }
      
      if (error instanceof Error) {
        const message = error.message.toLowerCase();
        return message.includes('network') ||
               message.includes('timeout') ||
               message.includes('503') ||
               message.includes('502') ||
               message.includes('rate limit');
      }
      
      return false;
    },
    onRetry: (attempt, error) => {
      console.log(`🔄 Retrying ${stepName || 'API call'} (attempt ${attempt}):`, error);
    }
  });
}

/**
 * Circuit breaker pattern for preventing cascade failures
 */
export class CircuitBreaker {
  private failureCount = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(
    private readonly failureThreshold = 5,
    private readonly timeout = 60000, // 1 minute
    private readonly resetTimeout = 300000 // 5 minutes
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.resetTimeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new ScopeStackError(
          ErrorCode.API_NETWORK_ERROR,
          'Circuit breaker is OPEN - too many recent failures',
          { 
            failureCount: this.failureCount,
            lastFailureTime: this.lastFailureTime 
          }
        );
      }
    }

    try {
      const result = await Promise.race([
        fn(),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new ScopeStackError(
              ErrorCode.API_TIMEOUT,
              `Circuit breaker timeout after ${this.timeout}ms`
            )),
            this.timeout
          )
        )
      ]);

      // Success - reset failure count and close circuit
      this.failureCount = 0;
      this.state = 'CLOSED';
      return result;
    } catch (error) {
      this.failureCount++;
      this.lastFailureTime = Date.now();

      if (this.failureCount >= this.failureThreshold) {
        this.state = 'OPEN';
      }

      throw error;
    }
  }

  getState() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime
    };
  }

  reset() {
    this.failureCount = 0;
    this.lastFailureTime = 0;
    this.state = 'CLOSED';
  }
}

/**
 * Utility function for sleep/delay
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Batch retry for multiple operations
 */
export async function retryBatch<T>(
  operations: (() => Promise<T>)[],
  options: RetryOptions = {}
): Promise<Array<{ success: boolean; result?: T; error?: unknown }>> {
  const results = await Promise.allSettled(
    operations.map(op => withRetry(op, options))
  );

  return results.map(result => {
    if (result.status === 'fulfilled') {
      return { success: true, result: result.value };
    } else {
      return { success: false, error: result.reason };
    }
  });
}

/**
 * Retry with progress callback for long-running operations
 */
export async function retryWithProgress<T>(
  fn: () => Promise<T>,
  onProgress: (state: RetryState) => void,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const startTime = Date.now();
  let lastError: unknown;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      onProgress({
        attempt,
        totalAttempts: opts.maxAttempts,
        lastError,
        timeElapsed: Date.now() - startTime
      });

      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt === opts.maxAttempts || !opts.retryCondition(error)) {
        break;
      }

      const delay = Math.min(
        opts.baseDelay * Math.pow(opts.backoffFactor, attempt - 1),
        opts.maxDelay
      );

      await sleep(delay);
    }
  }

  throw lastError;
}