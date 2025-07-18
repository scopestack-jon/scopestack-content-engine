// Live Research Engine - Real-time web research and validation
import { OptimizedAPIClient } from './api-optimizations'

interface LiveResearchSource {
  url: string
  title: string
  content: string
  relevance: string
  category: string
  isLive: boolean
  fetchedAt: string
  contentLength: number
  status: 'active' | 'inactive' | 'error'
}

interface LiveResearchResult {
  sources: LiveResearchSource[]
  totalSourcesChecked: number
  liveSourcesFound: number
  researchSummary: string
  insights: string[]
  lastUpdated: string
}

export class LiveResearchEngine {
  private apiClient = new OptimizedAPIClient()
  private knownSources: Map<string, string[]> = new Map()
  private userAgent = 'Mozilla/5.0 (compatible; ScopeStack Research Bot; +https://scopestack.com/bot)'
  
  constructor() {
    this.initializeKnownSources()
  }
  
  private initializeKnownSources() {
    // Real, verified documentation sources by technology
    this.knownSources.set('microsoft', [
      'https://learn.microsoft.com/en-us/microsoft-365/',
      'https://docs.microsoft.com/en-us/microsoft-365/',
      'https://techcommunity.microsoft.com/t5/microsoft-365/ct-p/microsoft365',
      'https://admin.microsoft.com/AdminPortal/',
      'https://compliance.microsoft.com/',
      'https://security.microsoft.com/',
      'https://adoption.microsoft.com/',
      'https://www.microsoft.com/en-us/microsoft-365/business'
    ])
    
    this.knownSources.set('aws', [
      'https://docs.aws.amazon.com/',
      'https://aws.amazon.com/getting-started/',
      'https://aws.amazon.com/architecture/',
      'https://aws.amazon.com/whitepapers/',
      'https://aws.amazon.com/solutions/',
      'https://aws.amazon.com/professional-services/',
      'https://repost.aws/',
      'https://aws.amazon.com/compliance/'
    ])
    
    this.knownSources.set('cisco', [
      'https://www.cisco.com/c/en/us/support/index.html',
      'https://developer.cisco.com/',
      'https://community.cisco.com/',
      'https://www.cisco.com/c/en/us/solutions/',
      'https://www.cisco.com/c/en/us/products/',
      'https://www.cisco.com/c/en/us/support/docs/',
      'https://learningnetwork.cisco.com/',
      'https://www.cisco.com/c/en/us/about/security-center.html'
    ])
    
    this.knownSources.set('google', [
      'https://cloud.google.com/docs/',
      'https://developers.google.com/',
      'https://workspace.google.com/resources/',
      'https://cloud.google.com/architecture/',
      'https://cloud.google.com/solutions/',
      'https://cloud.google.com/security/',
      'https://support.google.com/googlecloud/',
      'https://cloud.google.com/blog/'
    ])
    
    this.knownSources.set('oracle', [
      'https://docs.oracle.com/',
      'https://www.oracle.com/cloud/',
      'https://blogs.oracle.com/',
      'https://community.oracle.com/',
      'https://www.oracle.com/support/',
      'https://docs.cloud.oracle.com/',
      'https://www.oracle.com/security/',
      'https://www.oracle.com/solutions/'
    ])
    
    // Industry-specific sources
    this.knownSources.set('healthcare', [
      'https://www.hhs.gov/hipaa/',
      'https://www.healthit.gov/',
      'https://www.cms.gov/',
      'https://www.fda.gov/medical-devices/',
      'https://www.healthcareitnews.com/',
      'https://www.himss.org/',
      'https://www.ahima.org/',
      'https://www.healthcareinfosecurity.com/'
    ])
    
    this.knownSources.set('finance', [
      'https://www.sec.gov/',
      'https://www.finra.org/',
      'https://www.federalreserve.gov/',
      'https://www.fdic.gov/',
      'https://www.occ.gov/',
      'https://www.consumerfinance.gov/',
      'https://www.americanbanker.com/',
      'https://www.bankinfosecurity.com/'
    ])
  }
  
