// Optimized research flow with parallel processing
import { OptimizedAPIClient, OptimizedJSONParser } from './api-optimizations'

interface ResearchStep {
  stepId: string
  status: 'pending' | 'active' | 'completed' | 'failed'
  progress: number
  model?: string
  data?: any
  error?: string
}

interface ResearchContext {
  input: string
  models?: {
    parsing?: string
    research?: string
    analysis?: string
    content?: string
  }
  prompts?: {
    parsing?: string
    research?: string
    analysis?: string
    content?: string
  }
}

interface SendEventFunction {
  (type: string, data: any): void
}

export class OptimizedResearchFlow {
  private apiClient = new OptimizedAPIClient()
  private steps: Map<string, ResearchStep> = new Map()
  
  constructor(private sendEvent: SendEventFunction) {
    this.initializeSteps()
  }
  
  private initializeSteps() {
    const stepIds = ['parse', 'research', 'analyze', 'generate']
    stepIds.forEach((stepId, index) => {
      this.steps.set(stepId, {
        stepId,
        status: 'pending',
        progress: index * 25
      })
    })
  }
  
  async executeResearch(context: ResearchContext): Promise<any> {
    try {
      // Execute steps with optimized parallelization where possible
      const parseResult = await this.executeParseStep(context)
      
      // Research and initial analysis can run in parallel
      const [researchResult, basicAnalysis] = await Promise.all([
        this.executeResearchStep(context, parseResult),
        this.executeBasicAnalysis(context, parseResult)
      ])
      
      // Advanced analysis depends on research results
      const analysisResult = await this.executeAnalysisStep(context, parseResult, researchResult)
      
      // Content generation can start with available data
      const contentResult = await this.executeContentGeneration(context, {
        parsed: parseResult,
        research: researchResult,
        analysis: analysisResult
      })
      
      return {
        parsedData: parseResult,
        researchData: researchResult,
        analysisData: analysisResult,
        contentData: contentResult
      }
      
    } catch (error) {
      console.error('Research flow failed:', error)
      throw error
    }
  }
  
  private async executeParseStep(context: ResearchContext): Promise<any> {
    this.updateStep('parse', 'active', 10)
    
    try {
      const prompt = context.prompts?.parsing || this.getDefaultParsingPrompt(context.input)
      const cacheKey = `parse:${this.hashString(context.input)}`
      
      const response = await this.apiClient.callWithOptimizations({
        model: context.models?.parsing || "anthropic/claude-3.5-sonnet",
        prompt,
        cacheKey,
        timeoutMs: 30000 // Reduced timeout
      })
      
      const parsed = await OptimizedJSONParser.parseWithTimeout(response, 5000)
      
      this.updateStep('parse', 'completed', 25, context.models?.parsing, parsed)
      return parsed
      
    } catch (error) {
      this.updateStep('parse', 'failed', 25, undefined, undefined, error.message)
      // Return fallback data instead of failing completely
      return {
        technology: context.input.split(" ").slice(0, 3).join(" "),
        scale: "Enterprise",
        industry: "Technology"
      }
    }
  }
  
  private async executeResearchStep(context: ResearchContext, parseData: any): Promise<any> {
    this.updateStep('research', 'active', 25)
    
    try {
      const prompt = this.getResearchPrompt(context.input, parseData)
      const cacheKey = `research:${this.hashString(context.input + parseData.technology)}`
      
      const response = await this.apiClient.callWithOptimizations({
        model: context.models?.research || "anthropic/claude-3-opus",
        prompt,
        cacheKey,
        timeoutMs: 45000
      })
      
      const research = await OptimizedJSONParser.parseWithTimeout(response, 5000)
      
      this.updateStep('research', 'completed', 50, context.models?.research, research)
      return research
      
    } catch (error) {
      this.updateStep('research', 'failed', 50, undefined, undefined, error.message)
      return { sources: [], findings: [] }
    }
  }
  
