// Research Orchestrator
// Coordinates the entire research and content generation workflow

import { getPerplexityEngine } from '../engines/perplexity-research';
import { getQuestionGenerator } from '../generators/question-generator';
import { getServiceGenerator } from '../generators/service-generator';
import { getCalculationGenerator } from '../generators/calculation-generator';
import { getContentValidator } from '../validation/content-validator';
import { GeneratedContent, ResearchData, StreamingEvent } from '../types/interfaces';
import { extractTechnologyName } from '../utils/response-processor';

export class ResearchOrchestrator {
  private perplexityEngine = getPerplexityEngine();
  private questionGenerator = getQuestionGenerator();
  private serviceGenerator = getServiceGenerator();
  private calculationGenerator = getCalculationGenerator();
  private validator = getContentValidator();

  /**
   * Orchestrates the complete research and content generation workflow
   */
  async generateContent(
    userRequest: string,
    onProgress?: (event: StreamingEvent) => void
  ): Promise<GeneratedContent> {
    try {
      // Step 1: Conduct research
      onProgress?.({
        type: 'step',
        stepId: 'research',
        status: 'in-progress',
        progress: 10
      });

      const researchData = await this.perplexityEngine.performResearch(userRequest);

      onProgress?.({
        type: 'progress',
        progress: 30,
        sources: researchData.sources.map(s => s.title)
      });

      // Step 2: Generate content based on research
      onProgress?.({
        type: 'step',
        stepId: 'content',
        status: 'in-progress',
        progress: 40
      });

      // Generate questions based on research
      const questions = await this.questionGenerator.generateQuestionsFromResearch(
        researchData,
        userRequest
      );

      onProgress?.({
        type: 'progress',
        progress: 60
      });

      // Generate services based on research
      const services = await this.serviceGenerator.generateServicesFromResearch(
        researchData,
        userRequest
      );

      onProgress?.({
        type: 'progress',
        progress: 80
      });

      // Generate calculations based on questions
      const calculations = this.calculationGenerator.generateCalculationsFromQuestions(questions);

      // Calculate total hours
      const totalHours = this.calculationGenerator.calculateTotalHours(services, calculations);

      onProgress?.({
        type: 'progress',
        progress: 90
      });

      // Validate and compile final content
      const content: Partial<GeneratedContent> = {
        technology: extractTechnologyName(userRequest),
        questions,
        services,
        calculations,
        sources: researchData.sources,
        totalHours
      };

      const validatedContent = this.validator.validateContent(content);

      onProgress?.({
        type: 'step',
        stepId: 'content',
        status: 'completed',
        progress: 100
      });

      onProgress?.({
        type: 'complete',
        progress: 100,
        content: validatedContent
      });

      return validatedContent;

    } catch (error) {
      console.error('❌ Research orchestration failed:', error);
      
      onProgress?.({
        type: 'error',
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      });

      // Return minimal fallback content
      return this.validator.validateContent({
        technology: extractTechnologyName(userRequest),
        questions: [],
        services: [],
        calculations: [],
        sources: [],
        totalHours: 40
      });
    }
  }

  /**
   * Validates user request before processing
   */
  validateRequest(userRequest: string): { valid: boolean; error?: string } {
    if (!userRequest || typeof userRequest !== 'string') {
      return { valid: false, error: 'Request must be a non-empty string' };
    }

    const trimmed = userRequest.trim();
    if (trimmed.length === 0) {
      return { valid: false, error: 'Request cannot be empty' };
    }

    if (trimmed.length < 3) {
      return { valid: false, error: 'Request must be at least 3 characters long' };
    }

    if (trimmed.length > 1000) {
      return { valid: false, error: 'Request must be less than 1000 characters' };
    }

    return { valid: true };
  }

  /**
   * Gets research status and capabilities
   */
  getCapabilities(): {
    engines: string[];
    generators: string[];
    features: string[];
  } {
    return {
      engines: ['Perplexity Research Engine'],
      generators: ['Question Generator', 'Service Generator', 'Calculation Generator'],
      features: [
        'Live web research',
        'AI-driven content generation',
        'Research-based question creation',
        'Professional services scoping',
        'Dynamic calculation mapping',
        'Content validation and fallbacks'
      ]
    };
  }
}

// Singleton instance
let orchestratorInstance: ResearchOrchestrator | null = null;

export function getResearchOrchestrator(): ResearchOrchestrator {
  if (!orchestratorInstance) {
    orchestratorInstance = new ResearchOrchestrator();
  }
  return orchestratorInstance;
}