  async performLiveResearch(topic: string, industry?: string): Promise<LiveResearchResult> {
    console.log(`🔍 Starting LIVE research for: ${topic}`)
    
    try {
      // Step 1: Identify relevant source categories
      const vendors = this.detectVendors(topic)
      const industries = industry ? [industry] : this.detectIndustries(topic)
      
      console.log(`📊 Detected vendors: ${vendors.join(', ')}`)
      console.log(`🏢 Detected industries: ${industries.join(', ')}`)
      
      // Step 2: Build candidate URL list
      const candidateUrls = this.buildCandidateUrls(vendors, industries, topic)
      console.log(`🔗 Checking ${candidateUrls.length} candidate URLs...`)
      
      // Step 3: Perform live validation and content fetching
      const liveResults = await this.validateAndFetchSources(candidateUrls, topic)
      
      // Step 4: Generate research summary from live content
      const researchSummary = await this.generateResearchSummary(liveResults, topic)
      
      // Step 5: Extract insights from live content
      const insights = await this.extractInsights(liveResults, topic)
      
      console.log(`✅ Live research completed: ${liveResults.filter(r => r.isLive).length}/${liveResults.length} sources active`)
      
      return {
        sources: liveResults,
        totalSourcesChecked: candidateUrls.length,
        liveSourcesFound: liveResults.filter(r => r.isLive).length,
        researchSummary,
        insights,
        lastUpdated: new Date().toISOString()
      }
      
    } catch (error) {
      console.error('❌ Live research failed:', error)
      return this.generateEmergencyFallback(topic, industry)
    }
  }
  
  private detectVendors(topic: string): string[] {
    const topicLower = topic.toLowerCase()
    const vendors: string[] = []
    
    // Technology vendor detection
    if (topicLower.includes('office 365') || topicLower.includes('microsoft') || 
        topicLower.includes('azure') || topicLower.includes('teams')) {
      vendors.push('microsoft')
    }
    if (topicLower.includes('aws') || topicLower.includes('amazon web services')) {
      vendors.push('aws')
    }
    if (topicLower.includes('cisco') || topicLower.includes('networking')) {
      vendors.push('cisco')
    }
    if (topicLower.includes('google') || topicLower.includes('gcp') || 
        topicLower.includes('workspace')) {
      vendors.push('google')
    }
    if (topicLower.includes('oracle') || topicLower.includes('database')) {
      vendors.push('oracle')
    }
    
    return vendors
  }
  
  private detectIndustries(topic: string): string[] {
    const topicLower = topic.toLowerCase()
    const industries: string[] = []
    
    if (topicLower.includes('healthcare') || topicLower.includes('hospital') || 
        topicLower.includes('medical')) {
      industries.push('healthcare')
    }
    if (topicLower.includes('finance') || topicLower.includes('bank') || 
        topicLower.includes('financial')) {
      industries.push('finance')
    }
    
    return industries
  }
  
  private buildCandidateUrls(vendors: string[], industries: string[], topic: string): string[] {
    const candidateUrls: string[] = []
    
    // Add vendor-specific URLs
    for (const vendor of vendors) {
      const vendorUrls = this.knownSources.get(vendor) || []
      candidateUrls.push(...vendorUrls)
    }
    
    // Add industry-specific URLs
    for (const industry of industries) {
      const industryUrls = this.knownSources.get(industry) || []
      candidateUrls.push(...industryUrls)
    }
    
    // Add topic-specific URLs by searching known patterns
    const topicUrls = this.generateTopicSpecificUrls(topic, vendors)
    candidateUrls.push(...topicUrls)
    
    // Remove duplicates
    return [...new Set(candidateUrls)]
  }
  
  private generateTopicSpecificUrls(topic: string, vendors: string[]): string[] {
    const urls: string[] = []
    const topicSlug = topic.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '-')
    
    // Generate specific documentation URLs
    for (const vendor of vendors) {
      switch (vendor) {
        case 'microsoft':
          urls.push(
            `https://learn.microsoft.com/en-us/microsoft-365/${topicSlug}`,
            `https://docs.microsoft.com/en-us/microsoft-365/${topicSlug}`,
            `https://techcommunity.microsoft.com/t5/microsoft-365/${topicSlug}`
          )
          break
        case 'aws':
          urls.push(
            `https://docs.aws.amazon.com/${topicSlug}/`,
            `https://aws.amazon.com/solutions/${topicSlug}/`,
            `https://aws.amazon.com/getting-started/${topicSlug}/`
          )
          break
        case 'cisco':
          urls.push(
            `https://www.cisco.com/c/en/us/support/docs/${topicSlug}.html`,
            `https://www.cisco.com/c/en/us/solutions/${topicSlug}/`,
            `https://community.cisco.com/t5/${topicSlug}/`
          )
          break
      }
    }
    
