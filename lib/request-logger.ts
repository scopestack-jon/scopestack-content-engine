interface RequestLogEntry {
  id: string
  timestamp: string
  userRequest: string
  requestType: 'research' | 'push-to-scopestack' | 'test'
  userName?: string
  accountSlug?: string
  sessionId?: string
  status: 'started' | 'completed' | 'failed'
  duration?: number
  errorMessage?: string
}

interface RequestLogger {
  logRequest: (entry: Omit<RequestLogEntry, 'id' | 'timestamp'>) => Promise<void>
  getRequestLogs: (limit?: number) => Promise<RequestLogEntry[]>
}

// Persistent storage implementations
class UpstashStorage {
  private baseUrl: string
  private token: string

  constructor() {
    this.baseUrl = process.env.UPSTASH_REDIS_REST_URL || ''
    this.token = process.env.UPSTASH_REDIS_REST_TOKEN || ''
  }

  get isConfigured(): boolean {
    return !!(this.baseUrl && this.token)
  }

  async addLog(log: RequestLogEntry): Promise<void> {
    if (!this.isConfigured) return

    try {
      // Add to list with expiration
      await fetch(`${this.baseUrl}/lpush/scopestack-analytics`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify([JSON.stringify(log)])
      })

      // Trim list to keep only last 1000 entries
      await fetch(`${this.baseUrl}/ltrim/scopestack-analytics/0/999`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify([])
      })
    } catch (error) {
      console.warn('Failed to store log in Upstash:', error)
    }
  }

  async getLogs(limit: number = 100): Promise<RequestLogEntry[]> {
    if (!this.isConfigured) return []

    try {
      const response = await fetch(`${this.baseUrl}/lrange/scopestack-analytics/0/${limit - 1}`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify([])
      })

      const data = await response.json()
      if (data?.result && Array.isArray(data.result)) {
        return data.result.map((jsonStr: string) => JSON.parse(jsonStr)).reverse()
      }
    } catch (error) {
      console.warn('Failed to retrieve logs from Upstash:', error)
    }

    return []
  }
}

class JSONBinStorage {
  private binId: string
  private apiKey: string
  private baseUrl = 'https://api.jsonbin.io/v3/b'

  constructor() {
    this.binId = process.env.JSONBIN_BIN_ID || ''
    this.apiKey = process.env.JSONBIN_API_KEY || ''
  }

  get isConfigured(): boolean {
    return !!(this.binId && this.apiKey)
  }

