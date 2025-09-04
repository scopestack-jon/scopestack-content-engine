interface RequestLogEntry {
  id: string
  timestamp: string
  userRequest: string
  requestType: 'research' | 'push-to-scopestack' | 'test'
  userId?: string
  sessionId?: string
  status: 'started' | 'completed' | 'failed'
  duration?: number
  errorMessage?: string
  technology?: string
  metadata?: {
    sourcesFound?: number
    servicesGenerated?: number
    contentLength?: number
    pushedToScopeStack?: boolean
    [key: string]: any
  }
}

interface RequestLogger {
  logRequest: (entry: Omit<RequestLogEntry, 'id' | 'timestamp'>) => Promise<void>
  updateRequestStatus: (id: string, status: RequestLogEntry['status'], metadata?: any) => Promise<void>
  getRequestLogs: (limit?: number) => Promise<RequestLogEntry[]>
  getAnalytics: () => Promise<{
    totalRequests: number
    completedRequests: number
    failedRequests: number
    popularTechnologies: Array<{ technology: string; count: number }>
    averageDuration: number
    requestsByDay: Array<{ date: string; count: number }>
  }>
}

class FileRequestLogger implements RequestLogger {
  private logFile = '/tmp/scopestack-requests.jsonl'

  async logRequest(entry: Omit<RequestLogEntry, 'id' | 'timestamp'>): Promise<void> {
    const logEntry: RequestLogEntry = {
      id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      ...entry
    }

    // In production, this would go to a database
    // For now, log to console and optionally to file in development
    console.log('📊 REQUEST LOG:', JSON.stringify(logEntry, null, 2))
    
    if (process.env.NODE_ENV === 'development') {
      try {
        const fs = require('fs').promises
        await fs.appendFile(this.logFile, JSON.stringify(logEntry) + '\n')
      } catch (error) {
        // Fail silently in case of file system issues
        console.warn('Failed to write to log file:', error)
      }
    }
  }

  async updateRequestStatus(id: string, status: RequestLogEntry['status'], metadata?: any): Promise<void> {
    const update = {
      id,
      timestamp: new Date().toISOString(),
      status,
      ...metadata
    }
    
    console.log('📊 REQUEST UPDATE:', JSON.stringify(update, null, 2))
  }

  async getRequestLogs(limit = 100): Promise<RequestLogEntry[]> {
    try {
      if (process.env.NODE_ENV === 'development') {
        const fs = require('fs').promises
        const data = await fs.readFile(this.logFile, 'utf8')
        const logs = data.trim().split('\n').map(line => JSON.parse(line))
        return logs.slice(-limit)
      }
    } catch (error) {
      // File doesn't exist or can't be read
    }
    return []
  }

  async getAnalytics() {
    const logs = await this.getRequestLogs(1000)
    
    const totalRequests = logs.length
    const completedRequests = logs.filter(l => l.status === 'completed').length
    const failedRequests = logs.filter(l => l.status === 'failed').length
    
    // Count technologies
    const techCounts: { [key: string]: number } = {}
    logs.forEach(log => {
      if (log.technology) {
        techCounts[log.technology] = (techCounts[log.technology] || 0) + 1
      }
    })
    const popularTechnologies = Object.entries(techCounts)
      .map(([technology, count]) => ({ technology, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // Calculate average duration
    const durationsMs = logs.filter(l => l.duration).map(l => l.duration!)
    const averageDuration = durationsMs.length > 0 
      ? durationsMs.reduce((a, b) => a + b, 0) / durationsMs.length 
      : 0

    // Group by day
    const dayGroups: { [key: string]: number } = {}
    logs.forEach(log => {
      const date = log.timestamp.split('T')[0]
      dayGroups[date] = (dayGroups[date] || 0) + 1
    })
    const requestsByDay = Object.entries(dayGroups)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date))

    return {
      totalRequests,
      completedRequests,
      failedRequests,
      popularTechnologies,
      averageDuration,
      requestsByDay
    }
  }
}

// Singleton instance
let logger: RequestLogger | null = null

export function getRequestLogger(): RequestLogger {
  if (!logger) {
    logger = new FileRequestLogger()
  }
  return logger
}

// Helper to extract technology from user request
export function extractTechnology(userRequest: string): string | undefined {
  const request = userRequest.toLowerCase()
  
  // Common technology patterns
  const techPatterns = [
    { pattern: /react|nextjs|next\.js/i, tech: 'React/Next.js' },
    { pattern: /vue|vuejs|vue\.js|nuxt/i, tech: 'Vue.js' },
    { pattern: /angular/i, tech: 'Angular' },
    { pattern: /svelte/i, tech: 'Svelte' },
    { pattern: /node\.js|nodejs|express/i, tech: 'Node.js' },
    { pattern: /python|django|flask|fastapi/i, tech: 'Python' },
    { pattern: /java|spring/i, tech: 'Java' },
    { pattern: /php|laravel/i, tech: 'PHP' },
    { pattern: /ruby|rails/i, tech: 'Ruby' },
    { pattern: /go|golang/i, tech: 'Go' },
    { pattern: /rust/i, tech: 'Rust' },
    { pattern: /kotlin/i, tech: 'Kotlin' },
    { pattern: /swift|ios/i, tech: 'Swift/iOS' },
    { pattern: /android/i, tech: 'Android' },
    { pattern: /flutter|dart/i, tech: 'Flutter/Dart' },
    { pattern: /react native/i, tech: 'React Native' },
    { pattern: /docker|container/i, tech: 'Docker' },
    { pattern: /kubernetes|k8s/i, tech: 'Kubernetes' },
    { pattern: /aws|amazon web services/i, tech: 'AWS' },
    { pattern: /azure/i, tech: 'Azure' },
    { pattern: /gcp|google cloud/i, tech: 'Google Cloud' },
    { pattern: /terraform/i, tech: 'Terraform' },
    { pattern: /mongodb|mongo/i, tech: 'MongoDB' },
    { pattern: /postgresql|postgres/i, tech: 'PostgreSQL' },
    { pattern: /mysql/i, tech: 'MySQL' },
    { pattern: /redis/i, tech: 'Redis' },
    { pattern: /graphql/i, tech: 'GraphQL' },
    { pattern: /api|rest/i, tech: 'API Development' },
    { pattern: /machine learning|ml|ai/i, tech: 'Machine Learning' },
  ]

  for (const { pattern, tech } of techPatterns) {
    if (pattern.test(request)) {
      return tech
    }
  }

  return undefined
}

// Helper to generate session ID from request headers
export function getSessionId(request: Request): string {
  // Try to get a session identifier from headers or generate one
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