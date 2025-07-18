import { OptimizedAPIClient } from './api-optimizations';
import { withRetry } from './retry';

export interface ResearchSource {
  title: string;
  url: string;
  relevance: number;
  summary: string;
  sourceType: 'documentation' | 'guide' | 'tutorial' | 'whitepaper' | 'blog' | 'forum' | 'official' | 'community';
  credibility: 'high' | 'medium' | 'low';
  lastUpdated?: string;
  citations?: string[];
}

export interface ResearchResult {
  sources: ResearchSource[];
  totalSourcesFound: number;
  researchSummary: string;
  keyInsights: string[];
  gaps: string[];
  confidence: number;
}

export class ActiveResearchEngine {
  private apiClient: OptimizedAPIClient;
  private perplexityModel: string;
  
  constructor() {
    this.apiClient = new OptimizedAPIClient();
    this.perplexityModel = 'perplexity/llama-3.1-sonar-large-128k-online';
  }

  async performActiveResearch(
    topic: string,
    context: {
      industry?: string;
      technology?: string;
      scale?: string;
      compliance?: string[];
    } = {},
    targetSources: number = 10
  ): Promise<ResearchResult> {
    console.log(`🔍 Starting active research for: ${topic}`);
    
    try {
      // Phase 1: Initial source discovery with Perplexity
      const initialSources = await this.discoverSources(topic, context, targetSources);
      
      // Phase 2: Source validation and scoring
      const validatedSources = await this.validateSources(initialSources, topic);
      
      // Phase 3: Deep research on validated sources
      const enhancedSources = await this.enhanceSourcesWithContent(validatedSources, topic);
      
      // Phase 4: Generate research insights
      const insights = await this.generateResearchInsights(enhancedSources, topic, context);
      
      return {
        sources: enhancedSources,
        totalSourcesFound: enhancedSources.length,
        researchSummary: insights.summary,
        keyInsights: insights.insights,
        gaps: insights.gaps,
        confidence: this.calculateConfidence(enhancedSources)
      };
      
    } catch (error) {
      console.error('Active research failed:', error);
      throw new Error(`Research failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async discoverSources(
    topic: string, 
    context: any, 
    targetSources: number
  ): Promise<ResearchSource[]> {
    const contextString = this.buildContextString(context);
    
    const researchPrompt = `You are a research specialist tasked with finding the most current, authoritative, and relevant sources for the following topic.

TOPIC: ${topic}
CONTEXT: ${contextString}
TARGET: Find ${targetSources} high-quality, diverse sources

REQUIREMENTS:
1. Find REAL, accessible URLs (verify they exist)
2. Prioritize official documentation, authoritative guides, and recent content
3. Include a mix of source types: documentation, whitepapers, tutorials, community resources
4. Focus on sources from the last 2 years when possible
5. Ensure sources are directly relevant to the topic
6. Include credible industry sources and vendor documentation

For each source, provide:
- Exact title as it appears on the page
- Complete, working URL
- Brief summary of what the source covers
- Source type (documentation/guide/tutorial/whitepaper/blog/forum/official/community)
- Credibility level (high/medium/low)
- Relevance score (0.0-1.0)

Return your findings in this JSON format:
{
  "sources": [
    {
      "title": "exact title",
      "url": "complete working URL", 
      "summary": "what this source covers",
      "sourceType": "documentation",
      "credibility": "high",
      "relevance": 0.95
    }
  ],
  "searchStrategy": "brief explanation of your search approach",
  "coverage": "assessment of topic coverage completeness"
}

Focus on finding sources that collectively provide comprehensive coverage of the topic. Prioritize quality over quantity.`;

    const response = await withRetry(
      () => this.apiClient.callWithOptimizations({
        model: this.perplexityModel,
        prompt: researchPrompt,
        cacheKey: `research:${topic.substring(0, 50)}`,
        timeoutMs: 60000
      }),
      { maxAttempts: 3, baseDelay: 2000 }
    );

    return this.parseResearchResponse(response);
  }

  private async validateSources(sources: ResearchSource[], topic: string): Promise<ResearchSource[]> {
    console.log(`🔍 Validating ${sources.length} discovered sources...`);
    
    const validationPromises = sources.map(async (source) => {
      try {
        // Basic URL validation
        if (!this.isValidUrl(source.url)) {
          console.log(`❌ Invalid URL format: ${source.url}`);
          return null;
        }

        // Check if URL is accessible
        const isAccessible = await this.checkUrlAccessibility(source.url);
        if (!isAccessible) {
          console.log(`❌ URL not accessible: ${source.url}`);
          return null;
        }

        // Enhanced relevance validation with Perplexity
        const relevanceCheck = await this.validateRelevance(source, topic);
        
        return {
          ...source,
          relevance: relevanceCheck.relevance,
          summary: relevanceCheck.enhancedSummary || source.summary
        };
        
      } catch (error) {
        console.log(`❌ Source validation failed for ${source.url}:`, error);
        return null;
      }
    });

    const validationResults = await Promise.allSettled(validationPromises);
    const validatedSources = validationResults
      .filter((result): result is PromiseFulfilledResult<ResearchSource | null> => 
        result.status === 'fulfilled' && result.value !== null
      )
      .map(result => result.value as ResearchSource)
      .filter(source => source.relevance >= 0.3) // Minimum relevance threshold
      .sort((a, b) => b.relevance - a.relevance); // Sort by relevance

    console.log(`✅ Validated ${validatedSources.length} sources`);
    return validatedSources;
  }

  private async enhanceSourcesWithContent(sources: ResearchSource[], topic: string): Promise<ResearchSource[]> {
    console.log(`📄 Enhancing ${sources.length} sources with content analysis...`);
    
    // Process sources in batches to avoid overwhelming the API
    const batchSize = 3;
    const enhancedSources: ResearchSource[] = [];
    
    for (let i = 0; i < sources.length; i += batchSize) {
      const batch = sources.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (source) => {
        try {
          return await this.enhanceSingleSource(source, topic);
        } catch (error) {
          console.log(`⚠️ Failed to enhance source ${source.url}:`, error);
          return source; // Return original source if enhancement fails
        }
      });
      
      const batchResults = await Promise.allSettled(batchPromises);
      const successfulResults = batchResults
        .filter((result): result is PromiseFulfilledResult<ResearchSource> => 
          result.status === 'fulfilled'
        )
        .map(result => result.value);
      
      enhancedSources.push(...successfulResults);
      
      // Small delay between batches to respect rate limits
      if (i + batchSize < sources.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log(`✅ Enhanced ${enhancedSources.length} sources`);
    return enhancedSources;
  }

  private async enhanceSingleSource(source: ResearchSource, topic: string): Promise<ResearchSource> {
    const enhancementPrompt = `Analyze this source in the context of the research topic and provide enhanced metadata.

RESEARCH TOPIC: ${topic}
SOURCE: ${source.title}
URL: ${source.url}
CURRENT SUMMARY: ${source.summary}

Please provide an enhanced analysis including:
1. Updated summary with key points relevant to the research topic
2. Specific insights this source provides about the topic
3. How current/recent the information appears to be
4. Any citations or references mentioned
5. Updated relevance score based on content depth

Return your analysis in this JSON format:
{
  "enhancedSummary": "detailed summary of source content",
  "keyInsights": ["insight 1", "insight 2"],
  "lastUpdated": "estimated date or 'unknown'",
  "citations": ["referenced source 1", "referenced source 2"],
  "relevance": 0.85,
  "contentDepth": "high/medium/low"
}`;

    const response = await withRetry(
      () => this.apiClient.callWithOptimizations({
        model: this.perplexityModel,
        prompt: enhancementPrompt,
        cacheKey: `enhance:${source.url}:${topic.substring(0, 30)}`,
        timeoutMs: 45000
      }),
      { maxAttempts: 2, baseDelay: 1000 }
    );

    try {
      const enhancement = JSON.parse(response);
      return {
        ...source,
        summary: enhancement.enhancedSummary || source.summary,
        relevance: enhancement.relevance || source.relevance,
        lastUpdated: enhancement.lastUpdated,
        citations: enhancement.citations
      };
    } catch (error) {
      console.log(`⚠️ Failed to parse enhancement for ${source.url}`);
      return source;
    }
  }

  private async generateResearchInsights(
    sources: ResearchSource[], 
    topic: string, 
    context: any
  ): Promise<{ summary: string; insights: string[]; gaps: string[] }> {
    const sourceSummary = sources.map(s => 
      `${s.title}: ${s.summary} (Relevance: ${s.relevance})`
    ).join('\n');

    const insightsPrompt = `Based on the research conducted, provide a comprehensive analysis of the findings.

RESEARCH TOPIC: ${topic}
CONTEXT: ${this.buildContextString(context)}

SOURCES ANALYZED:
${sourceSummary}

Please provide:
1. A comprehensive research summary
2. Key insights discovered from the sources
3. Any gaps or areas that need additional research

Return your analysis in this JSON format:
{
  "summary": "comprehensive overview of research findings",
  "insights": ["key insight 1", "key insight 2", "key insight 3"],
  "gaps": ["gap or missing area 1", "gap or missing area 2"]
}`;

    const response = await withRetry(
      () => this.apiClient.callWithOptimizations({
        model: this.perplexityModel,
        prompt: insightsPrompt,
        cacheKey: `insights:${topic.substring(0, 50)}`,
        timeoutMs: 45000
      }),
      { maxAttempts: 2, baseDelay: 1000 }
    );

    try {
      return JSON.parse(response);
    } catch (error) {
      return {
        summary: "Research completed successfully with multiple authoritative sources identified.",
        insights: ["Multiple relevant sources discovered", "Current information available"],
        gaps: ["Analysis parsing failed - manual review recommended"]
      };
    }
  }

  private buildContextString(context: any): string {
    const parts = [];
    if (context.industry) parts.push(`Industry: ${context.industry}`);
    if (context.technology) parts.push(`Technology: ${context.technology}`);
    if (context.scale) parts.push(`Scale: ${context.scale}`);
    if (context.compliance?.length) parts.push(`Compliance: ${context.compliance.join(', ')}`);
    return parts.join(' | ') || 'General research context';
  }

  private parseResearchResponse(response: string): ResearchSource[] {
    try {
      const parsed = JSON.parse(response);
      if (parsed.sources && Array.isArray(parsed.sources)) {
        return parsed.sources.map((source: any) => ({
          title: source.title || 'Untitled Source',
          url: source.url || '',
          relevance: source.relevance || 0.5,
          summary: source.summary || '',
          sourceType: source.sourceType || 'documentation',
          credibility: source.credibility || 'medium',
          lastUpdated: source.lastUpdated,
          citations: source.citations
        }));
      }
    } catch (error) {
      console.error('Failed to parse research response:', error);
    }
    return [];
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return url.startsWith('http://') || url.startsWith('https://');
    } catch {
      return false;
    }
  }

  private async checkUrlAccessibility(url: string): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
        headers: {
          'User-Agent': 'ScopeStack Research Engine 1.0'
        }
      });
      
      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  private async validateRelevance(source: ResearchSource, topic: string): Promise<{
    relevance: number;
    enhancedSummary?: string;
  }> {
    const relevancePrompt = `Evaluate the relevance of this source to the research topic.

RESEARCH TOPIC: ${topic}
SOURCE TITLE: ${source.title}
SOURCE URL: ${source.url}
CURRENT SUMMARY: ${source.summary}

On a scale of 0.0 to 1.0, how relevant is this source to the research topic?
Consider:
- Direct relevance to the topic
- Authority and credibility of the source
- Currency of the information
- Depth of coverage

Return your assessment in this JSON format:
{
  "relevance": 0.85,
  "reasoning": "brief explanation of relevance score"
}`;

    try {
      const response = await withRetry(
        () => this.apiClient.callWithOptimizations({
          model: this.perplexityModel,
          prompt: relevancePrompt,
          cacheKey: `relevance:${source.url}:${topic.substring(0, 30)}`,
          timeoutMs: 30000
        }),
        { maxAttempts: 2, baseDelay: 1000 }
      );
      
      const assessment = JSON.parse(response);
      return {
        relevance: assessment.relevance || source.relevance,
        enhancedSummary: assessment.enhancedSummary
      };
    } catch (error) {
      return { relevance: source.relevance };
    }
  }

  private calculateConfidence(sources: ResearchSource[]): number {
    if (sources.length === 0) return 0;
    
    const avgRelevance = sources.reduce((sum, s) => sum + s.relevance, 0) / sources.length;
    const highCredibilitySources = sources.filter(s => s.credibility === 'high').length;
    const sourceVariety = new Set(sources.map(s => s.sourceType)).size;
    
    // Confidence based on: average relevance (40%), high credibility sources (40%), source variety (20%)
    const confidence = (
      avgRelevance * 0.4 +
      (highCredibilitySources / sources.length) * 0.4 +
      Math.min(sourceVariety / 5, 1) * 0.2
    );
    
    return Math.round(confidence * 100) / 100;
  }
}