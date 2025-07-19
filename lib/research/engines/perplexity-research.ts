// Perplexity Research Engine
// Handles live web research using Perplexity's sonar model

import { OptimizedAPIClient } from '../../../lib/api-optimizations';
import { cleanAIResponse } from '../utils/response-processor';
import { ResearchData } from '../types/interfaces';

export class PerplexityResearchEngine {
  private client: OptimizedAPIClient;

  constructor() {
    this.client = new OptimizedAPIClient();
  }

  /**
   * Performs active research using Perplexity sonar model
   */
  async performResearch(userRequest: string): Promise<ResearchData> {
    console.log("🔍 Performing Perplexity-based active research for:", userRequest);

    const researchPrompt = `You are an expert technology consultant conducting research for a scope of work document. 

Research the following technology implementation request: "${userRequest}"

Provide a comprehensive research response in this EXACT JSON format:

{
  "sources": [
    {
      "title": "exact title from source",
      "url": "full URL",
      "summary": "detailed summary of what this source covers relevant to the implementation",
      "credibility": "high|medium|low",
      "relevance": 0.85,
      "sourceType": "documentation|guide|case_study|vendor|community|blog|news|other"
    }
  ],
  "researchSummary": "comprehensive analysis of the technology implementation including scope, requirements, challenges, and best practices based on all sources",
  "keyInsights": [
    "specific technical requirement or consideration",
    "implementation challenge or best practice",
    "cost or timeline consideration",
    "compliance or security consideration"
  ],
  "confidence": 0.85
}

Requirements:
1. Find 5-10 high-quality, recent sources
2. Prioritize official documentation, vendor guides, and authoritative technical resources
3. Include implementation-specific details (sizing, architecture, integration)
4. Focus on practical guidance for professional services scoping
5. Ensure all URLs are real and accessible
6. Provide relevance scores (0.0-1.0) based on implementation specificity
7. Include diverse source types for comprehensive coverage

CRITICAL: Return ONLY the JSON response. No explanations, no markdown, no additional text.

Example structure for context:
{
  "sources": [
    {
      "title": "Official Implementation Guide",
      "url": "https://vendor.com/docs/implementation",
      "summary": "Covers step-by-step implementation process, requirements, and best practices",
      "credibility": "high",
      "relevance": 0.95,
      "sourceType": "documentation"
    }
  ],
  "researchSummary": "brief overview of research findings",
  "keyInsights": ["insight 1", "insight 2", "insight 3"],
  "confidence": 0.85
}

Focus on current, authoritative sources that collectively provide comprehensive coverage. Prioritize quality over quantity.`;

    try {
      const response = await this.client.callWithOptimizations({
        model: "perplexity/sonar",
        prompt: researchPrompt,
        cacheKey: `active_research:${userRequest.substring(0, 50)}`,
        timeoutMs: 60000
      });
      
      console.log("🔍 Perplexity research response received, parsing...");
      console.log("📝 Raw response length:", response.length);
      console.log("📝 First 500 chars:", response.substring(0, 500));
      console.log("📝 Last 200 chars:", response.substring(Math.max(0, response.length - 200)));
      
      const cleanedResponse = cleanAIResponse(response);
      console.log("🧹 Cleaned response length:", cleanedResponse.length);
      console.log("🧹 Cleaned first 300 chars:", cleanedResponse.substring(0, 300));
      
      try {
        const parsed = JSON.parse(cleanedResponse);
        console.log("✅ JSON parsing successful");
        console.log("📊 Parsed object keys:", Object.keys(parsed));
        console.log("📊 Sources array length:", parsed.sources?.length || 0);
        
        if (parsed.sources && Array.isArray(parsed.sources)) {
          console.log(`✅ Found ${parsed.sources.length} sources from Perplexity research`);
          console.log("🔗 Source titles:", parsed.sources.map((s: any) => s.title).slice(0, 5));
          
          return {
            sources: parsed.sources.map((source: any) => ({
              ...source,
              title: source.title || 'Untitled Source',
              url: source.url || 'https://example.com',
              credibility: source.credibility || 'medium',
              relevance: source.relevance || 0.5,
              sourceType: source.sourceType || 'other'
            })),
            researchSummary: parsed.researchSummary || "Research completed successfully",
            keyInsights: parsed.keyInsights || [],
            confidence: parsed.confidence || 0.7
          };
        }
      } catch (parseError) {
        console.error("❌ Failed to parse Perplexity research response:", parseError);
        console.error("Raw response that failed to parse:", response.substring(0, 1000));
      }
    } catch (error) {
      console.error("❌ Perplexity research failed:", error);
      throw error;
    }

    // Fallback empty research data
    return {
      sources: [],
      researchSummary: "Research could not be completed",
      keyInsights: [],
      confidence: 0
    };
  }
}

// Singleton instance
let perplexityEngineInstance: PerplexityResearchEngine | null = null;

export function getPerplexityEngine(): PerplexityResearchEngine {
  if (!perplexityEngineInstance) {
    perplexityEngineInstance = new PerplexityResearchEngine();
  }
  return perplexityEngineInstance;
}