  private async executeBasicAnalysis(context: ResearchContext, parseData: any): Promise<any> {
    // This runs in parallel with research - basic analysis that doesn't need research data
    try {
      const prompt = this.getBasicAnalysisPrompt(context.input, parseData)
      const cacheKey = `basic_analysis:${this.hashString(context.input)}`
      
      const response = await this.apiClient.callWithOptimizations({
        model: context.models?.analysis || "anthropic/claude-3.5-sonnet",
        prompt,
        cacheKey,
        timeoutMs: 30000
      })
      
      return await OptimizedJSONParser.parseWithTimeout(response, 5000)
      
    } catch (error) {
      console.error('Basic analysis failed:', error)
      return { basic_components: [] }
    }
  }
  
  private async executeAnalysisStep(
    context: ResearchContext, 
    parseData: any, 
    researchData: any
  ): Promise<any> {
    this.updateStep('analyze', 'active', 50)
    
    try {
      // Run service and scoping analysis in parallel
      const [serviceAnalysis, scopingAnalysis] = await this.apiClient.executeInParallel([
        () => this.performServiceAnalysis(context, parseData, researchData),
        () => this.performScopingAnalysis(context, parseData, researchData)
      ], 2)
      
      const combinedAnalysis = {
        serviceComponents: serviceAnalysis,
        scopingComponents: scopingAnalysis,
        combinedInsights: this.combineAnalysisResults(serviceAnalysis, scopingAnalysis)
      }
      
      this.updateStep('analyze', 'completed', 75, context.models?.analysis, combinedAnalysis)
      return combinedAnalysis
      
    } catch (error) {
      this.updateStep('analyze', 'failed', 75, undefined, undefined, error.message)
      return { serviceComponents: [], scopingComponents: [] }
    }
  }
  
  private async performServiceAnalysis(context: ResearchContext, parseData: any, researchData: any): Promise<any> {
    const prompt = this.getServiceAnalysisPrompt(context.input, parseData, researchData)
    const cacheKey = `service:${this.hashString(context.input + JSON.stringify(parseData))}`
    
    const response = await this.apiClient.callWithOptimizations({
      model: context.models?.analysis || "anthropic/claude-3.5-sonnet",
      prompt,
      cacheKey,
      timeoutMs: 35000
    })
    
    return await OptimizedJSONParser.parseWithTimeout(response, 5000)
  }
  
  private async performScopingAnalysis(context: ResearchContext, parseData: any, researchData: any): Promise<any> {
    const prompt = this.getScopingAnalysisPrompt(context.input, parseData, researchData)
    const cacheKey = `scoping:${this.hashString(context.input + JSON.stringify(parseData))}`
    
    const response = await this.apiClient.callWithOptimizations({
      model: "openai/gpt-4-turbo",
      prompt,
      cacheKey,
      timeoutMs: 35000
    })
    
    return await OptimizedJSONParser.parseWithTimeout(response, 5000)
  }
  
  private async executeContentGeneration(context: ResearchContext, allData: any): Promise<any> {
    this.updateStep('generate', 'active', 75)
    
    try {
      // Generate outline and content in parallel where possible
      const outline = await this.generateOutline(context, allData)
      
      // Generate main content
      const mainContent = await this.generateMainContent(context, allData, outline)
      
      this.updateStep('generate', 'completed', 100, context.models?.content, mainContent)
      return mainContent
      
    } catch (error) {
      this.updateStep('generate', 'failed', 100, undefined, undefined, error.message)
      return this.getFallbackContent(context, allData)
    }
  }
  
  private async generateOutline(context: ResearchContext, allData: any): Promise<any> {
    const prompt = this.getOutlinePrompt(context.input, allData)
    const cacheKey = `outline:${this.hashString(JSON.stringify(allData).substring(0, 100))}`
    
    const response = await this.apiClient.callWithOptimizations({
      model: context.models?.content || "anthropic/claude-3.5-sonnet",
      prompt,
      cacheKey,
      timeoutMs: 30000
    })
    
    return await OptimizedJSONParser.parseWithTimeout(response, 5000)
  }
  
