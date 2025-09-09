// Performance optimizations for the research API
import { setTimeout as setTimeoutPromise } from 'timers/promises'

// Rate limiting and caching utilities
class APICache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>()
  
  set(key: string, data: any, ttlMs: number = 300000) { // 5 minute default TTL
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs
    })
  }
  
  get(key: string): any | null {
    const entry = this.cache.get(key)
    if (!entry) return null
    
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return null
    }
    
    return entry.data
  }
  
  clear() {
    this.cache.clear()
  }
}

// Rate limiter with exponential backoff
class RateLimiter {
  private requests: number[] = []
  private readonly maxRequests: number
  private readonly windowMs: number
  
  constructor(maxRequests = 10, windowMs = 60000) {
    this.maxRequests = maxRequests
    this.windowMs = windowMs
  }
  
  async waitIfNeeded(): Promise<void> {
    const now = Date.now()
    
    // Remove old requests outside the window
    this.requests = this.requests.filter(time => now - time < this.windowMs)
    
    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = Math.min(...this.requests)
      const waitTime = this.windowMs - (now - oldestRequest) + 1000 // Add 1s buffer
      console.log(`Rate limit reached, waiting ${waitTime}ms`)
      await setTimeoutPromise(waitTime)
    }
    
    this.requests.push(now)
  }
}

// Circuit breaker pattern
class CircuitBreaker {
  private failures = 0
  private lastFailureTime = 0
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED'
  
  constructor(
    private failureThreshold = 5,
    private timeoutMs = 60000,
    private retryTimeoutMs = 30000
  ) {}
  
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.retryTimeoutMs) {
        this.state = 'HALF_OPEN'
      } else {
        throw new Error('Circuit breaker is OPEN')
      }
    }
    
    try {
      const result = await fn()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }
  
  private onSuccess() {
    this.failures = 0
    this.state = 'CLOSED'
  }
  
  private onFailure() {
    this.failures++
    this.lastFailureTime = Date.now()
    
    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN'
    }
  }
}

// Optimized API caller with caching, rate limiting, and circuit breaking
export class OptimizedAPIClient {
  private cache = new APICache()
  private rateLimiter = new RateLimiter(8, 60000) // 8 requests per minute
  private circuitBreaker = new CircuitBreaker(3, 30000, 30000)
  
  async callWithOptimizations({
    model,
    prompt,
    cacheKey,
    timeoutMs = 45000, // Reduced from 120s to 45s
    retries = 3 // Increased back to 3 for better resilience with 503 errors
  }: {
    model: string
    prompt: string
    cacheKey?: string
    timeoutMs?: number
    retries?: number
  }): Promise<string> {
    
    // Check cache first
    if (cacheKey) {
      const cached = this.cache.get(cacheKey)
      if (cached) {
        console.log(`Cache hit for key: ${cacheKey}`)
        return cached
      }
    }
    
    // Apply rate limiting
    await this.rateLimiter.waitIfNeeded()
    
    // Execute with circuit breaker
    const result = await this.circuitBreaker.execute(async () => {
      return this.makeAPICall(model, prompt, timeoutMs, retries)
    })
    
    // Cache the result
    if (cacheKey) {
      this.cache.set(cacheKey, result)
    }
    
    return result
  }
  
