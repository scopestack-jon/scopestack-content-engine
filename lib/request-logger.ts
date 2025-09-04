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

class VercelRequestLogger implements RequestLogger {
  private memoryLogs: RequestLogEntry[] = []
  private maxLogs = 1000 // Keep last 1000 entries in memory

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
    // In development, try to read from file first
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
    
    // Return from memory (Vercel production)
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


// Helper to get user info from ScopeStack authentication
export async function getScopeStackUserInfo(apiKey?: string, apiUrl?: string): Promise<{ userName?: string, accountSlug?: string }> {
  if (!apiKey) return {}
  
  try {
    const baseUrl = (apiUrl || 'https://api.scopestack.io').replace(/\/$/, '')
    const response = await fetch(`${baseUrl}/v1/me`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
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