  private async generateMainContent(context: ResearchContext, allData: any, outline: any): Promise<any> {
    // Optimize prompt size by including only essential data
    const essentialData = this.extractEssentialData(allData)
    const prompt = this.getContentPrompt(context.input, essentialData, outline)
    const cacheKey = `content:${this.hashString(context.input + JSON.stringify(outline))}`
    
    const response = await this.apiClient.callWithOptimizations({
      model: context.models?.content || "anthropic/claude-3.5-sonnet",
      prompt,
      cacheKey,
      timeoutMs: 45000
    })
    
    return await OptimizedJSONParser.parseWithTimeout(response, 10000)
  }
  
  // Helper methods
  private updateStep(
    stepId: string, 
    status: ResearchStep['status'], 
    progress: number, 
    model?: string, 
    data?: any, 
    error?: string
  ) {
    const step = this.steps.get(stepId)
    if (step) {
      step.status = status
      step.progress = progress
      step.model = model
      step.data = data
      step.error = error
      
      this.sendEvent("step", {
        stepId,
        status,
        progress,
        model,
        ...(error && { error })
      })
    }
  }
  
  private hashString(str: string): string {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return hash.toString(36)
  }
  
  private extractEssentialData(allData: any): any {
    // Extract only the most important data to reduce prompt size
    return {
      technology: allData.parsed?.technology || "Technology Solution",
      industry: allData.parsed?.industry || "Technology",
      scale: allData.parsed?.scale || "Enterprise",
      keyFindings: allData.research?.findings?.slice(0, 3) || [],
      mainServices: allData.analysis?.serviceComponents?.slice(0, 5) || [],
      criticalQuestions: allData.analysis?.scopingComponents?.slice(0, 8) || []
    }
  }
  
  private combineAnalysisResults(serviceAnalysis: any, scopingAnalysis: any): any {
    return {
      totalServices: serviceAnalysis?.service_components?.length || 0,
      totalQuestions: scopingAnalysis?.scoping_components?.length || 0,
      complexity: this.assessComplexity(serviceAnalysis, scopingAnalysis)
    }
  }
  
  private assessComplexity(serviceAnalysis: any, scopingAnalysis: any): 'Low' | 'Medium' | 'High' {
    const serviceCount = serviceAnalysis?.service_components?.length || 0
    const questionCount = scopingAnalysis?.scoping_components?.length || 0
    
    if (serviceCount >= 8 || questionCount >= 15) return 'High'
    if (serviceCount >= 5 || questionCount >= 10) return 'Medium'
    return 'Low'
  }
  
  private getFallbackContent(context: ResearchContext, allData: any): any {
    return {
      technology: allData.parsed?.technology || "Technology Solution",
      services: [],
      questions: [],
      totalHours: 40,
      sources: [{
        url: "https://example.com",
        title: "Default Resource",
        relevance: "Implementation guidance"
      }]
    }
  }
  
  // Prompt generation methods (abbreviated for space)
  private getDefaultParsingPrompt(input: string): string {
    return `Parse this technology request and extract key information: "${input}"\n\nReturn JSON with: technology, industry, scale, complexity`
  }
  
  private getResearchPrompt(input: string, parseData: any): string {
    return `Research ${parseData.technology} implementation for ${parseData.industry} industry.\n\nProvide sources, best practices, and implementation insights.`
  }
  
  private getBasicAnalysisPrompt(input: string, parseData: any): string {
    return `Analyze basic requirements for ${parseData.technology} implementation.\n\nIdentify key components and phases.`
  }
  
  private getServiceAnalysisPrompt(input: string, parseData: any, researchData: any): string {
    return `Based on research findings, identify service components for ${parseData.technology}.\n\nStructure as professional services offerings.`
  }
  
  private getScopingAnalysisPrompt(input: string, parseData: any, researchData: any): string {
    return `Generate scoping questions for ${parseData.technology} implementation.\n\nInclude options and effort calculations.`
  }
  
  private getOutlinePrompt(input: string, allData: any): string {
    return `Create structured outline for ${allData.parsed.technology} professional services content.`
  }
  
  private getContentPrompt(input: string, essentialData: any, outline: any): string {
    return `Generate comprehensive professional services content for ${essentialData.technology}.\n\nInclude services, questions, calculations, and sources.`
  }
}