  private async makeAPICall(
    model: string, 
    prompt: string, 
    timeoutMs: number, 
    retries: number
  ): Promise<string> {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
        
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
            "HTTP-Referer": process.env.YOUR_SITE_URL || "http://localhost:3000",
            "X-Title": process.env.YOUR_SITE_NAME || "Research Content Engine"
          },
          body: JSON.stringify({
            model: model,
            messages: [{ role: "user", content: prompt }],
            temperature: 0.1,
            max_tokens: 4000
          }),
          signal: controller.signal
        })
        
        clearTimeout(timeoutId)
        
        if (!response.ok) {
          let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
          
          // Provide better error messages for common status codes
          if (response.status === 503) {
            errorMessage = "Service temporarily unavailable. The AI service is experiencing high load. Please try again in a few moments.";
          } else if (response.status === 429) {
            errorMessage = "Rate limit exceeded. Please wait a moment before trying again.";
          } else if (response.status === 401) {
            errorMessage = "API authentication failed. Please check your API key configuration.";
          } else if (response.status === 500 || response.status === 502 || response.status === 504) {
            errorMessage = `Server error (${response.status}). The service is temporarily experiencing issues.`;
          }
          
          throw new Error(errorMessage);
        }
        
        const data = await response.json()
        return data.choices?.[0]?.message?.content || ""
        
      } catch (error: any) {
        console.error(`API call attempt ${attempt + 1} failed:`, error.message)
        
        // For 503 errors, always retry with longer delay
        const is503Error = error.message?.includes('503') || error.message?.includes('temporarily unavailable');
        const shouldRetry = attempt < retries || (is503Error && attempt < retries + 1);
        
        if (!shouldRetry) {
          throw error
        }
        
        // Longer delay for 503 errors
        let baseDelay = Math.pow(2, attempt) * 1000;
        if (is503Error) {
          baseDelay = Math.max(baseDelay, 5000); // At least 5 seconds for 503
        }
        
        const jitter = Math.random() * 1000
        const delay = baseDelay + jitter
        
        console.log(`Retrying after ${Math.round(delay)}ms (attempt ${attempt + 1}/${retries})...`)
        await setTimeoutPromise(delay)
      }
    }
    
    throw new Error("All retry attempts failed")
  }
  
  // Parallel execution utility
  async executeInParallel<T>(
    tasks: Array<() => Promise<T>>,
    concurrency = 3
  ): Promise<T[]> {
    const results: T[] = []
    
    for (let i = 0; i < tasks.length; i += concurrency) {
      const batch = tasks.slice(i, i + concurrency)
      const batchResults = await Promise.allSettled(
        batch.map(task => task())
      )
      
      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value)
        } else {
          console.error('Parallel task failed:', result.reason)
          throw result.reason
        }
      }
      
      // Add delay between batches to avoid overwhelming the API
      if (i + concurrency < tasks.length) {
        await setTimeoutPromise(2000)
      }
    }
    
    return results
  }
}

// Optimized JSON parsing with streaming and chunking
export class OptimizedJSONParser {
  private static readonly CHUNK_SIZE = 1024 * 1024 // 1MB chunks
  
  static async parseWithTimeout(
    text: string, 
    timeoutMs = 10000
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('JSON parsing timeout'))
      }, timeoutMs)
      
      try {
        // Pre-process in chunks for large texts
        if (text.length > this.CHUNK_SIZE) {
          const result = this.parseInChunks(text)
          clearTimeout(timeout)
          resolve(result)
        } else {
          const result = JSON.parse(text)
          clearTimeout(timeout)
          resolve(result)
        }
      } catch (error) {
        clearTimeout(timeout)
        reject(error)
      }
    })
  }
  
  private static parseInChunks(text: string): any {
    // Find JSON boundaries in large text
    const jsonStart = text.indexOf('{')
    const jsonEnd = text.lastIndexOf('}')
    
    if (jsonStart === -1 || jsonEnd === -1) {
      throw new Error('No valid JSON found in text')
    }
    
    const jsonText = text.substring(jsonStart, jsonEnd + 1)
    return JSON.parse(jsonText)
  }
  
  // Pre-compiled regex patterns for better performance
  private static readonly COMPILED_PATTERNS = {
    question: /"question"\s*:\s*"([^"]+)"[\s\S]*?"options"\s*:\s*\[([\s\S]*?)\]/g,
    url: /https?:\/\/[^\s"'<>()]+/g,
    jsonObject: /{(?:[^{}]|{(?:[^{}]|{[^{}]*})*})*}/g
  }
  
  static extractWithCompiledRegex(text: string, pattern: keyof typeof this.COMPILED_PATTERNS): RegExpMatchArray[] {
    return Array.from(text.matchAll(this.COMPILED_PATTERNS[pattern]))
  }
}

export { APICache, RateLimiter, CircuitBreaker }