    return urls
  }
  
  private async validateAndFetchSources(urls: string[], topic: string): Promise<LiveResearchSource[]> {
    const results: LiveResearchSource[] = []
    const concurrencyLimit = 5 // Don't overwhelm servers
    
    for (let i = 0; i < urls.length; i += concurrencyLimit) {
      const batch = urls.slice(i, i + concurrencyLimit)
      const batchResults = await Promise.allSettled(
        batch.map(url => this.fetchAndValidateUrl(url, topic))
      )
      
      for (const result of batchResults) {
        if (result.status === 'fulfilled' && result.value) {
          results.push(result.value)
        }
      }
      
      // Rate limiting - wait between batches
      if (i + concurrencyLimit < urls.length) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }
    
    return results
  }
  
  private async fetchAndValidateUrl(url: string, topic: string): Promise<LiveResearchSource | null> {
    try {
      console.log(`🔍 Checking: ${url}`)
      
      const response = await fetch(url, {
        method: 'HEAD', // Just check if URL exists first
        headers: {
          'User-Agent': this.userAgent
        },
        signal: AbortSignal.timeout(10000) // 10 second timeout
      })
      
      if (!response.ok) {
        console.log(`❌ ${url} - ${response.status}`)
        return null
      }
      
      // URL is live, now fetch content
      const contentResponse = await fetch(url, {
        headers: {
          'User-Agent': this.userAgent
        },
        signal: AbortSignal.timeout(15000) // 15 second timeout for content
      })
      
      if (!contentResponse.ok) {
        return null
      }
      
      const content = await contentResponse.text()
      const title = this.extractTitle(content) || this.generateTitleFromUrl(url)
      
      // Check if content is relevant to topic
      const relevance = this.calculateRelevance(content, topic)
      
      if (relevance < 0.3) { // Not relevant enough
        console.log(`⚠️  ${url} - Low relevance (${relevance.toFixed(2)})`)
        return null
      }
      
      console.log(`✅ ${url} - Live and relevant (${relevance.toFixed(2)})`)
      
      return {
        url,
        title,
        content: content.substring(0, 2000), // First 2000 chars
        relevance: `Relevance score: ${relevance.toFixed(2)} - ${this.describeRelevance(relevance)}`,
        category: this.categorizeSource(url),
        isLive: true,
        fetchedAt: new Date().toISOString(),
        contentLength: content.length,
        status: 'active'
      }
      
    } catch (error) {
      console.log(`❌ ${url} - Error: ${error.message}`)
      return null
    }
  }
  
  private extractTitle(html: string): string | null {
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    return titleMatch ? titleMatch[1].trim() : null
  }
  
  private generateTitleFromUrl(url: string): string {
    const parts = url.split('/')
    const domain = parts[2] || 'Unknown'
    const path = parts.slice(3).join('/') || 'Homepage'
    
    return `${domain} - ${path}`
  }
  
  private calculateRelevance(content: string, topic: string): number {
    const contentLower = content.toLowerCase()
    const topicLower = topic.toLowerCase()
    const topicWords = topicLower.split(/\s+/)
    
    let score = 0
    let wordCount = 0
    
    for (const word of topicWords) {
      if (word.length > 2) { // Skip short words
        const occurrences = (contentLower.match(new RegExp(word, 'g')) || []).length
        score += occurrences
        wordCount++
      }
    }
    
    // Normalize by content length and word count
    const normalizedScore = (score / Math.max(wordCount, 1)) / Math.max(content.length / 1000, 1)
    
    return Math.min(normalizedScore, 1.0) // Cap at 1.0
  }
  
  private describeRelevance(score: number): string {
    if (score >= 0.8) return 'Highly relevant'
    if (score >= 0.6) return 'Very relevant'
    if (score >= 0.4) return 'Moderately relevant'
    if (score >= 0.2) return 'Somewhat relevant'
    return 'Limited relevance'
  }
  
  private categorizeSource(url: string): string {
    const domain = url.split('/')[2]?.toLowerCase() || ''
    
    if (domain.includes('docs.') || domain.includes('learn.')) {
      return 'Official Documentation'
    }
    if (domain.includes('community') || domain.includes('forum')) {
      return 'Community Resource'
    }
    if (domain.includes('blog')) {
      return 'Blog/Article'
    }
    if (domain.includes('support')) {
      return 'Support Resource'
    }
    if (domain.includes('gov')) {
      return 'Government Resource'
    }
    
    return 'General Resource'
  }
  
  private async generateResearchSummary(sources: LiveResearchSource[], topic: string): Promise<string> {
    const liveSources = sources.filter(s => s.isLive)
    
    if (liveSources.length === 0) {
      return `No live sources found for ${topic}. Research may be limited.`
    }
    
    const combinedContent = liveSources
      .map(s => `${s.title}: ${s.content.substring(0, 500)}`)
      .join('\n\n')
    
    try {
      const summaryPrompt = `Based on live research content from ${liveSources.length} sources about "${topic}", 
      provide a comprehensive summary of current implementation approaches, best practices, and key considerations.
      
      Research Content:
      ${combinedContent}
      
      Focus on:
      1. Current implementation methodologies
      2. Key technical requirements
      3. Common challenges and solutions
      4. Best practices and recommendations
      
      Provide a concise but comprehensive summary (200-300 words).`
      
      const summary = await this.apiClient.callWithOptimizations({
        model: 'anthropic/claude-3.5-sonnet',
        prompt: summaryPrompt,
        cacheKey: `live_summary:${topic}`,
        timeoutMs: 30000
      })
      
      return summary
      
    } catch (error) {
      console.error('Failed to generate research summary:', error)
      return `Live research found ${liveSources.length} active sources for ${topic}. Manual review recommended.`
    }
  }
  
  private async extractInsights(sources: LiveResearchSource[], topic: string): Promise<string[]> {
    const liveSources = sources.filter(s => s.isLive)
    
    if (liveSources.length === 0) {
      return [`Limited insights available - no live sources accessible for ${topic}`]
    }
    
    const insights: string[] = []
    
    // Extract common patterns from live content
    const allContent = liveSources.map(s => s.content).join(' ')
    
    // Look for implementation patterns
    if (allContent.includes('implementation') || allContent.includes('deploy')) {
      insights.push(`Live research indicates active implementation guidance available from ${liveSources.length} sources`)
    }
    
    // Look for compliance patterns
    if (allContent.includes('compliance') || allContent.includes('regulation')) {
      insights.push('Current compliance and regulatory information found in live sources')
    }
    
    // Look for security patterns
    if (allContent.includes('security') || allContent.includes('encryption')) {
      insights.push('Security considerations and best practices documented in live sources')
    }
    
    // Add source-specific insights
    insights.push(`Documentation freshness: ${liveSources.length} sources actively maintained`)
    insights.push(`Content depth: ${Math.round(liveSources.reduce((sum, s) => sum + s.contentLength, 0) / 1000)}K characters of live content`)
    
    return insights
  }
  
  private generateEmergencyFallback(topic: string, industry?: string): LiveResearchResult {
    console.log('🚨 Using emergency fallback - live research failed')
    
    return {
      sources: [{
        url: 'https://research.fallback',
        title: `Emergency Fallback Research for ${topic}`,
        content: `Live research temporarily unavailable. This is a fallback response.`,
        relevance: 'Fallback content - live research failed',
        category: 'Emergency Fallback',
        isLive: false,
        fetchedAt: new Date().toISOString(),
        contentLength: 0,
        status: 'error'
      }],
      totalSourcesChecked: 0,
      liveSourcesFound: 0,
      researchSummary: `Live research for ${topic} is temporarily unavailable. Please try again later.`,
      insights: ['Live research system experiencing issues', 'Fallback content being used', 'Manual research recommended'],
      lastUpdated: new Date().toISOString()
    }
  }
}