  async addLog(log: RequestLogEntry): Promise<void> {
    if (!this.isConfigured) return

    try {
      // First get existing logs
      const existingLogs = await this.getLogs(999)
      
      // Add new log and keep only last 1000
      const updatedLogs = [...existingLogs, log].slice(-1000)
      
      // Update the bin
      await fetch(`${this.baseUrl}/${this.binId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Master-Key': this.apiKey
        },
        body: JSON.stringify({ logs: updatedLogs })
      })
    } catch (error) {
      console.warn('Failed to store log in JSONBin:', error)
    }
  }

  async getLogs(limit: number = 100): Promise<RequestLogEntry[]> {
    if (!this.isConfigured) return []

    try {
      const response = await fetch(`${this.baseUrl}/${this.binId}/latest`, {
        headers: { 'X-Master-Key': this.apiKey }
      })

      const data = await response.json()
      if (data?.record?.logs && Array.isArray(data.record.logs)) {
        return data.record.logs.slice(-limit)
      }
    } catch (error) {
      console.warn('Failed to retrieve logs from JSONBin:', error)
    }

    return []
  }
}

class VercelRequestLogger implements RequestLogger {
  private memoryLogs: RequestLogEntry[] = []
  private maxLogs = 1000 // Keep last 1000 entries in memory
  private upstash: UpstashStorage
  private jsonbin: JSONBinStorage

  constructor() {
    this.upstash = new UpstashStorage()
    this.jsonbin = new JSONBinStorage()
  }

  async logRequest(entry: Omit<RequestLogEntry, 'id' | 'timestamp'>): Promise<void> {
    const logEntry: RequestLogEntry = {
      id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      ...entry
    }

    // Always log to console for Vercel logs visibility
    console.log('📊 SOLUTION GENERATED:', {
      timestamp: logEntry.timestamp,
      user: logEntry.userName || 'Anonymous',
      account: logEntry.accountSlug || 'N/A', 
      request: logEntry.userRequest,
      duration: logEntry.duration ? `${logEntry.duration}ms` : 'N/A'
    })
    
    // Store in memory (limited retention)
    this.memoryLogs.push(logEntry)
    
    // Keep only recent logs to prevent memory issues
    if (this.memoryLogs.length > this.maxLogs) {
      this.memoryLogs = this.memoryLogs.slice(-this.maxLogs)
    }
    
    // Try persistent storage (fire and forget - don't block on errors)
    Promise.all([
      this.upstash.addLog(logEntry),
      this.jsonbin.addLog(logEntry)
    ]).catch(error => {
      console.warn('Failed to persist log:', error)
    })
    
    // In development, also write to file
    if (process.env.NODE_ENV === 'development') {
      try {
        const fs = require('fs').promises
        const logFile = '/tmp/scopestack-requests.jsonl'
        await fs.appendFile(logFile, JSON.stringify(logEntry) + '\n')
      } catch (error) {
        // Fail silently in case of file system issues
      }
    }
  }

  async getRequestLogs(limit = 100): Promise<RequestLogEntry[]> {
    // Try persistent storage first (Upstash, then JSONBin)
    if (this.upstash.isConfigured) {
      const logs = await this.upstash.getLogs(limit)
      if (logs.length > 0) return logs
    }

    if (this.jsonbin.isConfigured) {
      const logs = await this.jsonbin.getLogs(limit)
      if (logs.length > 0) return logs
    }

    // In development, try to read from file
    if (process.env.NODE_ENV === 'development') {
      try {
        const fs = require('fs').promises
        const data = await fs.readFile('/tmp/scopestack-requests.jsonl', 'utf8')
        const logs = data.trim().split('\n').map(line => JSON.parse(line))
        return logs.slice(-limit)
      } catch (error) {
        // Fall through to memory logs
      }
    }
    
    // Fallback to memory logs (won't persist in Vercel)
    return this.memoryLogs.slice(-limit)
  }
}

// Singleton instance
let logger: RequestLogger | null = null

export function getRequestLogger(): RequestLogger {
  if (!logger) {
    logger = new VercelRequestLogger()
  }
  return logger
}


// Helper to get user info from ScopeStack authentication (supports both API keys and OAuth tokens)
export async function getScopeStackUserInfo(authToken?: string, apiUrl?: string): Promise<{ userName?: string, accountSlug?: string }> {
  // If no token provided, try to get from OAuth session storage (browser only)
  if (!authToken && typeof window !== 'undefined') {
    try {
      const savedSession = localStorage.getItem('scopestack_session')
      if (savedSession) {
        const session = JSON.parse(savedSession)
        if (session.accessToken && session.expiresAt > Date.now()) {
          authToken = session.accessToken
        }
      }
    } catch (error) {
      // Ignore localStorage errors
    }
  }
  
  if (!authToken) return {}
  
  try {
    const baseUrl = (apiUrl || 'https://api.scopestack.io').replace(/\/$/, '')
    const response = await fetch(`${baseUrl}/v1/me`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Accept': 'application/vnd.api+json',
      },
    })
    
    if (response.ok) {
      const data = await response.json()
      if (data?.data?.attributes) {
        return {
          userName: data.data.attributes.name,
          accountSlug: data.data.attributes['account-slug']
        }
      }
    }
  } catch (error) {
    console.warn('Failed to get ScopeStack user info:', error)
  }
  
  return {}
}

// Helper to generate session ID from request headers
export function getSessionId(request: Request): string {
  const userAgent = request.headers.get('user-agent') || ''
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
  
  // Create a simple hash-based session ID (not for security, just for grouping)
  const sessionData = `${ip}-${userAgent}`
  let hash = 0
  for (let i = 0; i < sessionData.length; i++) {
    const char = sessionData.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  
  return `session_${Math.abs(hash)}`
}